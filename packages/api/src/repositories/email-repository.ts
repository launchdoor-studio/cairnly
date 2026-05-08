import type { EmailAccountDto, EmailMessageDto, EmailThreadDto } from "@cairnly/core";
import { type Db, emailAccounts, emailMessages } from "@cairnly/db";
import { and, asc, desc, eq } from "drizzle-orm";

export type EmailAccountRow = typeof emailAccounts.$inferSelect;
export type EmailMessageRow = typeof emailMessages.$inferSelect;

export type EmailRepository = {
  listAccounts(workspaceId: string): Promise<EmailAccountRow[]>;
  findAccount(input: {
    id: string;
    workspaceId: string;
  }): Promise<EmailAccountRow | undefined>;
  insertAccount(input: typeof emailAccounts.$inferInsert): Promise<EmailAccountRow>;
  deleteAccount(input: { id: string; workspaceId: string }): Promise<void>;
  insertMessage(input: typeof emailMessages.$inferInsert): Promise<EmailMessageRow>;
  tryInsertInboundMessage(
    input: typeof emailMessages.$inferInsert,
  ): Promise<"inserted" | "duplicate">;
  listMessagesForContact(input: {
    contactId: string;
    workspaceId: string;
  }): Promise<EmailMessageRow[]>;
  findMessageByTrackingToken(token: string): Promise<EmailMessageRow | undefined>;
  updateAccountSyncState(input: {
    id: string;
    workspaceId: string;
    syncState: Record<string, unknown>;
  }): Promise<void>;
};

export function createEmailRepository(db: Db): EmailRepository {
  return {
    async listAccounts(workspaceId) {
      return db
        .select()
        .from(emailAccounts)
        .where(eq(emailAccounts.workspaceId, workspaceId));
    },

    async findAccount({ id, workspaceId }) {
      const [row] = await db
        .select()
        .from(emailAccounts)
        .where(
          and(eq(emailAccounts.id, id), eq(emailAccounts.workspaceId, workspaceId)),
        )
        .limit(1);
      return row;
    },

    async insertAccount(input) {
      const [row] = await db.insert(emailAccounts).values(input).returning();
      if (!row) {
        throw new Error("email_account_insert_failed");
      }
      return row;
    },

    async deleteAccount({ id, workspaceId }) {
      await db
        .delete(emailMessages)
        .where(
          and(
            eq(emailMessages.accountId, id),
            eq(emailMessages.workspaceId, workspaceId),
          ),
        );
      await db
        .delete(emailAccounts)
        .where(
          and(eq(emailAccounts.id, id), eq(emailAccounts.workspaceId, workspaceId)),
        );
    },

    async insertMessage(input) {
      const [row] = await db.insert(emailMessages).values(input).returning();
      if (!row) {
        throw new Error("email_message_insert_failed");
      }
      return row;
    },

    async tryInsertInboundMessage(input) {
      const inserted = await db
        .insert(emailMessages)
        .values(input)
        .onConflictDoNothing({
          target: [emailMessages.accountId, emailMessages.messageId],
        })
        .returning({ id: emailMessages.id });

      return inserted.length > 0 ? "inserted" : "duplicate";
    },

    async listMessagesForContact({ contactId, workspaceId }) {
      return db
        .select()
        .from(emailMessages)
        .where(
          and(
            eq(emailMessages.contactId, contactId),
            eq(emailMessages.workspaceId, workspaceId),
          ),
        )
        .orderBy(
          desc(emailMessages.receivedAt),
          desc(emailMessages.sentAt),
          asc(emailMessages.id),
        );
    },

    async findMessageByTrackingToken(token) {
      const [row] = await db
        .select()
        .from(emailMessages)
        .where(eq(emailMessages.trackingToken, token))
        .limit(1);
      return row;
    },

    async updateAccountSyncState({ id, workspaceId, syncState }) {
      await db
        .update(emailAccounts)
        .set({
          syncState,
          updatedAt: new Date(),
        })
        .where(
          and(eq(emailAccounts.id, id), eq(emailAccounts.workspaceId, workspaceId)),
        );
    },
  };
}

export function toEmailAccountDto(row: EmailAccountRow): EmailAccountDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    provider: row.provider,
    address: row.address,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toEmailMessageDto(row: EmailMessageRow): EmailMessageDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    accountId: row.accountId,
    contactId: row.contactId ?? null,
    messageId: row.messageId,
    inReplyTo: row.inReplyTo ?? null,
    threadRootMessageId: row.threadRootMessageId ?? null,
    subject: row.subject,
    fromAddr: row.fromAddr,
    toAddrs: row.toAddrs,
    bodyText: row.bodyText ?? null,
    bodyHtml: row.bodyHtml ?? null,
    receivedAt: row.receivedAt ?? null,
    sentAt: row.sentAt ?? null,
  };
}

export function groupMessagesToThreads(rows: EmailMessageRow[]): EmailThreadDto[] {
  const byRoot = new Map<string, EmailMessageRow[]>();
  for (const row of rows) {
    const root = row.threadRootMessageId ?? row.messageId;
    const list = byRoot.get(root) ?? [];
    list.push(row);
    byRoot.set(root, list);
  }

  const threads: EmailThreadDto[] = [];
  for (const [threadRootMessageId, messages] of byRoot) {
    const sorted = [...messages].sort((a, b) => {
      const ta = (a.receivedAt ?? a.sentAt ?? new Date(0)).getTime();
      const tb = (b.receivedAt ?? b.sentAt ?? new Date(0)).getTime();
      return ta - tb;
    });
    const latest = sorted[sorted.length - 1];
    const latestAt = latest?.receivedAt ?? latest?.sentAt ?? new Date();
    threads.push({
      threadRootMessageId,
      subject: sorted[0]?.subject ?? "(no subject)",
      latestAt,
      messages: sorted.map(toEmailMessageDto),
    });
  }

  threads.sort((a, b) => b.latestAt.getTime() - a.latestAt.getTime());
  return threads;
}
