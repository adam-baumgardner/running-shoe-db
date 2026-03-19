# Catalog Freshness Audit

## Goal
Use the existing shoe model set as the baseline, then verify whether each model's latest release is still current on the official brand site. Keep at least two releases per model wherever practical.

## Process
1. Audit models we already carry against official brand sites.
2. Patch missing latest releases first.
3. Sweep each brand for shoe models we missed entirely.
4. Keep release coverage at `latest + prior` as the minimum standard.

## Current Audit Notes

### New Balance
- `FuelCell Rebel`
  - Seeded before this pass: `v3`, `v4`
  - Official site confirms `FuelCell Rebel v5`
  - Action taken: added `FuelCell Rebel v5`, marked `v4` no longer current
- `Fresh Foam X More`
  - Seeded before this pass: `v4`, `v5`
  - Official site confirms `Fresh Foam X More v6`
  - Action taken: added `Fresh Foam X More v6`, marked `v5` no longer current
- `Fresh Foam X 860`
  - Seeded before this pass: `v13`, `v14`
  - Official site confirms `Fresh Foam X 860v15`
  - Action taken: added `Fresh Foam X 860v15`, marked `v14` no longer current
- `FuelCell SuperComp Elite`
  - Seeded before this pass: `v3`, `v4`
  - Official site confirms `FuelCell SuperComp Elite v5`
  - Action taken: added `FuelCell SuperComp Elite v5`, marked `v4` no longer current
- `Fresh Foam X 1080`
  - Current seeded latest remains `v14`
  - No newer official product confirmed in this pass

## Next Brands To Audit
- Nike
- ASICS
- Saucony
- HOKA
- Brooks
