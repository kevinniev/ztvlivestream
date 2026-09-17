import { canFavoriteBackgroundKey } from "../client/src/lib/studioBackgroundFavorites";

export function assertValidStudioFavoriteKey(backgroundKey: string) {
  if (!canFavoriteBackgroundKey(backgroundKey)) {
    throw new Error("Invalid Studio background selection.");
  }
  return backgroundKey;
}

export function customBackgroundIdFromFavoriteKey(backgroundKey: string) {
  const match = /^custom:([1-9][0-9]*)$/.exec(backgroundKey);
  return match ? Number(match[1]) : null;
}
