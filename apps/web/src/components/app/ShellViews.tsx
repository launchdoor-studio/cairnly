"use client";

import {
  REPORT_DEFINITIONS,
  type ContactDto,
  type DealDto,
  type DealUpdateInput,
  type EventDto,
  type NoteDto,
  type ReportExportJobDto,
  type ReportId,
  type StageDto,
  type TaskDto,
} from "@cairnly/core";
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowUpRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Code2,
  ContactRound,
  Database,
  Download,
  FileBarChart,
  FileSpreadsheet,
  Filter,
  Loader2,
  Mail,
  Search,
  Server,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Webhook,
} from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useState, useTransition } from "react";
import type { AppActions, AppData } from "@/lib/app-data";
import type { ContactUpdateAction } from "@/lib/contact-mutations";
import type { DashboardSummary } from "@/lib/dashboard-summary";
import {
  type ActiveView,
  getTrailMarker,
  type NavItem,
  pipelineStages,
  relationshipPath,
} from "@/lib/navigation";

type PreviewListItem = {
  /** Stable key for React lists; prefer entity id when sourced from API */
  id?: string;
  title: string;
  meta: string;
  marker?: string;
};

type ShellData = {
  contacts?: ContactDto[];
};

type ShellReportExport = {
  jobs: ReportExportJobDto[];
  onExport: (
    reportId: ReportId,
  ) => Promise<
    | { ok: true; csv: string; filename: string; jobId: string }
    | { ok: false; message: string }
  >;
};

const viewListItems: Record<ActiveView, PreviewListItem[]> = {
  home: [
    {
      title: "Sign in with a database configured to load activity",
      meta: "The home page lists recent workspace events when DATABASE_URL is set.",
    },
  ],
  contacts: [
    {
      title: "Mira Patel",
      meta: "Founder, Northstar Design - warm - replied today",
      marker: "Hot",
    },
    {
      title: "Jon Bell",
      meta: "Principal, Atlas Studio - proposal open",
      marker: "Warm",
    },
    {
      title: "Rhea Systems",
      meta: "Company - 12 people - last touch 9 days ago",
      marker: "Cold",
    },
  ],
  deals: [
    {
      title: "Northstar migration",
      meta: "$24.8k - Proposal - closes May 22",
      marker: "72%",
    },
    {
      title: "Atlas Studio retainer",
      meta: "$8.4k - Qualified - owner you",
      marker: "44%",
    },
    {
      title: "Rhea onboarding",
      meta: "$15k - Lead - source webhook",
      marker: "28%",
    },
  ],
  tasks: [
    {
      title: "Send follow-up to Mira",
      meta: "Today, 2:00 PM - linked to Northstar migration",
      marker: "Due",
    },
    {
      title: "Review Atlas proposal notes",
      meta: "Today - contact timeline has 3 new events",
      marker: "My Day",
    },
    {
      title: "Prepare scheduling page copy",
      meta: "Tomorrow - calendar setup",
      marker: "Next",
    },
  ],
  calendar: [
    {
      title: "Discovery call",
      meta: "10:30 AM - Mira Patel - Google Calendar",
      marker: "30m",
    },
    {
      title: "Proposal review",
      meta: "1:00 PM - Atlas Studio - scheduling link",
      marker: "45m",
    },
    {
      title: "Focus block",
      meta: "3:30 PM - protected availability",
      marker: "90m",
    },
  ],
  automations: [
    {
      title: "onEmailReceived",
      meta: "Score lead, add tag, and create follow-up task",
      marker: "Enabled",
    },
    {
      title: "onStageChanged",
      meta: "Write stage transition to the event timeline",
      marker: "Built-in",
    },
    {
      title: "onSchedule(cron)",
      meta: "Weekly digest and aging deal review",
      marker: "Cron",
    },
  ],
  reports: [
    {
      title: "Pipeline by stage",
      meta: "Current value, count, and forecast by stage",
      marker: "CSV",
    },
    {
      title: "Conversion funnel",
      meta: "Lead to qualified to won movement",
      marker: "Core",
    },
    {
      title: "Revenue by month",
      meta: "Won revenue trend and month-over-month change",
      marker: "CSV",
    },
  ],
  inbox: [
    {
      title: "Email received from Mira Patel",
      meta: "Threaded inside contact timeline",
      marker: "Email",
    },
    {
      title: "Form submission from cairnly.app",
      meta: "Webhook created contact and event",
      marker: "Form",
    },
    {
      title: "Stage changed for Northstar migration",
      meta: "Audit log event - Proposal",
      marker: "Deal",
    },
  ],
  settings: [
    {
      title: "Workspace setup",
      meta: "Name, domain, workspace owner, and install posture",
      marker: "Core",
    },
    {
      title: "AI privacy mode",
      meta: "Off by default - Local, BYO key, or disabled",
      marker: "Opt-in",
    },
    {
      title: "Email and calendar",
      meta: "SMTP, IMAP, Gmail, CalDAV, and Google Calendar readiness",
      marker: "Optional",
    },
  ],
};

const contactFields = [
  ["Primary email", "mira@northstar.design"],
  ["Company", "Northstar Design"],
  ["Owner", "Aftaab"],
  ["Score", "Hot"],
] as const;

const contactTimeline = [
  {
    title: "Email reply",
    body: "Asked for a migration plan and timeline before Friday.",
    time: "4m ago",
  },
  {
    title: "Discovery call",
    body: "Discussed requirements, timeline, and preferred meeting cadence.",
    time: "Yesterday",
  },
  {
    title: "Form submission",
    body: "Came in through the public lead capture endpoint.",
    time: "May 3",
  },
] as const;

const taskGroups = [
  {
    label: "My Day",
    items: ["Send migration plan", "Review proposal notes", "Update deal amount"],
  },
  {
    label: "Upcoming",
    items: ["Draft scheduling page", "Check IMAP settings", "Export contact CSV"],
  },
] as const;

