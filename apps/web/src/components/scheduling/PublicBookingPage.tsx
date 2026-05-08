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
import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import type { MutationResult } from "@/lib/app-data";

import logo from "../../../../../assets/logo.png";

type AvailabilityData = {
  link: SchedulingLinkDto;
  slots: AvailabilitySlotDto[];
};

type DayGroup = {
  sortKey: string;
  heading: string;
  slots: AvailabilitySlotDto[];
};

function formatIsoCalendarKey(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

function formatDayGroupHeading(slotStart: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone,
  }).format(slotStart);
}

function formatSlotStartButtonLabel(slotStart: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(slotStart);
}

function formatConfirmedWhen(slotStart: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone,
  }).format(slotStart);
}

function formatTimeZoneCaption(timeZoneSlug: string): string {
  try {
    const label = new Intl.DateTimeFormat(undefined, {
      timeZone: timeZoneSlug,
      timeZoneName: "longGeneric",
    })
      .formatToParts(new Date())
      .find((part) => part.type === "timeZoneName")?.value;
    return label ?? timeZoneSlug;
  } catch {
    return timeZoneSlug;
  }
}

function formatDurationLabel(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutes`;
  }
  if (minutes % 60 === 0 && minutes <= 480) {
    const h = minutes / 60;
    return `${h} hour${h === 1 ? "" : "s"}`;
  }
  return `${minutes} minutes`;
}

function groupSlotsByDay(
  link: SchedulingLinkDto,
  slots: AvailabilitySlotDto[],
): DayGroup[] {
  if (slots.length === 0) {
    return [];
  }
  const byKey = new Map<string, AvailabilitySlotDto[]>();
  for (const slot of slots) {
    const start = new Date(slot.startsAt);
    const key = formatIsoCalendarKey(start, link.timezone);
    const list = byKey.get(key);
    if (list) {
      list.push(slot);
    } else {
      byKey.set(key, [slot]);
    }
  }
  const entries = [...byKey.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return entries
    .map(([sortKey, daySlots]): DayGroup | null => {
      const first = daySlots[0];
      if (!first) {
        return null;
      }

      return {
        sortKey,
        heading: formatDayGroupHeading(new Date(first.startsAt), link.timezone),
        slots: daySlots,
      };
    })
    .filter((g): g is DayGroup => g != null);
}

export function PublicBookingPage({
  availability,
  createBookingAction,
  handle,
}: {
  availability?: AvailabilityData;
  createBookingAction?: (input: BookingCreateInput) => Promise<MutationResult>;
  handle: string;
}) {
  const link = availability?.link;
  const sortedSlots = useMemo(
    () =>
      [...(availability?.slots ?? [])].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    [availability?.slots],
  );

  const slotsByDay = useMemo(
    () => (link ? groupSlotsByDay(link, sortedSlots) : []),
    [link, sortedSlots],
  );

  const [selectedSlotStartsAt, setSelectedSlotStartsAt] = useState<number | undefined>(
    () =>
      sortedSlots[0]?.startsAt
        ? new Date(sortedSlots[0].startsAt).getTime()
        : undefined,
  );

  useEffect(() => {
    const first = sortedSlots[0]?.startsAt;
    setSelectedSlotStartsAt(first ? new Date(first).getTime() : undefined);
  }, [sortedSlots]);

  const [message, setMessage] = useState<string | undefined>();
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedSlot = useMemo(
    () =>
      sortedSlots.find((s) => new Date(s.startsAt).getTime() === selectedSlotStartsAt),
    [sortedSlots, selectedSlotStartsAt],
  );

  function onConfirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage(undefined);

    if (!createBookingAction || !link) {
      return;
    }

    if (!selectedSlot) {
      setMessage("Pick a time before confirming.");
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
        startsAt: new Date(selectedSlot.startsAt),
        inviteeName,
        inviteeEmail,
        note: note || undefined,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setConfirmed(true);
    });
  }

  if (!availability || !link) {
    return (
      <UnavailableBookingShell logo={logo} title="Scheduling unavailable">
        This link cannot load booking right now — check again later or ask the organizer
        for an updated link.
      </UnavailableBookingShell>
    );
  }

  const timezoneCaption = formatTimeZoneCaption(link.timezone);

  return (
    <main className="min-h-screen bg-bg text-text">
      <div className="grid min-h-screen w-full lg:grid-cols-[minmax(340px,28vw)_minmax(0,1fr)]">
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
              <p className="font-semibold tracking-[-0.02em] text-text">{link.title}</p>
              <p className="text-[13px] text-muted">
                Scheduling · {formatDurationLabel(link.durationMinutes)}
              </p>
            </div>
          </div>

          {link.description?.trim().length ? (
            <p className="mt-6 max-w-sm text-[14px] leading-relaxed text-muted">
              {link.description}
            </p>
          ) : null}

          <div className="mt-8 grid gap-3">
            <TrustItem
              icon={ShieldCheck}
              title="Private scheduling"
              detail="Hosted on Cairnly without a third-party embed."
            />
            <TrustItem
              icon={Globe2}
              title="Timezone"
              detail={`Times are shown in ${timezoneCaption}.`}
            />
            <TrustItem
              icon={CalendarDays}
              title="Booking"
              detail="Confirming saves your invitee record and confirms the hosting calendar slot."
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
            {confirmed && selectedSlot ? (
              <ConfirmationCard
                meetingTitle={link.title}
                whenLine={formatConfirmedWhen(
                  new Date(selectedSlot.startsAt),
                  link.timezone,
                )}
                durationLabel={formatDurationLabel(link.durationMinutes)}
                onAdjust={() => {
                  setConfirmed(false);
                }}
              />
            ) : sortedSlots.length === 0 ? (
              <BookingPanel title="Availability">
                <p className="text-[14px] text-muted leading-relaxed">
                  There are no open times in this period. Reach out to the organizer for
                  more availability.
                </p>
              </BookingPanel>
            ) : (
              <>
                <BookingPanel title="Pick a time">
                  <div className="space-y-6">
                    {slotsByDay.map((group) => (
                      <div key={group.sortKey}>
                        <h3 className="text-[12px] uppercase tracking-[0.14em] text-subtle">
                          {group.heading}
                        </h3>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                          {group.slots.map((slot) => {
                            const ts = new Date(slot.startsAt).getTime();
                            const label = formatSlotStartButtonLabel(
                              new Date(slot.startsAt),
                              link.timezone,
                            );
                            const selected =
                              selectedSlotStartsAt !== undefined &&
                              selectedSlotStartsAt === ts;

                            return (
                              <button
                                type="button"
                                key={`${group.sortKey}-${ts}`}
                                onClick={() => setSelectedSlotStartsAt(ts)}
                                className={`flex items-center justify-between rounded-card border p-4 text-left transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover ${
                                  selected
                                    ? "border-border-strong bg-surface"
                                    : "border-border bg-bg"
                                }`}
                              >
                                <span className="text-[13px] font-semibold text-text">
                                  {label}
                                </span>
                                <Clock3 className="h-4 w-4 text-subtle" aria-hidden />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </BookingPanel>

                <form onSubmit={onConfirm}>
                  <BookingPanel title="Your details">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="text-[12px] font-medium text-muted">Name</span>
                        <input
                          name="name"
                          autoComplete="name"
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
                          autoComplete="email"
                          placeholder="mira@example.com"
                          className="mt-1 h-10 w-full rounded-input border border-border bg-bg px-3 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
                        />
                      </label>
                    </div>
                    <label className="mt-3 block">
                      <span className="text-[12px] font-medium text-muted">
                        Anything we should prepare?
                      </span>
                      <textarea
                        name="note"
                        placeholder="Optional note for your host."
                        rows={3}
                        className="mt-1 w-full resize-none rounded-input border border-border bg-bg px-3 py-2 text-[13px] text-text outline-none transition duration-150 ease-out placeholder:text-subtle focus:border-border-strong focus:ring-2 focus:ring-ring"
                      />
                    </label>
                  </BookingPanel>

                  <div className="sticky bottom-0 rounded-modal border border-border bg-bg/95 p-4 backdrop-blur">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[13px] font-semibold text-text">
                          {link.title}
                        </p>
                        <p className="text-[12px] text-muted">
                          {selectedSlot
                            ? `${formatConfirmedWhen(new Date(selectedSlot.startsAt), link.timezone)} · ${formatDurationLabel(link.durationMinutes)}`
                            : "Pick a time above"}
                        </p>
                        {message ? (
                          <p className="mt-1 text-[12px] text-[color:var(--danger)]">
                            {message}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="submit"
                        disabled={isPending || !selectedSlot || !createBookingAction}
                        className="inline-flex items-center justify-center rounded-input bg-accent px-4 py-2 text-[13px] font-medium text-accent-fg transition duration-150 ease-out hover:bg-accent-hover disabled:pointer-events-none disabled:opacity-50"
                      >
                        {isPending ? "Sending…" : "Confirm"}
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

function UnavailableBookingShell({
  logo: logoImg,
  title,
  children,
}: {
  logo: typeof logo;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-bg px-4 py-10 text-text">
      <div className="mx-auto flex max-w-md flex-col items-center rounded-modal border border-border bg-surface p-8">
        <Image
          src={logoImg}
          alt="Cairnly"
          className="h-12 w-12 rounded-card border border-border bg-bg object-cover"
        />
        <p className="mt-6 text-xl font-semibold tracking-[-0.04em]">{title}</p>
        <p className="mt-3 text-center text-[14px] text-muted">{children}</p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-input border border-border bg-bg px-4 py-2 text-[13px] font-medium hover:border-border-strong"
        >
          Home
        </Link>
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
  meetingTitle,
  whenLine,
  durationLabel,
  onAdjust,
}: {
  meetingTitle: string;
  whenLine: string;
  durationLabel: string;
  onAdjust: () => void;
}) {
  return (
    <article className="rounded-modal border border-border bg-surface p-8 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-card bg-surface-hover text-success">
        <CheckCircle2 className="h-6 w-6" aria-hidden />
      </div>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-text">
        You&apos;re booked
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] text-muted">
        {`${meetingTitle} is booked for ${whenLine} (${durationLabel}). Watch your inbox for details.`}
      </p>
      <button
        type="button"
        onClick={onAdjust}
        className="mt-6 rounded-input border border-border bg-bg px-4 py-2 text-[13px] font-medium text-text transition duration-150 ease-out hover:border-border-strong hover:bg-surface-hover"
      >
        Back to times
      </button>
    </article>
  );
}
