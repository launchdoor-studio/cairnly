import {
  contactImportCommitInputSchema,
  contactImportCommitOutputSchema,
  contactImportParseInputSchema,
  contactImportParseOutputSchema,
  contactImportPreviewInputSchema,
  contactImportPreviewOutputSchema,
} from "@cairnly/core";
import { TRPCError } from "@trpc/server";

import { createContactRepository } from "../repositories/contact-repository";
import {
  ContactImportParseError,
  createContactImportService,
  parseContactImportContent,
} from "../services/contact-import-service";
import { createContactService } from "../services/contact-service";
import { protectedProcedure, router } from "../trpc";

export const contactImportRouter = router({
  parse: protectedProcedure
    .input(contactImportParseInputSchema)
    .output(contactImportParseOutputSchema)
    .mutation(({ input }) => {
      try {
        return parseContactImportContent(input.content);
      } catch (error) {
        if (error instanceof ContactImportParseError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid CSV file." });
        }
        throw error;
      }
    }),

  preview: protectedProcedure
    .input(contactImportPreviewInputSchema)
    .output(contactImportPreviewOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const repository = createContactRepository(ctx.db);
      const importer = createContactImportService({
        repository,
        contactService: createContactService(repository),
      });
      return await importer.preview(ctx.user.workspaceId, input.content, input.mapping);
    }),

  commit: protectedProcedure
    .input(contactImportCommitInputSchema)
    .output(contactImportCommitOutputSchema)
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role === "viewer") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Viewers cannot run imports.",
        });
      }

      const repository = createContactRepository(ctx.db);
      const importer = createContactImportService({
        repository,
        contactService: createContactService(repository),
      });
      return await importer.commit(
        ctx.user,
        input.content,
        input.mapping,
        input.allowDuplicateRowIndices,
      );
    }),
});
