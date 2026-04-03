# SmartBite — Claude Code Project Plan

## Project overview

SmartBite is a mobile-first app that helps users eat well within their budget. It combines AI-generated meal planning with real-time grocery price scouting across the user's preferred local supermarkets. Users set a weekly food budget, dietary goals, and preferred retailers — the app generates personalised recipes, finds the cheapest prices per ingredient across their chosen stores, and learns from their favourites over time.

---

## Launch scope — Texas only (V1)

> **V1 is Texas-only.** This reduces store coverage complexity, concentrates
> crowdsourced scan data for faster density, and limits support surface area.
> National expansion happens in V2, one state at a time.

### Texas store list — V1 (locked)

Six chains. No exceptions in V1.

| Chain | Relationship | TX Stores | Pricing Source | Notes |
|---|---|---|---|---|
| HEB | Independent | ~400 | MealMe | Dominant in Austin, SA, Houston |
| Central Market | HEB-owned | ~10 | MealMe (same as HEB) | Premium tier, same API surface |
| Whole Foods | Amazon-owned | ~37 | MealMe (Amazon umbrella) | Austin HQ, strong in major metros |
| Walmart | Walmart Inc. | ~600 | MealMe | Widest TX coverage, budget anchor |
| Kroger | Kroger Co. | ~200 | Kroger API + MealMe | Dallas/Houston strong |
| Aldi | Aldi Inc. | ~90 | MealMe + scrape fallback | Discount tier, no official API |

**Amazon Fresh is excluded from V1** — minimal physical TX footprint, primarily
a delivery brand. Whole Foods replaces it: same Amazon/MealMe API, far larger
walk-in presence across Austin, Houston, and Dallas.

**6 brands = 4 API integrations:**
- HEB + Central Market → 1 MealMe call (shared HEB backend)
- Whole Foods → 1 MealMe call (Amazon grocery umbrella)
- Walmart → 1 MealMe call
- Kroger → Kroger API (+ MealMe fallback)
- Aldi → MealMe (+ scrape fallback)

Explicitly excluded from V1: Amazon Fresh, Sprouts, Trader Joe's, Tom Thumb.

### What Texas-only removes from V1
- Zyte scraper API — not needed, MealMe + Kroger API covers all 6 V1 TX chains
- Multi-timezone push notification logic — all users in Central Time
- Nationwide leaderboard — replaced with city-level (Austin, Houston, Dallas, San Antonio)
- Sprouts, Trader Joe's, Tom Thumb — explicitly excluded from V1

### Store onboarding — V1 chain filter
Query MealMe for nearby stores on onboarding, filtered to V1 chains only.

```typescript
// src/data/txStores.ts

export const V1_SUPPORTED_CHAINS = [
  'heb',
  'centralmarket',
  'wholefoods',
  'walmart',
  'kroger',
  'aldi',
] as const

export type SupportedChain = typeof V1_SUPPORTED_CHAINS[number]

export const TX_STORE_SEED = [
  { name: 'HEB', chain: 'heb', tier: 'everyday', logo: { bg: '#E8F5E9', text: 'H', color: '#2E7D32' } },
  { name: 'Central Market', chain: 'centralmarket', tier: 'premium', logo: { bg: '#F3E5F5', text: 'CM', color: '#6A1B9A' }, note: 'HEB-owned' },
  { name: 'Whole Foods', chain: 'wholefoods', tier: 'premium', logo: { bg: '#EAF7EA', text: 'WF', color: '#1A6B1A' }, note: 'Amazon-owned' },
  { name: 'Walmart Supercenter', chain: 'walmart', tier: 'budget', logo: { bg: '#E3F2FD', text: 'W', color: '#1565C0' } },
  { name: 'Kroger', chain: 'kroger', tier: 'everyday', logo: { bg: '#E8F5E9', text: 'K', color: '#2E7D32' } },
  { name: 'Aldi', chain: 'aldi', tier: 'budget', logo: { bg: '#FFF8E1', text: 'A', color: '#F57F17' } },
]

// Filter MealMe results to V1 supported chains only
export function filterToV1Stores(stores: MealMeStore[]): MealMeStore[] {
  return stores.filter(s =>
    V1_SUPPORTED_CHAINS.some(chain =>
      s.name.toLowerCase().includes(chain) ||
      s.chain?.toLowerCase() === chain
    )
  )
}
```

### Geo-restriction enforcement
- App Store / Play Store: set to US availability only (Apple/Google don't support state-level)
- Onboarding: if location is outside Texas bounding box, show waitlist screen
- Texas bounding box: lat 25.84–36.50, lng -106.65 to -93.51

```prisma
model Waitlist {
  id        String   @id @default(cuid())
  email     String   @unique
  state     String?
  city      String?
  createdAt DateTime @default(now())
}
```

### V2 national expansion
TX → FL → CA → NY. One state at a time. Trigger: ~2,000 TX users with
~60% canonical price coverage signals the model is proven.

---

## Tech stack

### Mobile (frontend)
- **Framework**: React Native (Expo) — iOS + Android from one codebase
- **State management**: Zustand
- **Navigation**: Expo Router (file-based)
- **Styling**: NativeWind (Tailwind for React Native)
- **Animations**: React Native Reanimated

### Backend
- **Runtime**: Node.js 20 + TypeScript
- **Framework**: Fastify
- **ORM**: Prisma
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth (email + OAuth) — see Auth Strategy below
- **Job queue**: BullMQ + Redis (for background price polling jobs)
- **Hosting**: Railway or Fly.io

### AI & data APIs
- **Recipe generation + personalisation**: Anthropic Claude API (`claude-sonnet-4-6`)
- **Recipe database**: Spoonacular API
- **Nutrition data**: Edamam API + USDA FoodData Central (free)
- **Grocery pricing — primary**: MealMe API (100K+ stores, 200M SKUs)
- **Grocery pricing — chain-specific**: Kroger Developer API
  *(Instacart IDP was evaluated but dropped from V1 — Texas coverage is met by MealMe + Kroger. Reserved for national expansion.)*
- **Grocery pricing — fallback/scraping**: Zyte Scraper API *(reserved — post-V1 only, not used in Texas launch)*
- **Open food data**: Open Food Facts (free, no rate limits)

### Payments
- **Subscriptions**: RevenueCat (handles iOS + Android billing + webhooks)

---

## Auth strategy — one system, not two

> **Read this before building any auth code.** The test helper in Sprint 1
> signs JWTs with `JWT_SECRET_TEST`. Production uses Supabase-issued JWTs.
> These look identical to middleware but are verified differently.
> There is only one `verifyJWT` middleware — it handles both cases.

### Production flow

```
Mobile app → POST /auth/login
           → Supabase signInWithPassword()
           → Supabase returns { access_token, refresh_token }
           → access_token is a Supabase-signed JWT (RS256)
           → stored in mobile AsyncStorage via Supabase client

Mobile app → GET /profile  (Authorization: Bearer <access_token>)
           → verifyJWT middleware
           → calls supabaseServiceClient.auth.getUser(token)
           → Supabase verifies its own JWT signature
           → returns { user } or throws
           → middleware attaches user.id to request
```

**Key point:** Production NEVER manually verifies the JWT signature.
`supabaseServiceClient.auth.getUser(token)` does all verification —
expiry, signature, issuer — through Supabase's SDK. No `jsonwebtoken`
package needed in production middleware.

### Test flow

Tests cannot call Supabase Auth (no network, no credentials).
The test helper creates a synthetic JWT signed with `JWT_SECRET_TEST`:

```typescript
// apps/api/src/test/factories.ts
export async function createAuthToken(userId: string): Promise<string> {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET_TEST!, { expiresIn: '1h' })
}
```

`verifyJWT` middleware detects `NODE_ENV === 'test'` and switches strategy:

```typescript
// apps/api/src/middleware/auth.ts
export async function verifyJWT(request: FastifyRequest, reply: FastifyReply) {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) return reply.status(401).send({ error: 'Missing token' })

  if (process.env.NODE_ENV === 'test') {
    // Test path: verify with local secret — no Supabase call
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET_TEST!) as { sub: string }
      request.userId = payload.sub
      return
    } catch {
      return reply.status(401).send({ error: 'Invalid token' })
    }
  }

  // Production path: delegate to Supabase — never verify signature manually
  const { data, error } = await supabaseServiceClient.auth.getUser(token)
  if (error || !data.user) return reply.status(401).send({ error: 'Invalid token' })
  request.userId = data.user.id
}
```

### What this means for Claude Code

- **One middleware, one file** — `src/middleware/auth.ts`. Never create a second.
- **Never install `jsonwebtoken` for production use** — only for test helpers.
- **Never hardcode `JWT_SECRET_TEST` outside test files** — it must not exist in production env.
- **Token refresh** is handled by the Supabase client on mobile, not by the API.
  The API only receives already-valid tokens. If a token is expired, return 401 and
  let the mobile Supabase client auto-refresh.
- **Add `JWT_SECRET_TEST` to `.env.test` only**, not to `.env` or `.env.production`.

### Environment variables

```bash
# .env.test — test only
JWT_SECRET_TEST=any-long-random-string-used-only-in-tests

# .env — production (Supabase keys only, no JWT secret needed)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key   # used by verifyJWT in production
```

---

## Monorepo structure

```
smartbite/
├── apps/
│   ├── mobile/                  # React Native (Expo) app
│   │   ├── app/                 # Expo Router screens
│   │   │   ├── (auth)/          # Login, signup, onboarding
│   │   │   ├── (tabs)/          # Main tab navigator
│   │   │   │   ├── index.tsx    # Home / this week's plan
│   │   │   │   ├── explore.tsx  # Recipe discovery
│   │   │   │   ├── saved.tsx    # Favourites + collections
│   │   │   │   └── profile.tsx  # Settings, account, subscription
│   │   │   └── recipe/[id].tsx  # Recipe detail screen
│   │   ├── components/          # Shared UI components
│   │   ├── hooks/               # Custom hooks
│   │   ├── stores/              # Zustand state stores
│   │   └── lib/                 # API client, utils
│   │
│   └── api/                     # Fastify backend
│       ├── src/
│       │   ├── routes/          # Route handlers
│       │   ├── services/        # Business logic
│       │   ├── jobs/            # BullMQ background jobs
│       │   ├── lib/             # Third-party API clients
│       │   └── middleware/      # Auth, rate limiting, tier checks
│       └── prisma/
│           └── schema.prisma
│
├── packages/
│   └── shared/                  # Shared TypeScript types
│       └── src/types/
│
├── package.json                 # Workspace root
├── turbo.json                   # Turborepo config
└── CLAUDE.md                    # This file
```

---

## Database schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Subscription
  tier              Tier      @default(FREE)
  revenueCatUserId  String?

  // Profile
  profile           UserProfile?
  familyProfiles    FamilyProfile[]

  // App data
  mealPlans         MealPlan[]
  favourites        Favourite[]
  collections       Collection[]
  priceAlerts       PriceAlert[]
}

model UserProfile {
  id                 String    @id @default(cuid())
  userId             String    @unique
  user               User      @relation(fields: [userId], references: [id])

  // Budget + shopping
  weeklyBudget       Float
  location           Json      // { zip, lat, lng, city }
  preferredRetailers String[]  // max 2 entries, V1_SUPPORTED_CHAINS only
  maxStores          Int       @default(1)   // 1 or 2 — user opts into 2-store split
  locationRadius     Int       @default(10)  // miles — stores shown within this radius

  // Dietary
  dietaryGoals       String[]  // ["high-protein", "low-carb", "vegan"]
  allergies          String[]  // ["nuts", "gluten", "dairy"]
  cuisinePrefs       String[]  // ["Italian", "Mexican", "Asian"]
  cookingTimeMax     Int       // minutes
  servings           Int       @default(2)

  // Gamification (used by rewards engine — see rewardsService.ts)
  scanCount          Int       @default(0)
  priceContributions Int       @default(0)
  contributorScore   Float     @default(1.0) // weight multiplier in canonical price calc
}

model FamilyProfile {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  name              String
  dietaryGoals      String[]
  allergies         String[]
}

model MealPlan {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  createdAt         DateTime  @default(now())
  weekStarting      DateTime
  totalEstCost      Float
  meals             Meal[]
}

