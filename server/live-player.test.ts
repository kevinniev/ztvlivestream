import { describe, expect, it } from "vitest";
import {
  buildLiveEmbedUrl,
  isPlayableLiveVideoId,
  shouldInitializeLivePlayer,
} from "../client/src/lib/livePlayer";

describe("Live TV player lifecycle safeguards", () => {
  it("does not initialize a player until the asynchronous schedule returns a usable video ID", () => {
    expect(isPlayableLiveVideoId(undefined)).toBe(false);
    expect(isPlayableLiveVideoId("")).toBe(false);
    expect(isPlayableLiveVideoId("   ")).toBe(false);
    expect(shouldInitializeLivePlayer("", false)).toBe(false);
    expect(shouldInitializeLivePlayer("dQw4w9WgXcQ", false)).toBe(true);
    expect(shouldInitializeLivePlayer("dQw4w9WgXcQ", true)).toBe(false);
  });

  it("builds a mobile-compatible fallback embed URL with a bounded start time", () => {
    const url = buildLiveEmbedUrl("dQw4w9WgXcQ", -15, true);

    expect(url).toContain("/embed/dQw4w9WgXcQ?");
    expect(url).toContain("start=0");
    expect(url).toContain("playsinline=1");
    expect(url).toContain("mute=1");
  });
});
