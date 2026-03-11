import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

let database: ReturnType<typeof drizzle<typeof schema>> | null = null;
let client: postgres.Sql | null = null;

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (!database) {
    client = postgres(databaseUrl, {
      prepare: false,
      max: 1,
    });

    database = drizzle(client, { schema });
  }

  return database;
}

export async function closeDbConnection() {
  if (client) {
    await client.end();
    client = null;
    database = null;
  }
}
