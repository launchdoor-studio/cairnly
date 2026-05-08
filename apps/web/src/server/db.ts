import { createDb, type Db } from "@cairnly/db";

let db: Db | undefined;

export function hasDatabaseUrl() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to access the Cairnly API.");
  }

  db ??= createDb({
    connectionString,
    max: 5,
  });

  return db;
}
