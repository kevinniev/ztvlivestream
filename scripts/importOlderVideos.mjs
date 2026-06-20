/**
 * Import all older ZTVLIVE channel videos that aren't in the DB yet.
 * These were discovered by scraping the channel page.
 */
import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;

// All discovered older ZTVLIVE videos
const VIDEOS = [
  // Eliances Grand Table interviews
  { youtubeId: '1ZwU1vT0lTc', title: '2021 Eliances Grand Table | Interview with Sherry Anshara', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: '8U_ahR4YwT4', title: '2021 Eliances Grand Table | Interview with Carolyn Hennesy', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'C0XvBYaOtEA', title: '2021 Eliances Grand Table | Interview with Jake White', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'JskFtteStrc', title: '2021 Eliances Grand Table | Interview with Dan Nainan', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'KM8PGI66zws', title: '2021 Eliances Grand Table | Interview with Barry Mione', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'NVhWGFyvRxQ', title: '2021 Eliances Grand Table | Interview with Jack McCauley', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'k08EgmkcvLk', title: '2021 Eliances Grand Table | Interview with Kimber Leigh', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'muico9K7pk8', title: '2021 Eliances Grand Table | Interview with Jay Tenenbaum', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'oHDXzVRhCdM', title: '2021 Eliances Grand Table | Interview with Jeff Hoffman', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'ql-X2vCmCkI', title: '2021 Eliances Grand Table | Interview with Joseph Wright', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'tDR-mIgrOnc', title: '2021 Eliances Grand Table | Interview with Ac Caswell', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'ukLbNs_VKJs', title: '2021 Eliances Grand Table | Interview with Art Bell', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'xSYDoE_imVw', title: 'Eliances Grand Table Interview with David Cogan', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'Xdt_6AGKdzA', title: 'Eliances Grandtable - Where Entrepreneurs Align', category: 'podcasts', creatorName: 'ZTVLIVE', duration: 2400 },

  // Million Dollar Mingle
  { youtubeId: 'JRpCdxqMDY4', title: 'Million Dollar Mingle Luxury Polo Event 2020 - Interview with Edrinna Moosman', category: 'other', creatorName: 'ZTVLIVE', duration: 900 },
  { youtubeId: 'bz1JfImy2Pg', title: 'Million Dollar Mingle Luxury Polo Event 2020 - Interview with AC Caswell (CEO)', category: 'other', creatorName: 'ZTVLIVE', duration: 900 },
  { youtubeId: 'kIb5xPzhoIY', title: 'Million Dollar Mingle Luxury Polo Event 2020 - Interview with Sheldon Bailey & Beverly Peele', category: 'other', creatorName: 'ZTVLIVE', duration: 900 },
  { youtubeId: 'wqBkmLf9Ib0', title: '2021 Million Dollar Mingle Celebrity Polo Party Luxury Lounge Experience', category: 'other', creatorName: 'ZTVLIVE', duration: 1800 },
  { youtubeId: 'yJ2sL_6WYHk', title: 'Million Dollar Mingle Luxury Polo Event 2020 - Interview with Maria Birte', category: 'other', creatorName: 'ZTVLIVE', duration: 900 },

  // Concerts & Live Events
  { youtubeId: 'Ote5FP2yPW0', title: 'MC Magic Live Concert 2019', category: 'music', creatorName: 'ZTVLIVE', duration: 3600 },
  { youtubeId: 'WvXLQYd2vZE', title: 'The ZAPP BAND Concert', category: 'music', creatorName: 'ZTVLIVE', duration: 3600 },

  // Champions for the Homeless
  { youtubeId: 'N9G1m40XsEQ', title: 'Champions for the Homeless - Interview with Nick Lowery (former NFL player)', category: 'news', creatorName: 'ZTVLIVE', duration: 1200 },
  { youtubeId: 'ZUmiIDnbX6A', title: 'Champions for the Homeless - Interview with William Joseph', category: 'news', creatorName: 'ZTVLIVE', duration: 1200 },

  // The Rundown w/ Zoe
  { youtubeId: '3exCFsjlTwY', title: 'The Rundown w/ Zoe | Black Music Month, Knicks NBA Finals, Tony Awards & More | ZTVLIVE', category: 'news', creatorName: 'Zoe', duration: 900 },
];

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  console.log('✅ Connected to DB');

  let imported = 0;
  let skipped = 0;

  for (const v of VIDEOS) {
    const [existing] = await conn.query('SELECT id FROM videos WHERE youtubeId = ?', [v.youtubeId]);
    if (existing.length > 0) {
      console.log(`   SKIP: ${v.title.substring(0, 60)}`);
      skipped++;
      continue;
    }

    const thumbUrl = `https://i.ytimg.com/vi/${v.youtubeId}/hqdefault.jpg`;

    await conn.query(
      `INSERT INTO videos (youtubeId, title, description, thumbnailUrl, category, creatorName, duration, status, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', NOW())`,
      [v.youtubeId, v.title, v.title, thumbUrl, v.category, v.creatorName, v.duration]
    );
    console.log(`   ✅ [${v.category}] ${v.title.substring(0, 60)} (${v.creatorName})`);
    imported++;
  }

  console.log(`\n✅ Import complete: ${imported} imported, ${skipped} skipped`);
  await conn.end();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
