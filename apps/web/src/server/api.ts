import { appRouter, createCallerFactory } from "@cairnly/api";

import { createApiContext } from "@/server/api-context";

const createCaller = createCallerFactory(appRouter);

export async function getApiCaller() {
  return createCaller(await createApiContext());
}
