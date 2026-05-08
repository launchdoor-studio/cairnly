"use server";

import type { TaskCreateInput, TaskUpdateInput } from "@cairnly/core";
import { revalidatePath } from "next/cache";

import type { MutationResult } from "@/lib/app-data";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";

export async function createTaskAction(
  input: TaskCreateInput,
): Promise<MutationResult> {
  return runTaskMutation(async () => {
    const api = await getApiCaller();
    await api.tasks.create(input);
  });
}

export async function updateTaskAction(
  input: TaskUpdateInput,
): Promise<MutationResult> {
  return runTaskMutation(async () => {
    const api = await getApiCaller();
    await api.tasks.update(input);
  });
}

async function runTaskMutation(run: () => Promise<void>): Promise<MutationResult> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL is not configured." };
  }

  try {
    await run();
    revalidatePath("/tasks");
    revalidatePath("/timeline");
    return { ok: true };
  } catch {
    return { ok: false, message: "Task mutation failed." };
  }
}
