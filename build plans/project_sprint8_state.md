---
name: Sprint 8 — In Progress
description: App store ready infrastructure and deployment status (updated Apr 12, 2026)
type: project
originSessionId: 140777a5-e00e-4e41-a7a9-a5584ae5e452
---
## Sprint 8 Status: 75% Complete

**Timeline**: Week 12 (Apr 8–14, 2026)
**Goal**: Full production deployment to TestFlight and Play Store

---

## Completed (✅)

### Infrastructure & Deployment
- ✅ Sentry error reporting (mobile + API) with user context
- ✅ PostHog analytics (17 typed events, user properties sync)
- ✅ Rate limiting audit (all S1-S7 endpoints covered)
- ✅ GitHub Pages hosting for legal documents
- ✅ Supabase upgraded to Pro tier ($25/mo)
- ✅ RLS enabled on all 30 tables with 35+ policies
- ✅ Documentation created (EAS_BUILD_SETUP.md, APP_STORE_LISTINGS.md, SCREENSHOT_GUIDE.md)

### Legal Documents
- ✅ Privacy Policy (12 sections, 4000+ words) → https://austinmini.github.io/smartbite/privacy-policy.html
- ✅ Terms of Service (19 sections, 5000+ words) → https://austinmini.github.io/smartbite/terms-of-service.html
- ✅ Landing page with navigation → https://austinmini.github.io/smartbite/

### Configuration
- ✅ eas.json created with production, preview, and development profiles
- ✅ app.json updated with SavvySpoon branding (camera permission text)
- ✅ supabase/rls-policies.sql with all table policies
- ✅ Commit pushed to GitHub (019da13)

---

## In Progress (🟡)

### Task #5: App Store Connect Listing (iOS)
**Status**: Metadata ready, screenshots pending
- ✅ App description, keywords, subtitle written
- ✅ Privacy policy URL configured
- ✅ Support email set (support@savvyspoon.app)
- ⏳ Create 6 iOS screenshots (using SCREENSHOT_GUIDE.md)
- ⏳ Upload screenshots to App Store Connect
- ⏳ Verify metadata is complete

**Est. time**: 1 hour (screenshots) + 15 min (upload)

---

## Blocked (⏳)

### Task #8B: Deploy API to Railway (CRITICAL PATH)
**Status**: Ready, awaiting user input
- Need: API environment variables (Anthropic, Spoonacular, Edamam, Sentry DSN)
- Process: Create Railway account → connect GitHub → set env vars → deploy (5 min)
- **Blocks**: Task #9 (TestFlight), Task #10 (Play Store)

**Est. time**: 15 min setup + 5 min deploy

### Task #9: Submit to TestFlight
**Status**: Blocked by API deployment
- Requires: Production API URL from Railway
- Requires: Environment variables (.env.production)
- Process: `eas build ios` → `eas submit ios` (30 min build + 5 min submit)
- Result: Build appears in TestFlight for internal testing

**Est. time**: 45 min (build + submit)

### Task #10: Submit to Play Store Internal
**Status**: Blocked by API deployment
- Requires: Same as TestFlight (API URL + env vars)
- Process: `eas build android` → `eas submit android` (20 min build + 5 min submit)

**Est. time**: 30 min (build + submit)

### Task #6: Google Play Console Listing (Android)
**Status**: Pending
- Create app record in Play Console
- Upload 6+ screenshots
- Fill metadata (description, contact, privacy URL)
- Complete IARC content rating
- Can run in parallel with iOS screenshots

**Est. time**: 30 min metadata + 30 min screenshots

---

## Environment Variables Needed

To deploy API and build for TestFlight/Play Store, you need:

```bash
# .env.production (create in apps/mobile/ — do NOT commit)
EXPO_PUBLIC_API_URL=https://api.savvyspoon.app
EXPO_PUBLIC_POSTHOG_KEY=<production-posthog-key>
EXPO_PUBLIC_POSTHOG_HOST=https://us.posthog.com
EXPO_PUBLIC_REVENUECAT_IOS_KEY=<production-ios-key>
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<production-android-key>
SENTRY_AUTH_TOKEN=<sentry-auth-token>
NODE_ENV=production
```

