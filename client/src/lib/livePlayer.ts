export function isPlayableLiveVideoId(videoId: string | null | undefined): videoId is string {
  return Boolean(videoId?.trim());
}

export function shouldInitializeLivePlayer(
  videoId: string | null | undefined,
  playerIsReady: boolean,
) {
  return isPlayableLiveVideoId(videoId) && !playerIsReady;
}

export function buildLiveEmbedUrl(videoId: string, elapsedSeconds: number, muted: boolean) {
  const safeVideoId = encodeURIComponent(videoId.trim());
  const safeStart = Number.isFinite(elapsedSeconds) ? Math.max(0, Math.floor(elapsedSeconds)) : 0;
  const mute = muted ? 1 : 0;

  return `https://www.youtube.com/embed/${safeVideoId}?autoplay=1&start=${safeStart}&controls=1&disablekb=0&fs=1&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=1&playsinline=1&mute=${mute}`;
}
