import { randomUUID } from "node:crypto";
import { createEmailRepository } from "@cairnly/api/repositories/email-repository";
import { createEventRepository } from "@cairnly/api/repositories/event-repository";
import { createDb } from "@cairnly/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const rawUrl = url.searchParams.get("u");
  if (!rawUrl) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  let target: string;
  try {
    target = decodeURIComponent(rawUrl);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!/^https?:\/\//i.test(target)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const token = url.searchParams.get("token");
  const databaseUrl = process.env.DATABASE_URL;
  if (token && databaseUrl) {
    const db = createDb({ connectionString: databaseUrl, max: 2 });
    const emailRepo = createEmailRepository(db);
    const eventsRepo = createEventRepository(db);
    const row = await emailRepo.findMessageByTrackingToken(token);
    if (row?.contactId) {
      await eventsRepo.create({
        id: randomUUID(),
        workspaceId: row.workspaceId,
        type: "email_link_click",
        actorId: null,
        contactId: row.contactId,
        dealId: null,
        taskId: null,
        payload: {
          summary: "Email link clicked",
          url: target.slice(0, 2000),
          emailMessageId: row.id,
        },
      });
    }
  }

  return NextResponse.redirect(target);
}
