import { and, count, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { shoes as fallbackShoes } from "@/lib/data";
import { brands, reviews, shoeReleases, shoes, shoeSpecs } from "@/db/schema";

export interface CatalogCard {
  id: string;
  brand: string;
  model: string;
  release: string;
  slug: string;
  category: string;
  rideProfile: string;
  usageSummary: string | null;
  weightOz: number | null;
  dropMm: number | null;
  reviewCount: number;
  terrain?: string;
  stability?: string;
  isPlated?: boolean;
}

export interface CatalogFilters {
  q?: string;
  category?: string;
  terrain?: string;
  stability?: string;
  plated?: string;
}

export interface CatalogPageData {
  shoes: CatalogCard[];
  filterOptions: {
    categories: string[];
    terrains: string[];
    stabilities: string[];
  };
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
  reviewCount: number;
}

export async function getCatalogPageData(filters: CatalogFilters = {}): Promise<CatalogPageData> {
  const shoes = await getCatalogCards(filters);
  const allShoes = await getCatalogCards();

  return {
    shoes,
    filterOptions: {
      categories: uniq(allShoes.map((shoe) => shoe.category)),
      terrains: uniq(allShoes.map((shoe) => shoe.terrain ?? "Unknown")),
      stabilities: uniq(allShoes.map((shoe) => shoe.stability ?? "Unknown")),
    },
  };
}

export async function getCatalogCards(filters: CatalogFilters = {}): Promise<CatalogCard[]> {
  if (!process.env.DATABASE_URL) {
    return filterFallbackCatalog(buildFallbackCatalog(), filters);
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
        isPlated: shoeReleases.isPlated,
        foam: shoeReleases.foam,
        weightOzMen: shoeSpecs.weightOzMen,
        dropMm: shoeSpecs.dropMm,
        reviewCount: count(reviews.id),
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
        shoes.category,
        shoes.usageSummary,
        shoeReleases.versionName,
        shoeReleases.isPlated,
        shoeReleases.foam,
        shoeSpecs.weightOzMen,
        shoeSpecs.dropMm
      )
      .orderBy(desc(shoeReleases.releaseYear), brands.name, shoes.name);

    const parsedRows = rows.map((row) => ({
      id: row.id,
      brand: row.brand,
      model: row.model,
      release: row.release,
        slug: row.slug,
        category: humanizeCategory(row.category),
        terrain: humanizeCategory(row.terrain),
        stability: capitalize(row.stability),
        rideProfile: buildRideProfile(row.foam, row.isPlated),
        usageSummary: row.usageSummary,
        weightOz: row.weightOzMen ? Number(row.weightOzMen) : null,
        dropMm: row.dropMm,
      reviewCount: Number(row.reviewCount),
      isPlated: row.isPlated,
    }));

    return filterFallbackCatalog(parsedRows, filters);
  } catch {
    return filterFallbackCatalog(buildFallbackCatalog(), filters);
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
      weightOz: row.weightOzMen ? Number(row.weightOzMen) : null,
      heelStackMm: row.heelStackMm,
      forefootStackMm: row.forefootStackMm,
      dropMm: row.dropMm,
      fitNotes: row.fitNotes,
      sourceNotes: row.sourceNotes,
      reviewCount: Number(row.reviewCount),
    };
  } catch {
    return buildFallbackDetail(slug);
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

function buildFallbackCatalog(): CatalogCard[] {
  return fallbackShoes.map((shoe, index) => ({
    id: `fallback-${index}`,
    brand: shoe.brand,
    model: shoe.name,
    release: shoe.name,
    slug: `${shoe.brand}-${shoe.name}`.toLowerCase().replaceAll(" ", "-"),
    category: shoe.category,
    terrain: "Road",
    stability: "Neutral",
    rideProfile: shoe.rideProfile,
    usageSummary: shoe.category,
    weightOz: shoe.weightOz,
    dropMm: shoe.dropMm,
    reviewCount: 0,
    isPlated: false,
  }));
}

function buildFallbackDetail(slug: string): ShoeDetail | null {
  const match = buildFallbackCatalog().find((shoe) => shoe.slug === slug);
  if (!match) return null;

  return {
    id: match.id,
    brand: match.brand,
    model: match.model,
    release: match.release,
    slug: match.slug,
    category: match.category,
    terrain: match.terrain ?? "Road",
    stability: match.stability ?? "Neutral",
    usageSummary: match.usageSummary,
    rideProfile: match.rideProfile,
    notes: "Prototype seed entry while the production catalog is expanding.",
    priceUsd: 140,
    releaseYear: 2024,
    isCurrent: true,
    isPlated: false,
    foam: "Responsive foam",
    weightOz: match.weightOz,
    heelStackMm: match.dropMm ? match.dropMm + 27 : null,
    forefootStackMm: 27,
    dropMm: match.dropMm,
    fitNotes: "Neutral fit profile with moderate forefoot room.",
    sourceNotes: "Fallback data from the design seed set.",
    reviewCount: match.reviewCount,
  };
}

function filterFallbackCatalog(shoes: CatalogCard[], filters: CatalogFilters) {
  return shoes.filter((shoe) => {
    const q = filters.q?.trim().toLowerCase();
    if (q) {
      const haystack = `${shoe.brand} ${shoe.model} ${shoe.release} ${shoe.usageSummary ?? ""}`
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (filters.category && shoe.category !== filters.category) return false;
    if (filters.terrain && shoe.terrain !== filters.terrain) return false;
    if (filters.stability && shoe.stability !== filters.stability) return false;
    if (filters.plated === "plated" && !shoe.isPlated) return false;
    if (filters.plated === "non-plated" && shoe.isPlated) return false;

    return true;
  });
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function uniq(values: string[]) {
  return [...new Set(values)];
}