**Railway environment variables** (set in Railway dashboard):
```
DATABASE_URL=<supabase-production-url>
SUPABASE_URL=<supabase-project-url>
SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-key>
ANTHROPIC_API_KEY=<anthropic-key>
SPOONACULAR_API_KEY=<spoonacular-key>
EDAMAM_APP_ID=<edamam-id>
EDAMAM_APP_KEY=<edamam-key>
REVENUECAT_WEBHOOK_SECRET=<secret>
SENTRY_DSN=<sentry-dsn>
POSTHOG_API_KEY=<posthog-key>
REDIS_URL=<if-using-redis>
```

---

## Production Setup Checklist

- [ ] API environment variables identified
- [ ] Railway account created
- [ ] API deployed to Railway (get production URL)
- [ ] .env.production created with EXPO_PUBLIC_API_URL from Railway
- [ ] EAS credentials initialized (`eas init`, `eas credentials`)
- [ ] iOS build runs (`eas build ios`)
- [ ] Android build runs (`eas build android`)
- [ ] TestFlight build submitted (`eas submit ios`)
- [ ] Play Store internal build submitted (`eas submit android`)
- [ ] Screenshots created and uploaded to both stores
- [ ] App Store metadata verified (description, keywords, privacy URL)
- [ ] Play Store content rating completed

---

## Parallel Work Possible

**While waiting for API deployment:**
- Create iOS screenshots (1 hour)
- Create Android screenshots (30 min)
- Create Google Play Console listing (30 min)
- Upload screenshots to app stores (30 min)

**Then:**
- Deploy API (5 min)
- Initialize EAS (5 min)
- Build and submit (30 min each platform)

**Total timeline**: ~2.5–3 hours to both stores ready for testing

---

## Next Immediate Steps (Priority Order)

1. **Gather API keys** (ANTHROPIC_API_KEY, SPOONACULAR_KEY, EDAMAM_KEY, SENTRY_DSN)
2. **Deploy to Railway** (5 min, gives you production URL)
3. **Create .env.production** with API URL from Railway
4. **Create screenshots** (parallel: iOS + Android, 1.5 hours)
5. **Fill app store listings** (parallel: App Store + Play Store, 1 hour)
6. **Build and submit** (iOS first, then Android, 1 hour total)
7. **Test on devices** (TestFlight + Play Store internal track, 30 min)

---

## Known Issues & Fixes

**Supabase tables needed for RLS:**
- Verified: 30 tables exist with RLS enabled
- Policies: 35+ user isolation + public access policies

**Missing tables (not in schema):**
- `Item` — NOT created yet (planned for V2 category expansion)
- Schema is subset of CLAUDE.md design (acceptable for MVP)

**GitHub Pages:**
- Requires public repository (currently private)
- Solution: Make repo public OR use Netlify/Vercel (free alternative)

---

## Test Plan Before App Store Submission

Once TestFlight build is ready:
1. Install on iOS device via TestFlight
2. Test signup → onboarding → meal plan generation
3. Test scanner (barcode scan → price submission)
4. Test subscription purchase (sandbox)
5. Test trial end → downgrade flow
6. Check Sentry for any errors
7. Check PostHog for event tracking

Same for Play Store internal track (Android).

---

## Go-Live Checklist

Before submitting to App Store for review:
- [ ] All Sentry errors reviewed and categorized
- [ ] PostHog dashboard shows expected events
- [ ] Trial grant works (new user gets 7-day Pro)
- [ ] Trial expiry downgrades (test with backdated account)
- [ ] RevenueCat sandbox purchase works
- [ ] All tier gates working (free user sees upgrade prompts)
- [ ] Subscription cancellation works
- [ ] Restore purchases works
- [ ] Meal plan generation works end-to-end
- [ ] Scanner captures and submits prices
- [ ] Price trends load for Plus/Pro users
- [ ] AI suggestions load for Pro users
- [ ] Reminders trigger correctly
