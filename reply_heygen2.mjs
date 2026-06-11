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

if (!GMAIL_USER || !GMAIL_APP_PASSWORD) { console.error('Missing credentials'); process.exit(1); }

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }
});

const replyBody = `Hi Sam,

I also wanted to raise one more important issue while this ticket is open.

We have lost a significant amount of credits just trying to build a few projects for ZTVLIVE and CommunityCut. Many of our generation attempts failed, errored out, produced watermarked output, or returned unusable results — and in each case, credits were consumed without delivering anything we could actually use.

As a small startup trying to build two platforms at the same time, this has been really painful. We did not get the content we needed, and we burned through credits that we cannot afford to just write off.

We are asking HeyGen to please consider one of the following:

1. A credit top-up to compensate for the credits lost to failed, errored, or watermarked generations
2. A discount on our next credit purchase or plan upgrade
3. Any goodwill gesture that acknowledges the difficulty we have experienced trying to get this working

We are not trying to take advantage of anyone — we genuinely want to build with HeyGen for both ZTVLIVE and CommunityCut long term. We just need to be made whole after losing so many credits on attempts that did not work.

We really appreciate your time and hope HeyGen can help us get back on track.

Thank you,
Kevin
Founder, ZTVLIVE & CommunityCut
ztvlivestream.com | communitycut.com`;

const replies = [
  {
    subject: 'Re: Account Merge + Credit Transfer Request — ZTVLIVE & CommunityCut',
    inReplyTo: '<355881c8-6d13c9d2-1781112124-215474642595050-2054195@outbound.intercom.heygen.com>',
    references: '<355881c8-6d13c9d2-1781112124-215474642595050-2054195@outbound.intercom.heygen.com>'
  },
  {
    subject: 'Re: Account Merge Request + Credit Transfer — ZTVLIVE',
    inReplyTo: '<fed6a651-59d9733b-1781112185-215474642576728-2054195@outbound.intercom.heygen.com>',
    references: '<fed6a651-59d9733b-1781112185-215474642576728-2054195@outbound.intercom.heygen.com>'
  }
];

for (const reply of replies) {
  try {
    const result = await transporter.sendMail({
      from: `Kevin — ZTVLIVE & CommunityCut <${GMAIL_USER}>`,
      to: 'support@heygen.com',
      subject: reply.subject,
      inReplyTo: reply.inReplyTo,
      references: reply.references,
      text: replyBody
    });
    console.log(`✅ Follow-up sent: "${reply.subject}" — ID: ${result.messageId}`);
  } catch(e) {
    console.error(`❌ Failed:`, e.message);
  }
}
