# Stride Stack

Stride Stack is a fresh rebuild of the original running shoe database project.

## Product direction

This app is being rebuilt as a consumer-facing running shoe comparison and reference site with:

- structured shoe specs
- filterable catalog browsing
- source-backed editorial and community review aggregation
- side-by-side comparison workflows
- public user reviews later, behind moderation

## Planned stack

- Next.js on Vercel
- Supabase Postgres as the primary database
- TypeScript throughout

## Current status

This repository is now well past foundation phase on `codex/rebuild-foundation`.

Implemented on the branch today:

- release-aware catalog and public routing
- parent shoe pages plus release-specific detail pages
- release-to-release change summaries and version navigation
- release-aware comparison with narrative guidance
- aggregated review consensus and source reconciliation
- AI-generated release summaries with editorial override support
- internal editorial workflows for moderation and manual data entry
- automated ingestion runners for:
  - Believe in the Run
  - Reddit `r/RunningShoeGeeks`
  - RunRepeat
  - Doctors of Running

Not yet stabilized:

- production deployment reliability on Vercel
- `/internal` runtime stability in production
- visual polish and responsive cleanup
- authenticated internal users beyond shared basic auth
- deeper automated spec extraction

Recommended next milestone:

- review `codex/rebuild-foundation` as the new product baseline
- make a checkpoint decision on merging to `main`
- split deployment stabilization into a dedicated follow-up pass

## Internal tooling access

The `/internal` route is protected with HTTP Basic Auth driven by:

- `INTERNAL_BASIC_AUTH_USERNAME`
- `INTERNAL_BASIC_AUTH_PASSWORD`

In local development, the route remains open if those variables are unset. In production, the route should always have both values configured.

## Scheduled ingestion

The first automated crawl loop is now exposed at `/api/cron/ingest`.

- Vercel cron is configured in [vercel.json](/Users/adambaumgardner/Documents/Documents/Django/running-shoe-db/vercel.json)
- `CRON_SECRET` can be used for authenticated manual calls
- crawl source cadence and active state are managed from `/internal`

## Health and smoke checks

- Deployed health endpoint: `/api/health`
- Local merge-prep smoke check: `npm run smoke`

## AI review summaries

Release-level AI summaries are generated from approved reviews only.

- `OPENAI_API_KEY` enables model-backed generation
- `OPENAI_MODEL` optionally overrides the default model
- if no API key is configured, the app falls back to a heuristic summary so the workflow still functions in development

## Checkpoint docs

- Current checkpoint summary: [docs/checkpoints/2026-03-16.md](/Users/adambaumgardner/Documents/Documents/Django/running-shoe-db/docs/checkpoints/2026-03-16.md)
- Living product requirements: [docs/prd.md](/Users/adambaumgardner/Documents/Documents/Django/running-shoe-db/docs/prd.md)
- Merge-prep checklist: [docs/merge-prep.md](/Users/adambaumgardner/Documents/Documents/Django/running-shoe-db/docs/merge-prep.md)
