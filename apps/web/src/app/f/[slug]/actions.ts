"use server";

import type { LeadFormSubmitInput } from "@cairnly/core";

import type { MutationResult } from "@/lib/app-data";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";

export async function submitLeadFormAction(
  input: LeadFormSubmitInput,
): Promise<MutationResult> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "This form cannot accept submissions right now." };
  }

  try {
    const api = await getApiCaller();
    await api.leadForm.submit(input);
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Something went wrong. Check the link or try again in a moment.",
    };
  }
}
