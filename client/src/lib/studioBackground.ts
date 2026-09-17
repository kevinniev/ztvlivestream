export type BackgroundModelState = "loading" | "ready" | "error";
export type BackgroundAssetState = "idle" | "loading" | "ready" | "error";
export type BackgroundRenderState = "idle" | "preparing" | "active" | "fallback" | "error";

export function shouldRenderVirtualSet(input: {
  selectedSet: string;
  enabled: boolean;
  modelState: BackgroundModelState;
  assetState: BackgroundAssetState;
}) {
  return input.selectedSet !== "none" && input.enabled && input.modelState === "ready" && input.assetState === "ready";
}

export function getBackgroundRenderState(input: {
  selectedSet: string;
  enabled: boolean;
  modelState: BackgroundModelState;
  assetState: BackgroundAssetState;
  hasRenderFailure: boolean;
}): BackgroundRenderState {
  if (input.selectedSet === "none" || !input.enabled) return "idle";
  if (input.hasRenderFailure || input.modelState === "error" || input.assetState === "error") return "error";
  if (shouldRenderVirtualSet(input)) return "active";
  return "preparing";
}

export function getExposureFilter(exposure: number) {
  const bounded = Math.max(70, Math.min(180, exposure));
  return `brightness(${bounded}%) contrast(105%)`;
}
