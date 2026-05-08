import {
  CONTACT_IMPORT_PREVIEW_ROW_CAP,
  contactCreateInputSchema,
  normalizeDedupeEmail,
  normalizeDedupeName,
  truncateImportRowCount,
  type ContactImportMapping,
} from "@cairnly/core";
import { parse } from "csv-parse/sync";
import { createId } from "@paralleldrive/cuid2";
import { z } from "zod";

import type { SessionUser } from "../context";
import type { ContactRepository } from "../repositories/contact-repository";
import type { ContactService } from "./contact-service";

const emailValidator = z.string().email();

export type ContactImportParseOutput = {
  headers: string[];
  previewRows: string[][];
  totalDataRows: number;
  cappedRows: number;
  truncatedBySize: boolean;
};

export type ContactImportPreviewOutput = {
  sampleMappedRows: {
    rowIndex: number;
    name: string;
    primaryEmail: string | null;
    primaryPhone: string | null;
    score: string;
    type: string;
    company: string | null;
    source: string | null;
  }[];
  duplicates: {
    rowIndex: number;
    csvName: string;
    csvEmail: string | null;
    confidence: "high" | "medium";
    matchedContactId: string;
    matchedName: string;
    matchedEmail: string | null;
  }[];
  unmappedMandatoryNameRows: number;
};

export type ContactImportCommitOutput = {
  created: number;
  skippedDuplicates: number;
  skippedMissingName: number;
  skippedOverCap: number;
};

type DedupeIndexes = {
  byEmail: Map<string, { id: string; name: string; primaryEmail: string | null }>;
  nameCluster: Map<
    string,
    { id: string; name: string; primaryEmail: string | null }[]
  >;
};

