---
name: Sprint 7 plan — Subscriptions, 7-day Pro trial, async plan generation
description: Full paywall flow end-to-end. New users get 7-day Pro trial. Async plan generation for scalability.
type: project
---

# Sprint 7
> "I can subscribe and unlock everything"

**Status:** NOT STARTED

---

## API tasks

### Schema additions (migration required)
- [ ] Add `trialEndsAt DateTime?` and `hasUsedTrial Boolean @default(false)` to User model
- [ ] `WebhookEvent` model already in schema — verify migration exists

### Free trial grant on signup
- [ ] `POST /auth/signup` — set `tier = PRO`, `trialEndsAt = now + 7 days`, `hasUsedTrial = true`
- [ ] Guard: if `hasUsedTrial = true`, do not grant a second trial (prevents second-account abuse)

### RevenueCat webhook
- [ ] `POST /subscription/webhook` — verify signature, update `user.tier`
- [ ] Idempotent: store `externalEventId` in `WebhookEvent`, skip if already processed
- [ ] Maps: `subscription_started` → PLUS/PRO, `subscription_cancelled` → FREE

### Subscription status
- [ ] `GET /subscription/status` — returns `{ tier, isTrial, trialEndsAt, daysRemaining, renewalDate, limits }`
- [ ] `POST /subscription/sync` — mobile calls on launch; trusts RevenueCat entitlement, heals DB drift

### Trial management jobs (BullMQ)
- [ ] Trial expiry job — daily cron at 2am CT; downgrade PRO users where `trialEndsAt < now AND revenueCatUserId = null`; send push "Your trial has ended"
- [ ] Day-6 trial reminder job — daily cron at 10am CT; push to users with `trialEndsAt` within 24h and no paid subscription

### Tier gates
- [ ] All tier gates wired to live DB `user.tier` — no hardcoded FREE fallbacks
- [ ] Verify all Sprint 2–5 gates use the DB tier correctly

### Scalability: async plan generation
- [ ] `POST /plans/generate` — enqueue BullMQ job, return `{ planId, status: "generating" }` immediately (202)
- [ ] BullMQ worker calls Claude, writes plan to DB, updates status to "ready"
- [ ] `GET /plans/current` — mobile already polls this on home mount; no client changes needed
- [ ] Handle Claude API rate limit errors gracefully in worker (retry with backoff)

---

## Mobile tasks

### RevenueCat setup
- [ ] RevenueCat SDK installed + configured with product IDs
- [ ] 7-day free trial introductory offer configured in App Store Connect + Google Play Console
- [ ] `pro` entitlement configured in RevenueCat dashboard

### Trial state
- [ ] Trial banner — "Pro Trial · X days left" in app header during trial period
- [ ] Taps to paywall with "Lock in Pro" CTA

### Paywall screen
- [ ] 3-tier comparison (Free / Plus $4.99 / Pro $9.99)
- [ ] "Start 7-day free trial" CTA on Pro (or "Get Pro back · $9.99/mo" post-trial)
- [ ] Correct copy per state (see table below)
- [ ] Sandbox purchase completes on physical device

### Post-purchase
- [ ] Tier updates without app restart (RevenueCat entitlement check)
- [ ] Gated features unlock immediately
- [ ] Purchase success animation

### Profile subscription card
- [ ] Tier badge
- [ ] Trial end date (during trial) or renewal date (paid)
- [ ] "Manage subscription" deep-link to App Store / Play Store subscription settings
- [ ] Restore purchases button

### `TierGatePrompt` component
- [ ] Contextual upgrade prompts per gate (triggered when free/plus user hits a Pro feature)
- [ ] Post-trial framing: "You had Pro free — get it back for $9.99/mo"
- [ ] Pre-trial framing: "Unlock the full SmartBite — try Pro free for 7 days"

### `POST /subscription/sync` call
- [ ] Called on every app foreground/launch to reconcile RevenueCat vs DB
- [ ] Detects RevenueCat `periodType === 'TRIAL'` and passes `isTrialPeriod` to sync endpoint

---

## Paywall copy reference

| State | Headline | CTA |
|---|---|---|
| New user (pre-trial) | "Try Pro free for 7 days" | "Start free trial" |
| During trial | "You're on a Pro trial · X days left" | "Upgrade to keep Pro · $9.99/mo" |
| Post-trial, first gate | "Your Pro trial ended" | "Get Pro back · $9.99/mo" |
| Existing free (never trialled) | "Unlock the full SmartBite" | "Start free trial" |

---

## Definition of done
```
✓ New signup automatically gets 7-day Pro trial
✓ Trial banner shows correct days remaining
✓ All Pro features accessible during trial
✓ Trial expiry downgrades to Free without data loss
✓ Upgrade prompt post-trial references the trial
✓ Sandbox purchase completes on physical iOS or Android device
✓ User tier updates within 5s of purchase (webhook received)
✓ Gated features unlock immediately after purchase (no restart)
✓ Profile shows correct tier + renewal/trial-end date
✓ Restore purchases correctly identifies existing entitlement
✓ Day-6 trial reminder push fires correctly (verify in logs)
✓ Second signup with same email cannot claim second trial
✓ POST /plans/generate returns immediately (202) — plan appears via polling
✓ Plan generation worker handles Claude rate limit with retry
```
