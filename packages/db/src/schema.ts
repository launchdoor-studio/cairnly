import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

type JsonObject = Record<string, unknown>;

const id = (name = "id") => text(name);
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const userRole = pgEnum("user_role", ["owner", "member", "viewer"]);
export const contactType = pgEnum("contact_type", ["person", "company"]);
export const contactScore = pgEnum("contact_score", ["hot", "warm", "cold", "unknown"]);
export const contactFieldType = pgEnum("contact_field_type", [
  "text",
  "number",
  "date",
  "single_select",
  "multi_select",
  "boolean",
  "url",
]);
export const dealStatus = pgEnum("deal_status", ["open", "won", "lost", "archived"]);
export const emailProvider = pgEnum("email_provider", ["imap", "gmail"]);
export const bookingStatus = pgEnum("booking_status", [
  "confirmed",
  "cancelled",
  "completed",
]);

export const exportJobStatus = pgEnum("export_job_status", [
  "pending",
  "completed",
  "failed",
]);

export const workspaces = pgTable("workspace", {
  id: id().primaryKey(),
  name: text("name").notNull(),
  settings: jsonb("settings").$type<JsonObject>().notNull(),
  aiConfig: jsonb("ai_config").$type<JsonObject>().notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable(
  "user",
  {
    id: id().primaryKey(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull().default(""),
    role: userRole("role").notNull().default("member"),
    workspaceId: id("workspace_id")
      .notNull()
      .default("dev_workspace")
      .references(() => workspaces.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("user_email_unique").on(table.email),
    uniqueIndex("user_workspace_email_unique").on(table.workspaceId, table.email),
    index("user_workspace_idx").on(table.workspaceId),
  ],
);

export const sessions = pgTable(
  "session",
  {
    id: id().primaryKey(),
    userId: id("user_id")
      .notNull()
      .references(() => users.id),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("session_token_unique").on(table.token),
    index("session_user_idx").on(table.userId),
  ],
);

export const accounts = pgTable(
  "account",
  {
    id: id().primaryKey(),
    userId: id("user_id")
      .notNull()
      .references(() => users.id),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("account_user_idx").on(table.userId),
    uniqueIndex("account_provider_account_unique").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verifications = pgTable("verification", {
  id: id().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const passkeys = pgTable(
  "passkey",
  {
    id: id().primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: id("user_id")
      .notNull()
      .references(() => users.id),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull(),
    transports: text("transports"),
    createdAt: createdAt(),
    aaguid: text("aaguid"),
  },
  (table) => [
    uniqueIndex("passkey_credential_unique").on(table.credentialID),
    index("passkey_user_idx").on(table.userId),
  ],
);

export const contacts = pgTable(
  "contact",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    type: contactType("type").notNull(),
    name: text("name").notNull(),
    primaryEmail: text("primary_email"),
    primaryPhone: text("primary_phone"),
    companyId: id("company_id"),
    ownerId: id("owner_id").references(() => users.id),
    score: contactScore("score").notNull(),
    customFields: jsonb("custom_fields").$type<JsonObject>().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("contact_workspace_idx").on(table.workspaceId),
    index("contact_owner_idx").on(table.ownerId),
    index("contact_company_idx").on(table.companyId),
  ],
);

export const contactFields = pgTable(
  "contact_field",
  {
    id: id().primaryKey(),
    contactId: id("contact_id")
      .notNull()
      .references(() => contacts.id),
    key: text("key").notNull(),
    value: text("value").notNull(),
    valueType: contactFieldType("value_type").notNull(),
  },
  (table) => [
    uniqueIndex("contact_field_key_unique").on(table.contactId, table.key),
    index("contact_field_contact_idx").on(table.contactId),
  ],
);

export const tags = pgTable(
  "tag",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    name: text("name").notNull(),
    color: text("color").notNull(),
  },
  (table) => [
    uniqueIndex("tag_workspace_name_unique").on(table.workspaceId, table.name),
  ],
);

export const contactTags = pgTable(
  "contact_tag",
  {
    contactId: id("contact_id")
      .notNull()
      .references(() => contacts.id),
    tagId: id("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => [primaryKey({ columns: [table.contactId, table.tagId] })],
);

export const pipelines = pgTable(
  "pipeline",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    name: text("name").notNull(),
    archived: boolean("archived").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("pipeline_workspace_idx").on(table.workspaceId)],
);

export const stages = pgTable(
  "stage",
  {
    id: id().primaryKey(),
    pipelineId: id("pipeline_id")
      .notNull()
      .references(() => pipelines.id),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    probability: integer("probability").notNull(),
  },
  (table) => [
    uniqueIndex("stage_pipeline_position_unique").on(table.pipelineId, table.position),
  ],
);

export const deals = pgTable(
  "deal",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    title: text("title").notNull(),
    contactId: id("contact_id").references(() => contacts.id),
    pipelineId: id("pipeline_id")
      .notNull()
      .references(() => pipelines.id),
    stageId: id("stage_id")
      .notNull()
      .references(() => stages.id),
    amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
    currency: text("currency").notNull(),
    expectedCloseDate: date("expected_close_date"),
    ownerId: id("owner_id").references(() => users.id),
    status: dealStatus("status").notNull(),
    lostReason: text("lost_reason"),
    position: integer("position").notNull().default(0),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("deal_workspace_idx").on(table.workspaceId),
    index("deal_pipeline_stage_idx").on(table.pipelineId, table.stageId),
    index("deal_contact_idx").on(table.contactId),
  ],
);

export const tasks = pgTable(
  "task",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }),
    doneAt: timestamp("done_at", { withTimezone: true }),
    contactId: id("contact_id").references(() => contacts.id),
    dealId: id("deal_id").references(() => deals.id),
    ownerId: id("owner_id").references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("task_workspace_idx").on(table.workspaceId),
    index("task_owner_due_idx").on(table.ownerId, table.dueAt),
  ],
);

export const notes = pgTable(
  "note",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    bodyMd: text("body_md").notNull(),
    title: text("title"),
    contactId: id("contact_id").references(() => contacts.id),
    dealId: id("deal_id").references(() => deals.id),
    authorId: id("author_id")
      .notNull()
      .references(() => users.id),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("note_workspace_idx").on(table.workspaceId),
    index("note_contact_idx").on(table.contactId),
    index("note_deal_idx").on(table.dealId),
  ],
);

export const events = pgTable(
  "event",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    type: text("type").notNull(),
    actorId: id("actor_id").references(() => users.id),
    contactId: id("contact_id").references(() => contacts.id),
    dealId: id("deal_id").references(() => deals.id),
    taskId: id("task_id").references(() => tasks.id),
    payload: jsonb("payload").$type<JsonObject>().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index("event_workspace_created_idx").on(table.workspaceId, table.createdAt),
    index("event_contact_created_idx").on(table.contactId, table.createdAt),
    index("event_deal_created_idx").on(table.dealId, table.createdAt),
  ],
);

export const exportJobs = pgTable(
  "export_job",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    reportId: text("report_id").notNull(),
    format: text("format").notNull().default("csv"),
    status: exportJobStatus("status").notNull(),
    rowCount: integer("row_count"),
    resultCsv: text("result_csv"),
    errorMessage: text("error_message"),
    actorId: id("actor_id").references(() => users.id),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index("export_job_workspace_created_idx").on(table.workspaceId, table.createdAt),
  ],
);

