import { createHmac } from "node:crypto";
import {
  emailAccountCreateImapInputSchema,
  emailAccountDeleteInputSchema,
  emailListAccountsOutputSchema,
  emailListThreadsInputSchema,
  emailListThreadsOutputSchema,
  emailSendOutputSchema,
  emailSendToContactInputSchema,
  emailWorkspaceSettingsOutputSchema,
  emailWorkspaceSettingsUpdateInputSchema,
} from "@cairnly/core";
import { createGoogleOAuthClient, gmailConsentUrl } from "@cairnly/email";
import { createId } from "@paralleldrive/cuid2";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createContactRepository } from "../repositories/contact-repository";
import { createEmailRepository } from "../repositories/email-repository";
import { createEventRepository } from "../repositories/event-repository";
import { createWorkspaceRepository } from "../repositories/workspace-repository";
import { createEmailService } from "../services/email-service";
import { protectedProcedure, router } from "../trpc";

function mapEmailError(e: unknown): TRPCError {
  const code =
    typeof e === "object" &&
    e !== null &&
    "message" in e &&
    typeof e.message === "string"
      ? e.message
      : "unknown";

  if (code === "viewer_forbidden") {
    return new TRPCError({
      code: "FORBIDDEN",
      message: "You cannot perform this action.",
    });
  }
  if (code === "email_disabled") {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Email is disabled for this workspace.",
    });
  }
  if (code === "smtp_not_configured") {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "SMTP is not configured (set CAIRNLY_SMTP_HOST and related env vars).",
    });
  }
  if (code === "contact_not_found" || code === "account_not_found") {
    return new TRPCError({ code: "NOT_FOUND", message: "Resource not found." });
  }

  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Email operation failed.",
  });
}

const gmailAuthUrlOutputSchema = z.object({
  url: z.string().url(),
});

export const emailRouter = router({
  accounts: router({
    list: protectedProcedure
      .output(emailListAccountsOutputSchema)
      .query(async ({ ctx }) => {
        const emailRepo = createEmailRepository(ctx.db);
        const workspaceRepo = createWorkspaceRepository(ctx.db);
        const contactRepo = createContactRepository(ctx.db);
        const eventRepo = createEventRepository(ctx.db);
        const svc = createEmailService({
          db: ctx.db,
          emailRepo,
          workspaceRepo,
          contactRepo,
          eventRepo,
        });
        return svc.listAccounts(ctx.user);
      }),

    createImap: protectedProcedure
      .input(emailAccountCreateImapInputSchema)
      .mutation(async ({ ctx, input }) => {
        const emailRepo = createEmailRepository(ctx.db);
        const workspaceRepo = createWorkspaceRepository(ctx.db);
        const contactRepo = createContactRepository(ctx.db);
        const eventRepo = createEventRepository(ctx.db);
        const svc = createEmailService({
          db: ctx.db,
          emailRepo,
          workspaceRepo,
          contactRepo,
          eventRepo,
        });
        try {
          return await svc.createImapAccount(ctx.user, input);
        } catch (e) {
          throw mapEmailError(e);
        }
      }),

    delete: protectedProcedure
      .input(emailAccountDeleteInputSchema)
      .mutation(async ({ ctx, input }) => {
        const emailRepo = createEmailRepository(ctx.db);
        const workspaceRepo = createWorkspaceRepository(ctx.db);
        const contactRepo = createContactRepository(ctx.db);
        const eventRepo = createEventRepository(ctx.db);
        const svc = createEmailService({
          db: ctx.db,
          emailRepo,
          workspaceRepo,
          contactRepo,
          eventRepo,
        });
        try {
          await svc.deleteAccount(ctx.user, input.id);
          return { ok: true as const };
        } catch (e) {
          throw mapEmailError(e);
        }
      }),
  }),

  gmailAuthUrl: protectedProcedure
    .output(gmailAuthUrlOutputSchema)
    .query(async ({ ctx }) => {
      const oauth = createGoogleOAuthClient();
      if (!oauth) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Google OAuth is not configured (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI).",
        });
      }

      const body = Buffer.from(
        JSON.stringify({
          workspaceId: ctx.user.workspaceId,
          userId: ctx.user.id,
          nonce: createId(),
          exp: Date.now() + 600_000,
        }),
        "utf8",
      ).toString("base64url");
      const secret = process.env.BETTER_AUTH_SECRET ?? "dev-gmail-state";
      const sig = createHmac("sha256", secret).update(body).digest("base64url");
      const state = `${body}.${sig}`;

      return { url: gmailConsentUrl(oauth, state) };
    }),

  workspaceSettings: router({
    get: protectedProcedure
      .output(emailWorkspaceSettingsOutputSchema)
      .query(async ({ ctx }) => {
        const emailRepo = createEmailRepository(ctx.db);
        const workspaceRepo = createWorkspaceRepository(ctx.db);
        const contactRepo = createContactRepository(ctx.db);
        const eventRepo = createEventRepository(ctx.db);
        const svc = createEmailService({
          db: ctx.db,
          emailRepo,
          workspaceRepo,
          contactRepo,
          eventRepo,
        });
        return svc.getWorkspaceEmailSettings(ctx.user);
      }),

    update: protectedProcedure
      .input(emailWorkspaceSettingsUpdateInputSchema)
      .mutation(async ({ ctx, input }) => {
        const emailRepo = createEmailRepository(ctx.db);
        const workspaceRepo = createWorkspaceRepository(ctx.db);
        const contactRepo = createContactRepository(ctx.db);
        const eventRepo = createEventRepository(ctx.db);
        const svc = createEmailService({
          db: ctx.db,
          emailRepo,
          workspaceRepo,
          contactRepo,
          eventRepo,
        });
        try {
          return await svc.updateWorkspaceEmailSettings(ctx.user, input);
        } catch (e) {
          throw mapEmailError(e);
        }
      }),
  }),

  listThreadsForContact: protectedProcedure
    .input(emailListThreadsInputSchema)
    .output(emailListThreadsOutputSchema)
    .query(async ({ ctx, input }) => {
      const emailRepo = createEmailRepository(ctx.db);
      const workspaceRepo = createWorkspaceRepository(ctx.db);
      const contactRepo = createContactRepository(ctx.db);
      const eventRepo = createEventRepository(ctx.db);
      const svc = createEmailService({
        db: ctx.db,
        emailRepo,
        workspaceRepo,
        contactRepo,
        eventRepo,
      });
      try {
        return await svc.listThreadsForContact(ctx.user, input.contactId);
      } catch (e) {
        throw mapEmailError(e);
      }
    }),

  sendToContact: protectedProcedure
    .input(emailSendToContactInputSchema)
    .output(emailSendOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const emailRepo = createEmailRepository(ctx.db);
      const workspaceRepo = createWorkspaceRepository(ctx.db);
      const contactRepo = createContactRepository(ctx.db);
      const eventRepo = createEventRepository(ctx.db);
      const svc = createEmailService({
        db: ctx.db,
        emailRepo,
        workspaceRepo,
        contactRepo,
        eventRepo,
      });
      try {
        return await svc.sendToContact(ctx.user, input);
      } catch (e) {
        throw mapEmailError(e);
      }
    }),
});
