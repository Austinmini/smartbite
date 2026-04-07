---
name: Swappable AI model configuration
description: Centralized, env-driven AI model config so any model can be swapped without touching service files.
type: project
---

## Goal
Change the AI model for any use case with a single env var, not a code search-and-replace. Also makes it easy to run cheaper models in dev and expensive models in prod.

## Implementation: src/lib/aiConfig.ts

```typescript
// apps/api/src/lib/aiConfig.ts
// Single source of truth for all AI model selection.
// Override any model via environment variable — no code changes needed.

export const AI_MODELS = {
  // Full Claude Sonnet for complex, creative tasks (meal planning, recipe generation)
  MEAL_PLAN:       process.env.AI_MODEL_MEAL_PLAN       ?? 'claude-sonnet-4-6',
  RECIPE_GENERATE: process.env.AI_MODEL_RECIPE_GENERATE ?? 'claude-sonnet-4-6',

  // Haiku for lightweight, structured tasks (price suggestions, reminder habits)
  // ~88% cheaper than Sonnet — validated for these use cases before switching
  PRICE_SUGGEST:   process.env.AI_MODEL_PRICE_SUGGEST   ?? 'claude-haiku-4-5-20251001',
  REMINDERS:       process.env.AI_MODEL_REMINDERS       ?? 'claude-haiku-4-5-20251001',
} as const

export type AiModelKey = keyof typeof AI_MODELS
```

All services import from this file:
```typescript
// Before:
model: 'claude-sonnet-4-6'

// After:
import { AI_MODELS } from '../lib/aiConfig'
model: AI_MODELS.MEAL_PLAN
```

## .env additions
```bash
# Optional overrides — omit to use defaults above
AI_MODEL_MEAL_PLAN=claude-sonnet-4-6
AI_MODEL_PRICE_SUGGEST=claude-haiku-4-5-20251001
AI_MODEL_REMINDERS=claude-haiku-4-5-20251001
```

## Files to update when implementing
- `src/services/mealPlanService.ts` — replace hardcoded model string
- `src/services/pricingService.ts` — for price suggestion calls (Sprint 5)
- `src/services/reminderService.ts` — for habit learning calls (Sprint 5)
- `src/routes/recipes.ts` — for AI recipe generation (future)
- `.env.example` — document the override vars

## Implementation status
- [ ] Create `src/lib/aiConfig.ts`
- [ ] Update `mealPlanService.ts` to use `AI_MODELS.MEAL_PLAN`
- [ ] Add override vars to `.env.example`
- [ ] Apply to Sprint 5 services when built
