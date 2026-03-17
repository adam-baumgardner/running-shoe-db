import { CatalogFilterBar } from "@/components/catalog-filter-bar";
import { ShoeCard } from "@/components/shoe-card";
import { getCatalogPageData } from "@/lib/server/catalog";

interface ShoesPageProps {
  searchParams: Promise<{
    q?: string;
    category?: string;
    terrain?: string;
    stability?: string;
    plated?: string;
  }>;
}

export default async function ShoesPage({ searchParams }: ShoesPageProps) {
  const filters = await searchParams;
  const { shoes, filterOptions } = await getCatalogPageData(filters);

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Filterable shoes built around buying signals.</h1>
          <p className="hero-copy">
            Search by use case first, then narrow by ride profile, stability, terrain, and plate
            status. This is the first pass at the research workflow.
          </p>
        </div>
      </section>

      <CatalogFilterBar filters={filters} options={filterOptions} />

      <section className="catalog-meta">
        <p>{shoes.length} shoes match the current filters.</p>
      </section>

      <section className="catalog-grid" aria-label="Catalog results">
        {shoes.map((shoe) => (
          <ShoeCard key={shoe.id} shoe={shoe} />
        ))}
      </section>
    </main>
  );
}
