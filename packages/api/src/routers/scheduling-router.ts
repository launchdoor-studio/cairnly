import {
  availabilityInputSchema,
  availabilityOutputSchema,
  bookingCreateInputSchema,
  bookingOutputSchema,
} from "@cairnly/core";
import { TRPCError } from "@trpc/server";

import { checkPublicSubmissionRate } from "../public-submission-rate-limit";
import { createSchedulingRepository } from "../repositories/scheduling-repository";
import { createSchedulingService } from "../services/scheduling-service";
import { publicProcedure, router } from "../trpc";

export const schedulingRouter = router({
  availability: publicProcedure
    .input(availabilityInputSchema)
    .output(availabilityOutputSchema)
    .query(async ({ ctx, input }) => {
      const service = createSchedulingService(createSchedulingRepository(ctx.db));
      const result = await service.availability(input);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }

      return result.value;
    }),

  book: publicProcedure
    .input(bookingCreateInputSchema)
    .output(bookingOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const rate = checkPublicSubmissionRate(ctx.requestHeaders, "booking");
      if (!rate.ok) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: rate.message });
      }

      const service = createSchedulingService(createSchedulingRepository(ctx.db));
      const result = await service.createBooking(input);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }

      return { booking: result.value };
    }),
});

function toTrpcError(error: string): TRPCError {
  if (error === "link_not_found") {
    return new TRPCError({ code: "NOT_FOUND", message: "Scheduling link not found." });
  }

  if (error === "slot_unavailable") {
    return new TRPCError({
      code: "CONFLICT",
      message: "This time is no longer available.",
    });
  }

  return new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}
