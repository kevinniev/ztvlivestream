/**
 * Bulk import ZTVLIVE and CommunityCut YouTube channel videos into the DB
 * and populate the schedule_items table with a daily programming grid.
 * 
 * Run: node scripts/importChannelVideos.mjs
 */
import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;

// ── Channel definitions ────────────────────────────────────────────────────────
const CHANNELS = [
  {
    channelId: 'UCM1Y6DqREI9OuTNNolt6dwQ',
    name: 'ZTVLIVE',
    defaultCreator: 'ZTVLIVE',
  },
  {
    channelId: 'UCZUz2wo1FzL2HpnTGDhAufg',
    name: 'CommunityCut',
    defaultCreator: 'Matthew Brown',
  },
];

// ── Category detection ─────────────────────────────────────────────────────────
function detectCategory(title) {
  const t = title.toLowerCase();
  if (t.includes('zara') || t.includes('bet awards') || t.includes('juneteenth') || 
      t.includes('world cup') || t.includes('knicks') || t.includes('nba') || 
      t.includes('spurs') || t.includes('sports') || t.includes('basketball') ||
      t.includes('celebrity') || t.includes('rihanna') || t.includes('viral')) return 'news';
  if (t.includes('nia') || t.includes('communitycut weekly') || t.includes('community cut') ||
      t.includes('grooming') || t.includes('barber') || t.includes('booking') ||
      t.includes('beauty') || t.includes('mobile booking') || t.includes('groomers') ||
      t.includes('empowering') || t.includes('slow days') || t.includes('celebrating')) return 'podcasts';
  if (t.includes('music') || t.includes('black music') || t.includes('tony awards') ||
      t.includes('broadway')) return 'music';
  if (t.includes('unboxing') || t.includes('good tech') || t.includes('smart') || 
      t.includes('camera') || t.includes('doorbell') || t.includes('purifier') ||
      t.includes('scale') || t.includes('power bank') || t.includes('solar') ||
      t.includes('robot') || t.includes('fingerprint') || t.includes('pool')) return 'tech';
  if (t.includes('diablo') || t.includes('battlefield') || t.includes('gaming') ||
      t.includes('multiplayer') || t.includes('gameplay') || t.includes('paragon')) return 'gaming';
  if (t.includes('sports') || t.includes('nba') || t.includes('knicks') || 
      t.includes('spurs') || t.includes('world cup') || t.includes('soccer')) return 'sports';
  return 'other';
}

// ── Creator detection ──────────────────────────────────────────────────────────
function detectCreator(title, channelName) {
  const t = title.toLowerCase();
  if (t.includes('zara') || t.includes('ztv live daily') || t.includes('ztvlive daily') ||
      t.includes("zara's segment")) return 'Zara';
  if (t.includes('nia lux') || t.includes('nia luxe') || t.includes('welcome to the nia')) return 'Nia Lux';
  if (channelName === 'CommunityCut') return 'Matthew Brown';
  return channelName === 'ZTVLIVE' ? 'ZTVLIVE' : 'Matthew Brown';
}

// ── Duration estimate ──────────────────────────────────────────────────────────
function estimateDuration(title) {
  const t = title.toLowerCase();
  // Shorts are ~60s
  if (t.includes('#shorts') || t.includes('shorts')) return 60;
  // Full episodes 8-15 min
  if (t.includes('episode') || t.includes('weekly') || t.includes('show') || t.includes('ep.')) return 900;
  // Unboxing videos ~5-8 min
  if (t.includes('unboxing')) return 420;
  // Gaming videos ~15-20 min
  if (t.includes('diablo') || t.includes('battlefield') || t.includes('gameplay')) return 1200;
  // Daily show segments ~3-5 min
  if (t.includes('daily') || t.includes('zara') || t.includes('recap')) return 300;
  return 600;
}

