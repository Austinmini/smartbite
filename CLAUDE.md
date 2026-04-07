# SmartBite — Claude Code Project Plan

## Project overview

SmartBite is a mobile-first app that helps communities eat well within their budget. It combines AI-generated meal planning with **crowd-powered grocery pricing** — every user who scans a barcode at the shelf contributes real price data that helps their whole neighbourhood save money. Users set a weekly food budget, dietary goals, and preferred retailers — the app generates personalised recipes, surfaces community-reported prices across their chosen stores, tracks their purchase history to tailor future shopping lists, and learns from their favourites over time.

**Core value proposition:** "Band together to eat better for less." The more people scan, the more accurate prices become for everyone. Early users are pioneers who are building the price database that powers the whole community.

**Revenue:** Freemium subscriptions (RevenueCat). Free users contribute and benefit from community pricing. Plus/Pro users unlock AI personalisation, price trend analysis, cross-store split optimisation, price drop alerts, and AI-powered purchase habit reminders.

**Long-term vision:** The community scan engine and Item catalog are category-agnostic by design. V1 is grocery-only, but the same infrastructure extends to fuel prices (gas stations), home improvement supplies (lumber, hardware), and any other regularly purchased goods — without schema migrations.

---

## Launch scope — Texas only (V1)

> **V1 is Texas-only.** This reduces store coverage complexity, concentrates
> crowdsourced scan data for faster density, and limits support surface area.
> National expansion happens in V2, one state at a time.

### Texas store list — V1 (locked)

Six chains. No exceptions in V1.

Since there is no longer a pricing API dependency, **V1 supports all Texas grocery stores** — not just 6 chains. The store selector is a pre-populated static list of all major TX grocery chains. Users pick whichever stores they shop at, with no cap.

**TX grocery store list (pre-populated, not exhaustive — add more as needed):**

| Tier | Chains |
|---|---|
| Budget | Aldi, Walmart Supercenter, Walmart Neighborhood Market, WinCo Foods, Dollar General (Grocery) |
| Everyday | HEB, HEB Plus!, Kroger, Kroger Marketplace, Fiesta Mart, Randalls, Tom Thumb, United Supermarkets, Market Street, Brookshire Brothers, Brookshire's, Sprouts Farmers Market, Target (Grocery) |
| Premium | Whole Foods Market, Central Market, Trader Joe's |
| Warehouse | Costco, Sam's Club |
| Specialty | La Michoacana Meat Market, El Rancho Supermercado, Mi Tienda (HEB), Minyard Food Stores |

**No V1 chain restriction.** Any store in Texas can receive community price scans.

**Cold-start strategy:** Stores with no scan data show "Be the first to scan this item!" — framed as community building, not a gap. Bites rewards incentivise early scanning at any store.

### What Texas-only removes from V1
- MealMe API — deprecated; community crowdsourcing replaces it entirely
- Kroger Developer API — removed; no longer needed since we're not pulling prices from third parties
- Zyte scraper API — not needed
- Multi-timezone push notification logic — all users in Central Time
- Nationwide leaderboard — replaced with city-level (Austin, Houston, Dallas, San Antonio)

### Store onboarding — all TX stores, static list
No API call needed for store discovery. The mobile app ships with `TX_GROCERY_STORES`
pre-loaded. Users search/filter by name or tier. No cap on how many stores a user can add.

```typescript
// src/data/txStores.ts

export type StoreTier = 'budget' | 'everyday' | 'premium' | 'warehouse' | 'specialty'

export interface TXStore {
  name: string
  chain: string
  tier: StoreTier
  logo: { bg: string; text: string; color: string }
}

export const TX_GROCERY_STORES: TXStore[] = [
  // Budget
  { name: 'Aldi', chain: 'aldi', tier: 'budget', logo: { bg: '#FFF8E1', text: 'A', color: '#F57F17' } },
  { name: 'Walmart Supercenter', chain: 'walmart', tier: 'budget', logo: { bg: '#E3F2FD', text: 'W', color: '#1565C0' } },
  { name: 'Walmart Neighborhood Market', chain: 'walmart', tier: 'budget', logo: { bg: '#E3F2FD', text: 'W', color: '#1565C0' } },
  { name: 'WinCo Foods', chain: 'winco', tier: 'budget', logo: { bg: '#FFF3E0', text: 'WC', color: '#E65100' } },
  { name: 'Dollar General (Grocery)', chain: 'dollargeneral', tier: 'budget', logo: { bg: '#FFF9C4', text: 'DG', color: '#F9A825' } },
  // Everyday
  { name: 'HEB', chain: 'heb', tier: 'everyday', logo: { bg: '#E8F5E9', text: 'H', color: '#2E7D32' } },
  { name: 'HEB Plus!', chain: 'heb', tier: 'everyday', logo: { bg: '#E8F5E9', text: 'H+', color: '#2E7D32' } },
  { name: 'Kroger', chain: 'kroger', tier: 'everyday', logo: { bg: '#E8F5E9', text: 'K', color: '#1565C0' } },
  { name: 'Kroger Marketplace', chain: 'kroger', tier: 'everyday', logo: { bg: '#E8F5E9', text: 'KM', color: '#1565C0' } },
  { name: 'Fiesta Mart', chain: 'fiestamart', tier: 'everyday', logo: { bg: '#FCE4EC', text: 'FM', color: '#C62828' } },
  { name: 'Randalls', chain: 'randalls', tier: 'everyday', logo: { bg: '#E8EAF6', text: 'R', color: '#283593' } },
  { name: 'Tom Thumb', chain: 'tomthumb', tier: 'everyday', logo: { bg: '#E8EAF6', text: 'TT', color: '#283593' } },
  { name: 'United Supermarkets', chain: 'united', tier: 'everyday', logo: { bg: '#E3F2FD', text: 'U', color: '#1565C0' } },
  { name: 'Market Street', chain: 'marketstreet', tier: 'everyday', logo: { bg: '#E3F2FD', text: 'MS', color: '#1565C0' } },
  { name: 'Brookshire Brothers', chain: 'brookshirebrothers', tier: 'everyday', logo: { bg: '#E8F5E9', text: 'BB', color: '#1B5E20' } },
  { name: "Brookshire's", chain: 'brookshires', tier: 'everyday', logo: { bg: '#E8F5E9', text: "B'", color: '#1B5E20' } },
  { name: 'Sprouts Farmers Market', chain: 'sprouts', tier: 'everyday', logo: { bg: '#F1F8E9', text: 'SF', color: '#558B2F' } },
  { name: 'Target (Grocery)', chain: 'target', tier: 'everyday', logo: { bg: '#FFEBEE', text: 'T', color: '#B71C1C' } },
  // Premium
  { name: 'Whole Foods Market', chain: 'wholefoods', tier: 'premium', logo: { bg: '#EAF7EA', text: 'WF', color: '#1A6B1A' } },
  { name: 'Central Market', chain: 'centralmarket', tier: 'premium', logo: { bg: '#F3E5F5', text: 'CM', color: '#6A1B9A' } },
  { name: "Trader Joe's", chain: 'traderjoes', tier: 'premium', logo: { bg: '#FFF8E1', text: 'TJ', color: '#BF360C' } },
  // Warehouse
  { name: 'Costco', chain: 'costco', tier: 'warehouse', logo: { bg: '#E3F2FD', text: 'C', color: '#0D47A1' } },
  { name: "Sam's Club", chain: 'samsclub', tier: 'warehouse', logo: { bg: '#E3F2FD', text: 'SC', color: '#0D47A1' } },
  // Specialty
  { name: 'La Michoacana Meat Market', chain: 'lamichoacana', tier: 'specialty', logo: { bg: '#FCE4EC', text: 'LM', color: '#880E4F' } },
  { name: 'El Rancho Supermercado', chain: 'elrancho', tier: 'specialty', logo: { bg: '#FCE4EC', text: 'ER', color: '#880E4F' } },
  { name: 'Mi Tienda', chain: 'mitienda', tier: 'specialty', logo: { bg: '#E8F5E9', text: 'MT', color: '#2E7D32' } },
  { name: 'Minyard Food Stores', chain: 'minyards', tier: 'specialty', logo: { bg: '#FFF3E0', text: 'MF', color: '#E65100' } },
]

// Used in onboarding store search — filters by name or tier
export function searchStores(query: string): TXStore[] {
  const q = query.toLowerCase()
  return TX_GROCERY_STORES.filter(s =>
    s.name.toLowerCase().includes(q) || s.chain.includes(q) || s.tier.includes(q)
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

### National expansion — architecture provisions

V1 is Texas-only. The architecture is designed so national expansion is an addition, not a rewrite.

**Expansion path:** TX → FL → CA → NY. One state at a time.
Trigger: ~2,000 TX users with ~60% canonical price coverage signals the model is proven.

**What must be state-aware from day one (build this way in V1):**

| Concern | V1 (TX) | V2+ (national) |
|---|---|---|
| Store list | `TX_GROCERY_STORES` static array | `STORES_BY_STATE[state]` map — same structure, more entries |
| Geo restriction | TX bounding-box check | State-level bounding boxes per activated state |
| Community leaderboard | City-level (Austin, Houston, etc.) | Same model, scoped to `storeLocation.state` |
| Waitlist | Captures `state` field | Shows "We're not in [state] yet — join waitlist" |
| Store chain keys | TX chains (`heb`, `kroger`, etc.) | Additional chains per state — same `chain` key pattern |

**Code conventions to follow in V1 so V2 doesn't require rewrites:**
```typescript
// ✅ Do this — state-scoped data function
export function getStoresForState(state: string): TXStore[] {
  // V1: always returns TX_GROCERY_STORES (state param ignored)
  // V2: switch on state to return the right list
  return TX_GROCERY_STORES
}

// ❌ Don't do this — hardcoded Texas assumption in business logic
import { TX_GROCERY_STORES } from './txStores'
```

```prisma
// PriceObservation already stores storeLocation as JSON { lat, lng, address }
// Add storeLocation.state to that JSON in V1 so V2 can filter by state without migration
// storeLocation: { lat, lng, address, city, state: "TX" }

