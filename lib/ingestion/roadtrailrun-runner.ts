import * as cheerio from "cheerio";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  brands,
  crawlRuns,
  crawlSources,
  rawDocuments,
  reviewAuthors,
  reviews,
  reviewSources,
  shoeReleases,
  shoes,
} from "@/db/schema";
import {
  areFingerprintsSimilar,
  buildSearchAliases,
  buildTitleFingerprint,
  cleanText,
  deriveSentiment,
  extractHighlights,
  normalizeSearchText,
  summarizeParts,
} from "@/lib/ingestion/review-normalization";
import { roadTrailRunImporter } from "@/lib/ingestion/roadtrailrun";
import type { CrawlExecutionResult } from "@/lib/ingestion/types";

interface RunRoadTrailRunImportParams {
  releaseId: string;
}

interface RoadTrailRunCandidate {
  sourceUrl: string;
  title: string;
  confidence: number;
}

interface RoadTrailRunArticle {
  sourceUrl: string;
  title: string;
  summary: string;
  body: string;
  publishedAt: Date | null;
  sentiment: "positive" | "mixed" | "negative";
  highlights: string[];
  rawHtml: string;
}

const USER_AGENT = "Mozilla/5.0 (compatible; StrideStackBot/0.1; +https://stride-stack.vercel.app)";

export async function runRoadTrailRunImport({
  releaseId,
}: RunRoadTrailRunImportParams): Promise<CrawlExecutionResult> {
  const db = getDb();
  const reviewSourceId = await getRoadTrailRunSourceId();

  if (!reviewSourceId) {
    throw new Error("RoadTrailRun review source is not configured.");
  }

  const release = await db
    .select({
      releaseId: shoeReleases.id,
      versionName: shoeReleases.versionName,
      brandName: brands.name,
      sourceId: crawlSources.reviewSourceId,
      crawlSourceId: crawlSources.id,
    })
    .from(shoeReleases)
    .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
    .innerJoin(brands, eq(shoes.brandId, brands.id))
    .innerJoin(
      crawlSources,
      and(eq(crawlSources.reviewSourceId, reviewSourceId), eq(crawlSources.importerKey, roadTrailRunImporter.key)),
    )
    .where(eq(shoeReleases.id, releaseId))
    .limit(1);

  const selected = release[0];
  if (!selected) {
    throw new Error("Unable to resolve release or crawl source for RoadTrailRun.");
  }

  const query = roadTrailRunImporter.normalizeQuery({
    brandName: selected.brandName,
    shoeName: selected.versionName,
  });

  const run = await db
    .insert(crawlRuns)
    .values({
      crawlSourceId: selected.crawlSourceId,
      status: "running",
      query,
      startedAt: new Date(),
      metadata: {
        importer: roadTrailRunImporter.key,
        releaseId: selected.releaseId,
      },
    })
    .returning({ id: crawlRuns.id });

  const crawlRunId = run[0]?.id;
  if (!crawlRunId) {
    throw new Error("Unable to create crawl run.");
  }

  let failureStage = "discovery";

  try {
    const candidates = await discoverRoadTrailRunCandidates({
      brandName: selected.brandName,
      versionName: selected.versionName,
      query,
    });
    const averageCandidateConfidence = getAverageConfidence(candidates);
    const maxCandidateConfidence = getMaxConfidence(candidates);

    let storedCount = 0;
    for (const candidate of candidates) {
      failureStage = "article-fetch";
      const article = await fetchRoadTrailRunArticle(candidate);
      const authorId = await getOrCreateReviewAuthor(selected.sourceId, "RTR Editorial");
      const titleFingerprint = buildTitleFingerprint(article.title);
      const importerConfidence = candidate.confidence;

      failureStage = "raw-document-persist";
      await db
        .insert(rawDocuments)
        .values({
          crawlRunId,
          sourceUrl: article.sourceUrl,
          contentType: "text/html",
          title: article.title,
          excerpt: article.summary,
          rawText: article.rawHtml.slice(0, 12000),
          metadata: {
            importer: roadTrailRunImporter.key,
            query,
            highlights: article.highlights,
            titleFingerprint,
            importerConfidence,
          },
        })
        .onConflictDoNothing();

      failureStage = "review-dedupe";
      const existingReview = await findPotentialDuplicateReview({
        releaseId: selected.releaseId,
        sourceId: selected.sourceId,
        sourceUrl: article.sourceUrl,
        titleFingerprint,
      });

      if (!existingReview) {
        failureStage = "review-insert";
        await db.insert(reviews).values({
          releaseId: selected.releaseId,
          sourceId: selected.sourceId,
          authorId,
          sourceUrl: article.sourceUrl,
          title: article.title,
          excerpt: article.summary,
          body: article.body,
          sentiment: article.sentiment,
          status: "pending",
          publishedAt: article.publishedAt,
          metadata: {
            crawlRunId,
            importer: roadTrailRunImporter.key,
            query,
            highlights: article.highlights,
            titleFingerprint,
            importerConfidence,
          },
        });
        storedCount += 1;
      }
    }

    const status = candidates.length === 0 ? "succeeded" : storedCount === 0 ? "partial" : "succeeded";
    await db
      .update(crawlRuns)
      .set({
        status,
        discoveredCount: candidates.length,
        storedCount,
        finishedAt: new Date(),
        metadata: {
          importer: roadTrailRunImporter.key,
          releaseId: selected.releaseId,
          discoveryStrategy: "site-search",
          averageCandidateConfidence,
          maxCandidateConfidence,
          failureStage: null,
          noHitReason: candidates.length === 0 ? "no matching roadtrailrun article found" : null,
        },
      })
      .where(eq(crawlRuns.id, crawlRunId));

    return {
      discoveredCount: candidates.length,
      storedCount,
      urls: candidates.map((candidate) => candidate.sourceUrl),
      status,
    };
  } catch (error) {
    await db
      .update(crawlRuns)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown crawl error",
        finishedAt: new Date(),
        metadata: {
          importer: roadTrailRunImporter.key,
          releaseId: selected.releaseId,
          failureStage,
        },
      })
      .where(eq(crawlRuns.id, crawlRunId));

    throw error;
  }
}