// ── Parse RSS XML manually ─────────────────────────────────────────────────────
function parseRSS(xml) {
  const entries = [];
  const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);
  for (const match of entryMatches) {
    const entry = match[1];
    const videoId = (entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    const title = (entry.match(/<title>([^<]+)<\/title>/) || [])[1];
    const published = (entry.match(/<published>([^<]+)<\/published>/) || [])[1];
    const thumbUrl = (entry.match(/url="(https:\/\/i[0-9]\.ytimg\.com\/vi\/[^"]+)"/) || [])[1];
    const desc = (entry.match(/<media:description>([\s\S]*?)<\/media:description>/) || [])[1];
    if (videoId && title) {
      entries.push({
        youtubeId: videoId,
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
        thumbnailUrl: thumbUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        publishedAt: published,
        description: (desc || '').replace(/<[^>]+>/g, '').substring(0, 500),
      });
    }
  }
  return entries;
}

// ── Fetch RSS ──────────────────────────────────────────────────────────────────
async function fetchChannelVideos(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!resp.ok) throw new Error(`RSS fetch failed: ${resp.status}`);
  const xml = await resp.text();
  return parseRSS(xml);
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection(DB_URL);
  console.log('✅ Connected to DB');

  let totalImported = 0;
  let totalSkipped = 0;

  for (const channel of CHANNELS) {
    console.log(`\n📺 Fetching ${channel.name} (${channel.channelId})...`);
    let videos;
    try {
      videos = await fetchChannelVideos(channel.channelId);
      console.log(`   Found ${videos.length} videos`);
    } catch (err) {
      console.error(`   Error: ${err.message}`);
      continue;
    }

    for (const v of videos) {
      const [existing] = await conn.query('SELECT id FROM videos WHERE youtubeId = ?', [v.youtubeId]);
      if (existing.length > 0) {
        console.log(`   SKIP: ${v.title.substring(0, 55)}`);
        totalSkipped++;
        continue;
      }

      const category = detectCategory(v.title);
      const creatorName = detectCreator(v.title, channel.name);
      const duration = estimateDuration(v.title);

      await conn.query(
        `INSERT INTO videos (youtubeId, title, description, thumbnailUrl, category, creatorName, duration, status, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', NOW())`,
        [v.youtubeId, v.title, v.description || '', v.thumbnailUrl, category, creatorName, duration]
      );
      console.log(`   ✅ [${category}] ${v.title.substring(0, 55)} (${creatorName})`);
      totalImported++;
    }
  }

  console.log(`\n✅ Import complete: ${totalImported} imported, ${totalSkipped} skipped`);

  // ── Build 7-day schedule ─────────────────────────────────────────────────────
  console.log('\n📅 Building 7-day programming schedule...');
  
  // Clear future schedule items
  await conn.query(`DELETE FROM schedule_items WHERE startTime > ${Date.now()}`);
  console.log('   Cleared future schedule items');

  // Fetch ALL active videos grouped by category/creator
  const [allVideos] = await conn.query(`
    SELECT id, youtubeId, title, category, creatorName, duration, thumbnailUrl
    FROM videos 
    WHERE status = 'active' AND youtubeId IS NOT NULL AND youtubeId != ''
    ORDER BY createdAt DESC
  `);

  console.log(`   Total schedulable videos: ${allVideos.length}`);

  // Group videos
  const byCreator = {
    zara: allVideos.filter(v => v.creatorName === 'Zara'),
    nia: allVideos.filter(v => v.creatorName === 'Nia Lux'),
    matthew: allVideos.filter(v => v.creatorName === 'Matthew Brown'),
    ztvlive: allVideos.filter(v => v.creatorName === 'ZTVLIVE'),
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

  console.log(`   Zara: ${byCreator.zara.length}, Nia: ${byCreator.nia.length}, Matthew: ${byCreator.matthew.length}`);

  // Helper: pick video from pool with day-based rotation
  function pickVideo(pool, index) {
    if (pool.length === 0) return allVideos[index % allVideos.length];
    return pool[index % pool.length];
  }

  // Daily programming template (hour, minute, show name, video pool, slot count)
  const DAILY_BLOCKS = [
    // Morning News 6:00am - Zara's culture/news segments
    { hour: 6, minute: 0, show: "Morning with Zara", pool: () => [...byCreator.zara, ...byCategory.news], slots: 3 },
    // Mid-Morning 8:30am - CommunityCut / Nia Lux
    { hour: 8, minute: 30, show: "The Nia Lux Show", pool: () => [...byCreator.nia, ...byCategory.podcasts], slots: 2 },
    // Late Morning 10:00am - CommunityCut Weekly
    { hour: 10, minute: 0, show: "CommunityCut Weekly", pool: () => [...byCategory.podcasts, ...byCreator.matthew], slots: 2 },
    // Noon 12:00pm - Tech Reviews (Matthew)
    { hour: 12, minute: 0, show: "Tech Reviews with Matthew", pool: () => byCategory.tech, slots: 4 },
    // Afternoon 2:00pm - Gaming Block
    { hour: 14, minute: 0, show: "Gaming Block", pool: () => byCategory.gaming, slots: 4 },
    // Late Afternoon 4:00pm - Sports & Culture
    { hour: 16, minute: 0, show: "Sports & Culture", pool: () => [...byCategory.sports, ...byCategory.news], slots: 3 },
    // Prime Time 6:00pm - Zara's Daily Show
    { hour: 18, minute: 0, show: "Zara's Daily Show", pool: () => [...byCreator.zara, ...byCategory.news], slots: 3 },
    // Prime Time 7:30pm - Nia Lux Show
    { hour: 19, minute: 30, show: "The Nia Lux Show (Prime)", pool: () => [...byCreator.nia, ...byCategory.podcasts], slots: 2 },
    // Evening 8:30pm - CommunityCut Prime
    { hour: 20, minute: 30, show: "CommunityCut Prime", pool: () => [...byCategory.podcasts, ...byCreator.matthew], slots: 3 },
    // Late Night 10:00pm - Tech & Gaming
    { hour: 22, minute: 0, show: "Late Night Tech", pool: () => [...byCategory.tech, ...byCategory.gaming], slots: 4 },
    // Overnight 12:00am - Music & Chill
    { hour: 0, minute: 0, show: "Overnight: Music & Chill", pool: () => [...byCategory.music, ...byCategory.other, ...byCategory.podcasts], slots: 3 },
    // Early Morning 3:00am - Tech Replay
    { hour: 3, minute: 0, show: "Early Morning Tech", pool: () => byCategory.tech, slots: 3 },
  ];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  let scheduleInserts = 0;

  for (let day = 0; day < 7; day++) {
    const dayBase = new Date(startOfToday.getTime() + day * 24 * 60 * 60 * 1000);
    
    for (const block of DAILY_BLOCKS) {
      const pool = block.pool();
      let slotTime = new Date(dayBase);
      slotTime.setHours(block.hour, block.minute, 0, 0);
      
      for (let i = 0; i < block.slots; i++) {
        const video = pickVideo(pool, day * 100 + DAILY_BLOCKS.indexOf(block) * 10 + i);
        if (!video) continue;
        
        const dur = video.duration || 600;
        const endTime = new Date(slotTime.getTime() + dur * 1000);
        
        await conn.query(
          `INSERT INTO schedule_items (youtubeId, title, description, thumbnailUrl, startTime, endTime, category, isLive, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
          [video.youtubeId, `${block.show}: ${video.title}`, video.title, video.thumbnailUrl || '', slotTime.getTime(), endTime.getTime(), video.category]
        );
        
        slotTime = endTime;
        scheduleInserts++;
      }
    }
    
    console.log(`   Day ${day + 1} (${dayBase.toDateString()}): ${DAILY_BLOCKS.length} blocks scheduled`);
  }

  console.log(`\n✅ Schedule complete: ${scheduleInserts} slots over 7 days`);
  await conn.end();
  console.log('\n🎉 All done!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
