import { z } from "zod";

export const eventSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  type: z.string().min(1),
  actorId: z.string().nullable(),
  contactId: z.string().nullable(),
  dealId: z.string().nullable(),
  taskId: z.string().nullable(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
});

export const eventListInputSchema = z.object({
  contactId: z.string().trim().optional(),
  dealId: z.string().trim().optional(),
  taskId: z.string().trim().optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export const eventCreateInputSchema = z.object({
  type: z.string().trim().min(1).default("manual_note"),
  contactId: z.string().trim().optional(),
  dealId: z.string().trim().optional(),
  taskId: z.string().trim().optional(),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const eventUpdateInputSchema = z.object({
  id: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

export const eventDeleteInputSchema = z.object({
  id: z.string().min(1),
});

export const eventListOutputSchema = z.object({
  events: z.array(eventSchema),
});

export const eventOutputSchema = z.object({
  event: eventSchema,
});

export type EventDto = z.infer<typeof eventSchema>;
export type EventListInput = z.infer<typeof eventListInputSchema>;
export type EventCreateInput = z.infer<typeof eventCreateInputSchema>;
export type EventUpdateInput = z.infer<typeof eventUpdateInputSchema>;
export type EventDeleteInput = z.infer<typeof eventDeleteInputSchema>;
