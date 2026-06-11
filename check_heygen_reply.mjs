import Imap from 'imap';
import { simpleParser } from 'mailparser';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '.env');
if (existsSync(envPath)) dotenv.config({ path: envPath });

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const imap = new Imap({
  user: GMAIL_USER,
  password: GMAIL_APP_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

imap.once('ready', function() {
  imap.openBox('INBOX', false, function(err, box) {
    if (err) { console.error(err); imap.end(); return; }

    // Search for HeyGen emails in the last 2 hours
    const since = new Date();
    since.setHours(since.getHours() - 2);

    imap.search([['FROM', 'heygen'], ['SINCE', since]], function(err, results) {
      if (err || !results || results.length === 0) {
        console.log('No new HeyGen emails found in last 2 hours.');
        imap.end();
        return;
      }

      console.log(`Found ${results.length} recent HeyGen email(s)`);
      const fetch = imap.fetch(results, { bodies: '' });
      const emails = [];

      fetch.on('message', function(msg, seqno) {
        msg.on('body', function(stream) {
          simpleParser(stream, (err, parsed) => {
            if (!err) emails.push({
              seqno,
              from: parsed.from?.text,
              subject: parsed.subject,
              date: parsed.date,
              text: parsed.text?.substring(0, 3000),
              messageId: parsed.messageId,
              inReplyTo: parsed.inReplyTo
            });
          });
        });
      });

      fetch.once('end', function() {
        setTimeout(() => {
          // Sort by date, newest last
          emails.sort((a, b) => new Date(a.date) - new Date(b.date));
          emails.forEach((email, i) => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`Email ${i + 1} of ${emails.length}`);
            console.log(`From: ${email.from}`);
            console.log(`Subject: ${email.subject}`);
            console.log(`Date: ${email.date}`);
            console.log(`Message ID: ${email.messageId}`);
            console.log(`\nBody:\n${email.text}`);
          });
          imap.end();
        }, 1000);
      });
    });
  });
});

imap.once('error', function(err) { console.error('IMAP error:', err); });
imap.connect();
