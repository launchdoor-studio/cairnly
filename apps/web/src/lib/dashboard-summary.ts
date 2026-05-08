import type {
  ContactDto,
  DealDto,
  EventDto,
  StageDto,
  TaskDto,
} from "@cairnly/core";

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
};

export type DashboardListItem = {
  id?: string;
  title: string;
  meta: string;
  marker?: string;
};

export type DashboardPipelineStage = {
  label: string;
  value: string;
  count: number;
};

export type DashboardActivityCard = {
  label: string;
  detail: string;
};

export type DashboardSummary = {
  metrics: DashboardMetric[];
  homeListPreview: DashboardListItem[];
  pipelineStages: DashboardPipelineStage[];
  activityCards: DashboardActivityCard[];
};

function startOfUtcWeek(reference: Date) {
  const d = new Date(
    Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()),
  );
  const day = d.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysFromMonday);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function isUtcCalendarDay(date: Date, reference: Date) {
  return (
    date.getUTCFullYear() === reference.getUTCFullYear() &&
    date.getUTCMonth() === reference.getUTCMonth() &&
    date.getUTCDate() === reference.getUTCDate()
  );
}

function formatMoney(amountCents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      currency,
      maximumFractionDigits: 0,
      style: "currency",
    }).format(amountCents / 100);
  } catch {
    return `${Math.round(amountCents / 100)} ${currency}`;
  }
}

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function humanizeEventType(type: string) {
  return type.replaceAll("_", " ");
}

function eventToHomeItem(event: EventDto): DashboardListItem {
  const summary =
    typeof event.payload.summary === "string" ? event.payload.summary : event.type;

  return {
    id: event.id,
    title: summary,
    meta: `${humanizeEventType(event.type)} · ${formatDateTime(event.createdAt)}`,
    marker: "Activity",
  };
}

function buildActivityCards(events: EventDto[]): DashboardActivityCard[] {
  const types = [...new Set(events.map((event) => event.type))].slice(0, 3);
  if (!types.length) {
    return [
      {
        label: "Workspace activity",
        detail: "Timeline entries will show here as your team captures work.",
      },
    ];
  }

  return types.map((type) => ({
    label: humanizeEventType(type),
    detail: "Also visible on linked contact timelines.",
  }));
}

export function buildDashboardSummary(input: {
  contacts: ContactDto[];
  deals: DealDto[];
  stages: StageDto[];
  tasks: TaskDto[];
  events: EventDto[];
}): DashboardSummary {
  const now = new Date();
  const weekStart = startOfUtcWeek(now);

  const newThisWeek = input.contacts.filter(
    (contact) => new Date(contact.createdAt) >= weekStart,
  ).length;

  const openDeals = input.deals.filter((deal) => deal.status === "open");
  const openDealCount = openDeals.length;

  const stageProb = new Map(input.stages.map((stage) => [stage.id, stage.probability]));
  let weightedCents = 0;
  let primaryCurrency = "USD";

  for (const deal of openDeals) {
    const probability = stageProb.get(deal.stageId) ?? 0;
    weightedCents += deal.amountCents * (probability / 100);
    primaryCurrency = deal.currency;
  }

  const dueToday = input.tasks.filter(
    (task) =>
      task.doneAt == null &&
      task.dueAt != null &&
      isUtcCalendarDay(new Date(task.dueAt), now),
  ).length;

  const stageRollup = new Map<
    string,
    { label: string; totalCents: number; count: number; currency: string }
  >();

  for (const deal of openDeals) {
    const stage = input.stages.find((row) => row.id === deal.stageId);
    const label = stage?.name ?? "Unknown stage";
    const row = stageRollup.get(label) ?? {
      label,
      totalCents: 0,
      count: 0,
      currency: deal.currency,
    };
    row.totalCents += deal.amountCents;
    row.count += 1;
    row.currency = deal.currency;
    stageRollup.set(label, row);
  }

  const pipelineStages: DashboardPipelineStage[] = [...stageRollup.values()]
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 4)
    .map((row) => ({
      label: row.label,
      value: formatMoney(row.totalCents, row.currency),
      count: row.count,
    }));

  const sortedEvents = [...input.events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const homeListPreview =
    sortedEvents.length > 0
      ? sortedEvents.slice(0, 12).map(eventToHomeItem)
      : [
          {
            title: "No recent activity yet",
            meta: "Create a contact or log an event from Timeline.",
          },
        ];

  return {
    metrics: [
      {
        label: "Weighted pipeline",
        value:
          openDealCount > 0
            ? formatMoney(Math.round(weightedCents), primaryCurrency)
            : "—",
        detail: "Open deals × stage probability",
      },
      {
        label: "New contacts",
        value: String(newThisWeek),
        detail: "Created this week",
      },
      {
        label: "Due today",
        value: String(dueToday),
        detail: "Open tasks",
      },
      {
        label: "Open deals",
        value: String(openDealCount),
        detail: "Active in pipeline",
      },
    ],
    homeListPreview,
    pipelineStages:
      pipelineStages.length > 0
        ? pipelineStages
        : [
            {
              label: "No open deals",
              value: "—",
              count: 0,
            },
          ],
    activityCards: buildActivityCards(sortedEvents),
  };
}