async function getRoadTrailRunSourceId() {
  const db = getDb();
  const source = await db.query.reviewSources.findFirst({
    where: eq(reviewSources.slug, roadTrailRunImporter.sourceSlug),
  });

  return source?.id ?? null;
}

async function discoverRoadTrailRunCandidates({
  brandName,
  versionName,
  query,
}: {
  brandName: string;
  versionName: string;
  query: string;
}) {
  const searchUrl = roadTrailRunImporter.buildSearchUrl({
    brandName,
    shoeName: versionName,
  });
  const response = await fetch(searchUrl, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RoadTrailRun search request failed with ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const normalizedBrand = normalizeSearchText(brandName);
  const normalizedModelAliases = buildSearchAliases(versionName);
  const normalizedQuery = normalizeSearchText(query);
  const seen = new Set<string>();

  return $("a")
    .toArray()
    .map((element) => {
      const href = $(element).attr("href");
      const title = cleanText($(element).text());
      if (!href || !title) {
        return null;
      }

      const sourceUrl = normalizeRoadTrailRunUrl(href);
      if (
        !sourceUrl ||
        seen.has(sourceUrl) ||
        !sourceUrl.includes("roadtrailrun.com/20") ||
        !sourceUrl.endsWith(".html") ||
        sourceUrl.includes("/search?")
      ) {
        return null;
      }
      seen.add(sourceUrl);

      const haystack = normalizeSearchText(`${title} ${sourceUrl}`);
      if (!haystack.includes(normalizedBrand) || !normalizedModelAliases.some((alias) => haystack.includes(alias))) {
        return null;
      }

      if (looksLikeNonReviewSlug(sourceUrl)) {
        return null;
      }

      return {
        sourceUrl,
        title,
        confidence: getCandidateConfidence(haystack, normalizedQuery),
      };
    })
    .filter((candidate): candidate is RoadTrailRunCandidate => Boolean(candidate))
    .slice(0, 5);
}

async function fetchRoadTrailRunArticle(candidate: RoadTrailRunCandidate): Promise<RoadTrailRunArticle> {
  const response = await fetch(candidate.sourceUrl, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RoadTrailRun article request failed with ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const title = cleanText(
    $("h3.post-title").first().text() ||
      $("h1").first().text() ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      candidate.title,
  );
  const body = extractRoadTrailRunBodyText($) || title;
  const summary = summarizeParts(
    [
      $('meta[name="description"]').attr("content") || "",
      $('meta[property="og:description"]').attr("content") || "",
      body,
    ],
    420,
  );

  return {
    sourceUrl: candidate.sourceUrl,
    title: isGenericRoadTrailRunTitle(title) ? humanizeRoadTrailRunSlug(candidate.sourceUrl) : title,
    summary: summary || title,
    body,
    publishedAt: parseDate(
      $('meta[property="article:published_time"]').attr("content") ||
        $('meta[itemprop="datePublished"]').attr("content") ||
        $("h2.date-header span").first().text() ||
        $("abbr.published").attr("title"),
    ),
    sentiment: deriveSentiment([summary, body]),
    highlights: extractHighlights([summary, body]),
    rawHtml: html,
  };
}

function extractRoadTrailRunBodyText($: cheerio.CheerioAPI) {
  const containers = [$(".post-body").first(), $("article").first(), $("main").first()];

  for (const container of containers) {
    if (!container.length) {
      continue;
    }

    const paragraphs = container
      .find("p")
      .toArray()
      .map((element) => cleanText($(element).text()))
      .filter((text) => text.length > 40)
      .filter((text) => !looksLikeUiChrome(text))
      .slice(0, 14);

    if (paragraphs.length) {
      return paragraphs.join("\n\n").slice(0, 4000);
    }
  }

  return "";
}

function normalizeRoadTrailRunUrl(value: string) {
  try {
    return new URL(value, "https://www.roadtrailrun.com").toString();
  } catch {
    return null;
  }
}

function looksLikeNonReviewSlug(sourceUrl: string) {
  const normalized = normalizeSearchText(sourceUrl);
  return [
    "best-",
    "gift-guide",
    "preview",
    "previews",
    "race-report",
    "stories",
    "gear-review",
    "watch-review",
    "sock-review",
    "jacket-review",
  ].some((token) => normalized.includes(token));
}

function looksLikeUiChrome(text: string) {
  const normalized = normalizeSearchText(text);
  return (
    normalized.includes("road trail run receives") ||
    normalized.includes("shopping at our partners") ||
    normalized.includes("comments are moderated")
  );
}

function isGenericRoadTrailRunTitle(value: string) {
  const normalized = normalizeSearchText(value);
  return normalized === "road trail run" || normalized.startsWith("search results for");
}

function humanizeRoadTrailRunSlug(sourceUrl: string) {
  const slug = sourceUrl
    .replace(/^https:\/\/www\.roadtrailrun\.com\//, "")
    .replace(/\.html$/, "")
    .split("/")
    .pop();

  if (!slug) {
    return "RoadTrailRun review";
  }

  return cleanText(slug.replace(/-/g, " "));
}

function getCandidateConfidence(haystack: string, normalizedQuery: string) {
  let score = 0.66;
  if (haystack.includes(normalizedQuery)) {
    score += 0.14;
  }
  if (haystack.includes("review") || haystack.includes("multi tester")) {
    score += 0.08;
  }
  if (haystack.includes("roadtrailrun.com")) {
    score += 0.04;
  }

  return Number(Math.min(1, score).toFixed(2));
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function getOrCreateReviewAuthor(sourceId: string, authorName: string) {
  const db = getDb();
  const existing = await db.query.reviewAuthors.findFirst({
    where: and(eq(reviewAuthors.sourceId, sourceId), eq(reviewAuthors.displayName, authorName)),
  });

  if (existing) {
    return existing.id;
  }

  const inserted = await db
    .insert(reviewAuthors)
    .values({
      sourceId,
      displayName: authorName,
      profileUrl: "https://www.roadtrailrun.com",
    })
    .returning({ id: reviewAuthors.id });

  return inserted[0]?.id ?? null;
}

async function findPotentialDuplicateReview({
  releaseId,
  sourceId,
  sourceUrl,
  titleFingerprint,
}: {
  releaseId: string;
  sourceId: string;
  sourceUrl: string;
  titleFingerprint: string;
}) {
  const db = getDb();
  const existing = await db.query.reviews.findMany({
    where: and(eq(reviews.releaseId, releaseId), eq(reviews.sourceId, sourceId)),
  });

  return existing.find((review) => {
    if (review.sourceUrl === sourceUrl) {
      return true;
    }

    const existingFingerprint =
      typeof review.metadata === "object" &&
      review.metadata &&
      typeof (review.metadata as Record<string, unknown>).titleFingerprint === "string"
        ? ((review.metadata as Record<string, unknown>).titleFingerprint as string)
        : buildTitleFingerprint(review.title ?? "");

    return areFingerprintsSimilar(existingFingerprint, titleFingerprint);
  });
}

function getAverageConfidence(candidates: Array<{ confidence: number }>) {
  if (candidates.length === 0) {
    return null;
  }

  const sum = candidates.reduce((total, candidate) => total + candidate.confidence, 0);
  return Number((sum / candidates.length).toFixed(2));
}

function getMaxConfidence(candidates: Array<{ confidence: number }>) {
  if (candidates.length === 0) {
    return null;
  }

  return Number(Math.max(...candidates.map((candidate) => candidate.confidence)).toFixed(2));
}