// Waitlist already has state field — use it
model Waitlist {
  id        String   @id @default(cuid())
  email     String   @unique
  state     String?  // "TX", "FL", etc.
  city      String?
  createdAt DateTime @default(now())
}
```

**What stays TX-only until V2:**
- Push notification timezone logic (all Central Time in V1)
- The `stores.tsx` onboarding screen hardcodes the TX store list (acceptable for V1)

### Category expansion — V2+ architecture

The `Item` catalog and scan pipeline are category-agnostic from day one. Adding a new
category in V2 means populating more `Item` rows and updating the store/vendor list —
not a schema migration.

**How much work is a new category? (honest estimate)**

The data layer is already ~70% done. The schema, API conventions, and code contracts
are already in place. Each new category is roughly a **2-sprint addition in V2**:

| Layer | V1 status | What changes per new category |
|---|---|---|
| Database schema | ✅ Done — `ItemCategory` enum, all models have `itemCategory` field | New `Item` rows only — no migrations ever |
| API endpoints | ✅ Partially done — all endpoints accept `?category=` param | Add category-specific validation + vendor list |
| Scan mechanic | ✅ Barcode scanner built in Sprint 4 | FUEL = manual price entry (no barcode); others reuse barcode scanner |
| Vendor/store list | ✅ Pattern established via `TX_GROCERY_STORES` | New `TX_VENDORS_BY_CATEGORY[category]` array — same structure |
| UI flows | ❌ Grocery-specific only in V1 | Fuel has no pantry; home improvement has "supplies" not meals |
| Meal planning | N/A — stays grocery-only forever | Not applicable to non-food categories |
| Reminders | ✅ Category-agnostic already | Push copy changes ("Time to fill up" vs "Restock eggs") |

**Decision: V1 is the blueprint. Do not build non-grocery UX flows in V1.**
The architecture is already correct. Every V2 category addition is additive, not a rewrite.
The trigger for V2 category expansion is the same as national expansion: ~2,000 TX users
and a proven crowdsourced pricing model.

**Planned expansion categories:**

| Category | Vendor type | Scan mechanic | Notes |
|---|---|---|---|
| `FUEL` | Gas stations (Shell, Chevron, HEB Gas, Buc-ee's) | Manual price entry at pump (no barcode) | Price per gallon; grade selector (87/89/93/diesel) |
| `HOME_IMPROVEMENT` | Home Depot, Lowe's, Ace Hardware | Barcode scan (same scanner) | Lumber, fasteners, paint — high price variance by region |
| `HOUSEHOLD` | Walmart, Target, Dollar General | Barcode scan | Cleaning supplies, paper goods |
| `PERSONAL_CARE` | CVS, Walgreens, HEB Pharmacy | Barcode scan | |

**What changes per category:**
- `Item.category` enum value
- Vendor list entry (same `TXStore` / future `Vendor` structure)
- Pantry UX for non-food items (FUEL has no pantry — skip; HOME_IMPROVEMENT has a "supplies" inventory)
- Reminder push copy ("Time to fill up — you usually get gas every 4 days")

**V1 code contract:** Any function that filters by category must accept `ItemCategory[]`
as a parameter, not hardcode `GROCERY`. Pantry and reminder endpoints should already
accept a `?category=` query param even if V1 only serves `GROCERY`.

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
- **Recipe generation + personalisation + price trend suggestions**: Anthropic Claude API (`claude-sonnet-4-6`)
- **Recipe database**: Spoonacular API
- **Nutrition data**: Edamam API + USDA FoodData Central (free)
- **Grocery pricing**: Community crowdsourced only (`PriceObservation` → `CanonicalPrice` pipeline). No third-party pricing APIs. Kroger API removed. MealMe deprecated.
- **Product barcode lookup**: Open Food Facts (free, no rate limits) + USDA FoodData Central

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
  trialEndsAt       DateTime? // set to now+7d on signup; null after expiry or paid conversion
  hasUsedTrial      Boolean   @default(false) // prevents second-account trial gaming

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
  preferredRetailers String[]  // chain keys from TX_GROCERY_STORES — no cap, any TX store
  locationRadius     Int       @default(10)  // miles — used for geo-restriction check only

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

// ── Purchase history ──────────────────────────────────────────────────────────
// Records what a user personally bought — distinct from PriceObservation
// (community price report). Both can be written in the same scan action.

model PurchaseHistory {
  id             String       @id @default(cuid())
  userId         String
  user           User         @relation(fields: [userId], references: [id])
  itemId         String?                       // FK to Item — preferred going forward
  item           Item?        @relation(fields: [itemId], references: [id])
  itemName       String                        // denormalised (e.g. "chicken breast", "87 Octane")
  itemCategory   ItemCategory @default(GROCERY)
  upc            String?                       // if product was scanned
  quantity       Float                         // how much they bought
  unit           String                        // "lb", "oz", "each", "gallon", etc.
  pricePerUnit   Float
  totalPrice     Float
  storeName      String
  storeId        String?
  planId         String?                       // which weekly meal plan this belonged to (GROCERY only)
  purchasedAt    DateTime     @default(now())

  @@index([userId, itemId])
  @@index([userId, itemName])
  @@index([userId, purchasedAt])
}
```

Add to User model:
```prisma
purchaseHistory    PurchaseHistory[]
pantryItems        PantryItem[]
purchaseReminders  PurchaseReminder[]
```

```prisma
// ── Purchase reminders (Pro) ──────────────────────────────────────────────────
// User-defined restock reminders for staple items (eggs, milk, olive oil, etc.)
// Frequency and quantity are set by the user. Auto-suggestions come from PurchaseHistory.

model PurchaseReminder {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id])
  itemId          String?                      // FK to Item
  item            Item?        @relation(fields: [itemId], references: [id])
  itemName        String       // e.g. "eggs", "87 Octane", "WD-40"
  itemCategory    ItemCategory @default(GROCERY)
  quantity        Float        // how much to buy
  unit            String       // "each", "gallon", "oz", "can", etc.
  frequencyDays   Int          // remind every N days
  lastRemindedAt  DateTime?    // null = never fired
  nextRemindAt    DateTime     // computed: lastRemindedAt + frequencyDays (or now on create)
  active          Boolean      @default(true)
  source          String       @default("manual")  // "manual" | "ai_suggested" | "rule_suggested"
  reasoning       String?      // AI reasoning string when source = "ai_suggested"
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@unique([userId, itemName])
  @@index([userId, nextRemindAt])    // used by the daily reminder job
  @@index([userId, itemCategory])
}
```

```prisma
// ── Pantry ────────────────────────────────────────────────────────────────────
// Represents what is currently in the user's physical pantry.
// Updated by: manual input, purchase history auto-sync, recipe cooked deductions.

model PantryItem {
  id              String       @id @default(cuid())
  userId          String
  user            User         @relation(fields: [userId], references: [id])
  itemId          String?                      // FK to Item
  item            Item?        @relation(fields: [itemId], references: [id])
  itemName        String       // normalised (e.g. "chicken breast", "olive oil", "wood screws")
  itemCategory    ItemCategory @default(GROCERY)
  quantity        Float        // current amount on hand
  unit            String       // "lb", "oz", "cups", "each", "gallon", etc.
  notes           String?      // e.g. "expires Fri", "opened"
  lastRestockedAt DateTime?    // set when quantity increases (purchase sync)
  updatedAt       DateTime     @updatedAt

  ledger          PantryLedger[]

  @@unique([userId, itemName])
  @@index([userId])
  @@index([userId, itemCategory])
}

model PantryLedger {
  id            String       @id @default(cuid())
  userId        String
  pantryItemId  String
  pantryItem    PantryItem   @relation(fields: [pantryItemId], references: [id])
  delta         Float        // positive = added, negative = used/removed
  unit          String
  action        PantryAction
  referenceId   String?      // purchaseId, mealId, etc.
  note          String?
  createdAt     DateTime     @default(now())

  @@index([pantryItemId, createdAt])
}

enum PantryAction {
  MANUAL_ADD       // user manually added stock
  MANUAL_REMOVE    // user manually removed/corrected stock
  PURCHASE         // synced from PurchaseHistory
  RECIPE_COOKED    // deducted when user marks a recipe as cooked
  EXPIRED          // user marked as expired/discarded
  ADJUSTMENT       // bulk correction
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

### Purchase history
```
POST   /purchases                  # Record a purchase (called on shopping list check-off)
GET    /purchases?ingredientName=  # History for a specific ingredient
GET    /purchases/summary          # All-time ingredient purchase summary for profile
```

### Pantry
```
GET    /pantry                     # All pantry items for the current user
POST   /pantry                     # Manually add or update a pantry item
PUT    /pantry/:ingredientName     # Update quantity / unit / notes for an item
DELETE /pantry/:ingredientName     # Remove item from pantry
POST   /pantry/sync-purchase       # Sync a purchase into pantry (called automatically after POST /purchases)
GET    /pantry/check?ingredients=  # Check pantry coverage for a list of ingredients (used by recipe detail)
```

### Recipes — mark as cooked
```
POST   /recipes/:id/cooked         # Mark a recipe as cooked; deducts ingredients from pantry
```

Request body:
```json
{ "servings": 2, "planMealId": "optional" }
```

Response:
```json
{
  "deductions": [
    { "ingredientName": "chicken breast", "deducted": 0.5, "unit": "lb", "remaining": 1.5 },
    { "ingredientName": "olive oil", "deducted": 2, "unit": "tbsp", "remaining": 8 }
  ],
  "missingFromPantry": ["garlic", "lemon"],
  "timesCooked": 3
}
```

Behaviour:
1. For each ingredient in `recipe.ingredients`, scale by `servings / recipe.servings`
2. Deduct from matching `PantryItem` (unit-normalised). If pantry item doesn't exist or goes negative, clamp to 0 and add to `missingFromPantry`
3. Write a `PantryLedger` entry with `action: RECIPE_COOKED` and `referenceId: planMealId`
4. If recipe is in user's `Favourite`, increment `timesCooked`
5. If `planMealId` provided, mark that `Meal` as cooked (future use)

### Price trends & AI suggestions
```
GET    /prices/trends?ingredient=&storeId=&days=   # Bucketed price history (Pro)
GET    /prices/suggestion?ingredient=&storeId=     # Claude-generated buy/sell suggestion (Pro)
```

### Purchase reminders (Pro)
```
GET    /reminders                  # List all reminders for the current user
POST   /reminders                  # Create a reminder
PUT    /reminders/:id              # Update frequency, quantity, or unit
DELETE /reminders/:id              # Remove a reminder
GET    /reminders/suggestions      # Suggest staples based on PurchaseHistory patterns
```

`POST /reminders` body:
```json
{ "ingredientName": "eggs", "quantity": 12, "unit": "each", "frequencyDays": 7 }
```

`GET /reminders/suggestions` — powered by Claude habit learning (Pro only). Passes the
user's full `PurchaseHistory` for each item to Claude, which identifies patterns beyond
simple averages: seasonality, quantity drift, price-sensitivity behaviour, correlation with
meal plans. Returns structured suggestions with a natural-language reasoning string.

```typescript
// Response shape from GET /reminders/suggestions
interface ReminderSuggestion {
  itemName: string
  itemCategory: ItemCategory         // GROCERY, FUEL, HOME_IMPROVEMENT, etc.
  suggestedQuantity: number
  suggestedUnit: string
  suggestedFrequencyDays: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string                  // e.g. "You buy milk every 4–5 days, usually 1 gallon.
                                     //  Usage increases in winter months."
}
```

Minimum data threshold before calling Claude: ≥ 3 purchases of the same item.
Below threshold: return rule-based suggestions only (average interval, no Claude call).

### Health
```
GET    /health                     # Unauthenticated — checks Kroger, Anthropic status
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
    maxStores: Infinity,         // no limit — community scanning is the product for all tiers
    maxFavourites: 10,
    maxCollections: 1,
    aiPersonalisation: false,
    priceTrends: false,
    aiPriceSuggestions: false,
    priceAlerts: false,
    purchaseReminders: false,
    nutritionDeepDive: false,
    familyProfiles: 0,
    crossStoreComparison: true,  // free users can see split suggestion (drives upgrade awareness)
  },
  PLUS: {
    mealPlansPerWeek: 7,
    maxStores: Infinity,
    maxFavourites: Infinity,
    maxCollections: Infinity,
    aiPersonalisation: true,
    priceTrends: false,
    aiPriceSuggestions: false,
    priceAlerts: true,
    purchaseReminders: false,
    nutritionDeepDive: false,
    familyProfiles: 0,
    crossStoreComparison: true,
  },
  PRO: {
    mealPlansPerWeek: Infinity,
    maxStores: Infinity,
    maxFavourites: Infinity,
    maxCollections: Infinity,
    aiPersonalisation: true,
    priceTrends: true,           // 7/30/90-day ingredient price history
    aiPriceSuggestions: true,    // Claude-powered buy/hold/substitute recommendations
    priceAlerts: true,
    purchaseReminders: true,     // scheduled push reminders for staples (eggs, milk, etc.)
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
  // Query CanonicalPrice (community DB) for each of the user's selected stores
  const results = await Promise.all(
    input.preferredRetailers.map(store =>
      queryCanonicalPrices(store, input.ingredients)
    )
  )
  return results.sort((a, b) => a.totalCost - b.totalCost)
}

