import {
  eventCreateInputSchema,
  eventDeleteInputSchema,
  eventListInputSchema,
  eventListOutputSchema,
  eventOutputSchema,
  eventUpdateInputSchema,
} from "@cairnly/core";
import { TRPCError } from "@trpc/server";

import { createEventRepository } from "../repositories/event-repository";
import { createEventService } from "../services/event-service";
import { protectedProcedure, router } from "../trpc";

export const eventRouter = router({
  list: protectedProcedure
    .input(eventListInputSchema)
    .output(eventListOutputSchema)
    .query(async ({ ctx, input }) => {
      const service = createEventService(createEventRepository(ctx.db));
      const result = await service.list(input, ctx.user);
      if (!result.ok) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return { events: result.value };
    }),

  create: protectedProcedure
    .input(eventCreateInputSchema)
    .output(eventOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createEventService(createEventRepository(ctx.db));
      const result = await service.create(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }
      return { event: result.value };
    }),

  update: protectedProcedure
    .input(eventUpdateInputSchema)
    .output(eventOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createEventService(createEventRepository(ctx.db));
      const result = await service.update(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }
      return { event: result.value };
    }),

  delete: protectedProcedure
    .input(eventDeleteInputSchema)
    .output(eventOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createEventService(createEventRepository(ctx.db));
      const result = await service.delete(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }
      return { event: result.value };
    }),
});

function toTrpcError(error: string): TRPCError {
  if (error === "viewer_forbidden") {
    return new TRPCError({
      code: "FORBIDDEN",
      message: "Viewers cannot mutate events.",
    });
  }

  if (error === "event_not_found") {
    return new TRPCError({ code: "NOT_FOUND", message: "Event not found." });
  }

  return new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}
