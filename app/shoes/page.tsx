import { getCatalogCards } from "@/lib/server/catalog";

export default async function ShoesPage() {
  const shoes = await getCatalogCards();

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1>Filterable shoes built around buying signals.</h1>
          <p className="hero-copy">
            This section will become the core browse experience: specs, categories, review
            summaries, and comparison entry points.
          </p>
        </div>
      </section>

      <section className="section-grid" aria-label="Seed catalog">
        {shoes.map((shoe) => (
          <article key={shoe.id} className="feature-panel">
            <p className="feature-kicker">{shoe.category}</p>
            <h2>
              {shoe.brand} {shoe.release}
            </h2>
            <p>
              {shoe.rideProfile}.{" "}
              {shoe.weightOz ? `${shoe.weightOz} oz` : "Weight pending"},{" "}
              {shoe.dropMm ? `${shoe.dropMm} mm drop` : "drop pending"}.
            </p>
            <p>{shoe.usageSummary ?? "Usage summary pending."}</p>
            <p>{shoe.reviewCount} approved reviews indexed.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
