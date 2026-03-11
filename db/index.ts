import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

const databaseUrl = process.env.DATABASE_URL;
let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set.");
  }

  if (!database) {
    const client = postgres(databaseUrl, {
      prepare: false,
      max: 1,
    });

    database = drizzle(client, { schema });
  }

  return database;
}
