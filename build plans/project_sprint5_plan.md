---
name: Sprint 5 plan — Price trends, AI suggestions, Personalisation, Reminders
description: The app learns your taste, shows price trends, and tells you when to stock up. Also includes cross-cutting: AI model config, barcode pipeline, onboarding checklist, announcements.
type: project
---

# Sprint 5
> "The app learns my taste, shows me price trends, and tells me when to stock up"

**Status:** COMPLETE — 237 API tests + 91 mobile tests (328 total). Sprint 5 fully done.

---

## API tasks

### AI model config (do first — everything else uses it)
- [ ] Create `src/lib/aiConfig.ts` with `AI_MODELS` constants, all env-driven
- [ ] Update `mealPlanService.ts` to use `AI_MODELS.MEAL_PLAN`
- [ ] Add `AI_MODEL_*` override vars to `.env.example`

### Personalisation
- [ ] Favourites summary builder — extract taste patterns from saved recipes
- [ ] Update Claude `generateMealPlan` prompt — inject favourites + purchase history for Plus/Pro users

### Price trends
- [ ] `priceTrendService` — aggregate `PriceObservation` into weekly buckets per `(ingredientName, storeId)`
- [ ] `GET /prices/trends?ingredient=&storeId=&days=` — bucketed trend data (Pro gate)
- [ ] `GET /prices/suggestion?ingredient=&storeId=` — Claude Haiku suggestion: buy/hold/substitute (Pro gate)
- [ ] Shopping list response enriched with `trendDirection: 'up' | 'down' | 'stable'` per ingredient

### Price alerts
- [ ] Price polling BullMQ job — runs every 6h, checks canonical price vs alert target
- [ ] `POST /prices/alert`, `GET /prices/alerts`, `DELETE /prices/alerts/:id`
- [ ] Push notification service (Expo Notifications) — alert triggered notification

### Purchase reminders (Pro)
- [ ] `PurchaseReminder` model already in schema — verify migration exists
- [ ] `GET/POST/PUT/DELETE /reminders` — CRUD (Pro gate)
- [ ] `GET /reminders/suggestions` — Claude Haiku habit learning (Pro); rule-based fallback < 3 purchases
- [ ] Daily reminder BullMQ cron — query `nextRemindAt <= now AND active = true`, fire push, advance `nextRemindAt`

### Barcode pipeline enhancement
- [ ] `src/lib/usda.ts` — USDA FoodData Central client (free API key)
- [ ] `products.ts` — parallel OFF + USDA fan-out, merge strategy, never 404 a real UPC
- [ ] Add `nutrition Json?`, `ingredients String?` fields to Item table + migration
- [ ] Add `USDA_API_KEY` to `.env.example`

### Onboarding checklist (server side)
- [x] Add `completedActions String[]` to `UserProfile` schema + migration
- [x] `markActionComplete(userId, action)` helper
- [x] Wire to: `PUT /profile`, `POST /plans/generate`, `POST /prices/observation`, `POST /purchases`, `POST /recipes/:id/cooked`
- [x] `GET /profile` includes normalized `completedActions` in response
- [x] `GET /profile/checklist` returns checklist progress for the mobile home card

### Announcements
- [ ] `Announcement` model — title, body, type (BANNER|MODAL), style (INFO|SUCCESS|WARNING|PROMO), targetTiers, ctaText, ctaDeepLink, startsAt, endsAt
- [ ] `GET /announcements` — active + non-expired, filtered by user tier, Redis-cached 5min

### Scalability: event-driven canonical price recompute
- [ ] `src/jobs/canonicalPriceJob.ts` — triggered by `POST /prices/observation` enqueuing `{ itemId, storeId }`, not cron
- [ ] Weighted median with recency decay
- [ ] `PriceObservation archival` cron — move rows > 90 days to `PriceObservationArchive` monthly

---

## Mobile tasks

### Personalisation
- [ ] "Personalised for you" tag on meal cards (Plus/Pro)
- [ ] "Why this?" explanation bottom sheet on meal cards

### Price trends
- [ ] Price trend chart screen — line chart with 7/30/90-day toggle
- [ ] AI suggestion card below chart (Plus/Pro gate — upgrade prompt for free)
- [ ] Trend indicator arrows (↑ ↓ →) on shopping list rows
- [ ] "Last bought X — add same?" pre-fill on shopping list quantity inputs

### Price alerts
- [ ] Price alert UI on recipe detail — set target price, view active alerts
- [ ] Notification permission request flow
- [ ] Alert triggered push → deep-link to recipe detail

### Purchase reminders (Pro)
- [ ] Reminders screen (within Profile)
- [ ] `ReminderCard` component — ingredient, qty, frequency chip, next-due date
- [ ] `ReminderEditor` bottom sheet — name, qty + unit, frequency picker
- [ ] "Add suggested reminders" banner when ≥ 1 suggestion exists (Pro gate for free/Plus)

### Barcode pipeline (client cache)
- [ ] `stores/productCacheStore.ts` — Zustand + AsyncStorage, 30-day TTL, 500-item LRU
- [ ] `scanner/confirm.tsx` — check local cache before API call (works offline)

### Onboarding checklist
- [ ] `OnboardingChecklist` component — progress bar, 5 action rows with CTAs, auto-hides on completion
- [ ] Home screen: show below plan section until all 5 done

### Did You Know tips
- [ ] `TipBanner` component — dismissible strip with emoji + text, AsyncStorage dismiss tracking
- [ ] 7 contextual tips wired to: Home (first open), Shopping list (first visit + first check-off), Pantry (first visit), Recipe detail, Rewards (first visit), Profile (first visit)

### Announcements
- [ ] `AnnouncementBanner` component — coloured strip (INFO/SUCCESS/WARNING/PROMO), dismiss persisted by ID
- [ ] Home screen: fetch + render banners on mount
- [ ] MODAL type: shown once per cold-start session

---

## Definition of done
```
✓ Plan generated after 5+ saves is noticeably personalised
✓ Price trend chart loads for any ingredient with >= 3 observations
✓ AI suggestion references actual trend direction (mocked in test)
✓ Shopping list shows ↑/↓/→ per ingredient with trend data
✓ Free user sees upgrade prompt on AI suggestion and reminders
✓ Price alert fires a push notification (verify in logs)
✓ Reminder job fires correctly and advances nextRemindAt
✓ /reminders/suggestions returns items with >= 3 purchases
✓ Barcode scan pre-fills product from local cache on repeat scan
✓ Onboarding checklist appears on home screen, hides when all 5 done
✓ Tip banners appear on first screen visit, stay dismissed after tap
✓ Announcement banners appear and dismiss correctly
✓ AI model config drives all new Claude calls (verify via env var override)
✓ Canonical price recompute triggered per observation, not cron
```
