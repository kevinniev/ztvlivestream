/**
 * ZTVLIVE Email Notification Helper
 * Sends transactional emails via Gmail SMTP (App Password) and
 * also fires a Manus owner push notification for every key event.
 */

import nodemailer from "nodemailer";
import { notifyOwner } from "./_core/notification";

// ── SMTP transport (Gmail App Password) ─────────────────────────
const GMAIL_USER = process.env.GMAIL_USER ?? "";
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD ?? "";
const FROM_ADDRESS = `"ZTVLIVE" <${GMAIL_USER || "noreply@ztvlivestream.com"}>`;

function getTransport() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return null;
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    console.warn("[Email] GMAIL_USER or GMAIL_APP_PASSWORD not set — skipping email send");
    return false;
  }
  try {
    await transport.sendMail({
      from: FROM_ADDRESS,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text ?? opts.subject,
    });
    console.log(`[Email] Sent "${opts.subject}" to ${opts.to}`);
    return true;
  } catch (err) {
    console.error("[Email] Failed to send email:", err);
    return false;
  }
}

// ── Shared HTML template ─────────────────────────────────────────
function wrapHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
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
    .highlight{background:#1e293b;border-left:3px solid #00d4ff;padding:12px 16px;border-radius:0 8px 8px 0;margin:16px 0;color:#e2e8f0;}
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
      ${body}
    </div>
    <div class="footer">
      <p>© 2026 ZTVLIVE. All rights reserved.<br/>
      <a href="https://www.ztvlivestream.com">www.ztvlivestream.com</a> · 
      <a href="https://www.ztvlivestream.com/unsubscribe">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ── Public notification functions ────────────────────────────────

/**
 * Welcome email sent to new newsletter subscribers.
 */
export async function sendWelcomeEmail(email: string): Promise<void> {
  const subject = "Welcome to ZTVLIVE — Free 24/7 Streaming is Here 📺";
  const html = wrapHtml(subject, `
    <h2>You're in! Welcome to ZTVLIVE 🎉</h2>
    <p>Thank you for subscribing. You'll be the first to know about:</p>
    <div class="highlight">
      📺 New show drops every week<br/>
      🎮 Live events & gaming streams<br/>
      🏆 Quiz game prizes & leaderboards<br/>
      💰 Creator opportunities (earn 70% revenue share)
    </div>
    <p>Start watching right now — completely free, no subscription needed.</p>
    <a href="https://www.ztvlivestream.com" class="cta">Watch Free Now →</a>
    <p>Want to earn while you create? <a href="https://www.ztvlivestream.com/creator" style="color:#00d4ff;">Become a Creator</a> and keep 70% of your revenue.</p>
  `);
  await sendEmail({ to: email, subject, html });

  // Notify owner
  await notifyOwner({
    title: "📧 New ZTVLIVE Subscriber",
    content: `New newsletter subscriber: ${email}\n\nTotal subscriber count is growing. Check the dashboard for stats.`,
  }).catch(() => {});
}

/**
 * New episode drop alert sent to all newsletter subscribers.
 */
export async function sendEpisodeDropEmail(opts: {
  to: string;
  showTitle: string;
  episodeTitle: string;
  description: string;
  thumbnailUrl?: string;
  watchUrl: string;
}): Promise<void> {
  const subject = `🆕 New on ZTVLIVE: ${opts.showTitle} — ${opts.episodeTitle}`;
  const thumbImg = opts.thumbnailUrl
    ? `<img src="${opts.thumbnailUrl}" alt="${opts.episodeTitle}" style="width:100%;border-radius:8px;margin-bottom:16px;"/>`
    : "";
  const html = wrapHtml(subject, `
    <h2>New Episode Just Dropped 🎬</h2>
    ${thumbImg}
    <div class="highlight">
      <strong style="color:#00d4ff;">${opts.showTitle}</strong><br/>
      ${opts.episodeTitle}
    </div>
    <p>${opts.description}</p>
    <a href="${opts.watchUrl}" class="cta">Watch Now →</a>
    <p style="font-size:13px;color:#475569;">Upgrade to <a href="https://www.ztvlivestream.com/subscribe" style="color:#7c3aed;">ZTVLIVE+</a> for ad-free viewing and exclusive content.</p>
  `);
  await sendEmail({ to: opts.to, subject, html });
}

/**
 * Creator application received confirmation.
 */
export async function sendCreatorApplicationEmail(opts: {
  to: string;
  name: string;
  title: string;
}): Promise<void> {
  const subject = "ZTVLIVE Creator Application Received ✅";
  const html = wrapHtml(subject, `
    <h2>Application Received, ${opts.name}! 🎬</h2>
    <p>We've received your content submission for:</p>
    <div class="highlight"><strong>${opts.title}</strong></div>
    <p>Our team reviews all submissions within <strong>24–48 hours</strong>. You'll receive an email once your slot is approved or if we need any changes.</p>
    <p>While you wait, explore the Creator Hub for tips on maximizing your earnings:</p>
    <a href="https://www.ztvlivestream.com/creator" class="cta">Creator Hub →</a>
    <p style="font-size:13px;color:#475569;">Remember: approved creators keep <strong style="color:#00d4ff;">70% of all revenue</strong> generated from their content.</p>
  `);
  await sendEmail({ to: opts.to, subject, html });

  // Notify owner
  await notifyOwner({
    title: "🎬 New Creator Application",
    content: `Creator: ${opts.name} (${opts.to})\nContent: "${opts.title}"\n\nReview at: https://www.ztvlivestream.com/creator/dashboard`,
  }).catch(() => {});
}

/**
 * Creator slot approved notification.
 */
export async function sendCreatorApprovalEmail(opts: {
  to: string;
  name: string;
  title: string;
  scheduledAt: Date;
}): Promise<void> {
  const dateStr = opts.scheduledAt.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const subject = `🎉 Your ZTVLIVE Content is Approved — Airs ${dateStr}`;
  const html = wrapHtml(subject, `
    <h2>Congratulations, ${opts.name}! 🎉</h2>
    <p>Your content has been approved and is scheduled to air on ZTVLIVE:</p>
    <div class="highlight">
      <strong style="color:#00d4ff;">${opts.title}</strong><br/>
      📅 Scheduled: ${dateStr}
    </div>
    <p>Your content will be live on <a href="https://www.ztvlivestream.com" style="color:#00d4ff;">ztvlivestream.com</a>, Roku, and Fire TV.</p>
    <p>Share the news with your audience to maximize your reach and earnings!</p>
    <a href="https://www.ztvlivestream.com/creator/dashboard" class="cta">View Your Dashboard →</a>
  `);
  await sendEmail({ to: opts.to, subject, html });
}

/**
 * ZTVLIVE+ subscription confirmation.
 */
export async function sendSubscriptionConfirmationEmail(opts: {
  to: string;
  name: string;
  tier: string;
  amount: string;
}): Promise<void> {
  const tierLabel = opts.tier === "creator_pro" ? "Creator Pro" : opts.tier.charAt(0).toUpperCase() + opts.tier.slice(1);
  const subject = `🌟 Welcome to ZTVLIVE+ ${tierLabel} — Subscription Confirmed`;
  const html = wrapHtml(subject, `
    <h2>You're now ZTVLIVE+ ${tierLabel}! 🌟</h2>
    <p>Hi ${opts.name || "there"}, your subscription is active.</p>
    <div class="highlight">
      <strong>Plan:</strong> ZTVLIVE+ ${tierLabel}<br/>
      <strong>Amount:</strong> ${opts.amount}/month<br/>
      <strong>Status:</strong> ✅ Active
    </div>
    <p>You now have access to:</p>
    <p>✓ Ad-free streaming &nbsp; ✓ Exclusive content &nbsp; ✓ Priority support<br/>
    ${opts.tier === "creator_pro" ? "✓ Creator monetization tools &nbsp; ✓ Analytics dashboard" : ""}</p>
    <a href="https://www.ztvlivestream.com" class="cta">Start Watching →</a>
    <p style="font-size:13px;color:#475569;">Manage your subscription at any time in <a href="https://www.ztvlivestream.com/subscribe" style="color:#7c3aed;">Account Settings</a>.</p>
  `);
  await sendEmail({ to: opts.to, subject, html });

  // Notify owner
  await notifyOwner({
    title: `💰 New ZTVLIVE+ Subscription — ${tierLabel}`,
    content: `New subscriber: ${opts.name || opts.to}\nEmail: ${opts.to}\nPlan: ${tierLabel} (${opts.amount}/mo)\n\nRevenue is growing! Check Stripe dashboard for details.`,
  }).catch(() => {});
}

/**
 * Payment failed notification.
 */
export async function sendPaymentFailedEmail(opts: {
  to: string;
  name: string;
  tier: string;
}): Promise<void> {
  const subject = "⚠️ ZTVLIVE+ Payment Failed — Action Required";
  const html = wrapHtml(subject, `
    <h2>Payment Issue — Action Needed</h2>
    <p>Hi ${opts.name || "there"}, we were unable to process your ZTVLIVE+ payment.</p>
    <div class="highlight">
      Your <strong>${opts.tier}</strong> subscription may be paused if payment is not updated within 3 days.
    </div>
    <p>Please update your payment method to continue enjoying ad-free streaming and exclusive content.</p>
    <a href="https://www.ztvlivestream.com/subscribe" class="cta">Update Payment →</a>
  `);
  await sendEmail({ to: opts.to, subject, html });
}

/**
 * Daily digest to owner — platform stats summary.
 */
export async function sendOwnerDailyDigest(stats: {
  newSubscribers: number;
  newCreators: number;
  newSubscriptions: number;
  activeViewers: number;
}): Promise<void> {
  await notifyOwner({
    title: "📊 ZTVLIVE Daily Digest",
    content: `Today's Platform Stats:\n\n` +
      `📧 New newsletter subscribers: ${stats.newSubscribers}\n` +
      `🎬 New creator applications: ${stats.newCreators}\n` +
      `💰 New ZTVLIVE+ subscriptions: ${stats.newSubscriptions}\n` +
      `👁️ Active viewers right now: ${stats.activeViewers}\n\n` +
      `Dashboard: https://www.ztvlivestream.com/creator/dashboard`,
  }).catch(() => {});
}
