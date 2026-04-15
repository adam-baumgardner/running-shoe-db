import { and, avg, count, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { shoes as fallbackShoes } from "@/lib/data";
import { HIGHLIGHT_PATTERNS, normalizeSearchText } from "@/lib/ingestion/review-normalization";
import {
  getReleaseAiReviewSummary,
  getReleaseReconciliationOverrides,
  type ReleaseAiReviewSummary,
  type ReviewConfidence,
  type ReviewSentiment,
} from "@/lib/server/release-metadata";
import {
  brands,
  reviewAuthors,
  reviews,
  reviewSources,
  shoeReleases,
  shoeSpecVariants,
  shoes,
  shoeSpecs,
} from "@/db/schema";

export interface SpecVariant {
  id: string;
  releaseId: string;
  variantKey: string;
  displayLabel: string;
  audience: "mens" | "womens" | "unisex" | "other" | "unknown";
  isPrimary: boolean;
  weightOz: number | null;
  heelStackMm: number | null;
  forefootStackMm: number | null;
  dropMm: number | null;
  lugDepthMm: number | null;
  widthNotes: string | null;
  fitNotes: string | null;
  sourceNotes: string | null;
  sourceUrl: string | null;
  sourceLabel: string | null;
  lastVerifiedAt: string | null;
}

export interface CatalogCard {
  id: string;
  brand: string;
  model: string;
  release: string;
  slug: string;
  releaseSlug: string;
  releaseYear: number | null;
  category: string;
  foam: string | null;
  rideProfile: string;
  usageSummary: string | null;
  priceUsd: number | null;
  weightOz: number | null;
  heelStackMm: number | null;
  forefootStackMm: number | null;
  dropMm: number | null;
  reviewCount: number;
  averageReviewScore: number | null;
  reviewScore: number | null;
  reviewIntelligence: ReviewIntelligence;
  aiReviewSummary: ReleaseAiReviewSummary | null;
  terrain: string;
  stability: string;
  isPlated: boolean;
  isCurrent: boolean;
}

export interface ReviewIntelligence {
  compositeScore: number | null;
  ratingScore: number | null;
  sentimentScore: number | null;
  editorialScore: number | null;
  communityScore: number | null;
  editorialSentiment: ReviewSentiment | null;
  communitySentiment: ReviewSentiment | null;
  sourceAlignment: "aligned" | "mixed" | "divergent";
  editorialSummary: string | null;
  communitySummary: string | null;
  confidence: ReviewConfidence;
  agreement: "strong" | "mixed" | "split";
  sourceCount: number;
  reviewCount: number;
  evidenceCount: number;
  summary: string;
  buyerSignal: string | null;
  consensusPoints: string[];
  debates: string[];
  positives: string[];
  concerns: string[];
}

export interface CatalogFilters {
  q?: string;
  sort?: string;
  direction?: string;
  brand?: string;
  minReleaseYear?: string;
  maxReleaseYear?: string;
  category?: string;
  terrain?: string;
  stability?: string;
  plated?: string;
  current?: string;
  minPrice?: string;
  maxPrice?: string;
  minWeight?: string;
  maxWeight?: string;
  cushionLevel?: string;
  minHeelStack?: string;
  maxHeelStack?: string;
  minForefootStack?: string;
  maxForefootStack?: string;
  minDrop?: string;
  maxDrop?: string;
  minReviewScore?: string;
  minReviewCount?: string;
}

export interface CatalogPageData {
  shoes: CatalogCard[];
  activeFilters: Array<{ key: string; label: string; value: string }>;
  filterOptions: {
    brands: string[];
    categories: string[];
    terrains: string[];
    stabilities: string[];
  };
}

export interface ReviewsFeedItem {
  id: string;
  brand: string;
  model: string;
  release: string;
  shoeSlug: string;
  releaseSlug: string;
  category: string;
  sourceName: string;
  sourceType: "editorial" | "reddit" | "user";
  sourceUrl: string;
  title: string | null;
  excerpt: string | null;
  sentiment: "positive" | "mixed" | "negative" | null;
  scoreNormalized100: number | null;
  publishedAt: string | null;
  authorName: string | null;
  aiOverview: string | null;
  reviewScore: number | null;
  reviewConfidence: ReviewConfidence;
  buyerSignal: string | null;
  consensusPoints: string[];
  debates: string[];
}

export interface ReviewsFeedData {
  items: ReviewsFeedItem[];
  filterOptions: {
    brands: string[];
    categories: string[];
    sourceTypes: Array<"editorial" | "reddit" | "user">;
  };
}

export interface ShoeReviewSummary {
  id: string;
  title: string | null;
  excerpt: string | null;
  highlights: string[];
  scoreNormalized100: number | null;
  sentiment: "positive" | "mixed" | "negative" | null;
  publishedAt: string | null;
  sourceName: string;
  sourceType: "editorial" | "reddit" | "user";
  sourceUrl: string;
  authorName: string | null;
}

export interface ShoeDetail {
  id: string;
  brand: string;
  model: string;
  release: string;
  slug: string;
  category: string;
  terrain: string;
  stability: string;
  usageSummary: string | null;
  rideProfile: string;
  notes: string | null;
  priceUsd: number | null;
  releaseYear: number | null;
  isCurrent: boolean;
  isPlated: boolean;
  foam: string | null;
  weightOz: number | null;
  heelStackMm: number | null;
  forefootStackMm: number | null;
  dropMm: number | null;
  fitNotes: string | null;
  sourceNotes: string | null;
  specVariants: SpecVariant[];
  primarySpecVariant: SpecVariant | null;
  selectedSpecVariant: SpecVariant | null;
  showSpecVariantToggle: boolean;
  reviewCount: number;
  averageReviewScore: number | null;
  reviewScore: number | null;
  reviewIntelligence: ReviewIntelligence;
  reviewCoverage: {
    status: "strong" | "developing" | "thin" | "stale";
    summary: string;
    sourceCount: number;
    reviewCount: number;
    freshestReviewDate: string | null;
  };
  reviewSignalSummary: {
    topHighlights: Array<{ label: string; count: number; weight: number }>;
    sentimentBreakdown: {
      positive: number;
      mixed: number;
      negative: number;
    };
    weightedSentiment: {
      positive: number;
      mixed: number;
      negative: number;
    };
    dominantSentiment: "positive" | "mixed" | "negative" | null;
    sourceCount: number;
  };
  reviewReconciliation: {
    summaryNote: string | null;
    topTakeaways: string[];
    contradictionCount: number;
    themes: Array<{
      label: string;
      dominantSentiment: "positive" | "mixed" | "negative";
      confidence: "low" | "medium" | "high";
      hasContradiction: boolean;
      sourceCount: number;
      reviewCount: number;
      evidence: Array<{
        sourceName: string;
        sourceType: "editorial" | "reddit" | "user";
        excerpt: string;
      }>;
    }>;
  };
  aiReviewSummary: {
    overview: string;
    overallSentiment: "positive" | "mixed" | "negative";
    confidence: "low" | "medium" | "high";
    editorialSentiment: "positive" | "mixed" | "negative" | null;
    communitySentiment: "positive" | "mixed" | "negative" | null;
    sourceAlignment: "aligned" | "mixed" | "divergent";
    buyerSignal: string | null;
    pros: string[];
    cons: string[];
    bestFor: string[];
    watchOuts: string[];
    consensusPoints: string[];
    debates: string[];
    reviewCount: number;
    sourceCount: number;
    generatedAt: string;
    model: string | null;
    provider: "openai" | "heuristic";
    evidence: Array<{
      sourceName: string;
      sourceType: "editorial" | "reddit" | "user";
      title: string | null;
      excerpt: string;
    }>;
    isEditorialOverride: boolean;
  } | null;
  reviews: ShoeReviewSummary[];
}

export interface ShoeReleaseListItem {
  id: string;
  release: string;
  releaseSlug: string;
  releaseYear: number | null;
  isCurrent: boolean;
  priceUsd: number | null;
  reviewCount: number;
  averageReviewScore: number | null;
  reviewScore: number | null;
  reviewIntelligence: ReviewIntelligence;
  reviewCoverage: ShoeDetail["reviewCoverage"];
  changeTeaser: string[];
}

export interface ReleaseChangeSummary {
  release: string;
  releaseSlug: string;
  previousRelease: string | null;
  changes: string[];
}

export interface ShoeParentPageData {
  brand: string;
  model: string;
  slug: string;
  category: string;
  terrain: string;
  stability: string;
  usageSummary: string | null;
  featuredRelease: ShoeDetail;
  releases: ShoeReleaseListItem[];
  releaseChanges: ReleaseChangeSummary[];
}

export interface ComparisonRow extends CatalogCard {
  releaseSlug: string;
  priceUsd: number | null;
  heelStackMm: number | null;
  forefootStackMm: number | null;
  weightOz: number | null;
  dropMm: number | null;
  specVariants: SpecVariant[];
  primarySpecVariant: SpecVariant | null;
  selectedSpecVariant: SpecVariant | null;
  showSpecVariantToggle: boolean;
  averageReviewScore: number | null;
  reviewCoverage: ShoeDetail["reviewCoverage"];
  aiReviewSummary: ShoeDetail["aiReviewSummary"];
  reviewReconciliation: ShoeDetail["reviewReconciliation"];
}

export interface ComparisonInsight {
  title: string;
  summary: string;
  evidence: string[];
}

export interface ComparisonPageData {
  rows: ComparisonRow[];
  narrative: {
    overview: string | null;
    chooserGuidance: string[];
    keyDifferences: ComparisonInsight[];
    sharedSignals: string[];
    caution: string | null;
  };
}

export async function getCatalogPageData(filters: CatalogFilters = {}): Promise<CatalogPageData> {
  const shoes = await getCatalogCards(filters);
  const allShoes = await getCatalogCards();

  return {
    shoes,
    activeFilters: buildActiveFilterChips(filters),
    filterOptions: {
      brands: uniq(allShoes.map((shoe) => shoe.brand)),
      categories: uniq(allShoes.map((shoe) => shoe.category)),
      terrains: uniq(allShoes.map((shoe) => shoe.terrain)),
      stabilities: uniq(allShoes.map((shoe) => shoe.stability)),
    },
  };
}

export async function getCatalogCards(filters: CatalogFilters = {}): Promise<CatalogCard[]> {
  if (!process.env.DATABASE_URL) {
    return filterCatalog(buildFallbackCatalog(), filters);
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: shoeReleases.id,
        brand: brands.name,
        model: shoes.name,
        release: shoeReleases.versionName,
        slug: shoes.slug,
        releaseYear: shoeReleases.releaseYear,
        category: shoes.category,
        terrain: shoes.terrain,
        stability: shoes.stability,
        usageSummary: shoes.usageSummary,
        priceUsd: shoeReleases.msrpUsd,
        isCurrent: shoeReleases.isCurrent,
        isPlated: shoeReleases.isPlated,
        foam: shoeReleases.foam,
        metadata: shoeReleases.metadata,
        weightOzMen: shoeSpecs.weightOzMen,
        heelStackMm: shoeSpecs.heelStackMm,
        forefootStackMm: shoeSpecs.forefootStackMm,
        dropMm: shoeSpecs.dropMm,
        reviewCount: count(reviews.id),
        averageReviewScore: avg(reviews.scoreNormalized100),
      })
      .from(shoeReleases)
      .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
      .innerJoin(brands, eq(shoes.brandId, brands.id))
      .leftJoin(shoeSpecs, eq(shoeSpecs.releaseId, shoeReleases.id))
      .leftJoin(
        reviews,
        and(eq(reviews.releaseId, shoeReleases.id), eq(reviews.status, "approved"))
      )
      .groupBy(
        shoeReleases.id,
        brands.name,
        shoes.name,
        shoes.slug,
        shoeReleases.releaseYear,
        shoes.category,
        shoes.terrain,
        shoes.stability,
        shoes.usageSummary,
        shoeReleases.versionName,
        shoeReleases.msrpUsd,
        shoeReleases.isCurrent,
        shoeReleases.isPlated,
        shoeReleases.foam,
        shoeReleases.metadata,
        shoeSpecs.weightOzMen,
        shoeSpecs.heelStackMm,
        shoeSpecs.forefootStackMm,
        shoeSpecs.dropMm
      )
      .orderBy(desc(shoeReleases.releaseYear), brands.name, shoes.name);

    const parsedRows: CatalogCard[] = rows.map((row) => {
      const reviewCount = Number(row.reviewCount);
      const averageReviewScore = row.averageReviewScore ? Number(row.averageReviewScore) : null;
      const aiReviewSummary = getReleaseAiReviewSummary(row.metadata);
      const reviewIntelligence = buildAggregateReviewIntelligence(reviewCount, averageReviewScore, aiReviewSummary);

      return {
        id: row.id,
        brand: row.brand,
        model: row.model,
        release: row.release,
        slug: row.slug,
        releaseSlug: slugifyRelease(row.release),
        releaseYear: row.releaseYear,
        category: humanizeCategory(row.category),
        terrain: humanizeCategory(row.terrain),
        stability: capitalize(row.stability),
        foam: row.foam,
        rideProfile: buildRideProfile(row.foam, row.isPlated),
        usageSummary: row.usageSummary,
        priceUsd: row.priceUsd ? Number(row.priceUsd) : null,
        weightOz: row.weightOzMen ? Number(row.weightOzMen) : null,
        heelStackMm: row.heelStackMm,
        forefootStackMm: row.forefootStackMm,
        dropMm: row.dropMm,
        reviewCount,
        averageReviewScore,
        reviewScore: reviewIntelligence.compositeScore,
        reviewIntelligence,
        aiReviewSummary,
        isPlated: row.isPlated,
        isCurrent: row.isCurrent,
      };
    });

    return sortCatalog(filterCatalog(parsedRows, filters), filters);
  } catch {
    return sortCatalog(filterCatalog(buildFallbackCatalog(), filters), filters);
  }
}