model Meal {
  id                String    @id @default(cuid())
  mealPlanId        String
  mealPlan          MealPlan  @relation(fields: [mealPlanId], references: [id])
  dayOfWeek         Int       // 0 = Monday, 6 = Sunday
  mealType          MealType  // BREAKFAST | LUNCH | DINNER | SNACK
  recipeId          String
  recipe            Recipe    @relation(fields: [recipeId], references: [id])
  estCost           Float
  bestStore         String
}

model Recipe {
  id                String    @id @default(cuid())
  externalId        String?   // Spoonacular ID
  source            String    // "spoonacular" | "ai_generated" | "user"
  title             String
  imageUrl          String?
  readyInMinutes    Int
  servings          Int
  ingredients       Json      // [{ name, amount, unit }]
  instructions      Json      // [{ step, text }]
  nutrition         Json      // { calories, protein, carbs, fat, ... }
  tags              String[]  // ["high-protein", "gluten-free", ...]
  cuisineType       String[]
  diets             String[]
  createdAt         DateTime  @default(now())

  meals             Meal[]
  favourites        Favourite[]
  priceSnapshots    PriceSnapshot[]
}

model Favourite {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  recipeId          String
  recipe            Recipe    @relation(fields: [recipeId], references: [id])
  savedAt           DateTime  @default(now())
  timesCooked       Int       @default(0)
  userRating        Int?      // 1-5
  notes             String?
  collectionIds     String[]

  @@unique([userId, recipeId])
}

model Collection {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  name              String
  emoji             String?
  recipeIds         String[]
  createdAt         DateTime  @default(now())
}

model PriceSnapshot {
  id                String    @id @default(cuid())
  recipeId          String
  recipe            Recipe    @relation(fields: [recipeId], references: [id])
  storeName         String
  storeId           String?
  totalCost         Float
  perIngredient     Json      // [{ ingredient, price, unit, storeId }]
  capturedAt        DateTime  @default(now())
}

model PriceAlert {
  id                String    @id @default(cuid())
  userId            String
  user              User      @relation(fields: [userId], references: [id])
  recipeId          String
  targetPrice       Float
  triggered         Boolean   @default(false)
  triggeredAt       DateTime?
  createdAt         DateTime  @default(now())
}

enum Tier {
  FREE
  PLUS
  PRO
}

model WebhookEvent {
  id              String   @id @default(cuid())
  source          String   // "revenuecat"
  externalEventId String   @unique  // dedup key — prevents double-processing
  processedAt     DateTime @default(now())
}

enum MealType {
  BREAKFAST
  LUNCH
  DINNER
  SNACK
}
```

---

## API routes

### Auth
```
POST   /auth/signup
POST   /auth/login
POST   /auth/logout
GET    /auth/me
```

### User profile & preferences
```
GET    /profile
PUT    /profile
PUT    /profile/retailers          # Update preferred store list
PUT    /profile/dietary            # Update dietary goals + allergies
GET    /profile/family             # Get family profiles (Pro only)
POST   /profile/family             # Add family profile (Pro only)
DELETE /profile/family/:id
```

### Meal planning (AI core)
```
POST   /plans/generate             # Generate a weekly meal plan
GET    /plans/current              # Current week's active plan (used by Home screen)
GET    /plans                      # Paginated history of past plans
GET    /plans/:id                  # Get a specific plan by ID
DELETE /plans/:id
POST   /plans/:id/regenerate-meal  # Regenerate a single meal in the plan
```

### Recipes
```
GET    /recipes/search             # Search Spoonacular + internal DB
GET    /recipes/:id                # Recipe detail + current prices
POST   /recipes/ai-generate        # Generate a custom recipe via Claude
```

### Pricing
```
GET    /prices/scan                # Scan prices for a recipe across user's stores
GET    /prices/compare             # Compare total plan cost across stores
POST   /prices/alert               # Set a price drop alert (Plus/Pro)
```

### Favourites & collections
```
GET    /favourites                 # List user's saved recipes
POST   /favourites                 # Save a recipe
DELETE /favourites/:recipeId       # Unsave
PUT    /favourites/:recipeId       # Update (rating, notes, timesCooked)

GET    /collections                # List collections
POST   /collections                # Create collection
PUT    /collections/:id            # Rename / update
DELETE /collections/:id
POST   /collections/:id/recipes    # Add recipe to collection
DELETE /collections/:id/recipes/:recipeId
```

### Health
```
GET    /health                     # Unauthenticated — checks MealMe, Kroger, Anthropic status
```

### Subscriptions
```
POST   /subscription/webhook       # RevenueCat webhook → update user tier
POST   /subscription/sync          # Mobile calls on launch — reconcile RevenueCat vs DB
GET    /subscription/status        # Current tier + limits
```

---

## Freemium tier gates (middleware)

Apply `checkTier` middleware to enforce limits per route:

```typescript
// src/middleware/tierGate.ts

export const TIER_LIMITS = {
  FREE: {
    mealPlansPerWeek: 2,
    storesPerScan: 1,
    maxFavourites: 10,
    maxCollections: 1,
    aiPersonalisation: false,
    priceAlerts: false,
    nutritionDeepDive: false,
    familyProfiles: 0,
    crossStoreComparison: false,
  },
  PLUS: {
    mealPlansPerWeek: 7,
    storesPerScan: 2,  // V1 cap: users can only save 2 stores; Plus unlocks cross-store comparison across both. Raise in V2 when national expansion adds more chains.
    maxFavourites: Infinity,
    maxCollections: Infinity,
    aiPersonalisation: true,
    priceAlerts: true,
    nutritionDeepDive: false,
    familyProfiles: 0,
    crossStoreComparison: true,
  },
  PRO: {
    mealPlansPerWeek: Infinity,
    storesPerScan: 2,  // V1 cap: same as Plus. Infinity in V2 when national expansion adds more chains.
    maxFavourites: Infinity,
    maxCollections: Infinity,
    aiPersonalisation: true,
    priceAlerts: true,
    nutritionDeepDive: true,
    familyProfiles: 5,
    crossStoreComparison: true,
  },
} as const
```

---

## AI meal plan generation (Claude)

```typescript
// src/services/mealPlanService.ts

import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface GeneratePlanInput {
  profile: UserProfile
  favourites?: FavouriteSummary[]   // passed for Plus/Pro users
  weekBudget: number
  numDays?: number
}

export async function generateMealPlan(input: GeneratePlanInput) {
  const { profile, favourites, weekBudget } = input

  const personalisationContext = favourites?.length
    ? `The user's most-cooked favourites are: ${favourites
        .slice(0, 5)
        .map(f => `${f.title} (cooked ${f.timesCooked}x, rated ${f.userRating}/5)`)
        .join(", ")}. Use these as a guide for their taste preferences.`
    : ""

  const prompt = `You are a nutritionist and meal planning assistant.

Generate a 7-day meal plan (breakfast, lunch, dinner) for a user with these requirements:
- Weekly food budget: $${weekBudget}
- Dietary goals: ${profile.dietaryGoals.join(", ") || "balanced"}
- Allergies / restrictions: ${profile.allergies.join(", ") || "none"}
- Preferred cuisines: ${profile.cuisinePrefs.join(", ") || "any"}
- Max cooking time per meal: ${profile.cookingTimeMax} minutes
- Servings per meal: ${profile.servings}
${personalisationContext}

Respond ONLY with a valid JSON object in this exact shape:
{
  "totalEstCost": number,
  "days": [
    {
      "dayOfWeek": 0,
      "meals": [
        {
          "mealType": "BREAKFAST" | "LUNCH" | "DINNER",
          "title": string,
          "estCostPerServing": number,
          "readyInMinutes": number,
          "tags": string[],
          "ingredients": [{ "name": string, "amount": number, "unit": string }],
          "instructions": [{ "step": number, "text": string }],
          "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number }
        }
      ]
    }
  ]
}`

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const clean = text.replace(/```json|```/g, "").trim()
  return JSON.parse(clean)
}
```

---

## Grocery price scouting service

```typescript
// src/services/pricingService.ts

interface ScanInput {
  ingredients: { name: string; amount: number; unit: string }[]
  userLocation: { lat: number; lng: number; zip: string }
  preferredRetailers: string[]
  maxStores: number   // from tier limits
}

interface StoreResult {
  storeName: string
  storeId: string
  totalCost: number
  items: { ingredient: string; price: number; unit: string; available: boolean }[]
}

export async function scanPrices(input: ScanInput): Promise<StoreResult[]> {
  const storesToScan = input.preferredRetailers.slice(0, input.maxStores)

  // 1. Query MealMe API for each store
  const results = await Promise.all(
    storesToScan.map(store => queryMealMe(store, input.ingredients, input.userLocation))
  )

  // 2. Fill gaps with Kroger API where applicable
  // 3. Fall back to Zyte scraper for stores not in MealMe (post-V1 only)

  return results.sort((a, b) => a.totalCost - b.totalCost)
}

async function queryMealMe(
  storeName: string,
  ingredients: ScanInput["ingredients"],
  location: ScanInput["userLocation"]
): Promise<StoreResult> {
  const response = await fetch("https://api.mealme.ai/v3/grocery/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.MEALME_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      store_name: storeName,
      location: { lat: location.lat, lng: location.lng },
      items: ingredients.map(i => ({ query: i.name, quantity: i.amount, unit: i.unit })),
    }),
  })
  return response.json()
}
```

---

## Background jobs (BullMQ)

```typescript
// src/jobs/pricePollingJob.ts
// Runs every 6 hours for Plus/Pro users with active price alerts

import { Queue, Worker } from "bullmq"

export const pricePollingQueue = new Queue("price-polling", {
  connection: { host: process.env.REDIS_HOST, port: 6379 },
})

export const pricePollingWorker = new Worker(
  "price-polling",
  async job => {
    const { userId, recipeId, targetPrice, alertId } = job.data
    const result = await scanPrices({ /* ... */ })
    // scanPrices returns ScanResult — use bestSingleStore for alert comparison
    const bestStore = result.bestSingleStore

    if (bestStore.totalCost <= targetPrice) {
      await sendPushNotification(userId, {
        title: "Price drop!",
        body: `Your recipe is now $${bestStore.totalCost.toFixed(2)} at ${bestStore.storeName}`,
      })
      await markAlertTriggered(alertId)
    }
  },
  { connection: { host: process.env.REDIS_HOST, port: 6379 } }
)
```

---

## Environment variables

```bash
# .env

# Database
DATABASE_URL=postgresql://user:password@host:5432/smartbite

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# AI
ANTHROPIC_API_KEY=sk-ant-...

# Recipe + Nutrition APIs
SPOONACULAR_API_KEY=your-key
EDAMAM_APP_ID=your-id
EDAMAM_APP_KEY=your-key

# Grocery Pricing APIs
MEALME_API_KEY=your-key
KROGER_CLIENT_ID=your-id
KROGER_CLIENT_SECRET=your-secret
INSTACART_API_KEY=your-key
ZYTE_API_KEY=your-key

# Infrastructure
REDIS_HOST=localhost
REDIS_PORT=6379

# Payments
REVENUECAT_WEBHOOK_SECRET=your-secret

# App
NODE_ENV=development
PORT=3000
```

---

## Mobile screens (Expo Router)

```
app/
├── (auth)/
│   ├── login.tsx               # Email + OAuth login
│   ├── signup.tsx              # Sign up
│   └── onboarding/
│       ├── budget.tsx          # Set weekly budget
│       ├── retailers.tsx       # Pick preferred stores (location-aware)
│       ├── dietary.tsx         # Goals, allergies, cuisine prefs
│       └── complete.tsx        # Ready — generate first plan
│
├── (tabs)/
│   ├── _layout.tsx             # Tab bar config
│   ├── index.tsx               # Home: this week's meal plan
│   ├── explore.tsx             # Discover recipes (Spoonacular browse)
│   ├── saved.tsx               # Favourites + collections
│   └── profile.tsx             # Account, preferences, subscription
│
└── recipe/
    └── [id].tsx                # Recipe detail, price comparison, favourite btn
