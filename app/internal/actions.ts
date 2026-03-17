"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { runBelieveInTheRunImport } from "@/lib/ingestion/believe-in-the-run-runner";
import { runDoctorsOfRunningImport } from "@/lib/ingestion/doctors-of-running-runner";
import { runRedditRunningShoeGeeksImport } from "@/lib/ingestion/reddit-running-shoe-geeks-runner";
import { runRunRepeatImport } from "@/lib/ingestion/runrepeat-runner";
import { runScheduledIngestion } from "@/lib/ingestion/scheduler";
import { generateReleaseReviewSummary } from "@/lib/ai/review-summary";
import { appendAiReviewSummaryHistory, mergeReleaseMetadata } from "@/lib/server/release-metadata";
import {
  brands,
  crawlSources,
  reviewAuthors,
  reviews,
  reviewSources,
  shoeReleases,
  shoes,
  shoeSpecs,
} from "@/db/schema";

function requireDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return getDb();
}

export async function createReviewSourceAction(formData: FormData) {
  const db = requireDatabase();
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const sourceType = String(formData.get("sourceType") ?? "").trim() as "editorial" | "reddit" | "user";
  const siteUrl = String(formData.get("siteUrl") ?? "").trim();
  const baseDomain = String(formData.get("baseDomain") ?? "").trim();

  if (!name || !slug || !sourceType) {
    throw new Error("Missing required source fields.");
  }

  await db.insert(reviewSources).values({
    name,
    slug,
    sourceType,
    siteUrl: siteUrl || null,
    baseDomain: baseDomain || null,
  });

  revalidatePath("/internal");
}

export async function createBrandAction(formData: FormData) {
  const db = requireDatabase();
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();

  if (!name) {
    throw new Error("Brand name is required.");
  }

  const slug = rawSlug || slugify(name);

  await db.insert(brands).values({
    name,
    slug,
    websiteUrl: websiteUrl || null,
  });

  revalidatePath("/internal");
  revalidatePath("/shoes");
}

