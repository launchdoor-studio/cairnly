import { AppShell } from "@/components/app/AppShell";
import type { DashboardSummary } from "@/lib/dashboard-summary";
import { buildDashboardSummary } from "@/lib/dashboard-summary";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";

export const dynamic = "force-dynamic";

async function loadDashboard(): Promise<DashboardSummary | undefined> {
  if (!hasDatabaseUrl()) {
    return undefined;
  }

  try {
    const api = await getApiCaller();
    const [contactsWrap, dealsWrap, tasksWrap, eventsWrap] = await Promise.all([
      api.contacts.list({ limit: 100 }),
      api.deals.list({ limit: 200 }),
      api.tasks.list({ limit: 200, done: false }),
      api.events.list({ limit: 50 }),
    ]);

    return buildDashboardSummary({
      contacts: contactsWrap.contacts,
      deals: dealsWrap.deals,
      stages: dealsWrap.stages,
      tasks: tasksWrap.tasks,
      events: eventsWrap.events,
    });
  } catch {
    return undefined;
  }
}

export default async function Home() {
  const dashboard = await loadDashboard();

  return <AppShell dashboard={dashboard} />;
}
