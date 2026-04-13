# Production Setup Guide

**Status**: Sprint 8 in progress (Apr 12, 2026)
**Goal**: Prepare SavvySpoon for TestFlight and Play Store submission

---

## Phase 1: Database & Security ✅ COMPLETE

### Supabase Pro Upgrade
- ✅ Upgraded from Free to Pro tier
- ✅ Cost: $25/month
- ✅ Benefits: Daily backups, point-in-time recovery, production-ready

### Row-Level Security (RLS)
- ✅ RLS enabled on all 30 tables
- ✅ 35+ policies deployed
- ✅ User isolation: Each user can only access their own data
- ✅ Public access: Community data (prices, recipes) readable by all

**File**: `supabase/rls-policies.sql` (deploy via SQL Editor)

---

## Phase 2: Error Reporting & Analytics ✅ COMPLETE

### Sentry (Error Tracking)
- ✅ SDK integrated in mobile and API
- ✅ User context attached (user ID, tier, subscription status)
- ✅ Ready for production builds

**Files**:
- `apps/mobile/src/lib/sentry.ts`
- `apps/api/src/lib/sentry.ts`

### PostHog (Analytics)
- ✅ 17 typed events configured
- ✅ User properties sync on auth state change
- ✅ Events tracked: meal_plan_generated, recipe_saved, subscription_purchased, etc.
- ✅ Ready for production builds

**File**: `apps/mobile/src/lib/analytics.ts`

---

## Phase 3: API Deployment ⏳ NEXT

### Deploy to Railway

**Step 1: Create Railway Account**
1. Go to https://railway.app
2. Sign up (GitHub login recommended)
3. Create new project

**Step 2: Connect GitHub Repo**
1. Select "New" → "GitHub Repo"
2. Select `austinmini/smartbite`
3. Select service: `apps/api`
4. Deploy

**Step 3: Configure Environment Variables**

In Railway dashboard, add all variables:

```bash
# Database
DATABASE_URL=postgresql://[user]:[password]@[host]:5432/[database]
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=[anon-key]
SUPABASE_SERVICE_KEY=[service-key]

# AI & APIs
ANTHROPIC_API_KEY=sk-ant-[key]
SPOONACULAR_API_KEY=[key]
EDAMAM_APP_ID=[id]
EDAMAM_APP_KEY=[key]

# External Services
REVENUECAT_WEBHOOK_SECRET=[secret]
SENTRY_DSN=[https://...]
POSTHOG_API_KEY=[key]
REDIS_URL=[if-using-redis]

# App Config
NODE_ENV=production
LOG_LEVEL=info
```

**Step 4: Get Production URL**

After deploy completes:
- Copy the auto-generated Railway URL (e.g., `https://api-production-xxxxx.railway.app`)
- OR set up custom domain:
  1. Buy `savvyspoon.app` domain (~$10/year)
  2. In Railway, go to Deployments → Domain
   3. Add custom domain `api.savvyspoon.app`
   4. Point DNS to Railway (instructions in Railway dashboard)

**Step 5: Verify Deployment**

```bash
# Test health endpoint
curl https://api-production-xxxxx.railway.app/health

# Should return:
# { "status": "ok", "apis": { ... } }
```

---

## Phase 4: Mobile Production Build ⏳ NEXT

### Create `.env.production`

In `apps/mobile/` create `.env.production` (do NOT commit):

```bash
# API URL from Railway
EXPO_PUBLIC_API_URL=https://api-production-xxxxx.railway.app
# OR (once domain is set up):
# EXPO_PUBLIC_API_URL=https://api.savvyspoon.app

# Analytics
EXPO_PUBLIC_POSTHOG_KEY=[production-posthog-key]
EXPO_PUBLIC_POSTHOG_HOST=https://us.posthog.com

# Payments
EXPO_PUBLIC_REVENUECAT_IOS_KEY=[ios-key]
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=[android-key]

# Error tracking
SENTRY_AUTH_TOKEN=[sentry-auth-token]

# Environment
NODE_ENV=production
```

### Initialize EAS

```bash
cd apps/mobile
pnpm global add eas-cli
eas init
```

Follow prompts to link Expo account.

### Configure EAS Credentials

```bash
# iOS
eas credentials -p ios
# Follow prompts to create/import Apple signing certificate

# Android
eas credentials -p android
# Follow prompts to create/import Play Store keystore
```

---

## Phase 5: Build & Submit ⏳ NEXT

### iOS Build & TestFlight

```bash
# Build for production
eas build --platform ios --profile production

# Wait ~15-20 minutes for build...
# Then submit to TestFlight
eas submit --platform ios --profile production --latest

# App appears in App Store Connect > TestFlight
```

### Android Build & Play Store

```bash
# Build for production
eas build --platform android --profile production

# Wait ~10-15 minutes for build...
# Then submit to Play Store internal testing
eas submit --platform android --profile production --latest

# App appears in Play Console > Internal Testing
```

