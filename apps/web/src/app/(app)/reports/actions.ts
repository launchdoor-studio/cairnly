"use server";

import type { ReportId } from "@cairnly/core";
import { revalidatePath } from "next/cache";

import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";

export type ReportExportResult =
  | { ok: true; csv: string; filename: string; jobId: string }
  | { ok: false; message: string };

export async function runReportExportAction(reportId: ReportId): Promise<ReportExportResult> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL is not configured." };
  }

  try {
    const api = await getApiCaller();
    const out = await api.reports.runExport({ reportId });
    revalidatePath("/reports");
    return {
      ok: true,
      csv: out.csv,
      filename: `cairnly-${reportId}-${out.job.id}.csv`,
      jobId: out.job.id,
    };
  } catch {
    return { ok: false, message: "Could not export this report." };
  }
}
