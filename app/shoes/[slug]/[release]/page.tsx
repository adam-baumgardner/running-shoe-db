import { notFound } from "next/navigation";
import { getReleaseDetail, getShoeParentPageData } from "@/lib/server/catalog";

interface ReleaseDetailPageProps {
  params: Promise<{ slug: string; release: string }>;
}

export default async function ReleaseDetailPage({ params }: ReleaseDetailPageProps) {
  const resolvedParams = await params;
  const [shoe, parent] = await Promise.all([
    getReleaseDetail(resolvedParams.slug, resolvedParams.release),
    getShoeParentPageData(resolvedParams.slug),
  ]);

  if (!shoe || !parent) {
    notFound();
  }

  return (
    <main className="page-shell detail-shell">
      <section className="hero hero--single">
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
            <span className="pill">{shoe.reviewCount} reviews</span>
          </div>
        </div>
      </section>

      <section className="detail-panel detail-panel--hero-summary">
        <div className="detail-panel-heading">
          <div>
            <p className="feature-kicker">{shoe.isCurrent ? "Latest Release" : "Past Release"}</p>
            <h2>{shoe.release}</h2>
          </div>
          <div className="card-actions">
            <a className="text-link text-link--cta" href={`/compare?release=${shoe.id}`}>
              Compare this shoe
            </a>
          </div>
        </div>
        <p>{shoe.aiReviewSummary?.overview ?? shoe.reviewCoverage.summary}</p>
          <dl className="spec-grid spec-grid--wide">
          <div>
            <dt>Release year</dt>
            <dd>{shoe.releaseYear ?? "Pending"}</dd>
          </div>
          <div>
            <dt>MSRP</dt>
            <dd>{shoe.priceUsd ? `$${shoe.priceUsd}` : "Pending"}</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{shoe.weightOz ? `${shoe.weightOz} oz` : "Pending"}</dd>
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
            <dt>Drop</dt>
            <dd>{shoe.dropMm ? `${shoe.dropMm} mm` : "Pending"}</dd>
          </div>
          <div>
            <dt>Foam</dt>
            <dd>{shoe.foam ?? "Pending"}</dd>
          </div>
          <div>
            <dt>Review score</dt>
            <dd>{shoe.reviewScore ? `${shoe.reviewScore}/100` : "Pending"}</dd>
          </div>
          <div>
            <dt>Rating signal</dt>
            <dd>{shoe.reviewIntelligence.ratingScore ? `${shoe.reviewIntelligence.ratingScore}/100` : "Pending"}</dd>
          </div>
          <div>
            <dt>Sentiment signal</dt>
            <dd>{shoe.reviewIntelligence.sentimentScore ? `${shoe.reviewIntelligence.sentimentScore}/100` : "Pending"}</dd>
          </div>
        </dl>
      </section>

      <section className="detail-grid detail-grid--two">
        <article className="detail-panel">
          <p className="feature-kicker">AI And Review Summary</p>
          <h2>What reviewers are saying</h2>
          <p>{shoe.aiReviewSummary?.overview ?? shoe.reviewIntelligence.summary}</p>
          <p className="detail-muted">{shoe.reviewIntelligence.summary}</p>
          {shoe.reviewIntelligence.buyerSignal ? (
            <p className="catalog-copy">{shoe.reviewIntelligence.buyerSignal}</p>
          ) : null}
          <div className="detail-chip-row">
            <span className="pill">{shoe.reviewCoverage.sourceCount} sources</span>
            <span className="pill">{shoe.reviewCoverage.reviewCount} reviews</span>
            {shoe.reviewCoverage.freshestReviewDate ? (
              <span className="pill">
                Latest review: {shoe.reviewCoverage.freshestReviewDate}
              </span>
            ) : null}
          </div>
          {shoe.aiReviewSummary ? (
            <dl className="spec-grid">
              <div>
                <dt>Editorial sentiment</dt>
                <dd>{shoe.aiReviewSummary.editorialSentiment ?? "Pending"}</dd>
              </div>
              <div>
                <dt>Community sentiment</dt>
                <dd>{shoe.aiReviewSummary.communitySentiment ?? "Pending"}</dd>
              </div>
              <div>
                <dt>Source alignment</dt>
                <dd>{shoe.aiReviewSummary.sourceAlignment}</dd>
              </div>
              <div>
                <dt>Pros</dt>
                <dd>{shoe.aiReviewSummary.pros.join(" ") || "Pending"}</dd>
              </div>
              <div>
                <dt>Cons</dt>
                <dd>{shoe.aiReviewSummary.cons.join(" ") || "Pending"}</dd>
              </div>
              <div>
                <dt>Best for</dt>
                <dd>{shoe.aiReviewSummary.bestFor.join(" ") || "Pending"}</dd>
              </div>
              <div>
                <dt>Watch-outs</dt>
                <dd>{shoe.aiReviewSummary.watchOuts.join(" ") || "Pending"}</dd>
              </div>
            </dl>
          ) : null}
          {shoe.reviewIntelligence.positives.length || shoe.reviewIntelligence.concerns.length ? (
            <dl className="spec-grid">
              <div>
                <dt>Most common praise</dt>
                <dd>{shoe.reviewIntelligence.positives.join(" ") || "Pending"}</dd>
              </div>
              <div>
                <dt>Most common complaints</dt>
                <dd>{shoe.reviewIntelligence.concerns.join(" ") || "Pending"}</dd>
              </div>
              <div>
                <dt>Editorial read</dt>
                <dd>{shoe.reviewIntelligence.editorialSummary ?? "Pending"}</dd>
              </div>
              <div>
                <dt>Community read</dt>
                <dd>{shoe.reviewIntelligence.communitySummary ?? "Pending"}</dd>
              </div>
              <div>
                <dt>Source alignment</dt>
                <dd>{shoe.reviewIntelligence.sourceAlignment}</dd>
              </div>
            </dl>
          ) : null}
          {shoe.reviewIntelligence.consensusPoints.length ? (
            <div className="detail-chip-row">
              {shoe.reviewIntelligence.consensusPoints.map((item) => (
                <span className="pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {shoe.reviewIntelligence.debates.length ? (
            <div className="detail-chip-row">
              {shoe.reviewIntelligence.debates.map((item) => (
                <span className="pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Past Releases</p>
          <h2>Compare releases in this shoe line</h2>
          <div className="release-list">
            {parent.releases.map((release, index) => (
              <details
                className="release-list-item"
                key={release.id}
                open={index < 2 || release.releaseSlug === resolvedParams.release}
              >
                <summary>
                  <span className="release-list-summary-copy">
                    <strong>{release.release}</strong>
                    <span className="detail-muted release-list-summary-meta">
                      {release.releaseYear ?? "Pending year"} ·{" "}
                      {release.priceUsd ? `$${release.priceUsd}` : "Pending MSRP"}
                    </span>
                  </span>
                  <span className="pill">
                    {release.releaseSlug === resolvedParams.release
                      ? "Latest release"
                      : release.isCurrent
                        ? "Latest release"
                        : "Past release"}
                  </span>
                </summary>
                <div className="release-list-body">
                  <div className="detail-chip-row">
                    {release.changeTeaser.map((item) => (
                      <span className="pill" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                  <p className="detail-muted">
                    {release.reviewCount} reviews ·{" "}
                    {release.reviewScore ? `${release.reviewScore}/100` : "Pending review score"}
                  </p>
                  <div className="card-actions">
                    <a className="text-link" href={`/shoes/${shoe.slug}/${release.releaseSlug}`}>
                      Open shoe
                    </a>
                    <a className="text-link" href={`/compare?release=${release.id}`}>
                      Compare shoe
                    </a>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Fit And Notes</p>
          <h2>What to know before buying</h2>
          {shoe.reviewIntelligence.buyerSignal ? <p>{shoe.reviewIntelligence.buyerSignal}</p> : null}
          {shoe.aiReviewSummary?.bestFor.length ? (
            <div className="detail-chip-row">
              {shoe.aiReviewSummary.bestFor.map((item) => (
                <span className="pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {shoe.aiReviewSummary?.watchOuts.length ? (
            <div className="detail-chip-row">
              {shoe.aiReviewSummary.watchOuts.map((item) => (
                <span className="pill" key={item}>
                  {item}
                </span>
              ))}
            </div>
          ) : null}
          {shoe.fitNotes ? <p>{shoe.fitNotes}</p> : null}
          {shoe.notes ? <p>{shoe.notes}</p> : null}
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Reviews</p>
          <h2>Latest review coverage</h2>
          <div className="review-list">
            {shoe.reviews.map((review) => (
              <article key={review.id} className="review-card">
                <div className="catalog-card-topline">
                  <span className="pill">{review.sourceType}</span>
                  {review.sentiment ? <span className="pill">{review.sentiment}</span> : null}
                  {review.scoreNormalized100 ? <span className="pill">{review.scoreNormalized100}/100</span> : null}
                </div>
                <h3>{review.title ?? "Untitled review"}</h3>
                <p className="catalog-copy">{review.excerpt ?? "Excerpt pending."}</p>
                <a className="text-link" href={review.sourceUrl} target="_blank" rel="noreferrer">
                  Open source review
                </a>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
