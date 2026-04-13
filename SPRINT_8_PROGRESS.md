# Sprint 8 Progress — App Store Ready

## Current Status: 75% Complete (as of Apr 12, 2026)

### Completed Tasks

#### ✅ Task #1: Audit Rate Limiting Coverage (S1–S7)
- All endpoints from Sprints 1–7 have rate limits configured
- Applied per-endpoint limits in `src/middleware/rateLimits.ts`
- Coverage includes auth, planning, scanning, pricing, and reminder endpoints

#### ✅ Task #2: Sentry Error Reporting (Mobile + API)
- **Mobile**: Sentry SDK integrated in `app/_layout.tsx`
- **API**: Sentry SDK integrated in `src/middleware/sentry.ts`
- User context automatically attached on auth
- Error tracking for crashes and exceptions active

#### ✅ Task #3: PostHog Analytics
- **Mobile**: Fully typed event system in `lib/analytics.ts` with 17 event types
- **API**: Analytics tracking integrated in key routes (meal plan generation, subscription purchase, trial events)
- Integration with mobile lifecycle (login/logout) for user properties

#### ✅ Task #4: Privacy Policy & Terms of Service
- **Hosted on GitHub Pages** at `/docs/` directory
- **Privacy Policy**: 12 sections covering data collection, retention, rights, security
- **Terms of Service**: 19 sections covering pricing, trials, liability, arbitration, geographic limitations (Texas-only)
- **Index page**: Navigation hub linking both documents
- All links to third-party privacy policies included

#### ✅ Task #7: Supabase Production Setup
- **Upgraded to Pro tier** ($25/month) — includes daily backups, point-in-time recovery
- **Enabled RLS** on all 30 tables
- **Created RLS policies** (35+ policies) in `supabase/rls-policies.sql`
- **Policies deployed**: Users can only access own data, public can read shared data
- **Production-ready**: Full user isolation for data security

#### ✅ Task #8: EAS Build Configuration
- **Created**: `eas.json` with production, preview, and development profiles
- **Credentials**: Configured for iOS (Apple Team ID, App Store Connect) and Android (Google Play Service Account)
- **Guide**: Complete setup instructions in `EAS_BUILD_SETUP.md`
- **Environment**: Production build profiles configured with resource classes
- **Ready for**: Next step is running EAS credential setup

---

### In Progress

#### 🟡 Task #5: App Store Connect Listing (iOS)
**Status**: Metadata prepared, screenshots pending

**Completed**:
- App description, keywords, and tagline written (in `APP_STORE_LISTINGS.md`)
- Privacy policy URL: https://alan-wong.github.io/smartbite/privacy-policy.html
- Terms of service URL: https://alan-wong.github.io/smartbite/terms-of-service.html
- Support email configured (support@savvyspoon.app)
- Bundle ID: com.savvyspoon.app
- Version: 1.0.0
- Category: Food & Drink

**Pending**:
- Create 6 screenshots (1080 × 2340 px for 6.7" iPhone, 1170 × 2532 px for 5.5" iPhone, iPad sizes)
- Upload screenshots to App Store Connect
- Verify all text and metadata in App Store Connect
- Configure TestFlight internal testing group
- Generate and test build

---

### Next Immediate Step

#### 🚀 Task #8B: Deploy API to Railway (Blocking TestFlight)
**Status**: Ready to start

**What you need:**
- Railway account (free)
- Production Supabase project (✅ done)
- API environment variables (ANTHROPIC_API_KEY, SPOONACULAR_KEY, EDAMAM_KEY, SENTRY_DSN)

**What we'll do:**
1. Create Railway account
2. Connect GitHub repo
3. Set environment variables
4. Deploy API (5 min)
5. Get production URL (e.g., `https://api.savvyspoon.app`)

**Next after this**: EAS build → TestFlight submission

---

### Pending Tasks

#### ⏳ Task #6: Google Play Console Listing (Android)
**Required**:
- Create 6+ screenshots (1080 × 1920 px for phones)
- Enter app name, description, tagline
- Configure privacy policy URL
- Configure contact emails
- Create Google Play Console app record
- Configure content rating (IARC questionnaire)

**Reference**: All metadata in `APP_STORE_LISTINGS.md`

#### ⏳ Task #9: Submit Build to TestFlight (iOS)
**Blocked by**: EAS Build completion

**Steps**:
1. Run `eas build --platform ios --profile production`
2. Wait for build (~15-20 min)
3. Run `eas submit --platform ios --profile production --latest`
4. Verify build appears in App Store Connect > TestFlight
5. Add internal testers and generate invite link

