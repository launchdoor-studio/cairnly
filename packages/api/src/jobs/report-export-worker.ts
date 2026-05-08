import type { Db } from "@cairnly/db";

import { createExportJobRepository } from "../repositories/export-job-repository";
import { createReportExportService } from "../services/report-export-service";

export type ReportExportBossPayload = {
  exportJobId: string;
  workspaceId: string;
};

export async function processReportExportBossJob(
  db: Db,
  data: ReportExportBossPayload,
): Promise<void> {
  const jobsRepo = createExportJobRepository(db);
  const exporter = createReportExportService({ db, jobsRepo });
  await exporter.executePendingExport({
    id: data.exportJobId,
    workspaceId: data.workspaceId,
  });
}
