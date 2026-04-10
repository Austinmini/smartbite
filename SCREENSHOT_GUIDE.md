# Screenshot Capture Guide for App Store Listings

## Prerequisites

Before capturing screenshots, ensure:

1. **App is built and running** on iOS Simulator or Android Emulator
2. **Test account is logged in** with realistic data:
   - Budget: $100/week
   - Stores: HEB, Walmart
   - Dietary goals: High-protein
3. **Test data exists** in the app:
   - A generated meal plan from the current week
   - At least 5 saved recipes
   - Some purchase history
4. **Device is set to Light Mode** (for clarity in screenshots)
5. **Time is set to prevent clock inconsistencies** (optional but recommended)

---

## Part 1: iOS Screenshots (6 Required)

### Setup iOS Simulator

```bash
# Open Xcode
open -a Xcode

# Or launch simulator directly
open /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app

# Once running, select device:
# Device → Set Default Simulator → iPhone 15 Pro Max (6.7")
# Device → Set Default Simulator → iPhone SE (5.5")
```

### Recommended Device Sizes

| Device | Screen Size | Resolution | Use for |
|---|---|---|---|
| iPhone 15 Pro Max | 6.7" | 1290 × 2796 | 4 screenshots |
| iPhone SE (3rd gen) | 5.5" | 1125 × 2436 | 1 screenshot |
| iPad (7th gen) | 10.2" | 2048 × 2732 | 1 screenshot |

### Capture Screenshot (Single Method)

```bash
# While simulator is open and running the app:
xcrun simctl io booted screenshot ~/Desktop/screenshot-1.png

# Or use Command+S keyboard shortcut in Simulator
# File → Save Screenshot
```

### iOS Screenshot #1: Sign Up / Onboarding (6.7" iPhone)

**Navigation**:
1. Launch app (should show login screen if not logged in)
2. Tap "Sign up"
3. Stay on sign up screen

**What should be visible**:
- Email input field
- Password input field
- "Sign up" button
- "Already have an account? Log in" link
- SavvySpoon logo at top

**Capture**:
```bash
# Position: email field focused
xcrun simctl io booted screenshot ~/Desktop/ios-1-signup.png
```

**Text overlay to add later** (Figma/Photoshop):
```
"Get started in seconds
Create your SavvySpoon account"
```

---

### iOS Screenshot #2: Meal Plan Generation (6.7" iPhone)

**Navigation**:
1. Log in with test account
2. Tap "Generate meal plan" button
3. Wait for plan to load (or show loading state if it takes time)
4. Once loaded, take screenshot of week view

**What should be visible**:
- 7-day meal plan grid
- Breakfast/lunch/dinner for at least 2 days visible
- Meal cards showing:
  - Recipe name
  - Cooking time (e.g. "25 min")
  - Estimated cost (e.g. "~$4.50")
- "Personalized for you" tag (if Plus/Pro user)

**Capture**:
```bash
xcrun simctl io booted screenshot ~/Desktop/ios-2-mealplan.png
```

**Text overlay to add later**:
```
"7-day personalized meal plans
AI adapts to your taste & budget"
```

---

### iOS Screenshot #3: Recipe Details & Price Comparison (6.7" iPhone)

**Navigation**:
1. From meal plan, tap any meal card
2. Scroll to see ingredients list
3. Scroll to "Best store" price comparison section

**What should be visible**:
- Recipe title at top
- Recipe image
- Ingredients list (at least 3 visible)
- "Best store" card showing:
  - Store name (e.g. "HEB")
  - Total cost (e.g. "~$14.20")
  - Store distance (e.g. "2.3 mi")
- Price comparison with alternative store

**Capture**:
```bash
xcrun simctl io booted screenshot ~/Desktop/ios-3-recipe-pricing.png
```

**Text overlay to add later**:
```
"See real prices across stores
Compare & shop for the best deal"
```

---

### iOS Screenshot #4: Scanner (6.7" iPhone)

**Navigation**:
1. From any shopping list or home screen
2. Tap camera/scanner icon
3. Show camera view with barcode overlay

**What should be visible**:
- Camera preview
- Barcode scanning frame in center
- "Point camera at barcode" text or instructional overlay
- OR show the price confirmation screen after a scan:
  - Product name
  - Price input field
  - Quantity field
  - "Submit" button

