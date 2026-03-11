import { notFound } from "next/navigation";
import { getShoeDetail } from "@/lib/server/catalog";

interface ShoeDetailPageProps {
  params: { slug: string };
}

export default async function ShoeDetailPage({ params }: ShoeDetailPageProps) {
  const { slug } = params;
  const shoe = await getShoeDetail(slug);

  if (!shoe) {
    notFound();
  }

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
          </dl>
        </aside>
      </section>

      <section className="detail-grid">
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
          <p className="feature-kicker">Reviews</p>
          <h2>Review system baseline</h2>
          <p>
            {shoe.reviewCount} approved reviews are currently indexed for this release. The next
            increment will expose the underlying source list and normalized review sentiment.
          </p>
        </article>
      </section>
    </main>
  );
}
