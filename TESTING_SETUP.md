# Local Testing Setup (Android Outside Home)

This guide gets your app testable on an Android device outside your home network with minimal cost.

## Architecture

```
Your Android Phone
    ↓
Railway API (free tier) ← Supabase (Pro, already paid)
    ↓
Database (Supabase)
```

## Part 1: Deploy API to Railway (15 min)

### 1.1 Create Railway Account
- Go to https://railway.app
- Sign up (GitHub auth is easiest)
- Create new project

### 1.2 Deploy API
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# In the smartbite repo root
railway init
# Select "Empty Project"
# Name: "smartbite-api"

# Link to your Railway project
railway link [project-id]
```

### 1.3 Set Environment Variables on Railway

In Railway dashboard → smartbite-api → Variables, add:

Copy these from your local `apps/api/.env`:

```
SUPABASE_URL=<from your .env>
SUPABASE_ANON_KEY=<from your .env>
SUPABASE_SERVICE_KEY=<from your .env>
ANTHROPIC_API_KEY=<from your .env>
NODE_ENV=production
PORT=3000
```

⚠️ **Skip Redis** — Railway has free Redis, but tier gate is fail-open without it

### 1.4 Deploy

```bash
# Push to Railway
git push origin main

# Or if Railway Git is linked:
railway up
```

**Railway will automatically:**
1. Detect Procfile
2. Install dependencies
3. Build (`npm run build`)
4. Start API

### 1.5 Get Your Railway URL

In Railway dashboard:
- Navigate to Deployments
- Find the active deployment
- Copy the public URL (looks like: `https://smartbite-api-prod-abc123.railway.app`)

---

## Part 2: Update Mobile App (5 min)

### 2.1 Update .env

Edit `apps/mobile/.env` — copy your values from the current .env, but **update the API URL**:

```env
EXPO_PUBLIC_API_URL=https://smartbite-api-prod-xyz123.railway.app
EXPO_PUBLIC_SUPABASE_URL=<from your .env>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<from your .env>
EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=<from your .env>
EXPO_PUBLIC_SENTRY_DSN=<from your .env>
EXPO_PUBLIC_SENTRY_RELEASE=<from your .env>
EXPO_PUBLIC_POSTHOG_KEY=<from your .env>
EXPO_PUBLIC_POSTHOG_HOST=<from your .env>
```

**Only change:** `EXPO_PUBLIC_API_URL` to point to your Railway URL. Keep other values as they are in your current .env file.

### 2.2 Build Android APK via EAS

```bash
cd apps/mobile

# Build for Android
eas build --platform android --local

# Or cloud build (slower, but no local setup):
eas build --platform android
```

**After build completes:**
- EAS will give you a download link
- Download the APK
- Transfer to your Android phone
- Install: `adb install path/to/smartbite.apk`

---

## Part 3: Test on Device

1. Open the app on your Android phone
2. Sign up / log in
3. Test features:
   - **Onboarding**: Store discovery, profile setup
   - **Scanning**: Take a photo of a barcode, enter price
   - **Meal plans**: Generate a plan, scan prices
   - **Shopping list**: Build and view shopping list

## Costs

- **Supabase Pro**: ~$25/month (already paid)
- **Railway free tier**: $0 (500MB RAM, limited runtime, but enough for testing)
- **EAS Build**: Free tier available (2 builds/month free, then ~$0.50 per build)

**Total for testing: $0 new cost** ✓

## Troubleshooting

### API not connecting
- Check Railway URL is correct in mobile `.env`
- Verify Railway deployment is running (green status in dashboard)
- Check Supabase credentials are correct

### Build fails
- Ensure `yarn install` succeeds: `cd apps/api && yarn install`
- Check all env vars are set on Railway
- View Railway logs: `railway logs`

### EAS Build hangs
- Try local build: `eas build --platform android --local`
- Ensure you have Docker running (for local builds)

---

## Cleanup (When done testing)

To avoid any charges:
- Keep Railway deployment paused when not testing (or delete)
- Don't leave EAS building unattended
