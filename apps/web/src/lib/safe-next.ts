/**
 * Returns a safe same-origin path for post-login redirects (open-redirect safe).
 */
export function sanitizeInternalNextPath(raw: string | undefined | null): string | null {
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

/** Avoid redirect loops when ?next=/sign-in. */
export function normalizePostAuthPath(path: string): string {
  if (path === "/sign-in" || path.startsWith("/sign-in?")) {
    return "/";
  }
  return path;
}