export async function getShoeDetail(slug: string): Promise<ShoeDetail | null> {
  if (!process.env.DATABASE_URL) {
    return buildFallbackDetail(slug);
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: shoeReleases.id,
        brand: brands.name,
        model: shoes.name,
        release: shoeReleases.versionName,
        slug: shoes.slug,
        category: shoes.category,
        terrain: shoes.terrain,
        stability: shoes.stability,
        usageSummary: shoes.usageSummary,
        notes: shoeReleases.notes,
        metadata: shoeReleases.metadata,
        priceUsd: shoeReleases.msrpUsd,
        releaseYear: shoeReleases.releaseYear,
        isCurrent: shoeReleases.isCurrent,
        isPlated: shoeReleases.isPlated,
        foam: shoeReleases.foam,
        weightOzMen: shoeSpecs.weightOzMen,
        heelStackMm: shoeSpecs.heelStackMm,
        forefootStackMm: shoeSpecs.forefootStackMm,
        dropMm: shoeSpecs.dropMm,
        fitNotes: shoeSpecs.fitNotes,
        sourceNotes: shoeSpecs.sourceNotes,
        reviewCount: count(reviews.id),
        averageReviewScore: avg(reviews.scoreNormalized100),
      })
      .from(shoeReleases)
      .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
      .innerJoin(brands, eq(shoes.brandId, brands.id))
      .leftJoin(shoeSpecs, eq(shoeSpecs.releaseId, shoeReleases.id))
      .leftJoin(
        reviews,
        and(eq(reviews.releaseId, shoeReleases.id), eq(reviews.status, "approved"))
      )
      .where(eq(shoes.slug, slug))
      .groupBy(
        shoeReleases.id,
        brands.name,
        shoes.name,
        shoes.slug,
        shoes.category,
        shoes.terrain,
        shoes.stability,
        shoes.usageSummary,
        shoeReleases.versionName,
        shoeReleases.notes,
        shoeReleases.metadata,
        shoeReleases.msrpUsd,
        shoeReleases.releaseYear,
        shoeReleases.isCurrent,
        shoeReleases.isPlated,
        shoeReleases.foam,
        shoeSpecs.weightOzMen,
        shoeSpecs.heelStackMm,
        shoeSpecs.forefootStackMm,
        shoeSpecs.dropMm,
        shoeSpecs.fitNotes,
        shoeSpecs.sourceNotes
      )
      .orderBy(desc(shoeReleases.releaseYear))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const reviewRows = await db
      .select({
        id: reviews.id,
        title: reviews.title,
        excerpt: reviews.excerpt,
        body: reviews.body,
        scoreNormalized100: reviews.scoreNormalized100,
        sentiment: reviews.sentiment,
        publishedAt: reviews.publishedAt,
        metadata: reviews.metadata,
        sourceName: reviewSources.name,
        sourceType: reviewSources.sourceType,
        sourceUrl: reviews.sourceUrl,
        authorName: reviewAuthors.displayName,
      })
      .from(reviews)
      .innerJoin(reviewSources, eq(reviews.sourceId, reviewSources.id))
      .leftJoin(reviewAuthors, eq(reviews.authorId, reviewAuthors.id))
      .where(and(eq(reviews.releaseId, row.id), eq(reviews.status, "approved")))
      .orderBy(desc(reviews.publishedAt));

    const mappedReviews = reviewRows.map((review) => ({
      id: review.id,
      title: review.title,
      excerpt: review.excerpt,
      body: review.body,
      highlights: getReviewHighlights(review.metadata),
      scoreNormalized100: review.scoreNormalized100,
      sentiment: review.sentiment,
      publishedAt: review.publishedAt ? review.publishedAt.toISOString().slice(0, 10) : null,
      sourceName: review.sourceName,
      sourceType: review.sourceType,
      sourceUrl: review.sourceUrl,
      authorName: review.authorName,
    }));

    const averageReviewScore = row.averageReviewScore ? Number(row.averageReviewScore) : null;
    const aiReviewSummary = getReleaseAiReviewSummary(row.metadata);
    const reviewIntelligence = buildReviewIntelligence(
      mappedReviews,
      averageReviewScore,
      aiReviewSummary,
    );
    const specVariantsByReleaseId = await getSpecVariantsByReleaseId([row.id]);
    const specVariants = specVariantsByReleaseId.get(row.id) ?? [];
    const primarySpecVariant = getPrimarySpecVariant(specVariants);

    return {
      id: row.id,
      brand: row.brand,
      model: row.model,
      release: row.release,
      slug: row.slug,
      category: humanizeCategory(row.category),
      terrain: humanizeCategory(row.terrain),
      stability: capitalize(row.stability),
      usageSummary: row.usageSummary,
      rideProfile: buildRideProfile(row.foam, row.isPlated),
      notes: row.notes,
      priceUsd: row.priceUsd ? Number(row.priceUsd) : null,
      releaseYear: row.releaseYear,
      isCurrent: row.isCurrent,
      isPlated: row.isPlated,
      foam: row.foam,
      weightOz: primarySpecVariant?.weightOz ?? (row.weightOzMen ? Number(row.weightOzMen) : null),
      heelStackMm: primarySpecVariant?.heelStackMm ?? row.heelStackMm,
      forefootStackMm: primarySpecVariant?.forefootStackMm ?? row.forefootStackMm,
      dropMm: primarySpecVariant?.dropMm ?? row.dropMm,
      fitNotes: primarySpecVariant?.fitNotes ?? row.fitNotes,
      sourceNotes: primarySpecVariant?.sourceNotes ?? row.sourceNotes,
      specVariants,
      primarySpecVariant,
      selectedSpecVariant: primarySpecVariant,
      showSpecVariantToggle: hasMenAndWomenVariants(specVariants),
      reviewCount: Number(row.reviewCount),
      averageReviewScore,
      reviewScore: reviewIntelligence.compositeScore,
      reviewIntelligence,
      reviewCoverage: assessReviewCoverage(mappedReviews),
      reviewSignalSummary: aggregateReviewSignals(mappedReviews),
      reviewReconciliation: reconcileReviewEvidence(mappedReviews, row.metadata),
      aiReviewSummary,
      reviews: mappedReviews,
    };
  } catch {
    return buildFallbackDetail(slug);
  }
}

export async function getReleaseDetail(
  shoeSlug: string,
  releaseSlug: string,
  selectedVariantKey?: string | null,
): Promise<ShoeDetail | null> {
  if (!process.env.DATABASE_URL) {
    return buildFallbackDetail(shoeSlug);
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: shoeReleases.id,
        brand: brands.name,
        model: shoes.name,
        release: shoeReleases.versionName,
        slug: shoes.slug,
        category: shoes.category,
        terrain: shoes.terrain,
        stability: shoes.stability,
        usageSummary: shoes.usageSummary,
        notes: shoeReleases.notes,
        metadata: shoeReleases.metadata,
        priceUsd: shoeReleases.msrpUsd,
        releaseYear: shoeReleases.releaseYear,
        isCurrent: shoeReleases.isCurrent,
        isPlated: shoeReleases.isPlated,
        foam: shoeReleases.foam,
        weightOzMen: shoeSpecs.weightOzMen,
        heelStackMm: shoeSpecs.heelStackMm,
        forefootStackMm: shoeSpecs.forefootStackMm,
        dropMm: shoeSpecs.dropMm,
        fitNotes: shoeSpecs.fitNotes,
        sourceNotes: shoeSpecs.sourceNotes,
        reviewCount: count(reviews.id),
        averageReviewScore: avg(reviews.scoreNormalized100),
      })
      .from(shoeReleases)
      .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
      .innerJoin(brands, eq(shoes.brandId, brands.id))
      .leftJoin(shoeSpecs, eq(shoeSpecs.releaseId, shoeReleases.id))
      .leftJoin(reviews, and(eq(reviews.releaseId, shoeReleases.id), eq(reviews.status, "approved")))
      .where(eq(shoes.slug, shoeSlug))
      .groupBy(
        shoeReleases.id,
        brands.name,
        shoes.name,
        shoes.slug,
        shoes.category,
        shoes.terrain,
        shoes.stability,
        shoes.usageSummary,
        shoeReleases.versionName,
        shoeReleases.notes,
        shoeReleases.metadata,
        shoeReleases.msrpUsd,
        shoeReleases.releaseYear,
        shoeReleases.isCurrent,
        shoeReleases.isPlated,
        shoeReleases.foam,
        shoeSpecs.weightOzMen,
        shoeSpecs.heelStackMm,
        shoeSpecs.forefootStackMm,
        shoeSpecs.dropMm,
        shoeSpecs.fitNotes,
        shoeSpecs.sourceNotes,
      )
      .orderBy(desc(shoeReleases.releaseYear));

    const row = rows.find((candidate) => slugifyRelease(candidate.release) === releaseSlug) ?? null;
    if (!row) {
      return null;
    }

    const reviewRows = await db
      .select({
        id: reviews.id,
        title: reviews.title,
        excerpt: reviews.excerpt,
        body: reviews.body,
        scoreNormalized100: reviews.scoreNormalized100,
        sentiment: reviews.sentiment,
        publishedAt: reviews.publishedAt,
        metadata: reviews.metadata,
        sourceName: reviewSources.name,
        sourceType: reviewSources.sourceType,
        sourceUrl: reviews.sourceUrl,
        authorName: reviewAuthors.displayName,
      })
      .from(reviews)
      .innerJoin(reviewSources, eq(reviews.sourceId, reviewSources.id))
      .leftJoin(reviewAuthors, eq(reviews.authorId, reviewAuthors.id))
      .where(and(eq(reviews.releaseId, row.id), eq(reviews.status, "approved")))
      .orderBy(desc(reviews.publishedAt));

    const specVariantsByReleaseId = await getSpecVariantsByReleaseId([row.id]);
    return buildShoeDetailFromRow(row, reviewRows, specVariantsByReleaseId.get(row.id) ?? [], selectedVariantKey);
  } catch {
    return buildFallbackDetail(shoeSlug);
  }
}

