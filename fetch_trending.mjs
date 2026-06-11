import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) dotenv.config({ path: envPath });

const SERPER_KEY = process.env.SerperAPIKeys;
console.log('Serper key configured:', !!SERPER_KEY);

async function searchNews(query, num = 5) {
  const resp = await fetch('https://google.serper.dev/news', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ q: query, num })
  });
  const data = await resp.json();
  return data.news || [];
}

const searches = [
  { q: 'Black entertainment celebrity news today', num: 5 },
  { q: 'NBA basketball trending news today', num: 3 },
  { q: 'BET Awards streaming TV news today', num: 3 },
  { q: 'Arizona entertainment events news today', num: 3 }
];

const allResults = [];
const now = Date.now();
const oneDayMs = 24 * 60 * 60 * 1000;

for (const search of searches) {
  console.log(`\nSearching: "${search.q}"`);
  try {
    const results = await searchNews(search.q, search.num);
    for (const item of results) {
      // Filter for last 24 hours if date available
      const publishedAt = item.date ? new Date(item.date).getTime() : null;
      const isRecent = !publishedAt || (now - publishedAt) < oneDayMs * 2;
      if (isRecent) {
        allResults.push({
          title: item.title,
          snippet: item.snippet,
          source: item.source,
          date: item.date,
          link: item.link,
          category: search.q
        });
        console.log(`  + ${item.title} (${item.source}, ${item.date})`);
      }
    }
  } catch(e) {
    console.error(`  Error searching "${search.q}":`, e.message);
  }
}

console.log(`\nTotal results collected: ${allResults.length}`);

// Pick top 2 most timely stories
const top2 = allResults.slice(0, 2);
console.log('\n=== TOP 2 STORIES ===');
top2.forEach((s, i) => {
  console.log(`\nStory ${i+1}: ${s.title}`);
  console.log(`Source: ${s.source} | Date: ${s.date}`);
  console.log(`Snippet: ${s.snippet}`);
  console.log(`Link: ${s.link}`);
});

// Export for use in other scripts
import { writeFileSync } from 'fs';
writeFileSync('/home/ubuntu/trending_topics.json', JSON.stringify({ top2, all: allResults }, null, 2));
console.log('\nSaved to /home/ubuntu/trending_topics.json');
