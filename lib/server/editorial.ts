import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { brands, crawlRuns, crawlSources, reviewSources, reviews, shoeReleases, shoes, shoeSpecs } from "@/db/schema";
import { assessCrawlDueState } from "@/lib/ingestion/scheduler";
import {
  getAiReviewSummaryDisplayStatus,
  getAiReviewSummaryEvidenceCount,
  getAiReviewSummaryGeneratedAt,
  getAiReviewSummaryOverrideFields,
  getAiReviewSummaryOverrideStatus,
  getAiReviewSummaryPreview,
  getAiReviewSummaryReviewCount,
  getAiReviewSummarySourceCount,
  hasAnyAiReviewSummary,
} from "@/lib/server/release-metadata";

export interface EditorialBrandOption {
  id: string;
  name: string;
}

export interface EditorialShoeOption {
  id: string;
  label: string;
}

export interface EditorialSourceOption {
  id: string;
  name: string;
  sourceType: "editorial" | "reddit" | "user";
}

export interface EditorialReleaseOption {
  id: string;
  label: string;
  hasAiReviewSummary?: boolean;
}

export interface EditorialReviewRow {
  id: string;
  releaseId: string;
  title: string | null;
  sourceUrl: string;
  status: "pending" | "approved" | "rejected" | "flagged";
  sentiment: "positive" | "mixed" | "negative" | null;
  scoreNormalized100: number | null;
  releaseLabel: string;
  sourceName: string;
  highlights: string[];
  duplicateOfReviewId: string | null;
  importerConfidence: number | null;
}

export interface EditorialDashboardData {
  stats: {
    totalBrands: number;
    totalShoes: number;
    totalSources: number;
    totalReviews: number;
    pendingReviews: number;
  };
  brands: EditorialBrandOption[];
  shoes: EditorialShoeOption[];
  releases: EditorialReleaseOption[];
  sources: EditorialSourceOption[];
  recentReviews: EditorialReviewRow[];
  recentReleases: Array<{
    id: string;
    label: string;
    foam: string | null;
    msrpUsd: number | null;
    weightOzMen: number | null;
    dropMm: number | null;
    hasAiReviewSummary: boolean;
    aiSummaryGeneratedAt: string | null;
    aiSummaryStatus: "missing" | "generated" | "override";
    aiSummaryPreview: string | null;
    aiSummarySourceCount: number;
    aiSummaryReviewCount: number;
    aiSummaryEvidenceCount: number;
    aiSummaryOverrideEnabled: boolean;
    aiSummaryOverrideFields: {
      isEnabled: boolean;
      overview: string;
      overallSentiment: string;
      confidence: string;
      pros: string;
      cons: string;
      bestFor: string;
      watchOuts: string;
    };
  }>;
  releaseCoverage: Array<{
    releaseId: string;
    label: string;
    approvedReviewCount: number;
    editorialCount: number;
    redditCount: number;
    userCount: number;
    pendingCount: number;
    coverageStatus: "healthy" | "thin" | "missing-editorial" | "missing-community";
  }>;
  crawlSources: Array<{
    id: string;
    importerKey: string;
    sourceName: string;
    targetType: "search" | "listing" | "api";
    targetUrl: string;
    searchPattern: string | null;
    cadenceLabel: string | null;
    isActive: boolean;
    latestRunStatus: "queued" | "running" | "succeeded" | "partial" | "failed" | null;
    lastRunAt: Date | null;
    nextRunAt: Date | null;
    dueReason: string;
    isDue: boolean;
  }>;
  recentCrawlRuns: Array<{
    id: string;
    sourceName: string;
    query: string | null;
    status: "queued" | "running" | "succeeded" | "partial" | "failed";
    discoveredCount: number;
    storedCount: number;
    errorMessage: string | null;
    createdAt: Date;
    averageCandidateConfidence: number | null;
    maxCandidateConfidence: number | null;
    failureStage: string | null;
    noHitReason: string | null;
    fallbackCount: number | null;
  }>;
  recentOverrideEvents: Array<{
    reviewId: string;
    reviewTitle: string;
    releaseLabel: string;
    timestamp: string;
    sentiment: string | null;
    highlights: string[];
    duplicateOfReviewId: string | null;
  }>;
}

