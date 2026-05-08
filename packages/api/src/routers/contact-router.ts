import {
  contactCreateInputSchema,
  contactDeleteInputSchema,
  contactListInputSchema,
  contactListOutputSchema,
  contactOutputSchema,
  contactUpdateInputSchema,
} from "@cairnly/core";
import { TRPCError } from "@trpc/server";

import { createContactRepository } from "../repositories/contact-repository";
import { createContactService } from "../services/contact-service";
import { protectedProcedure, router } from "../trpc";
import { contactImportRouter } from "./contact-import-router";

export const contactRouter = router({
  list: protectedProcedure
    .input(contactListInputSchema)
    .output(contactListOutputSchema)
    .query(async ({ ctx, input }) => {
      const service = createContactService(createContactRepository(ctx.db));
      const result = await service.list(input, ctx.user);

      if (!result.ok) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }

      return { contacts: result.value };
    }),

  create: protectedProcedure
    .input(contactCreateInputSchema)
    .output(contactOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createContactService(createContactRepository(ctx.db));
      const result = await service.create(input, ctx.user);

      if (!result.ok) {
        throw toTrpcError(result.error);
      }

      return { contact: result.value };
    }),

  update: protectedProcedure
    .input(contactUpdateInputSchema)
    .output(contactOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createContactService(createContactRepository(ctx.db));
      const result = await service.update(input, ctx.user);

      if (!result.ok) {
        throw toTrpcError(result.error);
      }

      return { contact: result.value };
    }),

  delete: protectedProcedure
    .input(contactDeleteInputSchema)
    .output(contactOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createContactService(createContactRepository(ctx.db));
      const result = await service.delete(input, ctx.user);

      if (!result.ok) {
        throw toTrpcError(result.error);
      }

      return { contact: result.value };
    }),

  import: contactImportRouter,
});

function toTrpcError(error: string): TRPCError {
  if (error === "viewer_forbidden") {
    return new TRPCError({
      code: "FORBIDDEN",
      message: "Viewers cannot mutate contacts.",
    });
  }

  if (error === "contact_not_found") {
    return new TRPCError({
      code: "NOT_FOUND",
      message: "Contact not found.",
    });
  }

  return new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}
