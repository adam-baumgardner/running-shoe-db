import { notFound } from "next/navigation";
import { getReleaseDetail, getShoeParentPageData } from "@/lib/server/catalog";

interface ReleaseDetailPageProps {
  params: Promise<{ slug: string; release: string }>;
  searchParams?: Promise<{ variant?: string }>;
}

export default async function ReleaseDetailPage({ params, searchParams }: ReleaseDetailPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const [shoe, parent] = await Promise.all([
    getReleaseDetail(resolvedParams.slug, resolvedParams.release, resolvedSearchParams.variant ?? null),
    getShoeParentPageData(resolvedParams.slug),
  ]);

  if (!shoe || !parent) {
    notFound();
  }

  const variantOptions = shoe.specVariants.filter(
    (variant) => variant.audience === "mens" || variant.audience === "womens",
  );
  const hasVariantSwitcher = shoe.showSpecVariantToggle && variantOptions.length > 1;
  const gistText =
    shoe.reviewIntelligence.buyerSignal ??
    shoe.aiReviewSummary?.overview ??
    shoe.reviewIntelligence.summary ??
    shoe.usageSummary ??
    shoe.rideProfile;
  const bestFor = dedupeList([
    ...(shoe.aiReviewSummary?.bestFor ?? []),
    ...shoe.reviewIntelligence.positives,
  ]).slice(0, 3);
  const watchOuts = dedupeList([
    ...(shoe.aiReviewSummary?.watchOuts ?? []),
    ...shoe.reviewIntelligence.concerns,
  ]).slice(0, 3);
  const mostPraised = dedupeList([
    ...(shoe.aiReviewSummary?.pros ?? []),
    ...shoe.reviewIntelligence.positives,
    ...shoe.reviewIntelligence.consensusPoints,
  ]).slice(0, 3);
  const commonConcerns = dedupeList([
    ...(shoe.aiReviewSummary?.cons ?? []),
    ...shoe.reviewIntelligence.concerns,
  ]).slice(0, 3);
  const opinionSplits = dedupeList([
    ...(shoe.aiReviewSummary?.debates ?? []),
    ...shoe.reviewIntelligence.debates,
  ]).slice(0, 3);

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
        <p>{shoe.usageSummary ?? shoe.rideProfile}</p>
        {hasVariantSwitcher ? (
          <div className="spec-switcher-row" aria-label="Spec variant selector">
            <span>Showing specs for</span>
            <div className="segmented-control">
              {variantOptions.map((variant) => {
                const isSelected = shoe.selectedSpecVariant?.variantKey === variant.variantKey;

                return (
                  <a
                    aria-current={isSelected ? "true" : undefined}
                    className={`segmented-control-option ${isSelected ? "segmented-control-option--active" : ""}`}
                    href={`/shoes/${shoe.slug}/${resolvedParams.release}?variant=${variant.variantKey}`}
                    key={variant.id}
                  >
                    {variant.displayLabel}
                  </a>
                );
              })}
            </div>
          </div>
        ) : null}
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
          <p className="feature-kicker">Key Summary</p>
          <h2>The gist</h2>
          <p className="detail-lede">{gistText}</p>
          {bestFor.length ? (
            <InsightList title="Best for" items={bestFor} />
          ) : null}
          {watchOuts.length ? (
            <InsightList title="Watch out for" items={watchOuts} />
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
                      View Details
                    </a>
                    <a className="text-link" href={`/compare?release=${release.id}`}>
                      Compare
                    </a>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Reviewer Signal</p>
          <h2>Review consensus</h2>
          <p className="detail-lede">{shoe.aiReviewSummary?.overview ?? shoe.reviewIntelligence.summary}</p>
          <div className="source-read">
            <span>{buildSourceRead(shoe.reviewIntelligence.sourceAlignment)}</span>
            <span>
              {shoe.reviewCoverage.sourceCount} sources · {shoe.reviewCoverage.reviewCount} reviews
              {shoe.reviewCoverage.freshestReviewDate
                ? ` · latest ${shoe.reviewCoverage.freshestReviewDate}`
                : ""}
            </span>
          </div>
          <div className="insight-grid">
            {mostPraised.length ? <InsightList title="Most praised" items={mostPraised} /> : null}
            {commonConcerns.length ? <InsightList title="Common concerns" items={commonConcerns} /> : null}
            {opinionSplits.length ? <InsightList title="Where opinions split" items={opinionSplits} /> : null}
          </div>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Reviews</p>
          <h2>Latest reviews</h2>
          <div className="review-list">
            {shoe.reviews.slice(0, 3).map((review) => (
              <article key={review.id} className="review-card">
                <div className="review-card-meta">
                  <strong>{review.sourceName}</strong>
                  {review.publishedAt ? <span>{review.publishedAt}</span> : null}
                  <span>{review.sourceType}</span>
                  {review.sentiment ? <span className="pill">{review.sentiment}</span> : null}
                  {review.scoreNormalized100 ? <span className="pill">{review.scoreNormalized100}/100</span> : null}
                </div>
                <h3>{review.title ?? "Untitled review"}</h3>
                <p className="catalog-copy review-card-excerpt">{review.excerpt ?? "Excerpt pending."}</p>
                <a className="text-link" href={review.sourceUrl} target="_blank" rel="noreferrer">
                  View Full Review
                </a>
              </article>
            ))}
          </div>
          {shoe.reviews.length > 3 ? (
            <div className="card-actions card-actions--footer">
              <a className="text-link text-link--cta" href={`/reviews?shoe=${shoe.slug}&release=${resolvedParams.release}`}>
                View All Reviews
              </a>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="insight-list">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function dedupeList(items: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const values: string[] = [];

  for (const item of items) {
    const trimmed = item?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    values.push(trimmed);
  }

  return values;
}

function buildSourceRead(alignment: "aligned" | "mixed" | "divergent") {
  if (alignment === "aligned") return "Editorial and community feedback are aligned.";
  if (alignment === "divergent") return "Editorial and community feedback diverge in meaningful ways.";
  return "Editorial and community feedback are somewhat mixed.";
}