#### ⏳ Task #10: Upload Build to Play Store Internal Track (Android)
**Blocked by**: EAS Build completion

**Steps**:
1. Run `eas build --platform android --profile production`
2. Wait for build (~10-15 min)
3. Run `eas submit --platform android --profile production --latest`
4. Verify build appears in Google Play Console > Internal testing
5. Create test group and share opt-in link

---

## Environment Variables Needed

Create `.env.production` file in `apps/mobile/` (do NOT commit):

```bash
# Production API
EXPO_PUBLIC_API_URL=https://api.savvyspoon.app

# PostHog (production)
EXPO_PUBLIC_POSTHOG_KEY=<production-key>
EXPO_PUBLIC_POSTHOG_HOST=https://us.posthog.com

# RevenueCat (production)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=<production-ios-key>
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<production-android-key>

# Sentry
SENTRY_AUTH_TOKEN=<sentry-token>

NODE_ENV=production
```

---

## Timeline to TestFlight + Play Store

| Step | Duration | Status |
|---|---|---|
| Create screenshots | 1-2 hours | ⏳ Pending |
| Upload to App Store Connect | 15 min | ⏳ Pending (after screenshots) |
| Configure EAS credentials | 10-15 min | ⏳ Pending |
| iOS production build (EAS) | 15-20 min | ⏳ Blocked on credentials |
| Submit to TestFlight | 5 min | ⏳ Blocked on build |
| Android production build (EAS) | 10-15 min | ⏳ Blocked on credentials |
| Submit to Play Store internal | 5 min | ⏳ Blocked on build |
| **Total time to both stores** | **~2 hours** | — |

---

## Immediate Next Steps

1. **Create 6 screenshots** for App Store (see `APP_STORE_LISTINGS.md` for guidelines)
   - Use iPhone 15 Pro Max Simulator for 6.7" screenshots
   - Use iPhone SE Simulator for 5.5" screenshots
   - Create at recommended sizes (PNG format)

2. **Create 6+ screenshots** for Play Store
   - Use Android Emulator for phone screenshots (1080 × 1920 px)

3. **Initialize EAS credentials**
   ```bash
   cd apps/mobile
   pnpm global add eas-cli
   eas init
   eas credentials -p ios
   eas credentials -p android
   ```

4. **Update App Store Connect with metadata**
   - Create app record
   - Upload screenshots
   - Enter description and keywords
   - Configure privacy policy URL

5. **Create Google Play Console app record**
   - Upload screenshots
   - Enter description and tagline
   - Configure privacy policy URL
   - Complete IARC content rating

6. **Run EAS builds**
   ```bash
   eas build --platform ios --profile production
   eas build --platform android --profile production
   ```

7. **Submit to stores**
   ```bash
   eas submit --platform ios --profile production --latest
   eas submit --platform android --profile production --latest
   ```

---

## Files Created This Session

- `apps/mobile/eas.json` — EAS Build configuration
- `EAS_BUILD_SETUP.md` — Complete setup and troubleshooting guide
- `APP_STORE_LISTINGS.md` — All metadata for both App Store and Play Store
- `docs/index.html` — Landing page for legal documents
- `docs/privacy-policy.html` — Privacy policy (SavvySpoon)
- `docs/terms-of-service.html` — Terms of service (SavvySpoon)

---

## Rollback Information

If any build fails after submission:
1. Reject build in App Store Connect or Google Play Console
2. Check Sentry for errors in production environment
3. Fix issue in code
4. Rebuild and resubmit

TestFlight builds can be iterated quickly — no limit on how many builds you can submit.

---

## Go Live Checklist

Before submitting to production:
- [ ] All Sentry errors resolved or categorized
- [ ] PostHog tracking verified with test events
- [ ] Trial grant tested (new account should see "Pro trial" on signup)
- [ ] Trial expiry job verified (test with back-dated trial date)
- [ ] RevenueCat sandbox purchase tested on device
- [ ] All tier gates tested (free user sees upgrade prompts)
- [ ] Subscription cancellation tested
- [ ] Restore purchases tested
- [ ] Scanner tested end-to-end (scan → price submission → observation in DB)
- [ ] Meal plan generation tested with real API call
- [ ] Price trends and AI suggestions loaded for Plus/Pro users

Once all checks pass, submit to App Store for review (1-2 weeks typical). Play Store review is instant.