export async function createShoeModelAction(formData: FormData) {
  const db = requireDatabase();
  const brandId = String(formData.get("brandId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() as
    | "road-daily"
    | "road-workout"
    | "road-race"
    | "trail-daily"
    | "trail-race"
    | "track-spikes"
    | "hiking-fastpack";
  const terrain = String(formData.get("terrain") ?? "").trim() as "road" | "trail" | "track" | "mixed";
  const stability = String(formData.get("stability") ?? "").trim() as "neutral" | "stability";
  const usageSummary = String(formData.get("usageSummary") ?? "").trim();

  if (!brandId || !name || !category || !terrain || !stability) {
    throw new Error("Missing required shoe fields.");
  }

  const slug = rawSlug || slugify(name);

  await db.insert(shoes).values({
    brandId,
    name,
    slug,
    category,
    terrain,
    stability,
    usageSummary: usageSummary || null,
  });

  revalidatePath("/internal");
  revalidatePath("/shoes");
}

export async function upsertReleaseAction(formData: FormData) {
  const db = requireDatabase();
  const shoeId = String(formData.get("shoeId") ?? "").trim();
  const versionName = String(formData.get("versionName") ?? "").trim();
  const releaseYearRaw = String(formData.get("releaseYear") ?? "").trim();
  const msrpUsd = String(formData.get("msrpUsd") ?? "").trim();
  const isCurrent = formData.get("isCurrent") === "on";
  const isPlated = formData.get("isPlated") === "on";
  const foam = String(formData.get("foam") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const weightOzMen = String(formData.get("weightOzMen") ?? "").trim();
  const heelStackMmRaw = String(formData.get("heelStackMm") ?? "").trim();
  const forefootStackMmRaw = String(formData.get("forefootStackMm") ?? "").trim();
  const dropMmRaw = String(formData.get("dropMm") ?? "").trim();
  const fitNotes = String(formData.get("fitNotes") ?? "").trim();
  const sourceNotes = String(formData.get("sourceNotes") ?? "").trim();
  const editorialSummaryNote = String(formData.get("editorialSummaryNote") ?? "").trim();
  const pinnedTakeawaysRaw = String(formData.get("pinnedTakeaways") ?? "").trim();
  const ignoredThemesRaw = String(formData.get("ignoredThemes") ?? "").trim();

  if (!shoeId || !versionName) {
    throw new Error("Shoe and version name are required.");
  }

  const existingRelease = await db.query.shoeReleases.findFirst({
    where: and(eq(shoeReleases.shoeId, shoeId), eq(shoeReleases.versionName, versionName)),
  });

  const pinnedTakeaways = pinnedTakeawaysRaw
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 5);
  const ignoredThemes = ignoredThemesRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 8);
  const metadata = mergeReleaseMetadata(existingRelease?.metadata, {
    editorialReviewSummary: {
      summaryNote: editorialSummaryNote || null,
      pinnedTakeaways,
      ignoredThemes,
    },
  });

  const inserted = await db
    .insert(shoeReleases)
    .values({
      shoeId,
      versionName,
      releaseYear: releaseYearRaw ? Number(releaseYearRaw) : null,
      msrpUsd: msrpUsd || null,
      isCurrent,
      isPlated,
      foam: foam || null,
      notes: notes || null,
      metadata,
    })
    .onConflictDoUpdate({
      target: [shoeReleases.shoeId, shoeReleases.versionName],
      set: {
        releaseYear: releaseYearRaw ? Number(releaseYearRaw) : null,
        msrpUsd: msrpUsd || null,
        isCurrent,
        isPlated,
        foam: foam || null,
        notes: notes || null,
        metadata,
      },
    })
    .returning({ id: shoeReleases.id });

  const releaseId = inserted[0]?.id;
  if (!releaseId) {
    const existing = await db.query.shoeReleases.findFirst({
      where: and(eq(shoeReleases.shoeId, shoeId), eq(shoeReleases.versionName, versionName)),
    });

    if (!existing) {
      throw new Error("Unable to resolve release after upsert.");
    }
  }

  const resolvedReleaseId = releaseId
    ? releaseId
    : (
        await db.query.shoeReleases.findFirst({
          where: and(eq(shoeReleases.shoeId, shoeId), eq(shoeReleases.versionName, versionName)),
        })
      )?.id;

  if (!resolvedReleaseId) {
    throw new Error("Unable to resolve release id.");
  }

  const existingSpec = await db.query.shoeSpecs.findFirst({
    where: eq(shoeSpecs.releaseId, resolvedReleaseId),
  });

  const specValues = {
    weightOzMen: weightOzMen || null,
    heelStackMm: heelStackMmRaw ? Number(heelStackMmRaw) : null,
    forefootStackMm: forefootStackMmRaw ? Number(forefootStackMmRaw) : null,
    dropMm: dropMmRaw ? Number(dropMmRaw) : null,
    fitNotes: fitNotes || null,
    sourceNotes: sourceNotes || null,
  };

  if (existingSpec) {
    await db.update(shoeSpecs).set(specValues).where(eq(shoeSpecs.releaseId, resolvedReleaseId));
  } else {
    await db.insert(shoeSpecs).values({
      releaseId: resolvedReleaseId,
      ...specValues,
    });
  }

  revalidatePath("/internal");
  revalidatePath("/shoes");
}

export async function createManualReviewAction(formData: FormData) {
  const db = requireDatabase();
  const releaseId = String(formData.get("releaseId") ?? "").trim();
  const sourceId = String(formData.get("sourceId") ?? "").trim();
  const authorName = String(formData.get("authorName") ?? "").trim();
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const excerpt = String(formData.get("excerpt") ?? "").trim();
  const scoreNormalized100Raw = String(formData.get("scoreNormalized100") ?? "").trim();
  const sentiment = String(formData.get("sentiment") ?? "").trim() as "positive" | "mixed" | "negative";

  if (!releaseId || !sourceId || !sourceUrl) {
    throw new Error("Release, source, and source URL are required.");
  }

  let authorId: string | null = null;
  if (authorName) {
    const existingAuthor = await db.query.reviewAuthors.findFirst({
      where: eq(reviewAuthors.displayName, authorName),
    });

    if (existingAuthor) {
      authorId = existingAuthor.id;
    } else {
      const inserted = await db
        .insert(reviewAuthors)
        .values({
          sourceId,
          displayName: authorName,
        })
        .returning({ id: reviewAuthors.id });

      authorId = inserted[0]?.id ?? null;
    }
  }

  await db.insert(reviews).values({
    releaseId,
    sourceId,
    authorId,
    sourceUrl,
    title: title || null,
    excerpt: excerpt || null,
    scoreNormalized100: scoreNormalized100Raw ? Number(scoreNormalized100Raw) : null,
    sentiment: sentiment || null,
    status: "pending",
  });

  revalidatePath("/internal");
  revalidatePath("/shoes");
}

export async function updateReviewStatusAction(formData: FormData) {
  const db = requireDatabase();
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as
    | "pending"
    | "approved"
    | "rejected"
    | "flagged";

  if (!reviewId || !status) {
    throw new Error("Review id and status are required.");
  }

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, reviewId),
  });

  if (!review) {
    throw new Error("Review not found.");
  }

  await db.update(reviews).set({ status }).where(eq(reviews.id, reviewId));
  const result = await regenerateAiReviewSummaryForRelease(db, review.releaseId);

  revalidatePath("/internal");
  revalidatePath("/shoes");
  if (result.shoeSlug) {
    revalidatePath(`/shoes/${result.shoeSlug}`);
  }
}

