describe('AI_MODELS config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('uses default model values when env vars are not set', () => {
    delete process.env.AI_MODEL_MEAL_PLAN
    delete process.env.AI_MODEL_PRICE_SUGGEST
    delete process.env.AI_MODEL_REMINDERS
    delete process.env.AI_MODEL_RECIPE_GENERATE

    const { AI_MODELS } = require('../aiConfig')

    expect(AI_MODELS.MEAL_PLAN).toBe('claude-sonnet-4-6')
    expect(AI_MODELS.RECIPE_GENERATE).toBe('claude-sonnet-4-6')
    expect(AI_MODELS.PRICE_SUGGEST).toBe('claude-haiku-4-5-20251001')
    expect(AI_MODELS.REMINDERS).toBe('claude-haiku-4-5-20251001')
  })

  it('allows env var overrides for each model', () => {
    process.env.AI_MODEL_MEAL_PLAN = 'claude-opus-4-6'
    process.env.AI_MODEL_PRICE_SUGGEST = 'claude-sonnet-4-6'

    const { AI_MODELS } = require('../aiConfig')

    expect(AI_MODELS.MEAL_PLAN).toBe('claude-opus-4-6')
    expect(AI_MODELS.PRICE_SUGGEST).toBe('claude-sonnet-4-6')
    // unoverridden still defaults
    expect(AI_MODELS.REMINDERS).toBe('claude-haiku-4-5-20251001')
  })
})
