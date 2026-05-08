import { spawn, spawnSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { stdin as stdinFd, stdout as stdoutFd } from "node:process";
import { createInterface } from "node:readline/promises";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";
import { createGzip } from "node:zlib";
import { createDb } from "@cairnly/db";
import { accounts, sessions, users } from "@cairnly/db/schema";
import { runPgBossProbe } from "@cairnly/jobs";
import { hashPassword } from "better-auth/crypto";
import { and, eq, sql } from "drizzle-orm";

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..", "..");

function usage(): void {
  console.log(`Cairnly admin CLI

Usage:
  crm migrate
  crm seed
  crm backup [dir] [--keep-days N]   (default dir: ./backups, keep 7 days)
  crm restore <file.sql.gz>
  crm reset-password <email> [--password NEW]   (prompts if --password omitted)
  crm health [--url HTTP_URL] [--no-http] [--no-db] [--pg-boss]
  crm jobs probe
`);
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }
  return url;
}

function runMigrate(): void {
  requireDatabaseUrl();
  const dbPkg = path.join(repoRoot, "packages", "db");
  const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], {
    cwd: dbPkg,
    stdio: "inherit",
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

function runSeed(): void {
  requireDatabaseUrl();
  const result = spawnSync("pnpm", ["run", "db:seed"], {
    cwd: path.join(repoRoot, "packages", "db"),
    stdio: "inherit",
    env: process.env,
  });
  process.exit(result.status ?? 1);
}

async function pruneBackups(dir: string, keepDays: number): Promise<void> {
  const cutoff = Date.now() - keepDays * 86_400_000;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }

  for (const name of entries) {
    if (!name.startsWith("pg-") || !name.endsWith(".sql.gz")) {
      continue;
    }
    const full = path.join(dir, name);
    const s = await stat(full);
    if (s.mtimeMs < cutoff) {
      await unlink(full);
      console.error(`Removed old backup (>${keepDays}d): ${full}`);
    }
  }
}

async function runBackup(args: string[]): Promise<void> {
  const databaseUrl = requireDatabaseUrl();
  let dir = path.join(repoRoot, "backups");
  let keepDays = 7;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === void 0) {
      continue;
    }
    if (a === "--keep-days") {
      const raw = args[i + 1];
      if (!raw) {
        console.error("--keep-days requires a number.");
        process.exit(1);
      }
      keepDays = Number(raw);
      i++;
      if (!Number.isFinite(keepDays) || keepDays < 1) {
        console.error("Invalid --keep-days.");
        process.exit(1);
      }
    } else if (!a.startsWith("--")) {
      dir = path.resolve(a);
    }
  }

  await mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  const outfile = path.join(dir, `pg-${stamp}.sql.gz`);

  const dump = spawn("pg_dump", [databaseUrl, "--no-owner", "--format=p"], {
    stdio: ["ignore", "pipe", "inherit"],
  });

  dump.on("error", (err) => {
    console.error("pg_dump failed:", err.message);
    console.error("Install PostgreSQL client tools and ensure pg_dump is on PATH.");
    process.exit(1);
  });

  const gzip = createGzip();
  const outStream = createWriteStream(outfile);

  const pipeDone = pipeline(dump.stdout as NodeJS.ReadableStream, gzip, outStream);
  const exitDone = new Promise<void>((resolve, reject) => {
    dump.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`pg_dump exited with code ${code ?? "unknown"}`));
      }
    });
  });

  try {
    await Promise.all([pipeDone, exitDone]);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }

  console.error(`Wrote ${outfile}`);
  await pruneBackups(dir, keepDays);
}

