import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { classifyProtectedRouteMiddleware } from "@/lib/protected-route-middleware-logic";
import { CAIRNLY_INTENDED_NEXT_HEADER } from "@/lib/safe-next";

export function middleware(request: NextRequest) {
  const classified = classifyProtectedRouteMiddleware({
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    hasAuthCookie: hasBetterAuthCookie(request),
  });

  if (classified.kind === "public") {
    return NextResponse.next();
  }

  if (classified.kind === "sign-in") {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    const nextSafe = classified.nextSafe;
    if (nextSafe) {
      url.searchParams.set("next", nextSafe);
    }
    return NextResponse.redirect(url);
  }

  const requestHeaders = new Headers(request.headers);
  const headerValue = classified.intendedNextSafe;
  if (headerValue) {
    requestHeaders.set(CAIRNLY_INTENDED_NEXT_HEADER, headerValue);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

function hasBetterAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name }) => name.startsWith("better-auth"));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
