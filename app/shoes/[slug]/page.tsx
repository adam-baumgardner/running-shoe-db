import { notFound } from "next/navigation";
import Link from "next/link";
import { getShoeDetail } from "@/lib/server/catalog";

interface ShoeDetailPageProps {
  params: { slug: string };
}

export default async function ShoeDetailPage({ params }: ShoeDetailPageProps) {
  const { slug } = params;
  const shoe = await getShoeDetail(slug);

  if (!shoe) {
    notFound();
  }

  return (
    <main className="page-shell detail-shell">
      <section className="detail-hero">
        <div>
          <p className="eyebrow">{shoe.category}</p>
          <h1>
            {shoe.brand} {shoe.release}
          </h1>
          <p className="hero-copy">{shoe.usageSummary ?? shoe.rideProfile}</p>
          <div className="detail-chip-row">
            <span className="pill">{shoe.terrain}</span>
            <span className="pill">{shoe.stability}</span>
            <span className="pill">{shoe.isPlated ? "Plated" : "Non-plated"}</span>
            <span className="pill">{shoe.reviewCount} reviews indexed</span>
          </div>
        </div>
        <aside className="hero-card">
          <p className="hero-card-label">Snapshot</p>
          <h2>{shoe.rideProfile}</h2>
          <dl>
            <div>
              <dt>MSRP</dt>
              <dd>{shoe.priceUsd ? `$${shoe.priceUsd}` : "Pending"}</dd>
            </div>
            <div>
              <dt>Release</dt>
              <dd>{shoe.releaseYear ?? "Pending"}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{shoe.weightOz ? `${shoe.weightOz} oz` : "Pending"}</dd>
            </div>
            <div>
              <dt>Drop</dt>
              <dd>{shoe.dropMm ? `${shoe.dropMm} mm` : "Pending"}</dd>
            </div>
            <div>
              <dt>Avg review</dt>
              <dd>{shoe.averageReviewScore ? `${Math.round(shoe.averageReviewScore)}/100` : "Pending"}</dd>
            </div>
          </dl>
        </aside>
      </section>

      <section className="detail-grid">
        <article className="detail-panel">
          <p className="feature-kicker">Specifications</p>
          <dl className="spec-grid">
            <div>
              <dt>Foam</dt>
              <dd>{shoe.foam ?? "Pending"}</dd>
            </div>
            <div>
              <dt>Heel stack</dt>
              <dd>{shoe.heelStackMm ? `${shoe.heelStackMm} mm` : "Pending"}</dd>
            </div>
            <div>
              <dt>Forefoot stack</dt>
              <dd>{shoe.forefootStackMm ? `${shoe.forefootStackMm} mm` : "Pending"}</dd>
            </div>
            <div>
              <dt>Current model</dt>
              <dd>{shoe.isCurrent ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Fit And Notes</p>
          <h2>What matters before buying</h2>
          <p>{shoe.fitNotes ?? "Fit notes pending."}</p>
          <p>{shoe.notes ?? "Release notes pending."}</p>
          <p className="detail-muted">{shoe.sourceNotes ?? "Source note pending."}</p>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Reviews</p>
          <h2>Source-backed review signals</h2>
          <p>
            {shoe.reviewCount} approved reviews are currently indexed for this release.
            {shoe.averageReviewScore ? ` Average normalized score: ${Math.round(shoe.averageReviewScore)}/100.` : ""}
          </p>
          <div className="review-list">
            {shoe.reviews.map((review) => (
              <article key={review.id} className="review-card">
                <div className="catalog-card-topline">
                  <span className="pill">{review.sourceType}</span>
                  {review.sentiment ? <span className="pill">{review.sentiment}</span> : null}
                  {review.scoreNormalized100 ? (
                    <span className="pill">{review.scoreNormalized100}/100</span>
                  ) : null}
                </div>
                <h3>{review.title ?? "Untitled review"}</h3>
                <p className="catalog-copy">{review.excerpt ?? "Excerpt pending."}</p>
                {review.highlights.length ? (
                  <div className="detail-chip-row">
                    {review.highlights.map((highlight) => (
                      <span className="pill" key={highlight}>
                        {highlight}
                      </span>
                    ))}
                  </div>
                ) : null}
                <p className="detail-muted">
                  {review.sourceName}
                  {review.authorName ? ` by ${review.authorName}` : ""}
                  {review.publishedAt ? ` • ${review.publishedAt}` : ""}
                </p>
                <a className="text-link" href={review.sourceUrl} target="_blank" rel="noreferrer">
                  Open source review
                </a>
              </article>
            ))}
          </div>
          {shoe.reviewCount === 0 ? <p className="detail-muted">No approved reviews yet.</p> : null}
          <div className="card-actions">
            <Link className="text-link" href={`/compare?shoe=${shoe.slug}`}>
              Compare this shoe
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
