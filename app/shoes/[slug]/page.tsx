import { notFound } from "next/navigation";
import { getShoeParentPageData } from "@/lib/server/catalog";

interface ShoeDetailPageProps {
  params: { slug: string };
}

export default async function ShoeDetailPage({ params }: ShoeDetailPageProps) {
  const { slug } = params;
  const shoe = await getShoeParentPageData(slug);

  if (!shoe) {
    notFound();
  }

  const featuredReleaseHref = `/shoes/${shoe.slug}/${shoe.releases[0]?.releaseSlug ?? slug}`;

  return (
    <main className="page-shell detail-shell">
      <section className="detail-hero">
        <div>
          <p className="eyebrow">{shoe.category}</p>
          <h1>
            {shoe.brand} {shoe.model}
          </h1>
          <p className="hero-copy">{shoe.usageSummary ?? `${shoe.terrain} ${shoe.stability}`}</p>
          <div className="detail-chip-row">
            <span className="pill">{shoe.terrain}</span>
            <span className="pill">{shoe.stability}</span>
            <span className="pill">{shoe.releases.length} tracked releases</span>
            <span className="pill">{shoe.featuredRelease.reviewCoverage.status} latest coverage</span>
          </div>
        </div>
        <aside className="hero-card">
          <p className="hero-card-label">Featured Release</p>
          <h2>{shoe.featuredRelease.release}</h2>
          <dl>
            <div>
              <dt>MSRP</dt>
              <dd>{shoe.featuredRelease.priceUsd ? `$${shoe.featuredRelease.priceUsd}` : "Pending"}</dd>
            </div>
            <div>
              <dt>Release</dt>
              <dd>{shoe.featuredRelease.releaseYear ?? "Pending"}</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{shoe.featuredRelease.weightOz ? `${shoe.featuredRelease.weightOz} oz` : "Pending"}</dd>
            </div>
            <div>
              <dt>Drop</dt>
              <dd>{shoe.featuredRelease.dropMm ? `${shoe.featuredRelease.dropMm} mm` : "Pending"}</dd>
            </div>
            <div>
              <dt>Avg review</dt>
              <dd>
                {shoe.featuredRelease.averageReviewScore
                  ? `${Math.round(shoe.featuredRelease.averageReviewScore)}/100`
                  : "Pending"}
              </dd>
            </div>
          </dl>
          <div className="card-actions">
            <a className="text-link" href={featuredReleaseHref}>
              Open featured release
            </a>
          </div>
        </aside>
      </section>

      <section className="detail-grid">
        <article className="detail-panel">
          <p className="feature-kicker">Latest Release</p>
          <h2>{shoe.featuredRelease.release}</h2>
          <p>{shoe.featuredRelease.aiReviewSummary?.overview ?? shoe.featuredRelease.reviewCoverage.summary}</p>
          <div className="detail-chip-row">
            <span className="pill">{shoe.featuredRelease.reviewCoverage.sourceCount} sources</span>
            <span className="pill">{shoe.featuredRelease.reviewCoverage.reviewCount} reviews</span>
            <span className="pill">
              Freshest review: {shoe.featuredRelease.reviewCoverage.freshestReviewDate ?? "Unknown"}
            </span>
          </div>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Release History</p>
          <h2>Tracked versions</h2>
          <div className="review-list">
            {shoe.releases.map((release) => (
              <article className="review-card" key={release.id}>
                <div className="catalog-card-topline">
                  <span className="pill">{release.releaseYear ?? "Pending year"}</span>
                  {release.isCurrent ? <span className="pill">current</span> : null}
                  <span className="pill">{release.reviewCoverage.status}</span>
                </div>
                <h3>{release.release}</h3>
                <p className="detail-muted">
                  MSRP {release.priceUsd ? `$${release.priceUsd}` : "Pending"} • {release.reviewCount} reviews
                </p>
                <a className="text-link" href={`/shoes/${shoe.slug}/${release.releaseSlug}`}>
                  Open release detail
                </a>
              </article>
            ))}
          </div>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">What Changed</p>
          <h2>Release-to-release deltas</h2>
          <div className="review-list">
            {shoe.releaseChanges.map((change) => (
              <article key={change.releaseSlug} className="review-card">
                <div className="catalog-card-topline">
                  <span className="pill">{change.release}</span>
                  {change.previousRelease ? (
                    <span className="pill">vs {change.previousRelease}</span>
                  ) : null}
                </div>
                <h3>{change.release}</h3>
                {change.changes.length ? (
                  <div className="detail-chip-row">
                    {change.changes.map((item) => (
                      <span className="pill" key={item}>
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="detail-muted">No major structured changes detected.</p>
                )}
                <a className="text-link" href={`/shoes/${shoe.slug}/${change.releaseSlug}`}>
                  Open this release
                </a>
              </article>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
