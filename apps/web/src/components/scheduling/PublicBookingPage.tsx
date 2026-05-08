"use client";

import type {
  AvailabilitySlotDto,
  BookingCreateInput,
  SchedulingLinkDto,
} from "@cairnly/core";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Globe2,
  type LucideIcon,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import type { MutationResult } from "@/lib/app-data";

import logo from "../../../../../assets/logo.png";

type EventType = {
  id: "discovery" | "proposal" | "working-session";
  title: string;
  duration: string;
  description: string;
};

type AvailableDay = {
  label: string;
  date: string;
  note: string;
};

const eventTypes: [EventType, EventType, EventType] = [
  {
    id: "discovery",
    title: "Discovery call",
    duration: "30 min",
    description: "First call: goals, scope, and next steps.",
  },
  {
    id: "proposal",
    title: "Proposal review",
    duration: "45 min",
    description: "Review scope, assumptions, and open questions.",
  },
  {
    id: "working-session",
    title: "Working session",
    duration: "60 min",
    description: "Working time for planning or implementation checkpoints.",
  },
];

const availableDays = [
  { label: "Tue", date: "May 12", note: "4 slots" },
  { label: "Wed", date: "May 13", note: "3 slots" },
  { label: "Thu", date: "May 14", note: "5 slots" },
  { label: "Fri", date: "May 15", note: "2 slots" },
] as const;

const defaultEvent = eventTypes[0];
const defaultDay: AvailableDay = availableDays[1];

const availableTimes = ["10:00 AM", "11:30 AM", "2:00 PM", "4:30 PM"] as const;

type AvailabilityData = {
  link: SchedulingLinkDto;
  slots: AvailabilitySlotDto[];
};

