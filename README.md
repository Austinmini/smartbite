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
- Interactive onboarding checklist + contextual "Did You Know" tips to learn the app
- In-app feedback and bug reporting from the Profile screen

---

## Tech stack

| Layer | Tech |
|---|---|
| Mobile | React Native (Expo), Expo Router, Zustand, NativeWind |
| API | Fastify, TypeScript, Prisma, PostgreSQL (Supabase) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Pricing | Community crowdsourced (`PriceObservation` → `CanonicalPrice` pipeline) |
| Barcode lookup | Open Food Facts + USDA FoodData Central (parallel fan-out, merged, client-cached) |
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

## Scalability notes

The architecture is stateless and scales horizontally. Four targeted fixes before 10k users:

| Fix | When | Action |
|---|---|---|
| PgBouncer connection pooling | Now | Enable in Supabase dashboard, append `?pgbouncer=true&connection_limit=1` to `DATABASE_URL` |
| Event-driven canonical price recompute | Sprint 5 | Enqueue BullMQ job per observation — never full-table cron scan |
| PriceObservation archival | Sprint 5 | Move rows older than 90 days to archive table monthly |
| Async plan generation | Sprint 7 | Queue Claude job, return immediately, mobile polls `GET /plans/current` |

Everything else (Redis, rate limiting, tier enforcement, Prisma query safety) handles 10k+ without changes.

---

## AI model configuration

All AI model selections are centralised in `apps/api/src/lib/aiConfig.ts` and driven by environment variables — no code changes needed to swap models.

| Use case | Default model | Override env var |
|---|---|---|
| Meal plan generation | `claude-sonnet-4-6` | `AI_MODEL_MEAL_PLAN` |
| Recipe generation | `claude-sonnet-4-6` | `AI_MODEL_RECIPE_GENERATE` |
| Price suggestions | `claude-haiku-4-5-20251001` | `AI_MODEL_PRICE_SUGGEST` |
| Reminder habit learning | `claude-haiku-4-5-20251001` | `AI_MODEL_REMINDERS` |

Haiku is used for lightweight structured tasks (~88% cheaper than Sonnet). Sonnet is reserved for creative generation where output quality matters.

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

### Sprint 4 — Scanner + Community Pricing + Pantry + Purchase History ✅
> "I scan items, build the community price database, manage my pantry, and the app remembers what I buy"

**Backend** — 161 tests passing
- [x] `GET /products/lookup/:upc` — Open Food Facts → USDA → Item cache
- [x] `POST /prices/observation` — write scan, trigger canonical recompute; rate limited 50/day
- [x] `processScanReward` — Bites logic (base, pioneer, stale, streak)
- [x] `POST /purchases`, `GET /purchases?ingredientName=`
- [x] Shopping list updated — `lastPurchase` per ingredient
- [x] Pantry CRUD — `GET/POST/PUT/DELETE /pantry`, `POST /pantry/sync-purchase`, `GET /pantry/check`
- [x] `PantryItem` + `PantryLedger` + `PantryAction` schema + migration
- [x] `POST /recipes/:id/cooked` — deduct pantry, write RECIPE_COOKED ledger, increment timesCooked
- [x] `GET /rewards/balance`, `/rewards/ledger`, `/rewards/leaderboard`, `/rewards/badges`
- [x] `GET /community/impact` — deferred (city-level aggregate stats, Redis hourly cache)
- [x] Canonical price recompute BullMQ job — deferred (cluster detection, outlier quarantine, corroboration)

**Mobile**
- [x] Shopping list check-off: confirmation sheet → `POST /purchases` + `POST /pantry/sync-purchase` → check off; "Last bought" badge per ingredient
- [x] Shopping list: 📷 Scan button per store group launches barcode scanner
- [x] Pantry tab — list with qty chips, add/edit Modal, delete with confirm, pull-to-refresh
- [x] Recipe detail: "Mark as Cooked" → servings picker → `POST /recipes/:id/cooked` → deduction summary card
- [x] Rewards tab — balance card, badge grid (earned/locked), leaderboard, recent activity ledger
- [x] Scanner screens (`scanner/index`, `scanner/confirm`, `scanner/success`) — `expo-camera` barcode scan → product lookup → price/qty entry → `POST /prices/observation` → Bites celebration
- [x] Tab bar: 6 tabs — Home, Explore, Pantry, Saved, Rewards, Profile

---

### Sprint 5 — Price trends + AI suggestions + Reminders + Personalisation
> "The app learns my taste, shows me price trends, and tells me when to stock up"

- [ ] Favourites-driven Claude prompt personalisation (Plus/Pro)
- [x] `priceTrendService` — weekly buckets per (ingredientName, storeId)
- [x] `GET /prices/trends`, `GET /prices/suggestion` (Claude, Pro gate, Haiku model)
- [ ] Price polling job + `POST /prices/alert`, push notifications
- [ ] Shopping list enriched with `trendDirection: 'up' | 'down' | 'stable'`
- [x] Purchase reminders CRUD — `GET/POST/PUT/DELETE /reminders` (Pro)
- [x] `GET /reminders/suggestions` — Claude habit learning (Pro); rule-based fallback < 3 purchases
- [ ] Daily reminder job (BullMQ cron)
- [ ] "Personalised for you" tag + "Why this?" sheet on meal cards
- [ ] Price trend chart screen (7/30/90-day toggle)
- [ ] AI suggestion card, trend arrows on shopping list
- [ ] `ReminderCard`, `ReminderEditor` components

