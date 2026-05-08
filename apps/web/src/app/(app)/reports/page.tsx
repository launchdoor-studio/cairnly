import type { ReportExportJobDto } from "@cairnly/core";

import { AppShell } from "@/components/app/AppShell";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";

import { runReportExportAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  let jobs: ReportExportJobDto[] = [];

  if (hasDatabaseUrl()) {
    try {
      const api = await getApiCaller();
      jobs = (await api.reports.listJobs({ limit: 8 })).jobs;
    } catch {
      jobs = [];
    }
  }

  return (
    <AppShell
      reportExport={{
        jobs,
        onExport: runReportExportAction,
      }}
    />
  );
}
