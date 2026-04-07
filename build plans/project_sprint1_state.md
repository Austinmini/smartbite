---
name: Sprint 1 completion state
description: What was built in Sprint 1, what's pending, and all key technical decisions made
type: project
---

Sprint 1 is fully complete. Tested end-to-end on a real Android device via Expo Go.
Committed to `main` at `776caec`.

**Why:** First deliverable sprint — sign up, onboard, see empty home screen. Establishes the full stack foundation.

**How to apply:** Sprint 2 is next. All Sprint 1 code is working and tested. Do not revisit Sprint 1 items.

---

## What is built and working

### API (`apps/api/`)
- Fastify v5 app factory in `src/app.ts` — registers CORS, `@fastify/rate-limit`, routes
- Auth routes (`src/routes/auth.ts`): POST /auth/signup, /auth/login, /auth/logout, GET /auth/me
  - Signup auto-creates `ReferralCode` for new user
  - Returns `{ access_token, user }` on signup/login
- Single `verifyJWT` middleware (`src/middleware/auth.ts`):
  - `NODE_ENV === 'test'` → verifies with `JWT_SECRET_TEST` (no Supabase call)
  - Production → delegates to `supabaseServiceClient.auth.getUser(token)`
- GET /stores/nearby (`src/routes/stores.ts`) — queries MealMe, filters V1 chains, 24h in-process Map cache, falls back to TX_STORE_SEED
- Profile CRUD (`src/routes/profile.ts`): GET/PUT /profile, PUT /profile/retailers (max 2), PUT /profile/dietary
- MealMe client (`src/lib/mealme.ts`) — returns `[]` if no API key
- Supabase client (`src/lib/supabase.ts`) — service client singleton
- V1 store data (`src/data/txStores.ts`) — V1_SUPPORTED_CHAINS, TX_STORE_SEED, filterToV1Stores, MealMeStore type
- **27 tests passing** across 3 suites (auth, profile, stores)
- Prisma migration applied to Supabase (`20260403212827_init`) — all models live

### Test infrastructure
- `jest.config.js` (not .ts) — sets `NODE_ENV=test` and `JWT_SECRET_TEST` at top via `process.env`
- `src/test/mocks/prisma.ts` and `src/test/mocks/supabase.ts` — jest mocks
- `src/test/factories.ts` — `createAuthToken(userId)` (sync), `createTestUser`, `createTestProfile`
- `src/test/setup.ts` — `jest.clearAllMocks()` in `beforeEach`
- All tests use `app.inject()` (Fastify-native) — NOT Supertest (Fastify v5 incompatibility)
- Pattern: `beforeAll(async () => { app = await buildApp(); await app.ready() })`

### Mobile (`apps/mobile/`)
- `stores/authStore.ts` — Zustand + AsyncStorage persist; holds `user`, `token`, `_hasHydrated`
- `stores/profileStore.ts` — Zustand + AsyncStorage persist; holds onboarding state, `onboardingComplete`
- `app/_layout.tsx` — auth guard using `useEffect` + `useSegments` + `router.replace()`:
  - Calls `useAuthStore.persist.onFinishHydration()` on mount as fallback for web/Android hydration
  - Also checks `useAuthStore.persist.hasHydrated()` synchronously on mount
  - Returns `null` until `_hasHydrated` is true — prevents tabs flash for unauthenticated users
  - Waits for `_hasHydrated` before redirecting (avoids flash on cold start)
- `app/(auth)/login.tsx` — wired to `/auth/login`; explicitly navigates to tabs or onboarding after success
- `app/(auth)/signup.tsx` — wired to `/auth/signup`; explicitly navigates to onboarding after success
- Onboarding flow (`app/(auth)/onboarding/`):
  - `location.tsx` — requests expo-location permission, calls `GET /stores/nearby`, store selector with max-2 enforcement
  - `budget.tsx` — budget input + preset chips ($50–$200)
  - `dietary.tsx` — dietary goal + allergy chip grids
  - `complete.tsx` — summary screen, calls `PUT /profile` to save to API, sets `onboardingComplete: true`
- `app/(tabs)/profile.tsx` — shows all preferences with Edit buttons, logout with Alert confirm
- `lib/apiClient.ts` — fetch wrapper, reads `EXPO_PUBLIC_API_URL`
- `babel.config.js` — includes `babel-plugin-transform-import-meta` and `react-native-reanimated/plugin`
- `metro.config.js` — `unstable_enablePackageExports: true` for reanimated v4 web resolution

---

## Critical technical decisions (do not undo)

- **Never use Supertest** — Fastify v5 is incompatible. Always use `app.inject()`.
- **`jest.config.js` not `.ts`** — ts-jest config in .ts format requires ts-node which isn't installed. Keep as .js.
- **`JWT_SECRET_TEST` set in jest.config.js** via `process.env` at top of file — not in a .env file.
- **One `verifyJWT` middleware** — never create a second. Both test and prod handled via `NODE_ENV` check.
- **`setupFilesAfterEnv`** is the correct Jest config key (not `setupFilesAfterFramework`).
- **`forceExit: true`** in jest.config.js — needed to prevent Jest hanging due to rate-limit timers.
- **In-process Map cache** in stores.ts uses distinct lat/lng coordinates per test to avoid cache collisions between tests.
- **Explicit navigation after login/signup** — do not rely solely on the layout guard. The guard does not fire when you're already inside `(auth)` group. Always call `router.replace()` directly after auth success.
- **Supabase schema**: uses `directUrl` + `DATABASE_URL` (pooler) pattern for Prisma. Both vars required in `.env`.
- **Email confirmation disabled** in Supabase for dev — must re-enable before Sprint 8 (tracked in memory).
- **`import 'react-native-reanimated'`** bare import removed from `_layout.tsx` — causes `import.meta` error on web with Reanimated v4. Do not re-add until web bundling is resolved.
- **Expo web is broken** due to reanimated v4 + Metro incompatibility in SDK 54. Test on physical device via Expo Go or iOS Simulator. Web testing is not supported in Sprint 1.
