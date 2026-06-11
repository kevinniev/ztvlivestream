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

Thank you for the quick response!

Here are the two accounts:

1. kevinniev1@gmail.com
2. admin@communitycut.com

Both accounts are used for ZTVLIVE and CommunityCut video production. Please review both accounts and consolidate everything — credits, avatars, and assets — into whichever account has more workflow and activity. That way we can keep the most productive setup intact.

Please close the other account once the transfer is complete.

Thank you so much for your help!

Best regards,
Kevin
Founder, ZTVLIVE & CommunityCut
ztvlivestream.com | communitycut.com`;

// Reply to both HeyGen threads
const replies = [
  {
    to: 'support@heygen.com',
    subject: 'Re: Account Merge + Credit Transfer Request — ZTVLIVE & CommunityCut',
    inReplyTo: '<355881c8-6d13c9d2-1781112124-215474642595050-2054195@outbound.intercom.heygen.com>',
    references: '<355881c8-6d13c9d2-1781112124-215474642595050-2054195@outbound.intercom.heygen.com>'
  },
  {
    to: 'support@heygen.com', 
    subject: 'Re: Account Merge Request + Credit Transfer — ZTVLIVE',
    inReplyTo: '<fed6a651-59d9733b-1781112185-215474642576728-2054195@outbound.intercom.heygen.com>',
    references: '<fed6a651-59d9733b-1781112185-215474642576728-2054195@outbound.intercom.heygen.com>'
  }
];

for (const reply of replies) {
  try {
    const result = await transporter.sendMail({
      from: `Kevin — ZTVLIVE & CommunityCut <${GMAIL_USER}>`,
      to: reply.to,
      subject: reply.subject,
      inReplyTo: reply.inReplyTo,
      references: reply.references,
      text: replyBody
    });
    console.log(`✅ Reply sent to "${reply.subject}" — Message ID: ${result.messageId}`);
  } catch(e) {
    console.error(`❌ Failed to send reply to "${reply.subject}":`, e.message);
  }
}
