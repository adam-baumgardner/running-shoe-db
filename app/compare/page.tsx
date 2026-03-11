const comparisonPrinciples = [
  "Compare by use case before comparing by brand.",
  "Normalize specs so stack, drop, and weight are easy to scan.",
  "Keep review consensus and reviewer disagreement visible.",
];

export default function ComparePage() {
  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Compare</p>
          <h1>Comparison should answer buying questions in minutes.</h1>
          <p className="hero-copy">
            The first comparison flow will focus on two to four shoes at a time, with a layout
            optimized for fit, ride, and intended use rather than raw spec overload.
          </p>
        </div>
      </section>

      <section className="section-grid" aria-label="Comparison principles">
        {comparisonPrinciples.map((principle) => (
          <article key={principle} className="feature-panel">
            <p>{principle}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
