import { describe, expect, it } from "vitest";
import {
  canFavoriteBackgroundKey,
  isFavoriteBackground,
  makeCustomBackgroundKey,
  makePresetBackgroundKey,
  matchesBackgroundCategory,
  sortBackgroundsByFavorite,
} from "../client/src/lib/studioBackgroundFavorites";
import {
  assertValidStudioFavoriteKey,
  customBackgroundIdFromFavoriteKey,
} from "./studioBackgroundFavorites";

describe("Studio background favorites", () => {
  it("uses stable keys for presets and user-owned uploads", () => {
    expect(makePresetBackgroundKey("podcast-booth")).toBe("preset:podcast-booth");
    expect(makeCustomBackgroundKey(42)).toBe("custom:42");
    expect(isFavoriteBackground(new Set(["preset:podcast-booth"]), "preset:podcast-booth")).toBe(true);
  });

  it("filters presets and uploads by category without exposing the wrong type", () => {
    const officePreset = { kind: "preset" as const, preset: { id: "podcast-booth", category: "office" as const, free: true } };
    const customUpload = { kind: "custom" as const };

    expect(matchesBackgroundCategory("office", officePreset, false)).toBe(true);
    expect(matchesBackgroundCategory("abstract", officePreset, false)).toBe(false);
    expect(matchesBackgroundCategory("custom", customUpload, false)).toBe(true);
    expect(matchesBackgroundCategory("favorites", customUpload, false)).toBe(false);
    expect(matchesBackgroundCategory("favorites", customUpload, true)).toBe(true);
  });

  it("sorts favorites first and then preserves predictable alphabetical discovery", () => {
    expect(sortBackgroundsByFavorite([
      { name: "Rooftop", favorite: false },
      { name: "Barbershop", favorite: true },
      { name: "Podcast", favorite: true },
    ])).toEqual([
      { name: "Barbershop", favorite: true },
      { name: "Podcast", favorite: true },
      { name: "Rooftop", favorite: false },
    ]);
  });

  it("accepts only canonical preset or nonzero custom favorite keys", () => {
    expect(canFavoriteBackgroundKey("preset:podcast-booth")).toBe(true);
    expect(canFavoriteBackgroundKey("custom:7")).toBe(true);
    expect(canFavoriteBackgroundKey("custom:0")).toBe(false);
    expect(canFavoriteBackgroundKey("preset:not-in-the-catalog")).toBe(false);
    expect(canFavoriteBackgroundKey("../../private")).toBe(false);
    expect(assertValidStudioFavoriteKey("preset:barbershop")).toBe("preset:barbershop");
    expect(() => assertValidStudioFavoriteKey("admin:everything")).toThrow("Invalid Studio background selection.");
    expect(customBackgroundIdFromFavoriteKey("custom:17")).toBe(17);
    expect(customBackgroundIdFromFavoriteKey("preset:barbershop")).toBeNull();
  });
});
