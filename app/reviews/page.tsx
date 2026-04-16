import Link from "next/link";
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
        <form className="review-filter-form" action="/reviews">
          <label className="filter-field">
            <span>Brand</span>
            <select defaultValue={filters.brand ?? ""} name="brand">
              <option value="">All brands</option>
              {filterOptions.brands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Shoe</span>
            <select defaultValue={filters.shoe ?? ""} name="shoe">
              <option value="">All shoes</option>
              {filterOptions.shoes.map((shoe) => (
                <option key={shoe.slug} value={shoe.slug}>
                  {shoe.brand} {shoe.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Release</span>
            <select defaultValue={filters.release ?? ""} name="release">
              <option value="">All releases</option>
              {filterOptions.releases.map((release) => (
                <option key={`${release.shoeSlug}:${release.slug}`} value={release.slug}>
                  {release.brand} {release.label}
                </option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Review source</span>
            <select defaultValue={filters.source ?? ""} name="source">
              <option value="">All sources</option>
              {filterOptions.sources.map((source) => (
                <option key={source.slug} value={source.slug}>
                  {source.name}
                </option>
              ))}
            </select>
          </label>
          <div className="catalog-toolbar-actions">
            <button className="button-primary" type="submit">
              Apply
            </button>
            <Link className="button-secondary" href="/reviews">
              Reset
            </Link>
          </div>
        </form>
      </section>

      <section className="catalog-meta">
        <p>{items.length} reviews match the current view.</p>
      </section>

      <section className="review-feed" aria-label="Latest reviews">
        {items.length ? (
          items.map((item) => (
            <article key={item.id} className="detail-panel review-feed-item">
              <div className="review-feed-header">
                <div>
                  <p className="feature-kicker">
                    {item.brand} {item.release}
                  </p>
                  <h2>{item.title ?? `${item.brand} ${item.release}`}</h2>
                  <p className="review-source-line">
                    {item.sourceName}
                    {item.authorName ? ` · ${item.authorName}` : ""}
                    {item.publishedAt ? ` · ${item.publishedAt}` : ""}
                  </p>
                </div>
                <p className="detail-muted">{item.sourceType}</p>
              </div>
              <div className="review-feed-copy-grid">
                <div>
                  <h3>Source excerpt</h3>
                  <p className="catalog-copy review-card-excerpt">{item.excerpt ?? "Excerpt pending."}</p>
                </div>
                {item.aiOverview || item.buyerSignal ? (
                  <div>
                    <h3>Stride Stack summary</h3>
                    <p className="catalog-copy review-card-excerpt">
                      {item.aiOverview ?? item.buyerSignal}
                    </p>
                  </div>
                ) : null}
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
