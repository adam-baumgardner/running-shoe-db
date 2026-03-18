import Link from "next/link";
import { getCatalogCards, getComparisonPageData } from "@/lib/server/catalog";

interface ComparePageProps {
  searchParams: Promise<{ release?: string | string[]; shoe?: string | string[] }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const resolvedSearchParams = await searchParams;
  const selectedReleaseIds = Array.isArray(resolvedSearchParams.release)
    ? resolvedSearchParams.release
    : resolvedSearchParams.release
      ? [resolvedSearchParams.release]
      : [];
  const [catalog, comparison] = await Promise.all([
    getCatalogCards(),
    getComparisonPageData(selectedReleaseIds),
  ]);
  const selectedRows = comparison.rows;
  const releaseOptions = catalog.map((shoe) => ({
    id: shoe.id,
    label: `${shoe.brand} ${shoe.release}`,
  }));

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Compare</p>
          <h1>Comparison should answer buying questions in minutes.</h1>
          <p className="hero-copy">
            Pick up to four models. The first pass is built around the dimensions runners usually
            care about first: usage, plate, weight, stack, drop, and review signal.
          </p>
        </div>
      </section>

      <section className="filter-shell">
        <form className="compare-picker" action="/compare">
          {catalog.map((shoe) => {
            const checked = selectedReleaseIds.includes(shoe.id);

            return (
              <label key={shoe.id} className="compare-option">
                <input defaultChecked={checked} name="release" type="checkbox" value={shoe.id} />
                <span>
                  {shoe.brand} {shoe.release}
                </span>
              </label>
            );
          })}
          <div className="filter-actions">
            <button className="button-primary" type="submit">
              Update comparison
            </button>
            <Link className="button-secondary" href="/compare">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="compare-grid" aria-label="Comparison results">
        {comparison.narrative.overview ? (
          <article className="detail-panel" style={{ gridColumn: "1 / -1" }}>
            <p className="feature-kicker">AI Compare</p>
            <h2>How these shoes separate</h2>
            <p className="catalog-copy">{comparison.narrative.overview}</p>
            {comparison.narrative.chooserGuidance.length ? (
              <div className="detail-chip-row">
                {comparison.narrative.chooserGuidance.map((guidance) => (
                  <span className="pill" key={guidance}>
                    {guidance}
                  </span>
                ))}
              </div>
            ) : null}
            {comparison.narrative.sharedSignals.length ? (
              <p className="detail-muted">
                Shared signals: {comparison.narrative.sharedSignals.join(" ")}
              </p>
            ) : null}
            {comparison.narrative.caution ? (
              <p className="detail-muted">{comparison.narrative.caution}</p>
            ) : null}
            <div className="detail-chip-row">
              {selectedRows.map((shoe) => (
                <span className="pill" key={`${shoe.id}-coverage`}>
                  {shoe.brand} {shoe.release}: {shoe.reviewCoverage.status}
                </span>
              ))}
            </div>
            <div className="review-list">
              {comparison.narrative.keyDifferences.map((difference) => (
                <article className="review-card" key={difference.title}>
                  <div className="catalog-card-topline">
                    <span className="pill">{difference.title}</span>
                  </div>
                  <p className="catalog-copy">{difference.summary}</p>
                  {difference.evidence.map((line) => (
                    <p className="detail-muted" key={line}>
                      {line}
                    </p>
                  ))}
                </article>
              ))}
            </div>
          </article>
        ) : null}

        {selectedRows.map((shoe) => (
          <article key={shoe.id} className="detail-panel">
            <p className="feature-kicker">{shoe.category}</p>
            <h2>
              {shoe.brand} {shoe.release}
            </h2>
            <form action="/compare" className="compare-slot-form">
              {selectedReleaseIds.map((releaseId, index) =>
                releaseId === shoe.id ? null : (
                  <input key={`${shoe.id}-${releaseId}-${index}`} name="release" type="hidden" value={releaseId} />
                ),
              )}
              <label className="filter-field">
                <span>Swap release</span>
                <select defaultValue={shoe.id} name="release">
                  {releaseOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="button-secondary" type="submit">
                Swap
              </button>
            </form>
            <p className="catalog-copy">{shoe.rideProfile}</p>
            {shoe.aiReviewSummary ? (
              <p className="detail-muted">{shoe.aiReviewSummary.overview}</p>
            ) : null}
            <p className="detail-muted">{shoe.reviewCoverage.summary}</p>
            <dl className="spec-grid">
              <div>
                <dt>Usage</dt>
                <dd>{shoe.usageSummary ?? "Pending"}</dd>
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
                <dt>Plate</dt>
                <dd>{shoe.isPlated ? "Plated" : "Non-plated"}</dd>
              </div>
              <div>
                <dt>Review score</dt>
                <dd>
                  {shoe.averageReviewScore ? `${Math.round(shoe.averageReviewScore)}/100` : "Pending"}
                </dd>
              </div>
            </dl>
            {shoe.reviewReconciliation.topTakeaways.length ? (
              <div className="detail-chip-row">
                {shoe.reviewReconciliation.topTakeaways.map((takeaway) => (
                  <span className="pill" key={takeaway}>
                    {takeaway}
                  </span>
                ))}
              </div>
            ) : null}
            <p className="detail-muted">
              Freshest review: {shoe.reviewCoverage.freshestReviewDate ?? "Unknown"}
            </p>
            <div className="card-actions">
              <Link className="text-link" href={`/shoes/${shoe.slug}/${shoe.releaseSlug}`}>
                Open release detail
              </Link>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
