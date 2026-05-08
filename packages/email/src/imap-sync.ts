import { ImapFlow } from "imapflow";
import type { AddressObject } from "mailparser";
import { simpleParser } from "mailparser";

function addressRows(field: AddressObject | AddressObject[] | undefined) {
  if (!field) {
    return [];
  }
  const objs = Array.isArray(field) ? field : [field];
  return objs.flatMap((o) => o.value);
}

function referencesHeaderString(refs: string | string[] | undefined): string | null {
  if (refs === undefined) {
    return null;
  }
  if (Array.isArray(refs)) {
    return refs.length > 0 ? refs.join(" ") : null;
  }
  return refs.trim() || null;
}

export type ParsedMailboxMessage = {
  sourceUid: number;
  messageId: string;
  inReplyTo: string | null;
  referencesHeader: string | null;
  threadRootMessageId: string;
  subject: string;
  fromAddr: string;
  toAddrs: string[];
  bodyText: string | null;
  bodyHtml: string | null;
  receivedAt: Date | null;
};

function stripAngleAddr(id: string): string {
  return id.replace(/^<|>$/g, "").trim();
}

function computeThreadRoot(
  messageId: string,
  references: string | null,
  inReplyTo: string | null,
): string {
  if (references) {
    const first = references.trim().split(/\s+/)[0];
    if (first) {
      return stripAngleAddr(first);
    }
  }
  if (inReplyTo) {
    return stripAngleAddr(inReplyTo);
  }
  return stripAngleAddr(messageId);
}

export type ImapAuth =
  | { user: string; pass: string }
  | { user: string; accessToken: string };

export async function mailboxMessageFromRawSource(
  sourceUid: number,
  source: Buffer,
): Promise<ParsedMailboxMessage | null> {
  const parsed = await simpleParser(source);
  const messageIdRaw = parsed.messageId?.trim();
  if (!messageIdRaw) {
    return null;
  }
  const messageId = stripAngleAddr(messageIdRaw);
  const inReplyTo = parsed.inReplyTo?.trim() ? stripAngleAddr(parsed.inReplyTo) : null;
  const refs = referencesHeaderString(parsed.references);
  const fromAddr =
    parsed.from?.value?.[0]?.address?.trim().toLowerCase() ?? "(unknown)";
  const toAddrs = addressRows(parsed.to)
    .map((v) => v.address?.trim().toLowerCase())
    .filter((a): a is string => Boolean(a));
  const subject = parsed.subject?.trim() ?? "(no subject)";
  const receivedAt = parsed.date ?? null;

  return {
    sourceUid,
    messageId,
    inReplyTo,
    referencesHeader: refs,
    threadRootMessageId: computeThreadRoot(messageId, refs, inReplyTo),
    subject,
    fromAddr,
    toAddrs,
    bodyText: parsed.text?.trim() ?? null,
    bodyHtml: parsed.html ? String(parsed.html) : null,
    receivedAt,
  };
}

export async function fetchRecentFromImap(input: {
  host: string;
  port: number;
  secure: boolean;
  auth: ImapAuth;
  mailbox?: string;
  maxMessages: number;
}): Promise<{
  messages: ParsedMailboxMessage[];
  highestUid: number;
}> {
  const client = new ImapFlow({
    host: input.host,
    port: input.port,
    secure: input.secure,
    auth:
      "pass" in input.auth
        ? {
            user: input.auth.user,
            pass: input.auth.pass,
          }
        : {
            user: input.auth.user,
            accessToken: input.auth.accessToken,
          },
    logger: false,
  });

  const messages: ParsedMailboxMessage[] = [];
  let highestUid = 0;

  try {
    await client.connect();
    const lock = await client.getMailboxLock(input.mailbox ?? "INBOX");
    try {
      const status = await client.status(input.mailbox ?? "INBOX", {
        uidNext: true,
        messages: true,
      });
      const total = status.messages ?? 0;
      if (total === 0) {
        return { messages: [], highestUid: 0 };
      }
      const start = Math.max(1, total - input.maxMessages + 1);
      for await (const msg of client.fetch(`${start}:*`, {
        uid: true,
        source: true,
      })) {
        if (!msg.source || typeof msg.uid !== "number") {
          continue;
        }
        highestUid = Math.max(highestUid, msg.uid);
        const row = await mailboxMessageFromRawSource(msg.uid, msg.source);
        if (row) {
          messages.push(row);
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { messages, highestUid };
}
