import Link from "next/link";
import type { CatalogCard } from "@/lib/server/catalog";

interface ShoeCardProps {
  shoe: CatalogCard;
}

export function ShoeCard({ shoe }: ShoeCardProps) {
  const releaseHref = `/shoes/${shoe.slug}/${shoe.releaseSlug}`;
  const summary = shoe.aiReviewSummary?.overview ?? shoe.reviewIntelligence.summary;

  return (
    <article className="catalog-row">
      <div className="catalog-row-topline">
        <p className="feature-kicker">{shoe.brand}</p>
        <span className={`catalog-row-status ${shoe.isCurrent ? "catalog-row-status--latest" : ""}`}>
          {shoe.isCurrent ? "Latest release" : "Past release"}
        </span>
      </div>
      <div className="catalog-row-primary">
        <div className="catalog-row-title">
          <h2>
            <Link href={releaseHref}>
              {shoe.release}
            </Link>
          </h2>
          <div className="detail-chip-row">
            <span className="pill">{shoe.usageSummary ?? shoe.category}</span>
            <span className="pill">{shoe.releaseYear ?? "Year pending"}</span>
          </div>
        </div>
        <div className="catalog-row-actions">
          <Link className="text-link text-link--compact" href={releaseHref}>
            Open shoe
          </Link>
          <Link className="text-link text-link--cta text-link--compact" href={`/compare?release=${shoe.id}`}>
            Compare
          </Link>
        </div>
      </div>

      <dl className="catalog-row-metrics" aria-label={`${shoe.brand} ${shoe.release} specs`}>
        <div>
          <dt>Year</dt>
          <dd>{shoe.releaseYear ?? "Pending"}</dd>
        </div>
        <div>
          <dt>Category</dt>
          <dd>{shoe.category}</dd>
        </div>
        <div>
          <dt>Terrain</dt>
          <dd>{shoe.terrain}</dd>
        </div>
        <div>
          <dt>Stability</dt>
          <dd>{shoe.stability}</dd>
        </div>
        <div>
          <dt>Plate</dt>
          <dd>{shoe.isPlated ? "Plated" : "Non-plated"}</dd>
        </div>
        <div>
          <dt>Foam / Ride</dt>
          <dd>{shoe.foam ?? shoe.rideProfile}</dd>
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
          <dt>MSRP</dt>
          <dd>{shoe.priceUsd ? `$${shoe.priceUsd}` : "Pending"}</dd>
        </div>
        <div>
          <dt>Review score</dt>
          <dd>{shoe.reviewScore ? `${shoe.reviewScore}/100` : "Pending"}</dd>
        </div>
        <div>
          <dt>Reviews</dt>
          <dd>{shoe.reviewCount}</dd>
        </div>
      </dl>

      {summary ? <p className="catalog-row-summary-text">{summary}</p> : null}
    </article>
  );
}
