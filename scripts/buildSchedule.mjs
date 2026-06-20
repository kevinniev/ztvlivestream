/**
 * buildSchedule.mjs
 * Builds a 7-day rotating schedule using ONLY real ZTVLIVE/CommunityCut channel videos.
 * Anti-repeat: no two consecutive slots from the same creator.
 * Each day uses a different seed so rotation feels fresh.
 */
import mysql from 'mysql2/promise';

function seededShuffle(arr, seed) {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickNext(pool, lastCreator, usedIds, fallback) {
  // Prefer different creator and unused
  let v = pool.find(x => !usedIds.has(x.id) && x.creatorName !== lastCreator);
  if (!v) v = pool.find(x => !usedIds.has(x.id));
  if (!v) v = fallback.find(x => x.creatorName !== lastCreator) || fallback[0];
  return v;
}

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Connected to DB');

  // Load ONLY real channel videos
  const [allVideos] = await conn.query(`
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

  const creatorCounts = {};
  allVideos.forEach(v => { creatorCounts[v.creatorName] = (creatorCounts[v.creatorName] || 0) + 1; });
  console.log('Creators:', JSON.stringify(creatorCounts));

  // Clear ALL schedule items
  await conn.query('DELETE FROM schedule_items');
  console.log('Cleared schedule');

  // 48 slots per day × 30 min each = full 24 hours
  const SLOT_DURATION_MIN = 30;
  const SLOTS_PER_DAY = 48;
  const DAYS = 7;

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  let totalInserts = 0;

  for (let day = 0; day < DAYS; day++) {
    const dayBase = startOfToday.getTime() + day * 24 * 60 * 60 * 1000;
    const shuffled = seededShuffle(allVideos, day * 999983 + 42);

    // Build a full-day playlist with no consecutive same creator
    const dayPlaylist = [];
    const usedIds = new Set();
    let lastCreator = '';

    // Fill SLOTS_PER_DAY slots, cycling through shuffled pool
    let poolCopy = [...shuffled];
    for (let slot = 0; slot < SLOTS_PER_DAY; slot++) {
      const video = pickNext(poolCopy, lastCreator, usedIds, shuffled);
      dayPlaylist.push(video);
      usedIds.add(video.id);
      lastCreator = video.creatorName;

      // When we've used all videos, reset the used set so we can repeat
      if (usedIds.size >= allVideos.length) {
        usedIds.clear();
        poolCopy = seededShuffle(allVideos, day * 999983 + slot * 137);
      }
    }

    // Insert all slots for this day
    for (let slot = 0; slot < dayPlaylist.length; slot++) {
      const video = dayPlaylist[slot];
      const startTime = dayBase + slot * SLOT_DURATION_MIN * 60 * 1000;
      const endTime = startTime + SLOT_DURATION_MIN * 60 * 1000;

      const thumbnail = video.thumbnailUrl ||
        `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;

      await conn.query(
        `INSERT INTO schedule_items (youtubeId, title, description, thumbnailUrl, startTime, endTime, category, isLive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
        [
          video.youtubeId,
          video.title,
          video.title,
          thumbnail,
          startTime,
          endTime,
          video.category || 'general',
        ]
      );
      totalInserts++;
    }

    const dayDate = new Date(dayBase).toDateString();
    console.log(`  Day ${day + 1} (${dayDate}): ${dayPlaylist.length} slots`);
  }

  console.log(`\n✅ Schedule complete: ${totalInserts} slots over ${DAYS} days`);
  await conn.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