async function queryCanonicalPrices(
  storeName: string,
  ingredients: ScanInput["ingredients"]
): Promise<StoreResult> {
  const items = await Promise.all(
    ingredients.map(async (ing) => {
      const canonical = await prisma.canonicalPrice.findFirst({
        where: {
          storeName: { equals: storeName, mode: 'insensitive' },
          // match ingredient name via Product → UPC lookup or direct name match
        },
        orderBy: { lastUpdated: 'desc' },
      })
      return {
        ingredient: ing.name,
        price: canonical?.weightedPrice ?? null,  // null = no community data yet
        unit: ing.unit,
        available: canonical !== null,
      }
    })
  )
  const totalCost = items.reduce((sum, i) => sum + (i.price ?? 0), 0)
  return { storeName, storeId: storeName, totalCost, items }
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

# Grocery Pricing APIs — community-sourced only; no third-party pricing API keys needed in V1
# ZYTE_API_KEY=your-key   # reserved for post-V1 expansion if needed

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
│       ├── stores.tsx          # Pick stores from TX_GROCERY_STORES (searchable dropdown)
│       ├── dietary.tsx         # Goals, allergies, cuisine prefs
│       └── complete.tsx        # Ready — generate first plan
│
├── (tabs)/
│   ├── _layout.tsx             # Tab bar config (5 tabs: Home, Explore, Pantry, Saved, Profile)
│   ├── index.tsx               # Home: this week's meal plan
│   ├── explore.tsx             # Discover recipes (Spoonacular browse)
│   ├── pantry.tsx              # Pantry: current stock, add items, view history
│   ├── saved.tsx               # Favourites + collections
│   └── profile.tsx             # Account, preferences, rewards, subscription
│
├── recipe/
│   └── [id].tsx                # Recipe detail, price comparison, favourite btn, mark as cooked
│
├── pantry/
│   └── [ingredientName].tsx    # Pantry item detail: quantity history, edit, ledger
│
├── scanner/
│   ├── index.tsx               # Camera view + barcode overlay
│   ├── confirm.tsx             # Price + quantity confirmation
│   └── success.tsx             # Item checked off + Bites celebration
│
└── shopping-list/
    └── [planId].tsx            # Shopping list grouped by store, check-off flow
```

---

## Key component list (mobile)

```
components/
├── MealPlanCard.tsx            # Week grid with meal tiles
├── RecipeCard.tsx              # Card with image, cost, tags
├── RecipeDetail.tsx            # Full recipe view
├── PriceCompareBar.tsx         # Store vs store cost comparison
├── BestStoreCard.tsx           # Winner store card with savings callout
├── FavouriteButton.tsx         # Heart toggle with animation
├── CollectionPicker.tsx        # Sheet: save to collection
├── StoreSelector.tsx           # Store search + multi-select from TX_GROCERY_STORES
├── BudgetGauge.tsx             # Visual weekly spend tracker
├── TierGatePrompt.tsx          # Upgrade prompt when hitting a limit
├── NutritionCard.tsx           # Macro breakdown (Pro)
├── OnboardingStep.tsx          # Reusable onboarding wrapper
├── PantryList.tsx              # Grouped pantry items with quantity chips
├── PantryItemRow.tsx           # Single pantry row: name, quantity, unit, last restocked
├── PantryItemEditor.tsx        # Sheet: add/edit pantry item (name, qty, unit, notes)
├── CookConfirmSheet.tsx        # Sheet: servings picker + pantry deduction preview
├── PantryIngredientBadge.tsx   # "In pantry: 1.5 lb" chip shown on recipe ingredients
├── ReminderCard.tsx            # Reminder row: ingredient, quantity, frequency chip, next-due
└── ReminderEditor.tsx          # Sheet: ingredient name, qty + unit pickers, frequency picker
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
- Store selector (searchable dropdown from TX_GROCERY_STORES, any number of stores)
- Budget input screen
- Dietary goals + allergies screen
- Home screen with empty state + "Generate plan" CTA

**Backend tasks:**
- [x] Monorepo setup (Turborepo, Expo, Fastify, Prisma, pnpm)
- [x] Supabase project + full schema migration (ALL models including rewards/scanner groundwork)
- [x] Auth: signup, login, logout, JWT middleware, `/auth/me`
- [x] `GET /stores/nearby` — serve static `TX_GROCERY_STORES` list; no external API call needed
- [x] User profile CRUD — budget, retailers (any TX stores, no cap), dietary, location

**Mobile tasks:**
- [x] Expo Router scaffold with tab navigator (4 tabs in S1–S6: Home, Plan, Shop, Saved — Rewards tab added in Sprint 7)
- [x] Install offline dependencies: `@react-native-community/netinfo`, `@react-native-async-storage/async-storage`
- [x] Install rate limiting: `@fastify/rate-limit` (configured in Sprint 1, limits added per-sprint)
- [x] Auth screens: login, signup — wired to API
- [x] Onboarding flow: location permission → store selector → budget → dietary → complete
- [x] Home screen: empty state with "Generate plan" button (button is non-functional until Sprint 2)
- [x] Profile screen: shows stored preferences, edit links

**Definition of done:**
```
✓ App installs on iOS Simulator (npx expo start)
✓ Can create account with email + password
✓ Location permission granted → nearby stores appear sorted by distance
✓ Can select any number of stores from TX_GROCERY_STORES static list
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
- [x] Claude `generateMealPlan` service (claude-sonnet-4-6, full prompt from CLAUDE.md)
- [x] `POST /plans/generate` with tier gate (2/week for free tier, Redis counter)
- [x] `GET /plans/current` — returns the active plan for the current week (used by Home screen)
- [x] `GET /plans` — paginated history, used by a future "past plans" screen
- [x] `GET /plans/:id/meals/:mealId` — single meal detail
- [x] `POST /plans/:id/regenerate-meal` — regenerate one meal slot
- [ ] Spoonacular fallback for recipe image lookup by title

**Mobile tasks:**
- [x] `MealPlanCard` component — 7-day grid, day tabs, meal type rows
- [x] `RecipeCard` component — image, title, time, cost pill, tags
- [x] Recipe detail screen — hero image, ingredient list, step-by-step instructions
- [x] `NutritionCard` component — calories, protein, carbs, fat
- [x] Loading skeleton while plan generates (~8–12s for Claude call)
- [x] Error state if generation fails with retry button
- [x] "Generate plan" button on home wired to `POST /plans/generate`

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
- [x] Kroger API client — OAuth2, product search, price extraction (**subsequently removed post-Sprint 3; Kroger is now community-scanned like all other stores**)
- [x] `scanPrices` orchestrator — fan out to user's stores, compute `bestSingleStore` + `bestSplitOption`
- [x] Split optimizer — greedy per-ingredient algorithm, `SPLIT_THRESHOLD = $3`
- [x] `GET /prices/scan?recipeId=&planId=` with store count tier gate
- [x] Redis price cache — 1hr TTL per `(recipeId, storeList)` hash
- [x] `GET /shopping-list/:planId` — full week's ingredients merged, deduped, sorted by store
- [x] MealMe API client — **deprecated; client file retained but disabled. Community scan pipeline is the replacement.**

**Mobile tasks:**
- [x] Price section on recipe detail — ingredient rows with per-store prices
- [x] `PriceCompareBar` component — store comparison strip
- [x] `BestStoreCard` component — winner card with distance, total, savings callout
- [x] Mode toggle — "Best single store" / "2-store split"
- [x] Split view — two store cards with their assigned items
- [x] Shopping list screen — grouped by store, checkable rows, progress bar
- [ ] "Add to this week's plan" CTA on recipe detail
  Deferred pending product definition.

> **Pricing pivot note:** MealMe API is deprecated. Sprint 3 UI is complete and the
> degraded-state path (no live prices → "scan to unlock" CTA) is now the correct
> permanent behaviour for non-Kroger stores until community scan data accumulates.
> The scanner (Sprint 4) is the data source that feeds prices back into this UI.

**Definition of done:**
```
✓ Recipe detail shows Kroger prices for Kroger stores; "scan to unlock" for others
✓ "Best store" correctly identifies cheapest option across user's 2 stores
✓ 2-store split option only appears when savings >= $3
✓ Shopping list generates correctly for a full week plan
✓ Checking off an item persists (survives app restart)
✓ Prices load within 5s (Redis cache hit: <500ms, canonical miss: <2s)
✓ Graceful "scan to unlock" state shown when no community data exists for a store
```

---

### Sprint 4 — "I scan items, build the community price database, manage my pantry, and the app remembers what I buy"
**Duration:** Week 7–8
**Deliverable:** Open the scanner from the shopping list. Scan a barcode → product identified → confirm price + quantity → item checked off + Bites awarded. Every check-off (scan or manual) syncs into your Pantry. The Pantry tab shows everything you have at home. Mark a recipe as cooked → the app deducts the ingredients used from your pantry automatically. Shopping list shows "Last bought: 2 lb @ HEB" for previously purchased items.

**What you can demo:**
- Shopping list → camera icon → scanner opens
- Point camera at any grocery barcode → product identified within 2s
- Price + quantity confirmation screen — confirm shelf price and how much you bought
- Submit → item checked off + celebration screen (confetti, Bites counter, community impact)
- Shopping list items with purchase history badge: "Last bought: 2 lb @ HEB"
- Checking off without scanning also prompts quantity confirmation
- Pantry tab — list of all current pantry items with quantities
- Manually add an item to pantry (e.g. "olive oil — 16 oz")
- Recipe detail → "Mark as Cooked" → servings picker → pantry deduction preview → confirm
- Pantry updates reflect deducted ingredients after cooking
- Rewards tab (5th nav item) — Bites balance, streak flame, badges, leaderboard

**Backend tasks:**
- [x] `GET /products/lookup/:upc` — Open Food Facts → USDA → Product table cache
- [x] `POST /prices/observation` — write scan to `PriceObservation`, trigger canonical recompute
- [x] `processScanReward` service — base + pioneer + stale + streak Bites logic
- [x] Canonical price recompute job (BullMQ) — weighted median from last 7 days of observations
- [x] `POST /purchases` — record a purchase; auto-calls `POST /pantry/sync-purchase`
- [x] `GET /purchases?ingredientName=` — purchase history for a specific ingredient
- [x] `GET /shopping-list/:planId` updated — include `lastPurchase` per ingredient
- [x] Pantry CRUD — `GET/POST/PUT/DELETE /pantry`
- [x] `POST /pantry/sync-purchase` — add purchased quantity to pantry item (upsert + ledger entry)
- [x] `GET /pantry/check?ingredients=` — coverage check for recipe detail
- [x] `POST /recipes/:id/cooked` — scale + deduct ingredients, write ledger, increment timesCooked
- [x] `GET /rewards/balance`, `/rewards/ledger`, `/rewards/leaderboard`, `/rewards/badges`
- [x] `GET /community/impact` — aggregate savings stats, cached hourly per city

**Mobile tasks:**
- [x] Scanner screen — Vision Camera + ML Kit barcode scanning
- [x] Product confirm screen — name, image, price input, quantity input, store shown
- [x] Celebration screen — confetti, animated Bites counter, community impact line
- [x] Shopping list: check-off flow prompts quantity + store confirmation (scan or manual)
- [x] Shopping list: "Last bought: X unit @ store" badge per ingredient
- [x] Pantry tab (accessible from tab bar or profile)
- [x] `PantryList` component — grouped/sorted pantry items with quantity chips
- [x] `PantryItemEditor` — add/edit item (name, quantity, unit, notes)
- [x] Recipe detail: "Mark as Cooked" button → servings picker → pantry deduction preview sheet → confirm
- [x] Post-cook confirmation: shows what was deducted + what was missing from pantry
- [x] Rewards tab (5th nav item)
- [x] Balance card, streak flame, progress bars, badge grid, leaderboard

**Definition of done:**
```
✓ Scanner opens on physical device (camera required)
✓ Barcode scan → product identified → writes PriceObservation + PurchaseHistory + PantryItem
✓ Bites awarded correctly — verify in DB
✓ Shopping list shows "Last bought" for ingredients with purchase history
✓ Check-off without scan still prompts quantity capture
✓ Pantry tab shows all items with correct quantities
✓ Manually adding a pantry item persists and appears immediately
✓ Marking a recipe as cooked deducts ingredients from pantry (verify in DB)
✓ Ingredients not in pantry are listed as "missing" in post-cook summary
✓ Pantry quantity for a purchase is incremented correctly via sync-purchase
✓ Rewards tab shows correct balance, streak, and leaderboard position
```

---

### Sprint 5 — "The app learns my taste, shows me price trends, and tells me when to stock up"
**Duration:** Week 9
**Deliverable:** Generate a new meal plan after having saved recipes — it visibly
reflects your preferences. On any ingredient or recipe, tap "Price Trend" to see a
chart of community-reported prices over time with an AI-generated suggestion:
"Chicken breast is up 12% this week — consider substituting thighs or buying now while
it's under $3/lb." Shopping lists highlight ingredients that are cheaper than usual
(green arrow) or more expensive (red arrow). Price drop alerts notify you when a
recipe's total cost drops to your target.

**What you can demo:**
- Generate plan after 5+ saves → meals visibly reflect your taste preferences
- Each meal card shows "Personalised for you" tag (Plus/Pro)
- Tap an ingredient on the shopping list → price trend chart (7/30/90-day)
- AI suggestion card below chart: buy-more / buy-less / substitute recommendation
- Price trend indicators on shopping list rows: ↑ up, ↓ down, → stable vs last week
- "You bought 2 lb last time — add same amount?" pre-fill from purchase history
- Set a price drop alert on any recipe (Plus gate for free users)
- Simulated push notification: "Salmon is now $8.99/lb at Kroger — you set an alert at $9"

**Backend tasks:**
- [ ] Favourites summary builder — extract taste patterns from saved recipes
- [x] Updated Claude `generateMealPlan` prompt — inject favourites context for Plus/Pro; tier-based max_tokens (5k FREE / 8k paid)
- [ ] BullMQ + Redis setup for background jobs (if not already from Sprint 4)
- [x] `priceTrendService` — aggregate `PriceObservation` history into weekly buckets per (ingredientName, storeId)
- [x] `GET /prices/trends?ingredient=&storeId=&days=` — returns bucketed trend data (Pro gate)
- [x] `GET /prices/suggestion?ingredient=&storeId=` — calls Claude Haiku with trend data, returns buy/hold/substitute suggestion (Pro gate)
- [ ] Price polling job — runs every 6h, checks canonical price against alert target
- [x] `POST /prices/alert`, `GET /prices/alerts`, `DELETE /prices/alerts/:id`
- [ ] Push notification service (Expo Notifications)
- [ ] Shopping list response enriched with `trendDirection: 'up' | 'down' | 'stable'` per ingredient
- [x] Purchase reminders CRUD — `GET/POST/PUT/DELETE /reminders` (Pro gate)
- [x] `GET /reminders/suggestions` — Claude Haiku habit learning (Pro gate); rule-based fallback below 3-purchase threshold
- [ ] Daily reminder job (BullMQ cron) — query `PurchaseReminder` where `nextRemindAt <= now AND active = true`, fire push notification, update `lastRemindedAt` + `nextRemindAt`

**Mobile tasks:**
- [ ] "Personalised for you" tag on meal cards (Plus/Pro only)
- [ ] "Why this?" explanation bottom sheet
- [ ] Price trend chart screen — line chart with 7/30/90-day toggle
- [ ] AI suggestion card below trend chart (Plus/Pro — upgrade prompt for free)
- [ ] Trend indicator arrows on shopping list rows (↑ ↓ →)
- [ ] "Last bought X — add same?" pre-fill on shopping list quantity
- [ ] Price alert UI on recipe detail — set target price, view active alerts
- [ ] Notification permission request flow
- [ ] Alert triggered notification deep-link → recipe detail
- [ ] Reminders screen (within Profile or standalone) — list active reminders, add/edit/delete
- [ ] `ReminderCard` component — ingredient name, quantity, unit, frequency chip, next-due date
- [ ] `ReminderEditor` bottom sheet — name input, quantity + unit pickers, frequency picker (daily / every 3d / weekly / every 2w / monthly / custom N days)
- [ ] `GET /reminders/suggestions` surfaced as "Add suggested reminders" banner when ≥1 suggestion exists (Pro gate prompt for free/Plus users)

**Definition of done:**
```
✓ Plan generated after 5+ saves is noticeably different from the cold-start plan
✓ "Why this?" sheet shows a coherent personalised explanation (not generic text)
✓ Price trend chart loads for any ingredient with >= 3 community observations
✓ AI suggestion is coherent and references the actual trend direction
✓ Free user sees upgrade prompt when tapping AI suggestion (Plus gate)
✓ Shopping list shows ↑/↓/→ trend indicators for ingredients with trend data
✓ "Last bought" pre-fill appears for ingredients in purchase history
✓ Price alert can be created, appears in active alerts list, and fires a push notification
✓ Background price polling job runs without crashing (verify in Railway/Fly logs)
✓ Pro user can create a purchase reminder with custom frequency + quantity
✓ Daily reminder job fires a push notification when nextRemindAt is reached (verify in logs)
✓ nextRemindAt advances correctly after notification fires
✓ /reminders/suggestions returns items detected from PurchaseHistory patterns (≥3 purchases)
✓ Non-Pro user sees upgrade prompt when tapping "Set reminder"
```

---

### Sprint 6 — "I can save recipes I love and organise them"
**Duration:** Week 10
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

### Sprint 7 — "I can subscribe and unlock everything"
**Duration:** Week 11
**Deliverable:** Full paywall flow working end-to-end on a physical device.
New users get a 7-day Pro trial on signup. Free user hits a gate → sees
upgrade prompt → taps upgrade → completes purchase in sandbox → tier updates
instantly → gated features unlock without restarting the app.

**What you can demo:**
- New user signs up → automatically enters 7-day Pro trial → banner shows "Pro Trial — X days left"
- Trial user can use all Pro features (trends, AI suggestions, reminders, unlimited plans)
- Trial expires → graceful downgrade to Free, upgrade prompt appears
- Free user exhausts 2 weekly plans → gate prompt with "You had Pro for free — get it back for $9.99/mo"
- Tap "Upgrade to Plus/Pro" → RevenueCat paywall sheet
- Complete sandbox purchase on device
- Return to app — tier updates, gates lift, counter resets
- Profile screen shows active subscription + renewal date
- Downgrade / cancel flow

**Backend tasks:**
- [ ] RevenueCat webhook handler — verify signature, update `user.tier`
- [ ] `GET /subscription/status` — current tier, limits, renewal date, trial status
- [ ] All tier gates wired to live DB tier (not hardcoded)
- [ ] Trial grant on signup — set `trialEndsAt = now + 7 days`, `tier = PRO` on `POST /auth/signup`
- [ ] Trial expiry job (BullMQ, daily cron) — downgrade users where `trialEndsAt < now AND hasActiveSubscription = false`
- [ ] `POST /subscription/sync` — recognise RevenueCat trial entitlement (`is_trial_period`) and map to `PRO` tier; recognise expiry and downgrade

**Mobile tasks:**
- [ ] RevenueCat SDK configured with products + introductory offer (7-day free trial on Pro SKU)
- [ ] Trial banner — "Pro Trial · X days left" shown in header during trial
- [ ] `TierGatePrompt` component — contextual upgrade prompt per gate; includes "You had Pro free" framing post-trial
- [ ] Paywall screen — 3-tier comparison (Free / Plus / Pro) with "Start 7-day free trial" CTA on Pro
- [ ] Purchase success animation + tier update without app restart
- [ ] Profile subscription card — tier badge, trial end date (during trial) / renewal date (post-purchase), manage link
- [ ] Restore purchases flow
- [ ] Day-6 trial reminder push notification: "Your Pro trial ends tomorrow — keep your meal planning streak going"

**Definition of done:**
```
✓ New user signup automatically grants 7-day Pro trial
✓ Trial banner shows correct days remaining throughout trial
✓ All Pro features accessible during trial (trends, AI suggestions, reminders)
✓ Trial expiry downgrades user to Free without data loss
✓ Upgrade prompt post-trial references the trial experience
✓ Sandbox purchase completes successfully on physical iOS or Android device
✓ User tier updates within 5s of purchase completion (webhook received)
✓ Gated features unlock immediately after purchase (no restart)
✓ Profile screen shows correct tier and renewal/trial-end date
✓ Restore purchases correctly identifies existing entitlement
✓ Day-6 trial reminder push notification fires correctly
✓ Second signup with same email cannot claim a second trial (hasUsedTrial guard)
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
- [ ] Production API keys for all services (Anthropic, Spoonacular, Edamam, RevenueCat)
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

- **Cache canonical price lookups in Redis for 1 hour** — avoid repeated DB scans on ingredient lookups
- **Cache Spoonacular recipe data** — recipe content doesn't change; cache indefinitely
- **Batch Claude token usage** — generate a full 7-day plan in one API call, not 21 separate calls
- **Rate-limit free users at the API level** — enforce `mealPlansPerWeek` counter in Redis, not just DB
- **Gate Claude price suggestions to Plus tier** — each `/prices/suggestion` call is an Anthropic API cost
- **Use Spoonacular for recipe lookup, Claude only for personalisation + suggestions** — cheaper per call

---

## Store selection logic

### User store preferences
Users select **any number of stores** from `TX_GROCERY_STORES` (all TX chains).
Stored as `preferredRetailers: string[]` (chain keys) in `UserProfile`. No cap.
`maxStores` field has been removed — it was only needed to limit API call costs.

### Store onboarding UX
- Searchable dropdown backed by static `TX_GROCERY_STORES` — no API call required
- Users can add/remove stores any time from Profile → Stores
- No location-based sort needed (stores are chains, not specific locations)

### Price scan output shape (community-sourced)
`scanPrices` queries `CanonicalPrice` for each of the user's selected store chains:

```typescript
interface ScanResult {
  bestSingleStore: {
    storeName: string
    totalCost: number
    items: IngredientPrice[]
    hasData: boolean           // false = store has no community scans yet for these ingredients
  }
  bestSplitOption: {
    totalCost: number
    savings: number
    worthSplitting: boolean    // true only if savings >= SPLIT_THRESHOLD ($3)
    stores: { storeName: string; subtotal: number; items: IngredientPrice[] }[]
  } | null
}

const SPLIT_THRESHOLD = 3.00
```

### Split optimizer algorithm
```typescript
function computeBestSplit(stores: StoreResult[]): SplitOption {
  // Greedy per-ingredient assignment:
  // For each ingredient, assign to whichever store has the lower community price
  // Then compare total vs best single store
  // Only return split if savings >= SPLIT_THRESHOLD
}
```

---

## Barcode scanner + crowdsourced pricing — Sprint 4 core feature

> **Status: Sprint 4 — this IS the product.** MealMe API was deprecated.
> Community scan data is now the PRIMARY pricing source. The scanner is not a stretch
> goal; it is the engine that makes prices work for every store except Kroger.

### Why this matters
Every user scan is a real, timestamped price observation at a specific store. Over time
this becomes a proprietary pricing database that is more local and more accurate than
any third-party API — and eliminates third-party API costs at scale.

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
// ── Item catalog ─────────────────────────────────────────────────────────────
// Generic item/product catalog. Not grocery-only — designed to extend to fuel,
// home improvement, household goods, and any other scannable category in V2+.

model Item {
  id              String       @id @default(cuid())
  name            String       // normalised name (e.g. "Dozen Eggs", "87 Octane Gas", "2x4 Lumber 8ft")
  category        ItemCategory // GROCERY | FUEL | HOME_IMPROVEMENT | HOUSEHOLD | PERSONAL_CARE | OTHER
  subcategory     String?      // free-form: "dairy", "produce", "fasteners", "engine fuel"
  upc             String?      @unique  // barcode — null for fuel, bulk items, etc.
  brand           String?
  defaultUnit     String       // "each", "gallon", "lb", "oz", "sheet", etc.
  unitSize        String?      // "1 dozen", "16 oz", "8 ft"
  imageUrl        String?
  source          String       // "open_food_facts" | "usda" | "user_submitted" | "manual"
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  priceObservations PriceObservation[]
  canonicalPrices   CanonicalPrice[]
  purchaseHistory   PurchaseHistory[]
  pantryItems       PantryItem[]
  reminders         PurchaseReminder[]
}

enum ItemCategory {
  GROCERY          // food + beverages — V1 primary
  FUEL             // gas stations — V2
  HOME_IMPROVEMENT // hardware, lumber, tools — V2
  HOUSEHOLD        // cleaning, paper goods — V2
  PERSONAL_CARE    // pharmacy, beauty — V2
  PET_SUPPLIES     // V2
  OTHER            // catch-all for future expansion
}

model PriceObservation {
  id              String   @id @default(cuid())
  itemId          String?                       // FK to Item — null only for legacy rows
  item            Item?    @relation(fields: [itemId], references: [id])
  itemName        String                        // denormalised for query perf + legacy compat
  upc             String?                       // barcode (null for fuel pump scans etc.)
  storeId         String
  storeName       String
  storeLocation   Json                          // { lat, lng, address, city, state }
  price           Float
  unitSize        String?                       // "16oz", "1lb", "per gallon", etc.
  unitPrice       Float?                        // price / unitSize for cross-size comparison
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  scannedAt       DateTime @default(now())
  confidence      Float    @default(1.0)        // 0-1, decays with age
  verified        Boolean  @default(false)      // true if corroborated by another user's scan

  @@index([itemId, storeId])
  @@index([upc, storeId])
  @@index([storeId, scannedAt])
}

model CanonicalPrice {
  id               String   @id @default(cuid())
  itemId           String?                      // FK to Item
  item             Item?    @relation(fields: [itemId], references: [id])
  itemName         String                       // denormalised
  upc              String?
  storeId          String
  storeName        String
  weightedPrice    Float                        // computed weighted median from observations
  observationCount Int
  lastUpdated      DateTime @updatedAt
  staleBefore      DateTime                     // observations older than this are ignored

  @@unique([itemId, storeId])
  @@index([itemId])
  @@index([upc, storeId])                       // backward compat lookup by UPC
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

### Price reconciliation — how conflicting community reports are resolved

Multiple users reporting different prices for the same item at the same store is expected
and not inherently a data problem. The reconciliation layer must distinguish between
legitimate causes (price changed, sale running, different store location) and noise
(user error, bad actor).

#### Why prices legitimately differ

| Cause | How to detect |
|---|---|
| Price actually changed | Two tight price clusters separated by time |
| Sale / promo pricing | Price >20% below canonical, short window, few reporters |
| Unit size confusion | `unitPrice` (price-per-unit) differs but raw price doesn't |
| Store-location variance | `storeLocation.lat/lng` clusters differ within same chain |
| User error / bad actor | Observation is a statistical outlier across all clusters |

#### Algorithm: enhanced weighted median with cluster detection

```typescript
// src/jobs/canonicalPriceJob.ts

async function recomputeCanonicalPrice(itemId: string, storeId: string) {
  const cutoff = subDays(new Date(), 7)
  const observations = await prisma.priceObservation.findMany({
    where: { itemId, storeId, scannedAt: { gte: cutoff }, quarantined: false },
    include: { user: { include: { profile: true } } },
    orderBy: { scannedAt: 'desc' },
  })
  if (observations.length < 3) return

  // 1. Detect clusters — if gap between sorted prices exceeds 15% of median,
  //    treat as a price-change event rather than conflicting data
  const sorted = [...observations].sort((a, b) => a.price - b.price)
  const median = sorted[Math.floor(sorted.length / 2)].price
  const clusters = detectClusters(sorted, median * 0.15)

  // 2. If multiple clusters: newer cluster is canonical, older is previousPrice
  const activeCluster = clusters.sort((a, b) =>
    b.latestScan.getTime() - a.latestScan.getTime()
  )[0]
  const previousCluster = clusters[1] ?? null

  // 3. Within active cluster: weighted median using recency + contributorScore
  const weightedMedian = computeWeightedMedian(
    activeCluster.observations.map((obs, i) => ({
      price: obs.price,
      weight: Math.pow(0.9, i) * (obs.user.profile?.contributorScore ?? 1.0),
    }))
  )

  // 4. Sale detection — if active cluster is >20% below 30-day baseline
  //    and has < 3 corroborated observations, flag as SALE not canonical
  const baseline = await get30DayBaseline(itemId, storeId)
  const isSale = baseline && weightedMedian < baseline * 0.80
    && activeCluster.observations.filter(o => o.verified).length < 3

  // 5. Compute variance band for low-confidence display
  const prices = activeCluster.observations.map(o => o.price).sort((a, b) => a - b)
  const p25 = prices[Math.floor(prices.length * 0.25)]
  const p75 = prices[Math.floor(prices.length * 0.75)]

  await prisma.canonicalPrice.upsert({
    where: { itemId_storeId: { itemId, storeId } },
    update: {
      weightedPrice:      weightedMedian,
      observationCount:   activeCluster.observations.length,
      priceTag:           isSale ? 'SALE' : 'REGULAR',
      previousPrice:      previousCluster ? computeWeightedMedian(previousCluster.observations.map(o => ({ price: o.price, weight: 1 }))) : null,
      previousPriceUntil: previousCluster ? activeCluster.observations[activeCluster.observations.length - 1].scannedAt : null,
      varianceP25:        p25,
      varianceP75:        p75,
      staleBefore:        cutoff,
    },
    create: { itemId, storeId, storeName: observations[0].storeName, weightedPrice: weightedMedian,
      observationCount: activeCluster.observations.length, priceTag: isSale ? 'SALE' : 'REGULAR',
      varianceP25: p25, varianceP75: p75, staleBefore: cutoff },
  })
}

function detectClusters(
  sorted: PriceObservation[],
  gapThreshold: number
): Cluster[] {
  const clusters: Cluster[] = []
  let current: PriceObservation[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].price - sorted[i - 1].price > gapThreshold) {
      clusters.push({ observations: current, latestScan: current[0].scannedAt })
      current = []
    }
    current.push(sorted[i])
  }
  clusters.push({ observations: current, latestScan: current[0].scannedAt })
  return clusters
}
```

#### Outlier quarantine

Observations outside 2 standard deviations from the active cluster median are marked
`quarantined = true`. They are excluded from canonical calculations but **never deleted**:

- If the cluster later shifts toward a quarantined value, it may represent an early
  scan of a genuine price change — it gets unquarantined and reprocessed
- Repeatedly quarantined observations from the same user reduce their `contributorScore`

```typescript
async function quarantineOutliers(observations: PriceObservation[], clusterMedian: number) {
  const stdDev = computeStdDev(observations.map(o => o.price))
  for (const obs of observations) {
    if (Math.abs(obs.price - clusterMedian) > 2 * stdDev) {
      await prisma.priceObservation.update({
        where: { id: obs.id },
        data: { quarantined: true },
      })
      // Penalise contributorScore slightly for consistently quarantined users
      await adjustContributorScore(obs.userId, -0.05)
    }
  }
}
```

#### Corroboration — the accuracy incentive

When a second user scans the same item at the same store within **48 hours** and their
price is within **10%** of the first scan, both observations are marked `verified = true`
and earn the +3 Bites verification bonus. Verified observations carry **2× weight**
in the median calculation.

```typescript
async function checkCorroboration(newObs: PriceObservation) {
  const window = subHours(new Date(), 48)
  const nearby = await prisma.priceObservation.findFirst({
    where: {
      itemId:   newObs.itemId,
      storeId:  newObs.storeId,
      scannedAt: { gte: window },
      userId:   { not: newObs.userId },
      quarantined: false,
    },
  })
  if (!nearby) return

  const priceDiff = Math.abs(newObs.price - nearby.price) / nearby.price
  if (priceDiff <= 0.10) {
    await prisma.priceObservation.updateMany({
      where: { id: { in: [newObs.id, nearby.id] } },
      data: { verified: true },
    })
    await awardBites(newObs.userId,  3, BitesReason.VERIFIED_SCAN, newObs.id)
    await awardBites(nearby.userId,  3, BitesReason.VERIFIED_SCAN, nearby.id)
  }
}
```

#### User credibility scoring

`contributorScore` lives on `UserProfile` (default `1.0`). It is the weight multiplier
applied to a user's scans in the canonical median calculation.

| Event | Adjustment |
|---|---|
| Scan corroborated within 48h | +0.10 (capped at 3.0) |
| Scan matches existing canonical within 5% | +0.02 |
| Scan quarantined as outlier | -0.05 |
| 10+ consecutive quarantined scans | Flag for manual review, hold Bites |

Score never goes below 0.1 — everyone's scans still count, just with reduced weight.
This prevents gaming while keeping the bar for contribution low.

#### What the UI displays — confidence-driven format

```typescript
// src/services/pricingService.ts

function formatPriceDisplay(canonical: CanonicalPrice): PriceDisplay {
  const ageHours = differenceInHours(new Date(), canonical.lastUpdated)
  const isVerified = canonical.observationCount >= 5
  const isRecent   = ageHours < 24
  const isNarrow   = (canonical.varianceP75 - canonical.varianceP25) / canonical.weightedPrice < 0.08

  if (isVerified && isRecent && isNarrow) {
    return { label: `~$${canonical.weightedPrice.toFixed(2)}`, confidence: 'high' }
  }
  if (canonical.observationCount >= 3) {
    return { label: `~$${canonical.weightedPrice.toFixed(2)}`, confidence: 'medium' }
  }
  // Low confidence — show range instead of false precision
  return {
    label: `est. $${canonical.varianceP25?.toFixed(2)}–$${canonical.varianceP75?.toFixed(2)}`,
    confidence: 'low',
  }
}

// Special cases
// Sale detected:         "~$2.49 (may be on sale)"
// Price change detected: "Recently changed: was ~$3.99, now ~$4.49"
// No data:               "Be the first to scan this!"
```

#### Schema additions required

```prisma
// Add to PriceObservation:
quarantined  Boolean   @default(false)  // outlier — excluded from canonical calc
priceTag     PriceTag  @default(REGULAR)

// Add to CanonicalPrice:
previousPrice       Float?    // last canonical before detected price change
previousPriceUntil  DateTime? // when the price change was detected
priceTag            PriceTag  @default(REGULAR)
varianceP25         Float?    // 25th percentile — used for low-confidence range display
varianceP75         Float?    // 75th percentile

enum PriceTag {
  REGULAR    // normal shelf price
  SALE       // detected promo — below-threshold, short window, few corroborations
  MEMBER     // loyalty card price (e.g. Kroger Plus, HEB card)
  CLEARANCE  // user explicitly flagged
}
```

#### Tests required (Sprint 4)

```typescript
describe('canonicalPriceJob — reconciliation', () => {
  it('detects two price clusters and uses the newer one as canonical', ...)
  it('stores the older cluster price as previousPrice', ...)
  it('quarantines observations > 2 std deviations from cluster median', ...)
  it('does not delete quarantined observations', ...)
  it('flags active cluster as SALE when >20% below 30-day baseline with <3 verified', ...)
  it('applies 2x weight to verified observations in median', ...)
  it('applies contributorScore as weight multiplier', ...)
  it('returns low-confidence range display when variance is wide', ...)
})

describe('checkCorroboration', () => {
  it('marks both observations verified when price within 10% and within 48h', ...)
  it('awards +3 Bites to both users on corroboration', ...)
  it('does not corroborate scans from the same user', ...)
  it('does not corroborate scans outside 48h window', ...)
  it('does not corroborate when price diff exceeds 10%', ...)
})

describe('quarantine + contributorScore', () => {
  it('reduces contributorScore by 0.05 per quarantined scan', ...)
  it('never reduces contributorScore below 0.1', ...)
  it('increases contributorScore by 0.10 on corroboration', ...)
  it('caps contributorScore at 3.0', ...)
})
```

### Updated price lookup priority (scanPrices service)

```typescript
// Priority order for ingredient price lookup:
// 1. CanonicalPrice table (crowdsourced community DB) — if observationCount >= 3 and not stale
//    → This is the PRIMARY source. The scanner pipeline feeds it.
// 2. Kroger API — for Kroger stores only (the one chain with a public API)
// 3. Zyte scraper — last resort (post-V1 only, not active in Texas launch)
// 4. Spoonacular cost estimate — fallback if all else fails
// NOTE: MealMe API is DEPRECATED. Do not call it. The mealme.ts client file is retained
//       but disabled. Remove all queryMealMe() calls from pricingService.ts.
```

### Scanner screen (Sprint 4 — core feature)

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

### Gamification + rewards system — Sprint 4 core feature

> **Status: Sprint 4.** The Bites currency, leaderboard, and badge system are
> the primary engagement mechanic for driving scan contributions.
> DB schema and reward logic engine were scaffolded in Sprint 1.

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
  it('accepts any number of preferred retailers from TX_GROCERY_STORES', ...)
  it('rejects retailer chain keys not in TX_GROCERY_STORES', ...)
  it('returns 401 without auth', ...)
})

