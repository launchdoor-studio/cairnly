import type { TaskListInput, TaskUpdateInput } from "@cairnly/core";
import { type Db, events, tasks } from "@cairnly/db";
import { and, desc, eq, isNotNull, isNull } from "drizzle-orm";

export type TaskRow = typeof tasks.$inferSelect;

export type TaskRepository = {
  list(input: TaskListInput & { workspaceId: string }): Promise<TaskRow[]>;
  create(input: typeof tasks.$inferInsert): Promise<TaskRow>;
  update(input: {
    id: string;
    workspaceId: string;
    patch: Partial<TaskUpdateInput> & { doneAt?: Date | null };
  }): Promise<TaskRow | undefined>;
  softDelete(input: {
    id: string;
    workspaceId: string;
    deletedAt: Date;
  }): Promise<TaskRow | undefined>;
  recordEvent(input: typeof events.$inferInsert): Promise<void>;
};

export function createTaskRepository(db: Db): TaskRepository {
  return {
    async list({ done, limit, workspaceId }) {
      const filters = [
        eq(tasks.workspaceId, workspaceId),
        isNull(tasks.deletedAt),
        ...(done === true ? [isNotNull(tasks.doneAt)] : []),
        ...(done === false ? [isNull(tasks.doneAt)] : []),
      ];

      return db
        .select()
        .from(tasks)
        .where(and(...filters))
        .orderBy(desc(tasks.createdAt))
        .limit(limit);
    },

    async create(input) {
      const [task] = await db.insert(tasks).values(input).returning();
      if (!task) {
        throw new Error("Task insert did not return a row");
      }

      return task;
    },

    async update({ id, patch, workspaceId }) {
      const { done, ...taskPatch } = patch;
      const [task] = await db
        .update(tasks)
        .set({
          ...taskPatch,
          doneAt: done === undefined ? taskPatch.doneAt : done ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tasks.id, id),
            eq(tasks.workspaceId, workspaceId),
            isNull(tasks.deletedAt),
          ),
        )
        .returning();

      return task;
    },

    async softDelete({ deletedAt, id, workspaceId }) {
      const [task] = await db
        .update(tasks)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(
          and(
            eq(tasks.id, id),
            eq(tasks.workspaceId, workspaceId),
            isNull(tasks.deletedAt),
          ),
        )
        .returning();

      return task;
    },

    async recordEvent(input) {
      await db.insert(events).values(input);
    },
  };
}
