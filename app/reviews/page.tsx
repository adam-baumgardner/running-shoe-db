import { reviewPipeline } from "@/lib/data";

export default function ReviewsPage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Reviews</p>
          <h1>Editorial and community reviews with source context.</h1>
          <p className="hero-copy">
            Reviews will be treated as structured content, not just text blobs. That lets us show
            both sentiment and why reviewers arrived there.
          </p>
        </div>
      </section>

      <section className="section-grid" aria-label="Review pipeline">
        {reviewPipeline.map((step) => (
          <article key={step.title} className="feature-panel">
            <p className="feature-kicker">{step.kicker}</p>
            <h2>{step.title}</h2>
            <p>{step.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
