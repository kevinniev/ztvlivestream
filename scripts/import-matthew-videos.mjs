/**
 * Import all Good Tech Cheap YouTube videos into ZTVLIVE
 * Channel: @GoodTechCheap — UCzT6efvz-_liWy7zFNhcUEA
 * Creator: Matthew Brown (userId 180001)
 */
import mysql from 'mysql2/promise';
import https from 'https';

const CHANNEL_ID = 'UCzT6efvz-_liWy7zFNhcUEA';
const CREATOR_ID = 180001;
const CREATOR_NAME = 'Matthew Brown';

// Get a fresh access token using the refresh token
async function getAccessToken() {
  const params = new URLSearchParams({
    client_id: process.env.YOUTUBE_CLIENT_ID,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET,
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          console.error('OAuth error:', parsed.error, parsed.error_description);
          resolve(null);
        } else {
          resolve(parsed.access_token);
        }
      });
    });
    req.on('error', reject);
    req.write(params.toString());
    req.end();
  });
}

// Fetch all videos from a YouTube channel using the uploads playlist
async function fetchAllVideos(accessToken) {
  const allVideos = [];
  
  // Step 1: Get the uploads playlist ID from the channel
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}`;
  const channelData = await fetchJson(channelUrl, accessToken);
  const uploadsPlaylistId = channelData?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  
  if (!uploadsPlaylistId) {
    console.error('Could not find uploads playlist. Channel response:', JSON.stringify(channelData));
    return allVideos;
  }
  
  console.log(`Uploads playlist ID: ${uploadsPlaylistId}`);
  
  // Step 2: Paginate through all playlist items
  let pageToken = null;
  let page = 1;
  
  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const data = await fetchJson(url, accessToken);
    
    if (data.error) {
      console.error('API error:', JSON.stringify(data.error));
      break;
    }
    
    const items = data.items || [];
    console.log(`Page ${page}: fetched ${items.length} videos (total so far: ${allVideos.length + items.length})`);
    
    for (const item of items) {
      const snippet = item.snippet;
      const videoId = snippet?.resourceId?.videoId || item.contentDetails?.videoId;
      if (!videoId) continue;
      
      allVideos.push({
        youtubeId: videoId,
        title: snippet.title || 'Untitled',
        description: snippet.description || '',
        thumbnailUrl: snippet.thumbnails?.maxres?.url || snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || '',
        publishedAt: snippet.publishedAt || new Date().toISOString(),
      });
    }
    
    pageToken = data.nextPageToken;
    page++;
    
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 200));
  } while (pageToken);
  
  return allVideos;
}

// Fetch video details (duration, view count) in batches of 50
async function fetchVideoDetails(videoIds, accessToken) {
  const details = {};
  
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${batch.join(',')}`;
    const data = await fetchJson(url, accessToken);
    
    for (const item of (data.items || [])) {
      details[item.id] = {
        duration: item.contentDetails?.duration || '',
        viewCount: parseInt(item.statistics?.viewCount || '0'),
        likeCount: parseInt(item.statistics?.likeCount || '0'),
      };
    }
    
    await new Promise(r => setTimeout(r, 200));
  }
  
  return details;
}

function fetchJson(url, accessToken) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// Determine category from title/description
function categorizeVideo(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  if (text.includes('gaming') || text.includes('game') || text.includes('battlefield') || 
      text.includes('diablo') || text.includes('gameplay') || text.includes('multiplayer') ||
      text.includes('xbox') || text.includes('playstation') || text.includes('ps5') ||
      text.includes('nintendo') || text.includes('steam')) return 'gaming';
  if (text.includes('unboxing') || text.includes('tech') || text.includes('gadget') ||
      text.includes('review') || text.includes('camera') || text.includes('monitor') ||
      text.includes('laptop') || text.includes('phone') || text.includes('smart') ||
      text.includes('charger') || text.includes('battery') || text.includes('drone')) return 'tech';
  return 'tech'; // Default for Good Tech Cheap
}

async function main() {
  console.log('=== Good Tech Cheap Video Import ===');
  console.log(`Channel: ${CHANNEL_ID}`);
  console.log(`Creator: ${CREATOR_NAME} (id: ${CREATOR_ID})`);
  
  // Get access token
  const accessToken = await getAccessToken();
  if (!accessToken) {
    console.error('Failed to get access token. Trying with a different approach...');
    // Try using the YouTube Data API with a public key if available
    await importWithoutAuth();
    return;
  }
  
  console.log('✓ Got access token');
  
  // Fetch all videos
  console.log('\nFetching all videos from YouTube...');
  const videos = await fetchAllVideos(accessToken);
  console.log(`\n✓ Found ${videos.length} total videos`);
  
  if (videos.length === 0) {
    console.error('No videos found. Exiting.');
    return;
  }
  
  // Fetch video details
  console.log('\nFetching video details (duration, views)...');
  const videoIds = videos.map(v => v.youtubeId);
  const details = await fetchVideoDetails(videoIds, accessToken);
  console.log(`✓ Got details for ${Object.keys(details).length} videos`);
  
  // Connect to database
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Get existing YouTube IDs to avoid duplicates
  const [existing] = await conn.execute('SELECT youtubeId FROM videos WHERE creatorId = ?', [CREATOR_ID]);
  const existingIds = new Set(existing.map(r => r.youtubeId));
  console.log(`\nExisting videos for Matthew: ${existingIds.size}`);
  
  // Filter out already-imported videos
  const newVideos = videos.filter(v => !existingIds.has(v.youtubeId));
  console.log(`New videos to import: ${newVideos.length}`);
  
  if (newVideos.length === 0) {
    console.log('All videos already imported!');
    await conn.end();
    return;
  }
  
  // Insert in batches
  let imported = 0;
  let errors = 0;
  
  for (const video of newVideos) {
    const detail = details[video.youtubeId] || {};
    const category = categorizeVideo(video.title, video.description);
    
    try {
      await conn.execute(
        `INSERT INTO videos (youtubeId, title, description, thumbnailUrl, category, viewCount, likeCount, duration, creatorName, creatorId, isFeatured, isLive, status, publishedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, false, false, 'approved', ?)`,
        [
          video.youtubeId,
          video.title.substring(0, 255),
          (video.description || '').substring(0, 65535),
          video.thumbnailUrl || '',
          category,
          detail.viewCount || 0,
          detail.likeCount || 0,
          detail.duration || '',
          CREATOR_NAME,
          CREATOR_ID,
          new Date(video.publishedAt),
        ]
      );
      imported++;
      if (imported % 50 === 0) console.log(`  Imported ${imported}/${newVideos.length}...`);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        // Skip duplicates silently
      } else {
        console.error(`Error importing ${video.youtubeId}:`, err.message);
        errors++;
      }
    }
  }
  
  await conn.end();
  
  console.log(`\n=== Import Complete ===`);
  console.log(`✓ Imported: ${imported} videos`);
  console.log(`✗ Errors: ${errors}`);
  console.log(`Total Matthew videos now: ${existingIds.size + imported}`);
}

main().catch(console.error);
