import { type ExistsEvent, ImapFlow } from "imapflow";

import {
  type ImapAuth,
  mailboxMessageFromRawSource,
  type ParsedMailboxMessage,
} from "./imap-sync";

export type RunInboxImapIdleSessionInput = {
  host: string;
  port: number;
  secure: boolean;
  auth: ImapAuth;
  /** IMAP path, usually `INBOX` */
  mailbox?: string;
  /** Highest UID already stored for this mailbox; we fetch from `lastUid + 1` */
  initialLastUid: number;
  /**
   * Send IDLE DONE and restart IDLE periodically (ms). Many hosts expect this;
   * Gmail recommends under 10 minutes.
   */
  maxIdleTimeMs?: number;
  signal: AbortSignal;
  onBatch: (messages: ParsedMailboxMessage[], highestUid: number) => Promise<void>;
};

/**
 * Keeps a single mailbox open, relies on ImapFlow auto-IDLE between commands,
 * reacts to EXISTS pushes, and incrementally ingests new UIDs.
 */
export async function runInboxImapIdleSession(
  input: RunInboxImapIdleSessionInput,
): Promise<void> {
  const mailbox = input.mailbox ?? "INBOX";
  const maxIdleTime = input.maxIdleTimeMs ?? 120_000;

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
    maxIdleTime,
  });

  let lastUid = Math.max(0, Math.floor(input.initialLastUid));
  let syncInFlight = false;
  let pendingExists = false;

  const drainNewMail = async () => {
    if (syncInFlight) {
      pendingExists = true;
      return;
    }
    syncInFlight = true;
    try {
      do {
        pendingExists = false;
        const from = lastUid + 1;
        const range = `${from}:*`;
        const messages: ParsedMailboxMessage[] = [];
        let highestUid = lastUid;

        try {
          for await (const msg of client.fetch(
            range,
            { uid: true, source: true },
            { uid: true },
          )) {
            if (!msg.source || typeof msg.uid !== "number") {
              continue;
            }
            const row = await mailboxMessageFromRawSource(msg.uid, msg.source);
            if (row) {
              messages.push(row);
              highestUid = Math.max(highestUid, msg.uid);
            }
          }
        } catch {
          // Empty UID range or transient errors — IDLE keeps running
        }

        if (messages.length > 0) {
          await input.onBatch(messages, highestUid);
          lastUid = highestUid;
        }
      } while (pendingExists);
    } finally {
      syncInFlight = false;
    }
  };

  const onExists = (ev: ExistsEvent) => {
    if (ev.count > ev.prevCount) {
      void drainNewMail().catch((err: unknown) => {
        client.emit("error", err instanceof Error ? err : new Error(String(err)));
      });
    }
  };

  await client.connect();
  await client.mailboxOpen(mailbox);

  client.on("exists", onExists);

  await drainNewMail();

  await new Promise<void>((resolve, reject) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      client.removeListener("error", onErr);
      client.removeListener("exists", onExists);
    };

    const onErr = (err: Error) => {
      finish();
      reject(err);
    };

    const onAbort = () => {
      finish();
      void client
        .logout()
        .catch(() => {
          client.close();
        })
        .finally(() => resolve());
    };

    client.on("error", onErr);
    input.signal.addEventListener("abort", onAbort, { once: true });
  });
}