// ✅ Store discovery tests
describe('GET /stores/nearby', () => {
  it('returns the full TX_GROCERY_STORES list', ...)
  it('filters results by ?q= query param (name or tier)', ...)
  it('returns stores grouped by tier', ...)
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
  it('serves cached result within 1hr TTL', ...)
  it('returns hasData: false when no CanonicalPrice entries exist for store', ...)
  it('returns partial results when some ingredients have community data and others do not', ...)
})

describe('split optimizer', () => {
  it('assigns each ingredient to its cheaper store', ...)
  it('correctly computes per-store subtotals', ...)
  it('only surfaces split when saving >= SPLIT_THRESHOLD', ...)
})
```

#### Sprint 6 — Favourites + collections

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

#### Sprint 5 — Price trends + AI suggestions + personalisation

```typescript
describe('priceTrendService', () => {
  it('buckets observations into weekly averages', ...)
  it('returns empty array for ingredients with no observations', ...)
  it('respects the days= query param', ...)
})

describe('GET /prices/trends', () => {
  it('returns bucketed trend data for ingredient with observations', ...)
  it('returns 403 for free user (Plus gate)', ...)
})

describe('GET /prices/suggestion', () => {
  // Mock Anthropic — never hit real API in tests
  beforeEach(() => {
    jest.spyOn(anthropic.messages, 'create').mockResolvedValue(mockSuggestionResponse)
  })

  it('returns AI suggestion with buy/hold/substitute recommendation', ...)
  it('returns 403 for free user (Plus gate)', ...)
  it('does not call Claude when trend data is insufficient', ...)
})

