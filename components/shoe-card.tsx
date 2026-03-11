import Link from "next/link";
import type { CatalogCard } from "@/lib/server/catalog";

interface ShoeCardProps {
  shoe: CatalogCard;
}

export function ShoeCard({ shoe }: ShoeCardProps) {
  return (
    <article className="catalog-card">
      <div className="catalog-card-topline">
        <p className="feature-kicker">{shoe.category}</p>
        <span className="pill">{shoe.terrain}</span>
      </div>
      <h2>
        <Link href={`/shoes/${shoe.slug}`}>
          {shoe.brand} {shoe.release}
        </Link>
      </h2>
      <p className="catalog-copy">{shoe.rideProfile}</p>
      <p className="catalog-copy">{shoe.usageSummary ?? "Usage summary pending."}</p>
      <dl className="catalog-stats">
        <div>
          <dt>Weight</dt>
          <dd>{shoe.weightOz ? `${shoe.weightOz} oz` : "Pending"}</dd>
        </div>
        <div>
          <dt>Drop</dt>
          <dd>{shoe.dropMm ? `${shoe.dropMm} mm` : "Pending"}</dd>
        </div>
        <div>
          <dt>Stability</dt>
          <dd>{shoe.stability}</dd>
        </div>
        <div>
          <dt>Reviews</dt>
          <dd>{shoe.reviewCount}</dd>
        </div>
      </dl>
      <Link className="text-link" href={`/shoes/${shoe.slug}`}>
        Open shoe detail
      </Link>
    </article>
  );
}
