import type { Db } from "@cairnly/db";

export type SessionUser = {
  id: string;
  workspaceId: string;
  role: "owner" | "member" | "viewer";
};

export type ApiContext = {
  db: Db;
  user: SessionUser | null;
};
