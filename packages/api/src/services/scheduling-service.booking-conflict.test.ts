import { describe, expect, it } from "vitest";

import type {
  AvailabilityExceptionRow,
  AvailabilityWindowRow,
  BookingRow,
  SchedulingLinkRow,
  SchedulingRepository,
} from "../repositories/scheduling-repository";
import { createSchedulingService } from "./scheduling-service";

describe("createSchedulingService.createBooking conflicts", () => {
  const now = new Date();
  const link = {
    id: "link_seed",
    workspaceId: "dev_workspace",
    ownerId: "dev_user",
    slug: "aftaab",
    title: "Discovery call",
    description: null as string | null,
    timezone: "UTC",
    durationMinutes: 30,
    bufferBeforeMinutes: 10,
    bufferAfterMinutes: 10,
    active: true,
    createdAt: now,
    updatedAt: now,
  } satisfies SchedulingLinkRow;

  async function unreachableCreate(): Promise<BookingRow> {
    throw new Error(
      "repository.createBooking must not run when blocked by conflict check",
    );
  }

  it("returns slot_unavailable when hasConflict detects overlap", async () => {
    let conflictChecked = false;
    const repo: SchedulingRepository = {
      async findLinkBySlug(slug): Promise<SchedulingLinkRow | undefined> {
        return slug === "aftaab" ? link : undefined;
      },
      async listWindows(): Promise<AvailabilityWindowRow[]> {
        return [];
      },
      async listExceptions(): Promise<AvailabilityExceptionRow[]> {
        return [];
      },
      async hasConflict(): Promise<boolean> {
        conflictChecked = true;
        return true;
      },
      createBooking: unreachableCreate,
    };

    const service = createSchedulingService(repo);
    const startsAt = new Date(Date.UTC(2026, 0, 10, 15, 0, 0));
    const result = await service.createBooking({
      slug: "aftaab",
      startsAt,
      inviteeName: "Casey Rivera",
      inviteeEmail: "casey@example.com",
    });

    expect(conflictChecked).toBe(true);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("slot_unavailable");
    }
  });
});
