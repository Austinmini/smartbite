# SmartBite

Mobile-first app that helps communities eat well within their budget. AI-generated meal planning combined with **crowd-powered grocery pricing** — every user who scans a barcode at the shelf contributes real price data that helps their whole neighbourhood save money.

> **V1 is Texas-only.** All TX grocery stores supported. Community scanning is the pricing engine — no third-party pricing APIs.

**Core value proposition:** "Band together to eat better for less."

---

## What it does

- Set a weekly food budget, dietary goals, and preferred stores (any TX chain, no cap)
- Get a personalised AI-generated 7-day meal plan (via Claude)
- Scan barcodes at the shelf → contribute real community prices + earn Bites rewards
- See community-sourced ingredient prices across your chosen stores
- Find the cheapest store — or a 2-store split if it saves $3+
- Track your pantry: purchases auto-sync, recipes deduct ingredients when cooked
- Get AI-powered price trend suggestions and staple reminders (Pro)
- Save favourite recipes, track what you cook, get smarter plans over time
- New users get a **7-day Pro trial** on signup

---

## Tech stack

| Layer | Tech |
|---|---|
| Mobile | React Native (Expo), Expo Router, Zustand, NativeWind |
| API | Fastify, TypeScript, Prisma, PostgreSQL (Supabase) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Pricing | Community crowdsourced (`PriceObservation` → `CanonicalPrice` pipeline) |
| Barcode lookup | Open Food Facts + USDA FoodData Central (free, no key) |
| Auth | Supabase Auth |
| Jobs | BullMQ + Redis |
| Payments | RevenueCat |
| Monorepo | Turborepo + pnpm |

---

## Subscription tiers

| | Free | Plus $4.99/mo | Pro $9.99/mo |
|---|---|---|---|
| Meal plans / week | 2 | 7 | Unlimited |
| AI personalisation | ✗ | ✓ | ✓ |
| Price drop alerts | ✗ | ✓ | ✓ |
| Price trend charts | ✗ | ✗ | ✓ |
| AI price suggestions | ✗ | ✗ | ✓ |
| Purchase reminders | ✗ | ✗ | ✓ |
| Family profiles | ✗ | ✗ | Up to 5 |
| Community scanning | ✓ | ✓ | ✓ |
| Pantry tracking | ✓ | ✓ | ✓ |

New users get a free 7-day Pro trial on signup.

---

## Project structure

```
smartbite/
├── apps/
│   ├── api/          # Fastify backend
│   └── mobile/       # Expo React Native app
├── packages/
│   └── shared/       # Shared TypeScript types
├── turbo.json
└── pnpm-workspace.yaml
```

---

## Getting started

**Prerequisites:** Node 20+, pnpm

```bash
# Install dependencies
pnpm install

# Start the API (port 3000)
cd apps/api && pnpm dev

# Start the mobile app
cd apps/mobile && pnpm start
# Press i for iOS simulator, a for Android
```

**Environment setup:**

```bash
cp apps/api/.env.example apps/api/.env
# Fill in: DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY,
#          ANTHROPIC_API_KEY, SPOONACULAR_API_KEY, EDAMAM_APP_ID, EDAMAM_APP_KEY,
#          REDIS_HOST, REVENUECAT_WEBHOOK_SECRET
```

---

## Sprint progress

### Sprint 1 — Auth + onboarding + store discovery ✅
> "I can sign up and tell the app about myself"

**Backend**
- [x] Monorepo setup (Turborepo, Expo, Fastify, Prisma, pnpm)
- [x] Supabase project + full schema migration (all models including rewards/scanner groundwork)
- [x] Auth routes: signup, login, logout, `/auth/me`
- [x] `GET /stores/nearby` — static TX_GROCERY_STORES list (no external API)
- [x] User profile CRUD — budget, retailers (any TX stores, no cap), dietary, location

**Mobile**
- [x] Expo Router scaffold — 4 tabs, auth screens, recipe detail
- [x] Offline dependencies installed (netinfo, async-storage)
- [x] Rate limiting configured (`@fastify/rate-limit`)
- [x] Auth screens: login, signup — wired to API
- [x] Home screen empty state with "Generate plan" CTA
- [x] Onboarding flow: location → stores → budget → dietary → complete
- [x] Profile screen: stored preferences + edit links

---

### Sprint 2 — Meal plan generation ✅
> "I can see a meal plan for my week"

- [x] AI meal plan generation (Claude `claude-sonnet-4-6`)
- [x] `POST /plans/generate` with tier gate (Redis counter), `GET /plans/current`, regenerate single meal
- [x] 7-day plan UI (`MealPlanCard`), recipe detail screen, `NutritionCard`
- [x] Loading skeleton, error state + retry
- 52 API tests + 21 mobile tests passing

---

### Sprint 3 — Grocery pricing UI ✅
> "I know exactly where to shop and what it costs"

