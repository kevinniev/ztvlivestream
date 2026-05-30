import { describe, it, expect } from "vitest";

describe("Google OAuth credentials", () => {
  it("GOOGLE_CLIENT_ID should be set and match expected format", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toBeDefined();
    expect(clientId).not.toBe("");
    // Google OAuth client IDs end with .apps.googleusercontent.com
    expect(clientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("GOOGLE_CLIENT_SECRET should be set and match expected format", () => {
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    expect(clientSecret).toBeDefined();
    expect(clientSecret).not.toBe("");
    // Google OAuth secrets start with GOCSPX-
    expect(clientSecret).toMatch(/^GOCSPX-/);
  });

  it("GOOGLE_CLIENT_ID should match the expected CommunityCut GBP v2 client ID", () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    expect(clientId).toBe(
      "162106473179-vp4mr47f828e8trh3olfcg9f0kuhft91.apps.googleusercontent.com"
    );
  });
});
