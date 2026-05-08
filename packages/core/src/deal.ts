import { z } from "zod";

export const dealStatusSchema = z.enum(["open", "won", "lost", "archived"]);

export const stageSchema = z.object({
  id: z.string().min(1),
  pipelineId: z.string().min(1),
  name: z.string().min(1),
  position: z.number().int(),
  probability: z.number().int().min(0).max(100),
});

export const dealSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  contactId: z.string().nullable(),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().min(3).max(3),
  expectedCloseDate: z.string().nullable(),
  ownerId: z.string().nullable(),
  status: dealStatusSchema,
  position: z.number().int(),
  lostReason: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const dealListInputSchema = z.object({
  search: z.string().trim().optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export const dealCreateInputSchema = z.object({
  title: z.string().trim().min(1),
  contactId: z.string().trim().optional(),
  pipelineId: z.string().trim().optional(),
  stageId: z.string().trim().optional(),
  amountCents: z.number().int().nonnegative().default(0),
  currency: z.string().trim().length(3).default("USD"),
  expectedCloseDate: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  status: dealStatusSchema.default("open"),
  position: z.number().int().default(0),
  lostReason: z.string().trim().max(2000).optional(),
});

export const dealUpdateInputSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(1).optional(),
  contactId: z.string().trim().optional(),
  pipelineId: z.string().trim().optional(),
  stageId: z.string().trim().optional(),
  amountCents: z.number().int().nonnegative().optional(),
  currency: z.string().trim().length(3).optional(),
  expectedCloseDate: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  status: dealStatusSchema.optional(),
  position: z.number().int().optional(),
  lostReason: z
    .union([z.string().trim().max(2000), z.literal(""), z.null()])
    .optional(),
});

export const dealMoveStageInputSchema = z.object({
  id: z.string().min(1),
  stageId: z.string().min(1),
  position: z.number().int().default(0),
});

export const dealDeleteInputSchema = z.object({
  id: z.string().min(1),
});

export const dealListOutputSchema = z.object({
  deals: z.array(dealSchema),
  stages: z.array(stageSchema),
});

export const dealOutputSchema = z.object({
  deal: dealSchema,
});

export type DealDto = z.infer<typeof dealSchema>;
export type StageDto = z.infer<typeof stageSchema>;
export type DealListInput = z.infer<typeof dealListInputSchema>;
export type DealCreateInput = z.infer<typeof dealCreateInputSchema>;
export type DealUpdateInput = z.infer<typeof dealUpdateInputSchema>;
export type DealMoveStageInput = z.infer<typeof dealMoveStageInputSchema>;
export type DealDeleteInput = z.infer<typeof dealDeleteInputSchema>;
