"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { reviewAuthors, reviews, reviewSources } from "@/db/schema";

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

  await db.update(reviews).set({ status }).where(eq(reviews.id, reviewId));

  revalidatePath("/internal");
  revalidatePath("/shoes");
}