```

---

## Key component list (mobile)

```
components/
├── MealPlanCard.tsx            # Week grid with meal tiles
├── RecipeCard.tsx              # Card with image, cost, tags
├── RecipeDetail.tsx            # Full recipe view
├── PriceCompareBar.tsx         # Store vs store cost comparison
├── FavouriteButton.tsx         # Heart toggle with animation
├── CollectionPicker.tsx        # Sheet: save to collection
├── StoreSelector.tsx           # Retailer multi-select with location
├── BudgetGauge.tsx             # Visual weekly spend tracker
├── TierGatePrompt.tsx          # Upgrade prompt when hitting a limit
├── NutritionCard.tsx           # Macro breakdown (Pro)
└── OnboardingStep.tsx          # Reusable onboarding wrapper
```

---

## Implementation order — deliverable-first sprints

> **Rule:** Every sprint ends with a working, installable build you can open on a
> simulator or physical device and demo end-to-end. No sprint is "backend only."
> Each sprint's deliverable is described first — that is the definition of done.

---

### Sprint 1 — "I can sign up and tell the app about myself"
**Duration:** Week 1–2
**Deliverable:** Install the app on simulator. Create an account. Complete onboarding
(budget, nearby stores auto-populated by location, dietary goals). Land on a home
screen with an empty state that says "Generate your first meal plan."

**What you can demo:**
- Splash screen → Sign up / Log in
- Location permission prompt → nearby stores auto-loaded and sorted by distance
- Store selector (pick up to 2, greyed-out UI after 2)
- Budget input screen
- Dietary goals + allergies screen
- Home screen with empty state + "Generate plan" CTA

**Backend tasks:**
- [x] Monorepo setup (Turborepo, Expo, Fastify, Prisma, pnpm)
- [ ] Supabase project + full schema migration (ALL models including rewards/scanner groundwork) — schema written, Supabase project + migration pending
- [ ] Auth: signup, login, logout, JWT middleware, `/auth/me`
- [ ] `GET /stores/nearby` — query MealMe store search by lat/lng, return sorted by distance
- [ ] User profile CRUD — budget, retailers (max 2), dietary, location

**Mobile tasks:**
- [x] Expo Router scaffold with tab navigator (4 tabs in S1–S6: Home, Plan, Shop, Saved — Rewards tab added in Sprint 7)
- [x] Install offline dependencies: `@react-native-community/netinfo`, `@react-native-async-storage/async-storage`
- [x] Install rate limiting: `@fastify/rate-limit` (configured in Sprint 1, limits added per-sprint)
- [x] Auth screens: login, signup — screens exist, not yet wired to API
- [ ] Onboarding flow: location permission → store selector → budget → dietary → complete
- [x] Home screen: empty state with "Generate plan" button (button is non-functional until Sprint 2)
- [ ] Profile screen: shows stored preferences, edit links

**Definition of done:**
```
✓ App installs on iOS Simulator (npx expo start)
✓ Can create account with email + password
✓ Location permission granted → nearby stores appear sorted by distance
✓ Can select up to 2 stores (3rd selection is blocked)
✓ Budget and dietary prefs saved and visible on Profile screen
✓ Home screen shows correct empty state
✓ Closing and reopening the app restores logged-in session
```

---

### Sprint 2 — "I can see a meal plan for my week"
**Duration:** Week 3–4
**Deliverable:** Tap "Generate plan" on the home screen. See a real AI-generated
7-day meal plan with breakfast, lunch and dinner for each day. Tap any meal to see
the full recipe — ingredients, steps, nutrition. Plan is saved and persists across
app restarts.

**What you can demo:**
- Tap "Generate plan" → loading state → 7-day plan appears
- Day-by-day grid with meal tiles (name, cook time, est. cost)
- Tap a meal → Recipe detail screen (full ingredients + steps)
- Nutrition summary card on recipe detail
- "Regenerate this meal" button on recipe detail
- Plan persists after closing and reopening the app

**Backend tasks:**
- [ ] Claude `generateMealPlan` service (claude-sonnet-4-6, full prompt from CLAUDE.md)
- [ ] `POST /plans/generate` with tier gate (2/week for free tier, Redis counter)
- [ ] `GET /plans/current` — returns the active plan for the current week (used by Home screen)
- [ ] `GET /plans` — paginated history, used by a future "past plans" screen
- [ ] `GET /plans/:id/meals/:mealId` — single meal detail
- [ ] `POST /plans/:id/regenerate-meal` — regenerate one meal slot
- [ ] Spoonacular fallback for recipe image lookup by title

**Mobile tasks:**
- [ ] `MealPlanCard` component — 7-day grid, day tabs, meal type rows
- [ ] `RecipeCard` component — image, title, time, cost pill, tags
- [ ] Recipe detail screen — hero image, ingredient list, step-by-step instructions
- [ ] `NutritionCard` component — calories, protein, carbs, fat
- [ ] Loading skeleton while plan generates (~8–12s for Claude call)
- [ ] Error state if generation fails with retry button
- [ ] "Generate plan" button on home wired to `POST /plans/generate`

**Definition of done:**
```
✓ Tapping "Generate plan" shows a loading indicator within 1s
✓ A real 7-day plan appears (not mock data) within 15s
✓ Every meal has a title, cook time, and estimated cost per serving
✓ Tapping a meal opens the full recipe with ingredients and steps
✓ Nutrition card shows real values
✓ Plan is still there after force-closing and reopening the app
✓ Tapping "Regenerate this meal" swaps just that meal slot
✓ Free user sees a counter: "2 of 2 plans used this week"
```

---

### Sprint 3 — "I know exactly where to shop and what it costs"
**Duration:** Week 5–6
**Deliverable:** On any recipe detail screen, see real prices for every ingredient
at your chosen stores. See which store is cheapest for the full recipe. Toggle to
a 2-store split view if it saves more than $3. Shopping list auto-generated and
checkable.

**What you can demo:**
- Recipe detail screen now shows live ingredient prices per store
- "Best store" card with total cost and distance
- Toggle between "1-store" and "2-store split" views
- Side-by-side store comparison strip at the top
- Tap "Get shopping list" → checklist screen grouped by store
- Tap an ingredient on the list to check it off

**Backend tasks:**
- [ ] MealMe API client — `queryMealMe`, response normalisation, error handling
- [ ] Kroger API client — OAuth2, product search, price extraction
- [ ] `scanPrices` orchestrator — fan out to user's stores, compute `bestSingleStore` + `bestSplitOption`
- [ ] Split optimizer — greedy per-ingredient algorithm, `SPLIT_THRESHOLD = $3`
- [ ] `GET /prices/scan?recipeId=&planId=` with store count tier gate
- [ ] Redis price cache — 1hr TTL per `(recipeId, storeList)` hash
- [ ] `GET /shopping-list/:planId` — full week's ingredients merged, deduped, sorted by store

**Mobile tasks:**
- [ ] Price section on recipe detail — ingredient rows with per-store prices
- [ ] `PriceCompareBar` component — store comparison strip
- [ ] `BestStoreCard` component — winner card with distance, total, savings callout
- [ ] Mode toggle — "Best single store" / "2-store split"
- [ ] Split view — two store cards with their assigned items
- [ ] Shopping list screen — grouped by store, checkable rows, progress bar
- [ ] "Add to this week's plan" CTA on recipe detail

**Definition of done:**
```
✓ Recipe detail shows real prices from at least 1 live store (not mock data)
✓ "Best store" correctly identifies cheapest option across user's 2 stores
✓ 2-store split option only appears when savings >= $3
✓ Shopping list generates correctly for a full week plan
✓ Checking off an item persists (survives app restart)
✓ Prices load within 5s (Redis cache hit: <500ms, API miss: <5s)
✓ If MealMe returns no data for a store, graceful fallback shown
```

---

### Sprint 4 — "I can save recipes I love and organise them"
**Duration:** Week 7
**Deliverable:** Heart any recipe to save it. Open the Saved tab and see all
favourites organised into collections. Sort by most cooked or most recent.
Add personal notes and a rating to any saved recipe. One-tap to re-add a
favourite to this week's plan.

**What you can demo:**
- Heart button on recipe detail — tap to save, tap again to unsave (animated)
- Collection picker sheet slides up after saving
- Saved tab: Collections grid view and All saved list view
- Most cooked tab — sorted by `timesCooked`
- Long-press a saved recipe → rate it (1–5 stars) + add notes
- "Cook again" button re-adds to current week's plan in one tap

**Backend tasks:**
- [ ] Favourites CRUD — `POST/DELETE /favourites`, `PUT /favourites/:recipeId`
- [ ] Collections CRUD — `GET/POST/PUT/DELETE /collections`
- [ ] `POST/DELETE /collections/:id/recipes`
- [ ] `GET /favourites?sort=recent|mostCooked` with pagination

**Mobile tasks:**
- [ ] `FavouriteButton` — heart toggle with pop animation (Reanimated)
- [ ] `CollectionPicker` bottom sheet — list + "New collection" input
- [ ] Saved screen — 3 tabs: Collections grid, All saved, Most cooked
- [ ] Collection detail screen — recipes inside a collection
- [ ] Rating + notes bottom sheet (long-press trigger)
- [ ] "Cook again" shortcut on saved recipe card

**Definition of done:**
```
✓ Tapping heart saves recipe and shows collection picker immediately
✓ Saved recipes persist across app restarts
✓ Collections can be created, renamed, and deleted
✓ "Most cooked" sort is accurate (reflects timesCooked field)
✓ Rating and notes are saved and visible on next open
✓ "Cook again" successfully adds the recipe to the current week's plan
✓ Empty state shown when no favourites yet
```

---

### Sprint 5 — "The app knows my taste and the plan gets smarter"
**Duration:** Week 8
**Deliverable:** Generate a new meal plan after having saved and rated recipes.
The new plan visibly reflects your preferences — cuisine types, cook times,
dishes similar to your 5-star ratings. A "Why this?" label on each meal card
explains the personalisation. Price drop alerts can be set on any recipe.

**What you can demo:**
- Generate plan → meals reflect saved recipe patterns (visible improvement)
- Each meal card shows a small "Personalised for you" tag
- Tap tag → "Why this?" sheet explaining the match
- Set a price alert on a recipe (Plus gate shown to free users)
- Demo a simulated price drop push notification

**Backend tasks:**
- [ ] Favourites summary builder — extract taste patterns from saved recipes
- [ ] Updated Claude prompt — inject favourites context for Plus/Pro users
- [ ] BullMQ + Redis setup for background jobs
- [ ] Price polling job — runs every 6h, checks canonical + MealMe against alert target
- [ ] `POST /prices/alert`, `GET /prices/alerts`, `DELETE /prices/alerts/:id`
- [ ] Push notification service (Expo Notifications)

**Mobile tasks:**
- [ ] "Personalised" tag on meal cards (Plus/Pro only)
- [ ] "Why this?" explanation bottom sheet
- [ ] Price alert UI on recipe detail — set target price, view active alerts
- [ ] Notification permission request flow
- [ ] Alert triggered screen / notification deep-link

**Definition of done:**
```
✓ Plan generated after 5+ saves is noticeably different from the first plan
✓ "Why this?" sheet shows a coherent explanation (not generic text)
✓ Price alert can be created and appears in active alerts list
✓ Free user sees upgrade prompt when tapping "Set alert"
✓ Simulated alert push notification opens the correct recipe
✓ Background job runs without crashing (verify in Railway/Fly logs)
```

---

### Sprint 6 — "I can subscribe and unlock everything"
**Duration:** Week 9
**Deliverable:** Full paywall flow working end-to-end on a physical device.
Free user hits a gate → sees upgrade prompt → taps upgrade → completes
purchase in sandbox → tier updates instantly → gated features unlock without
restarting the app.

**What you can demo:**
- Free user exhausts 2 weekly plans → gate prompt appears
- Tap "Upgrade to Plus" → RevenueCat paywall sheet
- Complete sandbox purchase on device
- Return to app — tier updates, gates lift, counter resets
- Profile screen shows active subscription + renewal date
- Downgrade / cancel flow

**Backend tasks:**
- [ ] RevenueCat webhook handler — verify signature, update `user.tier`
- [ ] `GET /subscription/status` — current tier, limits, renewal date
- [ ] All tier gates wired to live DB tier (not hardcoded)

**Mobile tasks:**
- [ ] RevenueCat SDK configured with products
- [ ] `TierGatePrompt` component — contextual upgrade prompt per gate
- [ ] Paywall screen — 3-tier comparison (Free / Plus / Pro)
- [ ] Purchase success animation + tier update without app restart
- [ ] Profile subscription card — tier badge, renewal date, manage link
- [ ] Restore purchases flow

**Definition of done:**
```
✓ Sandbox purchase completes successfully on physical iOS or Android device
✓ User tier updates within 5s of purchase completion (webhook received)
✓ Gated features unlock immediately after purchase (no restart)
✓ Profile screen shows correct tier and renewal date
✓ Restore purchases correctly identifies existing entitlement
✓ Free tier gates fire at correct thresholds (2 plans/week, 1 store, 10 favourites)
```

---

### Sprint 7 — "I can scan items and earn rewards"
**Duration:** Week 10–11
**Deliverable:** Open the scanner from the shopping list screen. Scan a real
grocery barcode. App identifies the product and shows the price you're paying.
Confirm the price. Bites are awarded with the celebration screen. Open the
Rewards tab and see your balance, streak, badges, and the community leaderboard.

**What you can demo:**
- Shopping list → camera icon → scanner opens
- Point camera at any grocery barcode → product identified within 2s
- Price confirmation screen — verify the shelf price
- Submit → celebration screen with confetti, Bites counter animating up, breakdown
- Community impact line: "Your scans helped X families save $Y this month"
- Rewards tab — balance, streak flame, progress bars, badges, leaderboard

**Backend tasks:**
- [ ] `GET /products/lookup/:upc` — Open Food Facts → USDA → Product table cache
- [ ] `POST /prices/observation` — write scan, trigger canonical recompute
- [ ] `processScanReward` service — base + pioneer + stale + streak logic
- [ ] Canonical price recompute job (BullMQ)
- [ ] `GET /rewards/balance`, `/rewards/ledger`, `/rewards/leaderboard`, `/rewards/badges`
- [ ] `GET /community/impact` — cached hourly per city

**Mobile tasks:**
- [ ] Scanner screen — Vision Camera + ML Kit barcode scanning
- [ ] Product confirm screen — name, image, price input, store shown
- [ ] Celebration screen — confetti, animated Bites counter, breakdown, community line
- [ ] Rewards tab (5th nav item — replace or add)
- [ ] Balance card with streak flame
- [ ] Progress bars (weekly goal, next badge threshold)
- [ ] Badge grid (earned + locked)
- [ ] Neighbourhood leaderboard

**Definition of done:**
```
✓ Scanner opens on physical device (not just simulator — camera required)
✓ Real grocery barcode scanned and product identified correctly
✓ Price confirmation screen pre-fills product name and store
✓ Submission writes to PriceObservation table (verify in DB)
✓ Bites awarded correctly (base + any applicable bonuses)
✓ Celebration screen animates Bites counter from 0 to earned amount
✓ Rewards tab shows correct balance and streak
✓ Leaderboard shows at least the current user's position
```

---

### Sprint 8 — "App store ready"
**Duration:** Week 12
**Deliverable:** A signed build submitted to TestFlight (iOS) and Google Play
internal track (Android). All flows work on a real device with real API keys.
Rate limiting, analytics, and error reporting active.

**What you can demo:**
- Install from TestFlight link — full end-to-end on real device
- All 7 sprints' features working together
- Push notifications arriving
- Subscription purchase working in production (not sandbox)

**Tasks:**
- [ ] Production API keys for all services (MealMe, Kroger, Anthropic, RevenueCat)
- [ ] Rate limiting audit — confirm all endpoints added in Sprints 1–7 have limits applied (endpoint limits are set per-sprint; this sprint audits coverage)
- [ ] PostHog analytics — key events tracked (plan generated, recipe saved, scan submitted, subscription purchased)
- [ ] Sentry error reporting — mobile + API
- [ ] EAS Build configured for iOS + Android production builds
- [ ] App Store Connect: app record, screenshots (6.7", 5.5", iPad), description, keywords
- [ ] Google Play Console: app record, store listing, content rating
- [ ] Privacy policy + terms of service hosted URL
- [ ] GDPR / data deletion endpoint (`DELETE /account`)
- [ ] TestFlight build submitted and invite link generated
- [ ] Play Store internal track build uploaded

**Definition of done:**
```
✓ TestFlight install link works for external testers
✓ All 7 sprint features work end-to-end on a physical device from TestFlight
✓ Subscription purchase completes in production (real charge)
✓ Push notifications arrive on physical device
✓ Sentry captures at least one test error correctly
✓ PostHog dashboard shows real events from test session
✓ App Store and Play Store listings have all required assets
```

---

## Cost control strategies

- **Cache price scans in Redis for 1 hour** — don't re-query MealMe if the user refreshes
- **Cache Spoonacular recipe data** — recipe content doesn't change; cache indefinitely
- **Batch Claude token usage** — generate a full 7-day plan in one API call, not 21 separate calls
- **Rate-limit free users at the API level** — enforce `mealPlansPerWeek` counter in Redis, not just DB
- **Use Spoonacular for recipe lookup, Claude only for personalisation** — Spoonacular is cheaper per call than generating from scratch
- **Zyte scraper: post-V1 only** — not used in the Texas launch. MealMe + Kroger API cover all 6 V1 chains. Reserved for national expansion where store coverage gaps appear.

---

## Store selection logic (updated)

### User store preferences
Users select up to **2 preferred stores** (not unlimited). This is enforced in the UI and stored as `maxStores: 1 | 2` in the user profile.

*(These fields — `maxStores`, `preferredRetailers`, `locationRadius` — are now part of the canonical `UserProfile` model in the Prisma schema. No additions needed.)*

### Location-aware store discovery
On onboarding (and whenever user location shifts >5 miles), query nearby stores:

```typescript
// src/services/storeDiscoveryService.ts
export async function getNearbyStores(lat: number, lng: number, radiusMiles = 10) {
  // 1. Query MealMe store search endpoint with lat/lng
  // 2. Augment with Google Places API for stores not in MealMe
  // 3. Return sorted by distance, max 12 results
  // 4. Cache result in Redis for 24h per location hash
}
```

### Price scan output shape
`scanPrices` now returns both single-store and split options:

```typescript
interface ScanResult {
  bestSingleStore: {
    storeName: string
    storeId: string
    totalCost: number
    distanceMiles: number
    items: IngredientPrice[]
  }
  bestSplitOption: {
    totalCost: number
    savings: number            // vs bestSingleStore.totalCost
    worthSplitting: boolean    // true only if savings >= SPLIT_THRESHOLD ($3)
    stores: {
      storeName: string
      storeId: string
      distanceMiles: number
      subtotal: number
      items: IngredientPrice[]
    }[]
  } | null                     // null if user has only 1 store selected
}

