# SmartBite Work Summary

Date: 2026-04-03

## Overview

This note summarizes the changes made during the current debugging and testing pass around Sprint 2 meal-plan generation.

## 1. Meal-plan generation reduced to 3 meals for testing

Updated the API meal-plan generation flow in `apps/api/src/services/mealPlanService.ts` so the Claude prompt now requests:

- exactly 1 day
- exactly 3 meals total
- meal order: `BREAKFAST`, `LUNCH`, `DINNER`

Why:

- the original full 7-day x 3-meal payload was producing malformed/truncated JSON from Claude
- the failure surfaced as `JSON.parse` crashing in `generateMealPlan`

Also changed:

- lowered `max_tokens` for the generation call
- added a safer JSON parsing helper that:
  - strips markdown fences
  - extracts the JSON object from surrounding text
  - throws a clearer invalid-JSON error

## 2. Meal-plan API auth/network debugging

While testing from mobile, there were two separate runtime issues:

### Network request failed

Root cause:

- the mobile app was pointing at an outdated LAN IP for the API
- the API server also was not actively running in the visible dev terminal

Action taken:

- confirmed the API was listening on a new LAN IP
- updated the mobile app API target to use the current backend address
- restarted the backend server directly with `node dist/index.js`

### Invalid token

Root cause:

- the mobile request was reaching the backend, but auth was rejecting the stored token

Resolution:

- confirmed this was a `401` in the auth middleware, before plan generation
- after re-authentication, meal-plan generation started working again

## 3. Fixed serving-cost mismatch bug

Problem discovered:

- recipe cards were effectively showing per-serving cost
- backend meal cost storage used Claude's `estCostPerServing` directly
- weekly totals therefore undercounted multi-serving meals
- this could make the displayed weekly total not match the user's configured serving count or budget expectations

### Backend fix

Updated `apps/api/src/services/mealPlanService.ts`:

- added currency helpers to normalize meal and plan totals
- `meal.estCost` is now stored as full recipe cost:

  `estCostPerServing * profile.servings`

- `mealPlan.totalEstCost` is now recomputed from normalized meal totals instead of trusting Claude's top-level total directly
- recipe `servings` now uses the user's profile setting instead of being hardcoded to `2`

### Regenerate meal fix

Updated regeneration flow so that:

- regenerated meal cost is normalized using current profile servings
- regenerated recipe servings are updated to match profile servings
- meal plan total is recalculated after a meal is regenerated
- route response now returns both:
  - updated `meal`
  - updated `totalEstCost`

Files changed:

- `apps/api/src/services/mealPlanService.ts`
- `apps/api/src/routes/plans.ts`

## 4. Mobile UI labeling fix

Updated mobile UI so displayed meal cost matches the backend meaning of the field.

Changed:

- recipe card cost label from ambiguous cost to `~$X total`
- recipe detail screen label from `/$serving` to `total`
- local plan state now updates `totalEstCost` after meal regeneration

Files changed:

- `apps/mobile/components/RecipeCard.tsx`
- `apps/mobile/app/recipe/[id].tsx`

## 5. Test updates

Updated tests to cover:

- 3-meal test-plan prompt
- tolerant JSON parsing when Claude wraps JSON with extra text
- saving meal costs using total recipe servings
- regeneration recalculating meal and plan totals
- route response shape for regenerate-meal
- recipe card UI label change

Files changed:

- `apps/api/src/services/__tests__/mealPlanService.test.ts`
- `apps/api/src/routes/__tests__/plans.test.ts`
- `apps/api/src/test/mocks/prisma.ts`
- `apps/mobile/components/__tests__/RecipeCard.test.tsx`

## 6. Verification performed

Completed:

- API TypeScript build passed via `npm run build`
- focused API tests passed
- focused mobile component tests passed

Note:

- targeted Jest runs still exit non-zero in this repo because global coverage thresholds are enforced even when the selected tests themselves pass

## 7. Important follow-up note

Previously generated plans in the database may still contain undercounted meal costs from before the serving-cost fix.

Implication:

- newly generated plans will use the corrected totals
- old plans may still show stale cost values unless regenerated or recreated

