import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { sanitizeInternalNextPath } from "@/lib/safe-next";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/sign-in" ||
    pathname.startsWith("/f/") ||
    pathname.startsWith("/m/") ||
    pathname === "/healthz"
  ) {
    return NextResponse.next();
  }

  if (!hasBetterAuthCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    const fullPath = `${pathname}${request.nextUrl.search}`;
    const safe = sanitizeInternalNextPath(fullPath);
    if (safe) {
      url.searchParams.set("next", safe);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

function hasBetterAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name }) => name.startsWith("better-auth"));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
