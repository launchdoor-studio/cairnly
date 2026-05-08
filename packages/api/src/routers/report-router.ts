import {
  REPORT_DEFINITIONS,
  reportDefinitionsOutputSchema,
  reportListJobsInputSchema,
  reportListJobsOutputSchema,
  reportRunExportInputSchema,
  reportRunExportOutputSchema,
} from "@cairnly/core";
import { TRPCError } from "@trpc/server";

import { createExportJobRepository } from "../repositories/export-job-repository";
import {
  createReportExportService,
  toReportExportJobDto,
} from "../services/report-export-service";
import { protectedProcedure, router } from "../trpc";

export const reportRouter = router({
  definitions: protectedProcedure
    .output(reportDefinitionsOutputSchema)
    .query(() => ({ definitions: REPORT_DEFINITIONS })),

  runExport: protectedProcedure
    .input(reportRunExportInputSchema)
    .output(reportRunExportOutputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "viewer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot export reports.",
        });
      }

      const jobsRepo = createExportJobRepository(ctx.db);

      try {
        const exporter = createReportExportService({ db: ctx.db, jobsRepo });
        return await exporter.runExport({
          workspaceId: ctx.user.workspaceId,
          actorId: ctx.user.id,
          reportId: input.reportId,
        });
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Could not complete export.",
        });
      }
    }),

  listJobs: protectedProcedure
    .input(reportListJobsInputSchema)
    .output(reportListJobsOutputSchema)
    .query(async ({ ctx, input }) => {
      const repo = createExportJobRepository(ctx.db);
      const rows = await repo.listRecent({
        workspaceId: ctx.user.workspaceId,
        limit: input.limit,
      });
      return { jobs: rows.map(toReportExportJobDto) };
    }),
});