export async function getShoeParentPageData(slug: string): Promise<ShoeParentPageData | null> {
  if (!process.env.DATABASE_URL) {
    const fallback = buildFallbackDetail(slug);
    if (!fallback) return null;

    return {
      brand: fallback.brand,
      model: fallback.model,
      slug: fallback.slug,
      category: fallback.category,
      terrain: fallback.terrain,
      stability: fallback.stability,
      usageSummary: fallback.usageSummary,
      featuredRelease: fallback,
      releases: [
        {
          id: fallback.id,
          release: fallback.release,
          releaseSlug: slugifyRelease(fallback.release),
          releaseYear: fallback.releaseYear,
          isCurrent: fallback.isCurrent,
          priceUsd: fallback.priceUsd,
          reviewCount: fallback.reviewCount,
          averageReviewScore: fallback.averageReviewScore,
          reviewScore: fallback.reviewScore,
          reviewIntelligence: fallback.reviewIntelligence,
          reviewCoverage: fallback.reviewCoverage,
          changeTeaser: ["Current fallback release."],
        },
      ],
      releaseChanges: [],
    };
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: shoeReleases.id,
        brand: brands.name,
        model: shoes.name,
        shoeSlug: shoes.slug,
        category: shoes.category,
        terrain: shoes.terrain,
        stability: shoes.stability,
        usageSummary: shoes.usageSummary,
        release: shoeReleases.versionName,
        releaseYear: shoeReleases.releaseYear,
        isCurrent: shoeReleases.isCurrent,
        isPlated: shoeReleases.isPlated,
        foam: shoeReleases.foam,
        notes: shoeReleases.notes,
        metadata: shoeReleases.metadata,
        priceUsd: shoeReleases.msrpUsd,
        weightOzMen: shoeSpecs.weightOzMen,
        heelStackMm: shoeSpecs.heelStackMm,
        forefootStackMm: shoeSpecs.forefootStackMm,
        dropMm: shoeSpecs.dropMm,
        fitNotes: shoeSpecs.fitNotes,
        sourceNotes: shoeSpecs.sourceNotes,
        reviewCount: count(reviews.id),
        averageReviewScore: avg(reviews.scoreNormalized100),
      })
      .from(shoeReleases)
      .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
      .innerJoin(brands, eq(shoes.brandId, brands.id))
      .leftJoin(shoeSpecs, eq(shoeSpecs.releaseId, shoeReleases.id))
      .leftJoin(reviews, and(eq(reviews.releaseId, shoeReleases.id), eq(reviews.status, "approved")))
      .where(eq(shoes.slug, slug))
      .groupBy(
        shoeReleases.id,
        brands.name,
        shoes.name,
        shoes.slug,
        shoes.category,
        shoes.terrain,
        shoes.stability,
        shoes.usageSummary,
        shoeReleases.versionName,
        shoeReleases.releaseYear,
        shoeReleases.isCurrent,
        shoeReleases.isPlated,
        shoeReleases.foam,
        shoeReleases.notes,
        shoeReleases.metadata,
        shoeReleases.msrpUsd,
        shoeSpecs.weightOzMen,
        shoeSpecs.heelStackMm,
        shoeSpecs.forefootStackMm,
        shoeSpecs.dropMm,
        shoeSpecs.fitNotes,
        shoeSpecs.sourceNotes,
      )
      .orderBy(desc(shoeReleases.releaseYear), desc(shoeReleases.isCurrent), shoes.name);

    const featured = rows[0];
    if (!featured) {
      return null;
    }

    const featuredDetail = await getReleaseDetail(slug, slugifyRelease(featured.release));
    if (!featuredDetail) {
      return null;
    }

    const releaseChanges = buildReleaseChangeSummaries(rows);
    const changeMap = new Map(
      releaseChanges.map((change) => [change.releaseSlug, change.changes.slice(0, 2)]),
    );

    const releases = rows.map((row) => {
      const reviewCount = Number(row.reviewCount);
      const averageReviewScore = row.averageReviewScore ? Number(row.averageReviewScore) : null;
      const reviewIntelligence = buildAggregateReviewIntelligence(
        reviewCount,
        averageReviewScore,
        getReleaseAiReviewSummary(row.metadata),
      );

      return {
        id: row.id,
        release: row.release,
        releaseSlug: slugifyRelease(row.release),
        releaseYear: row.releaseYear,
        isCurrent: row.isCurrent,
        priceUsd: row.priceUsd ? Number(row.priceUsd) : null,
        reviewCount,
        averageReviewScore,
        reviewScore: reviewIntelligence.compositeScore,
        reviewIntelligence,
        reviewCoverage: assessComparisonRowCoverage(row.metadata, reviewCount),
        changeTeaser:
          changeMap.get(slugifyRelease(row.release)) ?? ["No major changes summarized for this release yet."],
      };
    });

    return {
      brand: featured.brand,
      model: featured.model,
      slug: featured.shoeSlug,
      category: humanizeCategory(featured.category),
      terrain: humanizeCategory(featured.terrain),
      stability: capitalize(featured.stability),
      usageSummary: featured.usageSummary,
      featuredRelease: featuredDetail,
      releases,
      releaseChanges,
    };
  } catch {
    return null;
  }
}

function getReviewHighlights(metadata: unknown) {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const maybeHighlights = (metadata as Record<string, unknown>).highlights;
  if (!Array.isArray(maybeHighlights)) {
    return [];
  }

  return maybeHighlights.filter((value): value is string => typeof value === "string").slice(0, 3);
}

function reconcileReviewEvidence(
  reviews: Array<
    ShoeReviewSummary & {
      body?: string | null;
    }
  >,
  releaseMetadata?: unknown,
) {
  const overrides = getReleaseReconciliationOverrides(releaseMetadata);
  const themeMap = new Map<
    string,
    {
      positive: number;
      mixed: number;
      negative: number;
      sources: Set<string>;
      reviewIds: Set<string>;
      evidence: Array<{
        sourceName: string;
        sourceType: "editorial" | "reddit" | "user";
        excerpt: string;
      }>;
    }
  >();

  for (const review of reviews) {
    const themeLabels = inferThemeLabels(review);
    for (const label of themeLabels) {
      const entry = themeMap.get(label) ?? {
        positive: 0,
        mixed: 0,
        negative: 0,
        sources: new Set<string>(),
        reviewIds: new Set<string>(),
        evidence: [],
      };

      const sentiment = review.sentiment ?? "mixed";
      entry[sentiment] += 1;
      entry.sources.add(`${review.sourceType}:${review.sourceName}`);
      entry.reviewIds.add(review.id);

      const excerpt = (review.excerpt ?? review.body ?? "").trim();
      if (excerpt && entry.evidence.length < 3) {
        entry.evidence.push({
          sourceName: review.sourceName,
          sourceType: review.sourceType,
          excerpt: excerpt.slice(0, 180),
        });
      }

      themeMap.set(label, entry);
    }
  }

  const themes = [...themeMap.entries()]
    .map(([label, entry]) => ({
      label,
      dominantSentiment: getDominantThemeSentiment(entry),
      confidence: getThemeConfidence(entry),
      hasContradiction: entry.positive > 0 && entry.negative > 0,
      sourceCount: entry.sources.size,
      reviewCount: entry.reviewIds.size,
      evidence: entry.evidence,
    }))
    .sort((left, right) => {
      if (right.sourceCount !== left.sourceCount) {
        return right.sourceCount - left.sourceCount;
      }

      return right.reviewCount - left.reviewCount;
    })
    .filter((theme) => !overrides.ignoredThemes.includes(theme.label))
    .slice(0, 5);

  return {
    themes,
    contradictionCount: themes.filter((theme) => theme.hasContradiction).length,
    topTakeaways: overrides.pinnedTakeaways.length
      ? overrides.pinnedTakeaways
      : buildThemeTakeaways(themes),
    summaryNote: overrides.summaryNote,
  };
}

function inferThemeLabels(
  review: ShoeReviewSummary & {
    body?: string | null;
  },
) {
  const explicit = review.highlights;
  const haystack = normalizeSearchText(`${review.excerpt ?? ""} ${review.body ?? ""}`);
  const inferred = HIGHLIGHT_PATTERNS.filter(({ patterns }) =>
    patterns.some((pattern) => haystack.includes(pattern)),
  ).map((pattern) => pattern.label);

  return uniq([...explicit, ...inferred]);
}

function getDominantThemeSentiment(entry: { positive: number; mixed: number; negative: number }) {
  if (entry.positive >= entry.mixed && entry.positive >= entry.negative) {
    return "positive" as const;
  }

  if (entry.negative >= entry.mixed && entry.negative >= entry.positive) {
    return "negative" as const;
  }

  return "mixed" as const;
}

function getThemeConfidence(entry: {
  positive: number;
  mixed: number;
  negative: number;
  sources: Set<string>;
  reviewIds: Set<string>;
}) {
  const reviewCount = entry.reviewIds.size;
  const sourceCount = entry.sources.size;
  const dominantSentiment = getDominantThemeSentiment(entry);
  const dominantCount =
    dominantSentiment === "positive"
      ? entry.positive
      : dominantSentiment === "negative"
        ? entry.negative
        : entry.mixed;
  const agreementRatio = reviewCount > 0 ? dominantCount / reviewCount : 0;

  if (sourceCount >= 2 && reviewCount >= 2 && agreementRatio >= 0.7) {
    return "high" as const;
  }

  if (sourceCount >= 1 && reviewCount >= 1 && agreementRatio >= 0.5) {
    return "medium" as const;
  }

  return "low" as const;
}

function buildThemeTakeaways(
  themes: Array<{
    label: string;
    dominantSentiment: "positive" | "mixed" | "negative";
    confidence: "low" | "medium" | "high";
    hasContradiction: boolean;
    sourceCount: number;
  }>,
) {
  return themes.slice(0, 3).map((theme) => {
    if (theme.hasContradiction) {
      return `${theme.label} is contested across ${theme.sourceCount} sources.`;
    }

    const sentimentVerb =
      theme.dominantSentiment === "positive"
        ? "leans positive"
        : theme.dominantSentiment === "negative"
          ? "leans negative"
          : "is mixed";

    return `${theme.label} ${sentimentVerb} across current reviews.`;
  });
}

function aggregateReviewSignals(reviews: ShoeReviewSummary[]) {
  const highlightCounts = new Map<string, { count: number; weight: number }>();
  const sentimentBreakdown = {
    positive: 0,
    mixed: 0,
    negative: 0,
  };
  const weightedSentiment = {
    positive: 0,
    mixed: 0,
    negative: 0,
  };
  const sources = new Set<string>();

  for (const review of reviews) {
    sources.add(review.sourceName);
    const reviewWeight = getReviewWeight(review);

    if (review.sentiment) {
      sentimentBreakdown[review.sentiment] += 1;
      weightedSentiment[review.sentiment] += reviewWeight;
    }

    for (const highlight of review.highlights) {
      const current = highlightCounts.get(highlight) ?? { count: 0, weight: 0 };
      highlightCounts.set(highlight, {
        count: current.count + 1,
        weight: current.weight + reviewWeight,
      });
    }
  }

  const topHighlights = [...highlightCounts.entries()]
    .sort(
      (left, right) =>
        right[1].weight - left[1].weight || right[1].count - left[1].count || left[0].localeCompare(right[0])
    )
    .slice(0, 4)
    .map(([label, value]) => ({
      label,
      count: value.count,
      weight: Number(value.weight.toFixed(2)),
    }));

  const dominantSentiment = getDominantSentiment(weightedSentiment);

  return {
    topHighlights,
    sentimentBreakdown,
    weightedSentiment: {
      positive: Number(weightedSentiment.positive.toFixed(2)),
      mixed: Number(weightedSentiment.mixed.toFixed(2)),
      negative: Number(weightedSentiment.negative.toFixed(2)),
    },
    dominantSentiment,
    sourceCount: sources.size,
  };
}

