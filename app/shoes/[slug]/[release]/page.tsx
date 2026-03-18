import { notFound } from "next/navigation";
import Link from "next/link";
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

  const currentReleaseIndex = parent.releases.findIndex(
    (release) => release.releaseSlug === resolvedParams.release,
  );
  const currentReleaseId = currentReleaseIndex >= 0 ? parent.releases[currentReleaseIndex]?.id ?? null : null;
  const newerRelease = currentReleaseIndex > 0 ? parent.releases[currentReleaseIndex - 1] : null;
  const olderRelease =
    currentReleaseIndex >= 0 && currentReleaseIndex < parent.releases.length - 1
      ? parent.releases[currentReleaseIndex + 1]
      : null;

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
            <span className="pill">{shoe.reviewCoverage.status} coverage</span>
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
          <div className="card-actions">
            <Link className="text-link" href={`/shoes/${shoe.slug}`}>
              Back to model page
            </Link>
          </div>
        </aside>
      </section>

      <section className="detail-panel release-rail-panel">
        <p className="feature-kicker">Version Rail</p>
        <h2>Browse releases</h2>
        <div className="release-rail">
          {parent.releases.map((release) => (
            <div
              className={`release-rail-item ${
                release.releaseSlug === resolvedParams.release ? "release-rail-item--active" : ""
              }`}
              key={release.id}
            >
              <a href={`/shoes/${shoe.slug}/${release.releaseSlug}`}>
                <strong>{release.release}</strong>
              </a>
              <span>{release.releaseYear ?? "Pending year"}</span>
              <span>{release.reviewCoverage.status} coverage</span>
              {release.changeTeaser.length ? (
                <p className="detail-muted release-teaser">{release.changeTeaser[0]}</p>
              ) : null}
              <div className="card-actions">
                <a className="text-link" href={`/shoes/${shoe.slug}/${release.releaseSlug}`}>
                  Open
                </a>
                <a className="text-link text-link--cta" href={`/compare?release=${release.id}`}>
                  Compare
                </a>
              </div>
            </div>
          ))}
        </div>
        <div className="card-actions">
          {newerRelease ? (
            <>
              <a className="text-link" href={`/shoes/${shoe.slug}/${newerRelease.releaseSlug}`}>
                Newer: {newerRelease.release}
              </a>
              {currentReleaseId ? (
                <a
                  className="text-link text-link--cta"
                  href={`/compare?release=${currentReleaseId}&release=${newerRelease.id}`}
                >
                  Compare with newer
                </a>
              ) : null}
            </>
          ) : null}
          {olderRelease ? (
            <>
              <a className="text-link" href={`/shoes/${shoe.slug}/${olderRelease.releaseSlug}`}>
                Older: {olderRelease.release}
              </a>
              {currentReleaseId ? (
                <a
                  className="text-link text-link--cta"
                  href={`/compare?release=${currentReleaseId}&release=${olderRelease.id}`}
                >
                  Compare with older
                </a>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      <section className="detail-grid">
        <article className="detail-panel">
          <p className="feature-kicker">Coverage</p>
          <h2>How reliable is the current review set?</h2>
          <p>{shoe.reviewCoverage.summary}</p>
          <div className="detail-chip-row">
            <span className="pill">{shoe.reviewCoverage.sourceCount} sources</span>
            <span className="pill">{shoe.reviewCoverage.reviewCount} reviews</span>
            <span className="pill">
              Freshest review: {shoe.reviewCoverage.freshestReviewDate ?? "Unknown"}
            </span>
          </div>
        </article>

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
          <p className="feature-kicker">AI Summary</p>
          <h2>Aggregated review read</h2>
          {shoe.aiReviewSummary ? (
            <>
              <p>{shoe.aiReviewSummary.overview}</p>
              <div className="detail-chip-row">
                <span className="pill">{shoe.aiReviewSummary.overallSentiment}</span>
                <span className="pill">{shoe.aiReviewSummary.confidence} confidence</span>
                <span className="pill">
                  {shoe.aiReviewSummary.sourceCount} sources / {shoe.aiReviewSummary.reviewCount} reviews
                </span>
                <span className="pill">{shoe.aiReviewSummary.provider}</span>
                {shoe.aiReviewSummary.isEditorialOverride ? (
                  <span className="pill">editorial override</span>
                ) : null}
              </div>
              <dl className="spec-grid">
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
              <p className="detail-muted">
                Generated {shoe.aiReviewSummary.generatedAt.slice(0, 10)}
                {shoe.aiReviewSummary.model ? ` with ${shoe.aiReviewSummary.model}` : ""}
                .
              </p>
            </>
          ) : (
            <p className="detail-muted">No AI summary has been generated for this release yet.</p>
          )}
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
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Reviews</p>
          <h2>Source-backed review signals</h2>
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
