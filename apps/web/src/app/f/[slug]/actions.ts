"use server";

import type { LeadFormSubmitInput } from "@cairnly/core";
import { TRPCError } from "@trpc/server";

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
  } catch (cause) {
    if (cause instanceof TRPCError && cause.code === "TOO_MANY_REQUESTS") {
      return {
        ok: false,
        message: cause.message || "Too many submissions. Try again later.",
      };
    }

    return {
      ok: false,
      message: "Something went wrong. Check the link or try again in a moment.",
    };
  }
}
