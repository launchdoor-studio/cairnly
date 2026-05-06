"use client";

import { CalendarDays, Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef } from "react";

import { type ActiveView, getCreateLabel } from "@/lib/navigation";

type CreateSheetProps = {
  activeView: ActiveView;
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
  inbox: [
    { label: "Event type", placeholder: "Note, call, email, form submission" },
    { label: "Related contact", placeholder: "Search contacts" },
    { label: "Summary", placeholder: "What happened?" },
  ],
};

const helperCopy: Record<ActiveView, string> = {
  home: "Start from the command layer when the user is not already in a specific workflow.",
  contacts:
    "Contact creation should eventually write the contact and the first timeline event together.",
  deals:
    "Deal creation will link a contact, default pipeline, starting stage, owner, and audit event.",
  tasks:
    "Tasks stay lightweight and relationship-aware instead of becoming project management.",
  calendar:
    "Scheduling links are first-class v1 objects with availability and conflict checking later.",
  inbox:
    "Manual event logging feeds the same append-only event stream as integrations.",
};

export function CreateSheet({ activeView, onClose }: CreateSheetProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const fields = fieldSets[activeView];
  const title = getCreateLabel(activeView);

  const submitLabel = useMemo(() => {
    if (activeView === "calendar") {
      return "Draft link";
    }

    if (activeView === "inbox") {
      return "Draft event";
    }

    return `Draft ${title.toLowerCase()}`;
  }, [activeView, title]);

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
          <form className="space-y-4">
            {fields.map((field, index) => (
              <label key={field.label} className="block">
                <span className="text-[12px] font-medium text-muted">
                  {field.label}
                </span>
                <input
                  ref={index === 0 ? firstInputRef : undefined}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  className="mt-1 h-10 w-full rounded-input border border-border bg-surface px-3 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
                />
              </label>
            ))}

            <label className="block">
              <span className="text-[12px] font-medium text-muted">Notes</span>
              <textarea
                placeholder="Add context for the relationship timeline"
                className="mt-1 min-h-28 w-full resize-none rounded-input border border-border bg-surface px-3 py-2 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
              />
            </label>
          </form>

          <div className="mt-5 rounded-card border border-border bg-surface p-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 text-accent" aria-hidden />
              <div>
                <p className="text-[13px] font-medium text-text">
                  No backend write yet
                </p>
                <p className="mt-1 text-[12px] text-muted">
                  This sheet establishes the interaction pattern. Persistence,
                  validation, optimistic updates, and event logging will be wired when
                  the domain layer exists.
                </p>
              </div>
            </div>
          </div>
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
            type="button"
            className="inline-flex items-center gap-2 rounded-input bg-accent px-3 py-2 text-[13px] font-medium text-accent-fg transition duration-150 ease-out hover:bg-accent-hover"
          >
            <Plus className="h-4 w-4" aria-hidden />
            {submitLabel}
          </button>
        </footer>
      </motion.aside>
    </motion.div>
  );
}
