"use client";

import {
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  ContactRound,
  Mail,
  Search,
} from "lucide-react";
import { motion } from "motion/react";

import {
  type ActiveView,
  activityTypes,
  getTrailMarker,
  type NavItem,
  pipelineStages,
  recentEvents,
  relationshipPath,
  topLevelMetrics,
} from "@/lib/navigation";

type PreviewListItem = {
  title: string;
  meta: string;
  marker?: string;
};

const viewListItems: Record<ActiveView, PreviewListItem[]> = {
  home: recentEvents.map((event) => ({
    title: event.title,
    meta: event.meta,
  })),
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
    body: "Confirmed they want self-hosted CRM ownership and scheduling links.",
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

export function ListPane({
  activeItem,
  activeView,
  onPreviewOpen,
}: {
  activeItem: NavItem;
  activeView: ActiveView;
  onPreviewOpen?: () => void;
}) {
  const items = viewListItems[activeView];

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
              Current path
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
              key={item.title}
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
  activeItem,
  activeView,
}: {
  activeItem: NavItem;
  activeView: ActiveView;
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
        {activeView === "home" ? <DashboardView activeItem={activeItem} /> : null}
        {activeView === "contacts" ? <ContactView /> : null}
        {activeView === "deals" ? <DealsView /> : null}
        {activeView === "tasks" ? <TasksView /> : null}
        {activeView === "calendar" ? <CalendarView /> : null}
        {activeView === "inbox" ? <TimelineView /> : null}
      </motion.div>
    </section>
  );
}

function ViewHint({ activeView }: { activeView: ActiveView }) {
  const hints: Record<ActiveView, string> = {
    home: "One opinionated dashboard, not a builder. The panels stay calm and useful.",
    contacts:
      "The contact record is the inbox: fields, notes, email, meetings, and audit.",
    deals: "Kanban first, table later. Stage movement must write timeline events.",
    tasks:
      "Tasks are always relationship-aware, linked to a contact or deal when possible.",
    calendar:
      "Scheduling links are a first-class v1 surface, not a settings afterthought.",
    inbox:
      "This stream is the event log that powers both audit history and contact timelines.",
  };

  return (
    <div className="rounded-card border border-border bg-bg p-4">
      <p className="text-[13px] font-medium text-text">Spec alignment</p>
      <p className="mt-1 text-[13px] text-muted">{hints[activeView]}</p>
    </div>
  );
}

function DashboardView({ activeItem }: { activeItem: NavItem }) {
  return (
    <>
      <MetricGrid />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.85fr)]">
        <RelationshipCard description={activeItem.description} />
        <DashboardSideCards />
      </div>
      <ActivityTypeGrid />
    </>
  );
}

function ContactView() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_360px]">
      <article className="rounded-modal border border-border bg-surface">
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
              Contact timeline
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
              Mira Patel
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] text-muted">
              A single record for email, meetings, notes, form submissions, tasks, and
              deal activity.
            </p>
          </div>
          <span className="rounded-full bg-accent px-2.5 py-1 text-[12px] font-medium text-accent-fg">
            Hot
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
          <h3 className="font-semibold text-text">Fields</h3>
          <div className="mt-4 space-y-3">
            {contactFields.map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-[12px] text-muted">{label}</span>
                <span className="truncate text-[13px] font-medium text-text">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </article>
        <article className="rounded-modal border border-border bg-surface p-5">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-accent" aria-hidden />
            <h3 className="font-semibold text-text">Smart compose</h3>
          </div>
          <p className="mt-3 text-[13px] text-muted">
            AI stays hidden until the workspace explicitly chooses Local, BYO key, or
            Off.
          </p>
        </article>
      </aside>
    </div>
  );
}