describe('shopping list trend enrichment', () => {
  it('returns trendDirection: "up" when canonical price rose >5% vs prior week', ...)
  it('returns trendDirection: "down" when price fell >5%', ...)
  it('returns trendDirection: "stable" within 5% variance', ...)
  it('returns trendDirection: null when fewer than 2 weeks of data', ...)
})

describe('AI personalisation in generateMealPlan', () => {
  it('injects purchase history context for Plus users', ...)
  it('does not inject favourites for free users', ...)
})
```

#### Sprint 6 — Favourites + collections

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

#### Sprint 7 — Subscriptions + Free Trial

```typescript
describe('POST /subscription/webhook', () => {
  it('upgrades user to PLUS on subscription_started event', ...)
  it('upgrades user to PRO on subscription_started event', ...)
  it('downgrades user to FREE on subscription_cancelled event', ...)
  it('returns 400 on invalid RevenueCat signature', ...)
  it('is idempotent — same event twice does not double-upgrade', ...)
})

describe('Free trial — POST /auth/signup', () => {
  it('grants PRO tier and sets trialEndsAt = now + 7 days on new signup', ...)
  it('sets hasUsedTrial = true on signup', ...)
  it('does not grant a second trial if hasUsedTrial is already true', ...)
})

describe('GET /subscription/status', () => {
  it('returns isTrial: true and daysRemaining during active trial', ...)
  it('returns isTrial: false and correct tier after trial expires', ...)
  it('returns renewalDate when user has active paid subscription', ...)
})

