import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { auth } from "@/server/auth";

/**
 * CRM shell routes: require a Better Auth session.
 * Public routes stay outside this group (sign-in, public forms, booking, API, healthz).
 */
export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const session = await auth.api.getSession({ headers: headerList });

  if (!session?.user) {
    redirect("/sign-in");
  }

  return children;
}
