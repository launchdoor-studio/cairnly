import {
  err,
  ok,
  type Result,
  type TaskCreateInput,
  type TaskDeleteInput,
  type TaskDto,
  type TaskListInput,
  type TaskUpdateInput,
} from "@cairnly/core";
import { createId } from "@paralleldrive/cuid2";
import type { SessionUser } from "../context";
import type { TaskRepository, TaskRow } from "../repositories/task-repository";

type TaskServiceError = "task_not_found" | "viewer_forbidden";

export function createTaskService(repository: TaskRepository) {
  return {
    async list(input: TaskListInput, user: SessionUser): Promise<Result<TaskDto[]>> {
      const rows = await repository.list({ ...input, workspaceId: user.workspaceId });
      return ok(rows.map(toTaskDto));
    },

    async create(
      input: TaskCreateInput,
      user: SessionUser,
    ): Promise<Result<TaskDto, TaskServiceError>> {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const task = await repository.create({
        id: createId(),
        workspaceId: user.workspaceId,
        title: input.title,
        description: input.description ?? null,
        dueAt: input.dueAt ?? null,
        doneAt: null,
        contactId: input.contactId ?? null,
        dealId: input.dealId ?? null,
        ownerId: input.ownerId ?? user.id,
      });

      await repository.recordEvent({
        id: createId(),
        workspaceId: user.workspaceId,
        type: "task_created",
        actorId: user.id,
        contactId: task.contactId,
        dealId: task.dealId,
        taskId: task.id,
        payload: { title: task.title },
      });

      return ok(toTaskDto(task));
    },

    async update(
      input: TaskUpdateInput,
      user: SessionUser,
    ): Promise<Result<TaskDto, TaskServiceError>> {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const { id, ...patch } = input;
      const task = await repository.update({
        id,
        workspaceId: user.workspaceId,
        patch,
      });

      if (!task) {
        return err("task_not_found");
      }

      await repository.recordEvent({
        id: createId(),
        workspaceId: user.workspaceId,
        type: "task_updated",
        actorId: user.id,
        contactId: task.contactId,
        dealId: task.dealId,
        taskId: task.id,
        payload: { fields: Object.keys(patch) },
      });

      return ok(toTaskDto(task));
    },

    async delete(
      input: TaskDeleteInput,
      user: SessionUser,
    ): Promise<Result<TaskDto, TaskServiceError>> {
      if (user.role === "viewer") {
        return err("viewer_forbidden");
      }

      const deletedAt = new Date();
      const task = await repository.softDelete({
        id: input.id,
        workspaceId: user.workspaceId,
        deletedAt,
      });

      if (!task) {
        return err("task_not_found");
      }

      return ok(toTaskDto(task));
    },
  };
}

function toTaskDto(task: TaskRow): TaskDto {
  return {
    id: task.id,
    workspaceId: task.workspaceId,
    title: task.title,
    description: task.description,
    dueAt: task.dueAt,
    doneAt: task.doneAt,
    contactId: task.contactId,
    dealId: task.dealId,
    ownerId: task.ownerId,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
