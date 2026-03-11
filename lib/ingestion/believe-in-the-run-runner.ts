import * as cheerio from "cheerio";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { brands, crawlRuns, crawlSources, rawDocuments, reviews, reviewSources, shoeReleases, shoes } from "@/db/schema";
import { believeInTheRunImporter } from "@/lib/ingestion/believe-in-the-run";
import type { CrawlExecutionResult } from "@/lib/ingestion/types";

interface RunBelieveInTheRunImportParams {
  releaseId: string;
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
      await db
        .insert(rawDocuments)
        .values({
          crawlRunId,
          sourceUrl: candidate.sourceUrl,
          contentType: "text/html",
          title: candidate.title,
          excerpt: candidate.excerpt ?? null,
          rawText: candidate.rawHtmlSnippet,
          metadata: {
            importer: believeInTheRunImporter.key,
            query,
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
            importer: believeInTheRunImporter.key,
            query,
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
  const results: Array<{
    sourceUrl: string;
    title: string;
    excerpt?: string;
    rawHtmlSnippet?: string;
  }> = [];

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
      excerpt: excerpt || undefined,
      rawHtmlSnippet: $.html(article).slice(0, 4000),
    });
  });

  return results.slice(0, 10);
}

function normalizeBelieveInTheRunUrl(url: string | undefined) {
  if (!url) return null;

  try {
    return new URL(url, "https://believeintherun.com").toString();
  } catch {
    return null;
  }
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
