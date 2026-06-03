import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock twilio before importing sms module
vi.mock("twilio", () => {
  const mockCreate = vi.fn().mockResolvedValue({ sid: "SM123", status: "queued" });
  const mockFetch = vi.fn().mockResolvedValue({ sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", status: "active" });
  return {
    default: vi.fn(() => ({
      messages: { create: mockCreate },
      api: {
        accounts: vi.fn(() => ({ fetch: mockFetch })),
      },
    })),
  };
});

// Mock env
vi.mock("./_core/env", () => ({
  ENV: {
    twilioAccountSid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    twilioAuthToken: "REDACTED_AUTH_TOKEN",
    twilioMessagingServiceSid: "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    twilioFromNumber: "+1XXXXXXXXXX",
  },
}));

describe("SMS Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should export sendSMS function", async () => {
    const { sendSMS } = await import("./sms");
    expect(typeof sendSMS).toBe("function");
  });

  it("should export SMS templates", async () => {
    const { SMS } = await import("./sms");
    expect(SMS).toBeDefined();
    expect(typeof SMS.subscriptionConfirm).toBe("function");
    expect(typeof SMS.creatorApplicationReceived).toBe("function");
    expect(typeof SMS.creatorApplicationApproved).toBe("function");
    expect(typeof SMS.slotBooked).toBe("function");
    expect(typeof SMS.newEpisodeDrop).toBe("function");
    expect(typeof SMS.liveEventReminder).toBe("function");
    expect(typeof SMS.earlyAccessConfirm).toBe("function");
    expect(typeof SMS.trialEndingReminder).toBe("function");
  });

  it("should generate correct subscription confirmation message", async () => {
    const { SMS } = await import("./sms");
    const msg = SMS.subscriptionConfirm("Kevin", "Premium");
    expect(msg).toContain("Kevin");
    expect(msg).toContain("Premium");
    expect(msg).toContain("ZTVLIVE+");
    expect(msg).toContain("ztvlivestream.com");
  });

  it("should generate correct creator approval message", async () => {
    const { SMS } = await import("./sms");
    const msg = SMS.creatorApplicationApproved("Matthew");
    expect(msg).toContain("Matthew");
    expect(msg).toContain("70%");
    expect(msg).toContain("ztvlivestream.com");
  });

  it("should generate correct slot booked message", async () => {
    const { SMS } = await import("./sms");
    const msg = SMS.slotBooked("Alex", "Best Budget Tech 2025");
    expect(msg).toContain("Alex");
    expect(msg).toContain("Best Budget Tech 2025");
    expect(msg).toContain("ztvlivestream.com");
  });

  it("should generate correct new episode drop message", async () => {
    const { SMS } = await import("./sms");
    const msg = SMS.newEpisodeDrop("CommunityCut Weekly", "Episode 1");
    expect(msg).toContain("CommunityCut Weekly");
    expect(msg).toContain("Episode 1");
    expect(msg).toContain("ztvlivestream.com");
  });

  it("should send SMS successfully using messagingServiceSid", async () => {
    const { sendSMS } = await import("./sms");
    const result = await sendSMS("+1XXXXXXXXXX", "Test message from ZTVLIVE");
    expect(result).toBe(true);
  });

  it("should validate Twilio credentials", async () => {
    const { validateTwilioCredentials } = await import("./sms");
    const valid = await validateTwilioCredentials();
    expect(valid).toBe(true);
  });
});
