# Sprint 3 Gap Checklist

Use this file to track the remaining work needed to fully satisfy the Sprint 3 objectives in `CLAUDE.md`.

## Core blockers

- [x] Persist real nearby store selections, not just retailer chain keys
  - Problem: onboarding currently stores `preferredRetailers` as chain names, but pricing needs actual store/location IDs from `/stores/nearby`.
  - Current code:
    - `apps/mobile/app/(auth)/onboarding/location.tsx`
    - `apps/mobile/app/(auth)/onboarding/complete.tsx`
    - `apps/mobile/stores/profileStore.ts`
    - `apps/api/src/routes/profile.ts`
    - `apps/api/src/services/pricingService.ts`
  - Done when:
    - selected nearby store IDs are saved from onboarding
    - profile persistence includes those store IDs
    - `/prices/scan` uses real vendor store IDs for MealMe/Kroger lookups

- [x] Persist and honor `maxStores` so 2-store scanning actually works
  - Problem: `UserProfile.maxStores` defaults to `1` and is never written by the current onboarding/profile flows.
  - Current code:
    - `apps/api/prisma/schema.prisma`
    - `apps/api/src/routes/profile.ts`
    - `apps/api/src/routes/prices.ts`
  - Done when:
    - selecting two stores during onboarding results in `maxStores = 2`
    - one selected store results in `maxStores = 1`
    - `/prices/scan` actually scans both stores for eligible users

- [x] Populate best-store data for the full weekly plan before building the shopping list
  - Problem: shopping list grouping depends on `meal.bestStore`, but that value is only updated when an individual recipe price scan runs.
  - Current code:
    - `apps/api/src/services/pricingService.ts`
    - `apps/api/src/routes/prices.ts`
  - Done when:
    - the week’s meals have store assignments before shopping-list generation
    - `/prices/shopping-list/:planId` does not fall back to `Best store pending` for normal Sprint 3 flows

## UX / product gaps

- [x] Handle degraded no-price responses cleanly in the recipe pricing UI
  - Problem: backend returns `hasAnyPrices` and `message`, but the mobile screen does not render that state explicitly.
  - Current code:
    - `apps/api/src/services/pricingService.ts`
    - `apps/mobile/app/recipe/[id].tsx`
  - Done when:
    - the UI shows a clear fallback message when no live prices are available
    - zero-dollar “best store” output is not presented as a real live-price win
    - unavailable ingredient/store rows are understandable to the user

- [ ] Add the “Add to this week’s plan” CTA on recipe detail
  - Status: deferred pending product definition on what “add to this week’s plan” should do from recipe detail.
  - Problem: the current app only opens recipe detail from an existing planned meal, so the intended add-to-plan behaviour is ambiguous.
  - Current code:
    - `apps/mobile/app/recipe/[id].tsx`
    - `CLAUDE.md`
  - Revisit when:
    - recipe detail includes an “Add to this week’s plan” action
    - tapping it adds the recipe into the active weekly plan flow
    - related Sprint 3 checklist item can be checked off

## Verification

- [ ] Confirm Sprint 3 definition-of-done items are true in real usage
  - Check:
    - real prices appear from at least one live store
    - best single store is correct across two selected stores
    - split option appears only when savings are at least `$3`
    - shopping list is grouped by actual assigned store
    - checked shopping-list state survives app restart
    - degraded fallback is shown when a store has no pricing data

- [ ] Re-run sprint completion checks after the above are done
  - Commands:
    - `pnpm --filter @smartbite/api test`
    - `pnpm --filter @smartbite/mobile test`
    - `pnpm --filter @smartbite/api build`
    - `pnpm --filter @smartbite/mobile lint`
  - Then:
    - update `CLAUDE.md`
    - run the equivalent of `/sync-progress` for `README.md`
