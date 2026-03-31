import { config } from "dotenv";
import { and, count, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { reviewSources, reviews, shoeReleases, shoes } from "@/db/schema";
import { runBelieveInTheRunImport } from "@/lib/ingestion/believe-in-the-run-runner";
import { runDoctorsOfRunningImport } from "@/lib/ingestion/doctors-of-running-runner";
import { runRoadTrailRunImport } from "@/lib/ingestion/roadtrailrun-runner";
import { runRedditRunningShoeGeeksImport } from "@/lib/ingestion/reddit-running-shoe-geeks-runner";
import { runRunRepeatImport } from "@/lib/ingestion/runrepeat-runner";

config({ path: process.env.DOTENV_CONFIG_PATH || ".env.local" });

const TARGET_APPROVED_REVIEW_COUNT = 2;
const TRUSTED_IMPORTER_KEYS = [
  "runrepeat",
  "roadtrailrun",
  "doctors-of-running",
  "believe-in-the-run",
  "reddit-running-shoe-geeks",
] as const;

type ImporterKey = (typeof TRUSTED_IMPORTER_KEYS)[number];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const db = getDb();
  const releaseRows = await db
    .select({
      releaseId: shoeReleases.id,
      shoeSlug: shoes.slug,
      versionName: shoeReleases.versionName,
      releaseYear: shoeReleases.releaseYear,
      approvedReviewCount: sql<number>`count(${reviews.id})::int`,
    })
    .from(shoeReleases)
    .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
    .leftJoin(reviews, and(eq(reviews.releaseId, shoeReleases.id), eq(reviews.status, "approved")))
    .groupBy(shoeReleases.id, shoes.slug, shoeReleases.versionName, shoeReleases.releaseYear)
    .having(sql`count(${reviews.id}) < ${TARGET_APPROVED_REVIEW_COUNT}`)
    .orderBy(sql`${shoeReleases.releaseYear} desc nulls last`, shoes.slug, shoeReleases.versionName);

  console.info("Starting review coverage backfill", {
    targetApprovedReviewCount: TARGET_APPROVED_REVIEW_COUNT,
    underCoveredReleaseCount: releaseRows.length,
  });

  const results: Array<{
    releaseId: string;
    shoeSlug: string;
    versionName: string;
    beforeApprovedCount: number;
    afterApprovedCount: number;
    importerRuns: Array<{
      importerKey: ImporterKey;
      discoveredCount: number;
      storedCount: number;
      status: string;
    }>;
    approvedPendingCount: number;
    failedImporters: Array<{ importerKey: ImporterKey; error: string }>;
  }> = [];

  for (const release of releaseRows) {
    const importerRuns: Array<{
      importerKey: ImporterKey;
      discoveredCount: number;
      storedCount: number;
      status: string;
    }> = [];
    const failedImporters: Array<{ importerKey: ImporterKey; error: string }> = [];

    let approvedCount = release.approvedReviewCount;
    let approvedPendingCount = 0;

    if (approvedCount < TARGET_APPROVED_REVIEW_COUNT) {
      for (const importerKey of TRUSTED_IMPORTER_KEYS) {
        try {
          const runResult = await runImporter(importerKey, release.releaseId);
          importerRuns.push({
            importerKey,
            discoveredCount: runResult.discoveredCount,
            storedCount: runResult.storedCount,
            status: runResult.status ?? "succeeded",
          });
        } catch (error) {
          failedImporters.push({
            importerKey,
            error: error instanceof Error ? error.message : "Unknown importer error",
          });
        }

        approvedPendingCount += await approvePendingImportedReviews(db, release.releaseId);
        approvedCount = await getApprovedReviewCount(db, release.releaseId);

        if (approvedCount >= TARGET_APPROVED_REVIEW_COUNT) {
          break;
        }
      }
    }

    results.push({
      releaseId: release.releaseId,
      shoeSlug: release.shoeSlug,
      versionName: release.versionName,
      beforeApprovedCount: release.approvedReviewCount,
      afterApprovedCount: approvedCount,
      importerRuns,
      approvedPendingCount,
      failedImporters,
    });
  }

  const remaining = results.filter((result) => result.afterApprovedCount < TARGET_APPROVED_REVIEW_COUNT);
  const improved = results.filter((result) => result.afterApprovedCount > result.beforeApprovedCount);

  console.info("Review coverage backfill completed", {
    processedReleaseCount: results.length,
    improvedReleaseCount: improved.length,
    remainingUnderCoveredCount: remaining.length,
    remaining,
  });
}

async function runImporter(importerKey: ImporterKey, releaseId: string) {
  switch (importerKey) {
    case "runrepeat":
      return runRunRepeatImport({ releaseId });
    case "reddit-running-shoe-geeks":
      return runRedditRunningShoeGeeksImport({ releaseId });
    case "roadtrailrun":
      return runRoadTrailRunImport({ releaseId });
    case "doctors-of-running":
      return runDoctorsOfRunningImport({ releaseId });
    case "believe-in-the-run":
      return runBelieveInTheRunImport({ releaseId });
  }
}

async function approvePendingImportedReviews(db: ReturnType<typeof getDb>, releaseId: string) {
  const pendingRows = await db
    .select({
      id: reviews.id,
      importer: sql<string | null>`(${reviews.metadata} ->> 'importer')`,
    })
    .from(reviews)
    .where(and(eq(reviews.releaseId, releaseId), eq(reviews.status, "pending")));

  const trustedPendingIds = pendingRows
    .filter((row) => row.importer && TRUSTED_IMPORTER_KEYS.includes(row.importer as ImporterKey))
    .map((row) => row.id);

  if (!trustedPendingIds.length) {
    return 0;
  }

  await db
    .update(reviews)
    .set({ status: "approved" })
    .where(inArray(reviews.id, trustedPendingIds));

  return trustedPendingIds.length;
}

async function getApprovedReviewCount(db: ReturnType<typeof getDb>, releaseId: string) {
  const rows = await db
    .select({
      count: count(reviews.id),
    })
    .from(reviews)
    .where(and(eq(reviews.releaseId, releaseId), eq(reviews.status, "approved")));

  return Number(rows[0]?.count ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
