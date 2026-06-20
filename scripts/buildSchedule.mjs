/**
 * Build 7-day programming schedule from all videos in DB.
 * Run after importChannelVideos.mjs
 */
import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;

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
    console.error('No videos found! Check DB status values.');
    await conn.end();
    return;
  }

  // Group videos by creator and category
  const byCreator = {
    zara: allVideos.filter(v => v.creatorName === 'Zara' || v.title.toLowerCase().includes("zara's") || v.title.toLowerCase().includes('ztv live daily')),
    nia: allVideos.filter(v => v.creatorName === 'Nia Lux' || v.title.toLowerCase().includes('nia lux')),
    matthew: allVideos.filter(v => v.creatorName === 'Matthew Brown'),
    ztvlive: allVideos.filter(v => v.creatorName === 'ZTVLIVE'),
    zoe: allVideos.filter(v => v.creatorName === 'Zoe' || v.title.toLowerCase().includes('rundown w/ zoe') || v.title.toLowerCase().includes('w/ zoe')),
  };
  const byShow = {
    eliances: allVideos.filter(v => v.title.toLowerCase().includes('eliances')),
    millionDollar: allVideos.filter(v => v.title.toLowerCase().includes('million dollar mingle')),
    concerts: allVideos.filter(v => v.category === 'music' && (v.title.toLowerCase().includes('concert') || v.title.toLowerCase().includes('zapp') || v.title.toLowerCase().includes('mc magic'))),
    champions: allVideos.filter(v => v.title.toLowerCase().includes('champions for the homeless')),
  };
  const byCategory = {
    tech: allVideos.filter(v => v.category === 'tech'),
    gaming: allVideos.filter(v => v.category === 'gaming'),
    news: allVideos.filter(v => v.category === 'news'),
    sports: allVideos.filter(v => v.category === 'sports'),
    music: allVideos.filter(v => v.category === 'music'),
    podcasts: allVideos.filter(v => v.category === 'podcasts'),
    other: allVideos.filter(v => v.category === 'other'),
  };

  console.log(`Zara: ${byCreator.zara.length}, Nia: ${byCreator.nia.length}, Matthew: ${byCreator.matthew.length}, ZTVLIVE: ${byCreator.ztvlive.length}, Zoe: ${byCreator.zoe.length}`);
  console.log(`Eliances: ${byShow.eliances.length}, Million Dollar Mingle: ${byShow.millionDollar.length}, Concerts: ${byShow.concerts.length}`);
  console.log(`Tech: ${byCategory.tech.length}, Gaming: ${byCategory.gaming.length}, News: ${byCategory.news.length}, Podcasts: ${byCategory.podcasts.length}`);

  // Helper: pick video from pool with day-based rotation, fallback to allVideos
  function pickVideo(pool, index) {
    const p = pool.length > 0 ? pool : allVideos;
    return p[index % p.length];
  }

  // Daily programming template
  // Each block: { hour, minute, show, pool fn, slots }
  const DAILY_BLOCKS = [
    // 6:00am - Morning with Zara (news/culture)
    { hour: 6, minute: 0, show: "Morning with Zara", pool: () => [...byCreator.zara, ...byCategory.news, ...byCreator.ztvlive], slots: 3 },
    // 8:30am - The Nia Lux Show
    { hour: 8, minute: 30, show: "The Nia Lux Show", pool: () => [...byCreator.nia, ...byCategory.podcasts], slots: 2 },
    // 10:00am - CommunityCut Weekly
    { hour: 10, minute: 0, show: "CommunityCut Weekly", pool: () => [...byCategory.podcasts, ...byCreator.matthew], slots: 3 },
    // 12:00pm - Tech Reviews with Matthew
    { hour: 12, minute: 0, show: "Tech Reviews with Matthew", pool: () => byCategory.tech, slots: 4 },
    // 2:00pm - Gaming Block
    { hour: 14, minute: 0, show: "Gaming Block", pool: () => byCategory.gaming, slots: 4 },
    // 3:30pm - Eliances Grand Table (business interviews)
    { hour: 15, minute: 30, show: "Eliances Grand Table", pool: () => [...byShow.eliances, ...byCategory.podcasts], slots: 2 },
    // 4:00pm - Sports & Culture
    { hour: 16, minute: 0, show: "Sports & Culture", pool: () => [...byCategory.sports, ...byCategory.news, ...byCreator.ztvlive], slots: 3 },
    // 6:00pm - Zara's Daily Show (Prime Time)
    { hour: 18, minute: 0, show: "Zara's Daily Show", pool: () => [...byCreator.zara, ...byCategory.news, ...byCreator.ztvlive], slots: 3 },
    // 7:30pm - The Nia Lux Show (Prime)
    { hour: 19, minute: 30, show: "The Nia Lux Show — Prime", pool: () => [...byCreator.nia, ...byCategory.podcasts], slots: 2 },
    // 8:00pm - The Rundown w/ Zoe
    { hour: 20, minute: 0, show: "The Rundown w/ Zoe", pool: () => [...byCreator.zoe, ...byCategory.news, ...byCreator.zara], slots: 2 },
    // 8:30pm - CommunityCut Prime
    { hour: 20, minute: 30, show: "CommunityCut Prime", pool: () => [...byCategory.podcasts, ...byCreator.matthew], slots: 3 },
    // 10:00pm - Late Night Tech
    { hour: 22, minute: 0, show: "Late Night Tech", pool: () => [...byCategory.tech, ...byCategory.gaming], slots: 4 },
    // 11:00pm - Million Dollar Mingle / Events
    { hour: 23, minute: 0, show: "Million Dollar Mingle", pool: () => [...byShow.millionDollar, ...byShow.champions, ...byCategory.other], slots: 2 },
    // 12:00am - Overnight: Music & Concerts
    { hour: 0, minute: 0, show: "Overnight: Music & Concerts", pool: () => [...byShow.concerts, ...byCategory.music, ...byCategory.other], slots: 3 },
    // 3:00am - Early Morning Replay
    { hour: 3, minute: 0, show: "Early Morning Replay", pool: () => [...byCategory.tech, ...byCreator.matthew], slots: 3 },
  ];

  // Clear future schedule
  const now = Date.now();
  const [delResult] = await conn.query(`DELETE FROM schedule_items WHERE startTime > ?`, [now]);
  console.log(`Cleared ${delResult.affectedRows} future schedule items`);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  let scheduleInserts = 0;

  for (let day = 0; day < 7; day++) {
    const dayBase = new Date(startOfToday.getTime() + day * 24 * 60 * 60 * 1000);
    let daySlots = 0;

    for (let bi = 0; bi < DAILY_BLOCKS.length; bi++) {
      const block = DAILY_BLOCKS[bi];
      const pool = block.pool();
      
      let slotTime = new Date(dayBase);
      slotTime.setHours(block.hour, block.minute, 0, 0);

      for (let i = 0; i < block.slots; i++) {
        const video = pickVideo(pool, day * 1000 + bi * 20 + i);
        if (!video) continue;

        const dur = (typeof video.duration === 'number' ? video.duration : parseInt(video.duration)) || 600;
        const endTime = new Date(slotTime.getTime() + dur * 1000);

        const showTitle = `${block.show}: ${video.title}`;

        await conn.query(
          `INSERT INTO schedule_items (youtubeId, title, description, thumbnailUrl, startTime, endTime, category, isLive, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
          [
            video.youtubeId,
            showTitle.substring(0, 255),
            video.title,
            video.thumbnailUrl || `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`,
            slotTime.getTime(),
            endTime.getTime(),
            video.category,
          ]
        );

        slotTime = endTime;
        scheduleInserts++;
        daySlots++;
      }
    }

    console.log(`  Day ${day + 1} (${dayBase.toDateString()}): ${daySlots} slots`);
  }

  console.log(`\n✅ Schedule complete: ${scheduleInserts} slots over 7 days`);
  await conn.end();
  console.log('🎉 Done!');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
