import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) dotenv.config({ path: envPath });

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

console.log('Gmail user:', GMAIL_USER);
if (!GMAIL_USER || !GMAIL_APP_PASSWORD) { console.error('Missing credentials'); process.exit(1); }

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
});

// Send to both known Manus support emails
const manusEmail = {
  from: `Kevin — ZTVLIVE & CommunityCut <${GMAIL_USER}>`,
  to: 'support@manus.im',
  cc: 'contact@manus.im',
  subject: 'Discount Request — Building ZTVLIVE & CommunityCut on Manus',
  text: `Hi Manus Team,

My name is Kevin, and I am the founder of two platforms currently being built on Manus:

- ZTVLIVE (ztvlivestream.com) — a premium 24/7 streaming platform with AI-hosted shows, live events, creator monetization, and automated content production
- CommunityCut (communitycut.com) — a nationwide on-demand mobile grooming marketplace connecting clients with Black-owned grooming professionals across the US

Manus has been the backbone of both builds — from the full website and backend infrastructure, to content automation, social media workflows, video production pipelines, scheduling systems, and more. I have been using Manus extensively across both platforms and it has been instrumental in getting them to where they are today.

However, the current cost structure is becoming very difficult to sustain at this early stage. I am writing to respectfully request a discount, adjusted pricing, or temporary credit to help us get through this critical build and launch phase.

Both ZTVLIVE and CommunityCut are at pivotal moments. If I am unable to get some relief on pricing, I will be in the position of having to pause development on both platforms — which would significantly delay our public launch and set back everything we have built together.

I am fully committed to Manus as my primary AI development platform for both businesses. I believe in what you are building and want to continue growing with you. I just need a little breathing room to get to the other side of launch.

I would greatly appreciate any options you can offer — startup discount, reduced rate, or temporary credit.

Thank you for building such a powerful platform and for considering this request.

Best regards,
Kevin
Founder, ZTVLIVE & CommunityCut
ztvlivestream.com | communitycut.com`
};

try {
  console.log('\nSending email to Manus support (support@manus.im + contact@manus.im)...');
  const r = await transporter.sendMail(manusEmail);
  console.log('✅ Manus email sent! Message ID:', r.messageId);
} catch(e) {
  console.error('❌ Manus email failed:', e.message);
}
