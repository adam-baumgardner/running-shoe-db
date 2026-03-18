import Link from "next/link";
import { CompareSelector } from "@/components/compare-selector";
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
    detail: `${shoe.category} · ${shoe.releaseYear ?? "Year TBD"} · ${shoe.isPlated ? "Plated" : "Non-plated"}`,
    searchLabel: `${shoe.brand} ${shoe.model} ${shoe.release}${shoe.releaseYear ? ` ${shoe.releaseYear}` : ""}`,
  }));
  const comparisonRows = [
    { label: "Category", values: selectedRows.map((shoe) => shoe.category) },
    { label: "Usage", values: selectedRows.map((shoe) => shoe.usageSummary ?? "Pending") },
    {
      label: "Price",
      values: selectedRows.map((shoe) => (shoe.priceUsd ? `$${shoe.priceUsd}` : "Pending")),
    },
    {
      label: "Weight",
      values: selectedRows.map((shoe) => (shoe.weightOz ? `${shoe.weightOz} oz` : "Pending")),
    },
    {
      label: "Heel stack",
      values: selectedRows.map((shoe) => (shoe.heelStackMm ? `${shoe.heelStackMm} mm` : "Pending")),
    },
    {
      label: "Forefoot stack",
      values: selectedRows.map((shoe) =>
        shoe.forefootStackMm ? `${shoe.forefootStackMm} mm` : "Pending",
      ),
    },
    {
      label: "Drop",
      values: selectedRows.map((shoe) => (shoe.dropMm ? `${shoe.dropMm} mm` : "Pending")),
    },
    {
      label: "Plate",
      values: selectedRows.map((shoe) => (shoe.isPlated ? "Plated" : "Non-plated")),
    },
    {
      label: "Review score",
      values: selectedRows.map((shoe) => (shoe.reviewScore ? `${shoe.reviewScore}/100` : "Pending")),
    },
    {
      label: "Rating signal",
      values: selectedRows.map((shoe) =>
        shoe.reviewIntelligence.ratingScore ? `${shoe.reviewIntelligence.ratingScore}/100` : "Pending",
      ),
    },
    {
      label: "Sentiment signal",
      values: selectedRows.map((shoe) =>
        shoe.reviewIntelligence.sentimentScore ? `${shoe.reviewIntelligence.sentimentScore}/100` : "Pending",
      ),
    },
    {
      label: "Editorial read",
      values: selectedRows.map((shoe) => shoe.reviewIntelligence.editorialSummary ?? "Pending"),
    },
    {
      label: "Community read",
      values: selectedRows.map((shoe) => shoe.reviewIntelligence.communitySummary ?? "Pending"),
    },
    {
      label: "Source alignment",
      values: selectedRows.map((shoe) => shoe.reviewIntelligence.sourceAlignment),
    },
    {
      label: "Review read",
      values: selectedRows.map((shoe) => shoe.reviewIntelligence.summary),
    },
    {
      label: "Buyer signal",
      values: selectedRows.map((shoe) => shoe.reviewIntelligence.buyerSignal ?? "Pending"),
    },
    {
      label: "AI summary",
      values: selectedRows.map((shoe) => shoe.aiReviewSummary?.overview ?? "Pending"),
    },
    {
      label: "Top takeaways",
      values: selectedRows.map((shoe) =>
        shoe.reviewReconciliation.topTakeaways.length
          ? shoe.reviewReconciliation.topTakeaways.join(" • ")
          : "Pending",
      ),
    },
  ];

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Compare</p>
          <h1>Comparison should narrow the shortlist, not create a new one.</h1>
          <p className="hero-copy">
            Search for the exact releases you want to stack up. The comparison view keeps the focus
            on the details that actually separate buying decisions: use case, plate, geometry,
            weight, and review signal.
          </p>
        </div>
      </section>

      <CompareSelector options={releaseOptions} selectedIds={selectedReleaseIds} />

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

        {selectedRows.length ? (
          <article className="detail-panel compare-table-panel" style={{ gridColumn: "1 / -1" }}>
            <p className="feature-kicker">Spec Comparison</p>
            <h2>Compare every major detail side by side.</h2>
            <div className="compare-table-scroll">
              <table className="compare-table">
                <thead>
                  <tr>
                    <th scope="col">Spec</th>
                    {selectedRows.map((shoe) => (
                      <th key={shoe.id} scope="col">
                        <div className="compare-table-head">
                          <span className="pill">{shoe.category}</span>
                          <strong>
                            {shoe.brand} {shoe.release}
                          </strong>
                          <span>{shoe.rideProfile}</span>
                          <Link className="text-link text-link--compact" href={`/shoes/${shoe.slug}/${shoe.releaseSlug}`}>
                            Open shoe page
                          </Link>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      {row.values.map((value, index) => (
                        <td key={`${row.label}-${selectedRows[index]?.id ?? index}`}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}
