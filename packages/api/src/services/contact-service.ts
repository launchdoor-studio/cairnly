import {
  type ContactCreateInput,
  type ContactDeleteInput,
  type ContactDto,
  type ContactListInput,
  type ContactUpdateInput,
  err,
  ok,
  type Result,
} from "@cairnly/core";
import { createId } from "@paralleldrive/cuid2";
import type { SessionUser } from "../context";
import type { ContactRepository, ContactRow } from "../repositories/contact-repository";

type ContactServiceError = "contact_not_found" | "viewer_forbidden";

export type ContactService = {
  list(input: ContactListInput, user: SessionUser): Promise<Result<ContactDto[]>>;
  create(
    input: ContactCreateInput,
    user: SessionUser,
    options?: {
      telemetry?: { source: "csv_import"; csvRow: number };
    },
  ): Promise<Result<ContactDto>>;
  update(
    input: ContactUpdateInput,
    user: SessionUser,
  ): Promise<Result<ContactDto, ContactServiceError>>;
  delete(
    input: ContactDeleteInput,
    user: SessionUser,
  ): Promise<Result<ContactDto, ContactServiceError>>;
};

export function createContactService(repository: ContactRepository): ContactService {
  return {
    async list(input, user) {
      const rows = await repository.list({
        ...input,
        workspaceId: user.workspaceId,
      });

      return ok(rows.map(toContactDto));
    },

    async create(input, user, options) {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const contact = await repository.create({
        id: createId(),
        workspaceId: user.workspaceId,
        type: input.type,
        name: input.name,
        primaryEmail: input.primaryEmail ?? null,
        primaryPhone: input.primaryPhone ?? null,
        companyId: input.companyId ?? null,
        ownerId: input.ownerId ?? user.id,
        score: input.score,
        customFields: input.customFields,
      });

      const telemetry = options?.telemetry;
      const payload: Record<string, unknown> = {
        name: contact.name,
        type: contact.type,
      };
      if (telemetry?.source === "csv_import") {
        payload.source = "csv_import";
        payload.csvRow = telemetry.csvRow;
      }

      await repository.recordEvent({
        id: createId(),
        workspaceId: user.workspaceId,
        type: "contact_created",
        actorId: user.id,
        contactId: contact.id,
        payload,
      });

      return ok(toContactDto(contact));
    },

    async update(input, user) {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const { id, ...patch } = input;
      const contact = await repository.update({
        id,
        workspaceId: user.workspaceId,
        patch,
      });

      if (!contact) {
        return err("contact_not_found");
      }

      await repository.recordEvent({
        id: createId(),
        workspaceId: user.workspaceId,
        type: "contact_updated",
        actorId: user.id,
        contactId: contact.id,
        payload: {
          fields: Object.keys(patch),
        },
      });

      return ok(toContactDto(contact));
    },

    async delete(input, user) {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const deletedAt = new Date();
      const contact = await repository.softDelete({
        id: input.id,
        workspaceId: user.workspaceId,
        deletedAt,
      });

      if (!contact) {
        return err("contact_not_found");
      }

      await repository.recordEvent({
        id: createId(),
        workspaceId: user.workspaceId,
        type: "contact_deleted",
        actorId: user.id,
        contactId: contact.id,
        payload: {
          deletedAt: deletedAt.toISOString(),
        },
      });

      return ok(toContactDto(contact));
    },
  };
}

function toContactDto(contact: ContactRow): ContactDto {
  return {
    id: contact.id,
    workspaceId: contact.workspaceId,
    type: contact.type,
    name: contact.name,
    primaryEmail: contact.primaryEmail,
    primaryPhone: contact.primaryPhone,
    companyId: contact.companyId,
    ownerId: contact.ownerId,
    score: contact.score,
    customFields: contact.customFields,
    createdAt: contact.createdAt,
    updatedAt: contact.updatedAt,
  };
}