export async function updateReviewEditorialOverridesAction(formData: FormData) {
  const db = requireDatabase();
  const reviewId = String(formData.get("reviewId") ?? "").trim();
  const sentimentRaw = String(formData.get("sentiment") ?? "").trim();
  const highlightsRaw = String(formData.get("highlights") ?? "").trim();
  const duplicateOfReviewIdRaw = String(formData.get("duplicateOfReviewId") ?? "").trim();

  if (!reviewId) {
    throw new Error("Review id is required.");
  }

  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, reviewId),
  });

  if (!review) {
    throw new Error("Review not found.");
  }

  const sentiment = sentimentRaw
    ? (sentimentRaw as "positive" | "mixed" | "negative")
    : null;
  const highlights = highlightsRaw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 4);
  const duplicateOfReviewId =
    duplicateOfReviewIdRaw && duplicateOfReviewIdRaw !== reviewId ? duplicateOfReviewIdRaw : null;

  const existingMetadata =
    review.metadata && typeof review.metadata === "object"
      ? { ...(review.metadata as Record<string, unknown>) }
      : {};

  if (sentiment) {
    existingMetadata.editorialSentimentOverride = sentiment;
  } else {
    delete existingMetadata.editorialSentimentOverride;
  }

  if (highlights.length) {
    existingMetadata.highlights = highlights;
    existingMetadata.editorialHighlightOverride = true;
  } else {
    delete existingMetadata.highlights;
    delete existingMetadata.editorialHighlightOverride;
  }

  if (duplicateOfReviewId) {
    existingMetadata.duplicateOfReviewId = duplicateOfReviewId;
  } else {
    delete existingMetadata.duplicateOfReviewId;
  }

  const overrideHistory = Array.isArray(existingMetadata.editorialOverrideHistory)
    ? [...(existingMetadata.editorialOverrideHistory as unknown[])]
    : [];

  overrideHistory.push({
    timestamp: new Date().toISOString(),
    sentiment,
    highlights,
    duplicateOfReviewId,
  });

  existingMetadata.editorialOverrideHistory = overrideHistory.slice(-10);

  await db
    .update(reviews)
    .set({
      sentiment,
      metadata: existingMetadata,
      status: duplicateOfReviewId ? "flagged" : review.status,
    })
    .where(eq(reviews.id, reviewId));

  const result = await regenerateAiReviewSummaryForRelease(db, review.releaseId);

  revalidatePath("/internal");
  revalidatePath("/shoes");
  if (result.shoeSlug) {
    revalidatePath(`/shoes/${result.shoeSlug}`);
  }
}

export async function updateCrawlSourceSettingsAction(formData: FormData) {
  const db = requireDatabase();
  const crawlSourceId = String(formData.get("crawlSourceId") ?? "").trim();
  const cadenceLabel = String(formData.get("cadenceLabel") ?? "").trim();
  const isActive = formData.get("isActive") === "on";

  if (!crawlSourceId) {
    throw new Error("Crawl source id is required.");
  }

  await db
    .update(crawlSources)
    .set({
      cadenceLabel: cadenceLabel || null,
      isActive,
    })
    .where(eq(crawlSources.id, crawlSourceId));

  revalidatePath("/internal");
}

