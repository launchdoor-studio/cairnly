import { sanitizeInternalNextPath } from "./safe-next";

export function shouldBypassProtectedRouteMiddleware(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/sign-in" ||
    pathname.startsWith("/f/") ||
    pathname.startsWith("/m/") ||
    pathname === "/healthz"
  );
}

/**
 * Middleware only checks cookie presence; layout validates the session against the DB.
 * When bypassing middleware is skipped and a stale cookie arrives, propagate the intended URL
 * for post-login redirects.
 */
export type ProtectedRouteMiddlewareResult =
  | { kind: "public" }
  | { kind: "sign-in"; nextSafe: string | null }
  | { kind: "session-cookie"; intendedNextSafe: string | null };

export function classifyProtectedRouteMiddleware(parts: {
  pathname: string;
  search: string;
  hasAuthCookie: boolean;
}): ProtectedRouteMiddlewareResult {
  if (shouldBypassProtectedRouteMiddleware(parts.pathname)) {
    return { kind: "public" };
  }

  const intended = sanitizeInternalNextPath(`${parts.pathname}${parts.search}`) ?? null;

  if (!parts.hasAuthCookie) {
    return { kind: "sign-in", nextSafe: intended };
  }

  return { kind: "session-cookie", intendedNextSafe: intended };
}