**Capture** (option A - camera):
```bash
xcrun simctl io booted screenshot ~/Desktop/ios-4-scanner-camera.png
```

**Capture** (option B - post-scan confirmation):
```bash
# After simulating a scan, screenshot the confirmation screen
xcrun simctl io booted screenshot ~/Desktop/ios-4-scanner-confirm.png
```

**Text overlay to add later**:
```
"Scan prices, earn rewards
Help your community save money"
```

---

### iOS Screenshot #5: Shopping List & Pantry (6.7" iPhone)

**Navigation**:
1. Go to Home tab
2. Scroll down to shopping list (or tap "Shopping List" button)
3. Show shopping list grouped by store with checkmarks

**What should be visible**:
- Store name (e.g. "HEB")
- Items list under each store:
  - Item name
  - Quantity (e.g. "2 lb")
  - Checkbox (checked and unchecked items)
  - "Last bought" badge if available (e.g. "Last bought: HEB on Apr 5")
- Progress bar or item count
- Checkmarks on some items to show completion

**Capture**:
```bash
xcrun simctl io booted screenshot ~/Desktop/ios-5-shopping-list.png
```

**Text overlay to add later**:
```
"Smart shopping list
Optimized for the best deals"
```

---

### iOS Screenshot #6: Subscription / Tier Upgrade (6.7" iPhone)

**Navigation**:
1. Go to Profile tab
2. Scroll to Subscription section
3. Show either:
   - Current tier badge + upgrade button, OR
   - Paywall with tier comparison (Plus vs Pro)

**What should be visible**:
- Tier comparison cards (Free / Plus / Pro)
- Feature lists under each tier:
  - ✓ Unlimited meal plans (Pro)
  - ✓ Price trends (Pro)
  - ✓ AI suggestions (Pro)
  - etc.
- "Start 7-day free trial" button for Pro (if new user)
- OR "Upgrade to Pro" button with price ($9.99/mo)
- OR current tier badge "You're on Pro" with renewal date

**Capture**:
```bash
xcrun simctl io booted screenshot ~/Desktop/ios-6-subscription.png
```

**Text overlay to add later**:
```
"Unlock everything with Pro
Unlimited plans, price trends, AI suggestions"
```

---

## Part 2: Android Screenshots (6+ Required)

### Setup Android Emulator

```bash
# Open Android Studio
open -a "Android Studio"

# Or launch emulator directly
~/Library/Android/sdk/emulator/emulator -avd Pixel_6_API_34

# Recommended: Pixel 6 (1080 × 2340) or Pixel 7 (1440 × 3120)
```

### Recommended Device Sizes

| Device | Resolution | Notes |
|---|---|---|
| Pixel 6 | 1080 × 2400 | Standard phone size |
| Pixel 7 Pro | 1440 × 3120 | Larger phone (5% of users) |
| Tablet | 1280 × 1920 | Optional bonus screenshot |

### Capture Screenshot (Multiple Methods)

```bash
# Method 1: adb command
adb shell screencap -p /sdcard/screenshot.png
adb pull /sdcard/screenshot.png ~/Desktop/screenshot-1.png

# Method 2: Android Studio built-in
# Device Manager → Screenshot button (in tool window)

# Method 3: Emulator menu
# Right-click emulator window → Screenshots
```

### Android Screenshot #1: Sign Up

**Same as iOS #1** — Email input, password field, "Sign up" button

**Capture**:
```bash
adb shell screencap -p /sdcard/android-1-signup.png
adb pull /sdcard/android-1-signup.png ~/Desktop/
```

---

### Android Screenshot #2: Meal Plan

**Same as iOS #2** — 7-day meal plan grid with recipe cards

---

### Android Screenshot #3: Recipe & Pricing

**Same as iOS #3** — Recipe detail with ingredients and "Best store" card

---

### Android Screenshot #4: Scanner

**Same as iOS #4** — Barcode camera or price confirmation

---

### Android Screenshot #5: Shopping List

**Same as iOS #5** — Shopping list grouped by store with checkmarks

---

### Android Screenshot #6: Subscription / Paywall

**Same as iOS #6** — Tier comparison or upgrade button

---