export async function runScheduledIngestionAction() {
  requireDatabase();
  await runScheduledIngestion();

  revalidatePath("/internal");
  revalidatePath("/shoes");
}

export async function runBelieveInTheRunCrawlAction(formData: FormData) {
  requireDatabase();
  const releaseId = String(formData.get("releaseId") ?? "").trim();

  if (!releaseId) {
    throw new Error("Release is required.");
  }

  await runBelieveInTheRunImport({ releaseId });

  revalidatePath("/internal");
  revalidatePath("/shoes");
}

export async function runRedditRunningShoeGeeksCrawlAction(formData: FormData) {
  requireDatabase();
  const releaseId = String(formData.get("releaseId") ?? "").trim();

  if (!releaseId) {
    throw new Error("Release is required.");
  }

  await runRedditRunningShoeGeeksImport({ releaseId });

  revalidatePath("/internal");
  revalidatePath("/shoes");
}

export async function runRunRepeatCrawlAction(formData: FormData) {
  requireDatabase();
  const releaseId = String(formData.get("releaseId") ?? "").trim();

  if (!releaseId) {
    throw new Error("Release is required.");
  }

  await runRunRepeatImport({ releaseId });

  revalidatePath("/internal");
  revalidatePath("/shoes");
}

export async function runDoctorsOfRunningCrawlAction(formData: FormData) {
  requireDatabase();
  const releaseId = String(formData.get("releaseId") ?? "").trim();

  if (!releaseId) {
    throw new Error("Release is required.");
  }

  await runDoctorsOfRunningImport({ releaseId });

  revalidatePath("/internal");
  revalidatePath("/shoes");
}

export async function generateAiReviewSummaryAction(formData: FormData) {
  const db = requireDatabase();
  const releaseId = String(formData.get("releaseId") ?? "").trim();

  if (!releaseId) {
    throw new Error("Release is required.");
  }

  const result = await regenerateAiReviewSummaryForRelease(db, releaseId);

  revalidatePath("/internal");
  revalidatePath("/shoes");
  if (result.shoeSlug) {
    revalidatePath(`/shoes/${result.shoeSlug}`);
  }
}

export async function generateMissingAiReviewSummariesAction() {
  const db = requireDatabase();
  const releaseRows = await db
    .select({
      id: shoeReleases.id,
      metadata: shoeReleases.metadata,
    })
    .from(shoeReleases)
    .orderBy(shoeReleases.createdAt);

  let generatedCount = 0;
  let refreshedCount = 0;
  let skippedCount = 0;

  for (const release of releaseRows.slice(0, 50)) {
    const hadSummary =
      release.metadata &&
      typeof release.metadata === "object" &&
      Boolean((release.metadata as Record<string, unknown>).aiReviewSummary);

    const result = await regenerateAiReviewSummaryForRelease(db, release.id);
    if (result.status !== "generated") {
      skippedCount += 1;
      continue;
    }

    if (hadSummary) {
      refreshedCount += 1;
    } else {
      generatedCount += 1;
    }
  }

  console.info("AI summary batch run completed", {
    generatedCount,
    refreshedCount,
    skippedCount,
  });

  revalidatePath("/internal");
  revalidatePath("/shoes");
}

