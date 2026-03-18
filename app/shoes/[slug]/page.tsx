import { notFound } from "next/navigation";
import { getShoeParentPageData } from "@/lib/server/catalog";

interface ShoeDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ShoeDetailPage({ params }: ShoeDetailPageProps) {
  const { slug } = await params;
  const shoe = await getShoeParentPageData(slug);

  if (!shoe) {
    notFound();
  }

  const latestRelease = shoe.releases[0];
  const latestReleaseHref = latestRelease
    ? `/shoes/${shoe.slug}/${latestRelease.releaseSlug}`
    : `/shoes/${shoe.slug}`;

  return (
    <main className="page-shell detail-shell">
      <section className="hero hero--single">
        <div>
          <p className="eyebrow">{shoe.category}</p>
          <h1>
            {shoe.brand} {shoe.model}
          </h1>
          <p className="hero-copy">{shoe.usageSummary ?? `${shoe.terrain} ${shoe.stability}`}</p>
          <div className="detail-chip-row">
            <span className="pill">{shoe.terrain}</span>
            <span className="pill">{shoe.stability}</span>
            <span className="pill">{shoe.releases.length} releases</span>
          </div>
        </div>
      </section>

      <section className="detail-panel detail-panel--hero-summary">
        <div className="detail-panel-heading">
          <div>
            <p className="feature-kicker">Latest Release</p>
            <h2>{shoe.featuredRelease.release}</h2>
          </div>
          <div className="card-actions">
            <a className="text-link text-link--cta" href={latestReleaseHref}>
              Open latest release
            </a>
            <a className="text-link" href={`/compare?release=${shoe.featuredRelease.id}`}>
              Compare latest release
            </a>
          </div>
        </div>
        <p className="catalog-copy">
          {shoe.featuredRelease.aiReviewSummary?.overview ?? shoe.featuredRelease.reviewCoverage.summary}
        </p>
        <dl className="spec-grid spec-grid--wide">
          <div>
            <dt>Release year</dt>
            <dd>{shoe.featuredRelease.releaseYear ?? "Pending"}</dd>
          </div>
          <div>
            <dt>MSRP</dt>
            <dd>{shoe.featuredRelease.priceUsd ? `$${shoe.featuredRelease.priceUsd}` : "Pending"}</dd>
          </div>
          <div>
            <dt>Weight</dt>
            <dd>{shoe.featuredRelease.weightOz ? `${shoe.featuredRelease.weightOz} oz` : "Pending"}</dd>
          </div>
          <div>
            <dt>Heel stack</dt>
            <dd>{shoe.featuredRelease.heelStackMm ? `${shoe.featuredRelease.heelStackMm} mm` : "Pending"}</dd>
          </div>
          <div>
            <dt>Forefoot stack</dt>
            <dd>
              {shoe.featuredRelease.forefootStackMm ? `${shoe.featuredRelease.forefootStackMm} mm` : "Pending"}
            </dd>
          </div>
          <div>
            <dt>Drop</dt>
            <dd>{shoe.featuredRelease.dropMm ? `${shoe.featuredRelease.dropMm} mm` : "Pending"}</dd>
          </div>
          <div>
            <dt>Plate</dt>
            <dd>{shoe.featuredRelease.isPlated ? "Plated" : "Non-plated"}</dd>
          </div>
          <div>
            <dt>Review score</dt>
            <dd>
              {shoe.featuredRelease.reviewScore ? `${shoe.featuredRelease.reviewScore}/100` : "Pending"}
            </dd>
          </div>
          <div>
            <dt>Sentiment signal</dt>
            <dd>
              {shoe.featuredRelease.reviewIntelligence.sentimentScore
                ? `${shoe.featuredRelease.reviewIntelligence.sentimentScore}/100`
                : "Pending"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="detail-grid detail-grid--two">
        <article className="detail-panel">
          <p className="feature-kicker">Latest Release Summary</p>
          <h2>What stands out right now</h2>
          <p>{shoe.featuredRelease.aiReviewSummary?.overview ?? shoe.featuredRelease.reviewIntelligence.summary}</p>
          <p className="detail-muted">{shoe.featuredRelease.reviewIntelligence.summary}</p>
          {shoe.featuredRelease.reviewIntelligence.buyerSignal ? (
            <p className="catalog-copy">{shoe.featuredRelease.reviewIntelligence.buyerSignal}</p>
          ) : null}
          <div className="detail-chip-row">
            <span className="pill">{shoe.featuredRelease.reviewCoverage.sourceCount} sources</span>
            <span className="pill">{shoe.featuredRelease.reviewCoverage.reviewCount} reviews</span>
            {shoe.featuredRelease.reviewCoverage.freshestReviewDate ? (
              <span className="pill">
                Latest review: {shoe.featuredRelease.reviewCoverage.freshestReviewDate}
              </span>
            ) : null}
          </div>
          {shoe.featuredRelease.reviewReconciliation.topTakeaways.length ? (
            <div className="detail-chip-row">
              {shoe.featuredRelease.reviewReconciliation.topTakeaways.map((takeaway) => (
                <span className="pill" key={takeaway}>
                  {takeaway}
                </span>
              ))}
            </div>
          ) : null}
          <div className="detail-chip-row">
            <span className="pill">
              Editorial: {shoe.featuredRelease.reviewIntelligence.editorialSentiment ?? "pending"}
            </span>
            <span className="pill">
              Community: {shoe.featuredRelease.reviewIntelligence.communitySentiment ?? "pending"}
            </span>
            <span className="pill">
              Alignment: {shoe.featuredRelease.reviewIntelligence.sourceAlignment}
            </span>
          </div>
          {shoe.featuredRelease.reviewIntelligence.debates.length ? (
            <div className="detail-chip-row">
              {shoe.featuredRelease.reviewIntelligence.debates.map((debate) => (
                <span className="pill" key={debate}>
                  {debate}
                </span>
              ))}
            </div>
          ) : null}
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Past Releases</p>
          <h2>See how this shoe line changed</h2>
          <div className="release-list">
            {shoe.releases.map((release, index) => (
              <details className="release-list-item" key={release.id} open={index === 0}>
                <summary>
                  <span>
                    <strong>{release.release}</strong>
                    <span className="detail-muted">
                      {release.releaseYear ?? "Pending year"} ·{" "}
                      {release.priceUsd ? `$${release.priceUsd}` : "Pending MSRP"}
                    </span>
                  </span>
                  <span className="pill">{index === 0 ? "Latest release" : "Past release"}</span>
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
                      Open release
                    </a>
                    <a className="text-link" href={`/compare?release=${release.id}`}>
                      Compare release
                    </a>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">What Changed</p>
          <h2>Release-to-release changes</h2>
          <div className="review-list">
            {shoe.releaseChanges.map((change) => (
              <article key={change.releaseSlug} className="review-card">
                <div className="catalog-card-topline">
                  <span className="pill">{change.release}</span>
                  {change.previousRelease ? <span className="pill">vs {change.previousRelease}</span> : null}
                </div>
                <h3>{change.release}</h3>
                <div className="detail-chip-row">
                  {change.changes.map((item) => (
                    <span className="pill" key={item}>
                      {item}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
