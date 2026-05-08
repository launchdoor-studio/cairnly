import type { Db } from "@cairnly/db";

import { createEmailServiceFromDb } from "../services/email-service";

export async function processEmailImapSyncAllJob(db: Db): Promise<void> {
  const svc = createEmailServiceFromDb(db);
  await svc.syncAllImapAccounts();
}
