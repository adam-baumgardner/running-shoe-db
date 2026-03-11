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
}

export async function getCatalogCards(): Promise<CatalogCard[]> {
  if (!process.env.DATABASE_URL) {
    return fallbackShoes.map((shoe, index) => ({
      id: `fallback-${index}`,
      brand: shoe.brand,
      model: shoe.name,
      release: shoe.name,
      slug: `${shoe.brand}-${shoe.name}`.toLowerCase().replaceAll(" ", "-"),
      category: shoe.category,
      rideProfile: shoe.rideProfile,
      usageSummary: shoe.category,
      weightOz: shoe.weightOz,
      dropMm: shoe.dropMm,
      reviewCount: 0,
    }));
  }

  const db = getDb();
  const rows = await db
    .select({
      id: shoeReleases.id,
      brand: brands.name,
      model: shoes.name,
      release: shoeReleases.versionName,
      slug: shoes.slug,
      category: shoes.category,
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

  return rows.map((row) => ({
    id: row.id,
    brand: row.brand,
    model: row.model,
    release: row.release,
    slug: row.slug,
    category: humanizeCategory(row.category),
    rideProfile: buildRideProfile(row.foam, row.isPlated),
    usageSummary: row.usageSummary,
    weightOz: row.weightOzMen ? Number(row.weightOzMen) : null,
    dropMm: row.dropMm,
    reviewCount: Number(row.reviewCount),
  }));
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
