import twilio from "twilio";
import { ENV } from "./_core/env";

let _client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!_client) {
    _client = twilio(ENV.twilioAccountSid, ENV.twilioAuthToken);
  }
  return _client;
}

export async function sendSMS(to: string, body: string): Promise<boolean> {
  if (!ENV.twilioAccountSid || !ENV.twilioAuthToken) {
    console.warn("[SMS] Twilio credentials not configured");
    return false;
  }
  try {
    const client = getClient();
    await client.messages.create({
      body,
      from: ENV.twilioFromNumber, // Always use ZTVLIVE 310 number
      to,
    });
    console.log(`[SMS] Sent to ${to}`);
    return true;
  } catch (err: any) {
    console.error("[SMS] Failed to send:", err?.message ?? err);
    return false;
  }
}

// Pre-built notification templates
export const SMS = {
  // Sent when someone subscribes to ZTVLIVE+
  subscriptionConfirm: (name: string, plan: string) =>
    `Welcome to ZTVLIVE+, ${name}! 🎬 Your ${plan} plan is now active. Watch free at ztvlivestream.com — reply STOP to unsubscribe.`,

  // Sent when a creator application is received
  creatorApplicationReceived: (name: string) =>
    `Hi ${name}! We received your ZTVLIVE creator application. We'll review it within 48 hours and notify you here. Questions? Visit ztvlivestream.com/become-creator`,

  // Sent when a creator application is approved
  creatorApplicationApproved: (name: string) =>
    `🎉 Congratulations ${name}! Your ZTVLIVE creator account is approved. Start uploading at ztvlivestream.com/creator-dashboard — you earn 70% revenue share from day one!`,

  // Sent when a new episode drops
  newEpisodeDrop: (showName: string, episodeTitle: string) =>
    `📺 New on ZTVLIVE: "${episodeTitle}" from ${showName} is now streaming FREE! Watch now at ztvlivestream.com — reply STOP to unsubscribe.`,

  // Sent for live event reminders
  liveEventReminder: (eventName: string, minutesUntil: number) =>
    `🔴 LIVE in ${minutesUntil} min: "${eventName}" on ZTVLIVE! Tune in free at ztvlivestream.com/live — reply STOP to unsubscribe.`,

  // Sent for early access sign-ups
  earlyAccessConfirm: (phone: string) =>
    `You're on the ZTVLIVE early access list! 🚀 We'll text you first when exclusive content drops. Watch now at ztvlivestream.com — reply STOP to unsubscribe.`,

  // Sent for ZTVLIVE+ trial ending reminder
  trialEndingReminder: (name: string, daysLeft: number) =>
    `Hi ${name}, your ZTVLIVE+ trial ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}. Keep ad-free streaming at ztvlivestream.com/subscribe — reply STOP to unsubscribe.`,
};

// Validate Twilio credentials by checking account info
export async function validateTwilioCredentials(): Promise<boolean> {
  if (!ENV.twilioAccountSid || !ENV.twilioAuthToken) return false;
  try {
    const client = getClient();
    await client.api.accounts(ENV.twilioAccountSid).fetch();
    return true;
  } catch {
    return false;
  }
}
