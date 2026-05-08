import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import {
  CAIRNLY_INTENDED_NEXT_HEADER,
  normalizePostAuthPath,
  sanitizeInternalNextPath,
} from "@/lib/safe-next";
import { auth } from "@/server/auth";

/**
 * CRM shell routes: require a Better Auth session.
 * Public routes stay outside this group (sign-in, public forms, booking, API, healthz).
 */
export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList });

  if (!session?.user) {
    const fromMiddleware = sanitizeInternalNextPath(
      headerList.get(CAIRNLY_INTENDED_NEXT_HEADER) ?? null,
    );
    const nextPath =
      fromMiddleware != null ? normalizePostAuthPath(fromMiddleware) : null;
    const query = nextPath != null ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/sign-in${query}`);
  }

  return children;
}
