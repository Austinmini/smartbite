---
name: Sprint 7 — Subscriptions, 7-day Pro trial
description: Full paywall flow, RevenueCat integration, trial lifecycle jobs. 282 API + 128 mobile tests green.
type: project
---

# Sprint 7
> "I can subscribe and unlock everything"

**Status:** COMPLETE (410 tests passing: 282 API + 128 mobile)

**Deferred to Sprint 8:**
- Purchase success animation (Lottie)
- Async plan generation (BullMQ worker for Claude calls)
- `REVENUECAT_WEBHOOK_SECRET` env var (pending from RevenueCat dashboard)
- Android Play Store products (pending account verification)

---

## What was built

### API (`apps/api/src/routes/subscription.ts`)
- `POST /subscription/webhook` — RevenueCat signature verify, idempotent via `WebhookEvent` table, maps product_id to PLUS/PRO, EXPIRATION/CANCELLATION → FREE
- `GET /subscription/status` — returns `{ tier, isTrial, daysRemaining, trialEndsAt, renewalDate, limits }`
- `POST /subscription/sync` — mobile calls on every launch; heals DB drift from webhook failures

### Auth trial grant (`apps/api/src/routes/auth.ts`)
- `POST /auth/signup` now grants PRO tier + 7-day `trialEndsAt` + `hasUsedTrial = true`
- Guard: only grants if `hasUsedTrial = false` on the newly created user

### BullMQ jobs (`apps/api/src/jobs/trialJobs.ts`)
- `expireTrials()` — downgrades PRO users with expired `trialEndsAt` and no `revenueCatUserId`; fires push notification
- `sendTrialEndingReminders()` — pushes day-6 reminder to users expiring in next 24h
- `startTrialJobWorkers()` — BullMQ cron setup (2am CT expiry, 10am CT reminder); no-ops in test/no-Redis envs

### Notification stub (`apps/api/src/services/notificationService.ts`)
- `sendPushNotification(userId, { title, body, data })` — logs to console; wire to Expo Push API in Sprint 8

### Mobile components
- `TrialBanner` — "Pro Trial · X days left" / "last day" strip, taps to paywall. 4 tests.
- `TierGatePrompt` — modal-style sheet with post-trial "Get Pro back" framing. 6 tests.
- `paywall.tsx` — 3-tier comparison screen with purchase + restore flows. No unit tests (native SDK).

### Mobile lib (`apps/mobile/lib/revenueCat.ts`)
- `configureRevenueCat()` — called once on app start
- `identifyRevenueCatUser(userId)` — called on auth state change
- `syncSubscription(token)` — fetches RC entitlements, calls `/subscription/sync`, returns tier
- `fetchSubscriptionStatus(token)` — thin wrapper around `GET /subscription/status`
- `purchaseProduct(productId)` — wraps RC `purchasePackage()`
- `restorePurchases()` — wraps RC `restorePurchases()`

### Mobile stores (`apps/mobile/stores/subscriptionStore.ts`)
- Zustand store for `{ isTrial, daysRemaining, trialEndsAt, renewalDate }` — not persisted

### Profile screen updates
- `TrialBanner` shown at top during trial
- Subscription row shows trial status + links to paywall
- Fetches `/subscription/status` on mount alongside referral endpoints

### Root layout updates (`app/_layout.tsx`)
- `configureRevenueCat()` called once on mount
- `identifyRevenueCatUser()` + `syncSubscription()` called on auth state change

---

## Key decisions
- `revenueCat.ts` uses dynamic imports (`await import('react-native-purchases')`) to avoid breaking web/test environments where native module is absent
- Webhook auth uses `Authorization` header with the raw secret (no Bearer prefix) — matches RevenueCat's format
- BullMQ `upsertJobScheduler` used (v5+) — if on older BullMQ, replace with `add()` + repeat option
- `subscriptionStore` is NOT persisted — always fresh from API on profile load
