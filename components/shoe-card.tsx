import Link from "next/link";
import type { CatalogCard } from "@/lib/server/catalog";

interface ShoeCardProps {
  shoe: CatalogCard;
}

export function ShoeCard({ shoe }: ShoeCardProps) {
  const releaseHref = `/shoes/${shoe.slug}/${shoe.releaseSlug}`;
  const familyHref = `/shoes/${shoe.slug}`;

  return (
    <article className="catalog-row">
      <div className="catalog-row-primary">
        <div className="catalog-row-title">
          <p className="feature-kicker">{shoe.brand}</p>
          <h2>
            <Link href={familyHref}>
              {shoe.model} <span className="detail-muted">{shoe.release}</span>
            </Link>
          </h2>
        </div>
        <p className="catalog-copy">{shoe.usageSummary ?? shoe.rideProfile}</p>
      </div>

      <dl className="catalog-row-metrics" aria-label={`${shoe.brand} ${shoe.release} specs`}>
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
          <dd>{shoe.averageReviewScore ? `${Math.round(shoe.averageReviewScore)}/100` : "Pending"}</dd>
        </div>
        <div>
          <dt>Reviews</dt>
          <dd>{shoe.reviewCount}</dd>
        </div>
      </dl>

      <div className="catalog-row-actions">
        {shoe.isCurrent ? <span className="pill">Latest release</span> : <span className="pill">Past release</span>}
        <Link className="text-link" href={familyHref}>
          Open shoe page
        </Link>
        <Link className="text-link" href={releaseHref}>
          Open latest release
        </Link>
        <Link className="text-link text-link--cta" href={`/compare?release=${shoe.id}`}>
          Compare
        </Link>
      </div>
    </article>
  );
}