const SPLIT_THRESHOLD = 3.00  // only surface split if it saves >= $3
```

### Split optimizer algorithm
```typescript
function computeBestSplit(stores: StoreResult[]): SplitOption {
  // Greedy per-ingredient assignment:
  // For each ingredient, assign to whichever store has the lower price
  // Then compare total vs best single store
  // Only return split if savings >= SPLIT_THRESHOLD
}
```

---

## Stretch goal — Barcode scanner + crowdsourced pricing

> **Status: Future iteration (v2). Lay groundwork now, build later.**
> Do NOT build the camera UI in v1. DO add the DB models and API endpoint so data
> can be accepted the moment the scanner is ready.

### Why this matters
Every user scan is a real, timestamped price observation at a specific store. Over time
this becomes a proprietary pricing database that is more local and more accurate than
MealMe/Kroger APIs — and eliminates API costs at scale.

### Two features, one scan action
1. **Shopping list completion** — scan a barcode → match to item on list → check it off
2. **Price reporting** — after scan, capture the price → write to `PriceObservation` table

Both happen in the same camera session. Zero extra friction for the user.

### Mobile dependencies to install now (even if not used yet)
```bash
# In apps/mobile
pnpm add react-native-vision-camera
pnpm add vision-camera-code-scanner   # barcode scanning
pnpm add @react-native-ml-kit/barcode-scanning  # ML Kit barcode
pnpm add @react-native-ml-kit/text-recognition  # OCR for shelf labels (v2)
```

Add to `app.json` (required for camera permissions):
```json
{
  "plugins": [
    ["react-native-vision-camera", {
      "cameraPermissionText": "SmartBite needs camera access to scan grocery items",
      "enableMicrophonePermission": false
    }]
  ]
}
```

### New Prisma models (add in Sprint 1, do not defer)

```prisma
model PriceObservation {
  id              String   @id @default(cuid())
  upc             String                        // barcode
  productName     String?                       // from Open Food Facts lookup
  storeId         String
  storeName       String
  storeLocation   Json                          // { lat, lng, address }
  price           Float
  unitSize        String?                       // "16oz", "1lb", etc
  unitPrice       Float?                        // price / unitSize for comparison
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  scannedAt       DateTime @default(now())
  confidence      Float    @default(1.0)        // 0-1, decays with age
  verified        Boolean  @default(false)      // true if matches other users' scans
  
  @@index([upc, storeId])
  @@index([storeId, scannedAt])
}

model CanonicalPrice {
  id              String   @id @default(cuid())
  upc             String
  storeId         String
  storeName       String
  weightedPrice   Float                         // computed median from observations
  observationCount Int
  lastUpdated     DateTime @updatedAt
  staleBefore     DateTime                      // observations older than this ignored
  
  @@unique([upc, storeId])
  @@index([upc])
}

