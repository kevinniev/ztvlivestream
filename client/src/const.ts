export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL — redirects to our own /signin page.
export const getLoginUrl = (returnTo?: string) => {
  const path = returnTo ? `/signin?returnTo=${encodeURIComponent(returnTo)}` : "/signin";
  return path;
};
