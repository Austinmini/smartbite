// Single source of truth for all AI model selection.
// Override any model via environment variable — no code changes needed.

export const AI_MODELS = {
  // Haiku for structured generation tasks with lower cost
  MEAL_PLAN:       process.env.AI_MODEL_MEAL_PLAN       ?? 'claude-haiku-4-5-20251001',
  RECIPE_GENERATE: process.env.AI_MODEL_RECIPE_GENERATE ?? 'claude-sonnet-4-6',

  // Haiku for lightweight, structured tasks (~88% cheaper than Sonnet)
  PRICE_SUGGEST:   process.env.AI_MODEL_PRICE_SUGGEST   ?? 'claude-haiku-4-5-20251001',
  REMINDERS:       process.env.AI_MODEL_REMINDERS       ?? 'claude-haiku-4-5-20251001',
} as const

export type AiModelKey = keyof typeof AI_MODELS
