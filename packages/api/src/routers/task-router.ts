import {
  taskCreateInputSchema,
  taskDeleteInputSchema,
  taskListInputSchema,
  taskListOutputSchema,
  taskOutputSchema,
  taskUpdateInputSchema,
} from "@cairnly/core";
import { TRPCError } from "@trpc/server";

import { createTaskRepository } from "../repositories/task-repository";
import { createTaskService } from "../services/task-service";
import { protectedProcedure, router } from "../trpc";

export const taskRouter = router({
  list: protectedProcedure
    .input(taskListInputSchema)
    .output(taskListOutputSchema)
    .query(async ({ ctx, input }) => {
      const service = createTaskService(createTaskRepository(ctx.db));
      const result = await service.list(input, ctx.user);
      if (!result.ok) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
      return { tasks: result.value };
    }),

  create: protectedProcedure
    .input(taskCreateInputSchema)
    .output(taskOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createTaskService(createTaskRepository(ctx.db));
      const result = await service.create(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }
      return { task: result.value };
    }),

  update: protectedProcedure
    .input(taskUpdateInputSchema)
    .output(taskOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createTaskService(createTaskRepository(ctx.db));
      const result = await service.update(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }
      return { task: result.value };
    }),

  delete: protectedProcedure
    .input(taskDeleteInputSchema)
    .output(taskOutputSchema)
    .mutation(async ({ ctx, input }) => {
      const service = createTaskService(createTaskRepository(ctx.db));
      const result = await service.delete(input, ctx.user);
      if (!result.ok) {
        throw toTrpcError(result.error);
      }
      return { task: result.value };
    }),
});

function toTrpcError(error: string): TRPCError {
  if (error === "viewer_forbidden") {
    return new TRPCError({
      code: "FORBIDDEN",
      message: "Viewers cannot mutate tasks.",
    });
  }

  if (error === "task_not_found") {
    return new TRPCError({ code: "NOT_FOUND", message: "Task not found." });
  }

  return new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
}
