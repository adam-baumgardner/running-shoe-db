import { featuredShoe, homepageSections } from "@/lib/data";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Review checkpoint</p>
        <h1>Running shoe research built around releases, reviews, and real buying context.</h1>
        <p className="hero-copy">
          Stride Stack now has release-aware catalog pages, source-backed review aggregation, AI
          summaries, multi-source comparison, and internal editorial tooling for ingestion and
          moderation. The next phase is stabilization, polish, and deployment hardening.
        </p>
        <div className="hero-card">
          <p className="hero-card-label">Featured release</p>
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
