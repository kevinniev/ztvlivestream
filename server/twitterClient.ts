/**
 * Twitter/X API client for ZTVLIVE automated posting.
 * Uses OAuth 1.0a for posting tweets on behalf of @ZTVLIVESTREAM.
 * Max 2 posts per day — enforced by the cron schedule (9am + 4pm MST).
 */

import crypto from "crypto";
import { ENV } from "./_core/env";

function oauthSign(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerKey: string,
  consumerSecret: string,
  tokenKey: string,
  tokenSecret: string
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: tokenKey,
    oauth_version: "1.0",
    ...params,
  };

  const sortedKeys = Object.keys(oauthParams).sort();
  const paramString = sortedKeys
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join("&");

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(paramString),
  ].join("&");

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  oauthParams["oauth_signature"] = signature;

  const authHeader =
    "OAuth " +
    Object.keys(oauthParams)
      .filter((k) => k.startsWith("oauth_"))
      .sort()
      .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
      .join(", ");

  return authHeader;
}

/**
 * Post a tweet to @ZTVLIVESTREAM.
 * Returns the tweet ID on success.
 */
export async function postTweet(text: string): Promise<{ id: string; text: string }> {
  const url = "https://api.twitter.com/2/tweets";
  const authHeader = oauthSign(
    "POST",
    url,
    {},
    ENV.twitterApiKey,
    ENV.twitterApiSecret,
    ENV.twitterAccessToken,
    ENV.twitterAccessSecret
  );

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Twitter API error ${res.status}: ${errBody}`);
  }

  const data = (await res.json()) as { data: { id: string; text: string } };
  return data.data;
}
