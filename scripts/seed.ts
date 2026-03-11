import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { closeDbConnection, getDb } from "../db";
import {
  seedBrands,
  seedReleases,
  seedReviewAuthors,
  seedReviews,
  seedReviewSources,
  seedShoes,
  seedSpecs,
} from "../db/seed-data";
import {
  brands,
  reviewAuthors,
  reviews,
  reviewSources,
  shoeReleases,
  shoes,
  shoeSpecs,
} from "../db/schema";

config({ path: ".env.local" });

async function main() {
  const db = getDb();

  for (const brand of seedBrands) {
    await db.insert(brands).values(brand).onConflictDoUpdate({
      target: brands.slug,
      set: {
        name: brand.name,
        websiteUrl: brand.websiteUrl,
      },
    });
  }

  const brandRows = await db.select().from(brands);
  const brandIdBySlug = new Map(brandRows.map((brand) => [brand.slug, brand.id]));

  for (const shoe of seedShoes) {
    const brandId = brandIdBySlug.get(shoe.brandSlug);
    if (!brandId) throw new Error(`Missing brand for shoe ${shoe.slug}`);

    await db.insert(shoes).values({
      brandId,
      name: shoe.name,
      slug: shoe.slug,
      category: shoe.category,
      stability: shoe.stability,
      terrain: shoe.terrain,
      usageSummary: shoe.usageSummary,
    }).onConflictDoUpdate({
      target: shoes.slug,
      set: {
        brandId,
        name: shoe.name,
        category: shoe.category,
        stability: shoe.stability,
        terrain: shoe.terrain,
        usageSummary: shoe.usageSummary,
      },
    });
  }

  const shoeRows = await db.select().from(shoes);
  const shoeIdBySlug = new Map(shoeRows.map((shoe) => [shoe.slug, shoe.id]));

  for (const release of seedReleases) {
    const shoeId = shoeIdBySlug.get(release.shoeSlug);
    if (!shoeId) throw new Error(`Missing shoe for release ${release.versionName}`);

    await db.insert(shoeReleases).values({
      shoeId,
      versionName: release.versionName,
      releaseYear: release.releaseYear,
      msrpUsd: release.msrpUsd,
      isCurrent: release.isCurrent,
      isPlated: release.isPlated,
      foam: release.foam,
      notes: release.notes,
    }).onConflictDoUpdate({
      target: [shoeReleases.shoeId, shoeReleases.versionName],
      set: {
        releaseYear: release.releaseYear,
        msrpUsd: release.msrpUsd,
        isCurrent: release.isCurrent,
        isPlated: release.isPlated,
        foam: release.foam,
        notes: release.notes,
      },
    });
  }

  const releaseRows = await db.select().from(shoeReleases);
  const releaseIdByKey = new Map<string, string>(
    releaseRows.map((release) => {
      const shoeSlug = shoeRows.find((shoe) => shoe.id === release.shoeId)?.slug;
      if (!shoeSlug) {
        throw new Error(`Missing shoe slug for release ${release.id}`);
      }

      return [`${shoeSlug}:${release.versionName}`, release.id] as const;
    })
  );

  for (const spec of seedSpecs) {
    const releaseId = releaseIdByKey.get(spec.releaseKey);
    if (!releaseId) throw new Error(`Missing release for spec ${spec.releaseKey}`);

    const existingSpec = await db.query.shoeSpecs.findFirst({
      where: eq(shoeSpecs.releaseId, releaseId),
    });

    if (existingSpec) {
      await db.update(shoeSpecs).set({
        weightOzMen: spec.weightOzMen,
        heelStackMm: spec.heelStackMm,
        forefootStackMm: spec.forefootStackMm,
        dropMm: spec.dropMm,
        fitNotes: spec.fitNotes,
      }).where(eq(shoeSpecs.releaseId, releaseId));
    } else {
      await db.insert(shoeSpecs).values({
        releaseId,
        weightOzMen: spec.weightOzMen,
        heelStackMm: spec.heelStackMm,
        forefootStackMm: spec.forefootStackMm,
        dropMm: spec.dropMm,
        fitNotes: spec.fitNotes,
      });
    }
  }

  for (const source of seedReviewSources) {
    await db.insert(reviewSources).values(source).onConflictDoUpdate({
      target: reviewSources.slug,
      set: {
        name: source.name,
        sourceType: source.sourceType,
        siteUrl: source.siteUrl,
        baseDomain: source.baseDomain,
      },
    });
  }

  const sourceRows = await db.select().from(reviewSources);
  const sourceIdBySlug = new Map(sourceRows.map((source) => [source.slug, source.id]));

  for (const author of seedReviewAuthors) {
    const sourceId = sourceIdBySlug.get(author.sourceSlug);
    if (!sourceId) throw new Error(`Missing source for author ${author.displayName}`);

    const existingAuthor = await db.query.reviewAuthors.findFirst({
      where: eq(reviewAuthors.profileUrl, author.profileUrl),
    });

    if (existingAuthor) {
      await db
        .update(reviewAuthors)
        .set({
          sourceId,
          displayName: author.displayName,
          profileUrl: author.profileUrl,
        })
        .where(eq(reviewAuthors.id, existingAuthor.id));
    } else {
      await db.insert(reviewAuthors).values({
        sourceId,
        displayName: author.displayName,
        profileUrl: author.profileUrl,
      });
    }
  }

  const authorRows = await db.select().from(reviewAuthors);
  const authorIdByKey = new Map(
    authorRows.map((author) => [`${author.sourceId}:${author.displayName}`, author.id] as const)
  );

  for (const review of seedReviews) {
    const sourceId = sourceIdBySlug.get(review.sourceSlug);
    const releaseId = releaseIdByKey.get(review.releaseKey);
    if (!sourceId) throw new Error(`Missing source for review ${review.sourceUrl}`);
    if (!releaseId) throw new Error(`Missing release for review ${review.sourceUrl}`);

    const authorId = authorIdByKey.get(`${sourceId}:${review.authorName}`) ?? null;
    const existingReview = await db.query.reviews.findFirst({
      where: eq(reviews.sourceUrl, review.sourceUrl),
    });

    const values = {
      releaseId,
      sourceId,
      authorId,
      sourceUrl: review.sourceUrl,
      title: review.title,
      excerpt: review.excerpt,
      scoreNormalized100: review.scoreNormalized100,
      originalScoreValue: review.originalScoreValue,
      originalScoreScale: review.originalScoreScale,
      sentiment: review.sentiment,
      status: review.status,
      publishedAt: new Date(review.publishedAt),
    };

    if (existingReview) {
      await db.update(reviews).set(values).where(eq(reviews.id, existingReview.id));
    } else {
      await db.insert(reviews).values(values);
    }
  }

  console.log("Seed completed.");
  await closeDbConnection();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