function DealsView() {
  return (
    <div className="space-y-6">
      <MetricGrid />
      <div className="grid gap-4 xl:grid-cols-4">
        {pipelineStages.map((stage) => (
          <section
            key={stage.label}
            className="rounded-modal border border-border bg-surface"
          >
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text">{stage.label}</h3>
                <span className="text-[12px] text-muted">{stage.count} deals</span>
              </div>
              <p className="mt-1 text-[13px] text-muted">{stage.value}</p>
            </div>
            <div className="space-y-2 p-3">
              <DealCard title={`${stage.label} opportunity`} value={stage.value} />
              <DealCard title="Scheduling link follow-up" value="$4.2k" muted />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function DealCard({
  title,
  value,
  muted = false,
}: {
  title: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      className="w-full rounded-card border border-border bg-bg p-3 text-left transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover"
    >
      <p className="text-[13px] font-medium text-text">{title}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className={muted ? "text-[12px] text-subtle" : "text-[12px] text-muted"}>
          Expected value
        </span>
        <span className="text-[13px] font-semibold text-text">{value}</span>
      </div>
    </button>
  );
}

function TasksView() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="grid gap-4 md:grid-cols-2">
        {taskGroups.map((group) => (
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
                  key={item}
                  className="flex w-full items-center gap-3 p-4 text-left transition duration-150 ease-out hover:bg-surface-hover"
                >
                  {index === 0 ? (
                    <Clock3 className="h-4 w-4 text-accent" aria-hidden />
                  ) : (
                    <Circle className="h-4 w-4 text-subtle" aria-hidden />
                  )}
                  <span className="text-[13px] font-medium text-text">{item}</span>
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <article className="rounded-modal border border-border bg-surface p-5">
        <CheckCircle2 className="h-5 w-5 text-success" aria-hidden />
        <h3 className="mt-4 font-semibold text-text">Task principle</h3>
        <p className="mt-2 text-[13px] text-muted">
          The first task UI should make follow-up obvious without becoming a project
          management app.
        </p>
      </article>
    </div>
  );
}

function CalendarView() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <article className="rounded-modal border border-border bg-surface">
        <div className="border-b border-border p-5">
          <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
            Week view
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
            Availability at a glance
          </h2>
        </div>
        <div className="grid gap-px bg-border p-px md:grid-cols-5">
          {weekSlots.map(([day, first, second]) => (
            <div key={day} className="min-h-[220px] bg-bg p-4">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-subtle">
                {day}
              </p>
              <div className="mt-4 space-y-2">
                <CalendarPill label={first} />
                <CalendarPill label={second} subtle />
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-modal border border-border bg-surface p-5">
        <CalendarClock className="h-5 w-5 text-accent" aria-hidden />
        <h3 className="mt-4 font-semibold text-text">Scheduling links</h3>
        <p className="mt-2 text-[13px] text-muted">
          Public booking pages are a v1 must-have and should feel native to the CRM,
          with automatic contact and timeline creation after booking.
        </p>
        <button
          type="button"
          className="mt-5 inline-flex items-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-text transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover"
        >
          Preview /m/aftaab
          <ArrowUpRight className="h-4 w-4 text-subtle" aria-hidden />
        </button>
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

function TimelineView() {
  return (
    <article className="rounded-modal border border-border bg-surface">
      <div className="border-b border-border p-5">
        <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
          Unified timeline
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
          One event stream, many surfaces.
        </h2>
        <p className="mt-2 max-w-2xl text-[13px] text-muted">
          The same append-only events power contact history, audit log, dashboard
          activity, and future AI context.
        </p>
      </div>
      <div className="divide-y divide-border">
        {viewListItems.inbox.map((event) => (
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
    </article>
  );
}

function MetricGrid() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {topLevelMetrics.map((metric) => (
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
          Relationship cairn
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
          Every interaction stacks into one legible path.
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
                <p className="mt-1 text-[12px] text-muted">Stone {index + 1}</p>
              </div>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function DashboardSideCards() {
  return (
    <aside className="space-y-4">
      <article className="rounded-modal border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
              Command layer
            </p>
            <h3 className="mt-1 font-semibold text-text">Cmd K first</h3>
          </div>
          <Search className="h-5 w-5 text-accent" aria-hidden />
        </div>
        <p className="mt-3 text-[13px] text-muted">
          Search, create, navigation, and future AI actions should all enter through one
          fast command surface.
        </p>
      </article>

      <article className="rounded-modal border border-border bg-surface p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text">Pipeline preview</h3>
          <button
            type="button"
            className="text-[13px] font-medium text-accent transition duration-150 ease-out hover:text-accent-hover"
          >
            View deals
          </button>
        </div>
        <div className="mt-4 space-y-3">
          {pipelineStages.map((stage) => (
            <div key={stage.label}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="text-muted">{stage.label}</span>
                <span className="font-medium text-text">{stage.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-bg">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(stage.count * 18, 86)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </article>
    </aside>
  );
}

function ActivityTypeGrid() {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {activityTypes.map((activity) => (
        <article
          key={activity.label}
          className="rounded-card border border-border bg-surface p-4"
        >
          <p className="text-[13px] font-medium text-text">{activity.label}</p>
          <p className="mt-1 text-[12px] text-muted">
            Timeline events double as audit history, keeping the CRM small and
            explainable.
          </p>
        </article>
      ))}
    </section>
  );
}