export const schedulingLinks = pgTable(
  "scheduling_link",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    ownerId: id("owner_id")
      .notNull()
      .references(() => users.id),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    timezone: text("timezone").notNull(),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
    bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("scheduling_link_workspace_slug_unique").on(
      table.workspaceId,
      table.slug,
    ),
    index("scheduling_link_owner_idx").on(table.ownerId),
  ],
);

export const availabilityWindows = pgTable(
  "availability_window",
  {
    id: id().primaryKey(),
    schedulingLinkId: id("scheduling_link_id")
      .notNull()
      .references(() => schedulingLinks.id),
    weekday: integer("weekday").notNull(),
    startMinutes: integer("start_minutes").notNull(),
    endMinutes: integer("end_minutes").notNull(),
  },
  (table) => [index("availability_window_link_idx").on(table.schedulingLinkId)],
);

export const availabilityExceptions = pgTable(
  "availability_exception",
  {
    id: id().primaryKey(),
    schedulingLinkId: id("scheduling_link_id")
      .notNull()
      .references(() => schedulingLinks.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    available: boolean("available").notNull(),
    reason: text("reason"),
  },
  (table) => [index("availability_exception_link_idx").on(table.schedulingLinkId)],
);

export const calendarBusyHolds = pgTable(
  "calendar_busy_hold",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    ownerId: id("owner_id")
      .notNull()
      .references(() => users.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    source: text("source").notNull(),
    externalId: text("external_id"),
    createdAt: createdAt(),
  },
  (table) => [
    index("calendar_busy_owner_time_idx").on(
      table.ownerId,
      table.startsAt,
      table.endsAt,
    ),
  ],
);

export const bookings = pgTable(
  "booking",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    schedulingLinkId: id("scheduling_link_id")
      .notNull()
      .references(() => schedulingLinks.id),
    contactId: id("contact_id").references(() => contacts.id),
    ownerId: id("owner_id")
      .notNull()
      .references(() => users.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    inviteeName: text("invitee_name").notNull(),
    inviteeEmail: text("invitee_email").notNull(),
    note: text("note"),
    status: bookingStatus("status").notNull().default("confirmed"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("booking_workspace_time_idx").on(
      table.workspaceId,
      table.startsAt,
      table.endsAt,
    ),
    index("booking_owner_time_idx").on(table.ownerId, table.startsAt, table.endsAt),
  ],
);

export const emailAccounts = pgTable(
  "email_account",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    provider: emailProvider("provider").notNull(),
    address: text("address").notNull(),
    oauthToken: jsonb("oauth_token").$type<JsonObject>(),
    imapConfig: jsonb("imap_config").$type<JsonObject>(),
    syncState: jsonb("sync_state").$type<JsonObject>().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("email_account_workspace_idx").on(table.workspaceId)],
);

export const emailMessages = pgTable(
  "email_message",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    accountId: id("account_id")
      .notNull()
      .references(() => emailAccounts.id),
    messageId: text("message_id").notNull(),
    inReplyTo: text("in_reply_to"),
    subject: text("subject").notNull(),
    fromAddr: text("from_addr").notNull(),
    toAddrs: jsonb("to_addrs").$type<string[]>().notNull(),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),
    receivedAt: timestamp("received_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("email_message_account_message_unique").on(
      table.accountId,
      table.messageId,
    ),
    index("email_message_workspace_idx").on(table.workspaceId),
  ],
);

