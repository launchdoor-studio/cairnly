"use client";

import type { LeadFormSubmitInput } from "@cairnly/core";
import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  type LucideIcon,
  Loader2,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";

import type { MutationResult } from "@/lib/app-data";

import logo from "../../../../../assets/logo.png";

export function PublicLeadFormPage({
  slug,
  submitLeadFormAction,
}: {
  slug: string;
  submitLeadFormAction: (
    input: LeadFormSubmitInput,
  ) => Promise<MutationResult>;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();
    const body = String(formData.get("message") ?? "").trim();
    const website = String(formData.get("website") ?? "").trim();

    if (!name || !email) {
      setMessage("Name and email are required.");
      return;
    }

    const payload: LeadFormSubmitInput = {
      slug,
      name,
      email,
      company: company || undefined,
      message: body || undefined,
      website: website || undefined,
    };

    startTransition(async () => {
      const result = await submitLeadFormAction(payload);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setSubmitted(true);
    });
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="grid min-h-screen w-full lg:grid-cols-[minmax(360px,30vw)_minmax(0,1fr)]">
        <aside className="border-b border-border bg-surface p-6 lg:border-b-0 lg:border-r lg:p-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-muted transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover hover:text-text"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Home
          </Link>

          <div className="mt-10 flex items-center gap-3">
            <Image
              src={logo}
              alt="Cairnly"
              priority
              className="h-11 w-11 rounded-card border border-border bg-bg object-cover"
            />
            <div>
              <p className="font-semibold tracking-[-0.02em] text-text">Get in touch</p>
              <p className="text-[13px] text-muted">Secure contact form</p>
            </div>
          </div>

          <div className="mt-10">
            <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
              Contact request
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-text">
              Tell us how we can help
            </h1>
            <p className="mt-4 max-w-sm text-[14px] text-muted">
              We&apos;ll reply by email—your submission is saved to our workspace timeline.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            <TrustItem
              icon={ShieldCheck}
              title="Hosted on Cairnly"
              detail="Submissions stay on infrastructure you operate."
            />
            <TrustItem
              icon={Mail}
              title="Direct replies"
              detail="We use your email above to respond and follow up."
            />
            <TrustItem
              icon={Sparkles}
              title="Fast routing"
              detail="Signals land alongside other customer activity so nothing gets lost."
            />
          </div>
        </aside>

        <section className="p-4 pb-10 md:p-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="w-full space-y-5"
          >
            {submitted ? (
              <ConfirmationCard onReset={() => setSubmitted(false)} />
            ) : (
              <>
                <article className="rounded-modal border border-border bg-surface p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
                        Your details
                      </p>
                      <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-text">
                        Brief intake form
                      </h2>
                      <p className="mt-2 max-w-2xl text-[13px] text-muted">
                        Takes under a minute. We only use this to qualify and reply.
                      </p>
                      {message ? (
                        <p className="mt-3 rounded-card border border-border bg-bg px-3 py-2 text-[12px] text-error">
                          {message}
                        </p>
                      ) : null}
                    </div>
                    <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-bg px-3 py-1 font-mono text-[12px] text-muted">
                      <FileText className="h-3.5 w-3.5 text-accent" aria-hidden />
                      {`/f/${slug}`}
                    </span>
                  </div>
                </article>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                  <article className="rounded-modal border border-border bg-surface p-5">
                    <form className="space-y-4" onSubmit={onSubmit}>
                      <div className="grid gap-3 md:grid-cols-2">
                        <TextField
                          name="name"
                          label="Name"
                          placeholder="Jordan Lee"
                          required
                        />
                        <TextField
                          name="email"
                          label="Email"
                          placeholder="jordan@example.com"
                          type="email"
                          required
                        />
                      </div>
                      <TextField name="company" label="Company" placeholder="Brightline Co." />
                      <label className="block">
                        <span className="text-[12px] font-medium text-muted">
                          What should we know?
                        </span>
                        <textarea
                          name="message"
                          placeholder="Goals, timelines, blockers..."
                          className="mt-1 min-h-32 w-full resize-none rounded-input border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
                        />
                      </label>
                      <label className="sr-only">
                        Website
                        <input name="website" tabIndex={-1} autoComplete="off" />
                      </label>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center justify-center gap-2 rounded-input bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg transition duration-150 ease-out hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : null}
                        Submit
                      </button>
                    </form>
                  </article>

                  <aside className="space-y-4">
                    <article className="rounded-modal border border-border bg-surface p-5">
                      <h3 className="font-semibold text-text">What happens next</h3>
                      <p className="mt-2 text-[13px] text-muted">
                        Someone from the team reviews your note and replies by email typically within two
                        business days.
                      </p>
                    </article>
                  </aside>
                </div>
              </>
            )}
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function TextField({
  label,
  name,
  placeholder,
  required: isRequired = false,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: "text" | "email";
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-muted">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={isRequired}
        className="mt-1 h-10 w-full rounded-input border border-border bg-bg px-3 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}

function TrustItem({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <div className="flex gap-3 rounded-card border border-border bg-bg p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
      <div>
        <p className="text-[13px] font-medium text-text">{title}</p>
        <p className="mt-1 text-[12px] text-muted">{detail}</p>
      </div>
    </div>
  );
}

function ConfirmationCard({ onReset }: { onReset: () => void }) {
  return (
    <article className="rounded-modal border border-border bg-surface p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-surface-hover text-success">
        <CheckCircle2 className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-text">Thanks — sent</h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] text-muted">
        Your answers are recorded and you should hear back at the email you provided.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 rounded-input border border-border bg-bg px-4 py-2 text-[13px] font-medium text-text transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover"
      >
        Submit another note
      </button>
    </article>
  );
}
