/**
 * Build 7-day programming schedule with proper shuffle mixing.
 * Rules:
 *  - No two consecutive slots from the same creator
 *  - No two consecutive slots from the same category
 *  - Variety spread across the full day (morning news, afternoon events, evening entertainment, late night music)
 *  - Each day rotates differently so repeat viewers see fresh content
 */
import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;

// ── Seeded shuffle (Fisher-Yates) ──────────────────────────────────────────────
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

// ── Pick next video that doesn't repeat creator/category ──────────────────────
function pickNext(pool, lastCreator, lastCategory, usedIds, fallback) {
  // Try to find a video that differs in both creator and category
  let candidate = pool.find(v =>
    !usedIds.has(v.id) &&
    v.creatorName !== lastCreator &&
    v.category !== lastCategory
  );
  // Relax: allow same category if creator differs
  if (!candidate) {
    candidate = pool.find(v => !usedIds.has(v.id) && v.creatorName !== lastCreator);
  }
  // Relax: allow same creator if category differs
  if (!candidate) {
    candidate = pool.find(v => !usedIds.has(v.id) && v.category !== lastCategory);
  }
  // Last resort: any unused video
  if (!candidate) {
    candidate = pool.find(v => !usedIds.has(v.id));
  }
  // If all used, reset and pick from fallback
  if (!candidate) {
    candidate = fallback[Math.floor(Math.random() * fallback.length)];
  }
  return candidate;
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  console.log('✅ Connected to DB');

  // Fetch ALL active videos
  const [allVideos] = await conn.query(`
    SELECT id, youtubeId, title, category, creatorName, duration, thumbnailUrl
    FROM videos 
    WHERE status IN ('active', 'approved') AND youtubeId IS NOT NULL AND youtubeId != ''
    ORDER BY createdAt DESC
  `);

  console.log(`Total schedulable videos: ${allVideos.length}`);
  if (allVideos.length === 0) {
    console.error('No videos found!');
    await conn.end();
    return;
  }

  // ── Log inventory ────────────────────────────────────────────────────────────
  const creatorCounts = {};
  const categoryCounts = {};
  allVideos.forEach(v => {
    creatorCounts[v.creatorName] = (creatorCounts[v.creatorName] || 0) + 1;
    categoryCounts[v.category] = (categoryCounts[v.category] || 0) + 1;
  });
  console.log('Creators:', JSON.stringify(creatorCounts));
  console.log('Categories:', JSON.stringify(categoryCounts));

  // ── Clear schedule ───────────────────────────────────────────────────────────
  const [delResult] = await conn.query(`DELETE FROM schedule_items WHERE startTime > ?`, [Date.now()]);
  console.log(`Cleared ${delResult.affectedRows} future schedule items`);

  // ── Time slots per day ───────────────────────────────────────────────────────
  // We define time "anchors" — fixed start times for show blocks.
  // Each block gets a pool hint (preferred categories/creators) but the
  // actual video is chosen by the anti-repeat shuffle algorithm.
  const TIME_SLOTS = [
    // Morning block: news, culture, current events
    { hour: 6,  minute: 0,  label: 'Morning Show',        preferCats: ['news', 'podcasts'],              preferCreators: ['Zara', 'ZTVLIVE', 'Zoe'] },
    { hour: 6,  minute: 30, label: 'Morning Show',        preferCats: ['news', 'podcasts'],              preferCreators: ['Zara', 'ZTVLIVE', 'Zoe'] },
    { hour: 7,  minute: 0,  label: 'Morning Show',        preferCats: ['news', 'podcasts'],              preferCreators: ['Zara', 'ZTVLIVE', 'Zoe'] },
    // Mid-morning: business, interviews, Eliances
    { hour: 7,  minute: 30, label: 'Business Hour',       preferCats: ['podcasts', 'other'],             preferCreators: ['ZTVLIVE', 'Matthew Brown'] },
    { hour: 8,  minute: 0,  label: 'Business Hour',       preferCats: ['podcasts', 'other'],             preferCreators: ['ZTVLIVE', 'Matthew Brown'] },
    { hour: 8,  minute: 30, label: 'Business Hour',       preferCats: ['podcasts', 'other'],             preferCreators: ['ZTVLIVE', 'Matthew Brown'] },
    // Late morning: Nia Lux, CommunityCut
    { hour: 9,  minute: 0,  label: 'The Nia Lux Show',    preferCats: ['podcasts'],                      preferCreators: ['Nia Lux', 'Matthew Brown'] },
    { hour: 9,  minute: 30, label: 'CommunityCut',        preferCats: ['podcasts', 'other'],             preferCreators: ['Matthew Brown'] },
    { hour: 10, minute: 0,  label: 'CommunityCut',        preferCats: ['podcasts', 'other'],             preferCreators: ['Matthew Brown'] },
    // Tech block
    { hour: 10, minute: 30, label: 'Tech Talk',           preferCats: ['tech'],                          preferCreators: ['Matthew Brown', 'ZTVLIVE'] },
    { hour: 11, minute: 0,  label: 'Tech Talk',           preferCats: ['tech'],                          preferCreators: ['Matthew Brown', 'ZTVLIVE'] },
    { hour: 11, minute: 30, label: 'Tech Talk',           preferCats: ['tech'],                          preferCreators: ['Matthew Brown', 'ZTVLIVE'] },
    // Noon: mixed variety
    { hour: 12, minute: 0,  label: 'Midday Mix',          preferCats: ['news', 'sports', 'music'],       preferCreators: ['Zara', 'ZTVLIVE', 'Zoe'] },
    { hour: 12, minute: 30, label: 'Midday Mix',          preferCats: ['news', 'sports', 'music'],       preferCreators: ['Zara', 'ZTVLIVE', 'Zoe'] },
    { hour: 13, minute: 0,  label: 'Midday Mix',          preferCats: ['news', 'sports', 'music'],       preferCreators: ['Zara', 'ZTVLIVE', 'Zoe'] },
    // Afternoon: gaming
    { hour: 13, minute: 30, label: 'Gaming Block',        preferCats: ['gaming'],                        preferCreators: [] },
    { hour: 14, minute: 0,  label: 'Gaming Block',        preferCats: ['gaming'],                        preferCreators: [] },
    { hour: 14, minute: 30, label: 'Gaming Block',        preferCats: ['gaming'],                        preferCreators: [] },
    { hour: 15, minute: 0,  label: 'Gaming Block',        preferCats: ['gaming'],                        preferCreators: [] },
    // Mid-afternoon: Eliances / interviews / events
    { hour: 15, minute: 30, label: 'Eliances Grand Table', preferCats: ['podcasts', 'other'],            preferCreators: ['ZTVLIVE'] },
    { hour: 16, minute: 0,  label: 'Eliances Grand Table', preferCats: ['podcasts', 'other'],            preferCreators: ['ZTVLIVE'] },
    // Late afternoon: sports, culture, news
    { hour: 16, minute: 30, label: 'Sports & Culture',    preferCats: ['sports', 'news'],                preferCreators: ['Zara', 'ZTVLIVE'] },
    { hour: 17, minute: 0,  label: 'Sports & Culture',    preferCats: ['sports', 'news'],                preferCreators: ['Zara', 'ZTVLIVE'] },
    { hour: 17, minute: 30, label: 'Sports & Culture',    preferCats: ['sports', 'news'],                preferCreators: ['Zara', 'ZTVLIVE'] },
    // Prime time: Zara's Daily Show
    { hour: 18, minute: 0,  label: "Zara's Daily Show",   preferCats: ['news', 'podcasts'],              preferCreators: ['Zara', 'ZTVLIVE'] },
    { hour: 18, minute: 30, label: "Zara's Daily Show",   preferCats: ['news', 'podcasts'],              preferCreators: ['Zara', 'ZTVLIVE'] },
    { hour: 19, minute: 0,  label: "Zara's Daily Show",   preferCats: ['news', 'podcasts'],              preferCreators: ['Zara', 'ZTVLIVE'] },
    // Prime time: Nia Lux
    { hour: 19, minute: 30, label: 'The Nia Lux Show',    preferCats: ['podcasts'],                      preferCreators: ['Nia Lux', 'Matthew Brown'] },
    { hour: 20, minute: 0,  label: 'The Rundown w/ Zoe',  preferCats: ['news', 'music'],                 preferCreators: ['Zoe', 'ZTVLIVE'] },
    // Evening: CommunityCut Prime
    { hour: 20, minute: 30, label: 'CommunityCut Prime',  preferCats: ['podcasts', 'other'],             preferCreators: ['Matthew Brown', 'Nia Lux'] },
    { hour: 21, minute: 0,  label: 'CommunityCut Prime',  preferCats: ['podcasts', 'other'],             preferCreators: ['Matthew Brown'] },
    { hour: 21, minute: 30, label: 'CommunityCut Prime',  preferCats: ['podcasts', 'other'],             preferCreators: ['Matthew Brown'] },
    // Late night: tech + gaming mix
    { hour: 22, minute: 0,  label: 'Late Night Tech',     preferCats: ['tech', 'gaming'],                preferCreators: [] },
    { hour: 22, minute: 30, label: 'Late Night Tech',     preferCats: ['tech', 'gaming'],                preferCreators: [] },
    { hour: 23, minute: 0,  label: 'Million Dollar Mingle', preferCats: ['other', 'podcasts'],           preferCreators: ['ZTVLIVE'] },
    { hour: 23, minute: 30, label: 'Million Dollar Mingle', preferCats: ['other', 'podcasts'],           preferCreators: ['ZTVLIVE'] },
    // Overnight: music & concerts
    { hour: 0,  minute: 0,  label: 'Overnight: Music & Concerts', preferCats: ['music', 'other'],       preferCreators: ['ZTVLIVE'] },
    { hour: 0,  minute: 30, label: 'Overnight: Music & Concerts', preferCats: ['music', 'other'],       preferCreators: ['ZTVLIVE'] },
    { hour: 1,  minute: 0,  label: 'Overnight: Music & Concerts', preferCats: ['music', 'other'],       preferCreators: ['ZTVLIVE'] },
    // Early morning replay
    { hour: 2,  minute: 0,  label: 'Early Morning Replay', preferCats: ['tech', 'podcasts'],            preferCreators: ['Matthew Brown'] },
    { hour: 2,  minute: 30, label: 'Early Morning Replay', preferCats: ['tech', 'podcasts'],            preferCreators: ['Matthew Brown'] },
    { hour: 3,  minute: 0,  label: 'Early Morning Replay', preferCats: ['tech', 'podcasts'],            preferCreators: ['Matthew Brown'] },
    { hour: 3,  minute: 30, label: 'Early Morning Replay', preferCats: ['tech', 'podcasts'],            preferCreators: ['Matthew Brown'] },
    { hour: 4,  minute: 0,  label: 'Early Morning Replay', preferCats: ['tech', 'gaming'],              preferCreators: [] },
    { hour: 4,  minute: 30, label: 'Early Morning Replay', preferCats: ['tech', 'gaming'],              preferCreators: [] },
    { hour: 5,  minute: 0,  label: 'Early Morning Replay', preferCats: ['tech', 'gaming'],              preferCreators: [] },
    { hour: 5,  minute: 30, label: 'Early Morning Replay', preferCats: ['tech', 'gaming'],              preferCreators: [] },
  ];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  let totalInserts = 0;

  for (let day = 0; day < 7; day++) {
    const dayBase = new Date(startOfToday.getTime() + day * 24 * 60 * 60 * 1000);
    const daySeed = day * 999983 + 12345;

    // Shuffle the full video pool differently each day
    const shuffled = seededShuffle(allVideos, daySeed);

    // Track used IDs per day to avoid repeating the same video on the same day
    const usedIds = new Set();
    let lastCreator = '';
    let lastCategory = '';
    let daySlots = 0;

    for (const slot of TIME_SLOTS) {
      const slotTime = new Date(dayBase);
      slotTime.setHours(slot.hour, slot.minute, 0, 0);

      // Build preferred pool: prefer matching cats/creators, then fall back to all
      let preferredPool = shuffled.filter(v =>
        (slot.preferCats.length === 0 || slot.preferCats.includes(v.category)) &&
        (slot.preferCreators.length === 0 || slot.preferCreators.includes(v.creatorName))
      );
      if (preferredPool.length < 3) {
        // Expand to just category match
        preferredPool = shuffled.filter(v =>
          slot.preferCats.length === 0 || slot.preferCats.includes(v.category)
        );
      }
      if (preferredPool.length === 0) preferredPool = shuffled;

      const video = pickNext(preferredPool, lastCreator, lastCategory, usedIds, shuffled);
      if (!video) continue;

      const dur = (typeof video.duration === 'number' ? video.duration : parseInt(video.duration)) || 600;
      const endTime = new Date(slotTime.getTime() + dur * 1000);
      const showTitle = `${slot.label}: ${video.title}`.substring(0, 255);

      await conn.query(
        `INSERT INTO schedule_items (youtubeId, title, description, thumbnailUrl, startTime, endTime, category, isLive, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
        [
          video.youtubeId,
          showTitle,
          video.title,
          video.thumbnailUrl || `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`,
          slotTime.getTime(),
          endTime.getTime(),
          video.category,
        ]
      );

      usedIds.add(video.id);
      lastCreator = video.creatorName;
      lastCategory = video.category;
      daySlots++;
      totalInserts++;
    }

    console.log(`  Day ${day + 1} (${dayBase.toDateString()}): ${daySlots} slots`);
  }

  console.log(`\n✅ Schedule complete: ${totalInserts} slots over 7 days`);
  await conn.end();
  console.log('🎉 Done!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
