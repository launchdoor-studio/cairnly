import { stderr } from "node:process";
import type { Db } from "@cairnly/db";

import { createEmailServiceFromDb } from "../services/email-service";

function anyAbortSignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(signals);
  }
  const merged = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      merged.abort();
      return merged.signal;
    }
    s.addEventListener("abort", () => merged.abort(), { once: true });
  }
  return merged.signal;
}

const ROSTER_MS = 60_000;

function accountKey(a: { workspaceId: string; id: string }): string {
  return `${a.workspaceId}:${a.id}`;
}

/**
 * One long-lived IMAP IDLE (or NOOP fallback) connection per linked mailbox,
 * plus a periodic roster refresh so new accounts are picked up without restart.
 */
export async function runEmailImapIdleSupervisor(
  db: Db,
  signal: AbortSignal,
): Promise<void> {
  const svc = createEmailServiceFromDb(db);
  const runners = new Map<string, AbortController>();

  const tick = async () => {
    const accounts = await svc.listSyncableMailAccounts();
    const wanted = new Set(accounts.map(accountKey));

    for (const [key, ctrl] of runners) {
      if (!wanted.has(key)) {
        ctrl.abort();
        runners.delete(key);
      }
    }

    for (const acc of accounts) {
      const key = accountKey(acc);
      if (runners.has(key)) {
        continue;
      }
      const ctrl = new AbortController();
      runners.set(key, ctrl);
      const combined = anyAbortSignal([signal, ctrl.signal]);

      void (async () => {
        try {
          await svc.runImapAccountIdleUntilAbort(acc, combined);
        } catch (err) {
          stderr.write(
            `[cairnly-jobs] IMAP IDLE ${key}: ${err instanceof Error ? err.message : String(err)}\n`,
          );
        } finally {
          runners.delete(key);
        }
      })();
    }
  };

  try {
    while (!signal.aborted) {
      await tick();
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, ROSTER_MS);
        const onAbort = () => {
          clearTimeout(t);
          resolve();
        };
        signal.addEventListener("abort", onAbort, { once: true });
      });
    }
  } finally {
    for (const ctrl of runners.values()) {
      ctrl.abort();
    }
    runners.clear();
  }
}
