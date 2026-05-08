import {
  noteCreateInputSchema,
  noteDeleteInputSchema,
  noteListInputSchema,
  noteListOutputSchema,
  noteOutputSchema,
  noteUpdateInputSchema,
} from "@cairnly/core";
import { TRPCError } from "@trpc/server";

import { createNoteRepository } from "../repositories/note-repository";
import { createNoteService } from "../services/note-service";
import { protectedProcedure, router } from "../trpc";

export const noteRouter = router({
  list: protectedProcedure
    .input(noteListInputSchema)
    .output(noteListOutputSchema)
    .query(async ({ ctx, input }) => {
      const service = createNoteService(createNoteRepository(ctx.db));
      const result = await service.list(input, ctx.user);
      if (!result.ok) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return { notes: result.value };
    }),

  create: protectedProcedure
    .input(noteCreateInputSchema)
    .output(noteOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createNoteService(createNoteRepository(ctx.db));
      const result = await service.create(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }
      return { note: result.value };
    }),

  update: protectedProcedure
    .input(noteUpdateInputSchema)
    .output(noteOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createNoteService(createNoteRepository(ctx.db));
      const result = await service.update(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }
      return { note: result.value };
    }),

  delete: protectedProcedure
    .input(noteDeleteInputSchema)
    .output(noteOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createNoteService(createNoteRepository(ctx.db));
      const result = await service.delete(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }
      return { note: result.value };
    }),
});

function toTrpcError(error: string): TRPCError {
  if (error === "viewer_forbidden") {
    return new TRPCError({
      code: "FORBIDDEN",
      message: "Viewers cannot mutate notes.",
    });
  }

  if (error === "note_not_found") {
    return new TRPCError({ code: "NOT_FOUND", message: "Note not found." });
  }

  return new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}