model Product {
  id              String   @id @default(cuid())
  upc             String   @unique
  name            String
  brand           String?
  category        String?
  imageUrl        String?
  unitSize        String?
  source          String   // "open_food_facts" | "usda" | "user_submitted"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

Add relation to User model:
```prisma
// In User model, add:
priceObservations PriceObservation[]
```

### New API endpoint (build in Sprint 1, wire to scanner in v2)

```
POST /prices/observation     # Accept a scanned price report
GET  /products/lookup/:upc   # Look up product by barcode → Open Food Facts → cache
```

```typescript
// src/routes/prices.ts (add to existing file)

// POST /prices/observation
// Accepts: { upc, storeId, storeName, storeLocation, price, unitSize? }
// Auth required. Rate limited to 50 scans/day per user (prevent abuse).
// Writes to PriceObservation. Triggers async canonical price recompute.

// GET /products/lookup/:upc
// 1. Check Product table first (cache)
// 2. Query Open Food Facts API: https://world.openfoodfacts.org/api/v3/product/{upc}
// 3. If not found, query USDA FoodData Central
// 4. Cache result in Product table
// 5. Return: { upc, name, brand, imageUrl, unitSize, category }
```

### Canonical price recompute job (BullMQ)

```typescript
// src/jobs/canonicalPriceJob.ts
// Triggered: after every 10 new observations for a (upc, storeId) pair
// Also runs on a nightly cron for all storeIds

export async function recomputeCanonicalPrice(upc: string, storeId: string) {
  const cutoff = subDays(new Date(), 7)  // only use last 7 days of observations
  
  const observations = await prisma.priceObservation.findMany({
    where: { upc, storeId, scannedAt: { gte: cutoff } },
    orderBy: { scannedAt: 'desc' },
  })

  if (observations.length < 3) return  // not enough data to be reliable

  // Weighted median: more recent observations weighted higher
  const weightedPrices = observations.map((obs, i) => ({
    price: obs.price,
    weight: Math.pow(0.9, i),  // exponential decay by recency
  }))

  const weightedMedian = computeWeightedMedian(weightedPrices)

  await prisma.canonicalPrice.upsert({
    where: { upc_storeId: { upc, storeId } },
    update: {
      weightedPrice: weightedMedian,
      observationCount: observations.length,
      staleBefore: cutoff,
    },
    create: { upc, storeId, storeName: observations[0].storeName, weightedPrice: weightedMedian, observationCount: observations.length, staleBefore: cutoff },
  })
}
```

### Updated price lookup priority (scanPrices service)

```typescript
// Priority order for ingredient price lookup:
// 1. CanonicalPrice table (our crowdsourced DB) — if observationCount >= 3 and not stale
// 2. MealMe API — if canonical miss
// 3. Kroger API — if MealMe miss or store not in MealMe
// 4. Zyte scraper — last resort (post-V1 only, not active in Texas launch)
// 5. Spoonacular cost estimate — fallback if all else fails
```

### Scanner screen (build in v2, file path reserved)

```
apps/mobile/app/scanner/
├── index.tsx         # Camera view + barcode overlay
├── confirm.tsx       # "Is this right?" product confirmation + price entry
└── success.tsx       # Item checked off + "price reported, thanks!"
```

### Open Food Facts API (free, no key required)

```typescript
// src/lib/openFoodFacts.ts
const OFF_BASE = 'https://world.openfoodfacts.org/api/v3'

export async function lookupByUpc(upc: string) {
  const res = await fetch(`${OFF_BASE}/product/${upc}?fields=product_name,brands,image_url,quantity`)
  const data = await res.json()
  if (data.status !== 'success') return null
  return {
    name: data.product.product_name,
    brand: data.product.brands,
    imageUrl: data.product.image_url,
    unitSize: data.product.quantity,
  }
}
```

### Gamification + rewards system (plant seeds now, build in v2)

> **Status: Future iteration (v2). Add DB models and reward logic engine now.**
> The Bites currency, leaderboard, and badge system are v2 features.
> The DB schema and earn/spend ledger must be added in Sprint 1.

---

#### Reward currency: Bites

Bites are the in-app reward currency. Framing: "helping your neighbours save money."
100 Bites = $1.00 in redemption value (subscription discount or partner coupon).

**Earn rates:**
| Action | Bites |
|---|---|
| First scan ever (welcome bonus) | +50 |
| Any price scan | +5 |
| Pioneer scan (first scan at new store in DB) | +15 |
| Scan verified by another user within 48h | +3 |
| Updating a stale price (>5 days old) | +5 |
| 7-day scanning streak | +25 |
| 30-day scanning streak | +100 |
| Weekly scan goal hit (20 scans) | +50 |

**Redemption:**
- 1,000 Bites = $10 off next month's subscription
- 500 Bites = partner grocery coupon (future partnership)
- Never expire (don't punish inactivity)

---

#### Prisma models (add in Sprint 1)

```prisma
model BitesLedger {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  amount      Int                           // positive = earn, negative = spend
  reason      BitesReason
  referenceId String?                       // observationId, streakId, etc
  createdAt   DateTime    @default(now())

  @@index([userId, createdAt])
}

model BitesBalance {
  userId      String   @unique
  user        User     @relation(fields: [userId], references: [id])
  balance     Int      @default(0)
  lifetimeEarned Int   @default(0)
  updatedAt   DateTime @updatedAt
}

model UserBadge {
  id          String    @id @default(cuid())
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  badge       BadgeType
  earnedAt    DateTime  @default(now())

  @@unique([userId, badge])
}

model ScanStreak {
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id])
  currentStreak  Int      @default(0)
  longestStreak  Int      @default(0)
  lastScanDate   DateTime?
  updatedAt      DateTime @updatedAt
}

enum BitesReason {
  WELCOME_BONUS
  PRICE_SCAN
  PIONEER_SCAN
  VERIFIED_SCAN
  STALE_UPDATE
  STREAK_7_DAY
  STREAK_30_DAY
  WEEKLY_GOAL
  REFERRAL_BONUS       // awarded to both referrer and referred on conversion
  REDEMPTION
  ADMIN_ADJUSTMENT
}

enum BadgeType {
  FIRST_SCAN
  STREAK_7_DAY
  STREAK_30_DAY
  PIONEER           // first scan at a new store
  VERIFIED          // 10+ verified scans
  CENTURY           // 100 total scans
  PRICE_CHAMPION    // 2000 lifetime Bites
  COMMUNITY_HERO    // scans contributed to $1000 community savings
}
```

Add relations to User model:
```prisma
// In User model, add:
bitesBalance    BitesBalance?
bitesLedger     BitesLedger[]
badges          UserBadge[]
scanStreak      ScanStreak?
// Note: scanCount, priceContributions, contributorScore live on UserProfile, not User
```

---

#### Reward engine service (build in Sprint 1, wire to scanner in v2)

```typescript
// src/services/rewardsService.ts

export async function awardBites(
  userId: string,
  amount: number,
  reason: BitesReason,
  referenceId?: string
) {
  await prisma.$transaction([
    prisma.bitesLedger.create({ data: { userId, amount, reason, referenceId } }),
    prisma.bitesBalance.upsert({
      where: { userId },
      update: { balance: { increment: amount }, lifetimeEarned: { increment: Math.max(0, amount) } },
      create: { userId, balance: amount, lifetimeEarned: Math.max(0, amount) },
    }),
  ])
  await checkAndAwardBadges(userId)
}

export async function processScanReward(userId: string, observation: PriceObservation) {
  const rewards: { amount: number; reason: BitesReason }[] = []

  // Base scan reward
  rewards.push({ amount: 5, reason: BitesReason.PRICE_SCAN })

  // Pioneer bonus — awarded to the very first scan at this store in our DB,
  // regardless of who submitted it. If no observation exists for this storeId
  // (from any user), this user is the first to map it.
  const existingScans = await prisma.priceObservation.count({
    where: { storeId: observation.storeId }
  })
  if (existingScans === 0) rewards.push({ amount: 15, reason: BitesReason.PIONEER_SCAN })

  // Stale update bonus
  const canonical = await prisma.canonicalPrice.findUnique({
    where: { upc_storeId: { upc: observation.upc, storeId: observation.storeId } }
  })
  const fiveDaysAgo = subDays(new Date(), 5)
  if (canonical && canonical.lastUpdated < fiveDaysAgo) {
    rewards.push({ amount: 5, reason: BitesReason.STALE_UPDATE })
  }

  // Award all
  for (const r of rewards) await awardBites(userId, r.amount, r.reason, observation.id)

  // Update streak
  await updateStreak(userId)

  // Increment scan count
  await prisma.user.update({ where: { id: userId }, data: { scanCount: { increment: 1 } } })

  return { totalAwarded: rewards.reduce((s, r) => s + r.amount, 0), breakdown: rewards }
}

async function updateStreak(userId: string) {
  const streak = await prisma.scanStreak.findUnique({ where: { userId } })
  const today = startOfDay(new Date())
  const yesterday = subDays(today, 1)

  let newStreak = 1
  if (streak?.lastScanDate) {
    const lastDay = startOfDay(streak.lastScanDate)
    if (isSameDay(lastDay, yesterday)) newStreak = streak.currentStreak + 1
    else if (isSameDay(lastDay, today)) return  // already scanned today
  }

  await prisma.scanStreak.upsert({
    where: { userId },
    update: { currentStreak: newStreak, longestStreak: { set: Math.max(newStreak, streak?.longestStreak ?? 0) }, lastScanDate: new Date() },
    create: { userId, currentStreak: 1, longestStreak: 1, lastScanDate: new Date() },
  })

  if (newStreak === 7)  await awardBites(userId, 25, BitesReason.STREAK_7_DAY)
  if (newStreak === 30) await awardBites(userId, 100, BitesReason.STREAK_30_DAY)
}

async function checkAndAwardBadges(userId: string) {
  const [balance, scanCount] = await Promise.all([
    prisma.bitesBalance.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { scanCount: true } }),
  ])
  const existing = await prisma.userBadge.findMany({ where: { userId } })
  const has = (b: BadgeType) => existing.some(e => e.badge === b)

  const toAward: BadgeType[] = []
  if (!has(BadgeType.FIRST_SCAN) && (scanCount?.scanCount ?? 0) >= 1)     toAward.push(BadgeType.FIRST_SCAN)
  if (!has(BadgeType.CENTURY) && (scanCount?.scanCount ?? 0) >= 100)       toAward.push(BadgeType.CENTURY)
  if (!has(BadgeType.PRICE_CHAMPION) && (balance?.lifetimeEarned ?? 0) >= 2000) toAward.push(BadgeType.PRICE_CHAMPION)

  if (toAward.length > 0) {
    await prisma.userBadge.createMany({
      data: toAward.map(badge => ({ userId, badge })),
      skipDuplicates: true,
    })
  }
}
```

---

#### Community impact stats (surface on home screen + post-scan)

```typescript
// src/services/communityService.ts
// Cached in Redis, recomputed hourly

export async function getCommunityImpact(city: string) {
  const cacheKey = `community:impact:${city}`
  const cached = await redis.get(cacheKey)
  if (cached) return JSON.parse(cached)

  // Sum savings: for each observation, compute (MealMe price - our canonical price)
  // Aggregate by city derived from storeLocation.city
  const result = {
    totalSavingsThisMonth: 312.40,   // computed from price delta * usage count
    familiesHelped: 47,
    totalScansThisMonth: 1840,
    topContributors: []              // top 3 users by scanCount in city
  }

  await redis.setex(cacheKey, 3600, JSON.stringify(result))
  return result
}
```

---

#### New API routes (add in Sprint 1 scaffold)

```
GET  /rewards/balance           # User's Bites balance + lifetime earned
GET  /rewards/ledger            # Transaction history (paginated)
GET  /rewards/leaderboard       # Top contributors by city/neighbourhood
GET  /rewards/badges            # User's earned + locked badges
POST /rewards/redeem            # Redeem Bites (subtract from balance)
GET  /community/impact          # Aggregate community savings stats
```

---

#### Redemption flow (v2, but model it now)

Redemptions write a negative entry to `BitesLedger` with reason `REDEMPTION`.
Never allow balance to go below 0 — validate server-side before writing.
Redemption types:
- `SUBSCRIPTION_DISCOUNT` — creates a coupon code via RevenueCat API
- `PARTNER_COUPON` — generates a single-use code from partner API (future)

---

#### Notification triggers for engagement

```typescript
// Push notifications that drive re-engagement:
// 1. "Your streak is at risk!" — if user hasn't scanned by 8pm and has a streak > 3
// 2. "You're #3 in Austin this week!" — weekly leaderboard position update
// 3. "Someone verified your Kroger scan — +3 Bites earned!" — verification reward
// 4. "You're 200 Bites away from Price Champion" — milestone nudge
// 5. "Your scans saved 12 people money this week" — community impact digest
```

---

## Referral program + promotions

> **Schema and backend engine: Sprint 1.**
> **Referral UI: Sprint 6** (pairs with subscription paywall sprint).
> **Promotions: backend-only at launch** — no UI beyond a promo field on the
> subscription screen. Codes are inserted directly into the DB and work immediately.

---

### Referral program

**How it works:**
1. Every user gets a unique 5-char referral code on signup (e.g. `X7K2M`)
2. Share link: `smartbite.app/join?ref=X7K2M` — one tap to copy or native share sheet
3. Friend signs up via link → ReferralEvent written with `PENDING` status
4. Conversion trigger: referred user generates their **first meal plan** (proves engagement)
5. Both parties get +150 Bites each. Push notification to referrer: "Your friend joined!"
6. Profile tab shows "X invited, Y converted" count (no leaderboard in V1)

**Reward amounts:**
- Referrer: +150 Bites (= $1.50) per converted referral, max 20 payouts per user
- Referred: +150 Bites on first plan generation
- Conversion trigger is first plan generated — not signup (filters bounce/fake accounts)

**When the UI ships:** Sprint 6 (subscription sprint). Users who just hit the
paywall are the most motivated to share. The referral card lives in the profile
tab and on the post-upgrade success screen.

---

### Prisma models (add in Sprint 1)

```prisma
model ReferralCode {
  id        String          @id @default(cuid())
  userId    String          @unique
  user      User            @relation(fields: [userId], references: [id])
  code      String          @unique
  createdAt DateTime        @default(now())
  events    ReferralEvent[]
}

model ReferralEvent {
  id             String         @id @default(cuid())
  referrerId     String
  referredId     String
  referralCodeId String
  referralCode   ReferralCode   @relation(fields: [referralCodeId], references: [id])
  status         ReferralStatus @default(PENDING)
  createdAt      DateTime       @default(now())
  convertedAt    DateTime?
  rewards        ReferralReward[]

  @@unique([referredId])
}

model ReferralReward {
  id              String        @id @default(cuid())
  referralEventId String
  referralEvent   ReferralEvent @relation(fields: [referralEventId], references: [id])
  userId          String
  bitesAwarded    Int
  createdAt       DateTime      @default(now())
}

model PromoCode {
  id              String            @id @default(cuid())
  code            String            @unique
  description     String
  type            PromoType
  value           Json              // { days: 30 } | { bites: 500 } | { multiplier: 2 }
  maxRedemptions  Int?              // null = unlimited
  redemptionCount Int               @default(0)
  validFrom       DateTime          @default(now())
  validUntil      DateTime?
  active          Boolean           @default(true)
  redemptions     PromoRedemption[]
}

model PromoRedemption {
  id          String    @id @default(cuid())
  promoCodeId String
  promoCode   PromoCode @relation(fields: [promoCodeId], references: [id])
  userId      String
  redeemedAt  DateTime  @default(now())

  @@unique([promoCodeId, userId])
}

enum ReferralStatus { PENDING  CONVERTED  EXPIRED }

enum PromoType {
  PLUS_TRIAL           // free days of Plus subscription
  BITES_BONUS          // flat Bites award on redemption
  REFERRAL_MULTIPLIER  // multiplies referral Bites payout
}
```

Add to User model:
```prisma
referralCode     ReferralCode?
referralsMade    ReferralEvent[]   @relation("referrer")
referredBy       ReferralEvent?    @relation("referred")
promoRedemptions PromoRedemption[]
```

---

### API routes (backend — Sprint 1, UI — Sprint 6)

```
GET  /referral/code        # Returns user's code. Auto-creates if missing.
GET  /referral/stats       # { invited, converted, totalBitesEarned }
POST /referral/attribute   # Called at signup if ?ref= present in URL
POST /promo/redeem         # Validate + apply a promo code
```

**Internal trigger (no route):**
When a user generates their first meal plan, `generateMealPlan` calls
`referralService.checkAndConvert(userId)` — converts any PENDING referral
and fires Bites awards for both users via `rewardsService.awardBites()`.

---

### Referral service (Sprint 1)

```typescript
// src/services/referralService.ts

export async function generateReferralCode(): Promise<string> {
  // Generate a unique 6-char alphanumeric code with DB uniqueness retry.
  // Not derived from userId — avoids collision and is not guessable.
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // omit O,0,I,1 for readability
  const LENGTH = 6
  let attempts = 0
  while (attempts < 10) {
    const code = Array.from({ length: LENGTH }, () =>
      ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    ).join('')
    const existing = await prisma.referralCode.findUnique({ where: { code } })
    if (!existing) return code
    attempts++
  }
  throw new Error('Failed to generate unique referral code after 10 attempts')
}

export async function attributeReferral(newUserId: string, code: string) {
  const referralCode = await prisma.referralCode.findUnique({ where: { code } })
  if (!referralCode || referralCode.userId === newUserId) return  // invalid or self-referral

  await prisma.referralEvent.create({
    data: {
      referrerId: referralCode.userId,
      referredId: newUserId,
      referralCodeId: referralCode.id,
      status: 'PENDING',
    }
  })
}

export async function checkAndConvert(userId: string) {
  const event = await prisma.referralEvent.findFirst({
    where: { referredId: userId, status: 'PENDING' }
  })
  if (!event) return

  await prisma.referralEvent.update({
    where: { id: event.id },
    data: { status: 'CONVERTED', convertedAt: new Date() }
  })

  // Award both parties
  await awardBites(event.referredId, 150, BitesReason.REFERRAL_BONUS, event.id)
  await awardBites(event.referrerId, 150, BitesReason.REFERRAL_BONUS, event.id)

  // Notify referrer
  await sendPushNotification(event.referrerId, {
    title: 'Your friend joined SmartBite!',
    body: 'You both earned 150 Bites. Keep sharing!'
  })
}
```

---

### Promo code strategy — V1 launch

| Code | Type | Value | Max | Window | Purpose |
|---|---|---|---|---|---|
| `TEXASEATS` | Plus trial | 30 days | 500 | 2 weeks post-launch | Beta launch — Reddit, local groups |
| `HEBFAM` | Bites bonus | +500 | Unlimited | 60 days | HEB shoppers, scanner habit driver |
| `REFER2X` | Referral multiplier | 2× | Unlimited | 7-day window | Referral boost during slow growth |
| Per-creator | Plus trial | 30 days | 1–50 | Custom | Press/influencer attribution |

Promo codes are inserted directly into the `PromoCode` table — no admin UI needed
in V1. Run this when ready to activate a code:

```sql
INSERT INTO "PromoCode" (id, code, description, type, value, "maxRedemptions", "validUntil", active)
VALUES (gen_random_uuid(), 'TEXASEATS', 'Beta launch promo', 'PLUS_TRIAL',
        '{"days": 30}', 500, NOW() + INTERVAL '14 days', true);
```

---

### What defers to V2

- Animated referral invite screen with shareable image card
- Referral leaderboard ("Top inviters this month")
- Tiered referral rewards (5 referrals = 1 free month of Plus)
- HEB / Kroger co-marketing promo codes
- Time-limited flash promotions triggered by push notification
- Influencer attribution dashboard
- Subscription discount promos via RevenueCat Offers API
- Admin UI for creating and managing promo codes

---

## Testing strategy — TDD from Sprint 1

> **Tests ship in the same commit as the feature. Always.**
> The prompt pattern is: write failing tests → implement → confirm green.
> Claude Code should never deliver a feature without tests passing.

---

### Testing philosophy

Every sprint has a working, testable deliverable. Tests are the definition of done.
If the tests pass, the sprint is complete. If they don't, it isn't.

Claude Code follows this pattern for every task:
1. Write the test file first (it fails — that's expected)
2. Implement the feature to make tests pass
3. Run the full test suite to confirm no regressions
4. Report: "X tests passing, 0 failing"

Never accept "I'll add tests later." Tests travel with the code that earned them.

---

### Stack

| Layer | Tool | What it tests |
|---|---|---|
| API unit | Jest + ts-jest | Services, utilities, pure functions |
| API integration | Jest + Supertest | HTTP routes end-to-end against test DB |
| API DB | Prisma test client | Schema, migrations, seed data |
| Mobile unit | Jest + RNTL | Components, hooks, Zustand stores |
| Mobile E2E | Detox | Full user flows on iOS Simulator |
| Coverage | Jest --coverage | Enforced minimum 70% across all files |

---

### Backend test setup

#### Test database
Never run tests against the real Supabase database.
Use a separate local Postgres instance for tests:

```bash
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:16
    environment:
      POSTGRES_DB: smartbite_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
```

```bash
# apps/api/.env.test
DATABASE_URL=postgresql://test:test@localhost:5433/smartbite_test
NODE_ENV=test
```

```typescript
// apps/api/jest.config.ts
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterFramework: ['./src/test/setup.ts'],
  globalSetup: './src/test/globalSetup.ts',
  globalTeardown: './src/test/globalTeardown.ts',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
  coverageThreshold: { global: { lines: 70, functions: 70 } },
}
```

#### Test helpers

```typescript
// apps/api/src/test/setup.ts
import { prisma } from '../lib/prisma'

beforeEach(async () => {
  // Truncate all tables before each test — clean slate
  const tables = ['User', 'UserProfile', 'MealPlan', 'Recipe', 'Favourite',
    'Collection', 'PriceObservation', 'CanonicalPrice', 'BitesBalance',
    'BitesLedger', 'ReferralCode', 'ReferralEvent', 'PromoCode']
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`)
  }
})

