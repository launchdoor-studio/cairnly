import type {
  ContactDto,
  EmailAccountCreateImapInput,
  EmailSendToContactInput,
  ImapAccountConfig,
  WorkspaceEmailSettings,
} from "@cairnly/core";
import {
  contactTemplateVars,
  emailAccountCreateImapInputSchema,
  emailSendToContactInputSchema,
  emailWorkspaceSettingsUpdateInputSchema,
  imapAccountConfigSchema,
  mergeWorkspaceEmailSettings,
  parseWorkspaceEmailSettings,
} from "@cairnly/core";
import type { Db } from "@cairnly/db";
import { workspaces } from "@cairnly/db";
import {
  appendTrackingPixel,
  createGoogleOAuthClient,
  fetchRecentFromImap,
  refreshAccessToken,
  renderEmailTemplate,
  rewriteLinksForTracking,
  sendWorkspaceSmtp,
  smtpConfigFromEnv,
} from "@cairnly/email";
import { createId } from "@paralleldrive/cuid2";

import type { SessionUser } from "../context";
import {
  type ContactRepository,
  type ContactRow,
  createContactRepository,
} from "../repositories/contact-repository";
import {
  createEmailRepository,
  type EmailRepository,
  groupMessagesToThreads,
  toEmailAccountDto,
  toEmailMessageDto,
} from "../repositories/email-repository";
import {
  createEventRepository,
  type EventRepository,
} from "../repositories/event-repository";
import {
  createWorkspaceRepository,
  type WorkspaceRepository,
} from "../repositories/workspace-repository";

