---
name: Sprint 3 plan — grocery pricing
description: Sprint 3 is COMPLETE. Pricing UI built. MealMe deprecated, Kroger API built then removed. Community scanning is the sole pricing source going forward.
type: project
---

Sprint 3 is **COMPLETE**.

**What was built:**
- `scanPrices` orchestrator — queries `CanonicalPrice` table (community DB); graceful "scan to unlock" degraded state when no data
- Split optimizer — greedy per-ingredient, `SPLIT_THRESHOLD = $3`
- `GET /prices/scan` with Redis price cache (1hr TTL)
- `GET /shopping-list/:planId` — full week's ingredients merged, deduped, sorted by store
- `PriceCompareBar`, `BestStoreCard`, mode toggle, split view
- Shopping list screen — grouped by store, checkable rows, progress bar

**What changed post-Sprint 3 (pricing pivot):**
- MealMe API was deprecated (external service shut down) — client file retained but disabled
- Kroger API client was built in Sprint 3 but **subsequently removed** — Kroger is now just another community-scanned store like all others
- No third-party pricing APIs remain in the codebase
- The "scan to unlock" graceful degraded state (no community data yet) is now the **permanent correct behaviour** for all stores until scan data accumulates
- All TX grocery stores supported via static `TX_GROCERY_STORES` array — no location API needed

**Current pricing source priority (post-pivot):**
1. `CanonicalPrice` table (community scans) — PRIMARY for all stores
2. Nothing else — no Kroger API, no MealMe, no Zyte
3. Graceful "Be the first to scan this!" when no community data exists

**Next sprint:** Sprint 4 — Scanner + Community Pricing + Pantry + Purchase History.
The scanner is now the CORE product feature that feeds the pricing database.
See `project_pricing_pivot.md` for full pivot context.
