import { z } from "zod";

export const contactTypeSchema = z.enum(["person", "company"]);
export const contactScoreSchema = z.enum(["hot", "warm", "cold", "unknown"]);

export const contactSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  type: contactTypeSchema,
  name: z.string().min(1),
  primaryEmail: z.string().email().nullable(),
  primaryPhone: z.string().nullable(),
  companyId: z.string().nullable(),
  ownerId: z.string().nullable(),
  score: contactScoreSchema,
  customFields: z.record(z.string(), z.unknown()),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const contactListInputSchema = z.object({
  search: z.string().trim().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const contactCreateInputSchema = z.object({
  type: contactTypeSchema.default("person"),
  name: z.string().trim().min(1),
  primaryEmail: z.string().trim().email().optional(),
  primaryPhone: z.string().trim().optional(),
  companyId: z.string().trim().optional(),
  ownerId: z.string().trim().optional(),
  score: contactScoreSchema.default("unknown"),
  customFields: z.record(z.string(), z.unknown()).default({}),
});

export const contactUpdateInputSchema = contactCreateInputSchema.partial().extend({
  id: z.string().min(1),
});

export const contactDeleteInputSchema = z.object({
  id: z.string().min(1),
});

export const contactListOutputSchema = z.object({
  contacts: z.array(contactSchema),
});

export const contactOutputSchema = z.object({
  contact: contactSchema,
});

export type ContactDto = z.infer<typeof contactSchema>;
export type ContactListInput = z.infer<typeof contactListInputSchema>;
export type ContactCreateInput = z.infer<typeof contactCreateInputSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateInputSchema>;
export type ContactDeleteInput = z.infer<typeof contactDeleteInputSchema>;
