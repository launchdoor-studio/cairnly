"use client";

import { KeyRound, Link2, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { authClient } from "@/lib/auth-client";

type AuthMode = "sign-in" | "sign-up";

function devHintForAuthFailure(status: number | undefined): string {
  if (process.env.NODE_ENV === "production") {
    return "";
  }
  if (status !== undefined && status >= 500) {
    return " Likely a server-side failure: verify DATABASE_URL (correct password for user cairnly; Docker Compose often uses localhost:5433 and a password from docker-compose / .env, not :5432 + change-me). See server logs.";
  }
  if (status === 403) {
    return " Often BETTER_AUTH_URL vs browser URL: set BETTER_AUTH_TRUSTED_ORIGINS or align BETTER_AUTH_URL.";
  }
  return " If Turbopack panicked earlier, clear apps/web/.next and restart dev.";
}

function formatAuthError(error: unknown, fallback: string): string {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const msg = record.message;
    if (typeof msg === "string" && msg.trim().length > 0) {
      return msg;
    }
    const status =
      typeof record.status === "number" ? record.status : undefined;
    const statusText =
      typeof record.statusText === "string" ? record.statusText : undefined;
    if (status != null || (statusText && statusText.length > 0)) {
      const detail = [status, statusText].filter(Boolean).join(" ");
      return `Request failed (${detail}).${devHintForAuthFailure(status)}`;
    }
  }
  if (
    fallback === "Authentication failed." &&
    process.env.NODE_ENV !== "production"
  ) {
    return `${fallback} Check DATABASE_URL/Postgres credentials and Better Auth URL settings.`;
  }
  return fallback;
}

export function AuthPanel({ redirectAfterLogin = "/" }: { redirectAfterLogin?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "").trim();

    startTransition(async () => {
      const result =
        mode === "sign-up"
          ? await authClient.signUp.email({
              email,
              password,
              name: name || email,
              callbackURL: redirectAfterLogin,
            })
          : await authClient.signIn.email({
              email,
              password,
              callbackURL: redirectAfterLogin,
            });

      if (result.error) {
        setMessage(formatAuthError(result.error, "Authentication failed."));
        return;
      }

      router.push(redirectAfterLogin);
      router.refresh();
    });
  }

  function sendMagicLink() {
    const emailInput = document.querySelector<HTMLInputElement>("input[name='email']");
    const email = emailInput?.value.trim();

    if (!email) {
      setMessage("Enter your email before requesting a magic link.");
      return;
    }

    startTransition(async () => {
      const result = await authClient.signIn.magicLink({
        email,
        callbackURL: redirectAfterLogin,
      });

      setMessage(
        result.error
          ? formatAuthError(result.error, "Could not send magic link.")
          : "Magic link generated. Check the server log in local development.",
      );
    });
  }

  function signInWithPasskey() {
    startTransition(async () => {
      const result = await authClient.signIn.passkey({
        autoFill: false,
        fetchOptions: {
          onSuccess: () => {
            router.push(redirectAfterLogin);
            router.refresh();
          },
        },
      });

      if (result?.error) {
        setMessage(
          formatAuthError(result.error, "Passkey sign-in failed."),
        );
      }
    });
  }

  return (
    <main className="min-h-dvh bg-bg px-4 py-8 text-text">
      <section className="mx-auto grid min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_460px]">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-[12px] font-medium text-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-accent" aria-hidden />
            Account sign-in
          </div>
          <div>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-[-0.06em] text-text md:text-7xl">
              Sign in to Cairnly
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-7 text-muted">
              Email and password, magic link, or passkey. Manage passkeys and
              sessions under Settings → Security.
            </p>
          </div>
        </div>

        <form
          className="rounded-modal border border-border bg-surface p-5 shadow-elevated"
          onSubmit={onSubmit}
        >
          <div className="flex rounded-input border border-border bg-bg p-1">
            {(["sign-in", "sign-up"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={`flex-1 rounded-[10px] px-3 py-2 text-[13px] font-medium transition duration-150 ${
                  mode === item ? "bg-surface text-text shadow-sm" : "text-muted"
                }`}
              >
                {item === "sign-in" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-4">
            {mode === "sign-up" ? (
              <AuthInput name="name" label="Name" autoComplete="name" />
            ) : null}
            <AuthInput
              name="email"
              label="Email"
              type="email"
              autoComplete="email webauthn"
            />
            <AuthInput
              name="password"
              label="Password"
              type="password"
              autoComplete={
                mode === "sign-up" ? "new-password" : "current-password webauthn"
              }
            />
          </div>

          {message ? <p className="mt-4 text-[13px] text-muted">{message}</p> : null}

          <button
            type="submit"
            disabled={isPending}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-input bg-accent px-3 py-2.5 text-[13px] font-semibold text-accent-fg transition duration-150 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {mode === "sign-in" ? "Sign in" : "Create account"}
          </button>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={sendMagicLink}
              className="inline-flex items-center justify-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-text transition duration-150 hover:border-border-strong hover:bg-surface-hover"
            >
              <Link2 className="h-4 w-4 text-accent" aria-hidden />
              Magic link
            </button>
            <button
              type="button"
              onClick={signInWithPasskey}
              className="inline-flex items-center justify-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-text transition duration-150 hover:border-border-strong hover:bg-surface-hover"
            >
              <KeyRound className="h-4 w-4 text-accent" aria-hidden />
              Passkey
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function AuthInput({
  autoComplete,
  label,
  name,
  type = "text",
}: {
  autoComplete: string;
  label: string;
  name: string;
  type?: "email" | "password" | "text";
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required
        className="mt-1 h-10 w-full rounded-input border border-border bg-bg px-3 text-[13px] text-text outline-none transition duration-150 placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
