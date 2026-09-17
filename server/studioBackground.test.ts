import { describe, expect, it } from "vitest";
import { getBackgroundFilter, getBackgroundRenderState, getExposureFilter, shouldRenderVirtualSet } from "../client/src/lib/studioBackground";

describe("Studio virtual background renderer state", () => {
  it("activates a selected set only after its asset and browser-local model are ready", () => {
    expect(shouldRenderVirtualSet({ selectedSet: "podcast-booth", enabled: true, modelState: "ready", assetState: "ready" })).toBe(true);
    expect(shouldRenderVirtualSet({ selectedSet: "podcast-booth", enabled: true, modelState: "loading", assetState: "ready" })).toBe(false);
    expect(shouldRenderVirtualSet({ selectedSet: "none", enabled: true, modelState: "ready", assetState: "ready" })).toBe(false);
  });

  it("reports a clear preparing or error state instead of silently reverting to a raw camera frame", () => {
    expect(getBackgroundRenderState({ selectedSet: "podcast-booth", enabled: true, modelState: "loading", assetState: "ready", hasRenderFailure: false })).toBe("preparing");
    expect(getBackgroundRenderState({ selectedSet: "podcast-booth", enabled: true, modelState: "ready", assetState: "ready", hasRenderFailure: false })).toBe("active");
    expect(getBackgroundRenderState({ selectedSet: "podcast-booth", enabled: true, modelState: "error", assetState: "ready", hasRenderFailure: false })).toBe("error");
  });

  it("bounds exposure enhancement to an accessible, predictable range", () => {
    expect(getExposureFilter(100)).toBe("brightness(100%) contrast(105%)");
    expect(getExposureFilter(45)).toBe("brightness(70%) contrast(105%)");
    expect(getExposureFilter(210)).toBe("brightness(180%) contrast(105%)");
  });

  it("keeps background brightness and contrast within safe manual ranges", () => {
    expect(getBackgroundFilter(100, 100)).toBe("brightness(100%) contrast(100%)");
    expect(getBackgroundFilter(40, 160)).toBe("brightness(50%) contrast(150%)");
  });
});