afterAll(async () => {
  await prisma.$disconnect()
})

// apps/api/src/test/factories.ts
// Test data factories — always use these, never hardcode test data

export async function createTestUser(overrides = {}) {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      tier: 'FREE',
      ...overrides,
    }
  })
}

export async function createTestProfile(userId: string, overrides = {}) {
  return prisma.userProfile.create({
    data: {
      userId,
      weeklyBudget: 100,
      location: { zip: '78701', lat: 30.27, lng: -97.74, city: 'Austin' },
      preferredRetailers: ['heb', 'walmart'],
      dietaryGoals: ['high-protein'],
      allergies: [],
      cookingTimeMax: 30,
      servings: 2,
      ...overrides,
    }
  })
}

export async function createAuthToken(userId: string): Promise<string> {
  // Generate a test JWT — bypasses Supabase in tests
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET_TEST!)
}
```

---

### Sprint-by-sprint test requirements

#### Sprint 1 — Auth + profile + store discovery

```typescript
// ✅ Auth service tests
describe('POST /auth/signup', () => {
  it('creates user in DB and returns JWT', ...)
  it('returns 400 if email already exists', ...)
  it('returns 400 if password under 8 chars', ...)
  it('auto-creates a ReferralCode for the new user', ...)
})

describe('POST /auth/login', () => {
  it('returns JWT and user object on valid credentials', ...)
  it('returns 401 on wrong password', ...)
  it('returns 401 on unknown email', ...)
})

describe('GET /auth/me', () => {
  it('returns user when valid JWT provided', ...)
  it('returns 401 when no token', ...)
  it('returns 401 when token is expired', ...)
})

// ✅ Profile tests
describe('PUT /profile', () => {
  it('saves budget, location, dietary prefs', ...)
  it('rejects more than 2 preferred retailers', ...)
  it('returns 401 without auth', ...)
})

// ✅ Store discovery tests
describe('GET /stores/nearby', () => {
  it('returns stores sorted by distance', ...)
  it('filters to V1_SUPPORTED_CHAINS only', ...)
  it('returns cached result on second call', ...)
  it('falls back to TX_STORE_SEED if MealMe returns empty', ...)
})

// ✅ Referral tests
describe('referralService', () => {
  it('generates unique code per user', ...)
  it('attributes referral on signup with valid code', ...)
  it('ignores self-referral', ...)
  it('converts PENDING to CONVERTED on first plan generation', ...)
  it('awards 150 Bites to both parties on conversion', ...)
})
```

#### Sprint 2 — AI meal planning

```typescript
describe('generateMealPlan service', () => {
  // Mock Anthropic client — never hit real API in tests
  beforeEach(() => {
    jest.spyOn(anthropic.messages, 'create').mockResolvedValue(mockPlanResponse)
  })

  it('returns valid 7-day plan structure', ...)
  it('includes all required fields: title, estCost, ingredients, nutrition', ...)
  it('respects dietary restrictions in prompt', ...)
  it('includes favourites context for Plus users', ...)
  it('throws if Claude returns malformed JSON', ...)
})

describe('POST /plans/generate', () => {
  it('creates plan and meals in DB', ...)
  it('returns 429 when free user exceeds 2 plans/week', ...)
  it('allows Plus user to generate 7 plans/week', ...)
  it('Redis counter increments on each generation', ...)
})

describe('POST /plans/:id/regenerate-meal', () => {
  it('replaces only the specified meal slot', ...)
  it('keeps all other meals unchanged', ...)
})
```

#### Sprint 3 — Pricing

```typescript
describe('scanPrices service', () => {
  beforeEach(() => {
    // Mock MealMe and Kroger API clients
    jest.spyOn(mealmeClient, 'search').mockResolvedValue(mockMealmeResponse)
    jest.spyOn(krogerClient, 'search').mockResolvedValue(mockKrogerResponse)
  })

  it('returns bestSingleStore with lowest total cost', ...)
  it('computes bestSplitOption when savings >= $3', ...)
  it('returns null for bestSplitOption when savings < $3', ...)
  it('respects storesPerScan tier limit', ...)
  it('serves cached result within 1hr TTL', ...)
  it('falls back to Kroger API when MealMe returns empty', ...)
})

describe('split optimizer', () => {
  it('assigns each ingredient to its cheaper store', ...)
  it('correctly computes per-store subtotals', ...)
  it('only surfaces split when saving >= SPLIT_THRESHOLD', ...)
})
```

#### Sprint 4 — Favourites + collections

```typescript
describe('POST /favourites', () => {
  it('saves recipe to user favourites', ...)
  it('returns 409 if already favourited', ...)
  it('returns 403 when free user has 10 favourites', ...)
})

describe('Collections', () => {
  it('creates collection and adds recipe', ...)
  it('removes recipe from collection', ...)
  it('deletes collection with all its recipe associations', ...)
  it('returns free user collections capped at 1', ...)
})
```

#### Sprint 5 — Rewards + referrals

```typescript
describe('rewardsService.processScanReward', () => {
  it('awards base 5 Bites for any scan', ...)
  it('awards +15 pioneer bonus for first scan at new store', ...)
  it('awards +5 stale update bonus when price is 5+ days old', ...)
  it('does NOT award pioneer bonus for second scan at same store', ...)
  it('increments user scanCount', ...)
})

