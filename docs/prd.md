# Stride Stack PRD

## Document status

- Status: active working PRD
- Product: Stride Stack
- Repo branch: `codex/rebuild-foundation`
- Last updated: March 12, 2026

This document is the product source of truth for the rebuild. It should be updated as product scope, data strategy, editorial policy, and technical architecture evolve.

## 1. Product summary

Stride Stack is a consumer-facing running shoe comparison and research product. Its purpose is to help runners understand what a shoe is, who it is for, how it compares to alternatives, and what trusted reviewers and running communities think about it.

The product starts as an informative research destination, not a commerce platform and not a training app. The long-term differentiator is that Stride Stack combines structured shoe specs with aggregated, moderated review intelligence pulled from editorial sites and running communities.

## 2. Problem statement

Runners researching shoes currently have to piece together information across brand sites, review publications, Reddit threads, and retailer listings. That process is fragmented and inefficient.

Current pain points:

- specs are scattered and inconsistent across sources
- review sentiment is buried across long-form articles and forum threads
- comparisons across shoes are manual and error-prone
- buyers struggle to separate marketing claims from real-world feedback
- there is no clean bridge between structured shoe data and unstructured review data

Stride Stack solves this by creating a canonical shoe database and pairing it with normalized, source-attributed review signals.

## 3. Vision

Build the best research layer for running shoes on the web:

- structured enough for fast comparison
- opinionated enough to surface what matters
- transparent enough to show where every claim came from
- scalable enough to ingest new shoes and new reviews automatically

## 4. Product goals

### Primary goals

- Help users confidently choose the right running shoe.
- Make shoe comparison fast and trustworthy.
- Aggregate external review sentiment into usable summaries.
- Build an internal workflow that keeps automated ingestion moderated and correctable.

### Secondary goals

- Create durable catalog infrastructure that can grow over many release cycles.
- Reduce manual data-entry burden through crawling and structured extraction.
- Establish a product and data foundation for future SEO growth.

### Non-goals for phase 1

- direct ecommerce or affiliate optimization
- training logs or workout tracking
- full public user accounts
- open public review publishing without moderation
- broad marketplace or retailer integrations

## 5. Ideal customer profiles

### ICP 1: serious shoe researcher

This user reads multiple review sources before buying. They care about ride feel, geometry, foam, weight, fit, and how a shoe compares to similar models.

Needs:

- side-by-side comparisons
- consensus from trusted reviewers
- real-world runner sentiment
- clarity on use case and category

### ICP 2: intermediate runner upgrading shoes

This user knows their current shoe and wants to find the next one. They need practical guidance more than technical obsession.

Needs:

- plain-English summaries
- clear categories like daily trainer, speed trainer, racer, trail
- fit and stability notes
- comparable options

### ICP 3: enthusiast/community user

This user lives in places like `r/RunningShoeGeeks`, follows review media, and enjoys nuanced discussion.

Needs:

- source transparency
- multiple perspectives, not one editorial opinion
- fresh release coverage
- preserved detail rather than over-compressed summaries

## 6. Jobs to be done

- When I am considering a shoe, help me quickly understand what it is built for.
- When I am comparing shoes, help me see meaningful differences without reading five tabs.
- When I am unsure whether a shoe is actually good, summarize what trusted sources and real runners are saying.
- When I am deciding between familiar alternatives, help me map tradeoffs in ride, stability, cushioning, and value.

## 7. Core product principles

- Source attribution is mandatory.
- Automation should accelerate editorial work, not bypass it.
- Canonical data should remain editable by humans.
- Public summaries should be explainable from underlying source material.
- Release-specific truth matters more than generic model-level claims.

## 8. MVP scope

### Public experience

- homepage that explains the product direction
- searchable shoe catalog
- filters for category, terrain, stability, plated status, and text search
- shoe detail pages
- release-level comparison flow
- source-attributed review cards
- release-level consensus summary from approved reviews

### Internal/editorial experience

- create brands, shoes, releases, specs, and review sources
- queue manual reviews
- moderate review status
- override sentiment and highlights
- mark duplicates
- control crawl-source cadence and activation
- manually trigger crawls

### Automated ingestion

- source records and crawl cadence configuration
- crawl runs and raw document storage
- source-specific runners for:
  - Believe in the Run
  - Reddit `r/RunningShoeGeeks`
- normalization of excerpts, sentiment, highlights, and duplicate fingerprints
- moderation gate before public visibility

## 9. Future scope

- public user-submitted reviews behind moderation
- richer editorial dashboards and queue triage
- more review sources
- automated spec extraction
- better search and ranking
- editorial notes or pinned takeaways per release
- affiliate or retailer links if strategically useful
- richer comparison presets and recommendation flows
- authenticated internal users instead of shared basic auth

## 10. User journeys

### Journey 1: research a shoe

1. User lands on the catalog or a shoe detail page.
2. User filters or searches for a shoe.
3. User opens a release detail page.
4. User reviews specs, fit notes, and consensus.
5. User reads supporting reviews from editorial and community sources.

### Journey 2: compare alternatives

1. User identifies two or more candidate shoes.
2. User opens the compare view.
3. User evaluates key spec differences and review score signals.
4. User narrows to the best option for their use case.

### Journey 3: editorial ingestion and moderation

