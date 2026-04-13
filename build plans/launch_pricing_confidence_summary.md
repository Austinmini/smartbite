# Launch Pricing Confidence Summary

Date: 2026-04-13

## What Was Implemented

### 1) Confidence-aware estimate payload from pricing scan
- Updated `scanPrices()` to return:
  - `knownSubtotal`
  - `estimatedSubtotal`
  - `coveragePct`
  - `confidencePct`
  - `missingIngredients`
- Confidence formula:
  - `confidencePct = 35 + (coveragePct * 65 / 100)`
- File:
  - `apps/api/src/services/pricingService.ts`

### 2) Community-only pricing fallback tiers (no external store APIs)
- Removed MealMe/Kroger lookup path from pricing service.
- Current lookup order for each ingredient:
  1. Recent same-store community observations (`available: true`)
  2. Regional market observations (`available: false`, estimate)
  3. Regionalized baseline estimate
  4. Baseline estimate
- File:
  - `apps/api/src/services/pricingService.ts`

### 3) Recipe UI estimate + confidence experience
- Recipe pricing UI now shows:
  - Confidence percentage
  - “Known subtotal + estimated unknown items”
  - Missing-price CTA (“Scan missing prices now”)
  - Hidden unpriced ingredient rows; replaced by one truncated summary line
- File:
  - `apps/mobile/app/recipe/[id].tsx`

### 4) Home UI launch cards: calibration + budget guardrails
- Added calibration card:
  - progress toward 5 starter scans
  - suggested missing staples
- Added budget guardrail card:
  - projected spend range vs weekly budget
  - risk level based on confidence-adjusted range
- File:
  - `apps/mobile/app/(tabs)/index.tsx`

### 5) Calibration status API
- Added endpoint:
  - `GET /prices/calibration-status`
- Returns:
  - `complete`
  - `progressCount`
  - `targetCount`
  - `missingStaples`
- File:
  - `apps/api/src/routes/prices.ts`

### 6) Incentive for high-impact scans
- `POST /prices/observation` now accepts `productName` and can award extra bonus Bites when scan fills missing recent coverage for a product/store.
- Response includes `impactBonus`.
- File:
  - `apps/api/src/routes/prices.ts`

## Test Updates and Validation

### API tests
- Updated pricing service tests for community-only logic and new payload fields:
  - `apps/api/src/services/__tests__/pricingService.test.ts`
- Verified passing:
  - `src/services/__tests__/pricingService.test.ts`
  - `src/services/__tests__/mealPlanService.test.ts`
  - `src/routes/__tests__/prices.test.ts`

### Mobile tests
- Verified passing:
  - `components/__tests__/MealPlanCard.test.tsx`
  - `components/__tests__/BestStoreCard.test.tsx`
  - `stores/__tests__/profileStore.test.ts`

## Notes

- This is a practical launch-safe v1. It provides usable estimate-first pricing before community coverage grows.
- The UI is now explicit that early totals are estimates and improves confidence messaging as scan coverage increases.