### Android Screenshot #7 (Bonus): Rewards / Pantry

**Optional bonus screenshot** to differentiate Android listing:

**Navigation**:
1. Go to Profile tab
2. Tap "Rewards" or "Pantry"
3. Show:
   - Bites balance (e.g. "240 Bites")
   - Streak counter (e.g. "7-day streak")
   - Badge grid
   - OR Pantry items with quantities

**Capture**:
```bash
adb shell screencap -p /sdcard/android-7-rewards.png
adb pull /sdcard/android-7-rewards.png ~/Desktop/
```

---

## Part 3: Post-Capture Processing

### Resize Screenshots to Store Specifications

```bash
# Install ImageMagick if not present
brew install imagemagick

# iOS 6.7" (1290 × 2796 px) - resize to recommended size
magick ios-1-signup.png -resize 1290x2796 ios-1-signup-resized.png

# iOS 5.5" (1125 × 2436 px)
magick ios-2-mealplan.png -resize 1125x2436 ios-2-mealplan-resized.png

# Android (1080 × 1920 px)
magick android-1-signup.png -resize 1080x1920 android-1-signup-resized.png
```

### Add Text Overlays (Using ImageMagick)

```bash
# Example: Add text to screenshot
magick ios-1-signup.png \
  -gravity SouthWest \
  -fill white \
  -font Arial \
  -pointsize 60 \
  -annotate +50+100 "Get started\nin seconds" \
  -pointsize 40 \
  -annotate +50+300 "Create your account" \
  ios-1-signup-final.png
```

**Better approach**: Use Figma or Photoshop for professional overlays:
1. Import screenshot into Figma
2. Add text layers with exact positioning
3. Export as PNG
4. Repeat for all 12 screenshots

---

## Part 4: Verify Screenshots

### iOS Screenshots Checklist

- [ ] ios-1-signup.png (1290 × 2796) — Sign up screen visible
- [ ] ios-2-mealplan.png (1290 × 2796) — 7-day plan with recipe cards
- [ ] ios-3-recipe-pricing.png (1290 × 2796) — Recipe + price comparison
- [ ] ios-4-scanner.png (1290 × 2796) — Scanner or confirmation screen
- [ ] ios-5-shopping-list.png (1290 × 2796) — Shopping list with checkmarks
- [ ] ios-6-subscription.png (1290 × 2796) — Paywall or subscription status
- [ ] ios-2-mealplan-5.5.png (1125 × 2436) — 5.5" iPhone screenshot (same content)
- [ ] ios-3-ipad.png (2048 × 2732) — iPad-optimized view (optional)

### Android Screenshots Checklist

- [ ] android-1-signup.png (1080 × 1920) — Sign up screen
- [ ] android-2-mealplan.png (1080 × 1920) — Meal plan
- [ ] android-3-recipe-pricing.png (1080 × 1920) — Recipe + pricing
- [ ] android-4-scanner.png (1080 × 1920) — Scanner
- [ ] android-5-shopping-list.png (1080 × 1920) — Shopping list
- [ ] android-6-subscription.png (1080 × 1920) — Paywall
- [ ] android-7-rewards.png (1080 × 1920) — Rewards/Pantry (bonus)

---

## Part 5: Automation Script (Optional)

If you want to automate the capture process, here's a script:

