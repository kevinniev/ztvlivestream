export const CUSTOM_BACKGROUND_MAX_BYTES = 10 * 1024 * 1024;
export const CUSTOM_BACKGROUND_ACCEPTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type CustomBackgroundValidation =
  | { valid: true }
  | { valid: false; message: string };

export function hasActivePaidMembership(subscription: {
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
} | null | undefined) {
  return Boolean(
    subscription?.subscriptionTier &&
      subscription.subscriptionTier !== "free" &&
      (subscription.subscriptionStatus === "active" || subscription.subscriptionStatus === "trialing"),
  );
}

export function hasStudioBackgroundAccess(user: {
  role?: string | null;
  subscriptionTier?: string | null;
  subscriptionStatus?: string | null;
} | null | undefined) {
  return user?.role === "admin" || hasActivePaidMembership(user);
}

export function validateCustomBackground(file: Pick<File, "type" | "size">): CustomBackgroundValidation {
  if (!CUSTOM_BACKGROUND_ACCEPTED_TYPES.has(file.type)) {
    return { valid: false, message: "Choose a JPEG, PNG, or WebP image." };
  }
  if (file.size <= 0) {
    return { valid: false, message: "That image file is empty." };
  }
  if (file.size > CUSTOM_BACKGROUND_MAX_BYTES) {
    return { valid: false, message: "Choose an image smaller than 10 MB." };
  }
  return { valid: true };
}
