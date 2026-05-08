import { leadFormSubmitInputSchema, leadFormSubmitOutputSchema } from "@cairnly/core";
import { TRPCError } from "@trpc/server";
import { checkPublicSubmissionRate } from "../public-submission-rate-limit";
import { createContactRepository } from "../repositories/contact-repository";
import { createFormRepository } from "../repositories/form-repository";
import { createLeadFormService } from "../services/lead-form-service";
import { publicProcedure, router } from "../trpc";

export const leadFormRouter = router({
  submit: publicProcedure
    .input(leadFormSubmitInputSchema)
    .output(leadFormSubmitOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const rate = checkPublicSubmissionRate(ctx.requestHeaders, "lead_form");
      if (!rate.ok) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: rate.message });
      }

      const service = createLeadFormService(
        createFormRepository(ctx.db),
        createContactRepository(ctx.db),
      );
      const result = await service.submit(input);
      if (!result.ok) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "This form link is not available.",
        });
      }

      return { ok: true as const };
    }),
});
