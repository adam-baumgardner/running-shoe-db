# Merge Prep

## Goal

This checklist is the shortest safe path to make `codex/rebuild-foundation` the new `main`.

## Hard blockers before merge

- Deployed `/api/health` must return `200` in the target environment.
- Deployed `/internal` must load reliably after authentication.
- Production envs must be set for:
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DATABASE_URL`
  - `INTERNAL_BASIC_AUTH_USERNAME`
  - `INTERNAL_BASIC_AUTH_PASSWORD`
  - `CRON_SECRET`
- Local validation must pass:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run build`
  - `npm run smoke`

## Recommended merge sequence

1. Run local validation.
2. Confirm the target deploy environment has the required env vars.
3. Deploy the branch.
4. Verify:
   - `/api/health`
   - `/`
   - `/shoes`
   - one parent shoe page
   - one release detail page
   - `/compare`
   - `/internal`
5. If deployment is stable, merge `codex/rebuild-foundation` into `main`.

## Notes

- This branch is a product reset, not an incremental feature.
- Post-merge work should focus on stabilization, auth hardening, and test depth rather than new feature breadth.
