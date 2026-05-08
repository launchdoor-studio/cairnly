import {
  type ReportExportJobDto,
  type ReportId,
  reportIdSchema,
} from "@cairnly/core";
import { contacts, deals, events, pipelines, stages, users } from "@cairnly/db";
import type { Db } from "@cairnly/db";
import { and, count, eq, inArray, isNull, sql, sum } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

import type { ExportJobRepository, ExportJobRow } from "../repositories/export-job-repository";

function csvEscape(text: string): string {
  if (/[\r\n",]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function encodeCsv(
  headers: string[],
  data: (string | number | bigint | null | undefined)[][],
): { csv: string; rowCount: number } {
  const head = headers.map(csvEscape).join(",");
  const body = data.map((row) => row.map((c) => csvEscape(String(c ?? ""))).join(",")).join("\n");
  return {
    csv: body.length ? `${head}\n${body}` : head,
    rowCount: data.length,
  };
}

export function toReportExportJobDto(row: ExportJobRow): ReportExportJobDto {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    reportId: reportIdSchema.parse(row.reportId),
    format: row.format === "csv" ? "csv" : "csv",
    status: row.status,
    rowCount: row.rowCount ?? null,
    errorMessage: row.errorMessage ?? null,
    createdAt: row.createdAt,
    completedAt: row.completedAt ?? null,
  };
}

async function pipelineByStageReport(db: Db, workspaceId: string) {
  const rows = await db
    .select({
      pipelineName: pipelines.name,
      stagePosition: stages.position,
      stageName: stages.name,
      stageProbability: stages.probability,
      dealCount: count(deals.id),
      totalAmountCents: sum(deals.amountCents),
      weightedForecastCents: sum(
        sql`${deals.amountCents} * ${stages.probability} / 100.0`,
      ),
    })
    .from(deals)
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .innerJoin(pipelines, eq(deals.pipelineId, pipelines.id))
    .where(
      and(
        eq(deals.workspaceId, workspaceId),
        isNull(deals.deletedAt),
        eq(deals.status, "open"),
      ),
    )
    .groupBy(
      pipelines.id,
      pipelines.name,
      stages.id,
      stages.name,
      stages.position,
      stages.probability,
    )
    .orderBy(pipelines.name, stages.position);

  const headers = [
    "pipeline_name",
    "stage_position",
    "stage_name",
    "stage_probability_pct",
    "open_deal_count",
    "total_amount_cents",
    "weighted_forecast_cents",
  ];

  const data = rows.map((r) => [
    r.pipelineName,
    r.stagePosition,
    r.stageName,
    r.stageProbability,
    Number(r.dealCount),
    r.totalAmountCents === null ? 0 : String(r.totalAmountCents),
    r.weightedForecastCents === null ? 0 : String(r.weightedForecastCents),
  ]);

  return encodeCsv(headers, data);
}

async function conversionFunnelReport(db: Db, workspaceId: string) {
  const rows = await db
    .select({
      pipelineName: pipelines.name,
      stagePosition: stages.position,
      stageName: stages.name,
      openDealCount: count(deals.id),
    })
    .from(deals)
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .innerJoin(pipelines, eq(deals.pipelineId, pipelines.id))
    .where(
      and(
        eq(deals.workspaceId, workspaceId),
        isNull(deals.deletedAt),
        eq(deals.status, "open"),
      ),
    )
    .groupBy(pipelines.id, pipelines.name, stages.id, stages.name, stages.position)
    .orderBy(pipelines.name, stages.position);

  const headers = ["pipeline_name", "stage_position", "stage_name", "open_deal_count"];
  const data = rows.map((r) => [
    r.pipelineName,
    r.stagePosition,
    r.stageName,
    Number(r.openDealCount),
  ]);

  return encodeCsv(headers, data);
}

async function winLossByReasonReport(db: Db, workspaceId: string) {
  const rows = await db
    .select({
      id: deals.id,
      title: deals.title,
      status: deals.status,
      lostReason: deals.lostReason,
      amountCents: deals.amountCents,
      currency: deals.currency,
      updatedAt: deals.updatedAt,
    })
    .from(deals)
    .where(
      and(
        eq(deals.workspaceId, workspaceId),
        isNull(deals.deletedAt),
        inArray(deals.status, ["won", "lost"]),
      ),
    )
    .orderBy(deals.updatedAt);

  const headers = [
    "deal_id",
    "title",
    "status",
    "lost_reason",
    "amount_cents",
    "currency",
    "updated_at",
  ];

  const data = rows.map((r) => [
    r.id,
    r.title,
    r.status,
    r.lostReason ?? "",
    String(r.amountCents),
    r.currency,
    r.updatedAt.toISOString(),
  ]);

  return encodeCsv(headers, data);
}

async function revenueByMonthReport(db: Db, workspaceId: string) {
  const monthTrunc = sql`date_trunc('month', ${deals.updatedAt})`;

  const rows = await db
    .select({
      month: sql<string>`to_char(${monthTrunc}, 'YYYY-MM')`,
      revenueCents: sum(deals.amountCents),
      dealCount: count(deals.id),
    })
    .from(deals)
    .where(
      and(
        eq(deals.workspaceId, workspaceId),
        isNull(deals.deletedAt),
        eq(deals.status, "won"),
      ),
    )
    .groupBy(monthTrunc)
    .orderBy(monthTrunc);

  const headers = ["month", "won_revenue_cents", "deal_count"];
  const data = rows.map((r) => [
    r.month,
    r.revenueCents === null ? "0" : String(r.revenueCents),
    Number(r.dealCount),
  ]);

  return encodeCsv(headers, data);
}

async function contactsBySourceReport(db: Db, workspaceId: string) {
  const rows = await db
    .select({
      source: sql<string>`coalesce(${contacts.customFields}->>'source', 'unknown')`,
      contactCount: count(contacts.id),
    })
    .from(contacts)
    .where(and(eq(contacts.workspaceId, workspaceId), isNull(contacts.deletedAt)))
    .groupBy(sql`coalesce(${contacts.customFields}->>'source', 'unknown')`);

  const mapped = [...rows].sort((a, b) => Number(b.contactCount) - Number(a.contactCount));

  const headers = ["source", "contact_count"];
  const data = mapped.map((r) => [r.source, Number(r.contactCount)]);
  return encodeCsv(headers, data);
}

async function activityByUserReport(db: Db, workspaceId: string) {
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.name,
      eventCount: count(events.id),
    })
    .from(events)
    .innerJoin(users, eq(events.actorId, users.id))
    .where(and(eq(events.workspaceId, workspaceId), isNull(events.deletedAt)))
    .groupBy(users.id, users.email, users.name);

  rows.sort((a, b) => Number(b.eventCount) - Number(a.eventCount));

  const headers = ["user_id", "email", "name", "event_count"];
  const data = rows.map((r) => [r.userId, r.email, r.displayName, Number(r.eventCount)]);
  return encodeCsv(headers, data);
}

