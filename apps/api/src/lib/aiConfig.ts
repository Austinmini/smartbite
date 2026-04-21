// Single source of truth for all AI model selection.
// Override any model via environment variable — no code changes needed.

export const AI_MODELS = {
  // Sonnet for full 7-day plan generation — complexity and quality justify the cost
  MEAL_PLAN:      process.env.AI_MODEL_MEAL_PLAN      ?? 'claude-sonnet-4-6',

  // Haiku for scoped generation tasks — structured JSON, single-day or single-meal scope
  MEAL_PLAN_DAY:  process.env.AI_MODEL_MEAL_PLAN_DAY  ?? 'claude-haiku-4-5-20251001',
  MEAL_REGEN:     process.env.AI_MODEL_MEAL_REGEN     ?? 'claude-haiku-4-5-20251001',

  // Haiku for lightweight, structured tasks (~88% cheaper than Sonnet)
  PRICE_SUGGEST:  process.env.AI_MODEL_PRICE_SUGGEST  ?? 'claude-haiku-4-5-20251001',
  REMINDERS:      process.env.AI_MODEL_REMINDERS      ?? 'claude-haiku-4-5-20251001',
} as const

export type AiModelKey = keyof typeof AI_MODELS
