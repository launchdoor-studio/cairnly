import { randomUUID } from "node:crypto";
import { createEmailRepository } from "@cairnly/api/repositories/email-repository";
import { createEventRepository } from "@cairnly/api/repositories/event-repository";
import { createDb } from "@cairnly/db";
import { NextResponse } from "next/server";

const PIXEL_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return new NextResponse("missing token", { status: 400 });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return new NextResponse(PIXEL_GIF, {
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store",
      },
    });
  }

  const db = createDb({ connectionString: databaseUrl, max: 2 });
  const emailRepo = createEmailRepository(db);
  const eventsRepo = createEventRepository(db);
  const row = await emailRepo.findMessageByTrackingToken(token);
  if (row?.contactId) {
    await eventsRepo.create({
      id: randomUUID(),
      workspaceId: row.workspaceId,
      type: "email_opened",
      actorId: null,
      contactId: row.contactId,
      dealId: null,
      taskId: null,
      payload: {
        summary: "Email opened",
        emailMessageId: row.id,
      },
    });
  }

  return new NextResponse(PIXEL_GIF, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store",
    },
  });
}