describe('streak logic', () => {
  it('increments streak on consecutive daily scans', ...)
  it('resets streak if user misses a day', ...)
  it('awards 25 Bites on 7-day streak milestone', ...)
  it('does not double-award if user scans twice in same day', ...)
})

describe('badge awards', () => {
  it('awards FIRST_SCAN badge on first observation', ...)
  it('awards CENTURY badge at 100 scans', ...)
  it('does not duplicate badges', ...)
})
```

#### Sprint 6 — Subscriptions

```typescript
describe('POST /subscription/webhook', () => {
  it('upgrades user to PLUS on subscription_started event', ...)
  it('downgrades user to FREE on subscription_cancelled event', ...)
  it('returns 400 on invalid RevenueCat signature', ...)
  it('is idempotent — same event twice does not double-upgrade', ...)
})

describe('Promo codes', () => {
  it('redeems PLUS_TRIAL code and grants trial days', ...)
  it('rejects expired promo code', ...)
  it('rejects code that has hit maxRedemptions', ...)
  it('prevents same user redeeming same code twice', ...)
  it('redeems BITES_BONUS code and awards correct Bites', ...)
})
```

#### Sprint 7 — Scanner

```typescript
describe('GET /products/lookup/:upc', () => {
  it('returns product from cache if already looked up', ...)
  it('queries Open Food Facts on cache miss', ...)
  it('returns null gracefully for unknown UPC', ...)
})

describe('POST /prices/observation', () => {
  it('writes observation to DB', ...)
  it('triggers canonical price recompute when >= 3 observations', ...)
  it('rate-limits to 50 scans/day per user', ...)
  it('rejects observation with missing required fields', ...)
})

describe('canonicalPriceJob', () => {
  it('computes weighted median from 3+ observations', ...)
  it('ignores observations older than 7 days', ...)
  it('upserts CanonicalPrice correctly', ...)
  it('does not run with fewer than 3 observations', ...)
})
```

---

### Mobile testing setup

```bash
# apps/mobile — install test dependencies
pnpm add -D jest @testing-library/react-native @testing-library/jest-native
pnpm add -D detox detox-cli jest-circus
```

```typescript
// apps/mobile/jest.config.ts
export default {
  preset: 'react-native',
  setupFilesAfterFramework: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['app/**/*.tsx', 'components/**/*.tsx', 'hooks/**/*.ts'],
  coverageThreshold: { global: { lines: 60 } },
}
```

#### Key component tests

```typescript
// components/__tests__/FavouriteButton.test.tsx
describe('FavouriteButton', () => {
  it('renders unfilled heart when not favourited', ...)
  it('renders filled heart when favourited', ...)
  it('calls onToggle when pressed', ...)
  it('shows loading state during async toggle', ...)
})

// components/__tests__/PriceCompareBar.test.tsx
describe('PriceCompareBar', () => {
  it('highlights the cheapest store', ...)
  it('shows savings amount correctly', ...)
  it('does not show split option when savings < $3', ...)
})

// stores/__tests__/authStore.test.ts
describe('authStore', () => {
  it('sets user on login', ...)
  it('clears user on logout', ...)
  it('persists session across renders', ...)
})
```

#### Detox E2E flows (Sprint 8)

```typescript
// e2e/onboarding.e2e.ts
describe('Onboarding flow', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true })
  })

  it('cold start lands on login screen', async () => {
    await expect(element(by.id('login-screen'))).toBeVisible()
  })

  it('can sign up with email and password', async () => {
    await element(by.id('signup-tab')).tap()
    await element(by.id('email-input')).typeText('test@example.com')
    await element(by.id('password-input')).typeText('password123')
    await element(by.id('signup-btn')).tap()
    await expect(element(by.id('location-screen'))).toBeVisible()
  })

  it('store selector shows nearby stores and allows 2 selections', async () => {
    await element(by.id('location-allow-btn')).tap()
    await expect(element(by.id('store-list'))).toBeVisible()
    await element(by.id('store-heb')).tap()
    await element(by.id('store-walmart')).tap()
    // Third store should be disabled
    await expect(element(by.id('store-kroger'))).toHaveAttribute('disabled', true)
  })

  it('completes onboarding and lands on home screen', async () => {
    await element(by.id('continue-btn')).tap()
    await element(by.id('budget-input')).typeText('100')
    await element(by.id('continue-btn')).tap()
    await element(by.id('continue-btn')).tap()
    await expect(element(by.id('home-screen'))).toBeVisible()
    await expect(element(by.text('Generate my meal plan'))).toBeVisible()
  })
})

// e2e/mealPlan.e2e.ts
describe('Meal plan generation', () => {
  it('generates plan and shows recipe cards', async () => {
    await element(by.id('generate-plan-btn')).tap()
    await waitFor(element(by.id('meal-plan-grid'))).toBeVisible().withTimeout(20000)
    await expect(element(by.id('meal-card-0'))).toBeVisible()
  })

  it('tapping a meal opens recipe detail', async () => {
    await element(by.id('meal-card-0')).tap()
    await expect(element(by.id('recipe-detail-screen'))).toBeVisible()
    await expect(element(by.id('ingredients-list'))).toBeVisible()
  })
})
```

---

### CI pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  api-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_DB: smartbite_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ['5433:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm --filter api prisma migrate deploy
        env:
          DATABASE_URL: postgresql://test:test@localhost:5433/smartbite_test
      - run: pnpm --filter api test --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5433/smartbite_test
          NODE_ENV: test

  mobile-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
      - run: pnpm install
      - run: pnpm --filter mobile test --coverage

  # Detox E2E runs on macOS only (requires iOS Simulator)
  e2e:
    runs-on: macos-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm --filter mobile detox build --configuration ios.sim.debug
      - run: pnpm --filter mobile detox test --configuration ios.sim.debug
```

---

### TDD prompt templates for Claude Code

Use these prompt patterns throughout every sprint:

**Service TDD:**
```
Write failing Jest tests for [service name] covering:
- [behaviour 1]
- [behaviour 2]
- [edge case]
Mock all external dependencies (Anthropic, MealMe, Prisma where needed).
Then implement the service to make all tests pass.
Confirm: "X tests passing, 0 failing" before finishing.
```

**Route TDD:**
```
Write failing Supertest integration tests for [route] covering success,
auth failure, validation failure, and tier gate enforcement.
Use the test factories from src/test/factories.ts for test data.
Then implement the route to make all tests pass.
Run pnpm test and confirm all green before finishing.
```

**Component TDD:**
```
Write failing React Native Testing Library tests for [component] covering:
- Renders correctly with default props
- [interaction behaviour]
- [state change]
Then implement the component to make all tests pass.
```

---

### Coverage targets by sprint

| Sprint | API target | Mobile target | Notes |
|---|---|---|---|
| S1 | 80% | 60% | Auth and profile are critical paths |
| S2 | 75% | 60% | Mock Claude — never hit real API |
| S3 | 75% | 55% | Mock MealMe and Kroger |
| S4 | 70% | 65% | Favourites logic is pure and testable |
| S5 | 75% | 60% | Rewards engine must be well tested |
| S6 | 80% | 60% | Webhook idempotency is critical |
| S7 | 75% | 55% | Scanner is hard to unit test — lean on E2E |
| S8 | — | E2E | All Detox flows must pass before submission |

---

## Gaps, risks, and constraints

> These are not afterthoughts — they affect code written in every sprint.
> Claude Code must read this section before implementing any feature that touches
> pricing, auth, subscriptions, or user-generated content.

---

### 1. Price accuracy disclaimer strategy

**The problem:** MealMe, Kroger API, and crowdsourced observations are all
approximate. Prices change intraday. Items may be out of stock. Unit sizes differ
between stores. Showing "$14.20 at Kroger" as a hard fact will generate support
tickets and potentially legal exposure within days of launch.

**Required in V1:**

*App copy rules — apply in every screen that shows a price:*
- All prices shown as "est." or "~" prefix: `~$14.20` not `$14.20`
- Recipe detail footer: *"Prices are estimates based on recent store data and may vary. Verify at checkout."*
- Shopping list header: *"Estimated total — actual prices may differ."*
- Home screen plan card: subtitle "Estimated weekly cost" not "Weekly cost"

*Terms of Service must include (legal to draft, not Claude Code):*
- Price data sourced from third-party APIs and user reports; not guaranteed accurate
- Not responsible for price discrepancies between app and store
- Prices shown are estimates for planning purposes only

*Support expectations:*
- Document in support runbook: "Price wrong at store" is expected; response is "prices are estimates, we update them regularly"
- Do NOT promise price matching or refunds based on app estimates

**Implementation in code:**

```typescript
// All price display components receive a PriceDisplay type, not raw Float
// This enforces disclaimer rendering at the component level

interface PriceDisplay {
  amount: number
  confidence: 'high' | 'medium' | 'low'  // drives UI treatment
  source: 'canonical' | 'api' | 'estimate'
  capturedAt: Date
}

// confidence rules:
// high   = canonical price, ≥5 observations, <24h old
// medium = canonical price, 3-4 observations OR 1-3 days old; OR fresh API price
// low    = API price >24h old, or estimate only

// UI: high → "~$X.XX" ; medium → "~$X.XX*" ; low → "est. $X–$X range"
```

---

### 2. Ingredient matching + unit normalisation

**The problem:** A recipe says "1 lb chicken breast." MealMe returns
"Kroger Boneless Skinless Chicken Breast, 3 lb bag, $9.99." The unit
price calculation is non-trivial and can produce silently wrong totals.

**The matching pipeline:**

```typescript
// src/services/ingredientMatcher.ts

interface IngredientQuery {
  name: string        // "chicken breast"
  amount: number      // 1
  unit: string        // "lb"
}

interface MatchedProduct {
  productName: string
  storePrice: number  // price as sold
  storeUnit: string   // "3 lb bag"
  unitPrice: number   // price per lb/oz/each — normalised
  requiredAmount: number
  estimatedCost: number   // unitPrice × requiredAmount
  confidence: 'exact' | 'close' | 'approximate'
}

// Normalisation rules:
// Weight: oz → lb (÷16), g → lb (÷453.6), kg → lb (×2.205)
// Volume: ml → fl oz (÷29.57), L → fl oz (×33.81)
// Count:  "bunch", "head", "clove" → map to approx weight via lookup table
// Packs:  "6-pack", "dozen" → divide total price by count

// Confidence scoring:
// exact       = name match + unit family match + size within 20%
// close       = name match + unit family match + size differs >20%
// approximate = name match only, or category match (e.g. "chicken" → various cuts)

// When confidence = approximate: add 15% buffer to estimatedCost,
// set PriceDisplay.confidence = 'low'
```

**Known hard cases — document in support runbook, do not try to solve perfectly in V1:**
- "bunch" of cilantro vs by-weight cilantro
- Produce sold by each (1 avocado) vs by weight (0.5 lb avocados)
- Brand-name vs generic for the same ingredient
- Regional naming differences (HEB store brands)

**V1 approach:** Best-effort normalisation with confidence scoring. Show low-confidence
matches with a flag icon and "price is an estimate" tooltip. Do not hide unmatched
ingredients — show them as "price unavailable, check in store."

---

### 3. Legal and compliance

**Health claims:**
- Do NOT make clinical claims: "high protein" = fine; "helps you lose weight" = not fine
- Nutrition data sourced from USDA/Edamam — attribute in app: "Nutrition data provided by [source]"
- Add standard disclaimer on any nutrition screen: *"Nutritional information is approximate. Consult a healthcare provider for dietary advice."*
- Do not call any meal plan "diet," "medical," "therapeutic," or "clinically designed"

**Location data:**
- Request location permission with a clear purpose string: "To find grocery stores near you"
- Store only zip/lat/lng — not precise movement history
- Add `locationHistory: false` to all location API calls (Expo Location)
- CCPA compliance required for California users even though V1 is Texas-only
  (app is available nationally on the App Store)

**Minors:**
- App is rated 4+ (food/shopping utility). Do not collect age.
- Subscription purchases require parental approval on device — iOS/Android handle this via RevenueCat
- Do not add any social features (leaderboard names, profile photos) that would
  require COPPA compliance review in V1

