import { z } from "zod";

export const leadFormSubmitInputSchema = z.object({
  slug: z.string().trim().min(1).max(200),
  name: z.string().trim().min(1).max(500),
  email: z.string().trim().email().max(500),
  company: z.string().trim().max(500).optional(),
  message: z.string().trim().max(10_000).optional(),
  /** Honeypot: bots fill this; silently accept without writing. */
  website: z.string().max(500).optional(),
});

export const leadFormSubmitOutputSchema = z.object({
  ok: z.literal(true),
});

export type LeadFormSubmitInput = z.infer<typeof leadFormSubmitInputSchema>;