export async function getEditorialDashboardData(): Promise<EditorialDashboardData> {
  if (!process.env.DATABASE_URL) {
    return getFallbackEditorialDashboardData();
  }

  const db = getDb();

  const [brandCountRow, shoeCountRow, sourceCountRow, reviewCountRow, pendingCountRow] =
    await Promise.all([
      safeQuery(db.select({ count: count(brands.id) }).from(brands), [{ count: 0 }], "brand count"),
      safeQuery(db.select({ count: count(shoes.id) }).from(shoes), [{ count: 0 }], "shoe count"),
      safeQuery(
        db.select({ count: count(reviewSources.id) }).from(reviewSources),
        [{ count: 0 }],
        "source count",
      ),
      safeQuery(db.select({ count: count(reviews.id) }).from(reviews), [{ count: 0 }], "review count"),
      safeQuery(
        db.select({ count: count(reviews.id) }).from(reviews).where(eq(reviews.status, "pending")),
        [{ count: 0 }],
        "pending review count",
      ),
    ]);

  const [brandRows, shoeRows, releaseRows, sourceRows] = await Promise.all([
    safeQuery(
      db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(brands.name),
      [],
      "brand rows",
    ),
    safeQuery(
      db
        .select({
          id: shoes.id,
          brandName: brands.name,
          shoeName: shoes.name,
        })
        .from(shoes)
        .innerJoin(brands, eq(shoes.brandId, brands.id))
        .orderBy(brands.name, shoes.name),
      [],
      "shoe rows",
    ),
    safeQuery(
      db
        .select({
          id: shoeReleases.id,
          shoeName: shoes.name,
          versionName: shoeReleases.versionName,
          metadata: shoeReleases.metadata,
        })
        .from(shoeReleases)
        .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
        .orderBy(desc(shoeReleases.releaseYear), shoes.name),
      [],
      "release rows",
    ),
    safeQuery(
      db
        .select({
          id: reviewSources.id,
          name: reviewSources.name,
          sourceType: reviewSources.sourceType,
        })
        .from(reviewSources)
        .orderBy(reviewSources.name),
      [],
      "source rows",
    ),
  ]);

  const [reviewRows, recentReleaseRows, coverageRows, crawlSourceRows, crawlRunRows] =
    await Promise.all([
      safeQuery(
        db
        .select({
          id: reviews.id,
          releaseId: reviews.releaseId,
          title: reviews.title,
          sourceUrl: reviews.sourceUrl,
          status: reviews.status,
          sentiment: reviews.sentiment,
          scoreNormalized100: reviews.scoreNormalized100,
          metadata: reviews.metadata,
          shoeName: shoes.name,
          versionName: shoeReleases.versionName,
          sourceName: reviewSources.name,
        })
        .from(reviews)
        .innerJoin(shoeReleases, eq(reviews.releaseId, shoeReleases.id))
        .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
        .innerJoin(reviewSources, eq(reviews.sourceId, reviewSources.id))
        .orderBy(desc(reviews.createdAt))
        .limit(20),
        [],
        "recent reviews",
      ),
      safeQuery(
        db
        .select({
          id: shoeReleases.id,
          shoeName: shoes.name,
          versionName: shoeReleases.versionName,
          foam: shoeReleases.foam,
          msrpUsd: shoeReleases.msrpUsd,
          weightOzMen: shoeSpecs.weightOzMen,
          dropMm: shoeSpecs.dropMm,
          metadata: shoeReleases.metadata,
        })
        .from(shoeReleases)
        .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
        .leftJoin(shoeSpecs, eq(shoeSpecs.releaseId, shoeReleases.id))
        .orderBy(desc(shoeReleases.releaseYear), shoes.name)
        .limit(20),
        [],
        "recent releases",
      ),
      safeQuery(
        db
        .select({
          releaseId: shoeReleases.id,
          shoeName: shoes.name,
          versionName: shoeReleases.versionName,
          reviewId: reviews.id,
          reviewStatus: reviews.status,
          sourceType: reviewSources.sourceType,
        })
        .from(shoeReleases)
        .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
        .leftJoin(reviews, eq(reviews.releaseId, shoeReleases.id))
        .leftJoin(reviewSources, eq(reviews.sourceId, reviewSources.id))
        .where(eq(shoeReleases.isCurrent, true))
        .orderBy(desc(shoeReleases.releaseYear), shoes.name),
        [],
        "coverage rows",
      ),
      safeQuery(
        db
        .select({
          id: crawlSources.id,
          importerKey: crawlSources.importerKey,
          sourceName: reviewSources.name,
          targetType: crawlSources.targetType,
          targetUrl: crawlSources.targetUrl,
          searchPattern: crawlSources.searchPattern,
          cadenceLabel: crawlSources.cadenceLabel,
          isActive: crawlSources.isActive,
        })
        .from(crawlSources)
        .innerJoin(reviewSources, eq(crawlSources.reviewSourceId, reviewSources.id))
        .orderBy(reviewSources.name),
        [],
        "crawl sources",
      ),
      safeQuery(
        db
        .select({
          id: crawlRuns.id,
          crawlSourceId: crawlRuns.crawlSourceId,
          sourceName: reviewSources.name,
          query: crawlRuns.query,
          status: crawlRuns.status,
          discoveredCount: crawlRuns.discoveredCount,
          storedCount: crawlRuns.storedCount,
          errorMessage: crawlRuns.errorMessage,
          metadata: crawlRuns.metadata,
          createdAt: crawlRuns.createdAt,
        })
        .from(crawlRuns)
        .innerJoin(crawlSources, eq(crawlRuns.crawlSourceId, crawlSources.id))
        .innerJoin(reviewSources, eq(crawlSources.reviewSourceId, reviewSources.id))
        .orderBy(desc(crawlRuns.createdAt))
        .limit(20),
        [],
        "crawl runs",
      ),
    ]);

  const latestStatusBySourceId = new Map<string, EditorialDashboardData["crawlSources"][number]["latestRunStatus"]>();
  const latestRunMetaBySourceId = new Map<
    string,
    { status: EditorialDashboardData["crawlSources"][number]["latestRunStatus"]; createdAt: Date }
  >();
  for (const run of crawlRunRows) {
    if (!latestStatusBySourceId.has(run.crawlSourceId)) {
      latestStatusBySourceId.set(run.crawlSourceId, run.status);
      latestRunMetaBySourceId.set(run.crawlSourceId, {
        status: run.status,
        createdAt: run.createdAt,
      });
    }
  }

  const recentOverrideEvents = reviewRows.flatMap((review) =>
    getEditorialOverrideHistory(review.metadata).map((event) => ({
      reviewId: review.id,
      reviewTitle: review.title ?? "Untitled review",
      releaseLabel: `${review.shoeName} ${review.versionName}`,
      timestamp: event.timestamp,
      sentiment: event.sentiment,
      highlights: event.highlights,
      duplicateOfReviewId: event.duplicateOfReviewId,
    })),
  );

  const coverageMap = new Map<
    string,
    {
      label: string;
      approvedReviewCount: number;
      editorialCount: number;
      redditCount: number;
      userCount: number;
      pendingCount: number;
    }
  >();

  for (const row of recentReleaseRows) {
    coverageMap.set(row.id, {
      label: `${row.shoeName} ${row.versionName}`,
      approvedReviewCount: 0,
      editorialCount: 0,
      redditCount: 0,
      userCount: 0,
      pendingCount: 0,
    });
  }

  for (const row of coverageRows) {
    const entry = coverageMap.get(row.releaseId) ?? {
      label: `${row.shoeName} ${row.versionName}`,
      approvedReviewCount: 0,
      editorialCount: 0,
      redditCount: 0,
      userCount: 0,
      pendingCount: 0,
    };

    if (!row.reviewId) {
      coverageMap.set(row.releaseId, entry);
      continue;
    }

    if (row.reviewStatus === "pending") {
      entry.pendingCount += 1;
    }

    if (row.reviewStatus === "approved" && row.sourceType) {
      entry.approvedReviewCount += 1;
      if (row.sourceType === "editorial") {
        entry.editorialCount += 1;
      }
      if (row.sourceType === "reddit") {
        entry.redditCount += 1;
      }
      if (row.sourceType === "user") {
        entry.userCount += 1;
      }
    }

    coverageMap.set(row.releaseId, entry);
  }

  return {
    stats: {
      totalBrands: Number(brandCountRow[0]?.count ?? 0),
      totalShoes: Number(shoeCountRow[0]?.count ?? 0),
      totalSources: Number(sourceCountRow[0]?.count ?? 0),
      totalReviews: Number(reviewCountRow[0]?.count ?? 0),
      pendingReviews: Number(pendingCountRow[0]?.count ?? 0),
    },
    brands: brandRows,
    shoes: shoeRows.map((shoe) => ({
      id: shoe.id,
      label: `${shoe.brandName} ${shoe.shoeName}`,
    })),
    releases: releaseRows.map((release) => ({
      id: release.id,
      label: `${release.shoeName} ${release.versionName}`,
      hasAiReviewSummary: hasAnyAiReviewSummary(release.metadata),
    })),
    sources: sourceRows,
    recentReviews: reviewRows.map((review) => ({
      id: review.id,
      releaseId: review.releaseId,
      title: review.title,
      sourceUrl: review.sourceUrl,
      status: review.status,
      sentiment: review.sentiment,
      scoreNormalized100: review.scoreNormalized100,
      releaseLabel: `${review.shoeName} ${review.versionName}`,
      sourceName: review.sourceName,
      highlights: getEditorialHighlights(review.metadata),
      duplicateOfReviewId: getDuplicateOfReviewId(review.metadata),
      importerConfidence: getImporterConfidence(review.metadata),
    })),
    recentReleases: recentReleaseRows.map((release) => ({
      id: release.id,
      label: `${release.shoeName} ${release.versionName}`,
      foam: release.foam,
      msrpUsd: release.msrpUsd ? Number(release.msrpUsd) : null,
      weightOzMen: release.weightOzMen ? Number(release.weightOzMen) : null,
      dropMm: release.dropMm,
      hasAiReviewSummary: hasAnyAiReviewSummary(release.metadata),
      aiSummaryGeneratedAt: getAiReviewSummaryGeneratedAt(release.metadata),
      aiSummaryStatus: getAiReviewSummaryDisplayStatus(release.metadata),
      aiSummaryPreview: getAiReviewSummaryPreview(release.metadata),
      aiSummarySourceCount: getAiReviewSummarySourceCount(release.metadata),
      aiSummaryReviewCount: getAiReviewSummaryReviewCount(release.metadata),
      aiSummaryEvidenceCount: getAiReviewSummaryEvidenceCount(release.metadata),
      aiSummaryOverrideEnabled: getAiReviewSummaryOverrideStatus(release.metadata),
      aiSummaryOverrideFields: getAiReviewSummaryOverrideFields(release.metadata),
    })),
    releaseCoverage: [...coverageMap.entries()]
      .map(([releaseId, entry]) => ({
        releaseId,
        label: entry.label,
        approvedReviewCount: entry.approvedReviewCount,
        editorialCount: entry.editorialCount,
        redditCount: entry.redditCount,
        userCount: entry.userCount,
        pendingCount: entry.pendingCount,
        coverageStatus: getCoverageStatus(entry),
      }))
      .sort((left, right) => {
        const scoreDelta = coverageSeverity(left.coverageStatus) - coverageSeverity(right.coverageStatus);
        if (scoreDelta !== 0) {
          return scoreDelta;
        }

        return left.label.localeCompare(right.label);
      }),
    crawlSources: crawlSourceRows.map((source) => ({
      ...(() => {
        const latestRun = latestRunMetaBySourceId.get(source.id);
        const cadence = normalizeCadenceLabel(source.cadenceLabel);
        const dueState = source.isActive
          ? assessCrawlDueState(cadence, latestRun?.createdAt ?? null)
          : { isDue: false, reason: "inactive", nextRunAt: null };

        return {
          id: source.id,
          importerKey: source.importerKey,
          sourceName: source.sourceName,
          targetType: source.targetType,
          targetUrl: source.targetUrl,
          searchPattern: source.searchPattern,
          cadenceLabel: source.cadenceLabel,
          isActive: source.isActive,
          latestRunStatus: latestStatusBySourceId.get(source.id) ?? null,
          lastRunAt: latestRun?.createdAt ?? null,
          nextRunAt: dueState.nextRunAt,
          dueReason: dueState.reason,
          isDue: dueState.isDue,
        };
      })(),
    })),
    recentCrawlRuns: crawlRunRows.map((run) => ({
      id: run.id,
      sourceName: run.sourceName,
      query: run.query,
      status: run.status,
      discoveredCount: run.discoveredCount,
      storedCount: run.storedCount,
      errorMessage: run.errorMessage,
      createdAt: run.createdAt,
      averageCandidateConfidence: getCrawlRunNumber(run.metadata, "averageCandidateConfidence"),
      maxCandidateConfidence: getCrawlRunNumber(run.metadata, "maxCandidateConfidence"),
      failureStage: getCrawlRunString(run.metadata, "failureStage"),
      noHitReason: getCrawlRunString(run.metadata, "noHitReason"),
      fallbackCount: getCrawlRunNumber(run.metadata, "fallbackCount"),
    })),
    recentOverrideEvents: recentOverrideEvents
      .sort((left, right) => right.timestamp.localeCompare(left.timestamp))
      .slice(0, 12),
  };
}

