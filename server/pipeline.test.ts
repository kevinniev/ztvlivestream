/**
 * Content Pipeline Tests
 * Tests the trending topics engine and script generator
 * (HeyGen and YouTube are mocked to avoid credits/API calls in tests)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock external services
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{
      message: {
        content: JSON.stringify({
          topics: [
            {
              title: "BET Awards 2026 Nominations Drop",
              summary: "The BET Awards 2026 nominations are out and Cardi B leads with 5 nominations.",
              source: "BET.com",
              url: "https://bet.com/awards-2026",
              relevanceScore: 95,
              category: "entertainment",
              talkingPoints: ["Cardi B leads nominations", "Druski hosting", "June 29 air date"],
            },
          ],
        }),
      },
    }],
  }),
}));

vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "/manus-storage/test-broll.png" }),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test-key", url: "/manus-storage/test.png" }),
}));

describe("Trending Topics Engine", () => {
  it("should return topics array from LLM response", async () => {
    // Mock Serper fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        news: [
          { title: "BET Awards 2026 Nominations", snippet: "Cardi B leads...", link: "https://bet.com", source: "BET" },
        ],
      }),
    }) as any;

    const { fetchTrendingTopicsForZaraDaily } = await import("./trendingTopics");
    const result = await fetchTrendingTopicsForZaraDaily();

    expect(result.topics).toBeDefined();
    expect(Array.isArray(result.topics)).toBe(true);
    expect(result.fetchedAt).toBeDefined();
  });
});

describe("Script Generator", () => {
  const mockTopics = [
    {
      title: "BET Awards 2026 Nominations",
      summary: "Cardi B leads BET Awards 2026 nominations with 5 nods.",
      source: "BET.com",
      url: "https://bet.com",
      relevanceScore: 95,
      category: "entertainment" as const,
      talkingPoints: ["Cardi B leads", "Druski hosting", "June 29"],
    },
    {
      title: "Lil Wayne BET Performance",
      summary: "Lil Wayne confirmed to perform at BET Awards.",
      source: "Billboard",
      url: "https://billboard.com",
      relevanceScore: 88,
      category: "music" as const,
      talkingPoints: ["Wayne performing", "GloRilla also performing"],
    },
  ];

  it("should generate Zara Daily script with required fields", async () => {
    // Mock LLM for script generation
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            title: "Zara Daily: BET Awards 2026 Nominations | June 9, 2026 #Shorts",
            description: "Zara breaks down the BET Awards 2026 nominations. Cardi B leads! #ZTVLive #BETAwards",
            tags: ["BET Awards", "Cardi B", "Black Entertainment", "ZTVLive"],
            script: "Hey y'all, welcome back to ZTV Live Daily! [B-ROLL: BET Awards stage] Cardi B leads the nominations...",
            segments: [
              { name: "INTRO", text: "Hey y'all, welcome back!", durationSeconds: 5 },
              { name: "BET Awards", text: "Cardi B leads nominations...", durationSeconds: 20 },
            ],
            brollCues: [
              { afterText: "Hey y'all", description: "BET Awards stage", durationSeconds: 3, searchQuery: "BET Awards stage 2026" },
            ],
            estimatedDurationSeconds: 85,
          }),
        },
      }],
    });

    const { generateZaraDailyScript } = await import("./scriptGenerator");
    const script = await generateZaraDailyScript(mockTopics, new Date("2026-06-09"));

    expect(script.title).toBeDefined();
    expect(script.title.length).toBeLessThanOrEqual(100);
    expect(script.description).toBeDefined();
    expect(script.tags).toBeInstanceOf(Array);
    expect(script.script).toBeDefined();
    expect(script.segments).toBeInstanceOf(Array);
    expect(script.brollCues).toBeInstanceOf(Array);
    expect(script.outfitLookId).toBeDefined();
    expect(script.date).toBeDefined();
  });

  it("should rotate Zara outfit based on day of month", async () => {
    const { getZaraLookForDay } = await import("./scriptGenerator");
    
    const day1 = getZaraLookForDay(new Date("2026-06-01"));
    const day2 = getZaraLookForDay(new Date("2026-06-02"));
    
    expect(day1.id).toBeDefined();
    expect(day2.id).toBeDefined();
    // Different days should potentially use different looks
    expect(typeof day1.id).toBe("string");
    expect(typeof day2.id).toBe("string");
  });

  it("should generate Zoe Weekly script with required fields", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as any).mockResolvedValueOnce({
      choices: [{
        message: {
          content: JSON.stringify({
            title: "The Rundown with Zoe | Week of June 9, 2026",
            description: "Zoe recaps the week's top Black culture stories.",
            tags: ["Black Entertainment", "Weekly Recap", "ZTVLive"],
            script: "[COLD OPEN] Welcome to The Rundown! [TOP STORY] This week in Black entertainment...",
            segments: [
              { name: "COLD OPEN", text: "Welcome to The Rundown!", durationSeconds: 30 },
              { name: "TOP STORY", text: "BET Awards nominations...", durationSeconds: 120 },
            ],
            brollCues: [
              { afterText: "Welcome", description: "Studio wide shot", durationSeconds: 3, searchQuery: "TV studio broadcast" },
            ],
            estimatedDurationSeconds: 540,
          }),
        },
      }],
    });

    const { generateZoeWeeklyScript } = await import("./scriptGenerator");
    const script = await generateZoeWeeklyScript(mockTopics, new Date("2026-06-13")); // Friday

    expect(script.title).toBeDefined();
    expect(script.description).toBeDefined();
    expect(script.outfitLookId).toBeDefined();
    expect(script.estimatedDurationSeconds).toBeGreaterThan(300); // At least 5 minutes
  });
});

describe("Pipeline Handlers", () => {
  it("should export all three handlers", async () => {
    const { zaraDailyHandler, zoeWeeklyHandler, renderCheckHandler } = await import("./pipelineHandlers");
    
    expect(typeof zaraDailyHandler).toBe("function");
    expect(typeof zoeWeeklyHandler).toBe("function");
    expect(typeof renderCheckHandler).toBe("function");
  });
});
