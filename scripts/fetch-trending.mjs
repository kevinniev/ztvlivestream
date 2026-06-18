import https from 'https';

const API_KEY = process.env.SerperAPIKeys;

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
        catch(e) { resolve({ error: 'parse error', raw: data.slice(0, 200) }); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const queries = [
  { q: 'Black entertainment celebrity news today', num: 5 },
  { q: 'NBA basketball trending news today', num: 3 },
  { q: 'BET Awards 2026 performers streaming TV news', num: 3 },
  { q: 'Arizona entertainment events news today', num: 3 },
];

const allStories = [];

for (const { q, num } of queries) {
  const r = await serperSearch(q, num);
  if (r.news) {
    for (const n of r.news) {
      allStories.push({ query: q, title: n.title, snippet: n.snippet, date: n.date, source: n.source, link: n.link });
    }
  } else {
    console.error('Search error for:', q, JSON.stringify(r).slice(0, 200));
    process.exit(1);
  }
  await new Promise(r => setTimeout(r, 400));
}

console.log(JSON.stringify(allStories, null, 2));
