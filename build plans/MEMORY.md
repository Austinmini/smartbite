# Memory index

- [TDD preference](feedback_tdd.md) — Tests must be written and confirmed failing before any implementation is written
- [Update memory after TDD/sprint](feedback_update_memory.md) — Always update memory + MEMORY.md after every /tdd run and every sprint end, proactively
- [API testing patterns](feedback_testing_patterns.md) — Fastify v5: always use app.inject(), never Supertest; jest.config.js specifics
- [Sprint 1 — COMPLETE](project_sprint1_state.md) — Auth + onboarding + store discovery. Tested on Android.
- [Sprint 2 — COMPLETE](project_sprint2_plan.md) — AI meal plan generation, Redis tier gate, recipe detail. 52 API + 21 mobile tests.
- [Sprint 3 — COMPLETE](project_sprint3_plan.md) — Pricing UI, split optimizer, shopping list. MealMe/Kroger removed.
- [Sprint 4 — COMPLETE](project_sprint4_plan.md) — Scanner, pantry, purchase history, rewards. 161 tests.
- [Sprint 5 — COMPLETE](project_sprint5_plan.md) — Price trends, AI suggestions, reminders, announcements, onboarding checklist. 328 tests (237 API + 91 mobile).
- [Sprint 6 — COMPLETE](project_sprint6_plan.md) — Favourites, collections, feedback, referral UI, tab bar 4 tabs. 380 tests.
- [Sprint 7 — COMPLETE](project_sprint7_plan.md) — RevenueCat, webhook, trial grant/expiry, paywall, TierGatePrompt, TrialBanner. 410 tests.
- [Sprint 8 — PLANNED](project_sprint8_plan.md) — App store ready: TestFlight, Play Store, Sentry, PostHog, PgBouncer
- [Full pricing pivot + current architecture](project_pricing_pivot.md) — MealMe/Kroger gone; all TX stores; Item catalog; pantry; reminders; price reconciliation; free trial; tier features; economics
- [Scalability findings](project_scaling_findings.md) — 4 fixes before 10k users: PgBouncer now, event-driven canonical job in S5, async plan gen in S7
- [Announcements feature](project_announcements.md) — broadcast banners/modals to users; targets Sprint 5; schema + GET /announcements + AnnouncementBanner component
- [Swappable AI model config](project_ai_model_config.md) — Sprint 5 first task; aiConfig.ts with AI_MODELS env-driven constants; Haiku for price/reminder, Sonnet for generation
- [Barcode product lookup pipeline](project_barcode_lookup.md) — Sprint 5 enhancement; OFF + USDA parallel fan-out; client AsyncStorage cache 30-day TTL 500-item LRU
- [Feedback channel](project_feedback_channel.md) — Sprint 6; POST /feedback + FeedbackSheet in Profile + "Report wrong price" from scanner
- [Onboarding checklist + Did You Know tips](project_tips_and_checklist.md) — Sprint 5; completedActions on UserProfile; OnboardingChecklist + TipBanner components
- [Email confirmation disabled](project_email_confirmation.md) — Supabase email confirm OFF for dev; must re-enable before Sprint 8 launch

## Current state summary

- **Sprints complete:** 1, 2, 3, 4, 5, 6, 7 (fully complete — API + mobile)
- **Next:** Sprint 8 (App store ready)
- **API base URL:** `EXPO_PUBLIC_API_URL` (defaults to `http://localhost:3000`)
- **Auth:** Supabase in-memory storage on mobile; token from `supabase.auth.getSession()` on every request via `apiClient.ts`; refresh_token persisted in Zustand/AsyncStorage; setSession() on cold start
- **Pricing model:** Community crowdsourced only. `CanonicalPrice` fed by `PriceObservation` scans.
- **Stores:** All TX grocery chains (25+) via static `TX_GROCERY_STORES` array. No cap on user store selections.
- **Tiers:** Free / Plus ($4.99/mo) / Pro ($9.99/mo). New users get 7-day Pro trial on signup.
- **Schema additions (Sprint 5):** `PurchaseReminder`, `Announcement` models; `completedActions String[]` on UserProfile; `trialEndsAt DateTime?`, `hasUsedTrial Boolean` on User
- **Key pending schema fields:** `quarantined`, `priceTag` on `PriceObservation`; `previousPrice`, `varianceP25/P75`, `priceTag` on `CanonicalPrice`
- **AI model config:** `src/lib/aiConfig.ts` — AI_MODELS constants, all env-driven. Haiku for price/reminder suggestions, Sonnet for meal plans.

