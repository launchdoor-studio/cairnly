import type { LeadFormSubmitInput } from "@cairnly/core";
import { beforeEach, describe, expect, it } from "vitest";

import type { ContactRepository, ContactRow } from "../repositories/contact-repository";
import type { FormRepository } from "../repositories/form-repository";
import { createLeadFormService } from "./lead-form-service";

describe("createLeadFormService.submit", () => {
  beforeEach(() => {
    process.env.CAIRNLY_DEFAULT_WORKSPACE_ID = "ws_test";
  });

  it("stores contact payload when slug matches workspace form", async () => {
    const now = new Date();
    let createdContactPayload: Parameters<ContactRepository["create"]>[0] | undefined;

    const formRepo: FormRepository = {
      async findBySlug({ workspaceId: ws, slug }) {
        if (ws !== "ws_test" || slug !== "intake") {
          return undefined;
        }
        return {
          id: "form_intake_test",
          workspaceId: ws,
          name: "Test",
          slug: "intake",
          fieldsJson: [],
          redirectUrl: null,
          createdAt: now,
          updatedAt: now,
        };
      },
      async insertSubmission() {},
    };

    const contactRepo = {
      async create(
        input: Parameters<ContactRepository["create"]>[0],
      ): Promise<ContactRow> {
        createdContactPayload = input;
        return input as ContactRow;
      },
      async recordEvent() {},
    } as unknown as ContactRepository;

    const svc = createLeadFormService(formRepo, contactRepo);
    const input: LeadFormSubmitInput = {
      slug: "intake",
      name: "Ada Lovelace",
      email: "ada@example.com",
      company: "Analytical Engines",
      message: "Interested in Cairnly",
    };

    const result = await svc.submit(input);

    expect(result.ok).toBe(true);
    expect(createdContactPayload?.name).toBe("Ada Lovelace");
    expect(createdContactPayload?.workspaceId).toBe("ws_test");
  });

  it("returns form_not_found when slug is unknown", async () => {
    const formRepo: FormRepository = {
      async findBySlug() {
        return undefined;
      },
      async insertSubmission() {},
    };

    const contactRepo = {
      async create(): Promise<ContactRow> {
        throw new Error("unexpected create");
      },
      async recordEvent() {},
    } as unknown as ContactRepository;

    const svc = createLeadFormService(formRepo, contactRepo);
    const result = await svc.submit({
      slug: "missing",
      name: "X",
      email: "y@example.com",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("form_not_found");
  });
});