function waitChild(name: string, child: ReturnType<typeof spawn>): Promise<void> {
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${name} exited with code ${code ?? "unknown"}`));
      }
    });
  });
}

async function runRestore(file: string): Promise<void> {
  const databaseUrl = requireDatabaseUrl();
  const resolved = path.resolve(file);

  if (resolved.endsWith(".gz")) {
    const gunzip = spawn("gunzip", ["-c", resolved], {
      stdio: ["ignore", "pipe", "inherit"],
    });
    const psql = spawn("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1"], {
      stdio: ["pipe", "inherit", "inherit"],
    });
    gunzip.stdout?.pipe(psql.stdin as NodeJS.WritableStream);
    await Promise.all([waitChild("gunzip", gunzip), waitChild("psql", psql)]);
  } else {
    const sqlText = await readFile(resolved, "utf-8");
    const psql = spawn("psql", [databaseUrl, "-v", "ON_ERROR_STOP=1"], {
      stdio: ["pipe", "inherit", "inherit"],
    });
    psql.stdin?.write(sqlText);
    psql.stdin?.end();
    await waitChild("psql", psql);
  }

  console.error("Restore completed.");
}

async function runResetPassword(
  emailRaw: string,
  passwordFromFlag?: string,
): Promise<void> {
  const databaseUrl = requireDatabaseUrl();
  const email = emailRaw.toLowerCase();
  const db = createDb({ connectionString: databaseUrl, max: 2 });

  let password = passwordFromFlag;
  if (!password) {
    const rl = createInterface({ input: stdinFd, output: stdoutFd });
    password = await rl.question("New password: ");
    rl.close();
    if (!password) {
      console.error("Password required.");
      process.exit(1);
    }
  }

  const hash = await hashPassword(password);
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  if (!user) {
    console.error(`No user with email ${email}.`);
    process.exit(1);
  }

  const now = new Date();

  await db
    .update(users)
    .set({ passwordHash: hash, updatedAt: now })
    .where(eq(users.id, user.id));

  const credUpdated = await db
    .update(accounts)
    .set({ password: hash, updatedAt: now })
    .where(and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential")))
    .returning({ id: accounts.id });

  if (credUpdated.length === 0) {
    console.error(
      "Warning: no credential account row (magic-link only?). Updated user.password_hash only.",
    );
  }

  await db
    .update(sessions)
    .set({ revokedAt: now, updatedAt: now })
    .where(eq(sessions.userId, user.id));

  console.error(`Password updated for ${email}; sessions revoked.`);
}

async function runHealth(flags: {
  url?: string;
  skipHttp: boolean;
  skipDb: boolean;
  pgBoss: boolean;
}): Promise<void> {
  const out: Record<string, unknown> = { ok: true };

  if (!flags.skipDb) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      out.database = "skipped";
    } else {
      try {
        const db = createDb({ connectionString: databaseUrl, max: 1 });
        await db.execute(sql`select 1`);
        out.database = "ok";
      } catch (e) {
        out.database = "error";
        out.ok = false;
        out.databaseError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  if (!flags.skipHttp) {
    const url =
      flags.url ?? process.env.CAIRNLY_HEALTH_URL ?? "http://127.0.0.1:3000/healthz";
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      const body = (await res.json().catch(() => null)) as unknown;
      out.http = { status: res.status, body };
      if (!res.ok) {
        out.ok = false;
      }
    } catch (e) {
      out.http = { error: e instanceof Error ? e.message : String(e) };
      out.ok = false;
    }
  }

  if (flags.pgBoss) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      out.pgBoss = "skipped";
    } else {
      try {
        await runPgBossProbe(databaseUrl);
        out.pgBoss = "ok";
      } catch (e) {
        out.pgBoss = "error";
        out.ok = false;
        out.pgBossError = e instanceof Error ? e.message : String(e);
      }
    }
  }

  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok === true ? 0 : 1);
}

async function main(): Promise<void> {
  let argv = process.argv.slice(2);
  if (argv[0] === "--") {
    argv = argv.slice(1);
  }
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    usage();
    process.exit(argv.length === 0 ? 1 : 0);
  }

  const cmd = argv[0];

  if (cmd === "migrate") {
    runMigrate();
  }

  if (cmd === "seed") {
    runSeed();
  }

  if (cmd === "backup") {
    await runBackup(argv.slice(1));
    return;
  }

  if (cmd === "restore") {
    const file = argv[1];
    if (!file) {
      console.error("usage: crm restore <file.sql>");
      process.exit(1);
    }
    await runRestore(file);
    return;
  }

  if (cmd === "reset-password") {
    const email = argv[1];
    if (!email) {
      console.error("usage: crm reset-password <email> [--password NEW]");
      process.exit(1);
    }
    let passwordFlag: string | undefined;
    for (let i = 2; i < argv.length; i++) {
      if (argv[i] === "--password" && argv[i + 1]) {
        passwordFlag = argv[++i];
      }
    }
    await runResetPassword(email, passwordFlag);
    return;
  }

  if (cmd === "health") {
    let url: string | undefined;
    let skipHttp = false;
    let skipDb = false;
    let pgBoss = false;
    for (let i = 1; i < argv.length; i++) {
      if (argv[i] === "--url" && argv[i + 1]) {
        url = argv[++i];
      } else if (argv[i] === "--no-http") {
        skipHttp = true;
      } else if (argv[i] === "--no-db") {
        skipDb = true;
      } else if (argv[i] === "--pg-boss") {
        pgBoss = true;
      }
    }
    await runHealth({ url, skipHttp, skipDb, pgBoss });
    return;
  }

  if (cmd === "jobs" && argv[1] === "probe") {
    const databaseUrl = requireDatabaseUrl();
    await runPgBossProbe(databaseUrl);
    console.error("pg-boss probe OK.");
    return;
  }

  console.error(`Unknown command: ${cmd}`);
  usage();
  process.exit(1);
}

void main();
