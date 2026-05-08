import {
  availabilityExceptions,
  availabilityWindows,
  bookings,
  calendarBusyHolds,
  contacts,
  type Db,
  events,
  schedulingLinks,
} from "@cairnly/db";
import { and, eq, gt, lt, ne } from "drizzle-orm";

export type SchedulingLinkRow = typeof schedulingLinks.$inferSelect;
export type AvailabilityWindowRow = typeof availabilityWindows.$inferSelect;
export type AvailabilityExceptionRow = typeof availabilityExceptions.$inferSelect;
export type BookingRow = typeof bookings.$inferSelect;

export type SchedulingRepository = {
  findLinkBySlug(slug: string): Promise<SchedulingLinkRow | undefined>;
  listWindows(linkId: string): Promise<AvailabilityWindowRow[]>;
  listExceptions(input: {
    linkId: string;
    from: Date;
    to: Date;
  }): Promise<AvailabilityExceptionRow[]>;
  hasConflict(input: {
    workspaceId: string;
    ownerId: string;
    startsAt: Date;
    endsAt: Date;
  }): Promise<boolean>;
  createBooking(input: {
    booking: typeof bookings.$inferInsert;
    contact: typeof contacts.$inferInsert;
    event: typeof events.$inferInsert;
  }): Promise<BookingRow>;
};

export function createSchedulingRepository(db: Db): SchedulingRepository {
  return {
    async findLinkBySlug(slug) {
      const [link] = await db
        .select()
        .from(schedulingLinks)
        .where(and(eq(schedulingLinks.slug, slug), eq(schedulingLinks.active, true)))
        .limit(1);

      return link;
    },

    async listWindows(linkId) {
      return db
        .select()
        .from(availabilityWindows)
        .where(eq(availabilityWindows.schedulingLinkId, linkId));
    },

    async listExceptions({ from, linkId, to }) {
      return db
        .select()
        .from(availabilityExceptions)
        .where(
          and(
            eq(availabilityExceptions.schedulingLinkId, linkId),
            lt(availabilityExceptions.startsAt, to),
            gt(availabilityExceptions.endsAt, from),
          ),
        );
    },

    async hasConflict({ endsAt, ownerId, startsAt, workspaceId }) {
      const [booking] = await db
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.workspaceId, workspaceId),
            eq(bookings.ownerId, ownerId),
            ne(bookings.status, "cancelled"),
            lt(bookings.startsAt, endsAt),
            gt(bookings.endsAt, startsAt),
          ),
        )
        .limit(1);

      if (booking) {
        return true;
      }

      const [hold] = await db
        .select({ id: calendarBusyHolds.id })
        .from(calendarBusyHolds)
        .where(
          and(
            eq(calendarBusyHolds.workspaceId, workspaceId),
            eq(calendarBusyHolds.ownerId, ownerId),
            lt(calendarBusyHolds.startsAt, endsAt),
            gt(calendarBusyHolds.endsAt, startsAt),
          ),
        )
        .limit(1);

      return Boolean(hold);
    },

    async createBooking({ booking, contact, event }) {
      return db.transaction(async (tx) => {
        await tx.insert(contacts).values(contact).onConflictDoNothing();
        const [createdBooking] = await tx.insert(bookings).values(booking).returning();

        if (!createdBooking) {
          throw new Error("Booking insert did not return a row");
        }

        await tx.insert(events).values(event);
        return createdBooking;
      });
    },
  };
}
