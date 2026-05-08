"use server";

import {
  contactImportCommitInputSchema,
  contactImportParseInputSchema,
  contactImportPreviewInputSchema,
} from "@cairnly/core";
import { revalidatePath } from "next/cache";

import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";

export async function parseContactImportCsvAction(content: unknown) {
  if (!hasDatabaseUrl()) {
    return { ok: false as const, message: "DATABASE_URL is not configured." };
  }

  const parsed = contactImportParseInputSchema.safeParse({ content });
  if (!parsed.success) {
    return { ok: false as const, message: "CSV exceeds the upload limit or input is invalid." };
  }

  try {
    const api = await getApiCaller();
    const out = await api.contacts.import.parse(parsed.data);
    return { ok: true as const, ...out };
  } catch {
    return { ok: false as const, message: "Could not parse this CSV." };
  }
}

export async function previewContactImportAction(input: {
  content: unknown;
  mapping: unknown;
}) {
  if (!hasDatabaseUrl()) {
    return { ok: false as const, message: "DATABASE_URL is not configured." };
  }

  const parsed = contactImportPreviewInputSchema.safeParse({
    content: input.content,
    mapping: input.mapping,
  });
  if (!parsed.success) {
    return { ok: false as const, message: "Invalid mapping or CSV payload." };
  }

  try {
    const api = await getApiCaller();
    const out = await api.contacts.import.preview(parsed.data);
    return { ok: true as const, ...out };
  } catch {
    return { ok: false as const, message: "Could not build dedupe preview." };
  }
}

export async function commitContactImportAction(input: {
  content: unknown;
  mapping: unknown;
  allowDuplicateRowIndices?: unknown;
}) {
  if (!hasDatabaseUrl()) {
    return { ok: false as const, message: "DATABASE_URL is not configured." };
  }

  const parsed = contactImportCommitInputSchema.safeParse({
    content: input.content,
    mapping: input.mapping,
    allowDuplicateRowIndices: input.allowDuplicateRowIndices ?? [],
  });
  if (!parsed.success) {
    return { ok: false as const, message: "Invalid commit payload." };
  }

  try {
    const api = await getApiCaller();
    const out = await api.contacts.import.commit(parsed.data);
    revalidatePath("/contacts");
    revalidatePath("/timeline");
    return { ok: true as const, ...out };
  } catch {
    return { ok: false as const, message: "Could not finish import." };
  }
}
