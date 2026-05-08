import { PublicBookingPage } from "@/components/scheduling/PublicBookingPage";
import { getApiCaller } from "@/server/api";
import { hasDatabaseUrl } from "@/server/db";
import { createBookingAction } from "./actions";

export const dynamic = "force-dynamic";

async function getAvailability(handle: string) {
  if (!hasDatabaseUrl()) {
    return undefined;
  }

  try {
    const api = await getApiCaller();
    const from = new Date();
    const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
    return await api.scheduling.availability({ slug: handle, from, to });
  } catch {
    return undefined;
  }
}

export default async function SchedulingLinkPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const availability = await getAvailability(handle);

  return (
    <PublicBookingPage
      availability={availability}
      createBookingAction={createBookingAction}
      handle={handle}
    />
  );
}
