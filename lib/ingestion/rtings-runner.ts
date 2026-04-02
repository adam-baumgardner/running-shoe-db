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
  buildTitleFingerprint,
  cleanText,
  deriveSentiment,
  extractHighlights,
  summarizeParts,
} from "@/lib/ingestion/review-normalization";
import { rtingsImporter } from "@/lib/ingestion/rtings";
import type { CrawlExecutionResult } from "@/lib/ingestion/types";

interface RunRtingsImportParams {
  releaseId: string;
}

interface RtingsCandidate {
  sourceUrl: string;
  title: string;
  confidence: number;
}

interface RtingsArticle {
  sourceUrl: string;
  title: string;
  summary: string;
  body: string;
  publishedAt: Date | null;
  scoreNormalized100: number | null;
  originalScoreValue: string | null;
  originalScoreScale: string | null;
  sentiment: "positive" | "mixed" | "negative";
  highlights: string[];
  rawHtml: string;
}

const USER_AGENT = "Mozilla/5.0 (compatible; StrideStackBot/0.1; +https://stride-stack.vercel.app)";

export async function runRtingsImport({ releaseId }: RunRtingsImportParams): Promise<CrawlExecutionResult> {
  const db = getDb();
  const reviewSourceId = await getRtingsSourceId();

  if (!reviewSourceId) {
    throw new Error("RTINGS review source is not configured.");
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
      and(eq(crawlSources.reviewSourceId, reviewSourceId), eq(crawlSources.importerKey, rtingsImporter.key)),
    )
    .where(eq(shoeReleases.id, releaseId))
    .limit(1);

  const selected = release[0];
  if (!selected) {
    throw new Error("Unable to resolve release or crawl source for RTINGS.");
  }

  const query = rtingsImporter.normalizeQuery({
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
        importer: rtingsImporter.key,
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
    const candidates = await discoverRtingsCandidates({
      brandName: selected.brandName,
      versionName: selected.versionName,
    });
    const averageCandidateConfidence = getAverageConfidence(candidates);
    const maxCandidateConfidence = getMaxConfidence(candidates);

    let storedCount = 0;
    for (const candidate of candidates) {
      failureStage = "article-fetch";
      const article = await fetchRtingsArticle(candidate);
      const authorId = await getOrCreateReviewAuthor(selected.sourceId, "RTINGS Editorial");
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
            importer: rtingsImporter.key,
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
          scoreNormalized100: article.scoreNormalized100,
          originalScoreValue: article.originalScoreValue,
          originalScoreScale: article.originalScoreScale,
          sentiment: article.sentiment,
          status: "pending",
          publishedAt: article.publishedAt,
          metadata: {
            crawlRunId,
            importer: rtingsImporter.key,
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
          importer: rtingsImporter.key,
          releaseId: selected.releaseId,
          discoveryStrategy: "direct-slug",
          averageCandidateConfidence,
          maxCandidateConfidence,
          failureStage: null,
          noHitReason: candidates.length === 0 ? "no matching rtings review page found" : null,
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
          importer: rtingsImporter.key,
          releaseId: selected.releaseId,
          failureStage,
        },
      })
      .where(eq(crawlRuns.id, crawlRunId));

    throw error;
  }
}

async function getRtingsSourceId() {
  const db = getDb();
  const source = await db.query.reviewSources.findFirst({
    where: eq(reviewSources.slug, rtingsImporter.sourceSlug),
  });
  return source?.id ?? null;
}

async function discoverRtingsCandidates({
  brandName,
  versionName,
}: {
  brandName: string;
  versionName: string;
}) {
  const sourceUrl = `https://www.rtings.com/running-shoes/reviews/${slugifyRtings(brandName)}/${slugifyRtings(versionName)}`;
  const response = await fetch(sourceUrl, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok || !response.url.includes("/running-shoes/reviews/")) {
    return [];
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const title = cleanText(
    $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      `${brandName} ${versionName} review`,
  );

  return [{ sourceUrl: response.url, title, confidence: 0.82 }];
}

async function fetchRtingsArticle(candidate: RtingsCandidate): Promise<RtingsArticle> {
  const response = await fetch(candidate.sourceUrl, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RTINGS article request failed with ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const title = cleanText(
    $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      candidate.title,
  ).replace(/\s*-\s*RTINGS\.com$/i, "");
  const summary = summarizeParts(
    [
      $('meta[name="description"]').attr("content") || "",
      $('meta[property="og:description"]').attr("content") || "",
      $('[data-vue="TextContent"]').first().text() || "",
    ],
    420,
  );
  const body = summarizeParts(
    [$('[data-vue="TextContent"]').first().text() || "", $("main").text() || ""],
    4000,
  );
  const score = extractRtingsScore($, html);

  return {
    sourceUrl: response.url,
    title,
    summary: summary || candidate.title,
    body: body || summary || candidate.title,
    publishedAt: parseDate(
      $('meta[property="article:published_time"]').attr("content") ||
        html.match(/"created_at":"([^"]+)"/)?.[1],
    ),
    scoreNormalized100: score?.scoreNormalized100 ?? null,
    originalScoreValue: score?.originalScoreValue ?? null,
    originalScoreScale: score?.originalScoreScale ?? null,
    sentiment: deriveSentiment([summary, body]),
    highlights: extractHighlights([summary, body]),
    rawHtml: html,
  };
}

function extractRtingsScore($: cheerio.CheerioAPI, html: string) {
  const candidates = [
    $('meta[name="twitter:data1"]').attr("content"),
    $('meta[property="product:rating:average"]').attr("content"),
    html.match(/"score"\s*:\s*(\d+(?:\.\d+)?)/)?.[1],
  ].filter(Boolean) as string[];

  for (const value of candidates) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      continue;
    }

    return {
      originalScoreValue: parsed.toFixed(1),
      originalScoreScale: parsed <= 10 ? "10.0" : "100",
      scoreNormalized100: parsed <= 10 ? Math.round(parsed * 10) : Math.round(parsed),
    };
  }

  return null;
}

function parseDate(value: string | undefined) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function slugifyRtings(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
      profileUrl: "https://www.rtings.com/running-shoes",
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
