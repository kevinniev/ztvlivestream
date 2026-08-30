import type { Request } from "express";
import { describe, expect, it } from "vitest";
import { getSessionCookieOptions } from "./cookies";

function requestFor(hostname: string) {
  return { hostname } as Request;
}

describe("session cookie policy", () => {
  it("uses a secure Lax cookie for public mobile OAuth callbacks", () => {
    expect(getSessionCookieOptions(requestFor("ztvlivestream.com"))).toMatchObject({
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
  });

  it("keeps the cookie usable during local development", () => {
    expect(getSessionCookieOptions(requestFor("localhost"))).toMatchObject({
      sameSite: "lax",
      secure: false,
    });
  });
});
