import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  crawlRuns,
  crawlSources,
  reviewSources,
  reviews,
  shoeReleases,
  shoes,
} from "@/db/schema";
import { runBelieveInTheRunImport } from "@/lib/ingestion/believe-in-the-run-runner";
import { runDoctorsOfRunningImport } from "@/lib/ingestion/doctors-of-running-runner";
import { runRoadTrailRunImport } from "@/lib/ingestion/roadtrailrun-runner";
import { runRedditRunningShoeGeeksImport } from "@/lib/ingestion/reddit-running-shoe-geeks-runner";
import { runRunRepeatImport } from "@/lib/ingestion/runrepeat-runner";

type SupportedCadence = "manual" | "hourly" | "daily" | "weekly";
const MAX_RELEASES_PER_SOURCE = 6;
const FAILED_RELEASE_BACKOFF_MS = 1000 * 60 * 60 * 24;
const PARTIAL_RELEASE_BACKOFF_MS = 1000 * 60 * 60 * 6;

export interface ScheduledIngestionResult {
  processedSources: number;
  processedReleases: number;
  skippedSources: Array<{ sourceId: string; importerKey: string; reason: string }>;
  skippedReleases: Array<{
    sourceId: string;
    importerKey: string;
    releaseId: string;
    reason: string;
  }>;
  runs: Array<{
    sourceId: string;
    importerKey: string;
    releaseId: string;
    discoveredCount: number;
    storedCount: number;
    status: "succeeded" | "partial" | "failed";
  }>;
}

export interface CrawlDueAssessment {
  isDue: boolean;
  reason: string;
  nextRunAt: Date | null;
}

export async function runScheduledIngestion() {
  const db = getDb();
  const sources = await db
    .select({
      id: crawlSources.id,
      importerKey: crawlSources.importerKey,
      reviewSourceId: crawlSources.reviewSourceId,
      cadenceLabel: crawlSources.cadenceLabel,
      isActive: crawlSources.isActive,
    })
    .from(crawlSources)
    .orderBy(crawlSources.importerKey);

  const currentReleases = await db
    .select({
      id: shoeReleases.id,
      brandName: shoes.name,
      versionName: shoeReleases.versionName,
    })
    .from(shoeReleases)
    .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
    .where(eq(shoeReleases.isCurrent, true))
    .orderBy(desc(shoeReleases.releaseYear))
    .limit(12);

  const coverageRows = await db
    .select({
      releaseId: shoeReleases.id,
      reviewId: reviews.id,
      reviewStatus: reviews.status,
      sourceId: reviewSources.id,
      sourceType: reviewSources.sourceType,
    })
    .from(shoeReleases)
    .leftJoin(reviews, eq(reviews.releaseId, shoeReleases.id))
    .leftJoin(reviewSources, eq(reviews.sourceId, reviewSources.id))
    .where(eq(shoeReleases.isCurrent, true));

  const result: ScheduledIngestionResult = {
    processedSources: 0,
    processedReleases: 0,
    skippedSources: [],
    skippedReleases: [],
    runs: [],
  };

  for (const source of sources) {
    const cadence = normalizeCadenceLabel(source.cadenceLabel);

    if (!source.isActive) {
      result.skippedSources.push({
        sourceId: source.id,
        importerKey: source.importerKey,
        reason: "inactive",
      });
      continue;
    }

    if (cadence === "manual") {
      result.skippedSources.push({
        sourceId: source.id,
        importerKey: source.importerKey,
        reason: "manual cadence",
      });
      continue;
    }

    const lastRun = await db.query.crawlRuns.findFirst({
      where: eq(crawlRuns.crawlSourceId, source.id),
      orderBy: desc(crawlRuns.createdAt),
    });

    if (!isRunDue(cadence, lastRun?.createdAt ?? null)) {
      result.skippedSources.push({
        sourceId: source.id,
        importerKey: source.importerKey,
        reason: "not due",
      });
      continue;
    }

    result.processedSources += 1;
    const prioritizedReleases = rankReleasesByCoverageGap(currentReleases, coverageRows, source.reviewSourceId);
    const recentRuns = await db.query.crawlRuns.findMany({
      where: eq(crawlRuns.crawlSourceId, source.id),
      orderBy: desc(crawlRuns.createdAt),
      limit: 120,
    });
    const selectedReleases = prioritizedReleases.slice(0, MAX_RELEASES_PER_SOURCE);

    for (const release of selectedReleases) {
      const backoffReason = getReleaseBackoffReason(recentRuns, release.id);
      if (backoffReason) {
        result.skippedReleases.push({
          sourceId: source.id,
          importerKey: source.importerKey,
          releaseId: release.id,
          reason: backoffReason,
        });
        continue;
      }

      const execution = await runScheduledImporter(source.importerKey, release.id);

      result.processedReleases += 1;
      result.runs.push({
        sourceId: source.id,
        importerKey: source.importerKey,
        releaseId: release.id,
        discoveredCount: execution.discoveredCount,
        storedCount: execution.storedCount,
        status: execution.status ?? "succeeded",
      });
    }
  }

  return result;
}

function normalizeCadenceLabel(value: string | null): SupportedCadence {
  const normalized = value?.trim().toLowerCase();

  if (
    normalized === "manual" ||
    normalized === "hourly" ||
    normalized === "daily" ||
    normalized === "weekly"
  ) {
    return normalized;
  }

  return "manual";
}