```bash
#!/bin/bash
# screenshot-capture.sh

set -e

SCREENSHOTS_DIR="$HOME/Desktop/SavvySpoon-Screenshots"
mkdir -p "$SCREENSHOTS_DIR"

echo "📸 Starting iOS screenshot capture..."

# Function to capture iOS screenshot
capture_ios() {
    local name=$1
    echo "Capturing: $name"
    xcrun simctl io booted screenshot "$SCREENSHOTS_DIR/ios-$name.png"
    sleep 2  # Wait for screenshot to be written
}

# Function to capture Android screenshot
capture_android() {
    local name=$1
    echo "Capturing: $name"
    adb shell screencap -p "/sdcard/screenshot.png"
    adb pull "/sdcard/screenshot.png" "$SCREENSHOTS_DIR/android-$name.png"
    sleep 2
}

# iOS captures
echo "Make sure iOS Simulator is running with the app open..."
echo "Press ENTER when ready, then navigate to sign up screen"
read

capture_ios "1-signup"

echo "Navigate to meal plan screen..."
read
capture_ios "2-mealplan"

echo "Tap a meal to show recipe detail..."
read
capture_ios "3-recipe-pricing"

echo "Show scanner screen..."
read
capture_ios "4-scanner"

echo "Show shopping list..."
read
capture_ios "5-shopping-list"

echo "Show subscription/paywall screen..."
read
capture_ios "6-subscription"

# Android captures
echo ""
echo "📸 iOS screenshots done!"
echo "Now setting up Android..."
echo "Make sure Android Emulator is running..."
echo "Press ENTER when ready"
read

capture_android "1-signup"
capture_android "2-mealplan"
capture_android "3-recipe-pricing"
capture_android "4-scanner"
capture_android "5-shopping-list"
capture_android "6-subscription"
capture_android "7-rewards"

echo ""
echo "✅ All screenshots captured to: $SCREENSHOTS_DIR"
echo "Next: Resize and add text overlays using Figma or Photoshop"
```

**Usage**:
```bash
chmod +x screenshot-capture.sh
./screenshot-capture.sh
```

---

## Part 6: Figma Template for Adding Text Overlays

Rather than manually editing each screenshot, you can use this Figma workflow:

1. **Create Figma project**: "SavvySpoon App Store Screenshots"

2. **For each screenshot**:
   - Create a 1290 × 2796 frame (iOS)
   - Import screenshot as background image
   - Add text layers on top:
     - Font: -apple-system (or San Francisco)
     - Size: 50–80 pt for headings
     - Color: White with black shadow
     - Position: Top 20%, centered or left-aligned

3. **Text to add**:
   - Screenshot 1: "Get started in seconds" + "Create your SavvySpoon account"
   - Screenshot 2: "7-day personalized meal plans" + "AI adapts to your taste & budget"
   - Screenshot 3: "See real prices across stores" + "Compare & shop for the best deal"
   - Screenshot 4: "Scan prices, earn rewards" + "Help your community save money"
   - Screenshot 5: "Smart shopping list" + "Optimized for the best deals"
   - Screenshot 6: "Unlock everything with Pro" + "Unlimited plans, price trends, AI suggestions"

4. **Export**:
   - Right-click frame → Download as PNG
   - Save to `~/Desktop/SavvySpoon-Screenshots/`

---

## Troubleshooting

### Simulator not responding
```bash
# Kill and restart simulator
killall "Simulator"
open -a Simulator
```

### Screenshot quality is low
- Ensure device is set to native resolution (not scaled)
- Use `xcrun simctl io booted screenshot` (exact copy) not Command+S (may scale)

### adb not found (Android)
```bash
# Add to ~/.zshrc or ~/.bashrc
export PATH=$PATH:~/Library/Android/sdk/platform-tools
source ~/.zshrc
```

### Emulator too slow
- Use **iPhone Simulator** (faster than Android on Mac)
- Close other apps
- Allocate more RAM in emulator settings

---

## Timeline

| Step | Time | Notes |
|---|---|---|
| Set up simulator | 5 min | One-time setup |
| Capture 6 iOS screenshots | 15 min | Include navigation between screens |
| Capture 6+ Android screenshots | 15 min | Slower if emulator is lagging |
| Resize all screenshots | 10 min | ImageMagick batch process |
| Add text overlays in Figma | 30 min | Design polishing |
| Verify all 12 final files | 5 min | Quick quality check |
| **Total** | **~1 hour** | — |

---

## Upload to Stores

### Upload to App Store Connect

1. Log in to https://appstoreconnect.apple.com
2. Select "My Apps" → SavvySpoon
3. Go to "App Screenshots"
4. Select device type (6.7" iPhone, 5.5" iPhone, iPad)
5. Drag and drop screenshots in order
6. App Store automatically crops to safe area

### Upload to Google Play Console

1. Log in to https://play.google.com/console
2. Select SavvySpoon app
3. Go to "Store listing" → "Screenshots"
4. Upload phone screenshots (1080 × 1920 px minimum)
5. Google Play displays up to 8 screenshots

---

Once screenshots are captured and uploaded, you're ready to proceed with EAS builds and TestFlight submission!