function assessReviewCoverage(reviews: ShoeReviewSummary[]) {
  const sourceCount = new Set(reviews.map((review) => `${review.sourceType}:${review.sourceName}`)).size;
  const datedReviews = reviews
    .map((review) => review.publishedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime());
  const freshestReviewDate = datedReviews[0] ? datedReviews[0].toISOString().slice(0, 10) : null;
  const daysSinceFreshest = datedReviews[0]
    ? Math.floor((Date.now() - datedReviews[0].getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (reviews.length === 0) {
    return {
      status: "thin" as const,
      summary: "Review coverage will appear here as sources are added for this release.",
      sourceCount,
      reviewCount: reviews.length,
      freshestReviewDate,
    };
  }

  if (daysSinceFreshest !== null && daysSinceFreshest > 365) {
    return {
      status: "stale" as const,
      summary: "This release has established review coverage across current indexed sources.",
      sourceCount,
      reviewCount: reviews.length,
      freshestReviewDate,
    };
  }

  if (reviews.length < 2 || sourceCount < 2) {
    return {
      status: "developing" as const,
      summary: "This release already has a visible review read across the indexed sources.",
      sourceCount,
      reviewCount: reviews.length,
      freshestReviewDate,
    };
  }

  return {
    status: "strong" as const,
    summary: "This release has broad review coverage across multiple indexed sources.",
    sourceCount,
    reviewCount: reviews.length,
    freshestReviewDate,
  };
}

function getReviewWeight(review: ShoeReviewSummary) {
  const sourceWeight = review.sourceType === "editorial" ? 1 : review.sourceType === "reddit" ? 0.7 : 0.55;
  const freshnessWeight = getFreshnessWeight(review.publishedAt);
  return sourceWeight * freshnessWeight;
}

function getFreshnessWeight(publishedAt: string | null) {
  if (!publishedAt) {
    return 0.65;
  }

  const published = new Date(publishedAt);
  if (Number.isNaN(published.getTime())) {
    return 0.65;
  }

  const daysOld = (Date.now() - published.getTime()) / (1000 * 60 * 60 * 24);
  if (daysOld <= 120) {
    return 1;
  }

  if (daysOld <= 365) {
    return 0.85;
  }

  if (daysOld <= 730) {
    return 0.7;
  }

  return 0.55;
}

function getDominantSentiment(weightedSentiment: {
  positive: number;
  mixed: number;
  negative: number;
}) {
  const entries = Object.entries(weightedSentiment) as Array<["positive" | "mixed" | "negative", number]>;
  const sorted = entries.sort((left, right) => right[1] - left[1]);

  if (!sorted[0] || sorted[0][1] <= 0) {
    return null;
  }

  return sorted[0][0];
}

export async function getComparisonPageData(
  selectedSlugs: string[],
  selectedVariantKeysByReleaseId: Record<string, string> = {},
): Promise<ComparisonPageData> {
  const rows = await getComparisonRows(selectedSlugs, selectedVariantKeysByReleaseId);
  return {
    rows,
    narrative: buildComparisonNarrative(rows),
  };
}

export async function getComparisonRows(
  selectedReleaseIds: string[],
  selectedVariantKeysByReleaseId: Record<string, string> = {},
): Promise<ComparisonRow[]> {
  const releaseIds = selectedReleaseIds.filter(Boolean).slice(0, 4);
  if (!releaseIds.length) {
    return [];
  }

  if (!process.env.DATABASE_URL) {
    return buildFallbackComparison(buildFallbackCatalog().slice(0, Math.min(3, releaseIds.length)));
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: shoeReleases.id,
        brand: brands.name,
        model: shoes.name,
        release: shoeReleases.versionName,
        slug: shoes.slug,
        releaseYear: shoeReleases.releaseYear,
        category: shoes.category,
        terrain: shoes.terrain,
        stability: shoes.stability,
        usageSummary: shoes.usageSummary,
        isCurrent: shoeReleases.isCurrent,
        isPlated: shoeReleases.isPlated,
        foam: shoeReleases.foam,
        priceUsd: shoeReleases.msrpUsd,
        weightOzMen: shoeSpecs.weightOzMen,
        heelStackMm: shoeSpecs.heelStackMm,
        forefootStackMm: shoeSpecs.forefootStackMm,
        dropMm: shoeSpecs.dropMm,
        metadata: shoeReleases.metadata,
        reviewCount: count(reviews.id),
        averageReviewScore: avg(reviews.scoreNormalized100),
      })
      .from(shoeReleases)
      .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
      .innerJoin(brands, eq(shoes.brandId, brands.id))
      .leftJoin(shoeSpecs, eq(shoeSpecs.releaseId, shoeReleases.id))
      .leftJoin(
        reviews,
        and(eq(reviews.releaseId, shoeReleases.id), eq(reviews.status, "approved"))
      )
      .where(inArray(shoeReleases.id, releaseIds))
      .groupBy(
        shoeReleases.id,
        brands.name,
        shoes.name,
        shoes.slug,
        shoes.category,
        shoes.terrain,
        shoes.stability,
        shoes.usageSummary,
        shoeReleases.versionName,
        shoeReleases.releaseYear,
        shoeReleases.isCurrent,
        shoeReleases.isPlated,
        shoeReleases.foam,
        shoeReleases.msrpUsd,
        shoeReleases.metadata,
        shoeSpecs.weightOzMen,
        shoeSpecs.heelStackMm,
        shoeSpecs.forefootStackMm,
        shoeSpecs.dropMm
      )
      .orderBy(brands.name, shoes.name);

    const specVariantsByReleaseId = await getSpecVariantsByReleaseId(rows.map((row) => row.id));

    return rows.map((row) => {
      const reviewCount = Number(row.reviewCount);
      const averageReviewScore = row.averageReviewScore ? Number(row.averageReviewScore) : null;
      const aiReviewSummary = getReleaseAiReviewSummary(row.metadata);
      const reviewIntelligence = buildAggregateReviewIntelligence(reviewCount, averageReviewScore, aiReviewSummary);
      const specVariants = specVariantsByReleaseId.get(row.id) ?? [];
      const selectedSpecVariant = resolveSpecVariant(specVariants, selectedVariantKeysByReleaseId[row.id]);
      const primarySpecVariant = getPrimarySpecVariant(specVariants);

      return {
        id: row.id,
        brand: row.brand,
        model: row.model,
        release: row.release,
        slug: row.slug,
        releaseSlug: slugifyRelease(row.release),
        releaseYear: row.releaseYear,
        category: humanizeCategory(row.category),
        terrain: humanizeCategory(row.terrain),
        stability: capitalize(row.stability),
        foam: row.foam,
        rideProfile: buildRideProfile(row.foam, row.isPlated),
        usageSummary: row.usageSummary,
        weightOz: selectedSpecVariant?.weightOz ?? (row.weightOzMen ? Number(row.weightOzMen) : null),
        heelStackMm: selectedSpecVariant?.heelStackMm ?? row.heelStackMm,
        forefootStackMm: selectedSpecVariant?.forefootStackMm ?? row.forefootStackMm,
        dropMm: selectedSpecVariant?.dropMm ?? row.dropMm,
        specVariants,
        primarySpecVariant,
        selectedSpecVariant,
        showSpecVariantToggle: hasMenAndWomenVariants(specVariants),
        reviewCount,
        isPlated: row.isPlated,
        isCurrent: row.isCurrent,
        priceUsd: row.priceUsd ? Number(row.priceUsd) : null,
        averageReviewScore,
        reviewScore: reviewIntelligence.compositeScore,
        reviewIntelligence,
        reviewCoverage: assessComparisonRowCoverage(row.metadata, reviewCount),
        aiReviewSummary,
        reviewReconciliation: buildComparisonReconciliationFromMetadata(row.metadata),
      };
    });
  } catch {
    return buildFallbackComparison(buildFallbackCatalog().slice(0, Math.min(3, releaseIds.length)));
  }
}

export async function getReviewsFeedData(): Promise<ReviewsFeedData> {
  if (!process.env.DATABASE_URL) {
    return {
      items: [],
      filterOptions: {
        brands: [],
        categories: [],
        sourceTypes: ["editorial", "reddit", "user"],
      },
    };
  }

  try {
    const db = getDb();
    const rows = await db
      .select({
        id: reviews.id,
        brand: brands.name,
        model: shoes.name,
        release: shoeReleases.versionName,
        shoeSlug: shoes.slug,
        category: shoes.category,
        sourceName: reviewSources.name,
        sourceType: reviewSources.sourceType,
        sourceUrl: reviews.sourceUrl,
        title: reviews.title,
        excerpt: reviews.excerpt,
        sentiment: reviews.sentiment,
        scoreNormalized100: reviews.scoreNormalized100,
        publishedAt: reviews.publishedAt,
        authorName: reviewAuthors.displayName,
        metadata: shoeReleases.metadata,
      })
      .from(reviews)
      .innerJoin(shoeReleases, eq(reviews.releaseId, shoeReleases.id))
      .innerJoin(shoes, eq(shoeReleases.shoeId, shoes.id))
      .innerJoin(brands, eq(shoes.brandId, brands.id))
      .innerJoin(reviewSources, eq(reviews.sourceId, reviewSources.id))
      .leftJoin(reviewAuthors, eq(reviews.authorId, reviewAuthors.id))
      .where(eq(reviews.status, "approved"))
      .orderBy(desc(reviews.publishedAt), desc(reviews.createdAt));

    const items = rows.map((row) => ({
      reviewIntelligence: buildAggregateReviewIntelligence(
        row.scoreNormalized100 !== null || row.sentiment ? 1 : 0,
        row.scoreNormalized100 !== null ? Number(row.scoreNormalized100) : null,
        getReleaseAiReviewSummary(row.metadata),
      ),
      id: row.id,
      brand: row.brand,
      model: row.model,
      release: row.release,
      shoeSlug: row.shoeSlug,
      releaseSlug: slugifyRelease(row.release),
      category: humanizeCategory(row.category),
      sourceName: row.sourceName,
      sourceType: row.sourceType,
      sourceUrl: row.sourceUrl,
      title: row.title,
      excerpt: row.excerpt,
      sentiment: row.sentiment,
      scoreNormalized100: row.scoreNormalized100,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString().slice(0, 10) : null,
      authorName: row.authorName,
      aiOverview: getReleaseAiReviewSummary(row.metadata)?.overview ?? null,
    })).map(({ reviewIntelligence, ...item }) => ({
      ...item,
      reviewScore: reviewIntelligence.compositeScore,
      reviewConfidence: reviewIntelligence.confidence,
      buyerSignal: reviewIntelligence.buyerSignal,
      consensusPoints: reviewIntelligence.consensusPoints,
      debates: reviewIntelligence.debates,
    }));

    return {
      items,
      filterOptions: {
        brands: uniq(items.map((item) => item.brand)),
        categories: uniq(items.map((item) => item.category)),
        sourceTypes: uniq(items.map((item) => item.sourceType)) as Array<"editorial" | "reddit" | "user">,
      },
    };
  } catch {
    return {
      items: [],
      filterOptions: {
        brands: [],
        categories: [],
        sourceTypes: ["editorial", "reddit", "user"],
      },
    };
  }
}

