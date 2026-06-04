/**
 * One-time blast script: CommunityCut Weekly Ep. 2 launch notifications
 * Sends email to all newsletter subscribers + SMS to all opted-in SMS subscribers
 * Run: node server/scripts/ep2-blast.mjs
 */
import { createConnection } from "mysql2/promise";
import nodemailer from "nodemailer";
import twilio from "twilio";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../../.env") });

const DB_URL = process.env.DATABASE_URL;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_MESSAGING_SERVICE_SID;

const EPISODE = {
  showTitle: "CommunityCut Weekly",
  episodeTitle: "The Money Is In The Movement",
  episodeNumber: 2,
  description: "Visibility is the new currency. Nia Luxe breaks down why grooming pros on CommunityCut are averaging 40% more bookings in their first 90 days — and what the new Pro Marketplace means for your business.",
  watchUrl: "https://ztvlivestream.com/shows/communitycut-weekly",
  thumbnailUrl: "https://ztvlivestream.com/manus-storage/ccw_ep2_hero_new_c179fcba.webp",
};

// ── Email HTML ─────────────────────────────────────────────────
function buildEmailHtml() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>CommunityCut Weekly Ep. 2 is LIVE</title>
  <style>
    body{margin:0;padding:0;background:#0a0a0f;font-family:'Helvetica Neue',Arial,sans-serif;color:#e2e8f0;}
    .wrapper{max-width:600px;margin:0 auto;padding:32px 16px;}
    .header{background:linear-gradient(135deg,#1a1a2e,#16213e);border-radius:12px 12px 0 0;padding:32px;text-align:center;border-bottom:2px solid #00d4ff;}
    .logo{font-size:28px;font-weight:900;letter-spacing:2px;background:linear-gradient(90deg,#00d4ff,#7c3aed);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
    .tagline{font-size:12px;color:#64748b;margin-top:4px;letter-spacing:1px;text-transform:uppercase;}
    .body{background:#111827;padding:32px;border-radius:0 0 12px 12px;}
    .body h2{color:#00d4ff;font-size:20px;margin:0 0 16px;}
    .body p{color:#94a3b8;line-height:1.7;margin:0 0 16px;}
    .cta{display:inline-block;background:linear-gradient(90deg,#00d4ff,#7c3aed);color:#fff!important;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;margin:16px 0;}
    .highlight{background:#1e293b;border-left:3px solid #fbbf24;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;color:#e2e8f0;}
    .thumb{width:100%;border-radius:8px;margin-bottom:16px;}
    .footer{text-align:center;padding:24px 0 0;color:#475569;font-size:12px;}
    .footer a{color:#00d4ff;text-decoration:none;}
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="logo">ZTVLIVE</div>
      <div class="tagline">Create. Stream. Earn.</div>
    </div>
    <div class="body">
      <h2>🎬 New Episode Alert!</h2>
      <img src="${EPISODE.thumbnailUrl}" alt="${EPISODE.episodeTitle}" class="thumb"/>
      <div class="highlight">
        <strong style="color:#00d4ff;">${EPISODE.showTitle}</strong> — Episode ${EPISODE.episodeNumber}<br/>
        <strong style="color:#fbbf24;">"${EPISODE.episodeTitle}"</strong>
      </div>
      <p>${EPISODE.description}</p>
      <p>Watch the teaser free — no subscription required.</p>
      <a href="${EPISODE.watchUrl}" class="cta">Watch Now →</a>
      <p style="font-size:13px;color:#475569;">Upgrade to <a href="https://ztvlivestream.com/subscribe" style="color:#7c3aed;">ZTVLIVE+</a> for ad-free streaming and exclusive content.</p>
    </div>
    <div class="footer">
      <p>© 2026 ZTVLIVE. All rights reserved.<br/>
      <a href="https://ztvlivestream.com">ztvlivestream.com</a> · 
      <a href="https://ztvlivestream.com/unsubscribe">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

async function run() {
  // Parse DB connection
  const url = new URL(DB_URL);
  const conn = await createConnection({
    host: url.hostname,
    port: parseInt(url.port || "3306"),
    user: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  });

  // ── Get subscribers ───────────────────────────────────────────
  const [emailRows] = await conn.execute("SELECT email FROM newsletter_subscribers");
  const [smsRows] = await conn.execute("SELECT phone, name FROM sms_subscribers WHERE optedIn = 1");
  await conn.end();

  console.log(`📧 Newsletter subscribers: ${emailRows.length}`);
  console.log(`📱 SMS subscribers (opted in): ${smsRows.length}`);

  // ── Send emails ───────────────────────────────────────────────
  let emailSent = 0;
  if (GMAIL_USER && GMAIL_APP_PASSWORD && emailRows.length > 0) {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
    });
    const subject = `🎬 ${EPISODE.showTitle} Ep. ${EPISODE.episodeNumber} is LIVE — "${EPISODE.episodeTitle}"`;
    const html = buildEmailHtml();
    for (const row of emailRows) {
      try {
        await transport.sendMail({ from: `"ZTVLIVE" <${GMAIL_USER}>`, to: row.email, subject, html });
        emailSent++;
        console.log(`✅ Email → ${row.email}`);
      } catch (err) {
        console.error(`❌ Email failed → ${row.email}:`, err.message);
      }
    }
  } else {
    console.log("⚠️  Email skipped — GMAIL credentials not set or no subscribers");
  }

  // ── Send SMS ──────────────────────────────────────────────────
  let smsSent = 0;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && smsRows.length > 0) {
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    const message = `🎬 ZTVLIVE: CommunityCut Weekly Ep. 2 is LIVE! "The Money Is In The Movement" — Watch free now: ${EPISODE.watchUrl} Reply STOP to unsubscribe.`;
    for (const row of smsRows) {
      try {
        await client.messages.create({
          body: message,
          from: TWILIO_FROM,
          to: row.phone,
        });
        smsSent++;
        console.log(`✅ SMS → ${row.phone}`);
      } catch (err) {
        console.error(`❌ SMS failed → ${row.phone}:`, err.message);
      }
    }
  } else {
    console.log("⚠️  SMS skipped — Twilio credentials not set or no subscribers");
  }

  console.log(`\n✅ BLAST COMPLETE`);
  console.log(`   📧 Emails sent: ${emailSent}/${emailRows.length}`);
  console.log(`   📱 SMS sent: ${smsSent}/${smsRows.length}`);
}

run().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