describe('trialExpiryJob', () => {
  it('downgrades PRO users with expired trialEndsAt and no subscription', ...)
  it('does not downgrade PRO users with active RevenueCat subscription', ...)
  it('sends push notification on trial expiry', ...)
})

describe('trialEndingReminderJob', () => {
  it('sends push to users whose trial ends within 24h', ...)
  it('does not send to users who already have active subscription', ...)
  it('does not send to users with >24h remaining on trial', ...)
})

describe('Promo codes', () => {
  it('redeems PLUS_TRIAL code and grants trial days', ...)
  it('rejects expired promo code', ...)
  it('rejects code that has hit maxRedemptions', ...)
  it('prevents same user redeeming same code twice', ...)
  it('redeems BITES_BONUS code and awards correct Bites', ...)
})
```

#### Sprint 4 — Scanner + Community Pricing + Purchase History

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

describe('POST /purchases', () => {
  it('writes purchase to PurchaseHistory with quantity + unit', ...)
  it('links purchase to planId when provided', ...)
  it('rejects purchase with missing required fields', ...)
})

describe('GET /purchases?ingredientName=', () => {
  it('returns purchase history sorted by purchasedAt desc', ...)
  it('returns empty array for ingredient with no history', ...)
})

describe('GET /shopping-list/:planId with purchase history', () => {
  it('includes lastPurchase for ingredients with history', ...)
  it('returns null lastPurchase for ingredients never bought', ...)
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
| S3 | 75% | 55% | Mock Kroger; graceful degraded state for no-data stores |
| S4 | 75% | 55% | Scanner hard to unit test — lean on E2E; purchase history is pure and testable |
| S5 | 75% | 60% | Mock Claude for AI suggestions; price trend logic must be well tested |
| S6 | 70% | 65% | Favourites logic is pure and testable |
| S7 | 80% | 60% | Webhook idempotency is critical |
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
  'POST /prices/observation':   { max: 50,  timeWindow: '24 hours' },   // Sprint 4 (per user, scan spam)
  'POST /purchases':            { max: 100, timeWindow: '24 hours' },   // Sprint 4 (purchase history)
  'GET /prices/trends':         { max: 60,  timeWindow: '1 minute' },   // Sprint 5
  'GET /prices/suggestion':     { max: 20,  timeWindow: '1 hour' },     // Sprint 5 (Claude call — expensive)
  'POST /reminders':            { max: 50,  timeWindow: '1 hour' },     // Sprint 5
  'GET /reminders/suggestions': { max: 10,  timeWindow: '1 hour' },     // Sprint 5
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

### 6. Free trial — 7-day Pro trial for new users

> **Every new user gets a 7-day Pro trial on signup.** This is the highest-converting
> onboarding mechanic for subscription apps. The user experiences the full product
> ceiling before being asked to pay. Post-trial upgrade prompts reference the trial
> ("You had Pro free — keep it for $9.99/mo") which dramatically outperforms cold
> upgrade prompts.

**Why Pro (not Plus) for the trial:**
- Pro is the ceiling — trends, AI suggestions, reminders, unlimited plans, family profiles
- Users who experience the best product convert at 2–3× the rate of Plus trial users
- Plus trial users often feel the step down to Free is acceptable; Pro trial users feel loss aversion

**How it works:**

1. New user completes signup (`POST /auth/signup`) → server sets `trialEndsAt = now + 7 days` and `tier = PRO`
2. RevenueCat also has a 7-day introductory offer configured on the Pro SKU — the two are in sync
3. Mobile reads `subscription.status` on launch — shows trial banner if in trial period
4. Day 6: push notification — "Your Pro trial ends tomorrow. Don't lose your meal planning tools."
5. Day 7: trial expires → `tier` downgrades to `FREE` (via expiry job or RevenueCat webhook)
6. Upgrade prompt appears at the next tier gate, framed around the trial

**Schema additions:**

```prisma
// Add to User model:
trialEndsAt       DateTime?    // null = no trial / trial not started; set on signup
hasUsedTrial      Boolean      @default(false)  // prevents second-account gaming
```

**Server — trial grant on signup:**

```typescript
// src/routes/auth.ts — POST /auth/signup