function humanizeCategory(category: string) {
  return category
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function buildRideProfile(foam: string | null, isPlated: boolean) {
  const parts = [foam, isPlated ? "Plated" : "Non-plated"].filter(Boolean);
  return parts.join(", ");
}

async function getSpecVariantsByReleaseId(releaseIds: string[]) {
  if (!releaseIds.length) {
    return new Map<string, SpecVariant[]>();
  }

  const db = getDb();
  const rows = await db.query.shoeSpecVariants.findMany({
    where: inArray(shoeSpecVariants.releaseId, releaseIds),
  });

  const variants = rows
    .sort((left, right) => {
      if (left.isPrimary !== right.isPrimary) {
        return left.isPrimary ? -1 : 1;
      }
      return left.displayLabel.localeCompare(right.displayLabel);
    })
    .map<SpecVariant>((row) => ({
    id: row.id,
    releaseId: row.releaseId,
    variantKey: row.variantKey,
    displayLabel: row.displayLabel,
    audience: row.audience,
    isPrimary: row.isPrimary,
    weightOz: row.weightOz ? Number(row.weightOz) : null,
    heelStackMm: row.heelStackMm,
    forefootStackMm: row.forefootStackMm,
    dropMm: row.dropMm,
    lugDepthMm: row.lugDepthMm ? Number(row.lugDepthMm) : null,
    widthNotes: row.widthNotes,
    fitNotes: row.fitNotes,
    sourceNotes: row.sourceNotes,
    sourceUrl: row.sourceUrl,
    sourceLabel: row.sourceLabel,
    lastVerifiedAt: row.lastVerifiedAt ? row.lastVerifiedAt.toISOString() : null,
  }));

  const byRelease = new Map<string, SpecVariant[]>();
  for (const variant of variants) {
    const current = byRelease.get(variant.releaseId) ?? [];
    current.push(variant);
    byRelease.set(variant.releaseId, current);
  }
  return byRelease;
}

function getPrimarySpecVariant(specVariants: SpecVariant[]) {
  return specVariants.find((variant) => variant.isPrimary) ?? specVariants[0] ?? null;
}

function resolveSpecVariant(specVariants: SpecVariant[], variantKey?: string | null) {
  if (variantKey) {
    const match = specVariants.find((variant) => variant.variantKey === variantKey);
    if (match) {
      return match;
    }
  }
  return getPrimarySpecVariant(specVariants);
}

function hasMenAndWomenVariants(specVariants: SpecVariant[]) {
  const audiences = new Set(specVariants.map((variant) => variant.audience));
  return audiences.has("mens") && audiences.has("womens");
}

function buildFallbackCatalog(): CatalogCard[] {
  return fallbackShoes.map((shoe, index) => {
    const averageReviewScore = 80 + index * 5;
    const reviewIntelligence = buildAggregateReviewIntelligence(1, averageReviewScore, null);

    return {
      id: `fallback-${index}`,
      brand: shoe.brand,
      model: shoe.name,
      release: shoe.name,
      slug: `${shoe.brand}-${shoe.name}`.toLowerCase().replaceAll(" ", "-"),
      releaseSlug: slugifyRelease(shoe.name),
      releaseYear: 2024,
      category: shoe.category,
      foam: "Responsive foam",
      terrain: "Road",
      stability: "Neutral",
      rideProfile: shoe.rideProfile,
      usageSummary: shoe.category,
      priceUsd: index === 1 ? 170 : 140,
      weightOz: shoe.weightOz,
      heelStackMm: shoe.dropMm ? shoe.dropMm + 28 : null,
      forefootStackMm: 28,
      dropMm: shoe.dropMm,
      reviewCount: 1,
      averageReviewScore,
      reviewScore: reviewIntelligence.compositeScore,
      reviewIntelligence,
      aiReviewSummary: null,
      isPlated: false,
      isCurrent: true,
    };
  });
}

function buildFallbackDetail(slug: string): ShoeDetail | null {
  const match = buildFallbackCatalog().find((shoe) => shoe.slug === slug);
  if (!match) return null;
  const reviewIntelligence = buildAggregateReviewIntelligence(match.reviewCount, 82, null);

  return {
    id: match.id,
    brand: match.brand,
    model: match.model,
    release: match.release,
    slug: match.slug,
    category: match.category,
    terrain: match.terrain,
    stability: match.stability,
    usageSummary: match.usageSummary,
    rideProfile: match.rideProfile,
    notes: "Prototype seed entry while the production catalog is expanding.",
    priceUsd: 140,
    releaseYear: 2024,
    isCurrent: true,
    isPlated: match.isPlated,
    foam: "Responsive foam",
    weightOz: match.weightOz,
    heelStackMm: match.dropMm ? match.dropMm + 27 : null,
    forefootStackMm: 27,
    dropMm: match.dropMm,
    fitNotes: "Neutral fit profile with moderate forefoot room.",
    sourceNotes: "Fallback data from the design seed set.",
    specVariants: [],
    primarySpecVariant: null,
    selectedSpecVariant: null,
    showSpecVariantToggle: false,
    reviewCount: match.reviewCount,
    averageReviewScore: 82,
    reviewScore: reviewIntelligence.compositeScore,
    reviewIntelligence,
    reviewCoverage: {
      status: "developing",
      summary: "Fallback review coverage signal only.",
      sourceCount: 1,
      reviewCount: match.reviewCount,
      freshestReviewDate: "2024-01-01",
    },
    reviewSignalSummary: {
      topHighlights: [
        { label: "Cushioning", count: 1, weight: 1 },
        { label: "Ride", count: 1, weight: 1 },
      ],
      sentimentBreakdown: {
        positive: 1,
        mixed: 0,
        negative: 0,
      },
      weightedSentiment: {
        positive: 1,
        mixed: 0,
        negative: 0,
      },
      dominantSentiment: "positive",
      sourceCount: 1,
    },
    reviewReconciliation: {
      summaryNote: "Fallback editorial summary for environments without live database access.",
      topTakeaways: ["Cushioning leans positive with medium confidence."],
      contradictionCount: 0,
      themes: [
        {
          label: "Cushioning",
          dominantSentiment: "positive",
          confidence: "medium",
          hasContradiction: false,
          sourceCount: 1,
          reviewCount: 1,
          evidence: [
            {
              sourceName: "Seed Source",
              sourceType: "editorial",
              excerpt: "Fallback review content for environments without database access.",
            },
          ],
        },
      ],
    },
    aiReviewSummary: null,
    reviews: [
      {
        id: `${match.id}-review`,
        title: `${match.release} seed review`,
        excerpt: "Fallback review content for environments without database access.",
        highlights: ["Cushioning", "Ride"],
        scoreNormalized100: 82,
        sentiment: "positive",
        publishedAt: "2024-01-01",
        sourceName: "Seed Source",
        sourceType: "editorial",
        sourceUrl: "#",
        authorName: "Seed Author",
      },
    ],
  };
}

function buildFallbackComparison(shoes: CatalogCard[]): ComparisonRow[] {
  const source = shoes.length ? shoes : buildFallbackCatalog().slice(0, 3);
  return source.map((shoe, index) => {
    const averageReviewScore = 80 + index * 5;
    const reviewIntelligence = buildAggregateReviewIntelligence(shoe.reviewCount, averageReviewScore, null);

    return {
      ...shoe,
      releaseSlug: slugifyRelease(shoe.release),
      priceUsd: index === 1 ? 170 : 140,
      heelStackMm: shoe.dropMm ? shoe.dropMm + 28 : null,
      forefootStackMm: 28,
      weightOz: shoe.weightOz,
      dropMm: shoe.dropMm,
      specVariants: [],
      primarySpecVariant: null,
      selectedSpecVariant: null,
      showSpecVariantToggle: false,
      averageReviewScore,
      reviewScore: reviewIntelligence.compositeScore,
      reviewIntelligence,
      reviewCoverage: {
        status: "developing",
        summary: "Fallback review coverage signal only.",
        sourceCount: 1,
        reviewCount: shoe.reviewCount,
        freshestReviewDate: "2024-01-01",
      },
      aiReviewSummary: null,
      reviewReconciliation: {
        summaryNote: null,
        topTakeaways: [],
        contradictionCount: 0,
        themes: [],
      },
    };
  });
}

function buildShoeDetailFromRow(
  row: {
    id: string;
    brand: string;
    model: string;
    release: string;
    slug: string;
    category: string;
    terrain: string;
    stability: string;
    usageSummary: string | null;
    notes: string | null;
    metadata: unknown;
    priceUsd: string | null;
    releaseYear: number | null;
    isCurrent: boolean;
    isPlated: boolean;
    foam: string | null;
    weightOzMen: string | null;
    heelStackMm: number | null;
    forefootStackMm: number | null;
    dropMm: number | null;
    fitNotes: string | null;
    sourceNotes: string | null;
    reviewCount: number | string;
    averageReviewScore: string | null;
  },
  reviewRows: Array<{
    id: string;
    title: string | null;
    excerpt: string | null;
    body: string | null;
    scoreNormalized100: number | null;
    sentiment: "positive" | "mixed" | "negative" | null;
    publishedAt: Date | null;
    metadata: unknown;
    sourceName: string;
    sourceType: "editorial" | "reddit" | "user";
    sourceUrl: string;
    authorName: string | null;
  }>,
  specVariants: SpecVariant[] = [],
  selectedVariantKey?: string | null,
): ShoeDetail {
  const mappedReviews = reviewRows.map((review) => ({
    id: review.id,
    title: review.title,
    excerpt: review.excerpt,
    body: review.body,
    highlights: getReviewHighlights(review.metadata),
    scoreNormalized100: review.scoreNormalized100,
    sentiment: review.sentiment,
    publishedAt: review.publishedAt ? review.publishedAt.toISOString().slice(0, 10) : null,
    sourceName: review.sourceName,
    sourceType: review.sourceType,
    sourceUrl: review.sourceUrl,
    authorName: review.authorName,
  }));
  const averageReviewScore = row.averageReviewScore ? Number(row.averageReviewScore) : null;
  const aiReviewSummary = getReleaseAiReviewSummary(row.metadata);
  const reviewIntelligence = buildReviewIntelligence(mappedReviews, averageReviewScore, aiReviewSummary);
  const primarySpecVariant = getPrimarySpecVariant(specVariants);
  const selectedSpecVariant = resolveSpecVariant(specVariants, selectedVariantKey);

  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    release: row.release,
    slug: row.slug,
    category: humanizeCategory(row.category),
    terrain: humanizeCategory(row.terrain),
    stability: capitalize(row.stability),
    usageSummary: row.usageSummary,
    rideProfile: buildRideProfile(row.foam, row.isPlated),
    notes: row.notes,
    priceUsd: row.priceUsd ? Number(row.priceUsd) : null,
    releaseYear: row.releaseYear,
    isCurrent: row.isCurrent,
    isPlated: row.isPlated,
    foam: row.foam,
    weightOz: selectedSpecVariant?.weightOz ?? (row.weightOzMen ? Number(row.weightOzMen) : null),
    heelStackMm: selectedSpecVariant?.heelStackMm ?? row.heelStackMm,
    forefootStackMm: selectedSpecVariant?.forefootStackMm ?? row.forefootStackMm,
    dropMm: selectedSpecVariant?.dropMm ?? row.dropMm,
    fitNotes: selectedSpecVariant?.fitNotes ?? row.fitNotes,
    sourceNotes: selectedSpecVariant?.sourceNotes ?? row.sourceNotes,
    specVariants,
    primarySpecVariant,
    selectedSpecVariant,
    showSpecVariantToggle: hasMenAndWomenVariants(specVariants),
    reviewCount: Number(row.reviewCount),
    averageReviewScore,
    reviewScore: reviewIntelligence.compositeScore,
    reviewIntelligence,
    reviewCoverage: assessReviewCoverage(mappedReviews),
    reviewSignalSummary: aggregateReviewSignals(mappedReviews),
    reviewReconciliation: reconcileReviewEvidence(mappedReviews, row.metadata),
    aiReviewSummary,
    reviews: mappedReviews,
  };
}

