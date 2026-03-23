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
  shoeSpecVariants,
  shoes,
  shoeSpecs,
} from "@/db/schema";
import {
  areFingerprintsSimilar,
  buildTitleFingerprint,
  cleanText,
  deriveSentiment,
  extractHighlights,
  summarizeParts,
} from "@/lib/ingestion/review-normalization";
import { runRepeatImporter } from "@/lib/ingestion/runrepeat";
import type { CrawlExecutionResult } from "@/lib/ingestion/types";

interface RunRunRepeatImportParams {
  releaseId: string;
}

interface RunRepeatCandidate {
  sourceUrl: string;
  title: string;
  confidence: number;
}

interface RunRepeatArticle {
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
  specs: {
    weightOzMen: string | null;
    heelStackMm: number | null;
    forefootStackMm: number | null;
    dropMm: number | null;
  };
}

export async function runRunRepeatImport({
  releaseId,
}: RunRunRepeatImportParams): Promise<CrawlExecutionResult> {
  const db = getDb();
  const reviewSourceId = await getRunRepeatSourceId();

  if (!reviewSourceId) {
    throw new Error("RunRepeat review source is not configured.");
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
      and(eq(crawlSources.reviewSourceId, reviewSourceId), eq(crawlSources.importerKey, runRepeatImporter.key)),
    )
    .where(eq(shoeReleases.id, releaseId))
    .limit(1);

  const selected = release[0];
  if (!selected) {
    throw new Error("Unable to resolve release or crawl source for RunRepeat.");
  }

  const query = runRepeatImporter.normalizeQuery({
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
        importer: runRepeatImporter.key,
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
    const candidates = await discoverRunRepeatCandidates({
      brandName: selected.brandName,
      versionName: selected.versionName,
    });
    const averageCandidateConfidence = getAverageConfidence(candidates);
    const maxCandidateConfidence = getMaxConfidence(candidates);

    let storedCount = 0;
    for (const candidate of candidates) {
      failureStage = "article-fetch";
      const article = await fetchRunRepeatArticle(candidate);
      const authorId = await getOrCreateReviewAuthor(selected.sourceId, "RunRepeat Lab");
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
            importer: runRepeatImporter.key,
            query,
            highlights: article.highlights,
            titleFingerprint,
            importerConfidence,
            specs: article.specs,
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
            importer: runRepeatImporter.key,
            query,
            highlights: article.highlights,
            titleFingerprint,
            importerConfidence,
            specs: article.specs,
          },
        });
        storedCount += 1;
      }

      failureStage = "spec-upsert";
      await upsertRunRepeatSpecs(selected.releaseId, article.specs);
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
          importer: runRepeatImporter.key,
          releaseId: selected.releaseId,
          discoveryStrategy: "guessed-slug",
          averageCandidateConfidence,
          maxCandidateConfidence,
          failureStage: null,
          noHitReason: candidates.length === 0 ? "no matching runrepeat shoe page found" : null,
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
          importer: runRepeatImporter.key,
          releaseId: selected.releaseId,
          failureStage,
        },
      })
      .where(eq(crawlRuns.id, crawlRunId));

    throw error;
  }
}

async function getRunRepeatSourceId() {
  const db = getDb();
  const source = await db.query.reviewSources.findFirst({
    where: eq(reviewSources.slug, runRepeatImporter.sourceSlug),
  });

  return source?.id ?? null;
}

async function discoverRunRepeatCandidates({
  brandName,
  versionName,
}: {
  brandName: string;
  versionName: string;
}) {
  const slug = slugify(`${brandName} ${versionName}`);
  const sourceUrl = `https://runrepeat.com/${slug}`;
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; StrideStackBot/0.1; +https://stride-stack.vercel.app)",
    },
    cache: "no-store",
  });

  if (response.ok) {
    const html = await response.text();
    const $ = cheerio.load(html);
    const title = cleanText($("h1").first().text() || $('meta[property="og:title"]').attr("content") || slug);

    return [
      {
        sourceUrl,
        title,
        confidence: 0.84,
      },
    ];
  }

  return [];
}

async function fetchRunRepeatArticle(candidate: RunRepeatCandidate): Promise<RunRepeatArticle> {
  const response = await fetch(candidate.sourceUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; StrideStackBot/0.1; +https://stride-stack.vercel.app)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`RunRepeat article request failed with ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const title = cleanText(
    $("h1").first().text() ||
      $('meta[property="og:title"]').attr("content") ||
      $("title").text() ||
      candidate.title,
  );
  const verdict = cleanText(
    $("h2")
      .filter((_, element) => cleanText($(element).text()).toLowerCase() === "our verdict")
      .first()
      .nextAll("p")
      .first()
      .text(),
  );
  const pros = collectListUnderHeading($, "Pros");
  const cons = collectListUnderHeading($, "Cons");
  const body = summarizeParts([verdict, pros.join(". "), cons.join(". ")], 1800);
  const summary = summarizeParts([verdict, pros.slice(0, 4).join(". "), cons.slice(0, 2).join(". ")], 420);
  const pageText = cleanText($("main").text() || $.text()).slice(0, 15000);
  const score = extractAudienceVerdict(pageText);
  const specs = extractRunRepeatSpecs(pageText);

  return {
    sourceUrl: candidate.sourceUrl,
    title,
    summary: summary || title,
    body: body || summary || title,
    publishedAt: null,
    scoreNormalized100: score,
    originalScoreValue: score ? String(score) : null,
    originalScoreScale: score ? "100" : null,
    sentiment: deriveSentiment([summary, pros.join(". "), cons.join(". ")]),
    highlights: extractHighlights([summary, pros.join(". "), cons.join(". ")]),
    rawHtml: html,
    specs,
  };
}

