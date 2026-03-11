import { shoes } from "@/lib/data";

export default function ShoesPage() {
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
          <article key={`${shoe.brand}-${shoe.name}`} className="feature-panel">
            <p className="feature-kicker">{shoe.category}</p>
            <h2>
              {shoe.brand} {shoe.name}
            </h2>
            <p>
              {shoe.rideProfile}. {shoe.weightOz} oz, {shoe.dropMm} mm drop.
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
