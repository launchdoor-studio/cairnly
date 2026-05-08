"use server";

import type { EventCreateInput, NoteCreateInput, NoteUpdateInput } from "@cairnly/core";
import { revalidatePath } from "next/cache";

import type { MutationResult } from "@/lib/app-data";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";

export async function createNoteAction(
  input: NoteCreateInput,
): Promise<MutationResult> {
  return runTimelineMutation(async () => {
    const api = await getApiCaller();
    await api.notes.create(input);
  });
}

export async function updateNoteAction(
  input: NoteUpdateInput,
): Promise<MutationResult> {
  return runTimelineMutation(async () => {
    const api = await getApiCaller();
    await api.notes.update(input);
  });
}

export async function createEventAction(
  input: EventCreateInput,
): Promise<MutationResult> {
  return runTimelineMutation(async () => {
    const api = await getApiCaller();
    await api.events.create(input);
  });
}

async function runTimelineMutation(run: () => Promise<void>): Promise<MutationResult> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL is not configured." };
  }

  try {
    await run();
    revalidatePath("/timeline");
    revalidatePath("/contacts");
    return { ok: true };
  } catch {
    return { ok: false, message: "Timeline mutation failed." };
  }
}
