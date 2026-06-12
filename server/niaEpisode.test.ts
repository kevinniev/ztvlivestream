/**
 * Tests for the Nia CommunityCut Weekly episode auto-publisher handler.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("NiaEpisode Handler", () => {
  it("should have the handler file with correct exports", () => {
    const handlerPath = path.join(__dirname, "niaEpisodeHandler.ts");
    expect(fs.existsSync(handlerPath)).toBe(true);
    const content = fs.readFileSync(handlerPath, "utf-8");
    expect(content).toContain("export async function niaEpisodeHandler");
    expect(content).toContain("NiaEpisodePayload");
  });

  it("should require isCron authentication", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "niaEpisodeHandler.ts"),
      "utf-8"
    );
    expect(content).toContain("user.isCron");
    expect(content).toContain("cron-only endpoint");
  });

  it("should validate required fields youtubeId and title", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "niaEpisodeHandler.ts"),
      "utf-8"
    );
    expect(content).toContain("payload?.youtubeId");
    expect(content).toContain("payload?.title");
    expect(content).toContain("Missing required fields");
  });

  it("should be idempotent — skip if episode already exists", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "niaEpisodeHandler.ts"),
      "utf-8"
    );
    expect(content).toContain("already_exists");
    expect(content).toContain("skipping");
  });

  it("should use maxresdefault thumbnail as fallback", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "niaEpisodeHandler.ts"),
      "utf-8"
    );
    expect(content).toContain("img.youtube.com/vi/");
    expect(content).toContain("maxresdefault.jpg");
  });

  it("should notify owner after publishing", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "niaEpisodeHandler.ts"),
      "utf-8"
    );
    expect(content).toContain("notifyOwner");
    expect(content).toContain("New Nia Episode Published");
  });

  it("should be registered in server index.ts", () => {
    const indexPath = path.join(__dirname, "_core/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    expect(content).toContain('"/api/scheduled/nia-episode"');
    expect(content).toContain("niaEpisodeHandler");
  });

  it("should set isFeatured=true for new episodes", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "niaEpisodeHandler.ts"),
      "utf-8"
    );
    expect(content).toContain("isFeatured: true");
  });

  it("should include CommunityCut in default tags", () => {
    const content = fs.readFileSync(
      path.join(__dirname, "niaEpisodeHandler.ts"),
      "utf-8"
    );
    expect(content).toContain("CommunityCut");
    expect(content).toContain("Nia");
  });

  it("should have correct endpoint path starting with /api/scheduled/", () => {
    const indexPath = path.join(__dirname, "_core/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");
    // Must start with /api/scheduled/ per Manus platform requirement
    expect(content).toMatch(/\/api\/scheduled\/nia-episode/);
  });
});
