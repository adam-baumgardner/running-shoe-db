import { count } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { brands } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = {
    publicEnvConfigured: Boolean(
      process.env.NEXT_PUBLIC_SITE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    internalAuthConfigured: Boolean(
      process.env.INTERNAL_BASIC_AUTH_USERNAME && process.env.INTERNAL_BASIC_AUTH_PASSWORD,
    ),
    cronSecretConfigured: Boolean(process.env.CRON_SECRET),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    databaseReachable: false,
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
  };

  let databaseError: string | null = null;

  if (checks.databaseConfigured) {
    try {
      await getDb().select({ count: count(brands.id) }).from(brands);
      checks.databaseReachable = true;
    } catch (error) {
      databaseError = error instanceof Error ? error.message : "Unknown database health error";
    }
  }

  const isProduction = process.env.NODE_ENV === "production";
  const isHealthy =
    checks.publicEnvConfigured &&
    checks.databaseConfigured &&
    checks.databaseReachable &&
    (!isProduction || checks.internalAuthConfigured);

  return NextResponse.json(
    {
      status: isHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? "unknown",
      checks,
      databaseError,
    },
    { status: isHealthy ? 200 : 503 },
  );
}
