import { type LeadFormSubmitInput, err, ok, type Result } from "@cairnly/core";
import { createId } from "@paralleldrive/cuid2";

import type { ContactRepository } from "../repositories/contact-repository";
import type { FormRepository } from "../repositories/form-repository";

type LeadFormError = "form_not_found";

function publicFormWorkspaceId(): string {
  return (
    process.env.CAIRNLY_PUBLIC_FORM_WORKSPACE_ID ??
    process.env.CAIRNLY_DEFAULT_WORKSPACE_ID ??
    process.env.CAIRNLY_DEV_WORKSPACE_ID ??
    "dev_workspace"
  );
}

export function createLeadFormService(
  formsRepo: FormRepository,
  contactsRepo: ContactRepository,
) {
  return {
    async submit(input: LeadFormSubmitInput): Promise<Result<{ ok: true }, LeadFormError>> {
      if (input.website != null && input.website.trim().length > 0) {
        return ok({ ok: true });
      }

      const workspaceId = publicFormWorkspaceId();
      const form = await formsRepo.findBySlug({ workspaceId, slug: input.slug });
      if (!form) {
        return err("form_not_found");
      }

      const contactId = createId();
      const submissionPayload: Record<string, unknown> = {
        name: input.name,
        email: input.email,
        company: input.company,
        message: input.message,
        formSlug: input.slug,
      };

      await contactsRepo.create({
        id: contactId,
        workspaceId,
        type: "person",
        name: input.name,
        primaryEmail: input.email,
        primaryPhone: null,
        companyId: null,
        ownerId: null,
        score: "warm",
        customFields: {
          company: input.company,
          source: `form:${input.slug}`,
          message: input.message,
        },
      });

      await contactsRepo.recordEvent({
        id: createId(),
        workspaceId,
        type: "form_submitted",
        actorId: null,
        contactId,
        dealId: null,
        taskId: null,
        payload: submissionPayload,
      });

      await formsRepo.insertSubmission({
        id: createId(),
        formId: form.id,
        payload: submissionPayload,
        contactId,
      });

      return ok({ ok: true });
    },
  };
}
