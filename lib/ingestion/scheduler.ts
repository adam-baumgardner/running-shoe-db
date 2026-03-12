import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { crawlRuns, crawlSources, shoeReleases } from "@/db/schema";
import { runBelieveInTheRunImport } from "@/lib/ingestion/believe-in-the-run-runner";
import { runRedditRunningShoeGeeksImport } from "@/lib/ingestion/reddit-running-shoe-geeks-runner";

type SupportedCadence = "manual" | "hourly" | "daily" | "weekly";

export interface ScheduledIngestionResult {
  processedSources: number;
  processedReleases: number;
  skippedSources: Array<{ sourceId: string; importerKey: string; reason: string }>;
  runs: Array<{
    sourceId: string;
    importerKey: string;
    releaseId: string;
    discoveredCount: number;
    storedCount: number;
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
      cadenceLabel: crawlSources.cadenceLabel,
      isActive: crawlSources.isActive,
    })
    .from(crawlSources)
    .orderBy(crawlSources.importerKey);

  const currentReleases = await db
    .select({ id: shoeReleases.id })
    .from(shoeReleases)
    .where(eq(shoeReleases.isCurrent, true))
    .orderBy(desc(shoeReleases.releaseYear))
    .limit(12);

  const result: ScheduledIngestionResult = {
    processedSources: 0,
    processedReleases: 0,
    skippedSources: [],
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

    for (const release of currentReleases) {
      const execution = await runScheduledImporter(source.importerKey, release.id);

      result.processedReleases += 1;
      result.runs.push({
        sourceId: source.id,
        importerKey: source.importerKey,
        releaseId: release.id,
        discoveredCount: execution.discoveredCount,
        storedCount: execution.storedCount,
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
    default:
      return {
        discoveredCount: 0,
        storedCount: 0,
        urls: [],
      };
  }
}
