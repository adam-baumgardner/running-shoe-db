import Link from "next/link";
import { getReviewsFeedData } from "@/lib/server/catalog";

export default async function ReviewsPage() {
  const { items } = await getReviewsFeedData();

  return (
    <main className="page-shell">
      <section className="hero hero--single">
        <div>
          <p className="eyebrow">Reviews</p>
          <h1>Latest running shoe reviews, in one feed.</h1>
          <p className="hero-copy">
            This feed pulls approved editorial and community reviews into one place, sorted newest
            first, so you can scan what just landed and jump straight into the shoe pages that
            matter.
          </p>
          <div className="detail-chip-row">
            <span className="pill">{items.length} reviews</span>
            <span className="pill">Newest first</span>
          </div>
        </div>
      </section>

      <section className="review-feed" aria-label="Latest reviews">
        {items.length ? (
          items.map((item) => (
            <article key={item.id} className="detail-panel review-feed-item">
              <div className="catalog-card-topline">
                <span className="pill">{item.sourceName}</span>
                <span className="pill">{item.sourceType}</span>
                <span className="pill">{item.category}</span>
                {item.sentiment ? <span className="pill">{item.sentiment}</span> : null}
                {item.reviewScore ? <span className="pill">Review score {item.reviewScore}/100</span> : null}
                {item.consensusPoints.length ? <span className="pill">Consensus surfaced</span> : null}
                {item.debates.length ? <span className="pill">Debates surfaced</span> : null}
                {item.publishedAt ? <span className="pill">{item.publishedAt}</span> : null}
              </div>
              <div className="review-feed-header">
                <div>
                  <p className="feature-kicker">
                    {item.brand} {item.release}
                  </p>
                  <h2>{item.title ?? `${item.brand} ${item.release}`}</h2>
                </div>
                <p className="detail-muted">{item.authorName ? `${item.authorName}` : "Source review"}</p>
              </div>
              <p className="catalog-copy">{item.excerpt ?? "Excerpt pending."}</p>
              {item.aiOverview ? <p className="detail-muted">{item.aiOverview}</p> : null}
              {item.buyerSignal ? <p className="detail-muted">{item.buyerSignal}</p> : null}
              {item.consensusPoints.length ? (
                <div className="detail-chip-row">
                  {item.consensusPoints.map((point) => (
                    <span className="pill" key={point}>
                      {point}
                    </span>
                  ))}
                </div>
              ) : null}
              {item.debates.length ? (
                <div className="detail-chip-row">
                  {item.debates.map((point) => (
                    <span className="pill" key={point}>
                      {point}
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="card-actions">
                <Link className="text-link text-link--cta" href={`/shoes/${item.shoeSlug}/${item.releaseSlug}`}>
                  Open release detail
                </Link>
                <Link className="text-link" href={`/shoes/${item.shoeSlug}`}>
                  Open shoe page
                </Link>
                <a className="text-link" href={item.sourceUrl} target="_blank" rel="noreferrer">
                  Open source review
                </a>
              </div>
            </article>
          ))
        ) : (
          <article className="detail-panel">
            <p className="feature-kicker">Reviews</p>
            <h2>No approved reviews are available yet.</h2>
            <p className="catalog-copy">
              As reviews are approved in the editorial workflow, they will appear here in
              reverse-chronological order.
            </p>
          </article>
        )}
      </section>
    </main>
  );
}
