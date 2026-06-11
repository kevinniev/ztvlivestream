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

console.log('Checking inbox for:', GMAIL_USER);

const imap = new Imap({
  user: GMAIL_USER,
  password: GMAIL_APP_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false }
});

function openInbox(cb) {
  imap.openBox('INBOX', false, cb);
}

imap.once('ready', function() {
  openInbox(function(err, box) {
    if (err) { console.error('Error opening inbox:', err); imap.end(); return; }
    
    // Search for emails from HeyGen in the last 7 days
    const since = new Date();
    since.setDate(since.getDate() - 7);
    
    imap.search([['FROM', 'heygen'], ['SINCE', since]], function(err, results) {
      if (err) { console.error('Search error:', err); imap.end(); return; }
      
      if (!results || results.length === 0) {
        console.log('No emails from HeyGen found in the last 7 days.');
        imap.end();
        return;
      }
      
      console.log(`Found ${results.length} email(s) from HeyGen`);
      
      const fetch = imap.fetch(results, { bodies: '' });
      const emails = [];
      
      fetch.on('message', function(msg, seqno) {
        msg.on('body', function(stream) {
          simpleParser(stream, (err, parsed) => {
            if (err) return;
            emails.push({
              seqno,
              from: parsed.from?.text,
              subject: parsed.subject,
              date: parsed.date,
              text: parsed.text?.substring(0, 2000),
              messageId: parsed.messageId
            });
          });
        });
      });
      
      fetch.once('end', function() {
        setTimeout(() => {
          emails.forEach((email, i) => {
            console.log(`\n=== Email ${i + 1} ===`);
            console.log('From:', email.from);
            console.log('Subject:', email.subject);
            console.log('Date:', email.date);
            console.log('Message ID:', email.messageId);
            console.log('Body:\n', email.text);
          });
          imap.end();
        }, 1000);
      });
    });
  });
});

imap.once('error', function(err) {
  console.error('IMAP error:', err);
});

imap.connect();
