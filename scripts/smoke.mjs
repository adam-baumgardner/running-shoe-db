import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const checks = [];

  checkEnv(
    checks,
    "NEXT_PUBLIC_SITE_URL",
    process.env.NEXT_PUBLIC_SITE_URL,
    "Required for canonical public links and health checks.",
  );
  checkEnv(
    checks,
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    "Required for client-side Supabase configuration.",
  );
  checkEnv(
    checks,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    "Required for client-side Supabase configuration.",
  );
  checkEnv(
    checks,
    "DATABASE_URL",
    process.env.DATABASE_URL,
    "Required for server rendering, internal tooling, and ingestion.",
  );

  if (process.env.DATABASE_URL) {
    let sql = null;

    try {
      sql = postgres(process.env.DATABASE_URL, {
        prepare: false,
        max: 1,
        ssl: "require",
        connect_timeout: 10,
      });

      const rows = await sql`
        select count(*)::int as count from brands
      `;

      checks.push({
        label: "database",
        ok: true,
        detail: `Connected successfully. brands=${rows[0]?.count ?? 0}`,
      });
    } catch (error) {
      const detail =
        error instanceof Error && error.message.includes("ENOTFOUND")
          ? `${error.message}. Check that DATABASE_URL uses the Supabase transaction pooler host in deployed environments.`
          : error instanceof Error
            ? error.message
            : "Unknown database error";

      checks.push({
        label: "database",
        ok: false,
        detail,
      });
    } finally {
      if (sql) {
        await sql.end({ timeout: 5 });
      }
    }
  }

  checks.push({
    label: "internal auth",
    ok: Boolean(process.env.INTERNAL_BASIC_AUTH_USERNAME && process.env.INTERNAL_BASIC_AUTH_PASSWORD),
    detail:
      process.env.INTERNAL_BASIC_AUTH_USERNAME && process.env.INTERNAL_BASIC_AUTH_PASSWORD
        ? "Configured."
        : "Unset. Acceptable locally, but not for deployed internal tooling.",
  });

  checks.push({
    label: "cron secret",
    ok: Boolean(process.env.CRON_SECRET),
    detail: process.env.CRON_SECRET
      ? "Configured."
      : "Unset. Scheduled ingestion should not be deployed without this.",
  });

  checks.push({
    label: "openai",
    ok: Boolean(process.env.OPENAI_API_KEY),
    detail: process.env.OPENAI_API_KEY
      ? "Configured."
      : "Unset. AI summaries will fall back to heuristic mode.",
  });

  const hasFailure = checks.some((check) => !check.ok && isRequiredFailure(check.label));

  for (const check of checks) {
    const marker = check.ok ? "PASS" : "WARN";
    console.log(`${marker} ${check.label}: ${check.detail}`);
  }

  if (hasFailure) {
    process.exitCode = 1;
  }
}

function checkEnv(checks, label, value, detailWhenMissing) {
  checks.push({
    label,
    ok: Boolean(value),
    detail: value ? "Configured." : detailWhenMissing,
  });
}

function isRequiredFailure(label) {
  return [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "DATABASE_URL",
    "database",
  ].includes(label);
}

await main();
