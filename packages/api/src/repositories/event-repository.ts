import type { EventListInput } from "@cairnly/core";
import { type Db, events } from "@cairnly/db";
import { and, desc, eq, isNull } from "drizzle-orm";

export type EventRow = typeof events.$inferSelect;

export type EventRepository = {
  list(input: EventListInput & { workspaceId: string }): Promise<EventRow[]>;
  create(input: typeof events.$inferInsert): Promise<EventRow>;
  update(input: {
    id: string;
    workspaceId: string;
    payload: Record<string, unknown>;
  }): Promise<EventRow | undefined>;
  softDelete(input: {
    id: string;
    workspaceId: string;
    deletedAt: Date;
  }): Promise<EventRow | undefined>;
};

export function createEventRepository(db: Db): EventRepository {
  return {
    async list({ contactId, dealId, limit, taskId, workspaceId }) {
      const filters = [
        eq(events.workspaceId, workspaceId),
        isNull(events.deletedAt),
        ...(contactId ? [eq(events.contactId, contactId)] : []),
        ...(dealId ? [eq(events.dealId, dealId)] : []),
        ...(taskId ? [eq(events.taskId, taskId)] : []),
      ];

      return db
        .select()
        .from(events)
        .where(and(...filters))
        .orderBy(desc(events.createdAt))
        .limit(limit);
    },

    async create(input) {
      const [event] = await db.insert(events).values(input).returning();
      if (!event) {
        throw new Error("Event insert did not return a row");
      }

      return event;
    },

    async update({ id, payload, workspaceId }) {
      const [event] = await db
        .update(events)
        .set({ payload })
        .where(
          and(
            eq(events.id, id),
            eq(events.workspaceId, workspaceId),
            isNull(events.deletedAt),
          ),
        )
        .returning();

      return event;
    },

    async softDelete({ deletedAt, id, workspaceId }) {
      const [event] = await db
        .update(events)
        .set({ deletedAt })
        .where(
          and(
            eq(events.id, id),
            eq(events.workspaceId, workspaceId),
            isNull(events.deletedAt),
          ),
        )
        .returning();

      return event;
    },
  };
}
