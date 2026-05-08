/**
 * Returns a safe same-origin path for post-login redirects (open-redirect safe).
 */
export function sanitizeInternalNextPath(
  raw: string | undefined | null,
): string | null {
  if (raw == null || raw === "") {
    return null;
  }
  if (raw.length > 2048) {
    return null;
  }
  if (!raw.startsWith("/")) {
    return null;
  }
  if (raw.startsWith("//")) {
    return null;
  }
  if (raw.includes("\\")) {
    return null;
  }
  return raw;
}

/** Set by middleware on protected requests so the app layout can pass `next` when the session cookie is stale. */
export const CAIRNLY_INTENDED_NEXT_HEADER = "x-cairnly-next";

/** Avoid redirect loops when ?next=/sign-in. */
export function normalizePostAuthPath(path: string): string {
  if (path === "/sign-in" || path.startsWith("/sign-in?")) {
    return "/";
  }
  return path;
}
