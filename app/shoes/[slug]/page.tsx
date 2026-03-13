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
          <p className="feature-kicker">Consensus</p>
          <h2>Cross-source review summary</h2>
          <p>
            Built from {shoe.reviewSignalSummary.sourceCount} sources and {shoe.reviewCount} approved
            reviews for this release.
          </p>
          <p className="detail-muted">
            Weighted consensus: {shoe.reviewSignalSummary.dominantSentiment ?? "unresolved"}.
          </p>
          <div className="detail-chip-row">
            {shoe.reviewSignalSummary.topHighlights.length ? (
              shoe.reviewSignalSummary.topHighlights.map((highlight) => (
                <span className="pill" key={highlight.label}>
                  {highlight.label} x{highlight.count}
                </span>
              ))
            ) : (
              <span className="pill">No common highlights yet</span>
            )}
          </div>
          <p className="detail-muted">
            Sentiment: {shoe.reviewSignalSummary.sentimentBreakdown.positive} positive,{" "}
            {shoe.reviewSignalSummary.sentimentBreakdown.mixed} mixed,{" "}
            {shoe.reviewSignalSummary.sentimentBreakdown.negative} negative.
          </p>
          <p className="detail-muted">
            Weighted signal: {shoe.reviewSignalSummary.weightedSentiment.positive} positive,{" "}
            {shoe.reviewSignalSummary.weightedSentiment.mixed} mixed,{" "}
            {shoe.reviewSignalSummary.weightedSentiment.negative} negative.
          </p>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Reconciliation</p>
          <h2>Source-agnostic themes</h2>
          <p>
            These themes are reconciled across all approved sources for this release, regardless of
            whether the input came from editorial reviews or community discussion.
          </p>
          {shoe.reviewReconciliation.summaryNote ? (
            <p className="catalog-copy">{shoe.reviewReconciliation.summaryNote}</p>
          ) : null}
          <p className="detail-muted">
            {shoe.reviewReconciliation.contradictionCount} contradiction
            {shoe.reviewReconciliation.contradictionCount === 1 ? "" : "s"} detected across the
            current theme set.
          </p>
          <div className="detail-chip-row">
            {shoe.reviewReconciliation.topTakeaways.length ? (
              shoe.reviewReconciliation.topTakeaways.map((takeaway) => (
                <span className="pill" key={takeaway}>
                  {takeaway}
                </span>
              ))
            ) : (
              <span className="pill">No reconciled takeaways yet</span>
            )}
          </div>
          <div className="review-list">
            {shoe.reviewReconciliation.themes.length ? (
              shoe.reviewReconciliation.themes.map((theme) => (
                <article className="review-card" key={theme.label}>
                  <div className="catalog-card-topline">
                    <span className="pill">{theme.label}</span>
                    <span className="pill">{theme.dominantSentiment}</span>
                    <span className="pill">{theme.confidence} confidence</span>
                    <span className="pill">{theme.sourceCount} sources</span>
                    {theme.hasContradiction ? <span className="pill">contested</span> : null}
                  </div>
                  <p className="catalog-copy">
                    Observed in {theme.reviewCount} approved reviews across {theme.sourceCount}{" "}
                    sources.
                  </p>
                  {theme.evidence.map((evidence) => (
                    <p className="detail-muted" key={`${theme.label}-${evidence.sourceName}`}>
                      {evidence.sourceName} ({evidence.sourceType}): {evidence.excerpt}
                    </p>
                  ))}
                </article>
              ))
            ) : (
              <p className="detail-muted">No reconciled themes yet.</p>
            )}
          </div>
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
