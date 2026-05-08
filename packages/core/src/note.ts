import { z } from "zod";

export const noteSchema = z.object({
  id: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().nullable(),
  bodyMd: z.string(),
  contactId: z.string().nullable(),
  dealId: z.string().nullable(),
  authorId: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const noteListInputSchema = z.object({
  contactId: z.string().trim().optional(),
  dealId: z.string().trim().optional(),
  limit: z.number().int().min(1).max(200).default(100),
});

export const noteCreateInputSchema = z.object({
  title: z.string().trim().optional(),
  bodyMd: z.string().trim().min(1),
  contactId: z.string().trim().optional(),
  dealId: z.string().trim().optional(),
});

export const noteUpdateInputSchema = noteCreateInputSchema.partial().extend({
  id: z.string().min(1),
});

export const noteDeleteInputSchema = z.object({
  id: z.string().min(1),
});

export const noteListOutputSchema = z.object({
  notes: z.array(noteSchema),
});

export const noteOutputSchema = z.object({
  note: noteSchema,
});

export type NoteDto = z.infer<typeof noteSchema>;
export type NoteListInput = z.infer<typeof noteListInputSchema>;
export type NoteCreateInput = z.infer<typeof noteCreateInputSchema>;
export type NoteUpdateInput = z.infer<typeof noteUpdateInputSchema>;
export type NoteDeleteInput = z.infer<typeof noteDeleteInputSchema>;
