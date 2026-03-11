import { createManualReviewAction, createReviewSourceAction, updateReviewStatusAction } from "@/app/internal/actions";
import { getEditorialDashboardData } from "@/lib/server/editorial";

export const dynamic = "force-dynamic";

export default async function InternalPage() {
  const data = await getEditorialDashboardData();

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Internal</p>
          <h1>Editorial operations for sources, intake, and moderation.</h1>
          <p className="hero-copy">
            This is the first internal dashboard. It is intentionally narrow: manage review sources,
            queue manual reviews, and moderate what becomes public.
          </p>
        </div>
      </section>

      <section className="catalog-grid">
        <article className="detail-panel">
          <p className="feature-kicker">Coverage</p>
          <h2>{data.stats.totalShoes} shoes in catalog</h2>
          <p className="catalog-copy">{data.stats.totalSources} sources tracked</p>
        </article>
        <article className="detail-panel">
          <p className="feature-kicker">Reviews</p>
          <h2>{data.stats.totalReviews} reviews stored</h2>
          <p className="catalog-copy">{data.stats.pendingReviews} pending moderation</p>
        </article>
        <article className="detail-panel">
          <p className="feature-kicker">Scope</p>
          <h2>Manual editorial ops only</h2>
          <p className="catalog-copy">
            No authentication is wired yet. Treat this route as temporary internal tooling only.
          </p>
        </article>
      </section>

      <section className="detail-grid">
        <article className="detail-panel">
          <p className="feature-kicker">Add Source</p>
          <h2>Create a review source</h2>
          <form action={createReviewSourceAction} className="editorial-form">
            <label className="filter-field">
              <span>Name</span>
              <input name="name" required />
            </label>
            <label className="filter-field">
              <span>Slug</span>
              <input name="slug" required />
            </label>
            <label className="filter-field">
              <span>Type</span>
              <select name="sourceType" required defaultValue="editorial">
                <option value="editorial">Editorial</option>
                <option value="reddit">Reddit</option>
                <option value="user">User</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Site URL</span>
              <input name="siteUrl" type="url" />
            </label>
            <label className="filter-field">
              <span>Base domain</span>
              <input name="baseDomain" />
            </label>
            <button className="button-primary" type="submit">
              Save source
            </button>
          </form>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Queue Review</p>
          <h2>Manual review intake</h2>
          <form action={createManualReviewAction} className="editorial-form">
            <label className="filter-field">
              <span>Release</span>
              <select name="releaseId" required defaultValue="">
                <option value="" disabled>
                  Select release
                </option>
                {data.releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Source</span>
              <select name="sourceId" required defaultValue="">
                <option value="" disabled>
                  Select source
                </option>
                {data.sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Author</span>
              <input name="authorName" placeholder="Optional" />
            </label>
            <label className="filter-field">
              <span>Source URL</span>
              <input name="sourceUrl" type="url" required />
            </label>
            <label className="filter-field">
              <span>Title</span>
              <input name="title" />
            </label>
            <label className="filter-field">
              <span>Excerpt</span>
              <textarea name="excerpt" rows={4} />
            </label>
            <label className="filter-field">
              <span>Score / 100</span>
              <input name="scoreNormalized100" type="number" min="0" max="100" />
            </label>
            <label className="filter-field">
              <span>Sentiment</span>
              <select name="sentiment" defaultValue="">
                <option value="">Unset</option>
                <option value="positive">Positive</option>
                <option value="mixed">Mixed</option>
                <option value="negative">Negative</option>
              </select>
            </label>
            <button className="button-primary" type="submit">
              Add pending review
            </button>
          </form>
        </article>
      </section>

      <section className="detail-panel editorial-table-panel">
        <p className="feature-kicker">Moderation</p>
        <h2>Recent reviews</h2>
        <div className="editorial-table">
          <div className="editorial-table-head">Review</div>
          <div className="editorial-table-head">Release</div>
          <div className="editorial-table-head">Source</div>
          <div className="editorial-table-head">Status</div>
          <div className="editorial-table-head">Actions</div>

          {data.recentReviews.map((review) => (
            <div className="editorial-row" key={review.id}>
              <div>
                <strong>{review.title ?? "Untitled review"}</strong>
                <p className="detail-muted">{review.sourceUrl}</p>
              </div>
              <div>{review.releaseLabel}</div>
              <div>{review.sourceName}</div>
              <div>
                <span className="pill">{review.status}</span>
              </div>
              <div className="status-actions">
                {(["pending", "approved", "flagged", "rejected"] as const).map((status) => (
                  <form action={updateReviewStatusAction} key={status}>
                    <input name="reviewId" type="hidden" value={review.id} />
                    <input name="status" type="hidden" value={status} />
                    <button className="button-secondary" type="submit">
                      {status}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
