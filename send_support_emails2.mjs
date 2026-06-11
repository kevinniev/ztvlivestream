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

// Email 1: HeyGen Support — Updated with both brands
const heygenEmail = {
  from: `Kevin — ZTVLIVE & CommunityCut <${GMAIL_USER}>`,
  to: 'support@heygen.com',
  subject: 'Account Merge + Credit Transfer Request — ZTVLIVE & CommunityCut',
  text: `Hi HeyGen Team,

My name is Kevin, and I am the founder of two platforms:

- ZTVLIVE (ztvlivestream.com) — a premium 24/7 streaming platform featuring AI-hosted shows, live events, and original content
- CommunityCut (communitycut.com) — a nationwide on-demand mobile grooming marketplace connecting clients with Black-owned barbers, braiders, nail techs, and stylists

Both platforms rely heavily on HeyGen for AI-powered video content production. We use HeyGen to produce show episodes, host avatar videos, promotional content, and marketing materials for both ZTVLIVE and CommunityCut.

I currently have two HeyGen accounts and am writing to request the following:

1. Merge both accounts into my primary account
2. Transfer all remaining credits from kevinniev1@gmail.com to my primary account
3. Permanently close the kevinniev1@gmail.com account

The cost of maintaining two separate accounts has become unsustainable at our current stage. We are genuinely invested in HeyGen's technology and want to continue building with it across both ZTVLIVE and CommunityCut — but we need to consolidate to make that viable long-term.

If a full credit transfer is not possible, we would appreciate a refund for the unused credits on the kevinniev1@gmail.com account.

Please let me know what information you need to process this request. We truly value the partnership and hope to continue growing with HeyGen.

Thank you for your time and support.

Best regards,
Kevin
Founder, ZTVLIVE & CommunityCut
ztvlivestream.com | communitycut.com`
};

// Email 2: Manus Support — Updated with both brands
const manusEmail = {
  from: `Kevin — ZTVLIVE & CommunityCut <${GMAIL_USER}>`,
  to: 'help@manus.im',
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
  console.log('\nSending updated email to HeyGen...');
  const r1 = await transporter.sendMail(heygenEmail);
  console.log('HeyGen email sent! Message ID:', r1.messageId);
} catch(e) {
  console.error('HeyGen email failed:', e.message);
}

try {
  console.log('\nSending updated email to Manus...');
  const r2 = await transporter.sendMail(manusEmail);
  console.log('Manus email sent! Message ID:', r2.messageId);
} catch(e) {
  console.error('Manus email failed:', e.message);
}
