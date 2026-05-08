import type { ContactCreateInput, ContactListInput } from "@cairnly/core";
import { contacts, type Db, events } from "@cairnly/db";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";

type ContactInsert = typeof contacts.$inferInsert;

export type ContactRepository = {
  list(input: ContactListInput & { workspaceId: string }): Promise<ContactRow[]>;
  listDedupeCandidates(input: {
    workspaceId: string;
  }): Promise<Pick<ContactRow, "id" | "name" | "primaryEmail">[]>;
  findById(input: { id: string; workspaceId: string }): Promise<ContactRow | undefined>;
  findByPrimaryEmail(input: {
    workspaceId: string;
    email: string;
  }): Promise<ContactRow | undefined>;
  create(input: ContactInsert): Promise<ContactRow>;
  update(input: {
    id: string;
    workspaceId: string;
    patch: Partial<ContactCreateInput>;
  }): Promise<ContactRow | undefined>;
  softDelete(input: {
    id: string;
    workspaceId: string;
    deletedAt: Date;
  }): Promise<ContactRow | undefined>;
  recordEvent(input: typeof events.$inferInsert): Promise<void>;
};

export type ContactRow = typeof contacts.$inferSelect;

export function createContactRepository(db: Db): ContactRepository {
  return {
    async list({ workspaceId, search, limit }) {
      const filters = [
        eq(contacts.workspaceId, workspaceId),
        isNull(contacts.deletedAt),
      ];

      if (search) {
        const pattern = `%${search}%`;
        const searchFilter = or(
          ilike(contacts.name, pattern),
          ilike(contacts.primaryEmail, pattern),
          ilike(contacts.primaryPhone, pattern),
        );

        if (searchFilter) {
          filters.push(searchFilter);
        }
      }

      return db
        .select()
        .from(contacts)
        .where(and(...filters))
        .orderBy(desc(contacts.createdAt))
        .limit(limit);
    },

    async listDedupeCandidates({ workspaceId }) {
      return db
        .select({
          id: contacts.id,
          name: contacts.name,
          primaryEmail: contacts.primaryEmail,
        })
        .from(contacts)
        .where(and(eq(contacts.workspaceId, workspaceId), isNull(contacts.deletedAt)));
    },

    async findById({ id, workspaceId }) {
      const [contact] = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.id, id),
            eq(contacts.workspaceId, workspaceId),
            isNull(contacts.deletedAt),
          ),
        )
        .limit(1);

      return contact;
    },

    async findByPrimaryEmail({ workspaceId, email }) {
      const normalized = email.trim().toLowerCase();
      const [contact] = await db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.workspaceId, workspaceId),
            isNull(contacts.deletedAt),
            sql`lower(${contacts.primaryEmail}) = ${normalized}`,
          ),
        )
        .limit(1);

      return contact;
    },

    async create(input) {
      const [contact] = await db.insert(contacts).values(input).returning();
      if (!contact) {
        throw new Error("Contact insert did not return a row");
      }

      return contact;
    },

    async update({ id, workspaceId, patch }) {
      const [contact] = await db
        .update(contacts)
        .set({
          ...patch,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(contacts.id, id),
            eq(contacts.workspaceId, workspaceId),
            isNull(contacts.deletedAt),
          ),
        )
        .returning();

      return contact;
    },

    async softDelete({ id, workspaceId, deletedAt }) {
      const [contact] = await db
        .update(contacts)
        .set({
          deletedAt,
          updatedAt: deletedAt,
        })
        .where(
          and(
            eq(contacts.id, id),
            eq(contacts.workspaceId, workspaceId),
            isNull(contacts.deletedAt),
          ),
        )
        .returning();

      return contact;
    },

    async recordEvent(input) {
      await db.insert(events).values(input);
    },
  };
}
