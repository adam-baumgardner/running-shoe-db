import {
  createBrandAction,
  createManualReviewAction,
  createReviewSourceAction,
  createShoeModelAction,
  updateReviewStatusAction,
  upsertReleaseAction,
} from "@/app/internal/actions";
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
          <p className="feature-kicker">Catalog</p>
          <h2>{data.stats.totalBrands} brands tracked</h2>
          <p className="catalog-copy">{data.stats.totalShoes} shoe models currently indexed</p>
        </article>
        <article className="detail-panel">
          <p className="feature-kicker">Reviews</p>
          <h2>{data.stats.totalReviews} reviews stored</h2>
          <p className="catalog-copy">{data.stats.pendingReviews} pending moderation</p>
        </article>
        <article className="detail-panel">
          <p className="feature-kicker">Scope</p>
          <h2>Manual plus crawler-ready ops</h2>
          <p className="catalog-copy">
            This dashboard handles manual correction and intake while the automated crawl pipeline is
            being built.
          </p>
        </article>
      </section>

      <section className="detail-grid">
        <article className="detail-panel">
          <p className="feature-kicker">Add Brand</p>
          <h2>Create a catalog brand</h2>
          <form action={createBrandAction} className="editorial-form">
            <label className="filter-field">
              <span>Name</span>
              <input name="name" required />
            </label>
            <label className="filter-field">
              <span>Slug</span>
              <input name="slug" placeholder="Optional; auto-generated if blank" />
            </label>
            <label className="filter-field">
              <span>Website URL</span>
              <input name="websiteUrl" type="url" />
            </label>
            <button className="button-primary" type="submit">
              Save brand
            </button>
          </form>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">Add Shoe</p>
          <h2>Create a shoe model</h2>
          <form action={createShoeModelAction} className="editorial-form">
            <label className="filter-field">
              <span>Brand</span>
              <select name="brandId" required defaultValue="">
                <option value="" disabled>
                  Select brand
                </option>
                {data.brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Model name</span>
              <input name="name" required />
            </label>
            <label className="filter-field">
              <span>Slug</span>
              <input name="slug" placeholder="Optional; auto-generated if blank" />
            </label>
            <label className="filter-field">
              <span>Category</span>
              <select name="category" defaultValue="road-daily" required>
                <option value="road-daily">Road daily</option>
                <option value="road-workout">Road workout</option>
                <option value="road-race">Road race</option>
                <option value="trail-daily">Trail daily</option>
                <option value="trail-race">Trail race</option>
                <option value="track-spikes">Track spikes</option>
                <option value="hiking-fastpack">Hiking fastpack</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Terrain</span>
              <select name="terrain" defaultValue="road" required>
                <option value="road">Road</option>
                <option value="trail">Trail</option>
                <option value="track">Track</option>
                <option value="mixed">Mixed</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Stability</span>
              <select name="stability" defaultValue="neutral" required>
                <option value="neutral">Neutral</option>
                <option value="stability">Stability</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Usage summary</span>
              <textarea name="usageSummary" rows={4} />
            </label>
            <button className="button-primary" type="submit">
              Save shoe model
            </button>
          </form>
        </article>

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
      </section>

      <section className="detail-grid">
        <article className="detail-panel">
          <p className="feature-kicker">Release Upsert</p>
          <h2>Create or update release specs</h2>
          <form action={upsertReleaseAction} className="editorial-form">
            <label className="filter-field">
              <span>Shoe model</span>
              <select name="shoeId" required defaultValue="">
                <option value="" disabled>
                  Select shoe model
                </option>
                {data.shoes.map((shoe) => (
                  <option key={shoe.id} value={shoe.id}>
                    {shoe.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Version name</span>
              <input name="versionName" required placeholder="Pegasus 42" />
            </label>
            <label className="filter-field">
              <span>Release year</span>
              <input name="releaseYear" type="number" />
            </label>
            <label className="filter-field">
              <span>MSRP USD</span>
              <input name="msrpUsd" type="number" min="0" step="0.01" />
            </label>
            <label className="filter-field checkbox-field">
              <span>Current model</span>
              <input defaultChecked name="isCurrent" type="checkbox" />
            </label>
            <label className="filter-field checkbox-field">
              <span>Plated</span>
              <input name="isPlated" type="checkbox" />
            </label>
            <label className="filter-field">
              <span>Foam</span>
              <input name="foam" />
            </label>
            <label className="filter-field">
              <span>Weight (men, oz)</span>
              <input name="weightOzMen" type="number" min="0" step="0.1" />
            </label>
            <label className="filter-field">
              <span>Heel stack</span>
              <input name="heelStackMm" type="number" min="0" step="1" />
            </label>
            <label className="filter-field">
              <span>Forefoot stack</span>
              <input name="forefootStackMm" type="number" min="0" step="1" />
            </label>
            <label className="filter-field">
              <span>Drop</span>
              <input name="dropMm" type="number" min="0" step="1" />
            </label>
            <label className="filter-field">
              <span>Release notes</span>
              <textarea name="notes" rows={4} />
            </label>
            <label className="filter-field">
              <span>Fit notes</span>
              <textarea name="fitNotes" rows={4} />
            </label>
            <label className="filter-field">
              <span>Source notes</span>
              <textarea name="sourceNotes" rows={4} />
            </label>
            <button className="button-primary" type="submit">
              Save release
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
        <p className="feature-kicker">Recent Releases</p>
        <h2>Manual catalog state</h2>
        <div className="editorial-table editorial-table--releases">
          <div className="editorial-table-head">Release</div>
          <div className="editorial-table-head">Foam</div>
          <div className="editorial-table-head">MSRP</div>
          <div className="editorial-table-head">Weight</div>
          <div className="editorial-table-head">Drop</div>

          {data.recentReleases.map((release) => (
            <div className="editorial-row" key={release.id}>
              <div>
                <strong>{release.label}</strong>
              </div>
              <div>{release.foam ?? "Pending"}</div>
              <div>{release.msrpUsd ? `$${release.msrpUsd}` : "Pending"}</div>
              <div>{release.weightOzMen ? `${release.weightOzMen} oz` : "Pending"}</div>
              <div>{release.dropMm ? `${release.dropMm} mm` : "Pending"}</div>
            </div>
          ))}
        </div>
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
