"use client";

import { CalendarDays, Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type { AppActions } from "@/lib/app-data";
import type { ContactCreateAction } from "@/lib/contact-mutations";
import { type ActiveView, getCreateLabel } from "@/lib/navigation";

type CreateSheetProps = {
  actions?: AppActions;
  activeView: ActiveView;
  contactCreateAction?: ContactCreateAction;
  onClose: () => void;
};

type Field = {
  label: string;
  placeholder: string;
  type?: "text" | "email" | "number" | "date" | "datetime-local";
};

const fieldSets: Record<ActiveView, Field[]> = {
  home: [
    { label: "What are you creating?", placeholder: "Contact, deal, task, or note" },
    { label: "Linked person", placeholder: "Search contacts" },
    { label: "Details", placeholder: "Add a short note" },
  ],
  contacts: [
    { label: "Name", placeholder: "Mira Patel" },
    { label: "Email", placeholder: "mira@example.com", type: "email" },
    { label: "Company", placeholder: "Northstar Design" },
    { label: "Source", placeholder: "Referral, form, import..." },
  ],
  deals: [
    { label: "Deal title", placeholder: "Northstar migration" },
    { label: "Contact", placeholder: "Search contacts" },
    { label: "Amount", placeholder: "24000", type: "number" },
    { label: "Expected close", placeholder: "Select date", type: "date" },
  ],
  tasks: [
    { label: "Task", placeholder: "Send migration plan" },
    { label: "Due", placeholder: "Choose date and time", type: "datetime-local" },
    { label: "Linked record", placeholder: "Contact or deal" },
  ],
  calendar: [
    { label: "Event type", placeholder: "Discovery call" },
    { label: "Duration", placeholder: "30 minutes" },
    { label: "Public slug", placeholder: "discovery" },
  ],
  automations: [
    { label: "Action", placeholder: "Reload automations" },
    { label: "Source file", placeholder: "automations.ts" },
    { label: "Reason", placeholder: "Changed owner assignment rule" },
  ],
  reports: [
    { label: "Report", placeholder: "Pipeline by stage" },
    { label: "Date range", placeholder: "Last 30 days" },
    { label: "Format", placeholder: "CSV" },
  ],
  inbox: [
    { label: "Event type", placeholder: "Note, call, email, form submission" },
    { label: "Related contact", placeholder: "Search contacts" },
    { label: "Summary", placeholder: "What happened?" },
  ],
  settings: [
    { label: "Workspace name", placeholder: "Launchdoor" },
    { label: "Domain", placeholder: "cairnly.app" },
    { label: "Admin email", placeholder: "admin@example.com", type: "email" },
  ],
};

const helperCopy: Record<ActiveView, string> = {
  home: "Quick create when you are not already in a specific screen.",
  contacts: "Creates a contact; a timeline entry can be added on save.",
  deals: "Creates a deal with pipeline, stage, owner, and amount as configured.",
  tasks: "Creates a task; optional link to a contact or deal.",
  calendar: "Defines a scheduling link slug, duration, and event type.",
  automations:
    "Reload reads the automation module; there is no visual rule builder here.",
  reports: "Choosing a report prepares a CSV export for the selected range.",
  inbox: "Appends an event to the workspace log (and contact timeline when linked).",
  settings: "Workspace metadata; external services stay optional.",
};

export function CreateSheet({
  actions,
  activeView,
  contactCreateAction,
  onClose,
}: CreateSheetProps) {
  const router = useRouter();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, startTransition] = useTransition();
  const fields = fieldSets[activeView];
  const title = getCreateLabel(activeView);
  const canPersistContact = activeView === "contacts" && contactCreateAction;
  const canPersist =
    canPersistContact ||
    (activeView === "deals" && actions?.createDeal) ||
    (activeView === "tasks" && actions?.createTask) ||
    (activeView === "inbox" && actions?.createEvent);

  const submitLabel = useMemo(() => {
    if (activeView === "calendar") {
      return "Draft link";
    }

    if (activeView === "inbox") {
      return "Draft event";
    }

    if (activeView === "reports") {
      return "Prepare export";
    }

    if (activeView === "automations") {
      return "Draft reload";
    }

    if (activeView === "settings") {
      return "Save draft";
    }

    return `Draft ${title.toLowerCase()}`;
  }, [activeView, title]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canPersist) {
      setMessage("This flow is still draft-only for this section.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const dealTitle = String(formData.get("deal-title") ?? "").trim();
    const taskTitle = String(formData.get("task") ?? "").trim();
    const primaryEmail = String(formData.get("email") ?? "").trim();
    const company = String(formData.get("company") ?? "").trim();
    const source = String(formData.get("source") ?? "").trim();
    const amount = Number(formData.get("amount") ?? 0);
    const expectedClose = String(formData.get("expected-close") ?? "").trim();
    const due = String(formData.get("due") ?? "").trim();
    const eventType = String(formData.get("event-type") ?? "manual_note").trim();
    const summary = String(formData.get("summary") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (activeView === "contacts" && !name) {
      setMessage("Add a name before creating the contact.");
      return;
    }

    startTransition(async () => {
      const result =
        activeView === "contacts" && contactCreateAction
          ? await contactCreateAction({
              type: "person",
              name,
              primaryEmail: primaryEmail || undefined,
              score: "unknown",
              customFields: {
                ...(company ? { company } : {}),
                ...(source ? { source } : {}),
              },
            })
          : activeView === "deals" && actions?.createDeal
            ? await actions.createDeal({
                title: dealTitle,
                amountCents: Number.isFinite(amount) ? Math.round(amount * 100) : 0,
                currency: "USD",
                expectedCloseDate: expectedClose || undefined,
                position: 0,
                status: "open",
              })
            : activeView === "tasks" && actions?.createTask
              ? await actions.createTask({
                  title: taskTitle,
                  dueAt: due ? new Date(due) : undefined,
                  description: notes || undefined,
                })
              : activeView === "inbox" && actions?.createEvent
                ? await actions.createEvent({
                    type: eventType || "manual_note",
                    payload: { summary: summary || notes || "Manual event" },
                  })
                : {
                    ok: false as const,
                    message: "No mutation is wired for this view.",
                  };

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      router.refresh();
      onClose();
    });
  }

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex justify-end bg-text/20 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      role="presentation"
      onMouseDown={onClose}
    >
      <motion.aside
        className="flex h-full w-full max-w-[520px] flex-col border-l border-border bg-bg shadow-elevated"
        initial={{ x: 32, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 32, opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
              Contextual create
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-text">
              {title}
            </h2>
            <p className="mt-2 text-[13px] text-muted">{helperCopy[activeView]}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-input p-2 text-muted transition duration-150 ease-out hover:bg-surface hover:text-text"
            aria-label="Close create sheet"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <form className="space-y-4" onSubmit={onSubmit} id="create-sheet-form">
            {fields.map((field, index) => (
              <label key={field.label} className="block">
                <span className="text-[12px] font-medium text-muted">
                  {field.label}
                </span>
                <input
                  ref={index === 0 ? firstInputRef : undefined}
                  name={field.label.toLowerCase().replaceAll(" ", "-")}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  className="mt-1 h-10 w-full rounded-input border border-border bg-surface px-3 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
                />
              </label>
            ))}

            <label className="block">
              <span className="text-[12px] font-medium text-muted">Notes</span>
              <textarea
                name="notes"
                placeholder="Add a note for the timeline"
                className="mt-1 min-h-28 w-full resize-none rounded-input border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
              />
            </label>
          </form>

          <div className="mt-5 rounded-card border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 text-accent" aria-hidden />
              <div>
                <p className="text-[13px] font-medium text-text">
                  {canPersist ? "Writes through the domain API" : "Draft-only flow"}
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  {canPersist
                    ? "This action validates through Zod, persists with Drizzle, and records timeline context where appropriate."
                    : "This sheet keeps the interaction pattern ready while the matching domain layer is still being built."}
                </p>
              </div>
            </div>
          </div>
          {message ? <p className="mt-3 text-[13px] text-muted">{message}</p> : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-input border border-border bg-bg px-3 py-2 text-[13px] font-medium text-muted transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover hover:text-text"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-sheet-form"
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-input bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg transition duration-150 ease-out hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {isPending
              ? "Saving..."
              : canPersist
                ? submitLabel.replace("Draft", "Create")
                : submitLabel}
          </button>
        </footer>
      </motion.aside>
    </motion.div>
  );
}
