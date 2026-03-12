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
  normalizeSearchText,
  summarizeParts,
} from "@/lib/ingestion/review-normalization";
import { redditRunningShoeGeeksImporter } from "@/lib/ingestion/reddit-running-shoe-geeks";
import type { CrawlExecutionResult } from "@/lib/ingestion/types";

interface RunRedditImportParams {
  releaseId: string;
}

interface RedditCandidate {
  sourceUrl: string;
  title: string;
  excerpt: string;
  authorName: string | undefined;
  score: number | null;
  commentCount: number | null;
  publishedAt: Date | null;
  rawJson: RedditPost;
}

export async function runRedditRunningShoeGeeksImport({
  releaseId,
}: RunRedditImportParams): Promise<CrawlExecutionResult> {
  const db = getDb();
  const reviewSourceId = await getRedditSourceId();

  if (!reviewSourceId) {
    throw new Error("Reddit RunningShoeGeeks review source is not configured.");
  }

  const release = await db
    .select({
      releaseId: shoeReleases.id,
      versionName: shoeReleases.versionName,
      shoeName: shoes.name,
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
        eq(crawlSources.importerKey, redditRunningShoeGeeksImporter.key)
      )
    )
    .where(eq(shoeReleases.id, releaseId))
    .limit(1);

  const selected = release[0];
  if (!selected) {
    throw new Error("Unable to resolve release or crawl source for Reddit RunningShoeGeeks.");
  }

  const query = redditRunningShoeGeeksImporter.normalizeQuery({
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
    const response = await fetch(buildRedditSearchJsonUrl(query), {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; StrideStackBot/0.1; +https://stride-stack.vercel.app)",
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Reddit search request failed with ${response.status}`);
    }

    const payload = (await response.json()) as RedditSearchResponse;
    const candidates = extractRedditCandidates(payload, {
      query,
      versionName: selected.versionName,
      brandName: selected.brandName,
    });

    let storedCount = 0;
    for (const candidate of candidates) {
      const enriched = await fetchRedditThread(candidate);
      const authorId = await getOrCreateReviewAuthor(selected.sourceId, enriched.authorName);
      const titleFingerprint = buildTitleFingerprint(enriched.title);

      await db
        .insert(rawDocuments)
        .values({
          crawlRunId,
          sourceUrl: enriched.sourceUrl,
          contentType: "application/json",
          title: enriched.title,
          excerpt: enriched.summary,
          rawText: JSON.stringify(enriched.rawJson).slice(0, 12000),
          metadata: {
            importer: redditRunningShoeGeeksImporter.key,
            query,
            authorName: enriched.authorName,
            comments: enriched.commentCount,
            score: enriched.score,
            threadSummary: enriched.summary,
            topComments: enriched.topComments,
            sentiment: enriched.sentiment,
            highlights: enriched.highlights,
            titleFingerprint,
          },
        })
        .onConflictDoNothing();

      const existingReview = await findPotentialDuplicateReview({
        releaseId: selected.releaseId,
        sourceId: selected.sourceId,
        sourceUrl: enriched.sourceUrl,
        titleFingerprint,
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
          sentiment: enriched.sentiment,
          status: "pending",
          publishedAt: enriched.publishedAt,
          metadata: {
            crawlRunId,
            importer: redditRunningShoeGeeksImporter.key,
            query,
            authorName: enriched.authorName,
            comments: enriched.commentCount,
            score: enriched.score,
            topComments: enriched.topComments,
            highlights: enriched.highlights,
            titleFingerprint,
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

async function getRedditSourceId() {
  const db = getDb();
  const source = await db.query.reviewSources.findFirst({
    where: eq(reviewSources.slug, redditRunningShoeGeeksImporter.sourceSlug),
  });

  return source?.id ?? null;
}

function buildRedditSearchJsonUrl(query: string) {
  const search = encodeURIComponent(query);
  return `https://www.reddit.com/r/RunningShoeGeeks/search.json?q=${search}&restrict_sr=1&sort=relevance&t=all&limit=10`;
}

function extractRedditCandidates(
  payload: RedditSearchResponse,
  { query, versionName, brandName }: { query: string; versionName: string; brandName: string }
) {
  const normalizedModelPhrase = normalizeSearchText(versionName);
  const normalizedBrand = normalizeSearchText(brandName);
  const normalizedQuery = normalizeSearchText(query);
  const reviewSignals = [
    "review",
    "impressions",
    "impression",
    "first run",
    "first run thoughts",
    "thoughts",
    "fit",
    "sizing",
    "miles",
    "kilometers",
    "km",
    "trainer rotation",
    "compared",
    "comparison",
  ];
  const children = payload.data?.children ?? [];

  const mapped = children
    .map((child) => child.data)
    .filter((post) => {
      const title = normalizeSearchText(post.title ?? "");
      const body = normalizeSearchText(post.selftext ?? "");
      const haystack = `${title} ${body}`.trim();

      if (!title.includes(normalizedModelPhrase)) {
        return false;
      }

      if (!title.includes(normalizedBrand) && !body.includes(normalizedBrand)) {
        return false;
      }

      if (looksLikeDealPost(title)) {
        return false;
      }

      const hasReviewSignal = reviewSignals.some((signal) => haystack.includes(signal));
      const hasSubstance = body.length >= 120 || (post.num_comments ?? 0) >= 8;

      return haystack.includes(normalizedQuery) || hasReviewSignal || hasSubstance;
    })
    .map((post) => ({
      sourceUrl: normalizeRedditUrl(post.permalink),
      title: cleanText(post.title ?? "Untitled Reddit thread"),
      excerpt: cleanText((post.selftext ?? "").slice(0, 400)),
      authorName: post.author ?? undefined,
      score: typeof post.score === "number" ? post.score : null,
      commentCount: typeof post.num_comments === "number" ? post.num_comments : null,
      publishedAt: unixToDate(post.created_utc),
      rawJson: post,
    }))
    .slice(0, 20);

  const candidates: RedditCandidate[] = [];
  for (const post of mapped) {
    if (!post.sourceUrl) {
      continue;
    }

    candidates.push({
      sourceUrl: post.sourceUrl,
      title: post.title,
      excerpt: post.excerpt,
      authorName: post.authorName,
      score: post.score,
      commentCount: post.commentCount,
      publishedAt: post.publishedAt,
      rawJson: post.rawJson,
    });
  }

  return candidates.slice(0, 10);
}

function normalizeRedditUrl(permalink: string | undefined) {
  if (!permalink) return null;

  try {
    return new URL(permalink, "https://www.reddit.com").toString();
  } catch {
    return null;
  }
}

async function fetchRedditThread(candidate: RedditCandidate) {
  const response = await fetch(buildRedditThreadJsonUrl(candidate.sourceUrl), {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; StrideStackBot/0.1; +https://stride-stack.vercel.app)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return enrichFallbackCandidate(candidate);
  }

  const payload = (await response.json()) as RedditThreadResponse;
  const threadCandidate = payload[0]?.data?.children?.[0]?.data;
  const thread = isRedditPost(threadCandidate) ? threadCandidate : null;
  if (!thread) {
    return enrichFallbackCandidate(candidate);
  }

  const topComments = (payload[1]?.data?.children ?? [])
    .map((child) => child.data)
    .filter(isRedditComment)
    .filter((comment) => Boolean(comment.body))
    .filter((comment) => !comment.stickied)
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
    .slice(0, 3)
    .map((comment) => ({
      authorName: comment.author ?? "unknown",
      score: comment.score ?? null,
      body: cleanText(comment.body ?? "").slice(0, 280),
    }))
    .filter((comment) => comment.body.length > 0);

  const summary = buildThreadSummary({
    excerpt: candidate.excerpt,
    body: thread.selftext ?? "",
    topComments: topComments.map((comment) => comment.body),
  });
  const body = buildThreadBody({
    title: candidate.title,
    selfText: thread.selftext ?? "",
    topComments,
  });

  return {
    sourceUrl: candidate.sourceUrl,
    title: cleanText(thread.title ?? candidate.title),
    authorName: thread.author ?? candidate.authorName,
    score: typeof thread.score === "number" ? thread.score : candidate.score,
    commentCount:
      typeof thread.num_comments === "number" ? thread.num_comments : candidate.commentCount,
    publishedAt: unixToDate(thread.created_utc) ?? candidate.publishedAt,
    summary,
    body,
    sentiment: deriveSentiment([summary, ...topComments.map((comment) => comment.body)]),
    highlights: extractHighlights([summary, ...topComments.map((comment) => comment.body)]),
    topComments,
    rawJson: payload,
  };
}

function enrichFallbackCandidate(candidate: RedditCandidate) {
  const summary = candidate.excerpt || candidate.title;

  return {
    sourceUrl: candidate.sourceUrl,
    title: candidate.title,
    authorName: candidate.authorName,
    score: candidate.score,
    commentCount: candidate.commentCount,
    publishedAt: candidate.publishedAt,
    summary,
    body: summary,
    sentiment: deriveSentiment([summary]),
    highlights: extractHighlights([summary]),
    topComments: [],
    rawJson: candidate.rawJson,
  };
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
      profileUrl: `https://www.reddit.com/user/${encodeURIComponent(authorName)}/`,
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

function buildRedditThreadJsonUrl(sourceUrl: string) {
  return `${sourceUrl.replace(/\/$/, "")}.json?limit=8&depth=1&sort=top`;
}

function buildThreadSummary({
  excerpt,
  body,
  topComments,
}: {
  excerpt: string;
  body: string;
  topComments: string[];
}) {
  return summarizeParts([body, excerpt, ...topComments], 420);
}

function buildThreadBody({
  title,
  selfText,
  topComments,
}: {
  title: string;
  selfText: string;
  topComments: Array<{ authorName: string; score: number | null; body: string }>;
}) {
  const segments = [title];

  if (cleanText(selfText)) {
    segments.push(cleanText(selfText));
  }

  for (const comment of topComments) {
    segments.push(`Top comment by ${comment.authorName}: ${comment.body}`);
  }

  return segments.join("\n\n").slice(0, 4000);
}

function unixToDate(value: number | undefined) {
  if (typeof value !== "number") {
    return null;
  }

  return new Date(value * 1000);
}

function looksLikeDealPost(title: string) {
  const dealSignals = [
    "discount",
    "sale",
    "deal",
    "coupon",
    "promo",
    "code",
    "rei x",
    "rei",
    "running warehouse",
    "runningwarehouse",
    "saucony com",
    "sauconycom",
    "nike com",
    "nikecom",
    "dicks",
    "sporting goods",
  ];

  return dealSignals.some((signal) => title.includes(signal));
}

interface RedditSearchResponse {
  data?: {
    children?: Array<{
      data: RedditPost;
    }>;
  };
}

interface RedditPost {
  title?: string;
  selftext?: string;
  permalink?: string;
  author?: string;
  score?: number;
  num_comments?: number;
  created_utc?: number;
}

type RedditThreadResponse = RedditThreadListing[];

interface RedditThreadListing {
  data?: {
    children?: Array<{
      data: RedditPost | RedditComment;
    }>;
  };
}

interface RedditComment {
  body?: string;
  author?: string;
  score?: number;
  stickied?: boolean;
}

function isRedditPost(value: RedditPost | RedditComment | undefined): value is RedditPost {
  if (!value) {
    return false;
  }

  return "title" in value || "selftext" in value || "permalink" in value;
}

function isRedditComment(value: RedditPost | RedditComment | undefined): value is RedditComment {
  if (!value) {
    return false;
  }

  return "body" in value || "stickied" in value;
}
