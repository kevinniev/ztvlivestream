import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Load env from webdev
const envOutput = execSync('source /opt/.manus/webdev.sh.env && env', { shell: '/bin/bash' }).toString();
const envVars = {};
for (const line of envOutput.split('\n')) {
  const idx = line.indexOf('=');
  if (idx > 0) {
    envVars[line.substring(0, idx)] = line.substring(idx + 1);
  }
}

const SERPER_KEY = envVars['SerperAPIKeys'];
console.log('Serper key available:', !!SERPER_KEY, SERPER_KEY ? SERPER_KEY.substring(0,8)+'...' : 'MISSING');

const searches = [
  { q: "Black entertainment celebrity news today", num: 5 },
  { q: "NBA basketball trending news today", num: 3 },
  { q: "BET Awards streaming TV news today", num: 3 },
  { q: "Arizona entertainment events news today", num: 3 },
];

async function fetchNews(query) {
  const res = await fetch('https://google.serper.dev/news', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(query),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper error ${res.status}: ${text}`);
  }
  return res.json();
}

const allResults = [];
const now = Date.now();
const oneDayAgo = now - 24 * 60 * 60 * 1000;

for (const search of searches) {
  try {
    console.log(`\nFetching: "${search.q}"...`);
    const data = await fetchNews(search);
    const news = data.news || [];
    console.log(`  Found ${news.length} results`);
    for (const item of news) {
      const pubDate = item.date ? new Date(item.date).getTime() : 0;
      const isRecent = pubDate > oneDayAgo || item.date?.includes('hour') || item.date?.includes('minute') || item.date?.includes('just now');
      console.log(`  - [${isRecent ? 'RECENT' : 'older'}] ${item.title?.substring(0,80)} | ${item.date}`);
      if (isRecent || !item.date) {
        allResults.push({ ...item, searchQuery: search.q });
      }
    }
  } catch (err) {
    console.error(`  Error: ${err.message}`);
  }
}

console.log('\n=== TOP TRENDING STORIES (last 24h) ===');
const top2 = allResults.slice(0, 2);
top2.forEach((s, i) => {
  console.log(`\n#${i+1}: ${s.title}`);
  console.log(`  Source: ${s.source} | Date: ${s.date}`);
  console.log(`  Snippet: ${s.snippet?.substring(0,200)}`);
  console.log(`  Link: ${s.link}`);
});

// Save to file for use in next steps
import { writeFileSync } from 'fs';
writeFileSync('/tmp/trending_topics.json', JSON.stringify(allResults, null, 2));
console.log('\nSaved all results to /tmp/trending_topics.json');