function publicAppBaseUrl(): string {
  return (
    process.env.CAIRNLY_PUBLIC_URL ??
    process.env.BETTER_AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function toContactDto(contact: ContactRow): ContactDto {
  return {
    id: contact.id,
    workspaceId: contact.workspaceId,
    type: contact.type,
    name: contact.name,
    primaryEmail: contact.primaryEmail,
    primaryPhone: contact.primaryPhone,
    companyId: contact.companyId,
    ownerId: contact.ownerId,
    score: contact.score,
    customFields: contact.customFields,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}

type AccountRow = Awaited<ReturnType<EmailRepository["listAccounts"]>>[number];

export function createEmailService(deps: {
  db: Db;
  emailRepo: EmailRepository;
  workspaceRepo: WorkspaceRepository;
  contactRepo: ContactRepository;
  eventRepo: EventRepository;
}) {
  const { db, emailRepo, workspaceRepo, contactRepo, eventRepo } = deps;

  async function resolveEmailSettings(
    workspaceId: string,
  ): Promise<WorkspaceEmailSettings> {
    const ws = await workspaceRepo.findById(workspaceId);
    if (!ws) {
      return parseWorkspaceEmailSettings({});
    }
    return parseWorkspaceEmailSettings(ws.settings as Record<string, unknown>);
  }

  async function matchContactForParticipants(input: {
    workspaceId: string;
    accountAddress: string;
    fromAddr: string;
    toAddrs: string[];
  }): Promise<ContactRow | undefined> {
    const acc = input.accountAddress.trim().toLowerCase();
    const pool = [
      input.fromAddr.trim().toLowerCase(),
      ...input.toAddrs.map((t) => t.trim().toLowerCase()),
    ].filter((e) => e.length > 0 && e !== acc);

    for (const email of pool) {
      const c = await contactRepo.findByPrimaryEmail({
        workspaceId: input.workspaceId,
        email,
      });
      if (c) {
        return c;
      }
    }
    return undefined;
  }

  async function ingestInboundBatch(
    acc: AccountRow,
    messages: Awaited<ReturnType<typeof fetchRecentFromImap>>["messages"],
    highestUid: number,
  ): Promise<void> {
    await emailRepo.updateAccountSyncState({
      id: acc.id,
      workspaceId: acc.workspaceId,
      syncState: {
        ...(acc.syncState as Record<string, unknown>),
        lastImapUid: highestUid,
        lastSyncedAt: new Date().toISOString(),
      },
    });

    for (const m of messages) {
      const contactRow = await matchContactForParticipants({
        workspaceId: acc.workspaceId,
        accountAddress: acc.address,
        fromAddr: m.fromAddr,
        toAddrs: m.toAddrs,
      });
      const contactId = contactRow?.id ?? null;

      const result = await emailRepo.tryInsertInboundMessage({
        id: createId(),
        workspaceId: acc.workspaceId,
        accountId: acc.id,
        contactId,
        messageId: m.messageId,
        inReplyTo: m.inReplyTo,
        threadRootMessageId: m.threadRootMessageId,
        referencesHeader: m.referencesHeader,
        subject: m.subject,
        fromAddr: m.fromAddr,
        toAddrs: m.toAddrs,
        bodyText: m.bodyText,
        bodyHtml: m.bodyHtml,
        trackingToken: null,
        receivedAt: m.receivedAt ?? new Date(),
        sentAt: null,
      });

      if (result === "inserted" && contactId) {
        await eventRepo.create({
          id: createId(),
          workspaceId: acc.workspaceId,
          type: "email_received",
          actorId: null,
          contactId,
          dealId: null,
          taskId: null,
          payload: {
            summary: `Email: ${m.subject}`,
            messageId: m.messageId,
            threadRoot: m.threadRootMessageId,
          },
        });
      }
    }
  }

  async function syncOneImapAccount(acc: AccountRow): Promise<void> {
    const settings = await resolveEmailSettings(acc.workspaceId);
    if (!settings.enabled) {
      return;
    }

    const cfg = acc.imapConfig as Record<string, unknown> | null;
    if (!cfg || typeof cfg.host !== "string") {
      return;
    }

    const host = cfg.host as string;
    const port = typeof cfg.port === "number" ? cfg.port : 993;
    const secure = cfg.secure !== false;
    const username = typeof cfg.username === "string" ? cfg.username : acc.address;
    const password = typeof cfg.password === "string" ? cfg.password : "";

    const { messages, highestUid } = await fetchRecentFromImap({
      host,
      port,
      secure,
      auth: { user: username, pass: password },
      maxMessages: 80,
    });

    await ingestInboundBatch(acc, messages, highestUid);
  }

  async function syncOneGmailAccount(acc: AccountRow): Promise<void> {
    const settings = await resolveEmailSettings(acc.workspaceId);
    if (!settings.enabled || acc.provider !== "gmail") {
      return;
    }

    const oauth = createGoogleOAuthClient();
    const tok = acc.oauthToken as Record<string, unknown> | null;
    const refresh =
      typeof tok?.refresh_token === "string"
        ? tok.refresh_token
        : typeof tok?.refreshToken === "string"
          ? tok.refreshToken
          : null;
    if (!oauth || !refresh) {
      return;
    }

    let accessToken: string;
    try {
      const refreshed = await refreshAccessToken(oauth, refresh);
      accessToken = refreshed.accessToken;
    } catch {
      return;
    }

    const { messages, highestUid } = await fetchRecentFromImap({
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: acc.address, accessToken },
      maxMessages: 80,
    });

    await ingestInboundBatch(acc, messages, highestUid);
  }

  return {
    async listAccounts(user: SessionUser) {
      const rows = await emailRepo.listAccounts(user.workspaceId);
      return { accounts: rows.map(toEmailAccountDto) };
    },

    async createImapAccount(user: SessionUser, raw: EmailAccountCreateImapInput) {
      if (user.role === "viewer") {
        throw new Error("viewer_forbidden");
      }

      const input = emailAccountCreateImapInputSchema.parse(raw);
      const imap: ImapAccountConfig = imapAccountConfigSchema.parse({
        ...input.imap,
        password: input.imap.password,
      });

      const row = await emailRepo.insertAccount({
        id: createId(),
        workspaceId: user.workspaceId,
        provider: "imap",
        address: input.address.trim().toLowerCase(),
        oauthToken: null,
        imapConfig: {
          host: imap.host,
          port: imap.port,
          secure: imap.secure,
          username: imap.username,
          password: imap.password,
        },
        syncState: { lastImapUid: 0 },
      });

      return { account: toEmailAccountDto(row) };
    },

    async deleteAccount(user: SessionUser, id: string) {
      if (user.role === "viewer") {
        throw new Error("viewer_forbidden");
      }

      const acc = await emailRepo.findAccount({ id, workspaceId: user.workspaceId });
      if (!acc) {
        throw new Error("account_not_found");
      }

      await emailRepo.deleteAccount({ id, workspaceId: user.workspaceId });
    },

    async getWorkspaceEmailSettings(user: SessionUser) {
      const settings = await resolveEmailSettings(user.workspaceId);
      return { settings };
    },

    async updateWorkspaceEmailSettings(user: SessionUser, raw: unknown) {
      if (user.role === "viewer") {
        throw new Error("viewer_forbidden");
      }

      const input = emailWorkspaceSettingsUpdateInputSchema.parse(raw);
      const ws = await workspaceRepo.findById(user.workspaceId);
      if (!ws) {
        throw new Error("account_not_found");
      }

      const merged = mergeWorkspaceEmailSettings(
        ws.settings as Record<string, unknown>,
        input.settings,
      );
      await workspaceRepo.updateSettings(user.workspaceId, merged);
      return { settings: parseWorkspaceEmailSettings(merged) };
    },

    async listThreadsForContact(user: SessionUser, contactId: string) {
      const contact = await contactRepo.findById({
        id: contactId,
        workspaceId: user.workspaceId,
      });
      if (!contact) {
        throw new Error("contact_not_found");
      }

      const rows = await emailRepo.listMessagesForContact({
        contactId,
        workspaceId: user.workspaceId,
      });
      return { threads: groupMessagesToThreads(rows) };
    },

    async sendToContact(user: SessionUser, raw: EmailSendToContactInput) {
      if (user.role === "viewer") {
        throw new Error("viewer_forbidden");
      }

      const input = emailSendToContactInputSchema.parse(raw);
      const settings = await resolveEmailSettings(user.workspaceId);
      if (!settings.enabled) {
        throw new Error("email_disabled");
      }

      const contact = await contactRepo.findById({
        id: input.contactId,
        workspaceId: user.workspaceId,
      });
      if (!contact) {
        throw new Error("contact_not_found");
      }

      const toEmail = contact.primaryEmail;
      if (!toEmail) {
        throw new Error("contact_not_found");
      }

      const account = await emailRepo.findAccount({
        id: input.accountId,
        workspaceId: user.workspaceId,
      });
      if (!account) {
        throw new Error("account_not_found");
      }

      const vars = contactTemplateVars(toContactDto(contact));
      const subject = renderEmailTemplate(input.subject, vars);
      const bodyText = renderEmailTemplate(input.bodyText, vars);
      let bodyHtml = input.bodyHtml
        ? renderEmailTemplate(input.bodyHtml, vars)
        : undefined;

      let trackingToken: string | null = null;
      const base = publicAppBaseUrl();
      if (settings.tracking.enabled && bodyHtml) {
        trackingToken = createId();
        const pixelUrl = `${base}/api/email/track/open?token=${encodeURIComponent(trackingToken)}`;
        const linkBase = `${base}/api/email/track/link?token=${encodeURIComponent(trackingToken)}`;
        bodyHtml = rewriteLinksForTracking(bodyHtml, linkBase);
        bodyHtml = appendTrackingPixel(bodyHtml, pixelUrl);
      }

      const smtp = smtpConfigFromEnv();
      if (!smtp && !settings.testMode) {
        throw new Error("smtp_not_configured");
      }

      if (!settings.testMode && smtp) {
        await sendWorkspaceSmtp(smtp, {
          from: account.address,
          to: [toEmail],
          subject,
          text: bodyText,
          html: bodyHtml,
        });
      }

      const row = await emailRepo.insertMessage({
        id: createId(),
        workspaceId: user.workspaceId,
        accountId: account.id,
        contactId: contact.id,
        messageId: `<cairnly-${createId()}@${user.workspaceId}.local>`,
        inReplyTo: null,
        threadRootMessageId: null,
        referencesHeader: null,
        subject,
        fromAddr: account.address,
        toAddrs: [toEmail],
        bodyText,
        bodyHtml: bodyHtml ?? null,
        trackingToken,
        receivedAt: null,
        sentAt: new Date(),
      });

      await eventRepo.create({
        id: createId(),
        workspaceId: user.workspaceId,
        type: "email_sent",
        actorId: user.id,
        contactId: contact.id,
        dealId: null,
        taskId: null,
        payload: {
          summary: `Email sent: ${subject}`,
          emailMessageId: row.id,
          subject,
        },
      });

      return { message: toEmailMessageDto(row) };
    },

    async syncAllImapAccounts(): Promise<void> {
      const ids = await db.select({ id: workspaces.id }).from(workspaces);
      for (const { id: workspaceId } of ids) {
        const accounts = await emailRepo.listAccounts(workspaceId);
        for (const acc of accounts) {
          if (acc.provider === "imap") {
            await syncOneImapAccount(acc);
          } else if (acc.provider === "gmail") {
            await syncOneGmailAccount(acc);
          }
        }
      }
    },
  };
}

export function createEmailServiceFromDb(db: Db) {
  return createEmailService({
    db,
    emailRepo: createEmailRepository(db),
    workspaceRepo: createWorkspaceRepository(db),
    contactRepo: createContactRepository(db),
    eventRepo: createEventRepository(db),
  });
}
