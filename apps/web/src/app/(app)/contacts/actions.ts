"use server";

import type { ContactCreateInput, ContactUpdateInput } from "@cairnly/core";
import { revalidatePath } from "next/cache";

import type { ContactMutationResult } from "@/lib/contact-mutations";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";

export async function createContactAction(
  input: ContactCreateInput,
): Promise<ContactMutationResult> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL is not configured." };
  }

  try {
    const api = await getApiCaller();
    await api.contacts.create(input);
    revalidatePath("/contacts");
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not create contact." };
  }
}

export async function updateContactAction(
  input: ContactUpdateInput,
): Promise<ContactMutationResult> {
  if (!hasDatabaseUrl()) {
    return { ok: false, message: "DATABASE_URL is not configured." };
  }

  try {
    const api = await getApiCaller();
    await api.contacts.update(input);
    revalidatePath("/contacts");
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not update contact." };
  }
}
