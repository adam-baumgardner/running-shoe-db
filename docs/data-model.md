# Data model direction

These are the first domains I expect to formalize in the database. The initial Drizzle schema now exists in [db/schema.ts](/Users/adambaumgardner/Documents/Documents/Django/running-shoe-db/db/schema.ts).

## Core catalog

- `brands`
- `shoes`
- `shoe_releases`
- `shoe_specs`

## Review system

- `review_sources`
- `review_authors`
- `reviews`
- `review_tags`
- `review_tag_assignments`

## Curation and moderation

- `submission_queue`
- `moderation_actions`

## Why this shape

The original Django prototype stored one row per shoe with a few related colorways and reviews. That was enough for a proof of concept, but not enough for:

- versioned models across release years
- multiple review types
- score normalization across sources
- moderation of imported and user-submitted content
- richer comparison logic

## Current implementation notes

- A `shoe` is the durable model line, such as Pegasus or Mach.
- A `shoe_release` captures version-specific data such as Pegasus 41 or Mach 6.
- `shoe_specs` stays one-to-one with a release so comparison queries remain simple.
- Reviews attach to releases, not generic models, because version changes matter.
