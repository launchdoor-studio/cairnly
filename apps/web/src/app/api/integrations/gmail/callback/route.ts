import { completeGmailOAuthCallback } from "@cairnly/api/gmail-oauth-callback";
import { createDb } from "@cairnly/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) {
    return NextResponse.json(
      { ok: false, message: "missing_code_or_state" },
      { status: 400 },
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return NextResponse.json({ ok: false, message: "no_database" }, { status: 500 });
  }

  const secret = process.env.BETTER_AUTH_SECRET ?? "dev-gmail-state";
  const db = createDb({ connectionString: databaseUrl, max: 2 });
  const result = await completeGmailOAuthCallback(db, { code, state, secret });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.redirect(new URL("/contacts?gmail=connected", url.origin));
}