const weekSlots = [
  ["Mon", "Discovery", "Open"],
  ["Tue", "Focus", "Proposal"],
  ["Wed", "Open", "Review"],
  ["Thu", "CalDAV", "Open"],
  ["Fri", "Follow-up", "Open"],
] as const;

const setupSections = [
  {
    title: "Workspace identity",
    description: "Name, domain pattern, and owner contact.",
    status: "Ready",
    icon: ShieldCheck,
  },
  {
    title: "AI privacy mode",
    description: "Stays off until you choose local inference, external API keys, or off.",
    status: "Off",
    icon: Bot,
  },
  {
    title: "Email transport",
    description: "SMTP and IMAP connect here when you configure them.",
    status: "Not connected",
    icon: Mail,
  },
  {
    title: "Database",
    description: "PostgreSQL is the primary application store.",
    status: "Local",
    icon: Server,
  },
] as const;

const automationTriggers = [
  "onContactCreated",
  "onEmailReceived",
  "onStageChanged",
  "onTaskCompleted",
  "onFormSubmitted",
  "onDealWon",
  "onDealLost",
  "onSchedule(cron)",
] as const;

const automationHelpers = [
  "assignOwner",
  "addTag",
  "sendEmail",
  "createTask",
  "setField",
  "score",
  "webhook",
] as const;

function contactToListItem(contact: ContactDto): PreviewListItem {
  return {
    id: contact.id,
    title: contact.name,
    meta: [
      contact.primaryEmail ?? "No email yet",
      contact.type === "company" ? "Company" : "Person",
      `${formatScore(contact.score)} score`,
    ].join(" - "),
    marker: formatScore(contact.score),
  };
}

function dealToListItem(deal: DealDto): PreviewListItem {
  return {
    id: deal.id,
    title: deal.title,
    meta: `${formatMoney(deal.amountCents)} - ${deal.status} - ${deal.currency}`,
    marker: `${deal.position}`,
  };
}

function taskToListItem(task: TaskDto): PreviewListItem {
  return {
    id: task.id,
    title: task.title,
    meta: task.doneAt
      ? "Completed"
      : task.dueAt
        ? `Due ${formatDateTime(task.dueAt)}`
        : "No due date",
    marker: task.doneAt ? "Done" : "Open",
  };
}

function eventToListItem(event: EventDto): PreviewListItem {
  const summary =
    typeof event.payload.summary === "string" ? event.payload.summary : event.type;

  return {
    id: event.id,
    title: summary,
    meta: `${event.type} - ${formatDateTime(event.createdAt)}`,
    marker: "Event",
  };
}

function formatScore(score: ContactDto["score"]) {
  return score.charAt(0).toUpperCase() + score.slice(1);
}

