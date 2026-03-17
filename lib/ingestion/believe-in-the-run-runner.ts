import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";
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
import { believeInTheRunImporter } from "@/lib/ingestion/believe-in-the-run";
import {
  areFingerprintsSimilar,
  buildTitleFingerprint,
  cleanText,
  deriveSentiment,
  extractHighlights,
  normalizeSearchText,
  summarizeParts,
} from "@/lib/ingestion/review-normalization";
import type { CrawlExecutionResult } from "@/lib/ingestion/types";

interface RunBelieveInTheRunImportParams {
  releaseId: string;
}

interface BelieveInTheRunCandidate {
  sourceUrl: string;
  title: string;
  excerpt: string;
  publishedAt: Date | null;
  confidence: number;
  rawHtmlSnippet?: string;
}

export async function runBelieveInTheRunImport({
  releaseId,
}: RunBelieveInTheRunImportParams): Promise<CrawlExecutionResult> {
  const db = getDb();
  const reviewSourceId = await getBelieveInTheRunSourceId();

  if (!reviewSourceId) {
    throw new Error("Believe in the Run review source is not configured.");
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
      and(
        eq(crawlSources.reviewSourceId, reviewSourceId),
        eq(crawlSources.importerKey, believeInTheRunImporter.key)
      )
    )
    .where(eq(shoeReleases.id, releaseId))
    .limit(1);

  const selected = release[0];
  if (!selected) {
    throw new Error("Unable to resolve release or crawl source for Believe in the Run.");
  }

  const query = believeInTheRunImporter.normalizeQuery({
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
        importer: believeInTheRunImporter.key,
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
    const candidates = await discoverBelieveInTheRunCandidates({
      brandName: selected.brandName,
      versionName: selected.versionName,
      query,
    });
    const averageCandidateConfidence = getAverageConfidence(candidates);
    const maxCandidateConfidence = getMaxConfidence(candidates);
    let fallbackCount = 0;

    let storedCount = 0;
    for (const candidate of candidates) {
      failureStage = "article-fetch";
      const enriched = await fetchBelieveInTheRunArticle(candidate);
      if (enriched.usedFallback) {
        fallbackCount += 1;
      }
      const authorId = await getOrCreateReviewAuthor(selected.sourceId, enriched.authorName);
      const titleFingerprint = buildTitleFingerprint(enriched.title);
      const importerConfidence = getBelieveInTheRunConfidence(candidate, enriched.summary, enriched.body);

      failureStage = "raw-document-persist";
      await db
        .insert(rawDocuments)
        .values({
          crawlRunId,
          sourceUrl: enriched.sourceUrl,
          contentType: "text/html",
          title: enriched.title,
          excerpt: enriched.summary,
          rawText: enriched.rawHtml.slice(0, 12000),
          metadata: {
            importer: believeInTheRunImporter.key,
            query,
            authorName: enriched.authorName,
            publishedAt: enriched.publishedAt?.toISOString() ?? null,
            scoreNormalized100: enriched.scoreNormalized100,
            originalScoreValue: enriched.originalScoreValue,
            originalScoreScale: enriched.originalScoreScale,
            highlights: enriched.highlights,
            titleFingerprint,
            importerConfidence,
          },
        })
        .onConflictDoNothing();

      failureStage = "review-dedupe";
      const existingReview = await findPotentialDuplicateReview({
        releaseId: selected.releaseId,
        sourceId: selected.sourceId,
        sourceUrl: enriched.sourceUrl,
        titleFingerprint,
      });

      if (!existingReview) {
        failureStage = "review-insert";
        await db.insert(reviews).values({
          releaseId: selected.releaseId,
          sourceId: selected.sourceId,
          authorId,
          sourceUrl: enriched.sourceUrl,
          title: enriched.title,
          excerpt: enriched.summary,
          body: enriched.body,
          scoreNormalized100: enriched.scoreNormalized100,
          originalScoreValue: enriched.originalScoreValue,
          originalScoreScale: enriched.originalScoreScale,
          sentiment: enriched.sentiment,
          status: "pending",
          publishedAt: enriched.publishedAt,
          metadata: {
            crawlRunId,
            importer: believeInTheRunImporter.key,
            query,
            authorName: enriched.authorName,
            highlights: enriched.highlights,
            titleFingerprint,
            importerConfidence,
          },
        });
        storedCount += 1;
      }
    }

    const status = determineRunStatus({
      discoveredCount: candidates.length,
      storedCount,
      fallbackCount,
    });

    await db
      .update(crawlRuns)
      .set({
        status,
        discoveredCount: candidates.length,
        storedCount,
        finishedAt: new Date(),
        metadata: {
          importer: believeInTheRunImporter.key,
          releaseId: selected.releaseId,
          discoveryStrategy: "sitemap",
          averageCandidateConfidence,
          maxCandidateConfidence,
          fallbackCount,
          failureStage: null,
          noHitReason: candidates.length === 0 ? "no matching review urls found in sitemap" : null,
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
          importer: believeInTheRunImporter.key,
          releaseId: selected.releaseId,
          failureStage,
        },
      })
      .where(eq(crawlRuns.id, crawlRunId));
    throw error;
  }
}

async function getBelieveInTheRunSourceId() {
  const db = getDb();
  const source = await db.query.reviewSources.findFirst({
    where: eq(reviewSources.slug, believeInTheRunImporter.sourceSlug),
  });

  return source?.id ?? null;
}

async function discoverBelieveInTheRunCandidates({
  brandName,
  versionName,
  query,
}: {
  brandName: string;
  versionName: string;
  query: string;
}) {
  const sitemapUrls = await getBelieveInTheRunSitemapUrls();
  const allEntries = await Promise.all(sitemapUrls.map(fetchBelieveInTheRunSitemapEntries));
  const entries = allEntries.flat();

  const normalizedBrand = normalizeSearchText(brandName);
  const normalizedModelPhrase = normalizeSearchText(versionName);
  const normalizedQuery = normalizeSearchText(query);

  return entries
    .filter((entry) => entry.url.includes("/shoe-reviews/"))
    .filter((entry) => {
      const haystack = normalizeSearchText(`${entry.url} ${entry.title}`);

      if (!haystack.includes(normalizedModelPhrase)) {
        return false;
      }

      if (!haystack.includes(normalizedBrand)) {
        return false;
      }

      if (looksLikeNonReviewSlug(entry.url)) {
        return false;
      }

      return haystack.includes(normalizedQuery) || haystack.includes(normalizedModelPhrase);
    })
    .slice(0, 10)
    .map((entry) => ({
      sourceUrl: entry.url,
      title: entry.title,
      excerpt: "",
      publishedAt: entry.lastmod,
      confidence: getSitemapMatchConfidence({
        url: entry.url,
        title: entry.title,
        normalizedBrand,
        normalizedModelPhrase,
        normalizedQuery,
      }),
    }));
}

async function getBelieveInTheRunSitemapUrls() {
  const response = await fetch("https://believeintherun.com/sitemap_index.xml", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; StrideStackBot/0.1; +https://stride-stack.vercel.app)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Believe in the Run sitemap index request failed with ${response.status}`);
  }

  const xml = await response.text();

  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((match) => match[1])
    .filter((url) => /\/shoe-sitemap\d*\.xml$/.test(url));
}

async function fetchBelieveInTheRunSitemapEntries(sitemapUrl: string) {
  const response = await fetch(sitemapUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; StrideStackBot/0.1; +https://stride-stack.vercel.app)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Believe in the Run sitemap request failed with ${response.status}`);
  }

  const xml = await response.text();
  const urlBlocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);

  return urlBlocks
    .map((block) => {
      const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
      const lastmodRaw = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];

      if (!loc) {
        return null;
      }

      return {
        url: loc,
        title: humanizeBelieveInTheRunSlug(loc),
        lastmod: parsePublishedDate(lastmodRaw),
      };
    })
    .filter((entry): entry is { url: string; title: string; lastmod: Date | null } => Boolean(entry));
}

