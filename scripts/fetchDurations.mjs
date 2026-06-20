/**
 * fetchDurations.mjs
 * Fetches real TRT (duration in seconds) for all videos using YouTube oEmbed + noembed.com
 * Updates the videos table with real durations.
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Get all videos
const [videos] = await conn.execute(
  `SELECT id, youtubeId, title, duration FROM videos WHERE youtubeId IS NOT NULL AND youtubeId != ''`
);

console.log(`Fetching durations for ${videos.length} videos...`);

// YouTube duration comes from the ISO 8601 duration in the page metadata
// We'll use a lightweight approach: fetch the YouTube watch page and parse duration
async function getDuration(youtubeId) {
  try {
    const url = `https://www.youtube.com/watch?v=${youtubeId}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ZTVLIVE/1.0)',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
    });
    const html = await res.text();

    // Try "lengthSeconds":"NNN" pattern
    const match1 = html.match(/"lengthSeconds":"(\d+)"/);
    if (match1) return parseInt(match1[1]);

    // Try approxDurationMs
    const match2 = html.match(/"approxDurationMs":"(\d+)"/);
    if (match2) return Math.round(parseInt(match2[1]) / 1000);

    // Try duration in meta
    const match3 = html.match(/itemprop="duration" content="PT(\d+)M(\d+)S"/);
    if (match3) return parseInt(match3[1]) * 60 + parseInt(match3[2]);

    const match4 = html.match(/itemprop="duration" content="PT(\d+)S"/);
    if (match4) return parseInt(match4[1]);

    const match5 = html.match(/itemprop="duration" content="PT(\d+)M"/);
    if (match5) return parseInt(match5[1]) * 60;

    return null;
  } catch (e) {
    return null;
  }
}

let updated = 0;
let failed = 0;

for (const video of videos) {
  const currentDur = parseInt(video.duration) || 0;
  
  // Skip if we already have a good duration (> 30 seconds)
  if (currentDur > 30) {
    process.stdout.write('.');
    continue;
  }

  const dur = await getDuration(video.youtubeId);
  
  if (dur && dur > 0) {
    await conn.execute('UPDATE videos SET duration = ? WHERE id = ?', [String(dur), video.id]);
    updated++;
    process.stdout.write(`\n  ✅ ${video.youtubeId} "${video.title.substring(0,50)}" → ${dur}s (${Math.floor(dur/60)}m${dur%60}s)`);
  } else {
    failed++;
    process.stdout.write(`\n  ⚠️  ${video.youtubeId} "${video.title.substring(0,50)}" → FAILED, using 600s default`);
    await conn.execute('UPDATE videos SET duration = ? WHERE id = ?', ['600', video.id]);
  }

  // Small delay to avoid rate limiting
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\n\nDone! Updated: ${updated}, Failed (set to 600s): ${failed}`);

// Show summary
const [summary] = await conn.execute(
  `SELECT MIN(CAST(duration AS UNSIGNED)) as minDur, MAX(CAST(duration AS UNSIGNED)) as maxDur, AVG(CAST(duration AS UNSIGNED)) as avgDur, COUNT(*) as total FROM videos WHERE youtubeId IS NOT NULL`
);
console.log('Duration summary:', JSON.stringify(summary[0], null, 2));

await conn.end();