function dedupeHeaderLabels(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, idx) => {
    const base =
      h.trim().length === 0 ? `__column_${idx}` : h.trim().replace(/\s+/g, " ");
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base} (${n})`;
  });
}

function parseContactImportSheet(content: string): { headers: string[]; rows: string[][] } {
  let records: string[][];
  try {
    records = parse(content, {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      trim: true,
    }) as string[][];
  } catch {
    throw new ContactImportParseError("invalid_csv");
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = dedupeHeaderLabels(records[0] ?? []);
  const rows = records.slice(1).map((r) => [...r]);
  return { headers, rows };
}

export class ContactImportParseError extends Error {
  readonly code: "invalid_csv";

  constructor(code: "invalid_csv") {
    super(code);
    this.code = code;
  }
}

function columnIndex(headers: string[], label: string): number {
  const i = headers.indexOf(label);
  return i;
}

function pickCell(row: string[], index: number): string {
  if (index < 0 || index >= row.length) {
    return "";
  }
  return row[index] ?? "";
}

function splitNamePhoneEmailHeuristic(
  raw: string,
  mapping: ContactImportMapping,
  headers: string[],
): { fillName?: string; fillEmail?: string; fillPhone?: string } {
  /** If user mapped a single "combined" column into name, attempt to pull email/phone when unmapped. */
  const hasDedicated =
    Object.values(mapping).includes("primaryEmail") ||
    Object.values(mapping).includes("primaryPhone");

  if (hasDedicated) {
    return {};
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return {};
  }

  const emailMatch = trimmed.match(/[^\s,]+@[^\s,]+/);
  const email = emailMatch ? emailMatch[0] : undefined;
  let rest = email ? trimmed.replace(email, " ").replace(/,/g, " ") : trimmed;

  const digits = rest.replace(/\D/g, "");
  const phone =
    digits.length >= 10
      ? rest
          .split(/\s+/)
          .find((p) => p.replace(/\D/g, "").length >= 10)
      : undefined;

  if (phone) {
    rest = rest.replace(phone, " ");
  }

  const name = rest.replace(/\s+/g, " ").trim();
  const out: { fillName?: string; fillEmail?: string; fillPhone?: string } = {};
  if (name.length > 0) {
    out.fillName = name;
  }
  if (email) {
    out.fillEmail = email;
  }
  if (phone) {
    out.fillPhone = phone;
  }

  return out;
}

function normalizeEmailField(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) {
    return undefined;
  }
  const r = emailValidator.safeParse(t);
  return r.success ? t.toLowerCase() : undefined;
}

function normalizePhoneField(raw: string): string | undefined {
  const t = raw.trim();
  return t.length > 0 ? t : undefined;
}

function parseScoreField(raw: string): "hot" | "warm" | "cold" | "unknown" {
  switch (raw.trim().toLowerCase()) {
    case "hot":
      return "hot";
    case "warm":
      return "warm";
    case "cold":
      return "cold";
    case "unknown":
      return "unknown";
    default:
      return "unknown";
  }
}

function parseTypeField(raw: string): "person" | "company" {
  return raw.trim().toLowerCase() === "company" ? "company" : "person";
}

function buildDedupeIndexes(
  rows: { id: string; name: string; primaryEmail: string | null }[],
): DedupeIndexes {
  const byEmail = new Map<string, { id: string; name: string; primaryEmail: string | null }>();
  const nameCluster = new Map<
    string,
    { id: string; name: string; primaryEmail: string | null }[]
  >();

  for (const row of rows) {
    const e = normalizeDedupeEmail(row.primaryEmail ?? undefined);
    if (e) {
      byEmail.set(e, row);
    }
    const nn = normalizeDedupeName(row.name);
    if (nn) {
      const bucket = nameCluster.get(nn);
      if (bucket) {
        bucket.push(row);
      } else {
        nameCluster.set(nn, [row]);
      }
    }
  }

  return { byEmail, nameCluster };
}

function matchDuplicate(
  dedupe: DedupeIndexes,
  csvName: string,
  csvEmailNorm: string | null,
):
  | { confidence: "high" | "medium"; matched: { id: string; name: string; primaryEmail: string | null } }
  | undefined {
  if (csvEmailNorm) {
    const hi = dedupe.byEmail.get(csvEmailNorm);
    if (hi) {
      return { confidence: "high", matched: hi };
    }
  }

  const nameKey = normalizeDedupeName(csvName);
  if (nameKey) {
    const bucket = dedupe.nameCluster.get(nameKey);
    const matched = bucket?.[0];
    if (matched) {
      return { confidence: "medium", matched };
    }
  }

  return undefined;
}

function mapRow(
  headers: string[],
  row: string[],
  rowIndex: number,
  mapping: ContactImportMapping,
): {
  rowIndex: number;
  name: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  score: string;
  type: string;
  company: string | null;
  source: string | null;
} | null {
  let name = "";
  let primaryEmail: string | undefined;
  let primaryPhone: string | undefined;
  let typeRaw = "";
  let scoreRaw = "";
  let company: string | undefined;
  let source: string | undefined;

  let combinedRaw = "";

  for (const [column, target] of Object.entries(mapping)) {
    const idx = columnIndex(headers, column);
    const cell = pickCell(row, idx);

    switch (target) {
      case "ignore":
        break;
      case "name":
        combinedRaw = cell;
        name = cell.trim();
        break;
      case "primaryEmail":
        primaryEmail = normalizeEmailField(cell);
        break;
      case "primaryPhone":
        primaryPhone = normalizePhoneField(cell);
        break;
      case "type":
        typeRaw = cell;
        break;
      case "score":
        scoreRaw = cell;
        break;
      case "company":
        company = cell.trim().length > 0 ? cell.trim() : undefined;
        break;
      case "source":
        source = cell.trim().length > 0 ? cell.trim() : undefined;
        break;
      default:
        break;
    }
  }

  const heur = splitNamePhoneEmailHeuristic(combinedRaw, mapping, headers);
  if (!name.trim() && heur.fillName) {
    name = heur.fillName;
  }
  if (!primaryEmail && heur.fillEmail) {
    primaryEmail = normalizeEmailField(heur.fillEmail);
  }
  if (!primaryPhone && heur.fillPhone) {
    primaryPhone = normalizePhoneField(heur.fillPhone);
  }

  return {
    rowIndex,
    name: name.trim(),
    primaryEmail: primaryEmail ?? null,
    primaryPhone: primaryPhone ?? null,
    score: parseScoreField(scoreRaw),
    type: parseTypeField(typeRaw),
    company: company ?? null,
    source: source ?? null,
  };
}

export function parseContactImportContent(content: string): ContactImportParseOutput {
  const { headers, rows } = parseContactImportSheet(content);
  const { capped } = truncateImportRowCount(rows.length);

  const previewRows = rows.slice(0, CONTACT_IMPORT_PREVIEW_ROW_CAP).map((r) =>
    headers.map((_h, i) => pickCell(r, i)),
  );

  return {
    headers,
    previewRows,
    totalDataRows: rows.length,
    cappedRows: capped,
    truncatedBySize: false,
  };
}

export function createContactImportService(deps: {
  repository: ContactRepository;
  contactService: ContactService;
}) {
  return {
    async preview(
      workspaceId: string,
      content: string,
      mapping: ContactImportMapping,
    ): Promise<ContactImportPreviewOutput> {
      const { headers, rows } = parseContactImportSheet(content);

      const existingRows = await deps.repository.listDedupeCandidates({
        workspaceId,
      });

      const dedupe = buildDedupeIndexes(existingRows);

      let unmappedMandatoryNameRows = 0;
      const duplicates: ContactImportPreviewOutput["duplicates"] = [];
      const sampleMappedRows: ContactImportPreviewOutput["sampleMappedRows"] = [];

      const { capped } = truncateImportRowCount(rows.length);

      const seenDup = new Set<number>();

      for (let i = 0; i < rows.length && i < capped; i++) {
        const mapped = mapRow(headers, rows[i] ?? [], i, mapping);

        if (!mapped) {
          continue;
        }

        if (mapped.name.trim().length === 0) {
          unmappedMandatoryNameRows += 1;
        }

        const csvNorm = normalizeDedupeEmail(mapped.primaryEmail ?? undefined);
        const match = matchDuplicate(dedupe, mapped.name, csvNorm);

        if (match && !seenDup.has(mapped.rowIndex)) {
          seenDup.add(mapped.rowIndex);
          duplicates.push({
            rowIndex: mapped.rowIndex,
            csvName: mapped.name || "(empty name)",
            csvEmail: mapped.primaryEmail,
            confidence: match.confidence,
            matchedContactId: match.matched.id,
            matchedName: match.matched.name,
            matchedEmail: match.matched.primaryEmail,
          });
        }

        if (mapped.name.trim().length > 0 && sampleMappedRows.length < 6) {
          sampleMappedRows.push(mapped);
        }
      }

      return {
        sampleMappedRows,
        duplicates,
        unmappedMandatoryNameRows,
      };
    },

    async commit(
      user: SessionUser,
      content: string,
      mapping: ContactImportMapping,
      allowDuplicateRowIndices: number[],
    ): Promise<ContactImportCommitOutput> {
      const { headers, rows } = parseContactImportSheet(content);
      const { capped, overCap } = truncateImportRowCount(rows.length);

      const allow = new Set(allowDuplicateRowIndices);

      const existingRows = await deps.repository.listDedupeCandidates({
        workspaceId: user.workspaceId,
      });
      const dedupe = buildDedupeIndexes(existingRows);

      let created = 0;
      let skippedDuplicates = 0;
      let skippedMissingName = 0;

      for (let i = 0; i < rows.length && i < capped; i++) {
        const mapped = mapRow(headers, rows[i] ?? [], i, mapping);
        if (!mapped || mapped.name.trim().length === 0) {
          skippedMissingName += 1;
          continue;
        }

        const csvNorm = normalizeDedupeEmail(mapped.primaryEmail ?? undefined);
        const match = matchDuplicate(dedupe, mapped.name, csvNorm);
        if (match && !allow.has(mapped.rowIndex)) {
          skippedDuplicates += 1;
          continue;
        }

        const customFields: Record<string, unknown> = {};
        if (mapped.company) {
          customFields.company = mapped.company;
        }
        if (mapped.source) {
          customFields.source = mapped.source;
        }

        const candidate = {
          type: mapped.type,
          name: mapped.name.trim(),
          primaryEmail: mapped.primaryEmail ?? undefined,
          primaryPhone: mapped.primaryPhone ?? undefined,
          score: mapped.score,
          customFields,
        };

        const parsed = contactCreateInputSchema.safeParse(candidate);
        if (!parsed.success) {
          skippedMissingName += 1;
          continue;
        }

        const createdResult = await deps.contactService.create(parsed.data, user, {
          telemetry: { source: "csv_import", csvRow: mapped.rowIndex },
        });

        if (!createdResult.ok) {
          skippedMissingName += 1;
          continue;
        }

        created += 1;

        const dto = createdResult.value;
        const emailKey = normalizeDedupeEmail(dto.primaryEmail ?? undefined);
        if (emailKey) {
          dedupe.byEmail.set(emailKey, {
            id: dto.id,
            name: dto.name,
            primaryEmail: dto.primaryEmail,
          });
        }
        const nn = normalizeDedupeName(dto.name);
        if (nn) {
          const bucket = dedupe.nameCluster.get(nn) ?? [];
          bucket.push({
            id: dto.id,
            name: dto.name,
            primaryEmail: dto.primaryEmail,
          });
          dedupe.nameCluster.set(nn, bucket);
        }
      }

      if (created > 0 || skippedDuplicates > 0 || skippedMissingName > 0 || overCap > 0) {
        await deps.repository.recordEvent({
          id: createId(),
          workspaceId: user.workspaceId,
          type: "csv_import_committed",
          actorId: user.id,
          contactId: null,
          dealId: null,
          taskId: null,
          payload: {
            created,
            skippedDuplicates,
            skippedMissingName,
            skippedOverCap: overCap,
          },
        });
      }

      return {
        created,
        skippedDuplicates,
        skippedMissingName,
        skippedOverCap: overCap,
      };
    },
  };
}