function buildReleaseChangeSummaries(
  rows: Array<{
    release: string;
    releaseYear: number | null;
    isPlated: boolean;
    foam: string | null;
    priceUsd: string | null;
    weightOzMen: string | null;
    heelStackMm: number | null;
    forefootStackMm: number | null;
    dropMm: number | null;
    metadata: unknown;
  }>,
): ReleaseChangeSummary[] {
  const changes: ReleaseChangeSummary[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const current = rows[index];
    const previous = rows[index + 1] ?? null;
    if (!previous) {
      changes.push({
        release: current.release,
        releaseSlug: slugifyRelease(current.release),
        previousRelease: null,
        changes: ["Baseline release for this shoe line in the current catalog."],
      });
      continue;
    }

    const items: string[] = [];
    if (current.foam !== previous.foam) {
      items.push(`Foam changed from ${previous.foam ?? "unknown"} to ${current.foam ?? "unknown"}.`);
    }
    if (current.isPlated !== previous.isPlated) {
      items.push(current.isPlated ? "Plate added to this version." : "Plate removed from this version.");
    }
    if (current.priceUsd !== previous.priceUsd) {
      items.push(
        `MSRP moved from ${formatUsd(previous.priceUsd)} to ${formatUsd(current.priceUsd)}.`,
      );
    }
    if (current.weightOzMen !== previous.weightOzMen) {
      items.push(
        `Men's weight shifted from ${formatOz(previous.weightOzMen)} to ${formatOz(current.weightOzMen)}.`,
      );
    }
    if (current.heelStackMm !== previous.heelStackMm || current.forefootStackMm !== previous.forefootStackMm) {
      items.push(
        `Stack changed from ${formatStack(previous.heelStackMm, previous.forefootStackMm)} to ${formatStack(current.heelStackMm, current.forefootStackMm)}.`,
      );
    }
    if (current.dropMm !== previous.dropMm) {
      items.push(`Drop changed from ${formatMm(previous.dropMm)} to ${formatMm(current.dropMm)}.`);
    }

    const currentSummary = getReleaseAiReviewSummary(current.metadata);
    const previousSummary = getReleaseAiReviewSummary(previous.metadata);
    if (previousSummary && currentSummary && canCompareReviewShift(currentSummary, previousSummary)) {
      const prev = previousSummary;
      const curr = currentSummary;
      const sentimentShift = describeSentimentShift(prev, curr);
      if (sentimentShift) {
        items.push(sentimentShift);
      }

      const bestForShift = describeListShift(
        prev.bestFor,
        curr.bestFor,
        "Best-for signal moved from",
      );
      if (bestForShift) {
        items.push(bestForShift);
      }

      const prosShift = describeListShift(
        prev.pros,
        curr.pros,
        "Reviewers shifted from",
      );
      if (prosShift) {
        items.push(prosShift);
      }
    } else if (
      currentSummary?.overview &&
      previousSummary?.overview &&
      currentSummary.overview !== previousSummary.overview
    ) {
      items.push("Review sentiment changed noticeably from the previous version.");
    }

    changes.push({
      release: current.release,
      releaseSlug: slugifyRelease(current.release),
      previousRelease: previous.release,
      changes: items.length ? items.slice(0, 4) : ["No major structured changes detected from the previous version."],
    });
  }

  return changes;
}

function buildComparisonReconciliationFromMetadata(metadata: unknown): ShoeDetail["reviewReconciliation"] {
  const overrides = getReleaseReconciliationOverrides(metadata);
  return {
    summaryNote: overrides.summaryNote,
    topTakeaways: overrides.pinnedTakeaways,
    contradictionCount: 0,
    themes: [],
  };
}

function assessComparisonRowCoverage(metadata: unknown, reviewCount: number): ShoeDetail["reviewCoverage"] {
  const aiReviewSummary = getReleaseAiReviewSummary(metadata);
  const sourceCount = aiReviewSummary?.sourceCount ?? 0;
  const freshestReviewDate = aiReviewSummary?.generatedAt ? aiReviewSummary.generatedAt.slice(0, 10) : null;

  if (reviewCount === 0) {
    return {
      status: "thin",
      summary: "No approved review coverage yet for this release.",
      sourceCount,
      reviewCount,
      freshestReviewDate: null,
    };
  }

  if (sourceCount < 2 || reviewCount < 2) {
    return {
      status: "developing",
      summary: "Review coverage is still developing for this release.",
      sourceCount,
      reviewCount,
      freshestReviewDate,
    };
  }

  return {
    status: "strong",
    summary: "This release has enough review coverage to support comparison guidance.",
    sourceCount,
    reviewCount,
    freshestReviewDate,
  };
}

function buildComparisonNarrative(rows: ComparisonRow[]): ComparisonPageData["narrative"] {
  if (rows.length < 2) {
    return {
      overview: null,
      chooserGuidance: [],
      keyDifferences: [],
      sharedSignals: [],
      caution: null,
    };
  }

  const confidenceState = assessComparisonConfidence(rows);
  const overview = buildComparisonOverview(rows);
  const chooserGuidance = rows
    .filter((row) => hasComparableNarrativeSignal(row))
    .slice(0, 3)
    .map((row) => buildChooserGuidance(row));
  const keyDifferences = buildComparisonDifferences(rows, confidenceState).slice(0, 4);
  const sharedSignals = confidenceState.allowSharedSignals ? buildSharedSignals(rows).slice(0, 4) : [];

  return {
    overview,
    chooserGuidance,
    keyDifferences,
    sharedSignals,
    caution: confidenceState.caution,
  };
}

function buildComparisonOverview(rows: ComparisonRow[]) {
  const names = rows.map((row) => `${row.brand} ${row.release}`);
  const lightest = [...rows]
    .filter((row) => row.weightOz !== null)
    .sort((left, right) => (left.weightOz ?? 99) - (right.weightOz ?? 99))[0];
  const maxScore = [...rows]
    .filter((row) => row.reviewScore !== null)
    .sort((left, right) => (right.reviewScore ?? 0) - (left.reviewScore ?? 0))[0];

  const clauses = [`${names.join(", ")} serve different buying priorities.`];
  if (lightest) {
    clauses.push(`${lightest.brand} ${lightest.release} is the lightest option in this set.`);
  }
  if (maxScore) {
    clauses.push(`${maxScore.brand} ${maxScore.release} currently has the strongest review signal.`);
  }

  return clauses.join(" ");
}

function buildReviewIntelligence(
  reviews: ShoeDetail["reviews"],
  averageReviewScore: number | null,
  aiReviewSummary: ReleaseAiReviewSummary | null,
): ReviewIntelligence {
  const reviewCount = reviews.length;
  const sourceCount = new Set(reviews.map((review) => `${review.sourceType}:${review.sourceName}`)).size;
  const evidenceCount = aiReviewSummary?.evidence.length ?? Math.min(reviewCount, 6);
  const fallbackInsights = buildFallbackReviewInsights(reviews);
  const ratingScore = weightedAverage(
    reviews
      .filter((review) => review.scoreNormalized100 !== null)
      .map((review) => ({
        value: review.scoreNormalized100 as number,
        weight: getReviewWeight(review),
      })),
  ) ?? averageReviewScore;
  const editorialScore = weightedAverage(
    reviews
      .filter((review) => review.sourceType === "editorial" && review.scoreNormalized100 !== null)
      .map((review) => ({
        value: review.scoreNormalized100 as number,
        weight: getReviewWeight(review),
      })),
  );
  const derivedEditorialSentiment = getWeightedSentiment(
    reviews.filter((review) => review.sourceType === "editorial"),
    aiReviewSummary,
  );
  const communityScore = weightedAverage(
    reviews
      .filter((review) => review.sourceType !== "editorial")
      .map((review) => ({
        value:
          review.scoreNormalized100 ??
          sentimentToScore(review.sentiment ?? aiReviewSummary?.overallSentiment ?? "mixed"),
        weight: getReviewWeight(review),
      })),
  );
  const derivedCommunitySentiment = getWeightedSentiment(
    reviews.filter((review) => review.sourceType !== "editorial"),
    aiReviewSummary,
  );
  const sentimentScore = weightedAverage(
    reviews.map((review) => ({
      value: sentimentToScore(review.sentiment ?? aiReviewSummary?.overallSentiment ?? "mixed"),
      weight: getReviewWeight(review),
    })),
  ) ?? (aiReviewSummary ? aiSummarySentimentScore(aiReviewSummary) : null);
  const confidence = deriveConfidence(
    reviewCount,
    sourceCount,
    aiReviewSummary?.confidence ?? null,
    reviews.map((review) => review.sentiment),
  );
  const agreement = deriveAgreement(reviews.map((review) => review.sentiment));
  const editorialSentiment = aiReviewSummary?.editorialSentiment ?? derivedEditorialSentiment;
  const communitySentiment = aiReviewSummary?.communitySentiment ?? derivedCommunitySentiment;
  const sourceAlignment = aiReviewSummary?.sourceAlignment ?? deriveSourceAlignment(editorialSentiment, communitySentiment);
  const compositeScore = weightedAverage(
    [
      ratingScore !== null ? { value: ratingScore, weight: 0.55 } : null,
      sentimentScore !== null ? { value: sentimentScore, weight: 0.45 } : null,
    ].filter((entry): entry is { value: number; weight: number } => Boolean(entry)),
  );

  return {
    compositeScore: compositeScore === null ? null : Math.round(compositeScore),
    ratingScore: ratingScore === null ? null : Math.round(ratingScore),
    sentimentScore: sentimentScore === null ? null : Math.round(sentimentScore),
    editorialScore: editorialScore === null ? null : Math.round(editorialScore),
    communityScore: communityScore === null ? null : Math.round(communityScore),
    editorialSentiment,
    communitySentiment,
    sourceAlignment,
    editorialSummary: buildChannelSummary("Editorial", editorialScore, editorialSentiment),
    communitySummary: buildChannelSummary("Community", communityScore, communitySentiment),
    confidence,
    agreement,
    sourceCount,
    reviewCount,
    evidenceCount,
    summary: buildReviewIntelligenceSummary(
      compositeScore === null ? null : Math.round(compositeScore),
      confidence,
      agreement,
      sourceCount,
      reviewCount,
    ),
    buyerSignal:
      aiReviewSummary?.buyerSignal ??
      buildFallbackBuyerSignal(compositeScore === null ? null : Math.round(compositeScore)),
    consensusPoints: aiReviewSummary?.consensusPoints.slice(0, 3) ?? fallbackInsights.consensusPoints,
    debates: aiReviewSummary?.debates.slice(0, 3) ?? fallbackInsights.debates,
    positives: aiReviewSummary?.pros.slice(0, 2) ?? fallbackInsights.positives,
    concerns: aiReviewSummary?.cons.slice(0, 2) ?? fallbackInsights.concerns,
  };
}

function buildAggregateReviewIntelligence(
  reviewCount: number,
  averageReviewScore: number | null,
  aiReviewSummary: ReleaseAiReviewSummary | null,
): ReviewIntelligence {
  const sourceCount = aiReviewSummary?.sourceCount ?? 0;
  const evidenceCount = aiReviewSummary?.evidence.length ?? 0;
  const sentimentScore = aiReviewSummary ? aiSummarySentimentScore(aiReviewSummary) : null;
  const confidence = deriveConfidence(reviewCount, sourceCount, aiReviewSummary?.confidence ?? null, []);
  const agreement = aiReviewSummary?.overallSentiment === "mixed" ? "mixed" : confidence === "high" ? "strong" : "mixed";
  const compositeScore = weightedAverage(
    [
      averageReviewScore !== null ? { value: averageReviewScore, weight: 0.55 } : null,
      sentimentScore !== null ? { value: sentimentScore, weight: 0.45 } : null,
    ].filter((entry): entry is { value: number; weight: number } => Boolean(entry)),
  );

  return {
    compositeScore: compositeScore === null ? null : Math.round(compositeScore),
    ratingScore: averageReviewScore === null ? null : Math.round(averageReviewScore),
    sentimentScore: sentimentScore === null ? null : Math.round(sentimentScore),
    editorialScore: null,
    communityScore: null,
    editorialSentiment: aiReviewSummary?.editorialSentiment ?? null,
    communitySentiment: aiReviewSummary?.communitySentiment ?? null,
    sourceAlignment: aiReviewSummary?.sourceAlignment ?? "mixed",
    editorialSummary: null,
    communitySummary: null,
    confidence,
    agreement,
    sourceCount,
    reviewCount,
    evidenceCount,
    summary: buildReviewIntelligenceSummary(
      compositeScore === null ? null : Math.round(compositeScore),
      confidence,
      agreement,
      sourceCount,
      reviewCount,
    ),
    buyerSignal: aiReviewSummary?.buyerSignal ?? null,
    consensusPoints: aiReviewSummary?.consensusPoints.slice(0, 3) ?? [],
    debates: aiReviewSummary?.debates.slice(0, 3) ?? [],
    positives: aiReviewSummary?.pros.slice(0, 2) ?? [],
    concerns: aiReviewSummary?.cons.slice(0, 2) ?? [],
  };
}

