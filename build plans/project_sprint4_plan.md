---
name: Sprint 4 completion state — Scanner + Community Pricing + Pantry + Purchase History
description: Sprint 4 fully complete. API + all mobile UI shipped. 161 tests passing.
type: project
---

Sprint 4 is **COMPLETE**.

## API: FULLY COMPLETE (161 tests passing)

- [x] `GET /products/lookup/:upc` — Open Food Facts → Item table cache
- [x] `POST /prices/observation` — write PriceObservation, trigger canonical recompute, rate limited 50/day
- [x] `processScanReward` + `rewardsService` — awardBites, updateStreak, checkAndAwardBadges
- [x] `POST /purchases` + `GET /purchases?ingredientName=` — purchase history
- [x] `GET /prices/shopping-list/:planId` — enriched with `lastPurchase` per ingredient
- [x] `PurchaseHistory` model + `ItemCategory` enum — schema + migration
- [x] `GET/POST/PUT/DELETE /pantry` + `POST /pantry/sync-purchase` + `GET /pantry/check`
- [x] `PantryItem` + `PantryLedger` + `PantryAction` — schema + migration
- [x] `POST /recipes/:id/cooked` — scale by servings, deduct pantry, RECIPE_COOKED ledger, timesCooked
- [x] `GET /rewards/balance` + `/rewards/ledger` + `/rewards/badges` + `/rewards/leaderboard`

**Deferred to post-Sprint 4:**
- [ ] `GET /community/impact` — city-level savings stats (Redis, hourly cache)
- [ ] Canonical price recompute BullMQ job — cluster detection, outlier quarantine, corroboration

---

## Mobile: FULLY COMPLETE

- [x] `shopping-list/[planId].tsx` — check-off confirmation sheet (POST /purchases + sync), lastPurchase badge, 📷 Scan button per store
- [x] `(tabs)/pantry.tsx` — full CRUD (list, add, edit, delete) with Modal editor
- [x] `(tabs)/_layout.tsx` — Pantry + Rewards tabs added (5 tabs total)
- [x] `recipe/[id].tsx` — Mark as Cooked button, servings picker Modal, deduction result card
- [x] `(tabs)/rewards.tsx` — balance card, badge grid (earned/locked), leaderboard, ledger
- [x] `scanner/index.tsx` — Vision Camera + ML Kit barcode scanner with green corner overlay
- [x] `scanner/confirm.tsx` — product lookup, price/qty/unit entry, POST /prices/observation + optional purchase sync
- [x] `scanner/success.tsx` — celebration screen with +5 Bites card
- [x] `app.json` — react-native-vision-camera plugin added

**Scanner dependencies installed:** `react-native-vision-camera`, `@react-native-ml-kit/barcode-scanning`

---

## Next sprint: Sprint 5 — Price trends, AI suggestions, personalisation
