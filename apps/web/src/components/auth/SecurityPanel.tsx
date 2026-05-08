"use client";

import { KeyRound, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState, useTransition } from "react";

import { authClient } from "@/lib/auth-client";

type Passkey = {
  id: string;
  name?: string | null;
  createdAt?: Date | string | null;
};

type SessionRecord = {
  id: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt?: Date | string | null;
};

type RoleSessionUser = {
  role?: string | null;
};

export function SecurityPanel() {
  const router = useRouter();
  const session = authClient.useSession();
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void refreshSecurityState();
  }, []);

  async function refreshSecurityState() {
    const [passkeyResult, sessionResult] = await Promise.all([
      authClient.passkey.listUserPasskeys(),
      authClient.listSessions(),
    ]);

    if (passkeyResult.data) {
      setPasskeys(passkeyResult.data as Passkey[]);
    }

    if (sessionResult.data) {
      setSessions(sessionResult.data as SessionRecord[]);
    }
  }

  function addPasskey() {
    startTransition(async () => {
      const result = await authClient.passkey.addPasskey({
        name: "Cairnly passkey",
      });

      if (result?.error) {
        setMessage(result.error.message ?? "Could not register passkey.");
        return;
      }

      setMessage("Passkey registered.");
      await refreshSecurityState();
    });
  }

  function deletePasskey(id: string) {
    startTransition(async () => {
      const result = await authClient.passkey.deletePasskey({ id });

      if (result?.error) {
        setMessage(result.error.message ?? "Could not remove passkey.");
        return;
      }

      await refreshSecurityState();
    });
  }

  function revokeSession(id: string) {
    startTransition(async () => {
      const result = await authClient.revokeSession({ token: id });

      if (result.error) {
        setMessage(result.error.message ?? "Could not revoke session.");
        return;
      }

      await refreshSecurityState();
    });
  }

  function signOut() {
    startTransition(async () => {
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/sign-in");
            router.refresh();
          },
        },
      });
    });
  }

  return (
    <main className="min-h-dvh bg-bg px-4 py-8 text-text">
      <section className="mx-auto w-full max-w-5xl space-y-5">
        <div className="rounded-modal border border-border bg-surface p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
                Account security
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-[-0.05em] text-text">
                Passkeys and sessions
              </h1>
              <p className="mt-2 text-[13px] text-muted">
                Current role:{" "}
                <span className="font-medium text-text">
                  {String(
                    (session.data?.user as RoleSessionUser | undefined)?.role ??
                      "unknown",
                  )}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex w-fit items-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-text transition hover:border-border-strong hover:bg-surface-hover"
            >
              <LogOut className="h-4 w-4 text-accent" aria-hidden />
              Sign out
            </button>
          </div>
        </div>

        {message ? (
          <p className="rounded-card border border-border bg-surface p-3 text-[13px] text-muted">
            {message}
          </p>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          <section className="rounded-modal border border-border bg-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-text">Passkeys</h2>
                <p className="mt-1 text-[13px] text-muted">
                  Device passkeys use WebAuthn; add one per trusted device if you enable them.
                </p>
              </div>
              <button
                type="button"
                onClick={addPasskey}
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-input bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg transition hover:bg-accent-hover disabled:opacity-70"
              >
                <KeyRound className="h-4 w-4" aria-hidden />
                Add
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {passkeys.length ? (
                passkeys.map((passkey) => (
                  <SecurityRow
                    key={passkey.id}
                    icon={<KeyRound className="h-4 w-4 text-accent" aria-hidden />}
                    title={passkey.name ?? "Unnamed passkey"}
                    detail={formatDate(passkey.createdAt)}
                    actionLabel="Remove"
                    onAction={() => deletePasskey(passkey.id)}
                  />
                ))
              ) : (
                <EmptySecurityState label="No passkeys registered yet." />
              )}
            </div>
          </section>

          <section className="rounded-modal border border-border bg-surface p-5">
            <h2 className="font-semibold text-text">Active sessions</h2>
            <p className="mt-1 text-[13px] text-muted">
              Revoke old sessions when a device is lost or a password changes.
            </p>
            <div className="mt-4 space-y-2">
              {sessions.length ? (
                sessions.map((item) => (
                  <SecurityRow
                    key={item.id}
                    icon={<ShieldCheck className="h-4 w-4 text-accent" aria-hidden />}
                    title={item.userAgent ?? "Session"}
                    detail={`${item.ipAddress ?? "Unknown IP"} - expires ${formatDate(
                      item.expiresAt,
                    )}`}
                    actionLabel="Revoke"
                    onAction={() => revokeSession(item.id)}
                  />
                ))
              ) : (
                <EmptySecurityState label="No active sessions returned." />
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function SecurityRow({
  actionLabel,
  detail,
  icon,
  onAction,
  title,
}: {
  actionLabel: string;
  detail: string;
  icon: ReactNode;
  onAction: () => void;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-card border border-border bg-bg p-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-card bg-surface-hover">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-text">{title}</p>
        <p className="truncate text-[12px] text-muted">{detail}</p>
      </div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center gap-1 rounded-input border border-border bg-surface px-2 py-1.5 text-[12px] font-medium text-muted transition hover:border-border-strong hover:text-text"
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        {actionLabel}
      </button>
    </div>
  );
}

function EmptySecurityState({ label }: { label: string }) {
  return (
    <div className="rounded-card border border-dashed border-border bg-bg p-4 text-[13px] text-muted">
      {label}
    </div>
  );
}

function formatDate(date: Date | string | null | undefined) {
  if (!date) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}
