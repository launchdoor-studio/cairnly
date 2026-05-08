import { z } from "zod";
import type { ContactDto } from "./contact";

export const workspaceEmailSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  /** When true, outgoing mail is logged but not sent over SMTP. */
  testMode: z.boolean().default(false),
  tracking: z
    .object({
      enabled: z.boolean().default(false),
    })
    .default({ enabled: false }),
});

export type WorkspaceEmailSettings = z.infer<typeof workspaceEmailSettingsSchema>;

export function parseWorkspaceEmailSettings(
  settings: Record<string, unknown>,
): WorkspaceEmailSettings {
  const raw =
    settings.email &&
    typeof settings.email === "object" &&
    settings.email !== null &&
    !Array.isArray(settings.email)
      ? settings.email
      : {};
  return workspaceEmailSettingsSchema.parse(raw);
}

export function mergeWorkspaceEmailSettings(
  settings: Record<string, unknown>,
  patch: Partial<WorkspaceEmailSettings>,
): Record<string, unknown> {
  const current = parseWorkspaceEmailSettings(settings);
  const next = {
    ...current,
    ...patch,
    tracking: { ...current.tracking, ...(patch.tracking ?? {}) },
  };
  return { ...settings, email: next };
}

export const imapAccountConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(993),
  secure: z.boolean().default(true),
  username: z.string().min(1),
  /** App password or IMAP password (never returned to clients). */
  password: z.string().min(1).optional(),
});

export type ImapAccountConfig = z.infer<typeof imapAccountConfigSchema>;

export const emailAccountDtoSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  provider: z.enum(["imap", "gmail"]),
  address: z.string().email(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type EmailAccountDto = z.infer<typeof emailAccountDtoSchema>;

export const emailMessageDtoSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  accountId: z.string().min(1),
  contactId: z.string().nullable(),
  messageId: z.string().min(1),
  inReplyTo: z.string().nullable(),
  threadRootMessageId: z.string().nullable(),
  subject: z.string(),
  fromAddr: z.string(),
  toAddrs: z.array(z.string()),
  bodyText: z.string().nullable(),
  bodyHtml: z.string().nullable(),
  receivedAt: z.date().nullable(),
  sentAt: z.date().nullable(),
});

export type EmailMessageDto = z.infer<typeof emailMessageDtoSchema>;

export const emailThreadDtoSchema = z.object({
  threadRootMessageId: z.string().min(1),
  subject: z.string(),
  latestAt: z.date(),
  messages: z.array(emailMessageDtoSchema),
});

export type EmailThreadDto = z.infer<typeof emailThreadDtoSchema>;

export const emailAccountCreateImapInputSchema = z.object({
  address: z.string().email(),
  imap: imapAccountConfigSchema.omit({ password: true }).extend({
    password: z.string().min(1),
  }),
});

export type EmailAccountCreateImapInput = z.infer<
  typeof emailAccountCreateImapInputSchema
>;

export const emailAccountDeleteInputSchema = z.object({
  id: z.string().min(1),
});

export const emailSendToContactInputSchema = z.object({
  contactId: z.string().min(1),
  accountId: z.string().min(1),
  subject: z.string().trim().min(1),
  bodyText: z.string().trim().min(1),
  bodyHtml: z.string().trim().optional(),
});

export type EmailSendToContactInput = z.infer<typeof emailSendToContactInputSchema>;

export const emailListThreadsInputSchema = z.object({
  contactId: z.string().min(1),
});

export const emailListThreadsOutputSchema = z.object({
  threads: z.array(emailThreadDtoSchema),
});

export const emailListAccountsOutputSchema = z.object({
  accounts: z.array(emailAccountDtoSchema),
});

export const emailSendOutputSchema = z.object({
  message: emailMessageDtoSchema,
});

export const emailWorkspaceSettingsOutputSchema = z.object({
  settings: workspaceEmailSettingsSchema,
});

export const emailWorkspaceSettingsUpdateInputSchema = z.object({
  settings: workspaceEmailSettingsSchema.partial(),
});

/** Template variables for `{{contact.*}}` substitution. */
export function contactTemplateVars(contact: ContactDto): Record<string, string> {
  const name = contact.name.trim();
  const parts = name.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
  return {
    "contact.first_name": firstName,
    "contact.last_name": lastName,
    "contact.name": name,
    "contact.primary_email": contact.primaryEmail ?? "",
    "contact.primary_phone": contact.primaryPhone ?? "",
    "contact.score": contact.score,
  };
}
