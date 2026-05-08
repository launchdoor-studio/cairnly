import { describe, expect, it } from "vitest";

import {
  classifyProtectedRouteMiddleware,
  shouldBypassProtectedRouteMiddleware,
} from "./protected-route-middleware-logic";

describe("shouldBypassProtectedRouteMiddleware", () => {
  it("treats public booking and forms as exempt", () => {
    expect(shouldBypassProtectedRouteMiddleware("/m/aftaab")).toBe(true);
    expect(shouldBypassProtectedRouteMiddleware("/f/intake")).toBe(true);
  });

  it("treats authenticated shell routes as protected", () => {
    expect(shouldBypassProtectedRouteMiddleware("/contacts")).toBe(false);
    expect(shouldBypassProtectedRouteMiddleware("/deals")).toBe(false);
  });
});

describe("classifyProtectedRouteMiddleware — next propagation", () => {
  it("redirects anonymous users with a sanitized next parameter", () => {
    expect(
      classifyProtectedRouteMiddleware({
        pathname: "/contacts",
        search: "?q=mira",
        hasAuthCookie: false,
      }),
    ).toEqual({ kind: "sign-in", nextSafe: "/contacts?q=mira" });
  });

  it("omits next when URL is oversized (open-redirect / abuse guardrail)", () => {
    const longPath = `/x${"a".repeat(2100)}`;
    expect(
      classifyProtectedRouteMiddleware({
        pathname: longPath,
        search: "",
        hasAuthCookie: false,
      }),
    ).toEqual({ kind: "sign-in", nextSafe: null });
  });

  it("attaches intended path for authenticated cookie requests", () => {
    expect(
      classifyProtectedRouteMiddleware({
        pathname: "/calendar",
        search: "",
        hasAuthCookie: true,
      }),
    ).toEqual({ kind: "session-cookie", intendedNextSafe: "/calendar" });
  });

  it("does not classify public routes even with a stale cookie notion", () => {
    expect(
      classifyProtectedRouteMiddleware({
        pathname: "/sign-in",
        search: "?next=/contacts",
        hasAuthCookie: true,
      }),
    ).toEqual({ kind: "public" });
  });
});
