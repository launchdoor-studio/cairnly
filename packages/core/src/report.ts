import { z } from "zod";

export const REPORT_IDS = [
  "pipeline_by_stage",
  "conversion_funnel",
  "win_loss_by_reason",
  "revenue_by_month",
  "contacts_by_source",
  "activity_by_user",
  "average_deal_cycle",
  "aging_deals",
] as const;

export type ReportId = (typeof REPORT_IDS)[number];

export const reportIdSchema = z.enum(REPORT_IDS);

export const exportJobStatusSchema = z.enum(["pending", "completed", "failed"]);

export type ExportJobStatus = z.infer<typeof exportJobStatusSchema>;

export const reportDefinitionSchema = z.object({
  id: reportIdSchema,
  title: z.string(),
  description: z.string(),
});

export const reportDefinitionsOutputSchema = z.object({
  definitions: z.array(reportDefinitionSchema),
});

export const reportRunExportInputSchema = z.object({
  reportId: reportIdSchema,
});

export const reportExportJobDtoSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  reportId: reportIdSchema,
  format: z.literal("csv"),
  status: exportJobStatusSchema,
  rowCount: z.number().int().nonnegative().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.date(),
  completedAt: z.date().nullable(),
});

export type ReportExportJobDto = z.infer<typeof reportExportJobDtoSchema>;

export const reportRunExportOutputSchema = z.object({
  job: reportExportJobDtoSchema,
  csv: z.string(),
});

export const reportListJobsInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
});

export const reportListJobsOutputSchema = z.object({
  jobs: z.array(reportExportJobDtoSchema),
});

export const REPORT_DEFINITIONS: {
  id: ReportId;
  title: string;
  description: string;
}[] = [
  {
    id: "pipeline_by_stage",
    title: "Pipeline by stage",
    description:
      "Open deal value, counts, and weighted forecast (amount × stage probability) per stage.",
  },
  {
    id: "conversion_funnel",
    title: "Conversion funnel",
    description:
      "Open deal distribution by pipeline stage (funnel snapshot for export).",
  },
  {
    id: "win_loss_by_reason",
    title: "Win/loss by reason",
    description:
      "Closed won and lost deals including lost reason captured on the deal.",
  },
  {
    id: "revenue_by_month",
    title: "Revenue by month",
    description:
      "Won deal revenue grouped by calendar month (deal updated time as close proxy).",
  },
  {
    id: "contacts_by_source",
    title: "Contacts by source",
    description: "Contact counts grouped by custom field `source` (or unknown).",
  },
  {
    id: "activity_by_user",
    title: "Activity by user",
    description: "Timeline event volume per workspace user (excluding null actors).",
  },
  {
    id: "average_deal_cycle",
    title: "Average deal cycle",
    description: "Average days from deal creation to close for won deals.",
  },
  {
    id: "aging_deals",
    title: "Aging deals",
    description: "Open deals older than 21 days or past expected close date.",
  },
];