async function averageDealCycleReport(db: Db, workspaceId: string) {
  const [aggregate] = await db
    .select({
      avgCycleDays:
        sql<string>`coalesce(avg(extract(epoch from (${deals.updatedAt} - ${deals.createdAt})) / 86400.0), 0)::text`,
      wonDealCount: count(deals.id),
    })
    .from(deals)
    .where(
      and(
        eq(deals.workspaceId, workspaceId),
        isNull(deals.deletedAt),
        eq(deals.status, "won"),
      ),
    );

  const headers = ["metric", "value"];
  const avg = aggregate?.avgCycleDays ?? "0";
  const ct = aggregate ? Number(aggregate.wonDealCount) : 0;
  const data = [
    ["average_cycle_days", avg],
    ["won_deal_count", ct],
  ];
  return encodeCsv(headers, data);
}

async function agingDealsReport(db: Db, workspaceId: string) {
  const rows = await db
    .select({
      id: deals.id,
      title: deals.title,
      amountCents: deals.amountCents,
      currency: deals.currency,
      createdAt: deals.createdAt,
      expectedCloseDate: deals.expectedCloseDate,
      stageName: stages.name,
      pipelineName: pipelines.name,
    })
    .from(deals)
    .innerJoin(stages, eq(deals.stageId, stages.id))
    .innerJoin(pipelines, eq(deals.pipelineId, pipelines.id))
    .where(
      and(
        eq(deals.workspaceId, workspaceId),
        isNull(deals.deletedAt),
        eq(deals.status, "open"),
        sql`(${deals.createdAt} < now() - interval '21 days' or (${deals.expectedCloseDate}
          is not null and ${deals.expectedCloseDate} < current_date))`,
      ),
    )
    .orderBy(deals.createdAt);

  const headers = [
    "deal_id",
    "title",
    "pipeline_name",
    "stage_name",
    "amount_cents",
    "currency",
    "created_at",
    "expected_close_date",
  ];

  const data = rows.map((r) => [
    r.id,
    r.title,
    r.pipelineName,
    r.stageName,
    String(r.amountCents),
    r.currency,
    r.createdAt.toISOString(),
    r.expectedCloseDate ?? "",
  ]);

  return encodeCsv(headers, data);
}

async function buildReportCsv(
  db: Db,
  workspaceId: string,
  reportId: ReportId,
): Promise<{ csv: string; rowCount: number }> {
  switch (reportId) {
    case "pipeline_by_stage":
      return await pipelineByStageReport(db, workspaceId);
    case "conversion_funnel":
      return await conversionFunnelReport(db, workspaceId);
    case "win_loss_by_reason":
      return await winLossByReasonReport(db, workspaceId);
    case "revenue_by_month":
      return await revenueByMonthReport(db, workspaceId);
    case "contacts_by_source":
      return await contactsBySourceReport(db, workspaceId);
    case "activity_by_user":
      return await activityByUserReport(db, workspaceId);
    case "average_deal_cycle":
      return await averageDealCycleReport(db, workspaceId);
    case "aging_deals":
      return await agingDealsReport(db, workspaceId);
    default:
      reportId satisfies never;
      throw new Error("unknown_report_id");
  }
}

export type ReportExportService = {
  runExport(input: {
    workspaceId: string;
    actorId: string;
    reportId: ReportId;
  }): Promise<{ job: ReportExportJobDto; csv: string }>;

  mapJobRow(row: ExportJobRow): ReportExportJobDto;
};

export function createReportExportService(deps: {
  db: Db;
  jobsRepo: ExportJobRepository;
}): ReportExportService {
  return {
    mapJobRow: toReportExportJobDto,

    async runExport(input) {
      const id = createId();
      await deps.jobsRepo.createPending({
        id,
        workspaceId: input.workspaceId,
        reportId: input.reportId,
        actorId: input.actorId,
      });

      try {
        const { csv, rowCount } = await buildReportCsv(
          deps.db,
          input.workspaceId,
          input.reportId,
        );
        await deps.jobsRepo.complete({ id, rowCount, resultCsv: csv });
        const row = await deps.jobsRepo.findById({
          id,
          workspaceId: input.workspaceId,
        });

        if (!row) {
          throw new Error("export_job_missing");
        }

        return { job: toReportExportJobDto(row), csv };
      } catch (error) {
        const message =
          error instanceof Error ? error.message.slice(0, 2000) : "report_export_failed";
        await deps.jobsRepo.fail({ id, message });
        throw error;
      }
    },
  };
}
