import { featuredShoe, homepageSections } from "@/lib/data";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Foundation rebuild</p>
        <h1>Running shoe comparison built around specs, reviews, and buyer context.</h1>
        <p className="hero-copy">
          The first release will focus on a clean catalog, high-signal filters, source-backed
          reviews, and side-by-side comparison for road and trail runners.
        </p>
        <div className="hero-card">
          <p className="hero-card-label">Featured prototype entry</p>
          <h2>
            {featuredShoe.brand} {featuredShoe.name}
          </h2>
          <dl>
            <div>
              <dt>Category</dt>
              <dd>{featuredShoe.category}</dd>
            </div>
            <div>
              <dt>Ride</dt>
              <dd>{featuredShoe.rideProfile}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{featuredShoe.weightOz} oz</dd>
            </div>
            <div>
              <dt>Drop</dt>
              <dd>{featuredShoe.dropMm} mm</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="section-grid" aria-label="Initial product pillars">
        {homepageSections.map((section) => (
          <article key={section.title} className="feature-panel">
            <p className="feature-kicker">{section.kicker}</p>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