1. Internal user runs a crawl or waits for scheduled ingestion.
2. Imported reviews land as pending content.
3. Internal user reviews candidates, adjusts metadata if needed, and moderates status.
4. Approved reviews contribute to public detail pages and consensus.

## 11. Functional requirements

### Catalog and shoe data

- The system must model brands, shoe lines, release versions, and specs separately.
- The system must support release-specific comparison.
- The system must allow manual create and update workflows for catalog records.
- The system must preserve use-case metadata like category, terrain, stability, plate, and fit notes.

### Review system

- Reviews must attach to a specific release.
- Reviews must preserve original source URL and source identity.
- Reviews must support source type distinctions such as editorial, reddit, and user.
- Reviews must support normalized sentiment, optional normalized score, excerpt, body, author, and publication date.
- Public review visibility must be gated by moderation status.

### Ingestion

- The system must store crawl source settings and cadence.
- The system must store crawl run history.
- The system must store raw fetched documents for auditability and parser iteration.
- Source-specific importers must be able to create pending reviews from trusted external sources.
- The system must deduplicate likely duplicate imports before public surfacing.

### Editorial controls

- Internal users must be able to approve, reject, flag, or keep reviews pending.
- Internal users must be able to override sentiment and highlights.
- Internal users must be able to mark a review as duplicate-of another review.
- The system must log override history.

### Public summaries

- Shoe detail pages must show review-source attribution.
- Shoe detail pages must show release-level consensus derived from approved reviews.
- Consensus should use source-aware weighting and freshness weighting.

## 12. Success metrics

### Product metrics

- catalog page engagement
- shoe detail page depth and return rate
- compare-flow usage
- proportion of users who interact with review content

### Content metrics

- number of covered shoe releases
- number of approved reviews per release
- time from shoe release to first published review coverage
- percentage of high-priority releases with at least one editorial and one community source

### Operations metrics

- crawler success rate by source
- moderation turnaround time
- duplicate import rate
- percentage of crawled candidates requiring manual override

## 13. Risks and constraints

### Product risks

- automated extraction can create misleading summaries if not moderated
- sparse or low-quality source coverage may create uneven catalog depth
- over-compressed consensus could hide nuance that enthusiasts care about

### Technical risks

- source HTML and search behavior can change without notice
- serverless execution time and fetch reliability can constrain crawling
- bad matching can attach reviews to the wrong release

### Operational risks

- moderation burden can grow quickly as sources expand
- shared internal auth is not sufficient long term
- external site crawling must remain respectful and resilient

## 14. Current technical solution

### Stack

- frontend: Next.js App Router with TypeScript
- hosting: Vercel
- database: Supabase Postgres
- schema and query layer: TypeScript schema plus server-side query modules
- ingestion: source-specific TypeScript runners

### Key architectural decisions

- Release-specific modeling: reviews and specs attach to `shoe_releases`, not generic shoe models.
- Moderation-first ingestion: imported content defaults to pending before public use.
- Raw capture retention: crawler output is stored for auditability and parser reprocessing.
- Source-aware normalization: sentiment, highlights, and dedupe fingerprints are normalized across sources.
- Git-driven deployment: infrastructure and application changes live in the repo rather than dashboard-only configuration.

### Current implementation state

- public catalog, detail, compare, and review surfaces exist
- internal dashboard exists
- two source-specific review importers exist
- scheduled ingestion exists via cron endpoint and cadence controls
- consensus summary exists on release detail pages
- editorial overrides exist for imported reviews

## 15. Current data model summary

### Catalog tables

- `brands`
- `shoes`
- `shoe_releases`
- `shoe_specs`

### Review tables

- `review_sources`
- `review_authors`
- `reviews`

### Ingestion tables

- `crawl_sources`
- `crawl_runs`
- `raw_documents`

The model is intentionally built so automated ingestion and manual editorial updates can coexist around the same canonical entities.

## 16. Roadmap

### Phase 1: foundation

- rebuild application architecture
- stand up catalog, detail, compare, and internal dashboard
- define canonical catalog schema

### Phase 2: ingestion baseline

- implement source configuration, crawl runs, and raw storage
- ship Reddit and Believe in the Run importers
- normalize sentiment, highlights, and duplicate detection

### Phase 3: editorial control

- moderation flows
- override controls
- scheduled ingestion
- consensus summaries

### Phase 4: next priorities

- stronger discovery and parsing coverage across more sources
- better observability for crawl health and override history
- secure internal auth model
- public review submission workflow behind moderation
- richer release-level recommendation and comparison logic
- add the next trusted sources, starting with RunRepeat and Doctors of Running

## 17. Open questions

- Which additional sources should be treated as tier-one trusted inputs after BITR and Reddit?
- In the near term, RunRepeat and Doctors of Running are the next planned sources.
- What moderation policy should apply to future public user-submitted reviews?
- How should automated spec ingestion be prioritized relative to review ingestion?
- When should internal auth move from shared credentials to named users?
- Should public pages expose more explicit confidence or freshness labels on consensus summaries?

## 18. Working decisions

These are current decisions unless explicitly changed:

- The product starts as informational, not transactional.
- Review aggregation is a major product feature, not a minor add-on.
- Manual editing remains required even as automation expands.
- The backend remains Supabase Postgres unless a clear scaling or operational reason changes that.
- Vercel remains the hosting platform for the application.

## 19. Change log

- March 12, 2026: created initial PRD based on the active rebuild and current implementation.
