export type StudioBackgroundPreviewState = {
  appliedSet: string;
  pendingSet: string;
  previewSet: string | null;
  enabled: boolean;
};

export function stageStudioBackground(state: StudioBackgroundPreviewState, setId: string): StudioBackgroundPreviewState {
  return {
    ...state,
    pendingSet: setId,
  };
}

export function beginStudioBackgroundPreview(state: StudioBackgroundPreviewState): StudioBackgroundPreviewState {
  if (state.pendingSet === "none") return clearStudioBackground(state);
  return {
    ...state,
    previewSet: state.pendingSet,
    enabled: true,
  };
}

export function applyStudioBackgroundPreview(state: StudioBackgroundPreviewState): StudioBackgroundPreviewState {
  if (state.pendingSet === "none") return clearStudioBackground(state);
  return {
    ...state,
    appliedSet: state.pendingSet,
    previewSet: null,
    enabled: true,
  };
}

export function clearStudioBackground(state: StudioBackgroundPreviewState): StudioBackgroundPreviewState {
  return {
    ...state,
    appliedSet: "none",
    pendingSet: "none",
    previewSet: null,
    enabled: false,
  };
}

export function getStudioBackgroundRenderSet(state: StudioBackgroundPreviewState) {
  return state.previewSet ?? state.appliedSet;
}

export function isStudioBackgroundPreviewing(state: StudioBackgroundPreviewState) {
  return state.previewSet !== null;
}
