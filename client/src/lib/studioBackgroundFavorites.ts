export const BACKGROUND_CATEGORY_OPTIONS = [
  { id: "all", label: "All" },
  { id: "favorites", label: "Favorites" },
  { id: "office", label: "Office" },
  { id: "creative", label: "Creative" },
  { id: "abstract", label: "Abstract" },
  { id: "custom", label: "My uploads" },
] as const;

export type BackgroundCategory = (typeof BACKGROUND_CATEGORY_OPTIONS)[number]["id"];

export type PresetBackground = {
  id: string;
  category: Exclude<BackgroundCategory, "all" | "favorites" | "custom">;
  free: boolean;
};

export type StudioBackgroundFavorite = {
  backgroundKey: string;
};

const PRESET_KEY_PREFIX = "preset:";
const CUSTOM_KEY_PREFIX = "custom:";
const FAVORITABLE_PRESET_IDS = new Set([
  "podcast-booth",
  "barbershop",
  "late-night-stage",
  "rooftop-city",
]);

export function makePresetBackgroundKey(id: string) {
  return `${PRESET_KEY_PREFIX}${id}`;
}

export function makeCustomBackgroundKey(id: number) {
  return `${CUSTOM_KEY_PREFIX}${id}`;
}

export function isFavoriteBackground(favoriteKeys: ReadonlySet<string>, backgroundKey: string) {
  return favoriteKeys.has(backgroundKey);
}

export function matchesBackgroundCategory(
  category: BackgroundCategory,
  item: { kind: "preset"; preset: PresetBackground } | { kind: "custom" },
  isFavorite: boolean,
) {
  if (category === "all") return true;
  if (category === "favorites") return isFavorite;
  if (category === "custom") return item.kind === "custom";
  return item.kind === "preset" && item.preset.category === category;
}

export function sortBackgroundsByFavorite<T extends { favorite: boolean; name: string }>(items: T[]) {
  return [...items].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name));
}

export function normalizeBackgroundSearchQuery(query: string) {
  return query.trim().toLocaleLowerCase();
}

export function matchesBackgroundName(name: string, query: string) {
  const normalizedQuery = normalizeBackgroundSearchQuery(query);
  return !normalizedQuery || name.toLocaleLowerCase().includes(normalizedQuery);
}

export function canFavoriteBackgroundKey(backgroundKey: string) {
  if (/^custom:[1-9][0-9]*$/.test(backgroundKey)) return true;
  const presetMatch = /^preset:([a-z0-9-]+)$/.exec(backgroundKey);
  return Boolean(presetMatch && FAVORITABLE_PRESET_IDS.has(presetMatch[1]));
}
