import { describe, it, expect, vi } from "vitest";

// Test the URL parsing logic extracted from fetchChannelVideos
function parseChannelUrl(rawUrl: string): { channelId: string | null; handleOrUser: string | null; isUserUrl: boolean } {
  let channelId: string | null = null;
  let handleOrUser: string | null = null;
  let isUserUrl = false;

  const channelMatch = rawUrl.match(/\/channel\/(UC[A-Za-z0-9_-]{22})/);
  const handleMatch = rawUrl.match(/\/@([A-Za-z0-9_.-]+)/);
  const userMatch = rawUrl.match(/\/user\/([A-Za-z0-9_-]+)/);
  const customMatch = rawUrl.match(/\/c\/([A-Za-z0-9_-]+)/);

  if (channelMatch) {
    channelId = channelMatch[1];
  } else if (handleMatch) {
    handleOrUser = handleMatch[1];
  } else if (userMatch) {
    handleOrUser = userMatch[1];
    isUserUrl = true;
  } else if (customMatch) {
    handleOrUser = customMatch[1];
  } else {
    const clean = rawUrl.replace(/^https?:\/\/(www\.)?youtube\.com\/?/, "").replace(/^@/, "").trim();
    if (/^UC[A-Za-z0-9_-]{22}$/.test(clean)) channelId = clean;
    else handleOrUser = clean.replace(/^@/, "");
  }

  return { channelId, handleOrUser, isUserUrl };
}

describe("Channel URL Parsing", () => {
  it("parses /channel/UC... URL", () => {
    const r = parseChannelUrl("https://www.youtube.com/channel/UCX6OQ3DkcsbYNE6H8uQQuVA");
    expect(r.channelId).toBe("UCX6OQ3DkcsbYNE6H8uQQuVA");
    expect(r.handleOrUser).toBeNull();
  });

  it("parses @handle URL", () => {
    const r = parseChannelUrl("https://www.youtube.com/@MrBeast");
    expect(r.channelId).toBeNull();
    expect(r.handleOrUser).toBe("MrBeast");
    expect(r.isUserUrl).toBe(false);
  });

  it("parses /user/ URL", () => {
    const r = parseChannelUrl("https://www.youtube.com/user/MrBeast6000");
    expect(r.channelId).toBeNull();
    expect(r.handleOrUser).toBe("MrBeast6000");
    expect(r.isUserUrl).toBe(true);
  });

  it("parses /c/ custom URL", () => {
    const r = parseChannelUrl("https://www.youtube.com/c/MrBeast");
    expect(r.channelId).toBeNull();
    expect(r.handleOrUser).toBe("MrBeast");
  });

  it("parses bare @handle", () => {
    const r = parseChannelUrl("@MrBeast");
    expect(r.channelId).toBeNull();
    expect(r.handleOrUser).toBe("MrBeast");
  });

  it("parses bare channel ID", () => {
    const r = parseChannelUrl("UCX6OQ3DkcsbYNE6H8uQQuVA");
    expect(r.channelId).toBe("UCX6OQ3DkcsbYNE6H8uQQuVA");
  });

  it("parses handle without @", () => {
    const r = parseChannelUrl("MrBeast");
    expect(r.channelId).toBeNull();
    expect(r.handleOrUser).toBe("MrBeast");
  });
});

describe("RSS XML Parsing", () => {
  it("extracts video IDs and titles from RSS", () => {
    const rssText = `<?xml version="1.0"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/">
  <title>Test Channel</title>
  <entry>
    <yt:videoId>abc123def45</yt:videoId>
    <media:title>My First Video &amp; More</media:title>
    <published>2026-01-01T00:00:00+00:00</published>
    <media:thumbnail url="https://i1.ytimg.com/vi/abc123def45/hqdefault.jpg"/>
  </entry>
  <entry>
    <yt:videoId>xyz789ghi01</yt:videoId>
    <media:title>Second Video</media:title>
    <published>2026-01-02T00:00:00+00:00</published>
    <media:thumbnail url="https://i2.ytimg.com/vi/xyz789ghi01/hqdefault.jpg"/>
  </entry>
</feed>`;

    const entries = rssText.split("<entry>").slice(1);
    const results = entries.map(entry => {
      const vidMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
      const titleMatch = entry.match(/<media:title>([^<]+)<\/media:title>/) || entry.match(/<title>([^<]+)<\/title>/);
      const pubMatch = entry.match(/<published>([^<]+)<\/published>/);
      const thumbMatch = entry.match(/url="(https:\/\/i[0-9]*\.ytimg\.com[^"]+)"/);
      return {
        youtubeId: vidMatch?.[1] ?? "",
        title: (titleMatch?.[1] ?? "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"),
        publishedAt: pubMatch?.[1] ?? "",
        thumbnailUrl: thumbMatch?.[1] ?? `https://img.youtube.com/vi/${vidMatch?.[1]}/mqdefault.jpg`,
      };
    });

    expect(results).toHaveLength(2);
    expect(results[0].youtubeId).toBe("abc123def45");
    expect(results[0].title).toBe("My First Video & More");
    expect(results[0].thumbnailUrl).toContain("ytimg.com");
    expect(results[1].youtubeId).toBe("xyz789ghi01");
  });
});

describe("Batch Import Logic", () => {
  it("correctly separates new vs existing videos", () => {
    const selectedVideos = [
      { youtubeId: "vid1", title: "Video 1" },
      { youtubeId: "vid2", title: "Video 2" },
      { youtubeId: "vid3", title: "Video 3" },
    ];
    const existingSet = new Set(["vid2"]);

    const toInsert = selectedVideos.filter(v => !existingSet.has(v.youtubeId));
    const skipped = selectedVideos.filter(v => existingSet.has(v.youtubeId));

    expect(toInsert).toHaveLength(2);
    expect(toInsert.map(v => v.youtubeId)).toEqual(["vid1", "vid3"]);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].youtubeId).toBe("vid2");
  });

  it("chunks large arrays correctly", () => {
    const items = Array.from({ length: 127 }, (_, i) => ({ id: i }));
    const CHUNK = 50;
    const chunks: typeof items[] = [];
    for (let i = 0; i < items.length; i += CHUNK) {
      chunks.push(items.slice(i, i + CHUNK));
    }
    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toHaveLength(50);
    expect(chunks[1]).toHaveLength(50);
    expect(chunks[2]).toHaveLength(27);
  });
});