export async function updateAiReviewSummaryOverrideAction(formData: FormData) {
  const db = requireDatabase();
  const releaseId = String(formData.get("releaseId") ?? "").trim();
  const isEnabled = formData.get("isEnabled") === "on";
  const overview = String(formData.get("overview") ?? "").trim();
  const overallSentimentRaw = String(formData.get("overallSentiment") ?? "").trim();
  const confidenceRaw = String(formData.get("confidence") ?? "").trim();
  const prosRaw = String(formData.get("pros") ?? "").trim();
  const consRaw = String(formData.get("cons") ?? "").trim();
  const bestForRaw = String(formData.get("bestFor") ?? "").trim();
  const watchOutsRaw = String(formData.get("watchOuts") ?? "").trim();

  if (!releaseId) {
    throw new Error("Release is required.");
  }

  const release = await db
    .select({
      id: shoeReleases.id,
      metadata: shoeReleases.metadata,
      shoeSlug: shoes.slug,
    })
    .from(shoeReleases)
    .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
    .where(eq(shoeReleases.id, releaseId))
    .limit(1);

  const row = release[0];
  if (!row) {
    throw new Error("Release not found.");
  }

  await db
    .update(shoeReleases)
    .set({
      metadata: appendAiReviewSummaryHistory(
        mergeReleaseMetadata(row.metadata, {
          editorialAiReviewSummaryOverride: {
            isEnabled,
            overview: overview || null,
            overallSentiment:
              overallSentimentRaw === "positive" ||
              overallSentimentRaw === "mixed" ||
              overallSentimentRaw === "negative"
                ? overallSentimentRaw
                : null,
            confidence:
              confidenceRaw === "low" || confidenceRaw === "medium" || confidenceRaw === "high"
                ? confidenceRaw
                : null,
            pros: parseLineList(prosRaw, 4),
            cons: parseLineList(consRaw, 4),
            bestFor: parseLineList(bestForRaw, 4),
            watchOuts: parseLineList(watchOutsRaw, 4),
            updatedAt: new Date().toISOString(),
          },
        }),
        {
          timestamp: new Date().toISOString(),
          eventType: isEnabled ? "override-enabled" : "override-disabled",
          provider: "editorial",
          overview: overview || null,
          overallSentiment:
            overallSentimentRaw === "positive" ||
            overallSentimentRaw === "mixed" ||
            overallSentimentRaw === "negative"
              ? overallSentimentRaw
              : null,
          confidence:
            confidenceRaw === "low" || confidenceRaw === "medium" || confidenceRaw === "high"
              ? confidenceRaw
              : null,
          reviewCount: 0,
          sourceCount: 0,
          evidenceCount: 0,
        },
      ),
    })
    .where(eq(shoeReleases.id, releaseId));

  revalidatePath("/internal");
  revalidatePath("/shoes");
  revalidatePath(`/shoes/${row.shoeSlug}`);
}

async function regenerateAiReviewSummaryForRelease(
  db: ReturnType<typeof requireDatabase>,
  releaseId: string,
) {
  const release = await db
    .select({
      id: shoeReleases.id,
      versionName: shoeReleases.versionName,
      category: shoes.category,
      terrain: shoes.terrain,
      stability: shoes.stability,
      metadata: shoeReleases.metadata,
      shoeName: shoes.name,
      brandName: brands.name,
      shoeSlug: shoes.slug,
    })
    .from(shoeReleases)
    .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
    .innerJoin(brands, eq(shoes.brandId, brands.id))
    .where(eq(shoeReleases.id, releaseId))
    .limit(1);

  const row = release[0];
  if (!row) {
    return {
      status: "missing-release" as const,
      shoeSlug: null,
    };
  }

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
    .where(and(eq(reviews.releaseId, releaseId), eq(reviews.status, "approved")));

  if (!approvedReviews.length) {
    const nextMetadata = appendAiReviewSummaryHistory(
      mergeReleaseMetadata(row.metadata, {
        aiReviewSummary: null,
      }),
      {
        timestamp: new Date().toISOString(),
        eventType: "cleared",
        provider: null,
        overview: null,
        overallSentiment: null,
        confidence: null,
        reviewCount: 0,
        sourceCount: 0,
        evidenceCount: 0,
      },
    );

    await db
      .update(shoeReleases)
      .set({
        metadata: nextMetadata,
      })
      .where(eq(shoeReleases.id, releaseId));

    return {
      status: "cleared" as const,
      shoeSlug: row.shoeSlug,
    };
  }

  const summary = await generateReleaseReviewSummary({
    releaseLabel: `${row.brandName} ${row.versionName}`,
    category: row.category,
    terrain: row.terrain,
    stability: row.stability,
    reviews: approvedReviews.map((review) => ({
      ...review,
      publishedAt: review.publishedAt ? review.publishedAt.toISOString().slice(0, 10) : null,
    })),
  });

  const hadSummary =
    row.metadata && typeof row.metadata === "object"
      ? Boolean((row.metadata as Record<string, unknown>).aiReviewSummary)
      : false;
  const nextMetadata = appendAiReviewSummaryHistory(
    mergeReleaseMetadata(row.metadata, {
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
    .where(eq(shoeReleases.id, releaseId));

  return {
    status: "generated" as const,
    shoeSlug: row.shoeSlug,
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseLineList(value: string, limit: number) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}
