import https from 'https';

const API_KEY = process.env.SerperAPIKeys;
console.log('Key present:', !!API_KEY, '| Length:', API_KEY ? API_KEY.length : 0);

const queries = [
  { q: 'Black entertainment celebrity news today', num: 5 },
  { q: 'NBA basketball trending news today', num: 3 },
  { q: 'BET Awards 2026 performers streaming TV news', num: 3 },
  { q: 'Arizona entertainment events news today', num: 3 },
];

async function serperSearch(q, num) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ q, num });
    const options = {
      hostname: 'google.serper.dev',
      path: '/news',
      method: 'POST',
      headers: {
        'X-API-KEY': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ error: 'parse error', raw: data.slice(0,200) }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const allResults = [];

for (const { q, num } of queries) {
  console.log(`\nSearching: "${q}"`);
  const r = await serperSearch(q, num);
  if (r.news) {
    console.log(`  Found ${r.news.length} results:`);
    r.news.forEach(n => {
      console.log(`  - [${n.date}] ${n.title}`);
      allResults.push({ query: q, title: n.title, snippet: n.snippet, date: n.date, source: n.source, link: n.link });
    });
  } else {
    console.log('  ERROR:', JSON.stringify(r).slice(0, 200));
  }
  await new Promise(r => setTimeout(r, 500));
}

console.log('\n=== ALL RESULTS SUMMARY ===');
console.log(JSON.stringify(allResults, null, 2));
