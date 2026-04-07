---
name: Onboarding checklist and Did You Know tips
description: Interactive onboarding checklist on home screen + contextual tips to drive feature discovery.
type: project
---

## Two components

### 1. Onboarding checklist (home screen card)
Shown after onboarding completes until all 5 actions are done. Disappears once complete.
Tracks completion server-side so it persists across devices.

**Schema — add to UserProfile:**
```prisma
completedActions String[] @default([])
// Values: 'profile_complete' | 'first_plan_generated' | 'first_scan' | 'first_purchase' | 'first_recipe_cooked'
```

**Checklist items:**
| Action | Trigger | Bites bonus |
|---|---|---|
| Set up your profile | `PUT /profile` or any existing saved profile | — |
| Generate your first meal plan | `POST /plans/generate` (first time) | Already covered by welcome flow |
| Scan a grocery item | `POST /prices/observation` (first scan) | Already FIRST_SCAN badge |
| Record your first purchase | `POST /purchases` (first time) | — |
| Mark a meal as cooked | `POST /recipes/:id/cooked` (first time) | — |

**API:** `GET /profile` returns normalized `completedActions`; `GET /profile/checklist` returns checklist progress with inferred completion for existing plans, scans, purchases, and profile setup.
Each relevant route marks the action when triggered for the first time:
```typescript
// In POST /plans/generate, after creating the plan:
await markActionComplete(userId, 'first_plan_generated')

async function markActionComplete(userId: string, action: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { completedActions: true },
  })

  const completedActions = normalizeCompletedActions(profile?.completedActions)
  if (!completedActions.includes(action)) {
    await prisma.userProfile.update({
      where: { userId },
      data: { completedActions: [...completedActions, action] },
    })
  }
}
```

**Mobile — OnboardingChecklist component:**
- Card on home screen, below the plan section
- Progress bar (e.g. "3 of 5 complete")
- Each item: checkmark icon (green if done, grey if not), label, optional CTA button
- "Dismiss" link once all 5 done (or auto-hides)
- Stored completion state read from `GET /profile/checklist`

---

### 2. Did You Know tips (contextual)
Static tips shown in the right context. Dismissed tips stored in AsyncStorage.

**Tip triggers and placements:**

| Screen | Tip | Shown when |
|---|---|---|
| Home (first visit) | "Pull down to refresh your meal plan any time" | First app open after onboarding |
| Shopping list (first visit) | "Tap 📷 Scan to report prices and earn Bites rewards" | First time viewing a shopping list |
| Shopping list | "Tap any item to confirm what you bought — it updates your pantry automatically" | First check-off |
| Pantry (first visit) | "Your pantry updates automatically when you check off shopping list items" | First visit |
| Recipe detail | "Mark as Cooked to track what you've made and deduct ingredients from your pantry" | First recipe detail view |
| Rewards (first visit) | "Scan prices at any Texas store to earn Bites. 1,000 Bites = $10 off your subscription" | First rewards tab visit |
| Profile | "Switch between Plus and Pro any time — your data is never lost when you change plans" | First profile visit |

**Storage:** each tip has a unique ID. Dismissed IDs stored in AsyncStorage key `tips_dismissed`.

**Component — TipBanner:**
```typescript
interface Tip {
  id: string
  emoji: string
  text: string
}

// AsyncStorage key: 'tips_dismissed' → string[] of dismissed tip IDs
// Show only if tip.id not in dismissed list
// Dismiss: add to list, hide immediately
```

---

## Implementation status
- [x] `completedActions` field on UserProfile schema + migration
- [x] `markActionComplete()` helper + wire to relevant routes
- [x] `GET /profile` includes normalized `completedActions`
- [x] `GET /profile/checklist` exposes checklist progress
- [x] `OnboardingChecklist` component (mobile)
- [x] Home screen integration (show below plan, hide when complete)
- [ ] `TipBanner` component (mobile)
- [ ] Per-screen tip wiring (AsyncStorage dismiss tracking)