function buildReviewIntelligenceSummary(
  compositeScore: number | null,
  confidence: ReviewConfidence,
  agreement: ReviewIntelligence["agreement"],
  sourceCount: number,
  reviewCount: number,
) {
  if (compositeScore === null) {
    return "Review summary will appear here as soon as approved sources are available.";
  }

  const tone =
    compositeScore >= 88 ? "Very strong" : compositeScore >= 80 ? "Strong" : compositeScore >= 70 ? "Mixed-positive" : "Mixed";

  return `${tone} review signal across ${sourceCount || reviewCount} indexed sources and ${reviewCount} approved reviews.`;
}

function buildChannelSummary(
  channel: "Editorial" | "Community",
  score: number | null,
  sentiment: ReviewSentiment | null,
) {
  if (score === null && sentiment === null) {
    return null;
  }

  const tone = sentiment
    ? sentiment === "positive"
      ? "positive"
      : sentiment === "negative"
        ? "cautious"
        : "mixed"
    : score !== null && score >= 88
      ? "very positive"
      : score !== null && score >= 80
        ? "positive"
        : score !== null && score >= 72
          ? "mixed-positive"
          : score !== null && score >= 64
            ? "mixed"
            : "cautious";

  return `${channel} sentiment reads ${tone}.`;
}

function getWeightedSentiment(
  reviews: ShoeDetail["reviews"],
  aiReviewSummary: ReleaseAiReviewSummary | null,
): ReviewSentiment | null {
  if (!reviews.length) {
    return aiReviewSummary?.overallSentiment ?? null;
  }

  const weighted = {
    positive: 0,
    mixed: 0,
    negative: 0,
  };

  for (const review of reviews) {
    const sentiment = review.sentiment ?? aiReviewSummary?.overallSentiment ?? "mixed";
    weighted[sentiment] += getReviewWeight(review);
  }

  return getDominantSentiment(weighted);
}

function deriveSourceAlignment(
  editorialSentiment: ReviewSentiment | null,
  communitySentiment: ReviewSentiment | null,
): ReviewIntelligence["sourceAlignment"] {
  if (!editorialSentiment || !communitySentiment) {
    return "mixed";
  }

  if (editorialSentiment === communitySentiment) {
    return "aligned";
  }

  if (
    (editorialSentiment === "positive" && communitySentiment === "negative")
    || (editorialSentiment === "negative" && communitySentiment === "positive")
  ) {
    return "divergent";
  }

  return "mixed";
}

function buildFallbackBuyerSignal(
  compositeScore: number | null,
) {
  if (compositeScore === null) {
    return "Buyer guidance will appear here as more review content is indexed.";
  }

  const tone =
    compositeScore >= 88 ? "Broadly positive"
    : compositeScore >= 80 ? "Positive"
    : compositeScore >= 72 ? "Mixed-positive"
    : "Mixed";

  return `${tone} buyer signal from the current mix of editorial and community reviews.`;
}

function buildFallbackReviewInsights(reviews: ShoeDetail["reviews"]) {
  if (!reviews.length) {
    return {
      positives: [] as string[],
      concerns: [] as string[],
      consensusPoints: [] as string[],
      debates: [] as string[],
    };
  }

  const reconciliation = reconcileReviewEvidence(reviews, null);
  const positives = reconciliation.themes
    .filter((theme) => theme.dominantSentiment === "positive" && !theme.hasContradiction)
    .slice(0, 2)
    .map((theme) => `${theme.label} trends positive.`);
  const concerns = reconciliation.themes
    .filter((theme) => theme.dominantSentiment === "negative" || theme.hasContradiction)
    .slice(0, 2)
    .map((theme) =>
      theme.hasContradiction ? `${theme.label} feedback is mixed.` : `${theme.label} is the main concern.`,
    );
  const consensusPoints = reconciliation.themes
    .filter((theme) => !theme.hasContradiction)
    .slice(0, 3)
    .map((theme) => `${theme.label} ${theme.dominantSentiment === "positive" ? "leans positive" : "is mixed"}.`);
  const debates = reconciliation.themes
    .filter((theme) => theme.hasContradiction)
    .slice(0, 3)
    .map((theme) => `${theme.label} is contested across sources.`);

  return {
    positives,
    concerns,
    consensusPoints,
    debates,
  };
}

function deriveConfidence(
  reviewCount: number,
  sourceCount: number,
  aiConfidence: ReviewConfidence | null,
  sentiments: Array<ReviewSentiment | null>,
): ReviewConfidence {
  let score = 0;
  if (reviewCount >= 5) score += 2;
  else if (reviewCount >= 3) score += 1;
  if (sourceCount >= 3) score += 2;
  else if (sourceCount >= 2) score += 1;
  if (aiConfidence === "high") score += 1;
  if (aiConfidence === "low") score -= 1;
  if (deriveAgreement(sentiments) === "split") score -= 1;

  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}

function deriveAgreement(sentiments: Array<ReviewSentiment | null>): ReviewIntelligence["agreement"] {
  const positives = sentiments.filter((value) => value === "positive").length;
  const negatives = sentiments.filter((value) => value === "negative").length;
  const mixed = sentiments.filter((value) => value === "mixed").length;
  const total = positives + negatives + mixed;

  if (!total) return "mixed";
  if (positives > 0 && negatives > 0 && Math.abs(positives - negatives) <= 1) return "split";
  if (mixed >= total / 2) return "mixed";
  return "strong";
}

function aiSummarySentimentScore(summary: ReleaseAiReviewSummary) {
  const base = sentimentToScore(summary.overallSentiment);
  if (summary.confidence === "high") return base + 3;
  if (summary.confidence === "low") return base - 3;
  return base;
}

function sentimentToScore(sentiment: ReviewSentiment) {
  if (sentiment === "positive") return 86;
  if (sentiment === "negative") return 48;
  return 69;
}

function weightedAverage(values: Array<{ value: number; weight: number }>) {
  if (!values.length) {
    return null;
  }

  const weightedSum = values.reduce((sum, entry) => sum + entry.value * entry.weight, 0);
  const totalWeight = values.reduce((sum, entry) => sum + entry.weight, 0);
  return totalWeight ? weightedSum / totalWeight : null;
}

function buildChooserGuidance(row: ComparisonRow) {
  const cues = [
    row.aiReviewSummary?.bestFor[0],
    row.usageSummary,
    row.isPlated ? "Better fit for runners prioritizing a plated feel." : "Safer fit for runners avoiding plated ride dynamics.",
  ].filter(Boolean);

  return `Choose ${row.brand} ${row.release} if ${cues[0] ? lowerCaseFirst(cues[0] as string) : `you want a ${row.category.toLowerCase()} option`}`;
}

function buildComparisonDifferences(
  rows: ComparisonRow[],
  confidenceState: ReturnType<typeof assessComparisonConfidence>,
): ComparisonInsight[] {
  const insights: ComparisonInsight[] = [];

  const byPrice = rows.filter((row) => row.priceUsd !== null).sort((left, right) => (left.priceUsd ?? 0) - (right.priceUsd ?? 0));
  if (byPrice.length >= 2 && (byPrice.at(-1)?.priceUsd ?? 0) - (byPrice[0]?.priceUsd ?? 0) >= 20) {
    insights.push({
      title: "Price spread",
      summary: `${byPrice[0]?.brand} ${byPrice[0]?.release} is the cheaper option, while ${byPrice.at(-1)?.brand} ${byPrice.at(-1)?.release} sits at the top of the price range.`,
      evidence: byPrice.map((row) => `${row.brand} ${row.release}: ${row.priceUsd ? `$${row.priceUsd}` : "Pending"}`),
    });
  }

  const byWeight = rows.filter((row) => row.weightOz !== null).sort((left, right) => (left.weightOz ?? 0) - (right.weightOz ?? 0));
  if (byWeight.length >= 2 && (byWeight.at(-1)?.weightOz ?? 0) - (byWeight[0]?.weightOz ?? 0) >= 0.5) {
    insights.push({
      title: "Weight",
      summary: `${byWeight[0]?.brand} ${byWeight[0]?.release} is meaningfully lighter than ${byWeight.at(-1)?.brand} ${byWeight.at(-1)?.release}.`,
      evidence: byWeight.map((row) => `${row.brand} ${row.release}: ${row.weightOz} oz`),
    });
  }

  const plateGroups = uniq(rows.map((row) => String(row.isPlated)));
  if (plateGroups.length > 1) {
    const plated = rows.filter((row) => row.isPlated).map((row) => `${row.brand} ${row.release}`);
    const nonPlated = rows.filter((row) => !row.isPlated).map((row) => `${row.brand} ${row.release}`);
    insights.push({
      title: "Ride construction",
      summary: plated.length
        ? `${plated.join(", ")} bring plated geometry into the mix, while ${nonPlated.join(", ")} stay non-plated.`
        : "These shoes differ on plated versus non-plated construction.",
      evidence: rows.map((row) => `${row.brand} ${row.release}: ${row.isPlated ? "Plated" : "Non-plated"}`),
    });
  }

  const themeLeaders = confidenceState.allowThemeDifferences
    ? rows
        .map((row) => ({
          row,
          theme: row.reviewReconciliation.topTakeaways[0] ?? row.aiReviewSummary?.pros[0] ?? null,
        }))
        .filter((entry): entry is { row: ComparisonRow; theme: string } => Boolean(entry.theme))
    : [];
  if (themeLeaders.length >= 2) {
    insights.push({
      title: "Review takeaway",
      summary: themeLeaders.map((entry) => `${entry.row.brand} ${entry.row.release}: ${entry.theme}`).join(" "),
      evidence: themeLeaders.map((entry) => `${entry.row.brand} ${entry.row.release}: ${entry.theme}`),
    });
  }

  return insights;
}

function buildSharedSignals(rows: ComparisonRow[]) {
  const shared = new Set<string>();

  for (const row of rows) {
    const candidates = [
      ...(row.aiReviewSummary?.pros ?? []),
      ...(row.reviewReconciliation.topTakeaways ?? []),
    ];

    for (const candidate of candidates) {
      const normalized = normalizeSearchText(candidate);
      if (
        rows.every((other) =>
          [...(other.aiReviewSummary?.pros ?? []), ...(other.reviewReconciliation.topTakeaways ?? [])]
            .map((value) => normalizeSearchText(value))
            .some((value) => value.includes(normalized.split(" ")[0] ?? "")),
        )
      ) {
        shared.add(candidate);
      }
    }
  }

  return [...shared];
}

