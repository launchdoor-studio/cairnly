import {
  type EventCreateInput,
  type EventDeleteInput,
  type EventDto,
  type EventListInput,
  type EventUpdateInput,
  err,
  ok,
  type Result,
} from "@cairnly/core";
import { createId } from "@paralleldrive/cuid2";
import type { SessionUser } from "../context";
import type { EventRepository, EventRow } from "../repositories/event-repository";

type EventServiceError = "event_not_found" | "viewer_forbidden";

export function createEventService(repository: EventRepository) {
  return {
    async list(input: EventListInput, user: SessionUser): Promise<Result<EventDto[]>> {
      const rows = await repository.list({ ...input, workspaceId: user.workspaceId });
      return ok(rows.map(toEventDto));
    },

    async create(
      input: EventCreateInput,
      user: SessionUser,
    ): Promise<Result<EventDto, EventServiceError>> {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const event = await repository.create({
        id: createId(),
        workspaceId: user.workspaceId,
        type: input.type,
        actorId: user.id,
        contactId: input.contactId ?? null,
        dealId: input.dealId ?? null,
        taskId: input.taskId ?? null,
        payload: input.payload,
      });

      return ok(toEventDto(event));
    },

    async update(
      input: EventUpdateInput,
      user: SessionUser,
    ): Promise<Result<EventDto, EventServiceError>> {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const event = await repository.update({
        id: input.id,
        workspaceId: user.workspaceId,
        payload: input.payload,
      });

      if (!event) {
        return err("event_not_found");
      }

      return ok(toEventDto(event));
    },

    async delete(
      input: EventDeleteInput,
      user: SessionUser,
    ): Promise<Result<EventDto, EventServiceError>> {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const event = await repository.softDelete({
        id: input.id,
        workspaceId: user.workspaceId,
        deletedAt: new Date(),
      });

      if (!event) {
        return err("event_not_found");
      }

      return ok(toEventDto(event));
    },
  };
}

function toEventDto(event: EventRow): EventDto {
  return {
    id: event.id,
    workspaceId: event.workspaceId,
    type: event.type,
    actorId: event.actorId,
    contactId: event.contactId,
    dealId: event.dealId,
    taskId: event.taskId,
    payload: event.payload,
    createdAt: event.createdAt,
  };
}