export function assessCrawlDueState(
  cadence: SupportedCadence,
  lastRunAt: Date | null,
): CrawlDueAssessment {
  if (cadence === "manual") {
    return {
      isDue: false,
      reason: "manual cadence",
      nextRunAt: null,
    };
  }

  if (!lastRunAt) {
    return {
      isDue: true,
      reason: "never run",
      nextRunAt: null,
    };
  }

  const thresholds: Record<Exclude<SupportedCadence, "manual">, number> = {
    hourly: 1000 * 60 * 60,
    daily: 1000 * 60 * 60 * 24,
    weekly: 1000 * 60 * 60 * 24 * 7,
  };
  const thresholdMs = thresholds[cadence];
  const nextRunAt = new Date(lastRunAt.getTime() + thresholdMs);
  const isDue = Date.now() >= nextRunAt.getTime();

  return {
    isDue,
    reason: isDue ? "due now" : "not due",
    nextRunAt,
  };
}

function isRunDue(cadence: SupportedCadence, lastRunAt: Date | null) {
  return assessCrawlDueState(cadence, lastRunAt).isDue;
}

async function runScheduledImporter(importerKey: string, releaseId: string) {
  switch (importerKey) {
    case "believe-in-the-run":
      return runBelieveInTheRunImport({ releaseId });
    case "reddit-running-shoe-geeks":
      return runRedditRunningShoeGeeksImport({ releaseId });
    case "doctors-of-running":
      return runDoctorsOfRunningImport({ releaseId });
    case "roadtrailrun":
      return runRoadTrailRunImport({ releaseId });
    case "runrepeat":
      return runRunRepeatImport({ releaseId });
    default:
      return {
        discoveredCount: 0,
        storedCount: 0,
        urls: [],
        status: "failed" as const,
      };
  }
}

function rankReleasesByCoverageGap(
  releases: Array<{ id: string; brandName: string; versionName: string }>,
  coverageRows: Array<{
    releaseId: string;
    reviewId: string | null;
    reviewStatus: "pending" | "approved" | "rejected" | "flagged" | null;
    sourceId: string | null;
    sourceType: "editorial" | "reddit" | "user" | null;
  }>,
  reviewSourceId: string,
) {
  const coverageMap = new Map<
    string,
    {
      approved: number;
      editorial: number;
      reddit: number;
      pending: number;
      approvedSourceIds: Set<string>;
      pendingSourceIds: Set<string>;
    }
  >();

  for (const release of releases) {
    coverageMap.set(release.id, {
      approved: 0,
      editorial: 0,
      reddit: 0,
      pending: 0,
      approvedSourceIds: new Set<string>(),
      pendingSourceIds: new Set<string>(),
    });
  }

  for (const row of coverageRows) {
    const coverage = coverageMap.get(row.releaseId);
    if (!coverage || !row.reviewId) {
      continue;
    }

    if (row.reviewStatus === "pending") {
      coverage.pending += 1;
      if (row.sourceId) {
        coverage.pendingSourceIds.add(row.sourceId);
      }
    }

    if (row.reviewStatus === "approved") {
      coverage.approved += 1;
      if (row.sourceId) {
        coverage.approvedSourceIds.add(row.sourceId);
      }
      if (row.sourceType === "editorial") {
        coverage.editorial += 1;
      }
      if (row.sourceType === "reddit") {
        coverage.reddit += 1;
      }
    }
  }

  return releases
    .map((release) => {
      const coverage = coverageMap.get(release.id) ?? {
        approved: 0,
        editorial: 0,
        reddit: 0,
        pending: 0,
        approvedSourceIds: new Set<string>(),
        pendingSourceIds: new Set<string>(),
      };

      let priority = 0;
      if (coverage.approved === 0) {
        priority += 100;
      }
      if (coverage.editorial === 0) {
        priority += 40;
      }
      if (coverage.reddit === 0) {
        priority += 35;
      }
      if (!coverage.approvedSourceIds.has(reviewSourceId)) {
        priority += 45;
      }
      if (coverage.approvedSourceIds.size < 2) {
        priority += 20;
      } else if (coverage.approvedSourceIds.size < 3) {
        priority += 10;
      }
      if (coverage.approved < 3) {
        priority += 20;
      }
      if (coverage.pendingSourceIds.has(reviewSourceId)) {
        priority -= 10;
      }
      priority -= coverage.pending * 5;

      return {
        id: release.id,
        priority,
      };
    })
    .sort((left, right) => right.priority - left.priority)
    .map((release) => ({ id: release.id }));
}

function getReleaseBackoffReason(
  recentRuns: Array<{
    status: "queued" | "running" | "succeeded" | "partial" | "failed";
    createdAt: Date;
    metadata: unknown;
  }>,
  releaseId: string,
) {
  const latestRun = recentRuns.find((run) => getReleaseIdFromMetadata(run.metadata) === releaseId);
  if (!latestRun) {
    return null;
  }

  const elapsedMs = Date.now() - latestRun.createdAt.getTime();
  if (latestRun.status === "failed" && elapsedMs < FAILED_RELEASE_BACKOFF_MS) {
    return "recent failed run backoff";
  }

  if (latestRun.status === "partial" && elapsedMs < PARTIAL_RELEASE_BACKOFF_MS) {
    return "recent partial run backoff";
  }

  if (latestRun.status === "running") {
    return "run already in progress";
  }

  return null;
}

function getReleaseIdFromMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>).releaseId;
  return typeof value === "string" ? value : null;
}
