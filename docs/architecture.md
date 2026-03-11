# Architecture baseline

## Product scope

Phase 1 is an informative running shoe research product. It should help buyers answer:

- What kind of shoe is this?
- How does it compare to similar models?
- What do trusted reviewers and running communities say about it?
- Is it suitable for my use case?

## Initial application shape

- Public catalog pages for shoes, brands, and comparisons
- Structured review ingestion from editorial sources and Reddit
- Internal moderation and curation workflow before public contribution opens
- Typed application and database boundaries from the start

## Near-term system choices

- Next.js App Router frontend
- Supabase-hosted Postgres database
- ORM to be selected during schema implementation
- Git-driven deploys to Vercel

## Data domains to support

- Brands
- Shoe models
- Shoe versions
- Specs and fit metadata
- Review sources
- Reviews and score normalization
- Comparison sets
- Moderation state
