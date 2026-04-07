---
name: Sprint 2 completion state
description: What was built in Sprint 2, what's pending, and key technical decisions
type: project
---

Sprint 2 is fully complete. Committed to `main` at `9e62738` (impl) + `d2dd1ab` (progress sync).

**Why:** Delivers the core value prop — tap "Generate plan", get a real AI 7-day meal plan.

**How to apply:** Sprint 3 is next (grocery pricing). All Sprint 2 code is working and tested. Do not revisit Sprint 2 items.

---

## What is built and working

### API additions (`apps/api/`)
- `lib/anthropic.ts` — Anthropic client singleton (`new Anthropic({ apiKey })`)
- `lib/redis.ts` — ioredis client with `lazyConnect: true` (errors silenced in test)
- `services/mealPlanService.ts`:
  - `generateMealPlan({ profile, weekBudget, favourites? })` — calls claude-sonnet-4-6, strips markdown fences, returns parsed `GeneratedPlan`
  - `saveMealPlan(userId, planData)` — creates MealPlan + Meals + Recipes via Prisma nested write
  - `getCurrentPlan(userId)` — finds plan where `weekStarting` is current ISO week's Monday
  - `getPlans(userId, page)` — paginated history (10/page)
  - `getMeal(planId, mealId)` — single meal with recipe
  - `regenerateMeal(planId, mealId, profile)` — Claude single-meal prompt, updates Recipe + Meal in DB
- `routes/plans.ts` — all 5 plan endpoints:
  - `POST /plans/generate` — Redis tier gate: FREE=2/week, PLUS=7/week, PRO=∞; key: `plans:week:{userId}:{year}-W{week}`; TTL set to 7d on first increment
  - `GET /plans/current`
  - `GET /plans` (paginated, `?page=N`)
  - `GET /plans/:id/meals/:mealId`
  - `POST /plans/:id/regenerate-meal` (body: `{ mealId }`)
- **52 tests passing** across 5 suites (8 service + 17 route + 27 existing)

### New dependencies
- `@anthropic-ai/sdk` — Claude API client
- `ioredis` — Redis client

### Test mocking patterns for Sprint 2+
- Mock anthropic: `jest.mock('../../lib/anthropic', () => ({ anthropic: { messages: { create: jest.fn() } } }))`
- Mock redis: `jest.mock('../../lib/redis', () => ({ redis: { get: jest.fn(), incr: jest.fn(), expire: jest.fn() } }))`
- Mock entire service in route tests: `jest.mock('../../services/mealPlanService', () => ({ generateMealPlan: jest.fn(), ... }))`
- Cast mock Prisma return values with `as any` when Prisma enum types (e.g. `MealType`) don't match plain string test data

### Mobile additions (`apps/mobile/`)
- `stores/mealPlanStore.ts` — Zustand + AsyncStorage persist; `plan`, `isGenerating`, `error`; exports `MealPlan`, `PlanMeal`, `MealRecipe` types
- `components/RecipeCard.tsx` — shows `MEALTYPE`, `~$X.XX`, title, cook time, tags; `testID="recipe-card-{meal.id}"`
- `components/NutritionCard.tsx` — shows calories, protein, carbs, fat macros
- `components/MealPlanCard.tsx` — 7-day grid with day tabs (`testID="day-tab-{index}"`), renders `RecipeCard` per meal
- `app/(tabs)/index.tsx` — wired to `POST /plans/generate`; shows `MealPlanCard` when plan exists; `ActivityIndicator` while generating; error box on failure; 429 → `Alert`
- `app/recipe/[id].tsx` — full recipe detail: hero, `NutritionCard`, ingredients, instructions, regenerate button
- **21 mobile tests passing** across 4 suites

---

## One item intentionally deferred
- Spoonacular image fallback for recipe title lookup — not blocking any demo flow, no route for it yet

---

## Key technical decisions

- One Claude call for full 7-day plan (not 21 separate calls) — `max_tokens: 8000`
- `weekStarting` computed as Monday of current week via local date math (not stored in JWT)
- Redis counter for tier gate uses `get` before generation (avoid wasting Claude call), then `incr` + `expire` after success
- `saveMealPlan` uses Prisma nested write (MealPlan → Meals → Recipes in one `create` call with `include`)
- `regenerateMeal` updates existing Recipe record in place (does not create new Recipe) — keeps `recipeId` stable
- Mobile `~$X.XX` format enforced at component level (`estCost.toFixed(2)`)
- Recipe detail reads meal from `mealPlanStore` by `id` param — no extra API call needed