---

## Phase 6: Store Listings ⏳ IN PROGRESS

### App Store Connect (iOS)

1. Create app record
2. Upload 6 screenshots
3. Fill metadata:
   - Name: SavvySpoon
   - Subtitle: Community grocery savings app
   - Description: (use APP_STORE_LISTINGS.md)
   - Keywords: grocery, budgeting, meal planning
4. Configure privacy policy URL
5. Complete app privacy questionnaire

**Reference**: `APP_STORE_LISTINGS.md`

### Google Play Console (Android)

1. Create app record
2. Upload 6+ screenshots
3. Fill metadata:
   - Name: SavvySpoon
   - Short description: (80 chars max)
   - Full description: (use APP_STORE_LISTINGS.md)
4. Configure privacy policy URL
5. Complete content rating (IARC)

**Reference**: `APP_STORE_LISTINGS.md`

---

## Phase 7: Testing & Verification ⏳ PENDING

### TestFlight Testing (iOS)

1. Get internal TestFlight link
2. Install on iOS device
3. Test core flows:
   - Signup → onboarding → meal plan generation
   - Scanner → price submission
   - Subscription → paywall → sandbox purchase
   - Trial end → downgrade to Free

### Play Store Internal Testing (Android)

1. Get Play Store internal test link
2. Install on Android device
3. Test same flows as iOS

### Monitoring

**Sentry Dashboard**:
- Check for any errors in production build
- Verify user context is attached
- Monitor crash reports

**PostHog Dashboard**:
- Verify meal_plan_generated events
- Verify subscription_purchased events
- Check user property sync (tier, subscription status)

---

## Troubleshooting

### Railway Deployment Fails

```bash
# Check logs
railway logs

# Common issues:
# 1. Missing environment variable → add in Railway dashboard
# 2. Database migration not run → run: prisma migrate deploy
# 3. Port not listening → ensure app.ts starts on PORT env var
```

### EAS Build Fails

```bash
# Check detailed logs
eas build --platform ios --profile production --logs

# Common issues:
# 1. Credentials not set → run: eas credentials -p ios
# 2. Invalid .env.production → verify all keys exist
# 3. Supabase connection error → test DATABASE_URL locally
```

### TestFlight Build Not Appearing

1. Check App Store Connect → Builds section
2. Verify build was submitted successfully (`eas submit` output)
3. Apple processes builds in 5-10 minutes
4. If still missing: Reject the build and rebuild

---

## Timeline Summary

| Phase | Task | Est. Time | Status |
|---|---|---|---|
| 1 | Database & RLS | ✅ Done | Complete |
| 2 | Error + Analytics | ✅ Done | Complete |
| 3 | API to Railway | ⏳ 15 min | Next |
| 4 | Mobile .env.production | ⏳ 5 min | Next |
| 5 | EAS build iOS | ⏳ 20 min | Next |
| 5 | EAS build Android | ⏳ 15 min | Next |
| 6 | Store listings | ⏳ 1.5 hrs | In progress |
| 6 | Screenshots | ⏳ 1 hour | In progress |
| 7 | Test on devices | ⏳ 30 min | Pending |
| **Total** | — | **~3 hours** | — |

---

## Pre-Launch Checklist

- [ ] API deployed and responding at production URL
- [ ] All environment variables set in Railway
- [ ] .env.production created with correct API URL
- [ ] EAS credentials initialized (iOS + Android)
- [ ] iOS production build completes without errors
- [ ] Android production build completes without errors
- [ ] Builds submitted to TestFlight and Play Store
- [ ] Builds appear in respective testing interfaces
- [ ] Screenshots uploaded to both stores
- [ ] App descriptions and metadata entered
- [ ] Privacy policy URL configured
- [ ] Content rating completed (Play Store)
- [ ] Data privacy questionnaire completed (App Store)
- [ ] Test user created for subscription testing
- [ ] Signup flow tested end-to-end
- [ ] Meal plan generation tested
- [ ] Scanner tested (barcode submission)
- [ ] Subscription purchase tested (sandbox)
- [ ] Trial flow tested (new account → 7-day trial)
- [ ] Sentry error reporting verified
- [ ] PostHog event tracking verified

---

## Go Live (App Store Review)

Once all above is complete:

1. **TestFlight internal testers approve** (1-2 weeks of testing)
2. **Submit iOS to App Store for review** (1-2 weeks typical)
3. **Play Store internal testers approve** (1-2 weeks of testing)
4. **Release Android to Play Store** (instant after approval)
5. **App Store approval received** → Release on App Store

---

## References

- `EAS_BUILD_SETUP.md` — Detailed EAS build & credential setup
- `APP_STORE_LISTINGS.md` — All store metadata and screenshots specs
- `SCREENSHOT_GUIDE.md` — How to capture and process screenshots
- `supabase/rls-policies.sql` — RLS policies (deploy in SQL Editor)
- `CLAUDE.md` — Architecture and project overview
