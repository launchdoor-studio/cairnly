import { createDb } from "@cairnly/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL;
  let database: "ok" | "skipped" | "unreachable" = "skipped";

  if (databaseUrl) {
    try {
      const db = createDb({ connectionString: databaseUrl, max: 1 });
      await db.execute(sql`select 1`);
      database = "ok";
    } catch {
      database = "unreachable";
    }
  }

  const ok = database !== "unreachable";

  return NextResponse.json(
    {
      ok,
      service: "cairnly-web",
      database,
    },
    { status: ok ? 200 : 503 },
  );
}
