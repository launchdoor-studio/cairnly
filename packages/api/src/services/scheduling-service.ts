import {
  type AvailabilityInput,
  type AvailabilitySlotDto,
  type BookingCreateInput,
  type BookingDto,
  err,
  ok,
  type Result,
  type SchedulingLinkDto,
} from "@cairnly/core";
import { createId } from "@paralleldrive/cuid2";
import type {
  BookingRow,
  SchedulingLinkRow,
  SchedulingRepository,
} from "../repositories/scheduling-repository";

type SchedulingError = "link_not_found" | "slot_unavailable";

const slotStepMinutes = 30;

export function createSchedulingService(repository: SchedulingRepository) {
  return {
    async availability(
      input: AvailabilityInput,
    ): Promise<
      Result<{ link: SchedulingLinkDto; slots: AvailabilitySlotDto[] }, SchedulingError>
    > {
      const link = await repository.findLinkBySlug(input.slug);
      if (!link) {
        return err("link_not_found");
      }

      const [windows, exceptions] = await Promise.all([
        repository.listWindows(link.id),
        repository.listExceptions({ linkId: link.id, from: input.from, to: input.to }),
      ]);

      const slots: AvailabilitySlotDto[] = [];
      for (
        let cursor = startOfDay(input.from);
        cursor < input.to;
        cursor = addDays(cursor, 1)
      ) {
        const weekday = cursor.getUTCDay();
        for (const window of windows.filter((item) => item.weekday === weekday)) {
          for (
            let slotStart = addMinutes(cursor, window.startMinutes);
            addMinutes(slotStart, link.durationMinutes) <=
            addMinutes(cursor, window.endMinutes);
            slotStart = addMinutes(slotStart, slotStepMinutes)
          ) {
            const startsAt = slotStart;
            const endsAt = addMinutes(startsAt, link.durationMinutes);
            const exceptionBlocks = exceptions.some(
              (item) =>
                item.available === false &&
                item.startsAt < endsAt &&
                item.endsAt > startsAt,
            );

            if (
              startsAt >= input.from &&
              endsAt <= input.to &&
              !exceptionBlocks &&
              !(await repository.hasConflict({
                workspaceId: link.workspaceId,
                ownerId: link.ownerId,
                startsAt: addMinutes(startsAt, -link.bufferBeforeMinutes),
                endsAt: addMinutes(endsAt, link.bufferAfterMinutes),
              }))
            ) {
              slots.push({ startsAt, endsAt });
            }
          }
        }
      }

      return ok({ link: toLinkDto(link), slots });
    },

    async createBooking(
      input: BookingCreateInput,
    ): Promise<Result<BookingDto, SchedulingError>> {
      const link = await repository.findLinkBySlug(input.slug);
      if (!link) {
        return err("link_not_found");
      }

      const startsAt = input.startsAt;
      const endsAt = addMinutes(startsAt, link.durationMinutes);
      const conflict = await repository.hasConflict({
        workspaceId: link.workspaceId,
        ownerId: link.ownerId,
        startsAt: addMinutes(startsAt, -link.bufferBeforeMinutes),
        endsAt: addMinutes(endsAt, link.bufferAfterMinutes),
      });

      if (conflict) {
        return err("slot_unavailable");
      }

      const contactId = createId();
      const bookingId = createId();
      const booking = await repository.createBooking({
        contact: {
          id: contactId,
          workspaceId: link.workspaceId,
          type: "person",
          name: input.inviteeName,
          primaryEmail: input.inviteeEmail,
          primaryPhone: null,
          companyId: null,
          ownerId: link.ownerId,
          score: "warm",
          customFields: { source: "booking" },
        },
        booking: {
          id: bookingId,
          workspaceId: link.workspaceId,
          schedulingLinkId: link.id,
          contactId,
          ownerId: link.ownerId,
          startsAt,
          endsAt,
          inviteeName: input.inviteeName,
          inviteeEmail: input.inviteeEmail,
          note: input.note ?? null,
          status: "confirmed",
        },
        event: {
          id: createId(),
          workspaceId: link.workspaceId,
          type: "booking_created",
          actorId: link.ownerId,
          contactId,
          dealId: null,
          taskId: null,
          payload: {
            bookingId,
            schedulingLinkId: link.id,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
          },
        },
      });

      return ok(toBookingDto(booking));
    },
  };
}

function toLinkDto(link: SchedulingLinkRow): SchedulingLinkDto {
  return {
    id: link.id,
    workspaceId: link.workspaceId,
    ownerId: link.ownerId,
    slug: link.slug,
    title: link.title,
    description: link.description,
    timezone: link.timezone,
    durationMinutes: link.durationMinutes,
    bufferBeforeMinutes: link.bufferBeforeMinutes,
    bufferAfterMinutes: link.bufferAfterMinutes,
    active: link.active,
  };
}

function toBookingDto(booking: BookingRow): BookingDto {
  return {
    id: booking.id,
    workspaceId: booking.workspaceId,
    schedulingLinkId: booking.schedulingLinkId,
    contactId: booking.contactId,
    ownerId: booking.ownerId,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    inviteeName: booking.inviteeName,
    inviteeEmail: booking.inviteeEmail,
    note: booking.note,
    status: booking.status,
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt,
  };
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function startOfDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}
