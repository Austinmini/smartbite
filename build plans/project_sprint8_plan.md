---
name: Sprint 8 plan — App store ready
description: Signed builds on TestFlight and Play Store internal track. All flows working on real device with real API keys.
type: project
---

# Sprint 8
> "Signed build on TestFlight and Play Store internal track"

**Status:** NOT STARTED

---

## Pre-launch checklist

### Infrastructure
- [ ] Enable PgBouncer in Supabase dashboard + update `DATABASE_URL` with `?pgbouncer=true&connection_limit=1`
- [ ] Re-enable Supabase email confirmation (disabled for dev — see `project_email_confirmation.md`)
- [ ] Production API keys: Anthropic, Spoonacular, Edamam, USDA, RevenueCat webhook secret, Redis
- [ ] Set `NODE_ENV=production` on Railway/Fly.io

### Rate limiting audit
- [ ] Verify all endpoints added in Sprints 1–7 have correct rate limits applied
- [ ] Check RATE_LIMITS table in `src/middleware/rateLimits.ts` is complete

### Observability
- [ ] PostHog analytics — key events: plan_generated, recipe_saved, scan_submitted, subscription_purchased, trial_started, trial_expired
- [ ] Sentry error reporting — mobile + API
- [ ] Health check endpoint `GET /health` returns status for all external APIs

### Legal + compliance
- [ ] `DELETE /account` — cascade delete all PII, anonymise PriceObservation rows (null userId)
- [ ] Privacy policy + terms of service hosted at a public URL
- [ ] Add links to privacy policy in app settings and App Store listing

### Builds
- [ ] EAS Build configured for iOS + Android production builds (`eas.json`)
- [ ] iOS: code signing certificates + provisioning profiles set up in EAS
- [ ] Android: keystore configured in EAS

### App Store (iOS)
- [ ] App Store Connect: app record created
- [ ] Screenshots: 6.7" (iPhone 15 Pro Max), 5.5" (iPhone 8 Plus), iPad 12.9"
- [ ] App description, keywords, subtitle, support URL
- [ ] Age rating: 4+ (food/shopping utility)
- [ ] TestFlight build submitted and external testers invited

### Google Play (Android)
- [ ] Google Play Console: app record created
- [ ] Store listing: description, screenshots (phone + 7" tablet), feature graphic
- [ ] Content rating questionnaire completed
- [ ] Play Store internal track build uploaded

### Subscription production setup
- [ ] RevenueCat: switch from sandbox to production
- [ ] App Store: free trial introductory offer approved by Apple
- [ ] Google Play: subscription products published and approved

---

## Definition of done
```
✓ TestFlight install link works for external testers
✓ All Sprints 1–7 features work end-to-end on physical device from TestFlight
✓ Subscription purchase completes in production (real charge)
✓ Push notifications arrive on physical device
✓ Sentry captures at least one test error correctly
✓ PostHog dashboard shows real events from test session
✓ DELETE /account removes all PII (verify in DB)
✓ App Store and Play Store listings have all required assets
✓ PgBouncer enabled — no connection pool errors under load
✓ Email confirmation active — fake accounts blocked
```
