import type { ApiContext, SessionUser } from "@cairnly/api";
import { headers as nextHeaders } from "next/headers";

import { auth } from "@/server/auth";
import { getDb } from "@/server/db";

export async function createApiContext(requestHeaders?: Headers): Promise<ApiContext> {
  const headerList = requestHeaders ?? (await nextHeaders());
  const session = await auth.api.getSession({
    headers: headerList,
  });

  return {
    db: getDb(),
    user: session?.user ? toSessionUser(session.user) : null,
    requestHeaders: headerList,
  };
}

function toSessionUser(user: {
  id: string;
  workspaceId?: string | null;
  role?: string | null;
}): SessionUser {
  return {
    id: user.id,
    workspaceId: user.workspaceId ?? "dev_workspace",
    role: parseRole(user.role),
  };
}

function parseRole(role: string | null | undefined): SessionUser["role"] {
  if (role === "owner" || role === "member" || role === "viewer") {
    return role;
  }

  return "member";
}