async function fetchBelieveInTheRunArticle(candidate: BelieveInTheRunCandidate) {
  const response = await fetch(candidate.sourceUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; StrideStackBot/0.1; +https://stride-stack.vercel.app)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return enrichFallbackCandidate(candidate);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const article = $("article").first();
  const schema = extractArticleSchema($);
  const title = cleanText(
    article.find("h1").first().text() ||
      schema?.headline ||
      $('meta[property="og:title"]').attr("content") ||
      candidate.title
  );
  const authorName = cleanText(
    article.find('[rel="author"], .author a, .post-author a, .byline a').first().text() ||
      schema?.authorName ||
      ""
  );
  const publishedAt = parsePublishedDate(
    article.find("time[datetime]").attr("datetime") ||
      schema?.datePublished ||
      $('meta[property="article:published_time"]').attr("content") ||
      $("time").first().attr("datetime")
  );
  const bodyText = extractArticleBodyText($, article);
  const summary = summarizeParts([candidate.excerpt, schema?.description || "", bodyText], 420);
  const score = extractScore($, article);
  const sentiment = deriveSentiment([summary, bodyText, schema?.description || ""]);
  const highlights = extractHighlights([summary, bodyText, schema?.description || ""]);

  return {
    sourceUrl: candidate.sourceUrl,
    title,
    authorName: authorName || undefined,
    publishedAt: publishedAt ?? candidate.publishedAt,
    summary: summary || schema?.description || candidate.excerpt || title,
    body: bodyText || schema?.description || candidate.excerpt || title,
    scoreNormalized100: score?.scoreNormalized100 ?? null,
    originalScoreValue: score?.originalScoreValue ?? null,
    originalScoreScale: score?.originalScoreScale ?? null,
    sentiment,
    highlights,
    rawHtml: html,
    usedFallback: false,
  };
}

function extractArticleBodyText($: cheerio.CheerioAPI, article: cheerio.Cheerio<AnyNode>) {
  const containers = [
    article.find(".entry-content").first(),
    article.find(".post-content").first(),
    article.find('[itemprop="articleBody"]').first(),
    article,
  ];

  for (const container of containers) {
    if (!container || container.length === 0) {
      continue;
    }

    const paragraphs = container
      .find("p")
      .toArray()
      .map((element) => cleanText($(element).text()))
      .filter((text) => text.length > 40)
      .filter((text) => !looksLikeUiChrome(text))
      .slice(0, 12);

    if (paragraphs.length > 0) {
      return paragraphs.join("\n\n").slice(0, 4000);
    }
  }

  return "";
}

function extractArticleSchema($: cheerio.CheerioAPI) {
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const script of scripts) {
    const raw = $(script).text().trim();
    if (!raw) {
      continue;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const graph = Array.isArray(parsed["@graph"])
        ? (parsed["@graph"] as Array<Record<string, unknown>>)
        : [parsed];

      for (const node of graph) {
        const type = node["@type"];
        const types = Array.isArray(type) ? type : [type];

        if (!types.some((value) => value === "Article" || value === "NewsArticle" || value === "WebPage")) {
          continue;
        }

        const author = node.author as Record<string, unknown> | Array<Record<string, unknown>> | undefined;
        const firstAuthor = Array.isArray(author) ? author[0] : author;

        return {
          headline: cleanText(
            stringOrNull(node.headline) || stringOrNull(node.name)?.replace(" - Believe in the Run", "") || ""
          ),
          description: cleanText(stringOrNull(node.description) || ""),
          datePublished: stringOrNull(node.datePublished),
          authorName: stringOrNull(firstAuthor?.name),
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function extractScore($: cheerio.CheerioAPI, article: cheerio.Cheerio<AnyNode>) {
  const visibleText = cleanText(article.text()).slice(0, 12000);
  const metaRating = $('meta[itemprop="ratingValue"]').attr("content");
  const metaBest = $('meta[itemprop="bestRating"]').attr("content");

  if (metaRating) {
    const ratingValue = Number(metaRating);
    const ratingScale = Number(metaBest || "10");
    if (Number.isFinite(ratingValue) && Number.isFinite(ratingScale) && ratingScale > 0) {
      return {
        originalScoreValue: ratingValue.toFixed(1),
        originalScoreScale: ratingScale.toFixed(1),
        scoreNormalized100: normalizeScore(ratingValue, ratingScale),
      };
    }
  }

  const patterns = [
    /(\d+(?:\.\d+)?)\s*\/\s*(10|5|100)\b/i,
    /\bscore[:\s]+(\d+(?:\.\d+)?)\s*(?:out of)?\s*(10|5|100)\b/i,
    /\brating[:\s]+(\d+(?:\.\d+)?)\s*(?:out of)?\s*(10|5|100)\b/i,
  ];

  for (const pattern of patterns) {
    const match = visibleText.match(pattern);
    if (!match) {
      continue;
    }

    const ratingValue = Number(match[1]);
    const ratingScale = Number(match[2]);
    if (Number.isFinite(ratingValue) && Number.isFinite(ratingScale) && ratingScale > 0) {
      return {
        originalScoreValue: ratingValue.toFixed(1),
        originalScoreScale: ratingScale.toFixed(1),
        scoreNormalized100: normalizeScore(ratingValue, ratingScale),
      };
    }
  }

  return null;
}

async function getOrCreateReviewAuthor(sourceId: string, authorName: string | undefined) {
  if (!authorName) {
    return null;
  }

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

function enrichFallbackCandidate(candidate: BelieveInTheRunCandidate) {
  return {
    sourceUrl: candidate.sourceUrl,
    title: candidate.title,
    authorName: undefined,
    publishedAt: candidate.publishedAt,
    summary: candidate.excerpt || candidate.title,
    body: candidate.excerpt || candidate.title,
    scoreNormalized100: null,
    originalScoreValue: null,
    originalScoreScale: null,
    sentiment: deriveSentiment([candidate.excerpt || candidate.title]),
    highlights: extractHighlights([candidate.excerpt || candidate.title]),
    rawHtml: candidate.rawHtmlSnippet || "",
    usedFallback: true,
  };
}

function determineRunStatus({
  discoveredCount,
  storedCount,
  fallbackCount,
}: {
  discoveredCount: number;
  storedCount: number;
  fallbackCount: number;
}) {
  if (discoveredCount === 0) {
    return "succeeded" as const;
  }

  if (storedCount === 0 || fallbackCount > 0) {
    return "partial" as const;
  }

  return "succeeded" as const;
}

function getSitemapMatchConfidence({
  url,
  title,
  normalizedBrand,
  normalizedModelPhrase,
  normalizedQuery,
}: {
  url: string;
  title: string;
  normalizedBrand: string;
  normalizedModelPhrase: string;
  normalizedQuery: string;
}) {
  const haystack = normalizeSearchText(`${url} ${title}`);
  let score = 0.5;

  if (haystack.includes(normalizedBrand)) {
    score += 0.15;
  }

  if (haystack.includes(normalizedModelPhrase)) {
    score += 0.2;
  }

  if (haystack.includes(normalizedQuery)) {
    score += 0.1;
  }

  if (url.includes("/shoe-reviews/")) {
    score += 0.05;
  }

  return clampConfidence(score);
}

function getBelieveInTheRunConfidence(candidate: BelieveInTheRunCandidate, summary: string, body: string) {
  let score = candidate.confidence;
  const combined = cleanText(`${summary} ${body}`);

  if (combined.length >= 600) {
    score += 0.1;
  }

  if (combined.length >= 1200) {
    score += 0.05;
  }

  if (extractHighlights([combined]).length > 0) {
    score += 0.05;
  }

  return clampConfidence(score);
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

function clampConfidence(value: number) {
  return Number(Math.max(0, Math.min(1, value)).toFixed(2));
}

function humanizeBelieveInTheRunSlug(url: string) {
  const slug = url
    .replace(/^https:\/\/believeintherun\.com\/shoe-reviews\//, "")
    .replace(/\/$/, "")
    .split("/")
    .pop();

  if (!slug) {
    return url;
  }

  return cleanText(slug.replace(/-/g, " "));
}

function parsePublishedDate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeScore(value: number, scale: number) {
  return Math.max(0, Math.min(100, Math.round((value / scale) * 100)));
}

function looksLikeUiChrome(text: string) {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("subscribe") ||
    normalized.includes("newsletter") ||
    normalized.includes("follow us") ||
    normalized.includes("shop") ||
    normalized.includes("podcast")
  );
}

function looksLikeNonReviewSlug(url: string) {
  const normalized = normalizeSearchText(url);
  const nonReviewSignals = [
    "best ",
    "preview",
    "drops",
    "sale",
    "currently running",
    "weekly rundown",
    "blue jean mile",
    "believe in the run austin",
  ];

  return nonReviewSignals.some((signal) => normalized.includes(signal));
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}
