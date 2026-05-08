import type { Db } from "@cairnly/db";
import { workspaces } from "@cairnly/db";
import { eq } from "drizzle-orm";

export type WorkspaceRow = typeof workspaces.$inferSelect;

export type WorkspaceRepository = ReturnType<typeof createWorkspaceRepository>;

export function createWorkspaceRepository(db: Db) {
  return {
    async findById(workspaceId: string): Promise<WorkspaceRow | undefined> {
      const [row] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspaceId))
        .limit(1);
      return row;
    },

    async updateSettings(
      workspaceId: string,
      settings: Record<string, unknown>,
    ): Promise<void> {
      await db
        .update(workspaces)
        .set({
          settings,
          updatedAt: new Date(),
        })
        .where(eq(workspaces.id, workspaceId));
    },
  };
}
