---
name: MealMe deprecation + community pricing pivot
description: MealMe API deprecated; SmartBite pivoted to crowdsourced pricing as primary data source; scanner promoted from stretch goal to Sprint 4 core; purchase history, pantry, reminders, price reconciliation, free trial, and economics all added
type: project
---

## What happened

MealMe API was deprecated. Kroger Developer API was also removed. SmartBite pivoted its pricing strategy entirely to community crowdsourcing.

**Current pricing model:**
- PRIMARY: `CanonicalPrice` table fed by community `PriceObservation` scans
- FALLBACK: "Be the first to scan this!" CTA — frames absent data as community opportunity, not a bug
- No third-party pricing APIs remain. MealMe and Kroger API are both gone permanently.

---

## Sprint order (current)

- Sprint 1 ✅ — Auth, onboarding, static TX store list
- Sprint 2 ✅ — AI meal plan generation
- Sprint 3 ✅ — Pricing UI (MealMe removed, Kroger removed, graceful degraded state is permanent for no-data stores)
- Sprint 4 — Scanner + Community Pricing + Pantry + Purchase History (NEXT)
- Sprint 5 — Price Trends + AI Suggestions + Reminders + Personalisation
- Sprint 6 — Favourites + Collections
- Sprint 7 — Subscriptions + 7-day Pro trial
- Sprint 8 — App store ready

---

## All TX stores — no chain restriction

Store list expanded from 6 chains to all TX grocery chains (25+ stores). Static `TX_GROCERY_STORES` array in `txStores.ts`. Users search/pick from dropdown. `maxStores` limit removed from profile + tier gates — scanning is the product for all tiers.

**Tiers:** budget (Aldi, Walmart, WinCo, Dollar General), everyday (HEB, Kroger, Fiesta Mart, Randalls, Tom Thumb, United, Sprouts, Target, etc.), premium (Whole Foods, Central Market, Trader Joe's), warehouse (Costco, Sam's Club), specialty (La Michoacana, El Rancho, Mi Tienda, Minyard).

---

## New features added to roadmap

**Sprint 4:**
- `PurchaseHistory` model — what each user personally bought (quantity, unit, price, store, planId)
- Shopping list check-off prompts quantity capture (with or without barcode scan)
- "Last bought: 2 lb @ HEB" pre-fill on shopping list from purchase history
- `PantryItem` + `PantryLedger` DB models (manual input + purchase sync + recipe cook deductions)
- `POST /recipes/:id/cooked` — scales ingredients by servings, deducts from pantry, increments timesCooked
- Pantry tab (5th tab in nav)
- Bites rewards currency (scanner incentive): earn through scanning, corroboration, streaks, referrals
- Leaderboard, badges, community impact stats

**Sprint 5:**
- Price trend charts: bucket `PriceObservation` history into weekly averages per (ingredientName, storeId) — Pro tier
- AI price suggestions: `GET /prices/suggestion` — Claude analyzes trend, recommends buy/hold/substitute — Pro tier
- `trendDirection` field on shopping list response: `'up' | 'down' | 'stable' | null`
- Purchase reminders (Pro): user-set frequency + quantity for staple items
- `GET /reminders/suggestions` — Claude habit learning (seasonality, quantity drift, price sensitivity); rule-based fallback below 3-purchase threshold

---

## Item catalog (generic, not grocery-only)

`Product` model replaced by `Item` with `ItemCategory` enum:
`GROCERY | FUEL | HOME_IMPROVEMENT | HOUSEHOLD | PERSONAL_CARE | PET_SUPPLIES | OTHER`

`PriceObservation`, `CanonicalPrice`, `PurchaseHistory`, `PantryItem`, `PurchaseReminder` all carry:
- `itemId` (nullable FK to `Item`)
- denormalised `itemName`
- `itemCategory`

V1 only populates GROCERY items. Other categories extend without migrations.

**Category expansion (V2+):** FUEL (gas stations, manual price entry at pump), HOME_IMPROVEMENT (barcode scan), HOUSEHOLD, PERSONAL_CARE. Each new category = ~2 sprints, no schema changes.

---

## Price reconciliation strategy

Conflicting community reports are resolved by:
1. **Cluster detection** — if gap between sorted prices > 15% of median, treat as price-change event (two clusters), not noise
2. **Newer cluster = canonical** — older cluster stored as `previousPrice` for "Recently changed" UI
3. **Outlier quarantine** — observations > 2σ from cluster median marked `quarantined = true`; never deleted; `contributorScore` penalised -0.05
4. **Sale detection** — active cluster > 20% below 30-day baseline with < 3 verified observations → `PriceTag.SALE`
5. **Corroboration** — two users scan same item same store within 48h within 10% price → both `verified = true`, 2× weight, +3 Bites each
6. **Confidence-driven UI** — high: `~$3.99`; medium: `~$3.99`; low: `est. $3.50–$4.50`; sale; price-change; no-data

`contributorScore` on `UserProfile` (default 1.0, max 3.0, min 0.1) is the weight multiplier in canonical price calculation.

---

## Nationwide expansion provisions

- `getStoresForState(state)` function wraps store list — V1 returns TX list, V2 switches by state
- `storeLocation` JSON on `PriceObservation` includes `state: "TX"` field
- Geo restriction checks state bounding boxes (TX bounding box in V1)
- `Waitlist` model has `state` field
- Expansion path: TX → FL → CA → NY. Trigger: ~2,000 TX users + ~60% canonical price coverage

---

## Free trial — 7-day Pro trial for all new users

- Every new user gets 7 days of **Pro** (not Plus) on signup
- `trialEndsAt DateTime?` and `hasUsedTrial Boolean` added to `User` model
- Trial expiry: BullMQ daily cron at 2am CT downgrades expired users with no subscription
- Day-6 push notification: "Your Pro trial ends tomorrow"
- RevenueCat configured with 7-day introductory offer on Pro SKU
- Anti-abuse: `hasUsedTrial` + email uniqueness prevents re-trials

---

## Tier features (current)

| Feature | Free | Plus | Pro |
|---|---|---|---|
| Meal plans/week | 2 | 7 | Unlimited |
| AI personalisation | ✗ | ✓ | ✓ |
| Price drop alerts | ✗ | ✓ | ✓ |
| Price trend charts | ✗ | ✗ | ✓ |
| AI price suggestions | ✗ | ✗ | ✓ |
| Purchase reminders | ✗ | ✗ | ✓ |
| Family profiles | ✗ | ✗ | 5 |
| Community scanning | ✓ | ✓ | ✓ |
| Pantry | ✓ | ✓ | ✓ |

Pricing: Plus $4.99/mo · $39.99/yr; Pro $9.99/mo · $79.99/yr. New users: 7-day Pro trial.

---

## Economics (key numbers)

- Meal plan generation: ~$0.108/call (claude-sonnet-4-6)
- AI price suggestion / reminders: switch to claude-haiku for 88% cost reduction
- Break-even: ~250 MAU
- Full-time income target: ~10,000 MAU (~$6,200/mo net)
- RevenueCat: free up to $2,500 MRR, then $99/mo
- Unit economics: Plus user +$3.56/mo contribution; Pro user +$7.22/mo; Free user -$0.56/mo

---

## Code contracts to never break

- All category-filtered functions accept `ItemCategory[]` param, never hardcode GROCERY
- Pantry/reminder endpoints accept `?category=` query param from day one
- `getStoresForState(state)` wraps TX list — never import `TX_GROCERY_STORES` directly in business logic
- Never re-add MealMe or Kroger API calls to the pricing service
- Scanner and community scan pipeline are the PRIMARY product focus from Sprint 4 onward
