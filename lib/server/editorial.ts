import { count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { reviewSources, reviews, shoeReleases, shoes } from "@/db/schema";

export interface EditorialSourceOption {
  id: string;
  name: string;
  sourceType: "editorial" | "reddit" | "user";
}

export interface EditorialReleaseOption {
  id: string;
  label: string;
}

export interface EditorialReviewRow {
  id: string;
  title: string | null;
  sourceUrl: string;
  status: "pending" | "approved" | "rejected" | "flagged";
  sentiment: "positive" | "mixed" | "negative" | null;
  scoreNormalized100: number | null;
  releaseLabel: string;
  sourceName: string;
}

export interface EditorialDashboardData {
  stats: {
    totalShoes: number;
    totalSources: number;
    totalReviews: number;
    pendingReviews: number;
  };
  releases: EditorialReleaseOption[];
  sources: EditorialSourceOption[];
  recentReviews: EditorialReviewRow[];
}

export async function getEditorialDashboardData(): Promise<EditorialDashboardData> {
  if (!process.env.DATABASE_URL) {
    return {
      stats: {
        totalShoes: 3,
        totalSources: 3,
        totalReviews: 3,
        pendingReviews: 0,
      },
      releases: [],
      sources: [],
      recentReviews: [],
    };
  }

  const db = getDb();

  const [shoeCountRow, sourceCountRow, reviewCountRow, pendingCountRow, releaseRows, sourceRows, reviewRows] =
    await Promise.all([
      db.select({ count: count(shoes.id) }).from(shoes),
      db.select({ count: count(reviewSources.id) }).from(reviewSources),
      db.select({ count: count(reviews.id) }).from(reviews),
      db.select({ count: count(reviews.id) }).from(reviews).where(eq(reviews.status, "pending")),
      db
        .select({
          id: shoeReleases.id,
          shoeName: shoes.name,
          versionName: shoeReleases.versionName,
        })
        .from(shoeReleases)
        .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
        .orderBy(desc(shoeReleases.releaseYear), shoes.name),
      db
        .select({
          id: reviewSources.id,
          name: reviewSources.name,
          sourceType: reviewSources.sourceType,
        })
        .from(reviewSources)
        .orderBy(reviewSources.name),
      db
        .select({
          id: reviews.id,
          title: reviews.title,
          sourceUrl: reviews.sourceUrl,
          status: reviews.status,
          sentiment: reviews.sentiment,
          scoreNormalized100: reviews.scoreNormalized100,
          shoeName: shoes.name,
          versionName: shoeReleases.versionName,
          sourceName: reviewSources.name,
        })
        .from(reviews)
        .innerJoin(shoeReleases, eq(reviews.releaseId, shoeReleases.id))
        .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
        .innerJoin(reviewSources, eq(reviews.sourceId, reviewSources.id))
        .orderBy(desc(reviews.createdAt)),
    ]);

  return {
    stats: {
      totalShoes: Number(shoeCountRow[0]?.count ?? 0),
      totalSources: Number(sourceCountRow[0]?.count ?? 0),
      totalReviews: Number(reviewCountRow[0]?.count ?? 0),
      pendingReviews: Number(pendingCountRow[0]?.count ?? 0),
    },
    releases: releaseRows.map((release) => ({
      id: release.id,
      label: `${release.shoeName} ${release.versionName}`,
    })),
    sources: sourceRows,
    recentReviews: reviewRows.map((review) => ({
      id: review.id,
      title: review.title,
      sourceUrl: review.sourceUrl,
      status: review.status,
      sentiment: review.sentiment,
      scoreNormalized100: review.scoreNormalized100,
      releaseLabel: `${review.shoeName} ${review.versionName}`,
      sourceName: review.sourceName,
    })),
  };
}
