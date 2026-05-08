import { AppShell } from "@/components/app/AppShell";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";
import { createEventAction, createNoteAction, updateNoteAction } from "./actions";

export const dynamic = "force-dynamic";

async function getTimelineData() {
  if (!hasDatabaseUrl()) {
    return {};
  }

  try {
    const api = await getApiCaller();
    const [events, notes] = await Promise.all([
      api.events.list({ limit: 100 }),
      api.notes.list({ limit: 100 }),
    ]);
    return { events: events.events, notes: notes.notes };
  } catch {
    return {};
  }
}

export default async function TimelinePage() {
  const data = await getTimelineData();

  return (
    <AppShell
      actions={{
        createEvent: createEventAction,
        createNote: createNoteAction,
        updateNote: updateNoteAction,
      }}
      appData={data}
    />
  );
}
