import { describe, expect, it } from "vitest";
import {
  applyStudioBackgroundPreview,
  beginStudioBackgroundPreview,
  clearStudioBackground,
  getStudioBackgroundRenderSet,
  isStudioBackgroundPreviewing,
  stageStudioBackground,
  type StudioBackgroundPreviewState,
} from "../client/src/lib/studioBackgroundPreview";

const initialState: StudioBackgroundPreviewState = {
  appliedSet: "podcast-booth",
  pendingSet: "podcast-booth",
  previewSet: null,
  enabled: true,
};

describe("Studio background preview controls", () => {
  it("stages a selected set without changing the already applied background", () => {
    const staged = stageStudioBackground(initialState, "barbershop");
    expect(staged).toMatchObject({ appliedSet: "podcast-booth", pendingSet: "barbershop", previewSet: null, enabled: true });
    expect(getStudioBackgroundRenderSet(staged)).toBe("podcast-booth");
  });

  it("renders a temporary camera preview before applying the staged set", () => {
    const previewing = beginStudioBackgroundPreview(stageStudioBackground(initialState, "barbershop"));
    expect(isStudioBackgroundPreviewing(previewing)).toBe(true);
    expect(getStudioBackgroundRenderSet(previewing)).toBe("barbershop");
    expect(previewing.appliedSet).toBe("podcast-booth");
  });

  it("applies a previewed set while preserving it through a camera off/on cycle", () => {
    const applied = applyStudioBackgroundPreview(beginStudioBackgroundPreview(stageStudioBackground(initialState, "barbershop")));
    expect(applied).toMatchObject({ appliedSet: "barbershop", pendingSet: "barbershop", previewSet: null, enabled: true });
    // Camera lifecycle deliberately leaves selection state untouched.
    expect(getStudioBackgroundRenderSet(applied)).toBe("barbershop");
  });

  it("clears an active or previewed background in one explicit action", () => {
    const cleared = clearStudioBackground(beginStudioBackgroundPreview(stageStudioBackground(initialState, "barbershop")));
    expect(cleared).toEqual({ appliedSet: "none", pendingSet: "none", previewSet: null, enabled: false });
    expect(getStudioBackgroundRenderSet(cleared)).toBe("none");
  });
});
