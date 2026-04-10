# EAS Build Configuration for Production

## Prerequisites

1. **EAS Account**: Sign up at https://expo.dev/
2. **Apple Developer Account**: Required for iOS builds
3. **Google Play Developer Account**: Required for Android builds
4. **Xcode** (macOS only): For code signing iOS builds locally

## Setup Steps

### 1. Initialize EAS in Your Project

```bash
cd apps/mobile
eas init
# This will prompt you to link with your Expo account
```

### 2. Install EAS CLI

```bash
npm install -g eas-cli
# or
pnpm global add eas-cli
```

### 3. Configure iOS Build Credentials

Run this command to set up Apple credentials:

```bash
eas credentials -p ios
```

You'll be prompted to:
- Create a new Apple App ID (Bundle ID: `com.savvyspoon.app`)
- Generate a provisioning profile
- Create a distribution certificate

**Alternative**: If you have existing certificates, you can provide them during the prompt.

### 4. Configure Android Build Credentials

Run this command to set up Google Play credentials:

```bash
eas credentials -p android
```

You'll be prompted to:
- Create a keystore for signing (or use existing)
- Configure Play Store signing

**Alternative**: Upload your keystore during the prompt.

### 5. Set Environment Variables for Production Build

Create a `.env.production` file in `apps/mobile/` (do NOT commit):

```bash
# Production API
EXPO_PUBLIC_API_URL=https://api.savvyspoon.app

# PostHog
EXPO_PUBLIC_POSTHOG_KEY=<production-posthog-key>
EXPO_PUBLIC_POSTHOG_HOST=https://us.posthog.com

# RevenueCat (production keys)
EXPO_PUBLIC_REVENUECAT_IOS_KEY=<production-ios-key>
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<production-android-key>

# Sentry
SENTRY_AUTH_TOKEN=<sentry-auth-token>

NODE_ENV=production
```

### 6. Build for iOS (TestFlight)

```bash
eas build --platform ios --profile production
```

This will:
- Compile the app in release mode
- Sign with your production certificate
- Upload to Apple's servers
- Generate a build available in Xcode Cloud or App Store Connect

Build takes ~15-20 minutes. Check progress at https://expo.dev/

### 7. Build for Android (Play Store)

```bash
eas build --platform android --profile production
```

This will:
- Compile the app in release mode
- Sign with your production keystore
- Generate an AAB (Android App Bundle) for Play Store submission

Build takes ~10-15 minutes.

### 8. Submit to TestFlight (iOS)

After iOS build completes:

```bash
eas submit --platform ios --profile production --latest
```

You'll be prompted to:
- Select the build to submit
- Confirm submission to TestFlight

Once submitted, the build appears in App Store Connect under TestFlight. Apple reviews and adds to internal testers.

### 9. Submit to Play Store Internal Testing (Android)

After Android build completes:

```bash
eas submit --platform android --profile production --latest
```

You'll be prompted to:
- Select the build to submit
- Confirm submission to Play Store internal track

## Environment Variable Placeholders

The following need to be replaced with actual values:

| Variable | Source | Notes |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | Your API domain | e.g., https://api.savvyspoon.app |
| `EXPO_PUBLIC_POSTHOG_KEY` | PostHog project | Found in PostHog Settings > API |
| `EXPO_PUBLIC_POSTHOG_HOST` | PostHog custom domain | or `https://us.posthog.com` for US |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | RevenueCat dashboard | Under "API Keys" for iOS |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat dashboard | Under "API Keys" for Android |
| `SENTRY_AUTH_TOKEN` | Sentry project settings | Used by EAS to upload source maps |

## Troubleshooting

### Build fails with "No credentials found"

```bash
eas credentials -p ios  # Reconfigure iOS credentials
eas credentials -p android  # Reconfigure Android credentials
```

### "Bundle ID mismatch"

Ensure `app.json` has correct bundle identifiers:
- iOS: `com.savvyspoon.app`
- Android: `com.savvyspoon.app`

### "Unable to create JWT"

RevenueCat keys may be incorrect. Double-check in RevenueCat dashboard:
- Settings → API Keys
- Copy the exact key (no spaces)

### TestFlight build appears as "Processing"

This is normal. Apple is processing the build. Check App Store Connect > TestFlight > Builds.

Processing usually takes 5-10 minutes. Once complete, you can add internal testers.

## What's Next

After TestFlight and Play Store builds are submitted:

1. **Add TestFlight Internal Testers**
   - App Store Connect → TestFlight → Internal Testing
   - Add Apple ID email addresses
   - Send invite links to testers

2. **Add Play Store Internal Testing Users**
   - Google Play Console → Internal testing
   - Create a group or add testers
   - Share opt-in link

3. **Verify Builds on Device**
   - Install TestFlight build on iOS device
   - Install Play Store internal build on Android device
   - Test core flows:
     - Signup → onboarding → meal plan generation
     - Scanner → price observation submission
     - Subscription → paywall → purchase (sandbox)
     - Trial end → downgrade to Free

4. **Monitor in Sentry + PostHog**
   - Verify errors are being reported in Sentry
   - Verify events are being tracked in PostHog
   - Check for any crashes or unhandled errors

## Important Notes

- **Never commit `.env.production`** — store keys in a secure vault
- **Credentials are stored in Expo servers** — EAS manages them securely
- **One app per bundle ID** — ensure no conflicts if you have other SavvySpoon test apps
- **RevenueCat sandbox keys** for testing purchases — production keys only for released builds
- **Source maps** — Sentry will automatically fetch from EAS Build output if `SENTRY_AUTH_TOKEN` is provided

## Timeline

| Step | Duration | Notes |
|---|---|---|
| Setup credentials | 5-10 min | One-time, only when first building |
| iOS build | 15-20 min | Slower due to Apple's servers |
| Android build | 10-15 min | Faster than iOS |
| TestFlight submission | 5-10 min | Processing can take additional 5-10 min |
| Play Store submission | 2-5 min | Instant, no additional processing |

Total time from `eas build` to ready for testing: **45-60 minutes**
