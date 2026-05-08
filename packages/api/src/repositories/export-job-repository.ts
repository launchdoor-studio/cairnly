import { type Db, exportJobs } from "@cairnly/db";
import { and, desc, eq } from "drizzle-orm";

export type ExportJobRow = typeof exportJobs.$inferSelect;

export type ExportJobRepository = {
  createPending(input: {
    id: string;
    workspaceId: string;
    reportId: string;
    actorId?: string | null;
  }): Promise<void>;
  complete(input: { id: string; rowCount: number; resultCsv: string }): Promise<void>;
  fail(input: { id: string; message: string }): Promise<void>;
  findById(input: {
    id: string;
    workspaceId: string;
  }): Promise<ExportJobRow | undefined>;
  listRecent(input: { workspaceId: string; limit: number }): Promise<ExportJobRow[]>;
};

export function createExportJobRepository(db: Db): ExportJobRepository {
  return {
    async createPending(input) {
      await db.insert(exportJobs).values({
        id: input.id,
        workspaceId: input.workspaceId,
        reportId: input.reportId,
        status: "pending",
        ...(input.actorId ? { actorId: input.actorId } : {}),
      });
    },

    async complete(input) {
      await db
        .update(exportJobs)
        .set({
          status: "completed",
          rowCount: input.rowCount,
          resultCsv: input.resultCsv,
          completedAt: new Date(),
        })
        .where(eq(exportJobs.id, input.id));
    },

    async fail(input) {
      await db
        .update(exportJobs)
        .set({
          status: "failed",
          errorMessage: input.message,
          completedAt: new Date(),
        })
        .where(eq(exportJobs.id, input.id));
    },

    async findById(input) {
      const [job] = await db
        .select()
        .from(exportJobs)
        .where(
          and(
            eq(exportJobs.id, input.id),
            eq(exportJobs.workspaceId, input.workspaceId),
          ),
        )
        .limit(1);

      return job;
    },

    async listRecent(input) {
      return db
        .select()
        .from(exportJobs)
        .where(eq(exportJobs.workspaceId, input.workspaceId))
        .orderBy(desc(exportJobs.createdAt))
        .limit(input.limit);
    },
  };
}
