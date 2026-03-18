import { config } from "dotenv";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { brands, reviewAuthors, reviews, reviewSources, shoeReleases, shoes } from "@/db/schema";
import { generateReleaseReviewSummary } from "@/lib/ai/review-summary";
import { appendAiReviewSummaryHistory, mergeReleaseMetadata } from "@/lib/server/release-metadata";

config({ path: process.env.DOTENV_CONFIG_PATH || ".env.local" });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 50;
  const delayMsArg = process.argv.find((arg) => arg.startsWith("--delay-ms="));
  const delayMs = delayMsArg ? Number(delayMsArg.split("=")[1]) : 1250;
  const db = getDb();

  const releaseRows = await db
    .select({
      id: shoeReleases.id,
      versionName: shoeReleases.versionName,
      category: shoes.category,
      terrain: shoes.terrain,
      stability: shoes.stability,
      metadata: shoeReleases.metadata,
      shoeName: shoes.name,
      brandName: brands.name,
    })
    .from(shoeReleases)
    .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
    .innerJoin(brands, eq(shoes.brandId, brands.id))
    .orderBy(shoeReleases.createdAt)
    .limit(limit);

  let generatedCount = 0;
  let refreshedCount = 0;
  let skippedCount = 0;
  let openAiCount = 0;
  let heuristicCount = 0;

  for (const release of releaseRows) {
    const approvedReviews = await db
      .select({
        id: reviews.id,
        title: reviews.title,
        excerpt: reviews.excerpt,
        body: reviews.body,
        scoreNormalized100: reviews.scoreNormalized100,
        sentiment: reviews.sentiment,
        publishedAt: reviews.publishedAt,
        sourceName: reviewSources.name,
        sourceType: reviewSources.sourceType,
        authorName: reviewAuthors.displayName,
      })
      .from(reviews)
      .innerJoin(reviewSources, eq(reviews.sourceId, reviewSources.id))
      .leftJoin(reviewAuthors, eq(reviews.authorId, reviewAuthors.id))
      .where(and(eq(reviews.releaseId, release.id), eq(reviews.status, "approved")));

    if (!approvedReviews.length) {
      skippedCount += 1;
      continue;
    }

    const summary = await generateReleaseReviewSummary({
      releaseLabel: `${release.brandName} ${release.versionName}`,
      category: release.category,
      terrain: release.terrain,
      stability: release.stability,
      reviews: approvedReviews.map((review) => ({
        ...review,
        publishedAt: review.publishedAt ? review.publishedAt.toISOString().slice(0, 10) : null,
      })),
    });

    const hadSummary =
      release.metadata && typeof release.metadata === "object"
        ? Boolean((release.metadata as Record<string, unknown>).aiReviewSummary)
        : false;

    const nextMetadata = appendAiReviewSummaryHistory(
      mergeReleaseMetadata(release.metadata, {
        aiReviewSummary: summary,
      }),
      {
        timestamp: new Date().toISOString(),
        eventType: hadSummary ? "refreshed" : "generated",
        provider: summary.provider,
        overview: summary.overview,
        overallSentiment: summary.overallSentiment,
        confidence: summary.confidence,
        reviewCount: summary.reviewCount,
        sourceCount: summary.sourceCount,
        evidenceCount: summary.evidence.length,
      },
    );

    await db
      .update(shoeReleases)
      .set({
        metadata: nextMetadata,
      })
      .where(eq(shoeReleases.id, release.id));

    if (hadSummary) {
      refreshedCount += 1;
    } else {
      generatedCount += 1;
    }

    if (summary.provider === "openai") {
      openAiCount += 1;
    } else {
      heuristicCount += 1;
    }

    if (process.env.OPENAI_API_KEY && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  console.info("AI summary refresh completed", {
    generatedCount,
    refreshedCount,
    skippedCount,
    openAiCount,
    heuristicCount,
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
