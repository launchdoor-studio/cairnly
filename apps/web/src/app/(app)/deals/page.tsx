import { AppShell } from "@/components/app/AppShell";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";
import { createDealAction, moveDealStageAction, updateDealAction } from "./actions";

export const dynamic = "force-dynamic";

async function getDealsData() {
  if (!hasDatabaseUrl()) {
    return {};
  }

  try {
    const api = await getApiCaller();
    return await api.deals.list({ limit: 100 });
  } catch {
    return {};
  }
}

export default async function DealsPage() {
  const data = await getDealsData();

  return (
    <AppShell
      actions={{
        createDeal: createDealAction,
        moveDealStage: moveDealStageAction,
        updateDeal: updateDealAction,
      }}
      appData={data}
    />
  );
}
