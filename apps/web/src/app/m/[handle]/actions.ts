"use server";

import type { BookingCreateInput } from "@cairnly/core";
import { TRPCError } from "@trpc/server";
import { revalidatePath } from "next/cache";

import type { MutationResult } from "@/lib/app-data";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";

export async function createBookingAction(
  input: BookingCreateInput,
): Promise<MutationResult> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL is not configured." };
  }

  try {
    const api = await getApiCaller();
    await api.scheduling.book(input);
    revalidatePath(`/m/${input.slug}`);
    revalidatePath("/calendar");
    return { ok: true };
  } catch (cause) {
    if (cause instanceof TRPCError && cause.code === "TOO_MANY_REQUESTS") {
      return {
        ok: false,
        message: cause.message || "Too many bookings. Try again later.",
      };
    }

    return { ok: false, message: "This time is no longer available." };
  }
}