// After creating the user:
const trialDays = 7
await prisma.user.update({
  where: { id: newUser.id },
  data: {
    tier: 'PRO',
    trialEndsAt: addDays(new Date(), trialDays),
    hasUsedTrial: true,
  }
})
```

**Trial expiry job (BullMQ — daily cron):**

```typescript
// src/jobs/trialExpiryJob.ts
// Runs at 2am CT daily — downgrades expired trials with no active subscription

export async function expireTrials() {
  const expired = await prisma.user.findMany({
    where: {
      tier: 'PRO',
      trialEndsAt: { lt: new Date() },
      revenueCatUserId: null,   // no paid subscription attached
    },
    select: { id: true },
  })

  for (const user of expired) {
    await prisma.user.update({
      where: { id: user.id },
      data: { tier: 'FREE', trialEndsAt: null },
    })
    // Push: "Your Pro trial has ended — upgrade to keep your meal planning tools"
    await sendPushNotification(user.id, {
      title: 'Your Pro trial has ended',
      body: 'Upgrade to Pro for $9.99/mo to keep price trends, AI suggestions, and more.',
      data: { screen: 'paywall' },
    })
  }
}
```

**Day-6 trial reminder job (BullMQ — daily cron):**

```typescript
// Runs at 10am CT daily
export async function sendTrialEndingReminders() {
  const tomorrow = addDays(new Date(), 1)
  const dayAfter  = addDays(new Date(), 2)

  const expiringSoon = await prisma.user.findMany({
    where: {
      tier: 'PRO',
      trialEndsAt: { gte: tomorrow, lt: dayAfter },
      revenueCatUserId: null,
    },
    select: { id: true },
  })

  for (const user of expiringSoon) {
    await sendPushNotification(user.id, {
      title: 'Pro trial ends tomorrow',
      body: "You've been using price trends, AI suggestions & unlimited plans. Keep it for $9.99/mo.",
      data: { screen: 'paywall' },
    })
  }
}
```

**Mobile — trial state detection:**

```typescript
// apps/mobile/src/lib/subscription.ts — extend syncSubscriptionStatus()

export async function syncSubscriptionStatus() {
  const customerInfo = await Purchases.getCustomerInfo()
  const hasPlus = customerInfo.entitlements.active['plus'] !== undefined
  const hasPro  = customerInfo.entitlements.active['pro']  !== undefined

  // Detect RevenueCat trial state
  const proEntitlement = customerInfo.entitlements.active['pro']
  const isTrialPeriod  = proEntitlement?.periodType === 'TRIAL'

  const tier: Tier = hasPro ? 'PRO' : hasPlus ? 'PLUS' : 'FREE'
  await apiClient.post('/subscription/sync', { tier, isTrialPeriod })
}

