import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { brands, crawlRuns, crawlSources, rawDocuments, reviews, reviewSources, shoeReleases, shoes } from "@/db/schema";
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
      await db
        .insert(rawDocuments)
        .values({
          crawlRunId,
          sourceUrl: candidate.sourceUrl,
          contentType: "application/json",
          title: candidate.title,
          excerpt: candidate.excerpt ?? null,
          rawText: JSON.stringify(candidate.rawJson).slice(0, 12000),
          metadata: {
            importer: redditRunningShoeGeeksImporter.key,
            query,
            authorName: candidate.authorName,
            comments: candidate.commentCount,
            score: candidate.score,
          },
        })
        .onConflictDoNothing();

      const existingReview = await db.query.reviews.findFirst({
        where: eq(reviews.sourceUrl, candidate.sourceUrl),
      });

      if (!existingReview) {
        await db.insert(reviews).values({
          releaseId: selected.releaseId,
          sourceId: selected.sourceId,
          sourceUrl: candidate.sourceUrl,
          title: candidate.title,
          excerpt: candidate.excerpt ?? null,
          status: "pending",
          metadata: {
            crawlRunId,
            importer: redditRunningShoeGeeksImporter.key,
            query,
            authorName: candidate.authorName,
            comments: candidate.commentCount,
            score: candidate.score,
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

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
}
