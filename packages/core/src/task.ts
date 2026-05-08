import { z } from "zod";

export const taskSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  dueAt: z.date().nullable(),
  doneAt: z.date().nullable(),
  contactId: z.string().nullable(),
  dealId: z.string().nullable(),
  ownerId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const taskListInputSchema = z.object({
  limit: z.number().int().min(1).max(200).default(100),
  done: z.boolean().optional(),
});

export const taskCreateInputSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().optional(),
  dueAt: z.date().optional(),
  contactId: z.string().trim().optional(),
  dealId: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
});

export const taskUpdateInputSchema = taskCreateInputSchema.partial().extend({
  id: z.string().min(1),
  done: z.boolean().optional(),
});

export const taskDeleteInputSchema = z.object({
  id: z.string().min(1),
});

export const taskListOutputSchema = z.object({
  tasks: z.array(taskSchema),
});

export const taskOutputSchema = z.object({
  task: taskSchema,
});

export type TaskDto = z.infer<typeof taskSchema>;
export type TaskListInput = z.infer<typeof taskListInputSchema>;
export type TaskCreateInput = z.infer<typeof taskCreateInputSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateInputSchema>;
export type TaskDeleteInput = z.infer<typeof taskDeleteInputSchema>;