export const forms = pgTable(
  "form",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    fieldsJson: jsonb("fields_json").$type<JsonObject[]>().notNull(),
    redirectUrl: text("redirect_url"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("form_workspace_slug_unique").on(table.workspaceId, table.slug),
  ],
);

export const formSubmissions = pgTable(
  "form_submission",
  {
    id: id().primaryKey(),
    formId: id("form_id")
      .notNull()
      .references(() => forms.id),
    payload: jsonb("payload").$type<JsonObject>().notNull(),
    contactId: id("contact_id").references(() => contacts.id),
    createdAt: createdAt(),
  },
  (table) => [
    index("form_submission_form_idx").on(table.formId),
    index("form_submission_contact_idx").on(table.contactId),
  ],
);

export const automations = pgTable(
  "automation",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    key: text("key").notNull(),
    enabled: boolean("enabled").notNull(),
    sourceHash: text("source_hash").notNull(),
  },
  (table) => [
    uniqueIndex("automation_workspace_key_unique").on(table.workspaceId, table.key),
  ],
);

export const aiAuditLogs = pgTable(
  "ai_audit_log",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    feature: text("feature").notNull(),
    model: text("model").notNull(),
    tokensIn: integer("tokens_in").notNull(),
    tokensOut: integer("tokens_out").notNull(),
    prompt: text("prompt").notNull(),
    createdAt: createdAt(),
  },
  (table) => [index("ai_audit_log_workspace_idx").on(table.workspaceId)],
);

export const apiTokens = pgTable(
  "api_token",
  {
    id: id().primaryKey(),
    workspaceId: id("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    hash: text("hash").notNull(),
    name: text("name").notNull(),
    scopes: jsonb("scopes").$type<string[]>().notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("api_token_hash_unique").on(table.hash),
    index("api_token_workspace_idx").on(table.workspaceId),
  ],
);

export type Workspace = typeof workspaces.$inferSelect;
export type User = typeof users.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Event = typeof events.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
