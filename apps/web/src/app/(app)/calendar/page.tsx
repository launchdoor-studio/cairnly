import { AppShell } from "@/components/app/AppShell";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";

export const dynamic = "force-dynamic";

async function getCalendarData() {
  if (!hasDatabaseUrl()) {
    return {};
  }

  try {
    const api = await getApiCaller();
    const now = new Date();
    const to = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const availability = await api.scheduling.availability({
      slug: "aftaab",
      from: now,
      to,
    });
    return { scheduling: { slots: availability.slots } };
  } catch {
    return {};
  }
}

export default async function CalendarPage() {
  const data = await getCalendarData();

  return <AppShell appData={data} />;
}