function formatMoney(amountCents: number) {
  return new Intl.NumberFormat(undefined, {
    currency: "USD",
    style: "currency",
  }).format(amountCents / 100);
}

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function formatTime(date: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

function isContactScore(score: string): score is ContactDto["score"] {
  return ["hot", "warm", "cold", "unknown"].includes(score);
}

function ContactInput({
  defaultValue,
  label,
  name,
  type = "text",
}: {
  defaultValue: string;
  label: string;
  name: string;
  type?: "email" | "text";
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        className="mt-1 h-10 w-full rounded-input border border-border bg-bg px-3 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

export function ListPane({
  activeItem,
  activeView,
  appData,
  dashboard,
  data,
  onPreviewOpen,
}: {
  activeItem: NavItem;
  activeView: ActiveView;
  appData?: AppData;
  dashboard?: DashboardSummary;
  data?: ShellData;
  onPreviewOpen?: () => void;
}) {
  const items =
    activeView === "home"
      ? (dashboard?.homeListPreview ?? viewListItems.home)
      : activeView === "contacts" && data?.contacts?.length
      ? data.contacts.map(contactToListItem)
      : activeView === "deals" && appData?.deals?.length
        ? appData.deals.map(dealToListItem)
        : activeView === "tasks" && appData?.tasks?.length
          ? appData.tasks.map(taskToListItem)
          : activeView === "inbox" && appData?.events?.length
            ? appData.events.map(eventToListItem)
            : viewListItems[activeView];

  return (
    <section className="border-b border-border bg-surface/70 p-4 md:p-6 xl:border-b-0 xl:border-r">
      <motion.div
        key={`${activeView}-list`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
              Section
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text">
              {activeItem.label}
            </h2>
          </div>
          <span className="rounded-full border border-border bg-bg px-2.5 py-1 text-[12px] text-muted">
            {activeItem.shortcut}
          </span>
        </div>

        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-left text-[13px] text-muted transition duration-150 ease-out hover:border-border-strong"
        >
          <Search className="h-4 w-4 text-subtle" aria-hidden />
          Filter this view
          <span className="ml-auto font-mono text-[11px] text-subtle">/</span>
        </button>

        <div className="space-y-2">
          {items.map((item, index) => (
            <button
              type="button"
              key={item.id ?? `${activeView}-row-${index}-${item.meta}`}
              onClick={onPreviewOpen}
              className={`w-full rounded-card border p-3 text-left transition duration-150 ease-out hover:border-border-strong hover:bg-bg ${
                index === 0 ? "border-border-strong bg-bg" : "border-border bg-surface"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-accent" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-text">
                      {item.title}
                    </span>
                    {item.marker ? (
                      <span className="shrink-0 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
                        {item.marker}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[12px] text-muted">{item.meta}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-subtle" aria-hidden />
              </div>
            </button>
          ))}
        </div>

        <ViewHint activeView={activeView} />
      </motion.div>
    </section>
  );
}

export function DetailPane({
  actions,
  activeItem,
  activeView,
  appData,
  contactUpdateAction,
  dashboard,
  data,
  reportExport,
}: {
  actions?: AppActions;
  activeItem: NavItem;
  activeView: ActiveView;
  appData?: AppData;
  contactUpdateAction?: ContactUpdateAction;
  dashboard?: DashboardSummary;
  data?: ShellData;
  reportExport?: ShellReportExport;
}) {
  return (
    <section className="min-w-0 bg-bg p-4 pb-24 md:p-6 lg:pb-6">
      <motion.div
        key={`${activeView}-detail`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full space-y-6"
      >
        {activeView === "home" ? (
          <DashboardView activeItem={activeItem} dashboard={dashboard} />
        ) : null}
        {activeView === "contacts" ? (
          <ContactView
            contactUpdateAction={contactUpdateAction}
            contacts={data?.contacts}
          />
        ) : null}
        {activeView === "deals" ? (
          <DealsView
            actions={actions}
            deals={appData?.deals}
            stages={appData?.stages}
          />
        ) : null}
        {activeView === "tasks" ? (
          <TasksView actions={actions} tasks={appData?.tasks} />
        ) : null}
        {activeView === "calendar" ? (
          <CalendarView slots={appData?.scheduling?.slots} />
        ) : null}
        {activeView === "automations" ? <AutomationsView /> : null}
        {activeView === "reports" ? (
          <ReportsView reportExport={reportExport} />
        ) : null}
        {activeView === "inbox" ? (
          <TimelineView
            actions={actions}
            events={appData?.events}
            notes={appData?.notes}
          />
        ) : null}
        {activeView === "settings" ? <SettingsView /> : null}
      </motion.div>
    </section>
  );
}

function ViewHint({ activeView }: { activeView: ActiveView }) {
  const hints: Record<ActiveView, string> = {
    home: "Totals reflect your workspace; open a screen from the nav for details.",
    contacts: "Search and edit records; each contact has its own timeline.",
    deals: "Drag cards between stages; moves are saved and logged.",
    tasks: "Optional links to a contact or deal keep work tied to records.",
    calendar: "Share a booking link so people pick a time that fits your hours.",
    automations: "Automations are maintained in code with this app release.",
    reports: "Run a CSV export anytime; recent runs are listed beside each report.",
    inbox: "Newest workspace events first.",
    settings: "Workspace preferences, connections, and security.",
  };

  return (
    <div className="rounded-card border border-border bg-bg p-4">
      <p className="text-[13px] font-medium text-text">Quick tip</p>
      <p className="mt-1 text-[13px] text-muted">{hints[activeView]}</p>
    </div>
  );
}

function DashboardView({
  activeItem,
  dashboard,
}: {
  activeItem: NavItem;
  dashboard?: DashboardSummary;
}) {
  const metrics =
    dashboard?.metrics ?? [
      { label: "Weighted pipeline", value: "—", detail: "Needs database" },
      { label: "New contacts", value: "—", detail: "This week" },
      { label: "Due today", value: "—", detail: "Open tasks" },
      { label: "Open deals", value: "—", detail: "Active pipeline" },
    ];

  const pipelinePreview = dashboard?.pipelineStages ?? [];

  const activityCards =
    dashboard?.activityCards ?? [
      {
        label: "Activity",
        detail: "Emails, deals, notes, and form submissions aggregate on the timeline.",
      },
    ];

  return (
    <>
      <MetricGrid metrics={metrics} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
        <RelationshipCard description={activeItem.description} />
        <DashboardSideCards pipelinePreview={pipelinePreview} />
      </div>
      <ActivityTypeGrid items={activityCards} />
    </>
  );
}

function ContactView({
  contactUpdateAction,
  contacts = [],
}: {
  contactUpdateAction?: ContactUpdateAction;
  contacts?: ContactDto[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const contact = contacts[0];
  const fields = contact
    ? [
        ["Primary email", contact.primaryEmail ?? "Not set"],
        ["Primary phone", contact.primaryPhone ?? "Not set"],
        ["Owner", contact.ownerId ?? "Unassigned"],
        ["Score", formatScore(contact.score)],
      ]
    : contactFields;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!contact || !contactUpdateAction) {
      setMessage("Seed or create a contact before editing fields.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const primaryEmail = String(formData.get("primaryEmail") ?? "").trim();
    const primaryPhone = String(formData.get("primaryPhone") ?? "").trim();
    const score = String(formData.get("score") ?? contact.score);

    if (!name) {
      setMessage("Contact name cannot be empty.");
      return;
    }

    if (!isContactScore(score)) {
      setMessage("Choose a valid score before saving.");
      return;
    }

    startTransition(async () => {
      const result = await contactUpdateAction({
        id: contact.id,
        name,
        primaryEmail: primaryEmail || undefined,
        primaryPhone: primaryPhone || undefined,
        score,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setMessage("Saved.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
      <article className="rounded-modal border border-border bg-surface">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
              Contact timeline
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
              {contact?.name ?? "Mira Patel"}
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] text-muted">
              {contact
                ? "Data from contacts API."
                : "Email, meetings, notes, forms, tasks, and deal updates roll up here."}
            </p>
          </div>
          <span className="rounded-full bg-accent px-2.5 py-1 text-[12px] font-medium text-accent-fg">
            {contact ? formatScore(contact.score) : "Hot"}
          </span>
        </div>

        <div className="divide-y divide-border">
          {contactTimeline.map((event) => (
            <div key={event.title} className="grid gap-3 p-5 md:grid-cols-[120px_1fr]">
              <p className="text-[12px] text-subtle">{event.time}</p>
              <div>
                <p className="text-[13px] font-medium text-text">{event.title}</p>
                <p className="mt-1 text-[13px] text-muted">{event.body}</p>
              </div>
            </div>
          ))}
        </div>
      </article>

      <aside className="space-y-4">
        <article className="rounded-modal border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-text">Fields</h3>
              <p className="mt-1 text-[12px] text-muted">
                {contact ? "Changes save to your workspace." : "Sample layout when no contact is loaded."}
              </p>
            </div>
            {contact ? (
              <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] text-muted">
                API
              </span>
            ) : null}
          </div>

          {contact ? (
            <form className="mt-4 space-y-3" onSubmit={onSubmit}>
              <ContactInput label="Name" name="name" defaultValue={contact.name} />
              <ContactInput
                label="Primary email"
                name="primaryEmail"
                type="email"
                defaultValue={contact.primaryEmail ?? ""}
              />
              <ContactInput
                label="Primary phone"
                name="primaryPhone"
                defaultValue={contact.primaryPhone ?? ""}
              />
              <label className="block">
                <span className="text-[12px] font-medium text-muted">Score</span>
                <select
                  name="score"
                  defaultValue={contact.score}
                  className="mt-1 h-10 w-full rounded-input border border-border bg-bg px-3 text-[13px] text-text outline-none transition duration-150 ease-out focus:border-border-strong focus:ring-2 focus:ring-ring"
                >
                  <option value="unknown">Unknown</option>
                  <option value="cold">Cold</option>
                  <option value="warm">Warm</option>
                  <option value="hot">Hot</option>
                </select>
              </label>

              {message ? <p className="text-[12px] text-muted">{message}</p> : null}

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex w-full items-center justify-center rounded-input bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg transition duration-150 ease-out hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Saving..." : "Save contact"}
              </button>
            </form>
          ) : (
            <div className="mt-4 space-y-3">
              {fields.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4">
                  <span className="text-[12px] text-muted">{label}</span>
                  <span className="truncate text-[13px] font-medium text-text">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </article>
        <article className="rounded-modal border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-accent" aria-hidden />
            <h3 className="font-semibold text-text">Email drafts</h3>
          </div>
          <p className="mt-3 text-[13px] text-muted">
            AI-assisted compose stays off unless you enable it in workspace AI
            settings.
          </p>
        </article>
        <article className="rounded-modal border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-4 w-4 text-accent" aria-hidden />
            <h3 className="font-semibold text-text">CSV import</h3>
          </div>
          <p className="mt-3 text-[13px] text-muted">
            Upload a CSV, map columns, review duplicates, then import.
          </p>
          <Link
            href="/contacts/import"
            className="mt-5 inline-flex items-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-text transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover"
          >
            Import contacts
            <ArrowUpRight className="h-4 w-4 text-subtle" aria-hidden />
          </Link>
        </article>
        <article className="rounded-modal border border-border bg-surface p-5">
          <h3 className="font-semibold text-text">Public form</h3>
          <p className="mt-2 text-[13px] text-muted">
            Share /f/[slug] with leads; submissions create contacts and appear on the timeline.
          </p>
          <Link
            href="/f/intake"
            className="mt-5 inline-flex items-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-text transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover"
          >
            Open intake form
            <ArrowUpRight className="h-4 w-4 text-subtle" aria-hidden />
          </Link>
        </article>
      </aside>
    </div>
  );
}

function DealsView({
  actions,
  deals = [],
  stages = [],
}: {
  actions?: AppActions;
  deals?: DealDto[];
  stages?: StageDto[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | undefined>();
  const [localDeals, setLocalDeals] = useState(deals);
  const [isPending, startTransition] = useTransition();
  const activeStages = stages.length
    ? stages
    : pipelineStages.map((stage, index) => ({
        id: stage.label.toLowerCase(),
        pipelineId: "preview",
        name: stage.label,
        position: index,
        probability: stage.count * 20,
      }));

  useEffect(() => {
    setLocalDeals(deals);
  }, [deals]);

  function onDragEnd(event: DragEndEvent) {
    const dealId = String(event.active.id);
    const stageId = event.over?.id ? String(event.over.id) : undefined;
    const deal = localDeals.find((item) => item.id === dealId);

    if (!deal || !stageId || deal.stageId === stageId || !actions?.moveDealStage) {
      return;
    }

    const moveDealStage = actions.moveDealStage;
    const previousDeals = localDeals;
    setLocalDeals((items) =>
      items.map((item) => (item.id === dealId ? { ...item, stageId } : item)),
    );

    startTransition(async () => {
      const result = await moveDealStage({
        id: dealId,
        stageId,
        position: deal.position,
      });

      if (!result.ok) {
        setLocalDeals(previousDeals);
        setMessage(result.message);
        return;
      }

      setMessage("Stage updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <DealsSummaryBar deals={localDeals} stages={activeStages} />
      {message ? <p className="text-[13px] text-muted">{message}</p> : null}
      <DndContext onDragEnd={onDragEnd}>
        <div className="grid gap-4 xl:grid-cols-4">
          {activeStages.map((stage) => (
            <DealStageColumn
              key={stage.id}
              disabled={isPending}
              deals={localDeals.filter((deal) => deal.stageId === stage.id)}
              stage={stage}
              updateDeal={actions?.updateDeal}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function DealsSummaryBar({
  deals,
  stages,
}: {
  deals: DealDto[];
  stages: StageDto[];
}) {
  const open = deals.filter((deal) => deal.status === "open");
  const won = deals.filter((deal) => deal.status === "won").length;
  const totalCents = open.reduce((sum, deal) => sum + deal.amountCents, 0);
  const currency = open[0]?.currency ?? "USD";

  let formatted = "—";
  if (open.length > 0) {
    try {
      formatted = new Intl.NumberFormat(undefined, {
        currency,
        maximumFractionDigits: 0,
        style: "currency",
      }).format(totalCents / 100);
    } catch {
      formatted = `${Math.round(totalCents / 100)} ${currency}`;
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-card border border-border bg-surface p-4">
        <p className="text-[12px] text-muted">Open deals</p>
        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text">
          {open.length}
        </p>
        <p className="mt-1 text-[12px] text-subtle">{stages.length} stages on board</p>
      </article>
      <article className="rounded-card border border-border bg-surface p-4">
        <p className="text-[12px] text-muted">Open pipeline total</p>
        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text">
          {formatted}
        </p>
        <p className="mt-1 text-[12px] text-subtle">Listed deal amounts</p>
      </article>
      <article className="rounded-card border border-border bg-surface p-4">
        <p className="text-[12px] text-muted">Won</p>
        <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text">
          {won}
        </p>
        <p className="mt-1 text-[12px] text-subtle">Marked won in workspace</p>
      </article>
    </div>
  );
}

function DealStageColumn({
  deals,
  disabled,
  stage,
  updateDeal,
}: {
  deals: DealDto[];
  disabled: boolean;
  stage: StageDto;
  updateDeal?: AppActions["updateDeal"];
}) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.id });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-modal border bg-surface transition duration-150 ${
        isOver ? "border-border-strong ring-2 ring-ring" : "border-border"
      }`}
    >
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text">{stage.name}</h3>
          <span className="text-[12px] text-muted">{deals.length} deals</span>
        </div>
        <p className="mt-1 text-[13px] text-muted">{stage.probability}% probability</p>
      </div>
      <div className="min-h-40 space-y-2 p-3">
        {deals.length ? (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              disabled={disabled}
              updateDeal={updateDeal}
            />
          ))
        ) : (
          <div className="rounded-card border border-dashed border-border bg-bg p-4 text-[13px] text-muted">
            Drop deals here
          </div>
        )}
      </div>
    </section>
  );
}

function DealCard({
  deal,
  disabled,
  updateDeal,
}: {
  deal: DealDto;
  disabled: boolean;
  updateDeal?: AppActions["updateDeal"];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(deal.status);
  const [lostReasonDraft, setLostReasonDraft] = useState(deal.lostReason ?? "");

  useEffect(() => {
    setStatus(deal.status);
    setLostReasonDraft(deal.lostReason ?? "");
  }, [deal.id, deal.status, deal.lostReason]);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: deal.id,
    disabled,
  });

  async function persistStatus(next: DealDto["status"]) {
    if (!updateDeal) {
      return;
    }
    const prev = status;
    setStatus(next);
    const payload: DealUpdateInput = {
      id: deal.id,
      status: next,
      lostReason: next === "lost" ? (lostReasonDraft.trim() ? lostReasonDraft.trim() : null) : null,
    };
    const result = await updateDeal(payload);
    if (!result.ok) {
      setStatus(prev);
      return;
    }
    router.refresh();
  }

  async function persistLostReason() {
    if (!updateDeal || status !== "lost") {
      return;
    }
    const trimmed = lostReasonDraft.trim();
    const next = trimmed.length > 0 ? trimmed : null;
    if (next === (deal.lostReason ?? null)) {
      return;
    }
    const result = await updateDeal({ id: deal.id, lostReason: next });
    if (result.ok) {
      router.refresh();
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      className="rounded-card border border-border bg-bg p-3 text-left transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover"
    >
      <AutoSaveInput
        value={deal.title}
        className="w-full bg-transparent text-[13px] font-medium text-text outline-none"
        onSave={async (title) => {
          if (!updateDeal || title === deal.title) {
            return;
          }
          const result = await updateDeal({ id: deal.id, title });
          if (result.ok) {
            router.refresh();
          }
        }}
      />
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] text-muted">Expected value</span>
        <span className="text-[13px] font-semibold text-text">
          {formatMoney(deal.amountCents)}
        </span>
      </div>
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="mt-3 space-y-2 border-t border-border pt-3"
      >
        <label className="block text-[11px] font-medium text-muted" htmlFor={`deal-status-${deal.id}`}>
          Outcome
        </label>
        <select
          id={`deal-status-${deal.id}`}
          value={status}
          disabled={disabled || !updateDeal}
          onChange={(e) => {
            void persistStatus(e.target.value as DealDto["status"]);
          }}
          className="h-9 w-full rounded-input border border-border bg-surface px-2 text-[12px] text-text outline-none focus:border-border-strong focus:ring-2 focus:ring-ring"
        >
          <option value="open">Open</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="archived">Archived</option>
        </select>
        {status === "lost" ? (
          <input
            type="text"
            value={lostReasonDraft}
            disabled={disabled || !updateDeal}
            onChange={(e) => setLostReasonDraft(e.target.value)}
            onBlur={() => void persistLostReason()}
            placeholder="Lost reason (exports to reports)"
            aria-label="Lost reason"
            className="h-9 w-full rounded-input border border-border bg-surface px-2 text-[12px] text-text outline-none placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
          />
        ) : null}
      </div>
    </div>
  );
}

function TasksView({
  actions,
  tasks = [],
}: {
  actions?: AppActions;
  tasks?: TaskDto[];
}) {
  const router = useRouter();
  const openTasks = tasks.filter((task) => !task.doneAt);
  const doneTasks = tasks.filter((task) => task.doneAt);
  const groups = tasks.length
    ? [
        { label: "Open", items: openTasks },
        { label: "Completed", items: doneTasks },
      ]
    : taskGroups.map((group) => ({
        label: group.label,
        items: group.items.map((title) => ({ id: title, title }) as TaskDto),
      }));

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <article
            key={group.label}
            className="rounded-modal border border-border bg-surface"
          >
            <div className="border-b border-border p-5">
              <h2 className="text-lg font-semibold tracking-[-0.03em] text-text">
                {group.label}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {group.items.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={async () => {
                    if (!actions?.updateTask || !tasks.length) {
                      return;
                    }
                    const result = await actions.updateTask({
                      id: item.id,
                      done: !item.doneAt,
                    });
                    if (result.ok) {
                      router.refresh();
                    }
                  }}
                  className="flex w-full items-center gap-3 p-4 text-left transition duration-150 ease-out hover:bg-surface-hover"
                >
                  {item.doneAt || index === 0 ? (
                    <Clock3 className="h-4 w-4 text-accent" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 text-subtle" aria-hidden />
                  )}
                  <AutoSaveInput
                    value={item.title}
                    className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-text outline-none"
                    onSave={async (title) => {
                      if (
                        !actions?.updateTask ||
                        !tasks.length ||
                        title === item.title
                      ) {
                        return;
                      }
                      const result = await actions.updateTask({ id: item.id, title });
                      if (result.ok) {
                        router.refresh();
                      }
                    }}
                  />
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <article className="rounded-modal border border-border bg-surface p-5">
        <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
        <h3 className="mt-4 font-semibold text-text">Tasks overview</h3>
        <p className="mt-2 text-[13px] text-muted">
          Show due work first; grouping by contact or deal is optional.
        </p>
      </article>
    </div>
  );
}

function CalendarView({ slots = [] }: { slots?: { startsAt: Date; endsAt: Date }[] }) {
  const groupedSlots = slots.reduce<Record<string, { startsAt: Date; endsAt: Date }[]>>(
    (acc, slot) => {
      const key = new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
        new Date(slot.startsAt),
      );
      acc[key] = [...(acc[key] ?? []), slot];
      return acc;
    },
    {},
  );
  const hasRealSlots = slots.length > 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <article className="rounded-modal border border-border bg-surface">
        <div className="border-b border-border p-5">
          <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
            Week view
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
            Availability overview
          </h2>
        </div>
        <div className="grid gap-px bg-border p-px md:grid-cols-5">
          {weekSlots.map(([day, first, second]) => (
            <div key={day} className="min-h-[220px] bg-bg p-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-subtle">
                {day}
              </p>
              <div className="mt-4 space-y-2">
                {hasRealSlots
                  ? (groupedSlots[day] ?? [])
                      .slice(0, 4)
                      .map((slot) => (
                        <CalendarPill
                          key={new Date(slot.startsAt).toISOString()}
                          label={`${formatTime(slot.startsAt)} - ${formatTime(slot.endsAt)}`}
                        />
                      ))
                  : [
                      <CalendarPill key={first} label={first} />,
                      <CalendarPill key={second} label={second} subtle />,
                    ]}
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-modal border border-border bg-surface p-5">
        <CalendarClock className="h-5 w-5 text-accent" aria-hidden />
        <h3 className="mt-4 font-semibold text-text">Scheduling links</h3>
        <p className="mt-2 text-[13px] text-muted">
          Share your link invitees choose a slot and confirmed bookings sync to Calendar and Timeline.
        </p>
        <Link
          href="/m/aftaab"
          className="mt-5 inline-flex items-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-text transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover"
        >
          Open sample link
          <ArrowUpRight className="h-4 w-4 text-subtle" aria-hidden />
        </Link>
      </article>
    </div>
  );
}

function CalendarPill({ label, subtle = false }: { label: string; subtle?: boolean }) {
  return (
    <div
      className={`rounded-card border p-3 text-[13px] ${
        subtle
          ? "border-border bg-surface text-muted"
          : "border-border-strong bg-surface-hover font-medium text-text"
      }`}
    >
      {label}
    </div>
  );
}

function AutomationsView() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-4">
        <article className="rounded-modal border border-border bg-surface p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
                Automations
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
                Automations
              </h2>
              <p className="mt-2 max-w-2xl text-[13px] text-muted">
                Background jobs and integrations ship with the app bundle.
              </p>
            </div>
            <button
              type="button"
              className="inline-flex w-fit items-center gap-2 rounded-input bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg transition duration-150 ease-out hover:bg-accent-hover"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              Reload automations
            </button>
          </div>
        </article>

        <div className="grid gap-4 2xl:grid-cols-2">
          <article className="rounded-modal border border-border bg-surface">
            <div className="border-b border-border p-5">
              <div className="flex items-center gap-3">
                <Code2 className="h-4 w-4 text-accent" aria-hidden />
                <h3 className="font-semibold text-text">Available triggers</h3>
              </div>
            </div>
            <div className="grid gap-px bg-border p-px md:grid-cols-2">
              {automationTriggers.map((trigger) => (
                <div key={trigger} className="bg-bg p-4">
                  <p className="font-mono text-[12px] text-text">{trigger}</p>
                  <p className="mt-1 text-[12px] text-muted">Registered hook</p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-modal border border-border bg-surface">
            <div className="border-b border-border p-5">
              <div className="flex items-center gap-3">
                <Webhook className="h-4 w-4 text-accent" aria-hidden />
                <h3 className="font-semibold text-text">SDK-shaped helpers</h3>
              </div>
            </div>
            <div className="grid gap-px bg-border p-px md:grid-cols-2">
              {automationHelpers.map((helper) => (
                <div key={helper} className="bg-bg p-4">
                  <p className="font-mono text-[12px] text-text">{helper}</p>
                  <p className="mt-1 text-[12px] text-muted">Registered helper</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <aside className="space-y-4">
        <article className="rounded-modal border border-border bg-surface p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[12px] text-muted">Source</p>
            <p className="mt-1 font-mono text-[13px] text-text">registry</p>
            </div>
            <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] text-muted">
              Loaded
            </span>
          </div>
          <div className="mt-5 rounded-card border border-border bg-bg p-3">
            <p className="text-[12px] text-muted">Source hash</p>
            <p className="mt-1 font-mono text-[12px] text-text">a42f9c7e</p>
          </div>
          <p className="mt-4 text-[13px] text-muted">
            Restart the server after automation code changes pick up edits.
          </p>
        </article>

        <article className="rounded-modal border border-border bg-surface p-5">
          <ShieldCheck className="h-5 w-5 text-success" aria-hidden />
          <h3 className="mt-4 font-semibold text-text">Safe updates</h3>
          <p className="mt-2 text-[13px] text-muted">
            Automations reuse the same services as the UI so audit logs stay aligned.
          </p>
        </article>
      </aside>
    </div>
  );
}

function ReportsView({ reportExport }: { reportExport?: ShellReportExport }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<ReportId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const downloadCsv = useCallback((filename: string, csv: string) => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  const runExport = useCallback(
    (reportId: ReportId) => {
      if (!reportExport) {
        setError("Database is unavailable; connect Postgres to export.");
        return;
      }

      setError(null);
      setBusyId(reportId);
      startTransition(() => {
        void (async () => {
          const result = await reportExport.onExport(reportId);
          setBusyId(null);
          if (!result.ok) {
            setError(result.message);
            return;
          }

          downloadCsv(result.filename, result.csv);
          setError(null);
          router.refresh();
        })();
      });
    },
    [downloadCsv, reportExport, router],
  );

  const firstReportId = REPORT_DEFINITIONS[0]?.id;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-4">
        <article className="rounded-modal border border-border bg-surface p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
                Reports
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
                Reports & exports
              </h2>
              <p className="mt-2 max-w-2xl text-[13px] text-muted">
                Download CSV snapshots; each download is logged below.
              </p>
              {error ? (
                <p className="mt-3 rounded-card border border-border bg-bg px-3 py-2 text-[12px] text-error">
                  {error}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={!firstReportId || busyId !== null || !reportExport}
              onClick={() => firstReportId && runExport(firstReportId)}
              className="inline-flex w-fit items-center gap-2 rounded-input bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg transition duration-150 ease-out hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busyId !== null ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Download className="h-4 w-4" aria-hidden />
              )}
              Export primary report (CSV)
            </button>
          </div>
        </article>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {REPORT_DEFINITIONS.map((report) => {
            const busy = busyId === report.id;
            return (
              <article
                key={report.id}
                className="rounded-card border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <FileBarChart className="h-4 w-4 text-accent" aria-hidden />
                  <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] text-muted">
                    CSV
                  </span>
                </div>
                <p className="mt-4 text-[13px] font-semibold text-text">{report.title}</p>
                <p className="mt-1 min-h-10 text-[12px] text-muted">{report.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="rounded-full bg-bg px-2 py-0.5 font-mono text-[11px] text-subtle">
                    {report.id}
                  </span>
                  <button
                    type="button"
                    disabled={busy || busyId !== null || !reportExport}
                    onClick={() => runExport(report.id)}
                    className="inline-flex items-center gap-1 rounded-input border border-border bg-bg px-2 py-1 text-[12px] font-medium text-text transition duration-150 ease-out hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Download className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Download
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="space-y-4">
        <article className="rounded-modal border border-border bg-surface p-5">
          <TrendingUp className="h-5 w-5 text-accent" aria-hidden />
          <h3 className="mt-4 font-semibold text-text">Recent export jobs</h3>
          <div className="mt-4 space-y-3">
            {reportExport?.jobs.length ? (
              reportExport.jobs.map((job) => (
                <div
                  key={job.id}
                  className="rounded-card border border-border bg-bg px-3 py-2 text-[12px]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-text">{job.reportId}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        job.status === "completed"
                          ? "bg-success/10 text-success"
                          : job.status === "failed"
                            ? "bg-error/10 text-error"
                            : "bg-accent/15 text-accent"
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">
                    {formatDateTime(job.createdAt)}{" "}
                    {job.rowCount !== null ? `· ${job.rowCount} rows` : ""}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-card border border-dashed border-border bg-bg px-3 py-6 text-center">
                <p className="text-[13px] text-muted">
                  No exports yet. Run a download to see status and row counts here.
                </p>
              </div>
            )}
          </div>
        </article>

        <article className="rounded-modal border border-border bg-surface p-5">
          <Filter className="h-5 w-5 text-accent" aria-hidden />
          <h3 className="mt-4 font-semibold text-text">Exports</h3>
          <p className="mt-2 text-[13px] text-muted">
            Files generate on demand. If a run fails fix the issue and retry your history stays above.
          </p>
        </article>
      </aside>
    </div>
  );
}

function TimelineView({
  actions,
  events = [],
  notes = [],
}: {
  actions?: AppActions;
  events?: EventDto[];
  notes?: NoteDto[];
}) {
  const router = useRouter();
  const timelineItems = events.length ? events : [];

  return (
    <article className="rounded-modal border border-border bg-surface">
      <div className="border-b border-border p-5">
        <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
          Timeline
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
          Events
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] text-muted">
          Chronological workspace events used on contact timelines, activity feeds, and
          audit tooling.
        </p>
      </div>
      <div className="divide-y divide-border">
        {timelineItems.length
          ? timelineItems.map((event) => {
              const summary =
                typeof event.payload.summary === "string"
                  ? event.payload.summary
                  : event.type;

              return (
                <div key={event.id} className="flex items-start gap-4 p-5">
                  <ContactRound className="mt-0.5 h-4 w-4 text-accent" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-text">{summary}</p>
                    <p className="mt-1 text-[13px] text-muted">
                      {event.type} - {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                  <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] text-muted">
                    Event
                  </span>
                </div>
              );
            })
          : viewListItems.inbox.map((event) => (
              <div key={event.title} className="flex items-start gap-4 p-5">
                <ContactRound className="mt-0.5 h-4 w-4 text-accent" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-text">{event.title}</p>
                  <p className="mt-1 text-[13px] text-muted">{event.meta}</p>
                </div>
                <span className="rounded-full border border-border bg-bg px-2 py-0.5 text-[11px] text-muted">
                  {event.marker}
                </span>
              </div>
            ))}
      </div>
      {notes.length ? (
        <div className="border-t border-border p-5">
          <h3 className="font-semibold text-text">Autosaved notes</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {notes.map((note) => (
              <article
                key={note.id}
                className="rounded-card border border-border bg-bg p-3"
              >
                <AutoSaveInput
                  value={note.title ?? "Untitled note"}
                  className="w-full bg-transparent text-[13px] font-semibold text-text outline-none"
                  onSave={async (title) => {
                    if (!actions?.updateNote || title === note.title) {
                      return;
                    }
                    const result = await actions.updateNote({ id: note.id, title });
                    if (result.ok) {
                      router.refresh();
                    }
                  }}
                />
                <p className="mt-2 whitespace-pre-wrap text-[12px] text-muted">
                  {note.bodyMd}
                </p>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SettingsView() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-4">
        <article className="rounded-modal border border-border bg-surface">
          <div className="border-b border-border p-5">
            <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
              Setup
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
              Workspace configuration
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] text-muted">
              Core installs need PostgreSQL only; other services are additive.
            </p>
          </div>

          <div className="grid gap-px bg-border p-px md:grid-cols-2">
            {setupSections.map((section) => {
              const Icon = section.icon;

              return (
                <div key={section.title} className="bg-bg p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-card bg-surface-hover text-accent">
                      <Icon className="h-4 w-4" aria-hidden />
                    </div>
                    <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
                      {section.status}
                    </span>
                  </div>
                  <h3 className="mt-4 text-[13px] font-semibold text-text">
                    {section.title}
                  </h3>
                  <p className="mt-1 text-[12px] text-muted">{section.description}</p>
                </div>
              );
            })}
          </div>
        </article>

        <article className="rounded-modal border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-accent" aria-hidden />
            <h3 className="font-semibold text-text">Install footprint</h3>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {["Next.js app", "PostgreSQL", "Caddy"].map((service) => (
              <div
                key={service}
                className="rounded-card border border-border bg-bg p-3"
              >
                <p className="text-[13px] font-medium text-text">{service}</p>
                <p className="mt-1 text-[12px] text-muted">Core service</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <aside className="space-y-4">
        <article className="rounded-modal border border-border bg-surface p-5">
          <Bot className="h-5 w-5 text-accent" aria-hidden />
          <h3 className="mt-4 font-semibold text-text">AI mode</h3>
          <p className="mt-2 text-[13px] text-muted">
            Default off. Turning on AI requires an explicit workspace choice and should
            log model calls once implemented.
          </p>
          <div className="mt-4 space-y-2">
            {["Off", "Local", "BYO key"].map((mode, index) => (
              <button
                type="button"
                key={mode}
                className={`flex w-full items-center justify-between rounded-card border p-3 text-left transition duration-150 ease-out hover:border-border-strong ${
                  index === 0
                    ? "border-border-strong bg-bg"
                    : "border-border bg-surface"
                }`}
              >
                <span className="text-[13px] font-medium text-text">{mode}</span>
                <span className="text-[12px] text-muted">
                  {index === 0 ? "Current" : "Configure"}
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-modal border border-border bg-surface p-5">
          <ShieldCheck className="h-5 w-5 text-success" aria-hidden />
          <h3 className="mt-4 font-semibold text-text">Security posture</h3>
          <p className="mt-2 text-[13px] text-muted">
            Tokens, SSO, encryption, and alerts will appear here when available.
          </p>
        </article>
      </aside>
    </div>
  );
}

function AutoSaveInput({
  className,
  onSave,
  value,
}: {
  className: string;
  onSave: (value: string) => Promise<void>;
  value: string;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (draft === value) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void onSave(draft);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [draft, onSave, value]);

  return (
    <input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onPointerDown={(event) => event.stopPropagation()}
      className={className}
    />
  );
}

function MetricGrid({
  metrics,
}: {
  metrics: readonly { label: string; value: string; detail: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className="rounded-card border border-border bg-surface p-4"
        >
          <p className="text-[12px] text-muted">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text">
            {metric.value}
          </p>
          <p className="mt-1 text-[12px] text-subtle">{metric.detail}</p>
        </article>
      ))}
    </div>
  );
}

function RelationshipCard({ description }: { description: string }) {
  return (
    <article className="rounded-modal border border-border bg-surface">
      <div className="border-b border-border p-5">
        <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
          Typical journey
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
          From first touch to close
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] text-muted">{description}</p>
      </div>

      <div className="p-5">
        <div className="grid gap-3 md:grid-cols-4">
          {relationshipPath.map((step, index) => {
            const Marker = getTrailMarker(index);
            return (
              <div
                key={step}
                className="relative rounded-card border border-border bg-bg p-4"
              >
                {index < relationshipPath.length - 1 ? (
                  <div className="absolute left-[calc(100%-4px)] top-1/2 hidden h-px w-4 bg-border md:block" />
                ) : null}
                <div className="flex h-9 w-9 items-center justify-center rounded-card bg-surface-hover text-accent">
                  <Marker className="h-4 w-4" aria-hidden />
                </div>
                <p className="mt-4 text-[13px] font-medium text-text">{step}</p>
                <p className="mt-1 text-[12px] text-muted">Stage {index + 1}</p>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function DashboardSideCards({
  pipelinePreview,
}: {
  pipelinePreview: DashboardSummary["pipelineStages"];
}) {
  return (
    <aside className="space-y-4">
      <article className="rounded-modal border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
              Shortcuts
            </p>
            <h3 className="mt-1 font-semibold text-text">Command palette</h3>
          </div>
          <Search className="h-5 w-5 text-accent" aria-hidden />
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Press Cmd K or / to jump between screens or open create actions.
        </p>
      </article>

      <article className="rounded-modal border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text">Pipeline by stage</h3>
          <Link
            href="/deals"
            className="text-[13px] font-medium text-accent transition duration-150 ease-out hover:text-accent-hover"
          >
            View deals
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {pipelinePreview.map((stage) => (
            <div key={stage.label}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="text-muted">{stage.label}</span>
                <span className="font-medium text-text">{stage.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{
                    width: `${Math.min(stage.count > 0 ? 18 + stage.count * 14 : 8, 92)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>
    </aside>
  );
}

function ActivityTypeGrid({
  items,
}: {
  items: DashboardSummary["activityCards"];
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {items.map((activity) => (
        <article
          key={activity.label}
          className="rounded-card border border-border bg-surface p-4"
        >
          <p className="text-[13px] font-medium text-text">{activity.label}</p>
          <p className="mt-1 text-[12px] text-muted">{activity.detail}</p>
        </article>
      ))}
    </section>
  );
}
