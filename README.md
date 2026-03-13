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

This repository is in foundation phase. The Django prototype has been replaced with a new frontend baseline and the data layer will be added next.

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

## AI review summaries

Release-level AI summaries are generated from approved reviews only.

- `OPENAI_API_KEY` enables model-backed generation
- `OPENAI_MODEL` optionally overrides the default model
- if no API key is configured, the app falls back to a heuristic summary so the workflow still functions in development
