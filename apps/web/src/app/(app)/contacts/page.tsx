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

async function getPrimaryContactTimeline(contactId: string) {
  if (!hasDatabaseUrl()) {
    return undefined;
  }

  try {
    const api = await getApiCaller();
    const settled = await Promise.allSettled([
      api.events.list({ contactId, limit: 100 }),
      api.email.listThreadsForContact({ contactId }),
    ]);

    const events = settled[0].status === "fulfilled" ? settled[0].value.events : [];
    const emailThreads =
      settled[1].status === "fulfilled" ? settled[1].value.threads : [];

    return { events, emailThreads };
  } catch {
    return undefined;
  }
}

export default async function ContactsPage() {
  const contacts = await getContacts();
  const contactTimeline = contacts[0]
    ? await getPrimaryContactTimeline(contacts[0].id)
    : undefined;

  return (
    <AppShell
      contactCreateAction={createContactAction}
      contactUpdateAction={updateContactAction}
      data={{ contacts, contactTimeline }}
    />
  );
}
