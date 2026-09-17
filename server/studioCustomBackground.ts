import {
  hasActivePaidMembership,
  validateCustomBackground,
} from "../client/src/lib/studioCustomBackground";

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/;

export function canManageStudioCustomBackground(user: {
  role: "user" | "admin" | "creator";
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
}) {
  return user.role === "admin" || hasActivePaidMembership(user);
}

export function parseStudioBackgroundDataUrl(dataUrl: string) {
  const match = DATA_URL_PATTERN.exec(dataUrl);
  if (!match) {
    throw new Error("Choose a JPEG, PNG, or WebP image.");
  }

  const [, mimeType, encoded] = match;
  const buffer = Buffer.from(encoded, "base64");
  const validation = validateCustomBackground({ type: mimeType, size: buffer.length });
  if (!validation.valid) throw new Error(validation.message);

  return { buffer, mimeType };
}

export function makeStudioBackgroundStorageKey(userId: number, originalName: string, mimeType: string) {
  const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
  const basename = originalName
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "background";
  return `studio-backgrounds/${userId}/${basename}.${extension}`;
}
