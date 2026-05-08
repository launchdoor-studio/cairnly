"use server";

import type {
  DealCreateInput,
  DealMoveStageInput,
  DealUpdateInput,
} from "@cairnly/core";
import { revalidatePath } from "next/cache";

import type { MutationResult } from "@/lib/app-data";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";

export async function createDealAction(
  input: DealCreateInput,
): Promise<MutationResult> {
  return runDealMutation(async () => {
    const api = await getApiCaller();
    await api.deals.create(input);
  });
}

export async function updateDealAction(
  input: DealUpdateInput,
): Promise<MutationResult> {
  return runDealMutation(async () => {
    const api = await getApiCaller();
    await api.deals.update(input);
  });
}

export async function moveDealStageAction(
  input: DealMoveStageInput,
): Promise<MutationResult> {
  return runDealMutation(async () => {
    const api = await getApiCaller();
    await api.deals.moveStage(input);
  });
}

async function runDealMutation(run: () => Promise<void>): Promise<MutationResult> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL is not configured." };
  }

  try {
    await run();
    revalidatePath("/deals");
    revalidatePath("/timeline");
    return { ok: true };
  } catch {
    return { ok: false, message: "Deal mutation failed." };
  }
}
