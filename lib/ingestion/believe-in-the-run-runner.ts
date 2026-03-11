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
import type { CrawlExecutionResult } from "@/lib/ingestion/types";

interface RunBelieveInTheRunImportParams {
  releaseId: string;
}

interface BelieveInTheRunCandidate {
  sourceUrl: string;
  title: string;
  excerpt: string;
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
    })
    .returning({ id: crawlRuns.id });

  const crawlRunId = run[0]?.id;
  if (!crawlRunId) {
    throw new Error("Unable to create crawl run.");
  }

  try {
    const searchUrl = believeInTheRunImporter.buildSearchUrl({
      brandName: selected.brandName,
      shoeName: selected.versionName,
    });
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; StrideStackBot/0.1; +https://stride-stack.vercel.app)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Believe in the Run search request failed with ${response.status}`);
    }

    const html = await response.text();
    const candidates = extractBelieveInTheRunCandidates(html, query);

    let storedCount = 0;
    for (const candidate of candidates) {
      const enriched = await fetchBelieveInTheRunArticle(candidate);
      const authorId = await getOrCreateReviewAuthor(selected.sourceId, enriched.authorName);

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
          },
        })
        .onConflictDoNothing();

      const existingReview = await db.query.reviews.findFirst({
        where: eq(reviews.sourceUrl, enriched.sourceUrl),
      });

      if (!existingReview) {
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
          },
        });
        storedCount += 1;
      }
    }

    await db
      .update(crawlRuns)
      .set({
        status: "succeeded",
        discoveredCount: candidates.length,
        storedCount,
        finishedAt: new Date(),
      })
      .where(eq(crawlRuns.id, crawlRunId));

    return {
      discoveredCount: candidates.length,
      storedCount,
      urls: candidates.map((candidate) => candidate.sourceUrl),
    };
  } catch (error) {
    await db
      .update(crawlRuns)
      .set({
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown crawl error",
        finishedAt: new Date(),
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

function extractBelieveInTheRunCandidates(html: string, query: string) {
  const $ = cheerio.load(html);
  const urls = new Set<string>();
  const queryTokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.replace(/[^a-z0-9]/g, ""))
    .filter((token) => token.length >= 3);
  const results: BelieveInTheRunCandidate[] = [];

  $("article").each((_, article) => {
    const root = $(article);
    const link = root.find("h2 a, h3 a, a[rel='bookmark']").first();
    const href = normalizeBelieveInTheRunUrl(link.attr("href"));
    const title = cleanText(link.text());
    const excerpt = cleanText(root.find("p").first().text());

    if (!href || !title || urls.has(href)) {
      return;
    }

    if (!href.startsWith("https://believeintherun.com/")) {
      return;
    }

    if (href.includes("/event/") || href.includes("/tag/") || href.includes("/category/")) {
      return;
    }

    const haystack = `${title} ${excerpt}`.toLowerCase();
    const matchingTokens = queryTokens.filter((token) => haystack.includes(token));

    if (matchingTokens.length < Math.min(2, queryTokens.length)) {
      return;
    }

    urls.add(href);
    results.push({
      sourceUrl: href,
      title,
      excerpt,
      rawHtmlSnippet: $.html(article).slice(0, 4000),
    });
  });

  return results.slice(0, 10);
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
  const summary = [candidate.excerpt, schema?.description || "", bodyText]
    .filter(Boolean)
    .join(" ")
    .slice(0, 420)
    .trim();
  const score = extractScore($, article);
  const sentiment = deriveEditorialSentiment(summary);

  return {
    sourceUrl: candidate.sourceUrl,
    title,
    authorName: authorName || undefined,
    publishedAt,
    summary: summary || candidate.excerpt || title,
    body: bodyText || schema?.description || candidate.excerpt || title,
    scoreNormalized100: score?.scoreNormalized100 ?? null,
    originalScoreValue: score?.originalScoreValue ?? null,
    originalScoreScale: score?.originalScoreScale ?? null,
    sentiment,
    rawHtml: html,
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

function enrichFallbackCandidate(candidate: BelieveInTheRunCandidate) {
  return {
    sourceUrl: candidate.sourceUrl,
    title: candidate.title,
    authorName: undefined,
    publishedAt: null,
    summary: candidate.excerpt || candidate.title,
    body: candidate.excerpt || candidate.title,
    scoreNormalized100: null,
    originalScoreValue: null,
    originalScoreScale: null,
    sentiment: deriveEditorialSentiment(candidate.excerpt || candidate.title),
    rawHtml: candidate.rawHtmlSnippet || "",
  };
}

function normalizeBelieveInTheRunUrl(url: string | undefined) {
  if (!url) return null;

  try {
    return new URL(url, "https://believeintherun.com").toString();
  } catch {
    return null;
  }
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

function deriveEditorialSentiment(text: string) {
  const haystack = text.toLowerCase();
  const positiveSignals = ["great", "excellent", "best", "fun", "smooth", "comfortable", "impressive"];
  const negativeSignals = ["bad", "harsh", "firm", "awkward", "disappointing", "problem", "issue"];

  const positiveCount = positiveSignals.filter((signal) => haystack.includes(signal)).length;
  const negativeCount = negativeSignals.filter((signal) => haystack.includes(signal)).length;

  if (positiveCount >= negativeCount + 2) {
    return "positive" as const;
  }

  if (negativeCount >= positiveCount + 2) {
    return "negative" as const;
  }

  return "mixed" as const;
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

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}
