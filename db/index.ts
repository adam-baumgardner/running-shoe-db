import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("DATABASE_URL is not set. Database queries will fail until it is configured.");
}

const client = postgres(databaseUrl ?? "", {
  prepare: false,
  max: 1,
});

export const db = drizzle(client);
