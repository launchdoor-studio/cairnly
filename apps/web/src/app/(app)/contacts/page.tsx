import { AppShell } from "@/components/app/AppShell";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";
import { createContactAction, updateContactAction } from "./actions";

export const dynamic = "force-dynamic";

async function getContacts() {
  if (!hasDatabaseUrl()) {
    return [];
  }

  try {
    const api = await getApiCaller();
    const result = await api.contacts.list({ limit: 50 });
    return result.contacts;
  } catch {
    return [];
  }
}

export default async function ContactsPage() {
  const contacts = await getContacts();

  return (
    <AppShell
      contactCreateAction={createContactAction}
      contactUpdateAction={updateContactAction}
      data={{ contacts }}
    />
  );
}
