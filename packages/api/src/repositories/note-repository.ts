import type { NoteListInput, NoteUpdateInput } from "@cairnly/core";
import { type Db, events, notes } from "@cairnly/db";
import { and, desc, eq, isNull } from "drizzle-orm";

export type NoteRow = typeof notes.$inferSelect;

export type NoteRepository = {
  list(input: NoteListInput & { workspaceId: string }): Promise<NoteRow[]>;
  create(input: typeof notes.$inferInsert): Promise<NoteRow>;
  update(input: {
    id: string;
    workspaceId: string;
    patch: Partial<NoteUpdateInput>;
  }): Promise<NoteRow | undefined>;
  softDelete(input: {
    id: string;
    workspaceId: string;
    deletedAt: Date;
  }): Promise<NoteRow | undefined>;
  recordEvent(input: typeof events.$inferInsert): Promise<void>;
};

export function createNoteRepository(db: Db): NoteRepository {
  return {
    async list({ contactId, dealId, limit, workspaceId }) {
      const filters = [
        eq(notes.workspaceId, workspaceId),
        isNull(notes.deletedAt),
        ...(contactId ? [eq(notes.contactId, contactId)] : []),
        ...(dealId ? [eq(notes.dealId, dealId)] : []),
      ];

      return db
        .select()
        .from(notes)
        .where(and(...filters))
        .orderBy(desc(notes.updatedAt))
        .limit(limit);
    },

    async create(input) {
      const [note] = await db.insert(notes).values(input).returning();
      if (!note) {
        throw new Error("Note insert did not return a row");
      }

      return note;
    },

    async update({ id, patch, workspaceId }) {
      const [note] = await db
        .update(notes)
        .set({ ...patch, updatedAt: new Date() })
        .where(
          and(
            eq(notes.id, id),
            eq(notes.workspaceId, workspaceId),
            isNull(notes.deletedAt),
          ),
        )
        .returning();

      return note;
    },

    async softDelete({ deletedAt, id, workspaceId }) {
      const [note] = await db
        .update(notes)
        .set({ deletedAt, updatedAt: deletedAt })
        .where(
          and(
            eq(notes.id, id),
            eq(notes.workspaceId, workspaceId),
            isNull(notes.deletedAt),
          ),
        )
        .returning();

      return note;
    },

    async recordEvent(input) {
      await db.insert(events).values(input);
    },
  };
}
