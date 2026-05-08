import type { ContactCreateInput, ContactUpdateInput } from "@cairnly/core";

export type ContactMutationResult = { ok: true } | { ok: false; message: string };

export type ContactCreateAction = (
  input: ContactCreateInput,
) => Promise<ContactMutationResult>;

export type ContactUpdateAction = (
  input: ContactUpdateInput,
) => Promise<ContactMutationResult>;
