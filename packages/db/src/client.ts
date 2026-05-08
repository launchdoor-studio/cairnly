import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export type Db = ReturnType<typeof createDb>;

export type DbClientOptions = {
  connectionString: string;
  max?: number;
};

export function createDb({ connectionString, max = 10 }: DbClientOptions) {
  const client = postgres(connectionString, {
    max,
    prepare: false,
  });

  return drizzle(client, { schema });
}
