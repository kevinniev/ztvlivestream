import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

describe("Twilio Verify Service Configuration", () => {
  it("should have TWILIO_VERIFY_SERVICE_SID configured", () => {
    expect(ENV.twilioVerifyServiceSid).toBeTruthy();
    expect(ENV.twilioVerifyServiceSid).toMatch(/^VA[a-f0-9]{32}$/);
  });

  it("should have Twilio account credentials configured", () => {
    expect(ENV.twilioAccountSid).toBeTruthy();
    expect(ENV.twilioAuthToken).toBeTruthy();
  });

  it("Verify Service SID should match the created ZTVLIVE service", () => {
    // The SID created via API for ZTVLIVE
    expect(ENV.twilioVerifyServiceSid).toBe("VA55f1fe00b7fa21ca2b56e560a6c7463b");
  });
});
