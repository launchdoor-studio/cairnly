import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { normalizePostAuthPath, sanitizeInternalNextPath } from "@/lib/safe-next";
import { auth } from "@/server/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const params = await searchParams;
  const nextPath = normalizePostAuthPath(
    sanitizeInternalNextPath(params.next ?? null) ?? "/",
  );

  if (session?.user) {
    redirect(nextPath);
  }

  return <AuthPanel redirectAfterLogin={nextPath} />;
}