**Data deletion:**
```
DELETE /account   # Deletes user, all PII, all observations
                  # Required for App Store approval and GDPR/CCPA
```
Cascade deletes must cover: User, UserProfile, MealPlan, Favourite, Collection,
PriceObservation, ReferralEvent, BitesLedger, BitesBalance, PromoRedemption.
Retain anonymised PriceObservation rows (null userId) for canonical price integrity.

---

### 4. Security — rate limiting per sprint, not Sprint 8

Rate limiting is a Sprint 1 concern, not a Sprint 8 cleanup. Apply limits
when each endpoint is built. Do not defer.

```typescript
// apps/api/src/middleware/rateLimits.ts
// Install: pnpm add @fastify/rate-limit

import rateLimit from '@fastify/rate-limit'

// Global default — all endpoints unless overridden
export const globalLimit = { max: 100, timeWindow: '1 minute' }

// Per-endpoint overrides (apply when route is registered)
export const RATE_LIMITS = {
  'POST /auth/signup':          { max: 5,   timeWindow: '1 hour' },    // Sprint 1
  'POST /auth/login':           { max: 10,  timeWindow: '15 minutes' }, // Sprint 1
  'GET /stores/nearby':         { max: 20,  timeWindow: '1 minute' },   // Sprint 1
  'POST /plans/generate':       { max: 10,  timeWindow: '1 hour' },     // Sprint 2 (on top of tier gate)
  'GET /prices/scan':           { max: 30,  timeWindow: '1 minute' },   // Sprint 3
  'POST /prices/observation':   { max: 50,  timeWindow: '24 hours' },   // Sprint 7 (per user, scan spam)
  'POST /referral/attribute':   { max: 3,   timeWindow: '1 hour' },     // Sprint 6 (referral farming)
  'POST /promo/redeem':         { max: 5,   timeWindow: '1 hour' },     // Sprint 6
  'POST /auth/signup' :         { max: 3,   timeWindow: '1 hour' },     // referral farming via bulk signups
}
```

**Referral farming protection (additional to rate limits):**
- Require email verification before referral converts (Supabase email confirm)
- Require first meal plan generated before Bites are awarded (already in design)
- Flag accounts where >5 referrals convert within 24h — hold Bites, review manually
- One referral reward per email domain per referrer (blocks `user+1@gmail.com` pattern)

**Scan spam protection:**
- 50 scans/day hard limit per user (in rate limit table above)
- Minimum 30 seconds between scans from same device (enforce client-side + server-side)
- Flag accounts submitting identical UPC+store+price >10 times — auto-suspend Bites

---

### 5. RevenueCat ↔ DB — source of truth and reconciliation

**Source of truth on app launch:**

```typescript
// apps/mobile/src/lib/subscription.ts
// Called once on app foreground, after Supabase session restored

export async function syncSubscriptionStatus() {
  // 1. Ask RevenueCat for current entitlements (single source of truth for entitlement)
  const customerInfo = await Purchases.getCustomerInfo()
  const hasPlus = customerInfo.entitlements.active['plus'] !== undefined
  const hasPro  = customerInfo.entitlements.active['pro']  !== undefined
  const tier: Tier = hasPro ? 'PRO' : hasPlus ? 'PLUS' : 'FREE'

  // 2. Sync to API if different from DB (handles webhook failures silently)
  await apiClient.post('/subscription/sync', { tier })
  // POST /subscription/sync — updates user.tier in DB if it differs
  // Idempotent — safe to call on every launch
}
```

**Webhook failure handling:**

RevenueCat webhooks can fail (network error, server restart, deploy during webhook).
The `syncSubscriptionStatus()` call on app launch is the reconciliation mechanism —
it heals any DB drift without a separate cron job.

```typescript
// POST /subscription/sync — called from mobile on every launch
// Trusts RevenueCat entitlement over DB state
// Rate limited to 10/hour per user (not a heavy endpoint)
async function syncSubscription(userId: string, reportedTier: Tier) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user?.tier !== reportedTier) {
    await prisma.user.update({ where: { id: userId }, data: { tier: reportedTier } })
    console.log(`Tier synced for ${userId}: ${user?.tier} → ${reportedTier}`)
  }
}
```

**Webhook idempotency (already in Sprint 6 tests — restate here for clarity):**
- RevenueCat can send the same event twice. The webhook handler must be idempotent:
  update `user.tier` unconditionally; do not error if tier is already correct.
- Store `revenueCatEventId` on a `WebhookEvent` table to detect true duplicates
  and skip processing after first successful handle.

```prisma
model WebhookEvent {
  id              String   @id @default(cuid())
  source          String   // "revenuecat"
  externalEventId String   @unique  // RevenueCat event ID — dedup key
  processedAt     DateTime @default(now())
}
```

---

### 6. Operational runbooks

> These do not go in the app. Document them in Notion/Linear before launch.
> Claude Code should add structured error responses and log lines that make
> these runbooks actionable.

**MealMe API outage:**
- Detection: `GET /prices/scan` error rate >10% over 5 minutes (PostHog alert)
- Degraded mode: serve `CanonicalPrice` data only; if none, show "Prices temporarily unavailable — check back soon" with `PriceDisplay.confidence = 'low'`
- Code: `scanPrices` must catch MealMe errors and return degraded result, not throw

```typescript
// src/services/pricingService.ts
async function queryMealMe(...): Promise<StoreResult | null> {
  try {
    // ... MealMe call
  } catch (err) {
    logger.error({ err }, 'MealMe API error — returning null for degraded mode')
    return null  // caller falls back to canonical or shows unavailable
  }
}
```

**Kroger API outage:**
- Same pattern — return null, fall back to MealMe for Kroger stores, or degrade gracefully

**Claude API outage:**
- `generateMealPlan` catches Anthropic errors and returns `503` with body:
  `{ error: "Plan generation temporarily unavailable", retryAfter: 300 }`
- Mobile shows: "We're having trouble generating your plan. Try again in a few minutes."
- Do NOT show a generic "Something went wrong" — users need to know it's temporary

**Key rotation (document rotation process, not keys themselves):**
- MealMe, Kroger, Anthropic keys stored in Railway/Fly environment variables
- Rotation procedure: update env var → redeploy → verify health check → revoke old key
- Health check endpoint: `GET /health` returns `{ status: 'ok', apis: { mealme, kroger, anthropic } }`

```typescript
// GET /health — unauthenticated, used by hosting platform + runbook
async function healthCheck() {
  const checks = await Promise.allSettled([
    fetch('https://api.mealme.ai/health'),
    krogerClient.ping(),
    anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 1,
      messages: [{ role: 'user', content: 'ping' }] }),
  ])
  return {
    status: checks.every(c => c.status === 'fulfilled') ? 'ok' : 'degraded',
    apis: {
      mealme:    checks[0].status === 'fulfilled' ? 'ok' : 'down',
      kroger:    checks[1].status === 'fulfilled' ? 'ok' : 'down',
      anthropic: checks[2].status === 'fulfilled' ? 'ok' : 'down',
    }
  }
}
```

---

### 7. Accessibility and i18n

**V1 decision: English-only, WCAG 2.1 AA target.**

This is intentional and acceptable for a Texas MVP. Document it explicitly so
it is not an accidental omission.

*Accessibility — build in from Sprint 1, not retrofitted:*
- All interactive elements must have `accessibilityLabel` props (React Native)
- All images must have `accessibilityHint` or `alt` equivalents
- Minimum touch target: 44×44pt (Apple HIG) — use `minHeight: 44` on all tappables
- Never convey information by colour alone (price comparisons need icon + colour)
- Test with VoiceOver (iOS) before each sprint's definition of done

*i18n — not in V1, but code must not make it impossible:*
- All user-facing strings in a `strings.ts` constants file (not hardcoded inline)
- No hardcoded currency symbol — use `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`
- Date formatting via `Intl.DateTimeFormat` not `toLocaleDateString()`
- Spanish-language support is a strong V2 candidate given Texas demographics

---

### 8. Offline and poor network handling

Grocery stores often have poor signal. The app must not be useless at the shelf.

**What must work offline:**
- Viewing the current week's meal plan (cached after last fetch)
- Viewing the shopping list (cached after last generate)
- Checking off items on the shopping list (queued writes, sync on reconnect)
- Viewing saved recipes and collections (cached)

**What requires connectivity:**
- Generating a new meal plan
- Scanning prices (live API calls)
- Barcode lookup (Open Food Facts)
- Price observation submission (queue and retry)

**Implementation:**

```typescript
// apps/mobile/src/lib/offlineQueue.ts
// Price observations queued when offline, flushed when connection restored

import NetInfo from '@react-native-community/netinfo'
import AsyncStorage from '@react-native-async-storage/async-storage'

export async function queueObservation(obs: PriceObservationInput) {
  const queue = JSON.parse(await AsyncStorage.getItem('obs_queue') || '[]')
  queue.push({ ...obs, queuedAt: Date.now() })
  await AsyncStorage.setItem('obs_queue', JSON.stringify(queue))
}

export async function flushObservationQueue() {
  const state = await NetInfo.fetch()
  if (!state.isConnected) return
  const queue = JSON.parse(await AsyncStorage.getItem('obs_queue') || '[]')
  for (const obs of queue) {
    try {
      await apiClient.post('/prices/observation', obs)
    } catch { break }  // stop on first failure, retry next launch
  }
  await AsyncStorage.removeItem('obs_queue')
}

// Call flushObservationQueue() on:
// - App foreground event
// - NetInfo 'isConnected' transition to true
```

**Cached data TTL:**
- Meal plan: cached indefinitely until regenerated
- Shopping list: cached indefinitely until plan changes
- Saved recipes: cached 24h, background refresh on launch
- Store list: cached 24h (already in Redis on server; mirror to AsyncStorage on mobile)

**Install dependencies in Sprint 1:**
```bash
pnpm add @react-native-community/netinfo
pnpm add @react-native-async-storage/async-storage
# Both needed from day one — offline queue referenced in Sprint 7
```

---

## Notes for Claude Code

- Run `npx prisma migrate dev` after any schema change
- Run `npx prisma generate` to regenerate the client (the Prisma hook in `.claude/settings.json` does this automatically on schema edits)
- All business logic lives in `apps/api/src/services/` — routes are thin
- Tier enforcement is always done server-side in middleware, never trust the client
- The `shared/` package contains all TypeScript types used by both `mobile` and `api`
- Use `pnpm` as the package manager throughout
- Expo environment variables must be prefixed `EXPO_PUBLIC_` to be accessible on the client

---

## Claude Code workflow rules

### Slash commands
| Command | What it does |
|---|---|
| `/test` | Run full test suite (API + mobile), report pass/fail, fix failures |
| `/db migrate` | Run `prisma migrate dev` |
| `/db generate` | Regenerate Prisma client |
| `/db studio` | Open Prisma Studio |
| `/sync-progress` | Sync sprint checkboxes from CLAUDE.md → README.md |
| `/sprint-done N` | Review sprint N, check off tasks, confirm tests green, suggest commit |

### Rules that apply to every task

**Progress tracking**
- When checking off a task in CLAUDE.md, always run `/sync-progress` (or update README.md manually) in the same commit.
- CLAUDE.md is the source of truth. README.md mirrors it.

**Testing**
- Tests ship in the same commit as the feature. Never defer.
- Run `/test` before marking any sprint item complete.
- Mock all external APIs (Anthropic, MealMe, Kroger) in tests — never hit real endpoints.

**Database**
- `prisma generate` runs automatically via hook after schema edits. No manual step needed.
- `prisma migrate dev` must be run manually and committed with a descriptive migration name.
- Never edit migration files by hand after they are created.

**Security**
- Apply rate limits when a route is built, not in Sprint 8.
- Tier enforcement is always server-side — never trust the client tier claim.
- Never commit `.env`. Only `.env.test` and `.env.example` are committed.

**API routes**
- Routes are thin. Business logic goes in `src/services/`, not route handlers.
- Always return structured errors: `{ error: string }`.
- Auth middleware (`verifyJWT`) handles both test and production paths — never create a second middleware.

**Mobile**
- All user-facing price strings use `~$X.XX` format (never bare `$X.XX`).
- All tappable elements have `minHeight: 44` and a `testID`.
- Strings are never hardcoded inline — use a constants file when the same string appears more than once.
