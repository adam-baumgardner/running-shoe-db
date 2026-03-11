# Ingestion architecture

## Goal

The long-term system should ingest shoe specs, release details, and reviews automatically from trusted external sources while preserving:

- source attribution
- moderation control
- manual correction
- normalized comparison data

## Operating model

Manual editorial tooling and crawling should not compete with each other. They should work in layers:

1. Crawlers collect raw source material.
2. Parsers normalize source material into structured candidate records.
3. Moderation decides what becomes canonical.
4. Manual editing can override or correct the canonical record.

## Recommended pipeline

### 1. Source discovery

- Maintain a list of trusted review domains and Reddit communities.
- Store crawl configuration per source:
  - source type
  - entry URLs
  - crawl frequency
  - parser strategy

### 2. Raw ingestion

- Fetch pages or APIs into raw capture storage.
- Persist:
  - fetch timestamp
  - URL
  - response metadata
  - raw HTML or JSON pointer

This should be append-only. Do not overwrite raw captures.

### 3. Structured extraction

- Convert raw captures into candidate records:
  - review source
  - author
  - shoe match candidates
  - score
  - sentiment
  - excerpt
  - claims like fit, durability, ride, stability

Extraction should be repeatable. If parsers improve, rerun extraction against stored raw captures.

### 4. Matching and canonicalization

- Match extracted shoe mentions to canonical `shoes` and `shoe_releases`.
- Keep a confidence score when the match is uncertain.
- Anything below the confidence threshold should land in a manual review queue.

### 5. Moderation and publish

- New crawled reviews should default to `pending`.
- Editors approve, reject, or flag them in the internal dashboard.
- Only approved reviews become visible publicly.

## Data model additions to plan next

The current schema is enough for manual editorial flow, but automated ingestion will need additional tables such as:

- `crawl_sources`
- `crawl_runs`
- `raw_documents`
- `parsed_review_candidates`
- `entity_match_candidates`
- `manual_override_log`

## Implementation phases

### Phase A

- Keep manual intake as the control path.
- Add source-specific import scripts that create pending reviews.

### Phase B

- Add scheduled crawlers for selected editorial domains and Reddit.
- Persist raw captures and parsed candidates.

### Phase C

- Add matching heuristics and confidence scoring.
- Add internal queue views for parser failures and low-confidence matches.

### Phase D

- Add recurring automation through Vercel cron or Supabase scheduled functions.
- Run ingestion on predictable cadences by source.

## Recommendation

The next automation build step should be:

1. create source-specific importer interfaces in code
2. add tables for crawl runs and raw documents
3. build one end-to-end importer for a single trusted source before generalizing
