import Link from "next/link";
import { ReviewFilterForm } from "@/components/review-filter-form";
import { getReviewsFeedData, type ReviewsFeedFilters } from "@/lib/server/catalog";

interface ReviewsPageProps {
  searchParams?: Promise<ReviewsFeedFilters>;
}

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const filters = (await searchParams) ?? {};
  const { items, filterOptions } = await getReviewsFeedData(filters);

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
        </div>
      </section>

      <section className="filter-shell" aria-label="Review filters">
        <ReviewFilterForm filters={filters} filterOptions={filterOptions} />
      </section>

      <section className="catalog-meta">
        <p>{items.length} reviews match the current view.</p>
      </section>

      <section className="review-feed" aria-label="Latest reviews">
        {items.length ? (
          items.map((item) => {
            const sourceText = item.body?.trim() || item.excerpt?.trim() || null;
            const stackSummary = item.aiOverview?.trim() || item.buyerSignal?.trim() || item.excerpt?.trim() || null;
            const authorName =
              item.authorName?.trim().toLowerCase() === item.sourceName.trim().toLowerCase()
                ? null
                : item.authorName;

            return (
              <article key={item.id} className="detail-panel review-feed-item">
                <div className="review-feed-header">
                  <div>
                    <p className="feature-kicker">
                      {item.brand} {item.release}
                    </p>
                    <h2>{item.title ?? `${item.brand} ${item.release}`}</h2>
                    <p className="review-source-line">
                      {item.sourceName}
                      {authorName ? ` · ${authorName}` : ""}
                      {item.publishedAt ? ` · ${item.publishedAt}` : ""}
                    </p>
                  </div>
                  <p className="detail-muted">{item.sourceType}</p>
                </div>
                <div className="review-feed-copy-grid">
                  {stackSummary ? (
                    <div className="review-stack-summary">
                      <h3>Stride Stack summary</h3>
                      <p className="catalog-copy">{stackSummary}</p>
                    </div>
                  ) : null}
                  <div>
                    <h3>Source review text</h3>
                    <p className="catalog-copy review-source-excerpt">{sourceText ?? "Source text pending."}</p>
                  </div>
                </div>
                <div className="card-actions">
                  <Link className="text-link text-link--cta" href={`/shoes/${item.shoeSlug}/${item.releaseSlug}`}>
                    View Details
                  </Link>
                  <a className="text-link" href={item.sourceUrl} target="_blank" rel="noreferrer">
                    View Full Review
                  </a>
                </div>
              </article>
            );
          })
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
