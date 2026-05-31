import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("Email Notification System", () => {
  it("should have GMAIL_USER configured", () => {
    expect(process.env.GMAIL_USER).toBeTruthy();
    expect(process.env.GMAIL_USER).toContain("@");
  });

  it("should have GMAIL_APP_PASSWORD configured", () => {
    expect(process.env.GMAIL_APP_PASSWORD).toBeTruthy();
    expect(process.env.GMAIL_APP_PASSWORD!.length).toBeGreaterThan(6);
  });

  it("should create a valid nodemailer transport with Gmail credentials", () => {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    expect(transport).toBeTruthy();
  });

  it("should verify Gmail SMTP connection", async () => {
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
    // verify() returns true on success, throws on auth failure
    const result = await transport.verify();
    expect(result).toBe(true);
  }, 15000);
});
