import { z } from "zod";

import {
  MAX_CONTACT_IMPORT_CSV_CHARS,
  MAX_CONTACT_IMPORT_DATA_ROWS,
} from "./constants";

export const CONTACT_IMPORT_FIELD_TARGETS = [
  "ignore",
  "name",
  "primaryEmail",
  "primaryPhone",
  "type",
  "score",
  "company",
  "source",
] as const;

export const contactImportFieldTargetSchema = z.enum(CONTACT_IMPORT_FIELD_TARGETS);

export type ContactImportFieldTarget = z.infer<typeof contactImportFieldTargetSchema>;

/** CSV header -> Cairnly import target field */
export const contactImportMappingSchema = z.record(
  z.string().min(1),
  contactImportFieldTargetSchema,
);

export type ContactImportMapping = z.infer<typeof contactImportMappingSchema>;

export const contactImportParseInputSchema = z.object({
  content: z.string().max(MAX_CONTACT_IMPORT_CSV_CHARS),
});

export const contactImportParseOutputSchema = z.object({
  headers: z.array(z.string()),
  previewRows: z.array(z.array(z.string())),
  totalDataRows: z.number().int().min(0),
  cappedRows: z.number().int().min(0),
  truncatedBySize: z.boolean(),
});

export const contactImportPreviewInputSchema = z.object({
  content: z.string().max(MAX_CONTACT_IMPORT_CSV_CHARS),
  mapping: contactImportMappingSchema,
});

export const contactImportConfidenceSchema = z.enum(["high", "medium"]);

export const contactImportDedupeSchema = z.object({
  rowIndex: z.number().int().nonnegative(),
  csvName: z.string(),
  csvEmail: z.string().nullable(),
  confidence: contactImportConfidenceSchema,
  matchedContactId: z.string().min(1),
  matchedName: z.string(),
  matchedEmail: z.string().nullable(),
});

export const contactImportPreviewOutputSchema = z.object({
  sampleMappedRows: z.array(
    z.object({
      rowIndex: z.number().int().nonnegative(),
      name: z.string(),
      primaryEmail: z.string().nullable(),
      primaryPhone: z.string().nullable(),
      score: z.string(),
      type: z.string(),
      company: z.string().nullable(),
      source: z.string().nullable(),
    }),
  ),
  duplicates: z.array(contactImportDedupeSchema),
  unmappedMandatoryNameRows: z.number().int().nonnegative(),
});

export const contactImportCommitInputSchema = z.object({
  content: z.string().max(MAX_CONTACT_IMPORT_CSV_CHARS),
  mapping: contactImportMappingSchema,
  /** Duplicate row indices user chose to still create as new contacts */
  allowDuplicateRowIndices: z.array(z.number().int().nonnegative()).default([]),
});

export const contactImportCommitOutputSchema = z.object({
  created: z.number().int().nonnegative(),
  skippedDuplicates: z.number().int().nonnegative(),
  skippedMissingName: z.number().int().nonnegative(),
  skippedOverCap: z.number().int().nonnegative(),
});

export function truncateImportRowCount(total: number): {
  capped: number;
  overCap: number;
} {
  if (total <= MAX_CONTACT_IMPORT_DATA_ROWS) {
    return { capped: total, overCap: 0 };
  }
  return {
    capped: MAX_CONTACT_IMPORT_DATA_ROWS,
    overCap: total - MAX_CONTACT_IMPORT_DATA_ROWS,
  };
}

export function normalizeDedupeEmail(value: string | undefined): string | null {
  const v = value?.trim().toLowerCase();
  if (!v?.includes("@")) {
    return null;
  }
  return v;
}

export function normalizeDedupeName(value: string | undefined): string | null {
  const v = value?.trim().toLowerCase().replace(/\s+/g, " ") ?? "";
  return v.length > 0 ? v : null;
}
