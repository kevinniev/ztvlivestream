/**
 * buildSchedule.mjs
 * TRT-based 24/7 schedule builder.
 *
 * Rules:
 *  1. Each video plays for its ACTUAL duration (TRT), not a fixed slot.
 *  2. Videos are shuffled so no two consecutive slots share the same creator OR category.
 *  3. All 85 real videos are used in one pass before cycling again.
 *  4. The schedule runs for 7 days, chaining videos end-to-end from midnight today.
 *  5. No fixed time blocks — the clock advances by each video's real TRT.
 */
import mysql from 'mysql2/promise';

// ── Seeded Fisher-Yates shuffle ────────────────────────────────────────────────
function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = (seed ^ 0xdeadbeef) >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    s = ((s ^ (s >>> 14)) >>> 0);
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Anti-repeat picker ─────────────────────────────────────────────────────────
// Picks the next video that differs in both creator and category from the last.
// Falls back progressively if no perfect match exists.
function pickNext(remaining, lastCreator, lastCategory) {
  // Best: different creator AND different category
  let idx = remaining.findIndex(v =>
    v.creatorName !== lastCreator && v.category !== lastCategory
  );
  if (idx === -1) {
    // OK: different creator
    idx = remaining.findIndex(v => v.creatorName !== lastCreator);
  }
  if (idx === -1) {
    // OK: different category
    idx = remaining.findIndex(v => v.category !== lastCategory);
  }
  if (idx === -1) {
    // Last resort: just take the first remaining
    idx = 0;
  }
  const [video] = remaining.splice(idx, 1);
  return video;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Connected to DB');

  // Load all real videos with their durations
  const [allVideos] = await conn.execute(`
    SELECT id, youtubeId, title, category, creatorName, duration, thumbnailUrl
    FROM videos
    WHERE youtubeId IS NOT NULL AND youtubeId != ''
    ORDER BY creatorName, title
  `);

  console.log(`Loaded ${allVideos.length} real videos`);

  if (allVideos.length === 0) {
    console.error('No videos found!');
    await conn.end();
    return;
  }

  // Normalize durations — use actual TRT, fallback to 600s (10 min) for unknowns
  const videos = allVideos.map(v => ({
    ...v,
    trt: Math.max(30, parseInt(v.duration) || 600), // seconds
  }));

  // Log inventory
  const creatorMap = {};
  videos.forEach(v => { creatorMap[v.creatorName] = (creatorMap[v.creatorName] || 0) + 1; });
  console.log('Creators:', JSON.stringify(creatorMap));

  const totalTRT = videos.reduce((s, v) => s + v.trt, 0);
  console.log(`Total TRT of all videos: ${Math.floor(totalTRT / 3600)}h ${Math.floor((totalTRT % 3600) / 60)}m`);

  // ── Clear existing schedule ──────────────────────────────────────────────────
  await conn.execute('DELETE FROM schedule_items');
  console.log('Cleared existing schedule');

  // ── Build 7-day schedule ─────────────────────────────────────────────────────
  // Start at midnight today (local time)
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const endTime = startOfToday.getTime() + SEVEN_DAYS_MS;

  let cursor = startOfToday.getTime(); // current position in time (ms)
  let totalInserts = 0;
  let cycleNum = 0;

  // Keep a running pool — when exhausted, reshuffle and refill
  let pool = [];
  let lastCreator = '';
  let lastCategory = '';

  while (cursor < endTime) {
    // Refill pool when empty — use a different seed each cycle for variety
    if (pool.length === 0) {
      pool = seededShuffle(videos, cycleNum * 999983 + 42);
      cycleNum++;
      console.log(`  Cycle ${cycleNum}: refilled pool with ${pool.length} videos`);
    }

    const video = pickNext(pool, lastCreator, lastCategory);
    const videoStart = cursor;
    const videoEnd = cursor + video.trt * 1000;

    // Don't schedule past 7 days
    if (videoStart >= endTime) break;

    const thumbnail = video.thumbnailUrl ||
      `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;

    await conn.execute(
      `INSERT INTO schedule_items (youtubeId, title, description, thumbnailUrl, startTime, endTime, category, isLive, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
      [
        video.youtubeId,
        video.title,
        video.title,
        thumbnail,
        videoStart,
        Math.min(videoEnd, endTime),
        video.category || 'general',
      ]
    );

    cursor = videoEnd;
    lastCreator = video.creatorName;
    lastCategory = video.category;
    totalInserts++;
  }

  console.log(`\n✅ Schedule complete: ${totalInserts} video slots over 7 days`);
  console.log(`   Ran ${cycleNum} full cycles through the ${videos.length}-video library`);
  console.log(`   Schedule: ${startOfToday.toISOString()} → ${new Date(endTime).toISOString()}`);

  // Show sample of what's playing now
  const now = Date.now();
  const [nowPlaying] = await conn.execute(
    `SELECT youtubeId, title, category, startTime, endTime FROM schedule_items WHERE startTime <= ? AND endTime >= ? LIMIT 1`,
    [now, now]
  );
  if (nowPlaying.length > 0) {
    const v = nowPlaying[0];
    const elapsed = Math.floor((now - Number(v.startTime)) / 1000);
    const total = Math.floor((Number(v.endTime) - Number(v.startTime)) / 1000);
    console.log(`\nNow playing: "${v.title}" [${v.category}] — ${elapsed}s / ${total}s`);
  }

  const [upcoming] = await conn.execute(
    `SELECT youtubeId, title, category FROM schedule_items WHERE startTime > ? ORDER BY startTime ASC LIMIT 5`,
    [now]
  );
  console.log('\nUp next:');
  upcoming.forEach((v, i) => console.log(`  ${i+1}. [${v.category}] ${v.title}`));

  await conn.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
