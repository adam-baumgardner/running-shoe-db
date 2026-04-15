import { CatalogFilterBar } from "@/components/catalog-filter-bar";
import { ShoeCard } from "@/components/shoe-card";
import { getCatalogPageData } from "@/lib/server/catalog";

interface ShoesPageProps {
  searchParams: Promise<{
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
  }>;
}

export default async function ShoesPage({ searchParams }: ShoesPageProps) {
  const filters = await searchParams;
  const { shoes, filterOptions, activeFilters } = await getCatalogPageData(filters);

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Compare shoes by scanning the data that matters.</h1>
          <p className="hero-copy">
            Sort and filter by specs, pricing, review signal, and release status without leaving the
            main catalog view.
          </p>
        </div>
      </section>

      <CatalogFilterBar filters={filters} options={filterOptions} activeFilters={activeFilters} />

      <section className="catalog-meta">
        <p>{shoes.length} shoes match the current view.</p>
      </section>

      <section className="catalog-list" aria-label="Catalog results">
        {shoes.map((shoe) => (
          <ShoeCard key={shoe.id} shoe={shoe} />
        ))}
      </section>
    </main>
  );
}
