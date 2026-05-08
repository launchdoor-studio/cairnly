import {
  err,
  type NoteCreateInput,
  type NoteDeleteInput,
  type NoteDto,
  type NoteListInput,
  type NoteUpdateInput,
  ok,
  type Result,
} from "@cairnly/core";
import { createId } from "@paralleldrive/cuid2";
import type { SessionUser } from "../context";
import type { NoteRepository, NoteRow } from "../repositories/note-repository";

type NoteServiceError = "note_not_found" | "viewer_forbidden";

export function createNoteService(repository: NoteRepository) {
  return {
    async list(input: NoteListInput, user: SessionUser): Promise<Result<NoteDto[]>> {
      const rows = await repository.list({ ...input, workspaceId: user.workspaceId });
      return ok(rows.map(toNoteDto));
    },

    async create(
      input: NoteCreateInput,
      user: SessionUser,
    ): Promise<Result<NoteDto, NoteServiceError>> {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const note = await repository.create({
        id: createId(),
        workspaceId: user.workspaceId,
        title: input.title ?? null,
        bodyMd: input.bodyMd,
        contactId: input.contactId ?? null,
        dealId: input.dealId ?? null,
        authorId: user.id,
      });

      await repository.recordEvent({
        id: createId(),
        workspaceId: user.workspaceId,
        type: "note_created",
        actorId: user.id,
        contactId: note.contactId,
        dealId: note.dealId,
        taskId: null,
        payload: { noteId: note.id, title: note.title },
      });

      return ok(toNoteDto(note));
    },

    async update(
      input: NoteUpdateInput,
      user: SessionUser,
    ): Promise<Result<NoteDto, NoteServiceError>> {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const { id, ...patch } = input;
      const note = await repository.update({
        id,
        workspaceId: user.workspaceId,
        patch,
      });

      if (!note) {
        return err("note_not_found");
      }

      return ok(toNoteDto(note));
    },

    async delete(
      input: NoteDeleteInput,
      user: SessionUser,
    ): Promise<Result<NoteDto, NoteServiceError>> {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const note = await repository.softDelete({
        id: input.id,
        workspaceId: user.workspaceId,
        deletedAt: new Date(),
      });

      if (!note) {
        return err("note_not_found");
      }

      return ok(toNoteDto(note));
    },
  };
}

function toNoteDto(note: NoteRow): NoteDto {
  return {
    id: note.id,
    workspaceId: note.workspaceId,
    title: note.title,
    bodyMd: note.bodyMd,
    contactId: note.contactId,
    dealId: note.dealId,
    authorId: note.authorId,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  };
}