---

### Sprint 6 — Favourites + collections
> "I can save recipes I love and organise them"

- [x] Favourites CRUD — `POST/DELETE /favourites`, `PUT /favourites/:recipeId`, `GET /favourites`
- [x] Collections CRUD — `GET/POST/PUT/DELETE /collections`, add/remove recipes
- [x] `FavouriteButton` — heart toggle
- [ ] Reanimated pop animation polish
- [x] `CollectionPicker` bottom sheet
- [x] Saved screen — collections/all saved/most cooked tabs
- [x] Rating + notes bottom sheet, "Cook again" shortcut
- [x] `Feedback` model + `POST /feedback`
- [x] `FeedbackSheet` wired from Profile and scanner success
- [x] Referral code/stats surfaced in Profile with native share sheet
- [ ] Dedicated collection detail route polish
- [ ] Post-upgrade referral CTA screen

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

### Barcode product lookup pipeline (enhance in Sprint 5)
> "Scan a barcode and the product name, brand, image, and unit size are pre-filled instantly"

**Server — parallel multi-source (replacing current single-source + hard 404)**
- [ ] `src/lib/usda.ts` — USDA FoodData Central client (free API key, 3600 req/hr)
- [ ] `products.ts` — fan out OFF + USDA in parallel, merge best fields, never return 404 for a real UPC (return partial data)
- [ ] Add `nutrition`, `ingredients`, `category` fields to Item table
- [ ] Add `USDA_API_KEY` to `.env.example`

Merge strategy: OFF wins on image + brand; USDA wins on nutrition + US-specific coverage (HEB store brands, regional TX products).

**Client — AsyncStorage cache for instant repeat scans**
- [ ] `stores/productCacheStore.ts` — Zustand + AsyncStorage, 30-day TTL, max 500 items LRU
- [ ] `scanner/confirm.tsx` — check local cache first (works offline), fall back to API

Result: scanning the same item twice (e.g. eggs every week) shows product info before any network call.

---

### AI model config (cross-cutting, implement in Sprint 5)
> "Swap the AI model for any use case without touching service code"

- [x] `src/lib/aiConfig.ts` — centralised `AI_MODELS` constants, all env-driven
- [x] Update `mealPlanService.ts` to use `AI_MODELS.MEAL_PLAN`
- [x] Apply to all Sprint 5 AI services (price suggestions, reminders)
- [ ] Document override vars in `.env.example`

---

### Feedback channel (cross-cutting, implement in Sprint 6)
> "Users can report bugs, wrong prices, and request features from the app"

- [x] `Feedback` model — type (BUG|FEATURE_REQUEST|PRICE_ISSUE|GENERAL), subject, body, appVersion, platform
- [x] `POST /feedback` — authenticated, rate limited 5/hr
- [x] `FeedbackSheet` component — type picker, subject + body inputs, submit
- [x] Profile screen: "Send feedback" entry point
- [x] Scanner success: "Report wrong price" shortcut (pre-fills type=PRICE_ISSUE)

---

### Onboarding checklist + Did You Know tips (cross-cutting, implement in Sprint 5)
> "Interactive checklist drives first-week activation; tips teach advanced features at the right moment"

**Onboarding checklist (home screen card, disappears when all done)**
- [x] `completedActions String[]` field on UserProfile
- [x] `markActionComplete()` helper wired to: `PUT /profile`, `POST /plans/generate`, `POST /prices/observation`, `POST /purchases`, `POST /recipes/:id/cooked`
- [x] `OnboardingChecklist` component — progress bar, 5 action rows, auto-hides on completion
- [x] `GET /profile/checklist` route for home-screen progress refresh

**Did You Know tips (contextual, per-screen)**
- [ ] `TipBanner` component — dismissible strip with emoji + text
- [ ] AsyncStorage dismiss tracking (key: `tips_dismissed`)
- [ ] 7 contextual tips wired to: Home, Shopping list (first visit + first check-off), Pantry, Recipe detail, Rewards, Profile

---

### Announcements (cross-cutting feature, target Sprint 5)
> "Broadcast banners and modals to users without an app update"

Admin inserts rows directly into DB (no admin UI in V1). Mobile fetches on home screen mount and renders dismissible banners or one-per-session modals.

**Backend**
- [x] `Announcement` model — title, body, type (BANNER|MODAL), style (INFO|SUCCESS|WARNING|PROMO), targetTiers, ctaText, ctaDeepLink, startsAt, endsAt
- [x] `GET /announcements` — active + non-expired, filtered by user tier, Redis-cached 5min

**Mobile**
- [ ] `AnnouncementBanner` component — coloured strip, dismiss (persisted to AsyncStorage by announcement ID)
- [ ] Home screen: fetch + render banners below header
- [ ] MODAL type: shown once per cold-start session

**Use cases:** outage notices, feature launches, maintenance windows, tier-targeted promos ("Try Pro free")

---

### Sprint 8 — App store ready
> "Signed build on TestFlight and Play Store internal track"

- [ ] Production API keys, rate limiting audit
- [ ] PostHog analytics, Sentry error reporting
- [ ] EAS Build for iOS + Android
- [ ] App Store Connect + Google Play Console listings (screenshots, description, keywords)
- [ ] Privacy policy + ToS, `DELETE /account` (GDPR/CCPA)
- [ ] TestFlight build submitted, Play Store internal track uploaded