function lowerCaseFirst(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function slugifyRelease(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatUsd(value: string | null) {
  return value ? `$${Number(value)}` : "unknown";
}

function formatOz(value: string | null) {
  return value ? `${Number(value)} oz` : "unknown";
}

function formatStack(heel: number | null, forefoot: number | null) {
  if (heel && forefoot) {
    return `${heel}/${forefoot} mm`;
  }

  return "unknown";
}

function formatMm(value: number | null) {
  return value ? `${value} mm` : "unknown";
}

function canCompareReviewShift(
  previousSummary: ShoeDetail["aiReviewSummary"],
  currentSummary: ShoeDetail["aiReviewSummary"],
 ) {
  if (!previousSummary || !currentSummary) {
    return false;
  }

  return (
    previousSummary.reviewCount >= 2 &&
    currentSummary.reviewCount >= 2 &&
    previousSummary.sourceCount >= 1 &&
    currentSummary.sourceCount >= 1
  );
}

function describeSentimentShift(
  previousSummary: NonNullable<ShoeDetail["aiReviewSummary"]>,
  currentSummary: NonNullable<ShoeDetail["aiReviewSummary"]>,
) {
  if (previousSummary.overallSentiment === currentSummary.overallSentiment) {
    return null;
  }

  return `Overall review sentiment shifted from ${previousSummary.overallSentiment} to ${currentSummary.overallSentiment}.`;
}

function describeListShift(previous: string[], current: string[], prefix: string) {
  const previousLead = previous[0];
  const currentLead = current[0];

  if (!previousLead || !currentLead || previousLead === currentLead) {
    return null;
  }

  return `${prefix} “${previousLead}” to “${currentLead}”.`;
}

function assessComparisonConfidence(rows: ComparisonRow[]) {
  const rowsWithStrongSignal = rows.filter((row) => hasComparableNarrativeSignal(row));
  const hasEnoughRows = rowsWithStrongSignal.length >= 2;
  const totalEvidence = rows.reduce(
    (sum, row) => sum + (row.aiReviewSummary?.evidence.length ?? 0) + row.reviewReconciliation.themes.length,
    0,
  );

  if (!hasEnoughRows) {
    return {
      allowThemeDifferences: false,
      allowSharedSignals: false,
      caution: "Review evidence is still thin for at least one of these shoes, so comparison guidance is limited to harder spec differences.",
    };
  }

  if (totalEvidence < 6) {
    return {
      allowThemeDifferences: true,
      allowSharedSignals: false,
      caution: "The review-derived comparison signal is still developing, so shared themes are suppressed until more evidence is indexed.",
    };
  }

  return {
    allowThemeDifferences: true,
    allowSharedSignals: true,
    caution: null,
  };
}

function hasComparableNarrativeSignal(row: ComparisonRow) {
  const sourceCount = row.aiReviewSummary?.sourceCount ?? 0;
  const reviewCount = row.aiReviewSummary?.reviewCount ?? 0;
  const evidenceCount = row.aiReviewSummary?.evidence.length ?? 0;

  return sourceCount >= 2 || reviewCount >= 2 || evidenceCount >= 2;
}

function filterCatalog(shoes: CatalogCard[], filters: CatalogFilters) {
  return shoes.filter((shoe) => {
    const q = filters.q?.trim().toLowerCase();
    if (q) {
      const haystack = `${shoe.brand} ${shoe.model} ${shoe.release} ${shoe.usageSummary ?? ""} ${
        shoe.rideProfile
      } ${shoe.foam ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.brand && shoe.brand !== filters.brand) return false;
    if (!matchesMinMax(shoe.releaseYear, filters.minReleaseYear, filters.maxReleaseYear)) return false;
    if (filters.category && shoe.category !== filters.category) return false;
    if (filters.terrain && shoe.terrain !== filters.terrain) return false;
    if (filters.stability && shoe.stability !== filters.stability) return false;
    if (filters.plated === "plated" && !shoe.isPlated) return false;
    if (filters.plated === "non-plated" && shoe.isPlated) return false;
    if (filters.current === "current" && !shoe.isCurrent) return false;

    if (!matchesMinMax(shoe.priceUsd, filters.minPrice, filters.maxPrice)) return false;
    if (!matchesMinMax(shoe.weightOz, filters.minWeight, filters.maxWeight)) return false;
    if (!matchesCushionLevel(shoe, filters.cushionLevel)) return false;
    if (!matchesMinMax(shoe.heelStackMm, filters.minHeelStack, filters.maxHeelStack)) return false;
    if (!matchesMinMax(shoe.forefootStackMm, filters.minForefootStack, filters.maxForefootStack)) return false;
    if (!matchesMinMax(shoe.dropMm, filters.minDrop, filters.maxDrop)) return false;

    const minReviewScore = parseNumber(filters.minReviewScore);
    if (minReviewScore !== null && (shoe.reviewScore ?? -1) < minReviewScore) return false;

    const minReviewCount = parseNumber(filters.minReviewCount);
    if (minReviewCount !== null && shoe.reviewCount < minReviewCount) return false;

    return true;
  });
}

function sortCatalog(shoes: CatalogCard[], filters: CatalogFilters) {
  const q = filters.q?.trim();
  const { sortKey, direction } = resolveCatalogSort(filters, q);

  const sorted = [...shoes].sort((left, right) => {
    if (sortKey === "relevance") {
      const delta = compareRelevance(left, right, q ?? "");
      if (delta !== 0) return delta;
      return compareLatest(left, right);
    }

    let delta = 0;
    switch (sortKey) {
      case "brand":
        delta = compareString(left.brand, right.brand) || compareString(left.model, right.model);
        break;
      case "price":
        delta = compareNullableNumber(left.priceUsd, right.priceUsd);
        break;
      case "release-year":
        delta = compareNullableNumber(left.releaseYear, right.releaseYear);
        break;
      case "weight":
        delta = compareNullableNumber(left.weightOz, right.weightOz);
        break;
      case "heel-stack":
        delta = compareNullableNumber(left.heelStackMm, right.heelStackMm);
        break;
      case "forefoot-stack":
        delta = compareNullableNumber(left.forefootStackMm, right.forefootStackMm);
        break;
      case "drop":
        delta = compareNullableNumber(left.dropMm, right.dropMm);
        break;
      case "review-score":
        delta = compareNullableNumber(left.reviewScore, right.reviewScore);
        break;
      case "review-count":
        delta = left.reviewCount - right.reviewCount;
        break;
      case "latest":
      default:
        delta = compareLatest(left, right);
        break;
    }

    if (delta === 0) {
      delta = compareString(left.brand, right.brand) || compareString(left.release, right.release);
    }

    return direction === "asc" ? delta : -delta;
  });

  return sorted;
}

function buildActiveFilterChips(filters: CatalogFilters) {
  const chips: Array<{ key: string; label: string; value: string }> = [];
  const pushIfValue = (key: string, label: string, value?: string) => {
    if (value && value.trim()) {
      chips.push({ key, label, value });
    }
  };

  pushIfValue("q", "Search", filters.q);
  pushIfValue("brand", "Brand", filters.brand);
  pushRangeChip(chips, "release-year", "Release year", filters.minReleaseYear, filters.maxReleaseYear);
  pushIfValue("category", "Category", filters.category);
  pushIfValue("terrain", "Terrain", filters.terrain);
  pushIfValue("stability", "Stability", filters.stability);
  pushIfValue("plated", "Plate", filters.plated);
  if (filters.current === "current") chips.push({ key: "current", label: "Current", value: "Only current models" });
  pushRangeChip(chips, "price", "Price", filters.minPrice, filters.maxPrice, "$");
  pushRangeChip(chips, "weight", "Weight", filters.minWeight, filters.maxWeight, "", " oz");
  pushIfValue("cushionLevel", "Cushion", filters.cushionLevel ? capitalize(filters.cushionLevel) : "");
  pushRangeChip(chips, "heel-stack", "Heel stack", filters.minHeelStack, filters.maxHeelStack, "", " mm");
  pushRangeChip(
    chips,
    "forefoot-stack",
    "Forefoot stack",
    filters.minForefootStack,
    filters.maxForefootStack,
    "",
    " mm",
  );
  pushRangeChip(chips, "drop", "Drop", filters.minDrop, filters.maxDrop, "", " mm");
  pushIfValue("minReviewScore", "Min review score", filters.minReviewScore ? `${filters.minReviewScore}+` : "");
  pushIfValue("minReviewCount", "Min reviews", filters.minReviewCount ? `${filters.minReviewCount}+` : "");

  return chips;
}

function resolveCatalogSort(filters: CatalogFilters, q?: string) {
  const requestedSort = filters.sort ?? (q ? "relevance" : "latest");

  switch (requestedSort) {
    case "oldest":
      return { sortKey: "latest", direction: "asc" as const };
    case "brand-a-z":
      return { sortKey: "brand", direction: "asc" as const };
    case "price-low":
      return { sortKey: "price", direction: "asc" as const };
    case "price-high":
      return { sortKey: "price", direction: "desc" as const };
    case "weight-light":
      return { sortKey: "weight", direction: "asc" as const };
    case "weight-heavy":
      return { sortKey: "weight", direction: "desc" as const };
    case "drop-low":
      return { sortKey: "drop", direction: "asc" as const };
    case "drop-high":
      return { sortKey: "drop", direction: "desc" as const };
    case "review-score":
      return { sortKey: "review-score", direction: "desc" as const };
    case "most-reviewed":
      return { sortKey: "review-count", direction: "desc" as const };
    default:
      return {
        sortKey: requestedSort,
        direction:
          filters.direction ??
          (requestedSort === "brand" || requestedSort === "category" ? "asc" : "desc"),
      };
  }
}

function matchesCushionLevel(shoe: CatalogCard, cushionLevel?: string) {
  if (!cushionLevel?.trim()) return true;

  const stack = shoe.heelStackMm ?? shoe.forefootStackMm;
  if (stack === null) return false;

  switch (cushionLevel) {
    case "low":
      return stack <= 29;
    case "moderate":
      return stack >= 30 && stack <= 35;
    case "max":
      return stack >= 36;
    default:
      return true;
  }
}

function pushRangeChip(
  chips: Array<{ key: string; label: string; value: string }>,
  key: string,
  label: string,
  min?: string,
  max?: string,
  prefix = "",
  suffix = "",
) {
  if (!min && !max) return;
  if (min && max) {
    chips.push({ key, label, value: `${prefix}${min}${suffix} - ${prefix}${max}${suffix}` });
    return;
  }
  if (min) {
    chips.push({ key, label, value: `>= ${prefix}${min}${suffix}` });
    return;
  }
  chips.push({ key, label, value: `<= ${prefix}${max}${suffix}` });
}

function compareLatest(left: CatalogCard, right: CatalogCard) {
  if (left.isCurrent !== right.isCurrent) {
    return Number(left.isCurrent) - Number(right.isCurrent);
  }

  return (left.releaseYear ?? 0) - (right.releaseYear ?? 0);
}

function compareRelevance(left: CatalogCard, right: CatalogCard, query: string) {
  const normalized = query.toLowerCase();
  const score = (shoe: CatalogCard) => {
    let total = 0;
    const exactRelease = `${shoe.brand} ${shoe.release}`.toLowerCase();
    const family = `${shoe.brand} ${shoe.model}`.toLowerCase();
    const haystack = `${family} ${exactRelease} ${shoe.usageSummary ?? ""} ${shoe.rideProfile}`.toLowerCase();
    if (exactRelease.includes(normalized)) total += 5;
    if (family.includes(normalized)) total += 4;
    if (haystack.includes(normalized)) total += 2;
    if (shoe.isCurrent) total += 1;
    return total;
  };

  return score(left) - score(right);
}

function matchesMinMax(value: number | null, min?: string, max?: string) {
  const minValue = parseNumber(min);
  const maxValue = parseNumber(max);

  if (minValue === null && maxValue === null) {
    return true;
  }

  if (value === null) {
    return false;
  }

  if (minValue !== null && value < minValue) return false;
  if (maxValue !== null && value > maxValue) return false;
  return true;
}

function parseNumber(value?: string) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareNullableNumber(left: number | null, right: number | null) {
  if (left === null && right === null) return 0;
  if (left === null) return -1;
  if (right === null) return 1;
  return left - right;
}

function compareString(left: string, right: string) {
  return left.localeCompare(right);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function uniq(values: string[]) {
  return [...new Set(values)];
}
