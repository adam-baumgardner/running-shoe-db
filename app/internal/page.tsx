import {
  createBrandAction,
  createManualReviewAction,
  createReviewSourceAction,
  createShoeModelAction,
  generateAiReviewSummaryAction,
  generateMissingAiReviewSummariesAction,
  runBelieveInTheRunCrawlAction,
  runDoctorsOfRunningCrawlAction,
  runRedditRunningShoeGeeksCrawlAction,
  runRunRepeatCrawlAction,
  runScheduledIngestionAction,
  updateAiReviewSummaryOverrideAction,
  updateCrawlSourceSettingsAction,
  updateReviewEditorialOverridesAction,
  updateReviewStatusAction,
  upsertReleaseAction,
} from "@/app/internal/actions";
import { getImporterByKey } from "@/lib/ingestion";
import { getEditorialDashboardData } from "@/lib/server/editorial";

export const dynamic = "force-dynamic";

export default async function InternalPage() {
  let data: Awaited<ReturnType<typeof getEditorialDashboardData>> | null = null;
  let errorMessage: string | null = null;

  try {
    data = await withTimeout(
      getEditorialDashboardData(),
      8000,
      "Internal dashboard timed out while loading server data.",
    );
  } catch (error) {
    console.error("Internal dashboard data fetch failed", error);
    errorMessage = error instanceof Error ? error.message : "Unknown internal dashboard error";
  }

  if (errorMessage || !data) {
    return (
      <main className="page-shell">
        <section className="hero">
          <div>
            <p className="eyebrow">Internal</p>
            <h1>Internal dashboard is temporarily unavailable.</h1>
            <p className="hero-copy">
              The route is protected correctly, but the dashboard failed while loading server data.
            </p>
          </div>
        </section>

        <section className="detail-panel">
          <p className="feature-kicker">Server Error</p>
          <h2>Dashboard data fetch failed</h2>
          <p className="catalog-copy">{errorMessage ?? "Unknown internal dashboard error"}</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Internal</p>
          <h1>Editorial operations for sources, intake, and moderation.</h1>
          <p className="hero-copy">
            This is the first internal dashboard. It is intentionally narrow: manage review
            sources, queue manual reviews, and moderate what becomes public.
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
            <label className="filter-field">
              <span>Editorial summary note</span>
              <textarea
                name="editorialSummaryNote"
                rows={3}
                placeholder="Optional manual summary shown above automated reconciliation."
              />
            </label>
            <label className="filter-field">
              <span>Pinned takeaways</span>
              <textarea
                name="pinnedTakeaways"
                rows={4}
                placeholder="One takeaway per line"
              />
            </label>
            <label className="filter-field">
              <span>Ignored themes</span>
              <input name="ignoredThemes" placeholder="Fit, Value" />
            </label>
            <button className="button-primary" type="submit">
              Save release
            </button>
          </form>
        </article>

        <article className="detail-panel">
          <p className="feature-kicker">AI Summary</p>
          <h2>Generate release review summary</h2>
          <form action={generateAiReviewSummaryAction} className="editorial-form">
            <label className="filter-field">
              <span>Release</span>
              <select name="releaseId" required defaultValue="">
                <option value="" disabled>
                  Select release
                </option>
                {data.releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.label}
                    {release.hasAiReviewSummary ? " · summary exists" : ""}
                  </option>
                ))}
              </select>
            </label>
            <p className="detail-muted">
              Generates a release-level AI summary from approved reviews only. Re-running replaces
              the previous generated summary.
            </p>
            <button className="button-primary" type="submit">
              Generate AI summary
            </button>
          </form>
          <form action={generateMissingAiReviewSummariesAction}>
            <button className="button-secondary" type="submit">
              Batch generate AI summaries
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
        <p className="feature-kicker">Ingestion Targets</p>
        <h2>Automated crawl foundation</h2>
        <form action={runScheduledIngestionAction}>
          <button className="button-primary" type="submit">
            Run due crawls
          </button>
        </form>
        <div className="detail-grid">
          <form action={runBelieveInTheRunCrawlAction} className="editorial-form editorial-form-inline">
            <label className="filter-field">
              <span>Believe in the Run crawl target</span>
              <select name="releaseId" required defaultValue="">
                <option value="" disabled>
                  Select release to search
                </option>
                {data.releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-primary" type="submit">
              Run BITR crawl
            </button>
          </form>

          <form
            action={runRedditRunningShoeGeeksCrawlAction}
            className="editorial-form editorial-form-inline"
          >
            <label className="filter-field">
              <span>Reddit crawl target</span>
              <select name="releaseId" required defaultValue="">
                <option value="" disabled>
                  Select release to search
                </option>
                {data.releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-primary" type="submit">
              Run Reddit crawl
            </button>
          </form>

          <form action={runRunRepeatCrawlAction} className="editorial-form editorial-form-inline">
            <label className="filter-field">
              <span>RunRepeat crawl target</span>
              <select name="releaseId" required defaultValue="">
                <option value="" disabled>
                  Select release to search
                </option>
                {data.releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-primary" type="submit">
              Run RunRepeat crawl
            </button>
          </form>

          <form
            action={runDoctorsOfRunningCrawlAction}
            className="editorial-form editorial-form-inline"
          >
            <label className="filter-field">
              <span>Doctors of Running crawl target</span>
              <select name="releaseId" required defaultValue="">
                <option value="" disabled>
                  Select release to search
                </option>
                {data.releases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.label}
                  </option>
                ))}
              </select>
            </label>
            <button className="button-primary" type="submit">
              Run Doctors crawl
            </button>
          </form>
        </div>
        <div className="editorial-table editorial-table--ingestion">
          <div className="editorial-table-head">Source</div>
          <div className="editorial-table-head">Importer</div>
          <div className="editorial-table-head">Target</div>
          <div className="editorial-table-head">Cadence</div>
          <div className="editorial-table-head">Health</div>

          {data.crawlSources.map((source) => {
            const importer = getImporterByKey(source.importerKey);

            return (
              <div className="editorial-row" key={source.id}>
                <div>
                  <strong>{source.sourceName}</strong>
                  <p className="detail-muted">{source.targetType}</p>
                </div>
                <div>
                  <strong>{importer?.label ?? source.importerKey}</strong>
                  <p className="detail-muted">{importer?.description ?? "Importer pending."}</p>
                </div>
              <div>
                  <a className="text-link" href={source.targetUrl} rel="noreferrer" target="_blank">
                    Open target
                  </a>
                  <p className="detail-muted">Search pattern: {source.searchPattern ?? "None"}</p>
                </div>
                <div>
                  <form action={updateCrawlSourceSettingsAction} className="editorial-form">
                    <input name="crawlSourceId" type="hidden" value={source.id} />
                    <label className="filter-field">
                      <span>Cadence</span>
                      <select defaultValue={source.cadenceLabel ?? "manual"} name="cadenceLabel">
                        <option value="manual">Manual</option>
                        <option value="hourly">Hourly</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </label>
                    <label className="filter-field checkbox-field">
                      <span>Active</span>
                      <input defaultChecked={source.isActive} name="isActive" type="checkbox" />
                    </label>
                    <button className="button-secondary" type="submit">
                      Save source
                    </button>
                  </form>
                </div>
                <div>
                  <span className="pill">{source.latestRunStatus ?? "never-run"}</span>
                  <p className="detail-muted">
                    {source.isActive ? (source.isDue ? "Due now" : "On schedule") : "Inactive"} ·{" "}
                    {source.dueReason}
                  </p>
                  <p className="detail-muted">
                    Last run: {formatDateTime(source.lastRunAt) ?? "Never"}
                  </p>
                  <p className="detail-muted">
                    Next run: {formatDateTime(source.nextRunAt) ?? "Manual trigger only"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="detail-panel editorial-table-panel">
        <p className="feature-kicker">Recent Crawl Runs</p>
        <h2>Importer execution history</h2>
        <div className="editorial-table editorial-table--runs">
          <div className="editorial-table-head">Source</div>
          <div className="editorial-table-head">Query</div>
          <div className="editorial-table-head">Status</div>
          <div className="editorial-table-head">Discovered</div>
          <div className="editorial-table-head">Stored</div>

          {data.recentCrawlRuns.map((run) => (
            <div className="editorial-row" key={run.id}>
              <div>
                <strong>{run.sourceName}</strong>
                <p className="detail-muted">{formatDateTime(run.createdAt)}</p>
                {run.errorMessage ? <p className="detail-muted">{run.errorMessage}</p> : null}
                {run.failureStage ? (
                  <p className="detail-muted">Failure stage: {run.failureStage}</p>
                ) : null}
                {run.noHitReason ? <p className="detail-muted">{run.noHitReason}</p> : null}
              </div>
              <div>{run.query ?? "n/a"}</div>
              <div>
                <span className="pill">{run.status}</span>
                {run.averageCandidateConfidence !== null ? (
                  <p className="detail-muted">
                    Avg confidence: {formatConfidence(run.averageCandidateConfidence)}
                  </p>
                ) : null}
                {run.maxCandidateConfidence !== null ? (
                  <p className="detail-muted">
                    Max confidence: {formatConfidence(run.maxCandidateConfidence)}
                  </p>
                ) : null}
                {run.fallbackCount !== null ? (
                  <p className="detail-muted">Fallbacks: {run.fallbackCount}</p>
                ) : null}
              </div>
              <div>{run.discoveredCount}</div>
              <div>{run.storedCount}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-panel editorial-table-panel">
        <p className="feature-kicker">Coverage Gaps</p>
        <h2>Current release review coverage</h2>
        <div className="editorial-table editorial-table--releases">
          <div className="editorial-table-head">Release</div>
          <div className="editorial-table-head">Status</div>
          <div className="editorial-table-head">Approved</div>
          <div className="editorial-table-head">Editorial / Reddit / User</div>
          <div className="editorial-table-head">Pending</div>

          {data.releaseCoverage.map((release) => (
            <div className="editorial-row" key={release.releaseId}>
              <div>
                <strong>{release.label}</strong>
              </div>
              <div>
                <span className="pill">{release.coverageStatus}</span>
              </div>
              <div>{release.approvedReviewCount}</div>
              <div>
                {release.editorialCount} / {release.redditCount} / {release.userCount}
              </div>
              <div>{release.pendingCount}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="detail-panel editorial-table-panel">
        <p className="feature-kicker">AI History</p>
        <h2>Recent AI summary events</h2>
        <div className="editorial-table editorial-table--runs">
          <div className="editorial-table-head">Release</div>
          <div className="editorial-table-head">When</div>
          <div className="editorial-table-head">Event</div>
          <div className="editorial-table-head">Signal</div>
          <div className="editorial-table-head">Evidence</div>

          {data.recentAiSummaryHistory.length ? (
            data.recentAiSummaryHistory.map((event) => (
              <div className="editorial-row" key={`${event.releaseLabel}-${event.timestamp}-${event.eventType}`}>
                <div>
                  <strong>{event.releaseLabel}</strong>
                  {event.overview ? <p className="detail-muted">{event.overview}</p> : null}
                </div>
                <div>{formatDateTime(event.timestamp)}</div>
                <div>
                  <span className="pill">{event.eventType}</span>
                  <p className="detail-muted">{event.provider ?? "n/a"}</p>
                </div>
                <div>
                  <p className="detail-muted">{event.overallSentiment ?? "Unset"}</p>
                  <p className="detail-muted">{event.confidence ?? "Unset"}</p>
                  <p className="detail-muted">
                    {event.sourceCount} sources / {event.reviewCount} reviews
                  </p>
                </div>
                <div>{event.evidenceCount}</div>
              </div>
            ))
          ) : (
            <div className="editorial-row">
              <div>No AI summary history yet.</div>
              <div>n/a</div>
              <div>n/a</div>
              <div>n/a</div>
              <div>n/a</div>
            </div>
          )}
        </div>
      </section>

      <section className="detail-panel editorial-table-panel">
        <p className="feature-kicker">Override History</p>
        <h2>Recent editorial corrections</h2>
        <div className="editorial-table editorial-table--runs">
          <div className="editorial-table-head">Review</div>
          <div className="editorial-table-head">When</div>
          <div className="editorial-table-head">Sentiment</div>
          <div className="editorial-table-head">Highlights</div>
          <div className="editorial-table-head">Duplicate</div>

          {data.recentOverrideEvents.length ? (
            data.recentOverrideEvents.map((event) => (
              <div className="editorial-row" key={`${event.reviewId}-${event.timestamp}`}>
                <div>
                  <strong>{event.reviewTitle}</strong>
                  <p className="detail-muted">{event.releaseLabel}</p>
                </div>
                <div>{formatDateTime(event.timestamp)}</div>
                <div>{event.sentiment ?? "Unset"}</div>
                <div>{event.highlights.length ? event.highlights.join(", ") : "None"}</div>
                <div>{event.duplicateOfReviewId ?? "No"}</div>
              </div>
            ))
          ) : (
            <div className="editorial-row">
              <div>No overrides yet.</div>
              <div>n/a</div>
              <div>n/a</div>
              <div>n/a</div>
              <div>n/a</div>
            </div>
          )}
        </div>
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
          <div className="editorial-table-head">AI Summary</div>

          {data.recentReleases.map((release) => (
            <div className="editorial-row" key={release.id}>
              <div>
                <strong>{release.label}</strong>
              </div>
              <div>{release.foam ?? "Pending"}</div>
              <div>{release.msrpUsd ? `$${release.msrpUsd}` : "Pending"}</div>
              <div>{release.weightOzMen ? `${release.weightOzMen} oz` : "Pending"}</div>
              <div>{release.dropMm ? `${release.dropMm} mm` : "Pending"}</div>
              <div>
                <span className="pill">{release.aiSummaryStatus}</span>
                <p className="detail-muted">
                  {formatDateTime(release.aiSummaryGeneratedAt) ?? "No summary yet"}
                </p>
                {release.aiSummaryPreview ? (
                  <p className="detail-muted">{release.aiSummaryPreview}</p>
                ) : null}
                <p className="detail-muted">
                  {release.aiSummarySourceCount} sources / {release.aiSummaryReviewCount} reviews /{" "}
                  {release.aiSummaryEvidenceCount} evidence snippets
                </p>
                <form action={generateAiReviewSummaryAction}>
                  <input name="releaseId" type="hidden" value={release.id} />
                  <button className="button-secondary" type="submit">
                    Regenerate
                  </button>
                </form>
                <details>
                  <summary className="text-link">AI override</summary>
                  <form action={updateAiReviewSummaryOverrideAction} className="editorial-form">
                    <input name="releaseId" type="hidden" value={release.id} />
                    <label className="filter-field checkbox-field">
                      <span>Enable override</span>
                      <input
                        defaultChecked={release.aiSummaryOverrideFields.isEnabled}
                        name="isEnabled"
                        type="checkbox"
                      />
                    </label>
                    <label className="filter-field">
                      <span>Overview</span>
                      <textarea
                        defaultValue={release.aiSummaryOverrideFields.overview}
                        name="overview"
                        rows={4}
                      />
                    </label>
                    <label className="filter-field">
                      <span>Sentiment</span>
                      <select
                        defaultValue={release.aiSummaryOverrideFields.overallSentiment}
                        name="overallSentiment"
                      >
                        <option value="">Unset</option>
                        <option value="positive">Positive</option>
                        <option value="mixed">Mixed</option>
                        <option value="negative">Negative</option>
                      </select>
                    </label>
                    <label className="filter-field">
                      <span>Confidence</span>
                      <select
                        defaultValue={release.aiSummaryOverrideFields.confidence}
                        name="confidence"
                      >
                        <option value="">Unset</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                    <label className="filter-field">
                      <span>Pros</span>
                      <textarea
                        defaultValue={release.aiSummaryOverrideFields.pros}
                        name="pros"
                        rows={4}
                      />
                    </label>
                    <label className="filter-field">
                      <span>Cons</span>
                      <textarea
                        defaultValue={release.aiSummaryOverrideFields.cons}
                        name="cons"
                        rows={4}
                      />
                    </label>
                    <label className="filter-field">
                      <span>Best for</span>
                      <textarea
                        defaultValue={release.aiSummaryOverrideFields.bestFor}
                        name="bestFor"
                        rows={4}
                      />
                    </label>
                    <label className="filter-field">
                      <span>Watch-outs</span>
                      <textarea
                        defaultValue={release.aiSummaryOverrideFields.watchOuts}
                        name="watchOuts"
                        rows={4}
                      />
                    </label>
                    <button className="button-secondary" type="submit">
                      Save AI override
                    </button>
                  </form>
                </details>
              </div>
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
                {review.highlights.length ? (
                  <p className="detail-muted">Highlights: {review.highlights.join(", ")}</p>
                ) : null}
                {review.importerConfidence !== null ? (
                  <p className="detail-muted">
                    Import confidence: {formatConfidence(review.importerConfidence)}
                  </p>
                ) : null}
                {review.duplicateOfReviewId ? (
                  <p className="detail-muted">Marked duplicate of {review.duplicateOfReviewId}</p>
                ) : null}
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
                <form action={updateReviewEditorialOverridesAction} className="editorial-form">
                  <input name="reviewId" type="hidden" value={review.id} />
                  <label className="filter-field">
                    <span>Sentiment override</span>
                    <select defaultValue={review.sentiment ?? ""} name="sentiment">
                      <option value="">Unset</option>
                      <option value="positive">Positive</option>
                      <option value="mixed">Mixed</option>
                      <option value="negative">Negative</option>
                    </select>
                  </label>
                  <label className="filter-field">
                    <span>Highlights</span>
                    <input
                      defaultValue={review.highlights.join(", ")}
                      name="highlights"
                      placeholder="Fit, Ride, Value"
                    />
                  </label>
                  <label className="filter-field">
                    <span>Duplicate of</span>
                    <select defaultValue={review.duplicateOfReviewId ?? ""} name="duplicateOfReviewId">
                      <option value="">Not duplicate</option>
                      {data.recentReviews
                        .filter(
                          (candidate) =>
                            candidate.id !== review.id && candidate.releaseId === review.releaseId
                        )
                        .map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.title ?? candidate.sourceName}
                          </option>
                        ))}
                    </select>
                  </label>
                  <button className="button-secondary" type="submit">
                    Save overrides
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function formatDateTime(value: Date | string | null) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}
