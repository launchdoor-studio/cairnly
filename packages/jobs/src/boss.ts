import { stderr } from "node:process";
import { runEmailImapIdleSupervisor } from "@cairnly/api/jobs/email-imap-idle-supervisor";
import { processEmailImapSyncAllJob } from "@cairnly/api/jobs/email-imap-worker";
import {
  processReportExportBossJob,
  type ReportExportBossPayload,
} from "@cairnly/api/jobs/report-export-worker";
import { createDb } from "@cairnly/db";
import { PgBoss } from "pg-boss";

const QUEUE_REPORT_EXPORT = "cairnly.report.export";
const QUEUE_EMAIL_IMAP_SYNC_ALL = "cairnly.email.imap_sync_all";

export { QUEUE_EMAIL_IMAP_SYNC_ALL, QUEUE_REPORT_EXPORT };

let bossInstance: PgBoss | null = null;
let shutdownStarted = false;
let imapIdleSupervisorAbort: AbortController | null = null;

async function shutdownBoss(reason: string): Promise<void> {
  if (shutdownStarted) {
    return;
  }
  shutdownStarted = true;
  imapIdleSupervisorAbort?.abort();
  imapIdleSupervisorAbort = null;
  if (!bossInstance) {
    return;
  }
  const b = bossInstance;
  bossInstance = null;
  try {
    await b.stop({ graceful: true, timeout: 25_000 });
  } catch (error) {
    stderr.write(
      `[cairnly-jobs] pg-boss shutdown after ${reason} failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  }
}

function registerProcessShutdown(): void {
  const onSignal = (signal: NodeJS.Signals) => {
    void shutdownBoss(signal);
  };
  process.once("SIGTERM", () => onSignal("SIGTERM"));
  process.once("SIGINT", () => onSignal("SIGINT"));
}

/**
 * Starts pg-boss alongside the web process and registers workers.
 * Skips entirely when `DATABASE_URL` is missing or `CAIRNLY_DISABLE_JOB_WORKERS=1`.
 */
export async function startPgBossWorkers(): Promise<void> {
  if (process.env.CAIRNLY_DISABLE_JOB_WORKERS === "1") {
    return;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return;
  }

  if (bossInstance) {
    return;
  }

  const boss = new PgBoss({
    connectionString,
    application_name: "cairnly-jobs",
  });

  boss.on("error", (err) => {
    stderr.write(
      `[cairnly-jobs] pg-boss error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
  });

  await boss.start();
  await boss.createQueue(QUEUE_REPORT_EXPORT);
  await boss.createQueue(QUEUE_EMAIL_IMAP_SYNC_ALL);

  const db = createDb({ connectionString, max: 4 });

  await boss.work(QUEUE_REPORT_EXPORT, { localConcurrency: 2 }, async (jobs) => {
    for (const job of jobs) {
      await processReportExportBossJob(db, job.data as ReportExportBossPayload);
    }
  });

  await boss.work(QUEUE_EMAIL_IMAP_SYNC_ALL, { localConcurrency: 1 }, async () => {
    await processEmailImapSyncAllJob(db);
  });

  const imapSyncDisabled = process.env.CAIRNLY_DISABLE_IMAP_SYNC === "1";
  const imapIdleDisabled = process.env.CAIRNLY_DISABLE_IMAP_IDLE === "1";

  if (!imapSyncDisabled && !imapIdleDisabled) {
    imapIdleSupervisorAbort = new AbortController();
    void runEmailImapIdleSupervisor(db, imapIdleSupervisorAbort.signal).catch((err) => {
      stderr.write(
        `[cairnly-jobs] IMAP IDLE supervisor stopped: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    });
  }

  if (!imapSyncDisabled) {
    const pollCron =
      process.env.CAIRNLY_IMAP_POLL_CRON ?? (imapIdleDisabled ? "*/5 * * * *" : "");
    if (pollCron.length > 0) {
      await boss.schedule(QUEUE_EMAIL_IMAP_SYNC_ALL, pollCron, {}, { tz: "UTC" });
    }
  }

  bossInstance = boss;
  shutdownStarted = false;
  registerProcessShutdown();
}

export function getBossInstance(): PgBoss | null {
  return bossInstance;
}

/**
 * Enqueue a report export that already has a pending `export_job` row.
 * Callers (e.g. a future async router) create the row first, then enqueue.
 */
export async function enqueueReportExportJob(input: {
  exportJobId: string;
  workspaceId: string;
}): Promise<string | null> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to enqueue jobs.");
  }

  const boss =
    bossInstance ??
    new PgBoss({
      connectionString,
      application_name: "cairnly-jobs-cli",
    });
  const startedHere = !bossInstance;
  if (startedHere) {
    await boss.start();
    await boss.createQueue(QUEUE_REPORT_EXPORT);
  }

  try {
    return await boss.send(QUEUE_REPORT_EXPORT, {
      exportJobId: input.exportJobId,
      workspaceId: input.workspaceId,
    });
  } finally {
    if (startedHere) {
      await boss.stop({ graceful: false, timeout: 5_000 });
    }
  }
}

/**
 * Verifies pg-boss can start and apply its schema (operators / CI).
 */
export async function runPgBossProbe(connectionString: string): Promise<void> {
  const boss = new PgBoss({
    connectionString,
    application_name: "cairnly-jobs-probe",
  });
  await boss.start();
  const version = await boss.schemaVersion();
  if (version == null) {
    throw new Error("pg-boss schema was not installed.");
  }
  await boss.stop({ graceful: true, timeout: 10_000 });
}
