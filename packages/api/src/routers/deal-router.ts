import {
  dealCreateInputSchema,
  dealDeleteInputSchema,
  dealListInputSchema,
  dealListOutputSchema,
  dealMoveStageInputSchema,
  dealOutputSchema,
  dealUpdateInputSchema,
} from "@cairnly/core";
import { TRPCError } from "@trpc/server";

import { createDealRepository } from "../repositories/deal-repository";
import { createDealService } from "../services/deal-service";
import { protectedProcedure, router } from "../trpc";

export const dealRouter = router({
  list: protectedProcedure
    .input(dealListInputSchema)
    .output(dealListOutputSchema)
    .query(async ({ ctx, input }) => {
      const service = createDealService(createDealRepository(ctx.db));
      const result = await service.list(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }

      return result.value;
    }),

  create: protectedProcedure
    .input(dealCreateInputSchema)
    .output(dealOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createDealService(createDealRepository(ctx.db));
      const result = await service.create(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }

      return { deal: result.value };
    }),

  update: protectedProcedure
    .input(dealUpdateInputSchema)
    .output(dealOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createDealService(createDealRepository(ctx.db));
      const result = await service.update(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }

      return { deal: result.value };
    }),

  moveStage: protectedProcedure
    .input(dealMoveStageInputSchema)
    .output(dealOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createDealService(createDealRepository(ctx.db));
      const result = await service.moveStage(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }

      return { deal: result.value };
    }),

  delete: protectedProcedure
    .input(dealDeleteInputSchema)
    .output(dealOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createDealService(createDealRepository(ctx.db));
      const result = await service.delete(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }

      return { deal: result.value };
    }),
});

function toTrpcError(error: string): TRPCError {
  if (error === "viewer_forbidden") {
    return new TRPCError({
      code: "FORBIDDEN",
      message: "Viewers cannot mutate deals.",
    });
  }

  if (error === "deal_not_found" || error === "stage_not_found") {
    return new TRPCError({ code: "NOT_FOUND", message: "Deal or stage not found." });
  }

  return new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}