- [x] `scanPrices` orchestrator — queries `CanonicalPrice` table (community DB); graceful "scan to unlock" when no data
- [x] Split optimizer — greedy per-ingredient, `SPLIT_THRESHOLD = $3`
- [x] `GET /prices/scan`, Redis price cache (1hr TTL)
- [x] `GET /shopping-list/:planId` — merged, deduped, sorted by store
- [x] `PriceCompareBar`, `BestStoreCard`, mode toggle, split view
- [x] Shopping list screen — grouped by store, checkable rows, progress bar
- Note: MealMe API deprecated; Kroger API built then removed — community scanning is the sole pricing source

---

### Sprint 4 — Scanner + Community Pricing + Pantry + Purchase History
> "I scan items, build the community price database, manage my pantry, and the app remembers what I buy"

- [ ] `GET /products/lookup/:upc` — Open Food Facts → USDA → Item cache
- [ ] `POST /prices/observation` — write scan, trigger canonical recompute; rate limited 50/day
- [ ] `processScanReward` — Bites logic (base, pioneer, stale, streak)
- [ ] Canonical price recompute job (BullMQ) — weighted median, cluster detection, outlier quarantine
- [ ] `POST /purchases`, `GET /purchases?ingredientName=`
- [ ] Shopping list updated — `lastPurchase` per ingredient
- [ ] Pantry CRUD — `GET/POST/PUT/DELETE /pantry`, `POST /pantry/sync-purchase`, `GET /pantry/check`
- [ ] `POST /recipes/:id/cooked` — deduct pantry, write ledger, increment timesCooked
- [ ] `GET /rewards/balance`, `/rewards/ledger`, `/rewards/leaderboard`, `/rewards/badges`
- [ ] `GET /community/impact` — city-level aggregate stats
- [ ] Scanner screen (Vision Camera + ML Kit barcode)
- [ ] Product confirm screen, celebration screen (confetti + Bites)
- [ ] Shopping list check-off flow with quantity capture
- [ ] Pantry tab — `PantryList`, `PantryItemEditor`, `CookConfirmSheet`
- [ ] Rewards tab (5th nav item) — balance, streak, badges, leaderboard

---

### Sprint 5 — Price trends + AI suggestions + Reminders + Personalisation
> "The app learns my taste, shows me price trends, and tells me when to stock up"

- [ ] Favourites-driven Claude prompt personalisation (Plus/Pro)
- [ ] `priceTrendService` — weekly buckets per (ingredientName, storeId)
- [ ] `GET /prices/trends`, `GET /prices/suggestion` (Claude, Pro gate, Haiku model)
- [ ] Price polling job + `POST /prices/alert`, push notifications
- [ ] Shopping list enriched with `trendDirection: 'up' | 'down' | 'stable'`
- [ ] Purchase reminders CRUD — `GET/POST/PUT/DELETE /reminders` (Pro)
- [ ] `GET /reminders/suggestions` — Claude habit learning (Pro); rule-based fallback < 3 purchases
- [ ] Daily reminder job (BullMQ cron)
- [ ] "Personalised for you" tag + "Why this?" sheet on meal cards
- [ ] Price trend chart screen (7/30/90-day toggle)
- [ ] AI suggestion card, trend arrows on shopping list
- [ ] `ReminderCard`, `ReminderEditor` components

---

### Sprint 6 — Favourites + collections
> "I can save recipes I love and organise them"

- [ ] Favourites CRUD — `POST/DELETE /favourites`, `PUT /favourites/:recipeId`
- [ ] Collections CRUD — `GET/POST/PUT/DELETE /collections`, add/remove recipes
- [ ] `FavouriteButton` — heart toggle with Reanimated pop animation
- [ ] `CollectionPicker` bottom sheet
- [ ] Saved screen — Collections grid, All saved, Most cooked tabs
- [ ] Rating + notes bottom sheet, "Cook again" shortcut

---

### Sprint 7 — Subscriptions + 7-day Pro trial
> "I can subscribe and unlock everything"

- [ ] RevenueCat webhook handler, `GET /subscription/status`
- [ ] 7-day Pro trial granted on signup (`trialEndsAt`, `hasUsedTrial` fields)
- [ ] Trial expiry job (BullMQ daily cron), day-6 push reminder
- [ ] All tier gates wired to live DB tier
- [ ] RevenueCat SDK + introductory offer (7-day free trial on Pro SKU)
- [ ] Trial banner "Pro Trial · X days left", paywall screen, restore purchases
- [ ] `TierGatePrompt` — contextual upgrade prompts with post-trial framing

---

### Sprint 8 — App store ready
> "Signed build on TestFlight and Play Store internal track"

- [ ] Production API keys, rate limiting audit
- [ ] PostHog analytics, Sentry error reporting
- [ ] EAS Build for iOS + Android
- [ ] App Store Connect + Google Play Console listings (screenshots, description, keywords)
- [ ] Privacy policy + ToS, `DELETE /account` (GDPR/CCPA)
- [ ] TestFlight build submitted, Play Store internal track uploaded