function collectListUnderHeading($: cheerio.CheerioAPI, heading: string) {
  const header = $("h3, h2")
    .filter((_, element) => cleanText($(element).text()).toLowerCase() === heading.toLowerCase())
    .first();

  if (!header.length) {
    return [];
  }

  const list = header.nextAll("ul").first();
  if (!list.length) {
    return [];
  }

  return list
    .find("li")
    .toArray()
    .map((element) => cleanText($(element).text()))
    .filter(Boolean)
    .slice(0, 8);
}

function extractAudienceVerdict(pageText: string) {
  const match = pageText.match(/\bAudience verdict\s+(\d{2})\b/i);
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function extractRunRepeatSpecs(pageText: string) {
  return {
    weightOzMen: extractNumber(pageText, /\bWeight[\s\S]{0,140}?(\d{1,2}(?:\.\d)?)\s*oz\b/i),
    heelStackMm: extractInt(pageText, /\bHeel stack[\s\S]{0,160}?(\d{2}(?:\.\d)?)\s*mm\b/i),
    forefootStackMm: extractInt(pageText, /\bForefoot stack[\s\S]{0,160}?(\d{2}(?:\.\d)?)\s*mm\b/i),
    dropMm: extractInt(pageText, /\bDrop[\s\S]{0,120}?(\d{1,2}(?:\.\d)?)\s*mm\b/i),
  };
}

function extractNumber(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : null;
}

function extractInt(value: string, pattern: RegExp) {
  const match = value.match(pattern);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
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
      profileUrl: "https://runrepeat.com/about",
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

async function upsertRunRepeatSpecs(
  releaseId: string,
  specs: {
    weightOzMen: string | null;
    heelStackMm: number | null;
    forefootStackMm: number | null;
    dropMm: number | null;
  },
) {
  if (!specs.weightOzMen && !specs.heelStackMm && !specs.forefootStackMm && !specs.dropMm) {
    return;
  }

  const db = getDb();
  const existing = await db.query.shoeSpecVariants.findFirst({
    where: and(eq(shoeSpecVariants.releaseId, releaseId), eq(shoeSpecVariants.variantKey, "default")),
  });

  if (!existing) {
    await db.insert(shoeSpecVariants).values({
      releaseId,
      variantKey: "default",
      displayLabel: "Default",
      audience: "unknown",
      isPrimary: true,
      weightOz: specs.weightOzMen,
      heelStackMm: specs.heelStackMm,
      forefootStackMm: specs.forefootStackMm,
      dropMm: specs.dropMm,
      sourceNotes: "RunRepeat lab measurements imported automatically.",
    });
  } else {
    await db
      .update(shoeSpecVariants)
      .set({
        weightOz: existing.weightOz ?? specs.weightOzMen,
        heelStackMm: existing.heelStackMm ?? specs.heelStackMm,
        forefootStackMm: existing.forefootStackMm ?? specs.forefootStackMm,
        dropMm: existing.dropMm ?? specs.dropMm,
        sourceNotes:
          existing.sourceNotes ??
          "RunRepeat lab measurements imported automatically.",
      })
      .where(eq(shoeSpecVariants.id, existing.id));
  }

  const legacy = await db.query.shoeSpecs.findFirst({
    where: eq(shoeSpecs.releaseId, releaseId),
  });
  const legacyValues = {
    weightOzMen: specs.weightOzMen,
    heelStackMm: specs.heelStackMm,
    forefootStackMm: specs.forefootStackMm,
    dropMm: specs.dropMm,
    sourceNotes: "RunRepeat lab measurements imported automatically.",
  };
  if (!legacy) {
    await db.insert(shoeSpecs).values({
      releaseId,
      ...legacyValues,
    });
    return;
  }
  await db
    .update(shoeSpecs)
    .set({
      weightOzMen: legacy.weightOzMen ?? specs.weightOzMen,
      heelStackMm: legacy.heelStackMm ?? specs.heelStackMm,
      forefootStackMm: legacy.forefootStackMm ?? specs.forefootStackMm,
      dropMm: legacy.dropMm ?? specs.dropMm,
      sourceNotes: legacy.sourceNotes ?? "RunRepeat lab measurements imported automatically.",
    })
    .where(eq(shoeSpecs.releaseId, releaseId));
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