// Trial banner (shown in app header during trial):
// "Pro Trial · 3 days left"  →  taps to paywall with "Lock in Pro" CTA
```

**`GET /subscription/status` response during trial:**

```json
{
  "tier": "PRO",
  "isTrial": true,
  "trialEndsAt": "2026-04-12T23:59:59Z",
  "daysRemaining": 3,
  "renewalDate": null,
  "limits": { ... }
}
```

**Paywall CTA copy (Sprint 7 — use these exact strings):**

| State | Headline | CTA button |
|---|---|---|
| New user (pre-trial) | "Try Pro free for 7 days" | "Start free trial" |
| During trial | "You're on a Pro trial · X days left" | "Upgrade to keep Pro · $9.99/mo" |
| Post-trial, first gate | "Your Pro trial ended" | "Get Pro back · $9.99/mo" |
| Existing free user (never trialled) | "Unlock the full SmartBite" | "Start free trial" |

**Anti-abuse guard:**
- `hasUsedTrial = true` is set on the *user account*, not the device
- Supabase email confirmation (re-enabled in Sprint 8) prevents throwaway accounts
- A second account with the same email is blocked at the DB level (`email @unique`)

**RevenueCat setup (required before Sprint 7):**
1. In App Store Connect: add 7-day free trial introductory offer to the Pro monthly SKU
2. In Google Play Console: add 7-day free trial to the Pro monthly subscription
3. In RevenueCat dashboard: configure `pro` entitlement to include both monthly + annual Pro SKUs
4. The trial is handled by RevenueCat + the app stores — the server `trialEndsAt` field is a
   server-side fallback to ensure tier is correct even if RevenueCat webhook is delayed

---

### 7. Operational runbooks

> These do not go in the app. Document them in Notion/Linear before launch.
> Claude Code should add structured error responses and log lines that make
> these runbooks actionable.

**Community price data is sparse (new store / new ingredient):**
- This is expected, not an outage. Return `hasData: false` in `ScanResult.bestSingleStore`
- Mobile shows "Be the first to scan this!" CTA — redirects to scanner
- No alert needed — this is the cold-start state, not a degradation

**Claude API outage:**
- `generateMealPlan` catches Anthropic errors and returns `503` with body:
  `{ error: "Plan generation temporarily unavailable", retryAfter: 300 }`
- Mobile shows: "We're having trouble generating your plan. Try again in a few minutes."
- Do NOT show a generic "Something went wrong" — users need to know it's temporary

**Key rotation (document rotation process, not keys themselves):**
- Anthropic, Spoonacular, Edamam, RevenueCat keys stored in Railway/Fly environment variables
- Rotation procedure: update env var → redeploy → verify health check → revoke old key
- Health check endpoint: `GET /health` returns `{ status: 'ok', apis: { anthropic, spoonacular } }`

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

## Economics — cost model and unit economics

> **Read this before building any AI feature.** Every Claude API call has a real
> cost. The projections below are the basis for pricing decisions. When adding a
> new AI-powered feature, estimate its per-call cost against these benchmarks before
> shipping it to all tiers.

---

### Claude API — per-operation cost

Model: `claude-sonnet-4-6` at $3.00/MTok input + $15.00/MTok output (as of 2026).

| Operation | Input tokens | Output tokens | Cost per call |
|---|---|---|---|
| Meal plan generation (7-day) | ~1,000 | ~7,000 | ~$0.108 |
| Single meal regeneration | ~800 | ~900 | ~$0.016 |
| Custom recipe generation | ~600 | ~2,000 | ~$0.032 |
| AI price suggestion | ~400 | ~300 | ~$0.007 |
| Reminder habit suggestions (GET /reminders/suggestions) | ~600 | ~700 | ~$0.013 |

**Haiku alternative** (`claude-haiku-4-5` at $0.80/MTok input + $4.00/MTok output):
- Price suggestion: ~$0.0009 (88% cheaper — use for this feature in production)
- Reminder suggestions: ~$0.0034 (74% cheaper)
- Not suitable for meal plan generation — output quality is noticeably lower

---

### Monthly cost projections

**Assumptions:**
- Tier split: 80% Free / 15% Plus / 5% Pro
- Free user monthly active rate: 50% (4 plan gens/mo average)
- Plus user monthly active rate: 85% (12 plan gens/mo average)
- Pro user monthly active rate: 90% (20 plan gens/mo average, uses suggestions + reminders)
- RevenueCat: free tier up to $2,500 MRR; $99/mo Starter above that
- Hosting (Railway/Fly): $20/mo base + ~$0.02/user/mo at scale
- Supabase: free tier to 500MB; $25/mo Pro above that
- Spoonacular: free tier 150 req/day; $29/mo Basic above that

| Users (MAU) | Claude cost | RevenueCat | Hosting | Supabase | Spoonacular | **Total cost** | **MRR** | **Net** |
|---|---|---|---|---|---|---|---|---|
| 100 | $47 | $0 | $20 | $0 | $0 | **$67** | $112 | $45 |
| 500 | $234 | $0 | $30 | $25 | $29 | **$318** | $562 | $244 |
| 1,000 | $469 | $0 | $40 | $25 | $29 | **$563** | $1,124 | $561 |
| 2,500 | $1,172 | $0 | $70 | $25 | $29 | **$1,296** | $2,810 | $1,514 |
| 5,000 | $2,344 | $99 | $120 | $25 | $29 | **$2,617** | $5,620 | $3,003 |
| 10,000 | $4,688 | $99 | $220 | $25 | $29 | **$5,061** | $11,240 | $6,179 |

MRR formula: `(users × 0.15 × $4.99) + (users × 0.05 × $9.99)`

**Gross margin ranges:**
- 100 users: ~40% (RevenueCat free tier masks true margin)
- 1,000 users: ~50%
- 5,000+ users: ~53-55% (Claude cost dominates; hosting + services are near-fixed)

---

### Unit economics per user type

| User type | Monthly revenue | Claude cost | Other cost | **Contribution** |
|---|---|---|---|---|
| Free user | $0.00 | $0.52 (4 plans) | $0.04 | **-$0.56** |
| Plus user | $4.99 | $1.30 (12 plans) | $0.13 | **+$3.56** |
| Pro user | $9.99 | $2.60 (20 plans + suggestions + reminders) | $0.17 | **+$7.22** |

**The free-user subsidy problem:**
- Each free user costs ~$0.56/mo to serve
- At 80% free split, 100 Plus/Pro users must cover 400 free users: +$224 margin vs -$224 subsidy
- Break-even requires ~45% paid conversion rate OR tighter free tier limits
- **V1 mitigation:** free tier capped at 2 plans/week (8/mo vs 4/mo assumption above — actual cost closer to $1.04/mo per free user at full usage)
- **V2 mitigation:** introduce scan-to-earn as a free-tier value driver that also generates community pricing data (zero incremental cost to serve)

---

### RevenueCat pricing tiers

| Tier | Monthly cost | Condition |
|---|---|---|
| Free | $0 | Up to $2,500 MRR |
| Starter | $99/mo | $2,500–$10,000 MRR |
| Pro | $199/mo | $10,000–$50,000 MRR |
| Scale | 1% of revenue | Above $50,000 MRR |

RevenueCat handles iOS App Store + Google Play billing, webhook events, entitlement management, and subscription analytics. At V1 launch scale (<$2,500 MRR), the cost is $0.

---

### Subscription pricing (locked)

| Tier | Monthly | Annual | Savings |
|---|---|---|---|
| Free | $0 | — | — |
| Plus | $4.99/mo | $39.99/yr | 33% |
| Pro | $9.99/mo | $79.99/yr | 33% |

Annual pricing is managed via RevenueCat product IDs. Both monthly and annual SKUs must be configured in App Store Connect and Google Play Console before Sprint 7.

---

### Cost optimization levers

Apply these in order of impact. Do not optimise prematurely — implement the baseline first, then apply when you have real usage data.

**1. Switch AI price suggestions + reminders to Haiku (Sprint 5)**
- Change: use `claude-haiku-4-5-20251001` for `GET /prices/suggestion` and `GET /reminders/suggestions`
- Saving: 88% cost reduction on these calls
- Risk: lower reasoning quality — test with real purchase histories before shipping
- Implementation: pass model as a constant `AI_SUGGESTION_MODEL` in the service; default to Haiku, env-override to Sonnet for testing

```typescript
// src/services/priceService.ts
const AI_SUGGESTION_MODEL = process.env.AI_SUGGESTION_MODEL ?? 'claude-haiku-4-5-20251001'

const response = await anthropic.messages.create({
  model: AI_SUGGESTION_MODEL,
  max_tokens: 500,
  messages: [{ role: 'user', content: suggestionPrompt }],
})
```

**2. Plan-level generation cache (Sprint 2, revisit Sprint 5)**
- Cache key: `plan:${userId}:${profileHash}` where `profileHash` = hash of budget + dietary + servings
- TTL: 24 hours
- Benefit: users who tap "Generate" multiple times within a day (common in early exploration) don't re-spend $0.11 each time
- Do NOT cache across profile changes — a changed budget or dietary pref should trigger a fresh generation
- Estimated saving: 15–25% of plan generation costs at scale

```typescript
// src/routes/plans.ts
const profileHash = createHash('sha256')
  .update(JSON.stringify({ budget: profile.weeklyBudget, goals: profile.dietaryGoals, servings: profile.servings }))
  .digest('hex').slice(0, 16)

const cacheKey = `plan:${userId}:${profileHash}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)
// ... generate + cache for 24h
```

**3. Reduce free-tier max_tokens (Sprint 2)**
- Free users: set `max_tokens: 5000` (vs 8000 for paid)
- Rationale: free plans average lower complexity; 5K tokens is sufficient for a 7-day plan
- Saving: ~20% on free-tier generation costs
- Implementation: pass `maxTokens` from tier config

```typescript
// src/services/mealPlanService.ts
const maxTokens = tier === 'FREE' ? 5000 : 8000

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: maxTokens,
  messages: [{ role: 'user', content: prompt }],
})
```

**4. Batch reminder suggestions (Sprint 5)**
- Instead of one Claude call per user per day, batch 10 users' purchase histories into one call
- Ask Claude to return suggestions for all 10 users in a single structured JSON response
- Saving: ~85% reduction in reminder suggestion costs (1 call vs 10)
- Risk: more complex prompt, harder to test — implement only after single-user version is validated

---

### Break-even and growth targets

| Milestone | Users needed | MRR | Monthly profit |
|---|---|---|---|
| Break-even (Railway + Supabase paid) | ~250 | ~$280 | $0 |
| $1K/mo profit | ~1,200 | ~$1,345 | $1,000 |
| $5K/mo profit | ~5,200 | ~$5,830 | $5,000 |
| Full-time income ($10K/mo) | ~10,000 | ~$11,240 | ~$6,200 |

**V2 national expansion trigger:** ~2,000 TX users with ~60% canonical price coverage
confirms the crowdsourced pricing model is viable before investing in state-by-state rollout.

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

**Testing — TDD is mandatory, order is non-negotiable**

1. Write the test file first. No implementation file may be created or edited until the test file exists.
2. Run the tests and confirm they **fail**. A test that passes before implementation is a broken test.
3. Write the minimum implementation to make the tests pass.
4. Run tests again — confirm green. Then run the full suite to catch regressions.
5. Commit tests + implementation together. Never commit one without the other.

Use `/tdd <feature>` to start any new feature — it enforces this sequence.
Run `/test` before marking any sprint item complete.
Mock all external APIs (Anthropic, MealMe, Kroger, Supabase) — never hit real endpoints in tests.

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
