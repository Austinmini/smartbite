# SmartBite

Mobile-first app that helps users eat well within their budget. AI-generated meal planning + real-time grocery price comparison across local supermarkets.

> **V1 is Texas-only.** Six chains: HEB, Central Market, Whole Foods, Walmart, Kroger, Aldi.

---

## What it does

- Set a weekly food budget, dietary goals, and up to 2 preferred stores
- Get a personalised AI-generated 7-day meal plan (via Claude)
- See live ingredient prices across your chosen stores
- Find the cheapest store — or a 2-store split if it saves $3+
- Save favourite recipes, track what you cook, get smarter plans over time

---

## Tech stack

| Layer | Tech |
|---|---|
| Mobile | React Native (Expo), Expo Router, Zustand, NativeWind |
| API | Fastify, TypeScript, Prisma, PostgreSQL (Supabase) |
| AI | Anthropic Claude (`claude-sonnet-4-6`) |
| Pricing | MealMe API, Kroger API |
| Auth | Supabase Auth |
| Jobs | BullMQ + Redis |
| Payments | RevenueCat |
| Monorepo | Turborepo + pnpm |

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
# Press w for web, i for iOS simulator, a for Android
```

**Environment setup:**

```bash
cp apps/api/.env.example apps/api/.env
# Fill in your keys
```

---

## Sprint progress

### Sprint 1 — Auth + onboarding + store discovery
> "I can sign up and tell the app about myself"

**Backend**
- [x] Monorepo setup (Turborepo, Expo, Fastify, Prisma, pnpm)
- [x] Supabase project + full schema migration
- [x] Auth routes: signup, login, logout, `/auth/me`
- [x] `GET /stores/nearby`
- [x] User profile CRUD

**Mobile**
- [x] Expo Router scaffold — 4 tabs, auth screens, recipe detail
- [x] Offline dependencies installed (netinfo, async-storage)
- [x] Rate limiting configured (`@fastify/rate-limit`)
- [x] Auth screens: login, signup — wired to API
- [x] Home screen empty state with "Generate plan" CTA
- [x] Onboarding flow: location → stores → budget → dietary → complete
- [x] Profile screen: stored preferences + edit links

---

### Sprint 2 — Meal plan generation
> "I can see a meal plan for my week"

- [x] AI meal plan generation (Claude)
- [x] `POST /plans/generate`, `GET /plans/current`, regenerate single meal
- [x] 7-day plan UI, recipe detail, nutrition card

---

### Sprint 3 — Grocery pricing
> "I know exactly where to shop and what it costs"

- [ ] MealMe + Kroger API clients
- [ ] Price scan with best single store + 2-store split optimizer
- [ ] Shopping list screen

---

### Sprint 4 — Favourites + collections
> "I can save recipes I love and organise them"

- [ ] Favourites + collections CRUD
- [ ] Heart toggle, collection picker, rating + notes

---

### Sprint 5 — Personalisation + price alerts
> "The app knows my taste and the plan gets smarter"

- [ ] Favourites-driven Claude prompt personalisation
- [ ] BullMQ price polling jobs
- [ ] Push notifications

---

### Sprint 6 — Subscriptions
> "I can subscribe and unlock everything"

- [ ] RevenueCat paywall + webhook
- [ ] Tier gates enforced end-to-end

---

### Sprint 7 — Barcode scanner + rewards
> "I can scan items and earn rewards"

- [ ] Barcode scanner (Vision Camera + ML Kit)
- [ ] Crowdsourced price observations
- [ ] Bites rewards currency + leaderboard

---

### Sprint 8 — App store ready
> "Signed build on TestFlight and Play Store internal track"

- [ ] EAS builds, Sentry, PostHog, app store listings