export function PublicBookingPage({
  availability,
  createBookingAction,
  handle = "aftaab",
}: {
  availability?: AvailabilityData;
  createBookingAction?: (input: BookingCreateInput) => Promise<MutationResult>;
  handle?: string;
}) {
  const link = availability?.link;
  const [selectedEventId, setSelectedEventId] = useState<EventType["id"]>("discovery");
  const [selectedDay, setSelectedDay] = useState<AvailableDay>(defaultDay);
  const [selectedTime, setSelectedTime] =
    useState<(typeof availableTimes)[number]>("11:30 AM");
  const realSlots = availability?.slots ?? [];
  const [selectedSlot, setSelectedSlot] = useState<Date | undefined>(
    realSlots[0]?.startsAt,
  );
  const [message, setMessage] = useState<string | undefined>();
  const [confirmed, setConfirmed] = useState(false);
  const [bookingSaved, setBookingSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedEvent = useMemo(
    () => eventTypes.find((event) => event.id === selectedEventId) ?? defaultEvent,
    [selectedEventId],
  );

  function onConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createBookingAction || !selectedSlot) {
      setConfirmed(true);
      setBookingSaved(false);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const inviteeName = String(formData.get("name") ?? "").trim();
    const inviteeEmail = String(formData.get("email") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();

    if (!inviteeName || !inviteeEmail) {
      setMessage("Add your name and email before confirming.");
      return;
    }

    startTransition(async () => {
      const result = await createBookingAction({
        slug: handle,
        startsAt: selectedSlot,
        inviteeName,
        inviteeEmail,
        note: note || undefined,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setConfirmed(true);
      setBookingSaved(true);
    });
  }

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="grid min-h-screen w-full lg:grid-cols-[minmax(360px,28vw)_minmax(0,1fr)]">
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
              <p className="font-semibold tracking-[-0.02em] text-text">
                {link?.title ?? "Book a conversation"}
              </p>
              <p className="text-[13px] text-muted">Scheduling</p>
            </div>
          </div>

          <div className="mt-10">
            <p className="text-[12px] uppercase tracking-[0.16em] text-subtle">
              Schedule
            </p>
            <h1 className="mt-2 text-4xl font-semibold tracking-[-0.06em] text-text">
              Pick a meeting time
            </h1>
            <p className="mt-4 max-w-sm text-[14px] text-muted">
              Choose a slot, leave your email, and confirm—we&apos;ll hold the time and notify the team.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            <TrustItem
              icon={ShieldCheck}
              title="Private scheduling"
              detail="Hosted on Cairnly without a third-party embed."
            />
            <TrustItem
              icon={Globe2}
              title="Timezone"
              detail={`Times align to ${link?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "your zone"}.`}
            />
            <TrustItem
              icon={CalendarDays}
              title="Instant confirmation"
              detail="Confirmed slots create your guest record and a booking event."
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
            {confirmed ? (
              <ConfirmationCard
                eventTitle={selectedEvent.title}
                day={`${selectedDay.label}, ${selectedDay.date}`}
                time={selectedTime}
                saved={bookingSaved}
                onReset={() => {
                  setConfirmed(false);
                  setBookingSaved(false);
                }}
              />
            ) : (
              <>
                <BookingPanel title="1. Choose meeting type">
                  <div className="grid gap-3 md:grid-cols-3">
                    {eventTypes.map((event) => (
                      <button
                        type="button"
                        key={event.id}
                        onClick={() => setSelectedEventId(event.id)}
                        className={`rounded-card border p-4 text-left transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover ${
                          selectedEventId === event.id
                            ? "border-border-strong bg-surface"
                            : "border-border bg-bg"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[13px] font-semibold text-text">
                            {event.title}
                          </p>
                          <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
                            {event.duration}
                          </span>
                        </div>
                        <p className="mt-3 text-[12px] text-muted">
                          {event.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </BookingPanel>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <BookingPanel title="2. Pick a day">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {availableDays.map((day) => (
                        <button
                          type="button"
                          key={day.date}
                          onClick={() => setSelectedDay(day)}
                          className={`rounded-card border p-4 text-left transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover ${
                            selectedDay.date === day.date
                              ? "border-border-strong bg-surface"
                              : "border-border bg-bg"
                          }`}
                        >
                          <p className="text-[12px] uppercase tracking-[0.14em] text-subtle">
                            {day.label}
                          </p>
                          <p className="mt-1 text-[15px] font-semibold text-text">
                            {day.date}
                          </p>
                          <p className="mt-1 text-[12px] text-muted">{day.note}</p>
                        </button>
                      ))}
                    </div>
                  </BookingPanel>

                  <BookingPanel title="3. Choose time">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {(realSlots.length ? realSlots : availableTimes).map(
                        (slot, index) => {
                        const time =
                          typeof slot === "string"
                            ? slot
                            : new Intl.DateTimeFormat(undefined, {
                                timeStyle: "short",
                              }).format(new Date(slot.startsAt));

                        const rowKey =
                          typeof slot === "string"
                            ? `pick-${time}-${index}`
                            : `${new Date(slot.startsAt).toISOString()}-${new Date(slot.endsAt).toISOString()}-${index}`;

                        return (
                          <button
                            type="button"
                            key={rowKey}
                            onClick={() => {
                              setSelectedTime(time as (typeof availableTimes)[number]);
                              setSelectedSlot(
                                typeof slot === "string" ? undefined : slot.startsAt,
                              );
                            }}
                            className={`flex items-center justify-between rounded-card border p-4 text-left transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover ${
                              selectedTime === time ||
                              (
                                typeof slot !== "string" &&
                                  selectedSlot?.toISOString() ===
                                    new Date(slot.startsAt).toISOString()
                              )
                                ? "border-border-strong bg-surface"
                                : "border-border bg-bg"
                            }`}
                          >
                            <span className="text-[13px] font-semibold text-text">
                              {time}
                            </span>
                            <Clock3 className="h-4 w-4 text-subtle" aria-hidden />
                          </button>
                        );
                      })}
                    </div>
                  </BookingPanel>
                </div>

                <form onSubmit={onConfirm}>
                  <BookingPanel title="4. Your details">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="text-[12px] font-medium text-muted">Name</span>
                        <input
                          name="name"
                          placeholder="Mira Patel"
                          className="mt-1 h-10 w-full rounded-input border border-border bg-bg px-3 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[12px] font-medium text-muted">
                          Email
                        </span>
                        <input
                          name="email"
                          type="email"
                          placeholder="mira@example.com"
                          className="mt-1 h-10 w-full rounded-input border border-border bg-bg px-3 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
                        />
                      </label>
                    </div>
                    <label className="mt-3 block">
                      <span className="text-[12px] font-medium text-muted">
                        What should we cover?
                      </span>
                      <textarea
                        name="note"
                        placeholder="A short note for the meeting timeline"
                        className="mt-1 min-h-24 w-full resize-none rounded-input border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
                      />
                    </label>
                  </BookingPanel>

                  <div className="sticky bottom-0 rounded-modal border border-border bg-bg/95 p-4 backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[13px] font-semibold text-text">
                          {selectedEvent.title} on{" "}
                          {selectedSlot
                            ? new Intl.DateTimeFormat(undefined, {
                                dateStyle: "medium",
                              }).format(new Date(selectedSlot))
                            : selectedDay.date}
                        </p>
                        <p className="text-[12px] text-muted">
                          {selectedSlot
                            ? new Intl.DateTimeFormat(undefined, {
                                timeStyle: "short",
                              }).format(new Date(selectedSlot))
                            : selectedTime}{" "}
                          - {selectedEvent.duration} · {link?.timezone ?? "Local"}
                        </p>
                        {message ? (
                          <p className="text-[12px] text-muted">{message}</p>
                        ) : null}
                      </div>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex items-center justify-center rounded-input bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg transition duration-150 ease-out hover:bg-accent-hover"
                      >
                        {isPending ? "Checking..." : "Confirm booking"}
                      </button>
                    </div>
                  </div>
                </form>
              </>
            )}
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function BookingPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-modal border border-border bg-surface p-5">
      <h2 className="text-[13px] font-semibold text-text">{title}</h2>
      <div className="mt-4">{children}</div>
    </article>
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

function ConfirmationCard({
  eventTitle,
  day,
  time,
  saved,
  onReset,
}: {
  eventTitle: string;
  day: string;
  time: string;
  saved: boolean;
  onReset: () => void;
}) {
  return (
    <article className="rounded-modal border border-border bg-surface p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-surface-hover text-success">
        <CheckCircle2 className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-text">
        {saved ? "You're booked" : "Selection noted"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] text-muted">
        {saved
          ? `${eventTitle} is scheduled for ${day} at ${time}. Watch your inbox for a calendar invite shortly.`
          : `${eventTitle} is queued for ${day} at ${time}. Pick another slot once live availability finishes loading.`}
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-6 rounded-input border border-border bg-bg px-4 py-2 text-[13px] font-medium text-text transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover"
      >
        Adjust booking
      </button>
    </article>
  );
}