function getFallbackEditorialDashboardData(): EditorialDashboardData {
  return {
    stats: {
      totalBrands: 3,
      totalShoes: 3,
      totalSources: 3,
      totalReviews: 3,
      pendingReviews: 0,
    },
    brands: [],
    shoes: [],
    releases: [],
    sources: [],
    recentReviews: [],
    recentReleases: [],
    releaseCoverage: [],
    crawlSources: [],
    recentCrawlRuns: [],
    recentOverrideEvents: [],
  };
}

async function safeQuery<T>(promise: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    console.error(`Editorial dashboard query failed: ${label}`, error);
    return fallback;
  }
}

function getEditorialHighlights(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const value = (metadata as Record<string, unknown>).highlights;
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string").slice(0, 4);
}

function getDuplicateOfReviewId(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>).duplicateOfReviewId;
  return typeof value === "string" ? value : null;
}

function getImporterConfidence(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>).importerConfidence;
  return typeof value === "number" ? value : null;
}

function getCrawlRunString(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

function getCrawlRunNumber(metadata: unknown, key: string) {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
}

function getCoverageStatus(entry: {
  approvedReviewCount: number;
  editorialCount: number;
  redditCount: number;
}) {
  if (entry.approvedReviewCount === 0) {
    return "thin" as const;
  }

  if (entry.editorialCount === 0) {
    return "missing-editorial" as const;
  }

  if (entry.redditCount === 0) {
    return "missing-community" as const;
  }

  if (entry.approvedReviewCount >= 3) {
    return "healthy" as const;
  }

  return "thin" as const;
}

function coverageSeverity(status: "healthy" | "thin" | "missing-editorial" | "missing-community") {
  switch (status) {
    case "missing-editorial":
      return 0;
    case "missing-community":
      return 1;
    case "thin":
      return 2;
    case "healthy":
      return 3;
  }
}

function normalizeCadenceLabel(value: string | null) {
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

function getEditorialOverrideHistory(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const value = (metadata as Record<string, unknown>).editorialOverrideHistory;
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }

      const record = entry as Record<string, unknown>;
      const timestamp = typeof record.timestamp === "string" ? record.timestamp : null;
      const sentiment = typeof record.sentiment === "string" ? record.sentiment : null;
      const duplicateOfReviewId =
        typeof record.duplicateOfReviewId === "string" ? record.duplicateOfReviewId : null;
      const highlights = Array.isArray(record.highlights)
        ? record.highlights.filter((item): item is string => typeof item === "string").slice(0, 4)
        : [];

      if (!timestamp) {
        return null;
      }

      return {
        timestamp,
        sentiment,
        highlights,
        duplicateOfReviewId,
      };
    })
    .filter(
      (
        entry,
      ): entry is {
        timestamp: string;
        sentiment: string | null;
        highlights: string[];
        duplicateOfReviewId: string | null;
      } => Boolean(entry),
    );
}
