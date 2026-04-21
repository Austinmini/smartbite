import { anthropic } from '../lib/anthropic'
import { prisma } from '../lib/prisma'
import { AI_MODELS } from '../lib/aiConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GeneratePlanInput {
  profile: {
    weeklyBudget: number
    dietaryGoals: string[]
    allergies: string[]
    cuisinePrefs: string[]
    cookingTimeMax: number
    servings: number
  }
  weekBudget: number
  tier?: 'FREE' | 'PLUS' | 'PRO'
  favourites?: Array<{ title: string; timesCooked: number; userRating: number | null }>
  dayCount?: number
}

export interface GeneratedMeal {
  mealType: string
  title: string
  estCostPerServing: number
  readyInMinutes: number
  tags: string[]
  ingredients: Array<{ name: string; amount: number; unit: string }>
  instructions: Array<{ step: number; text: string }>
  nutrition: { calories: number; protein: number; carbs: number; fat: number }

  // Flavor & Experience
  flavorProfile?: string
  cuisineOrigin?: string
  difficulty?: 'easy' | 'medium' | 'challenging'
  dishType?: string

  // Cooking Guidance
  cookingTips?: string[]
  techniques?: string[]
  equipmentNeeded?: string[]
  prepTime?: number

  // Practical Help
  canMakeAhead?: string
  storageInfo?: string
  substitutions?: Array<{
    ingredient: string
    substitutes: string[]
  }>

  // Health Context
  nutritionContext?: string
  healthBenefits?: string[]
  allergenWarnings?: string[]

  // Pairings
  mealPairings?: {
    side?: string[]
    beverage?: string[]
    appetizer?: string
  }

  // Context
  yieldDescription?: string
}

export interface GeneratedDay {
  dayOfWeek: number
  meals: GeneratedMeal[]
}

export interface GeneratedPlan {
  totalEstCost: number
  days: GeneratedDay[]
}

// ─── Generate ─────────────────────────────────────────────────────────────────

const PLAN_DAY_COUNT = 7
const PLAN_MEAL_TYPES = ['BREAKFAST', 'LUNCH', 'DINNER'] as const

function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100
}

function getMealEstimatedCost(estCostPerServing: number, servings: number): number {
  return roundCurrency(estCostPerServing * servings)
}

function getPlanEstimatedCost(planData: GeneratedPlan, servings: number): number {
  const total = planData.days.reduce(
    (sum, day) =>
      sum +
      day.meals.reduce(
        (daySum, meal) => daySum + getMealEstimatedCost(meal.estCostPerServing, servings),
        0
      ),
    0
  )

  return roundCurrency(total)
}

function parseJsonResponse<T>(rawText: string): T {
  const withoutFences = rawText.replace(/```json|```/g, '').trim()
  const firstBrace = withoutFences.indexOf('{')
  const lastBrace = withoutFences.lastIndexOf('}')
  const jsonCandidate =
    firstBrace >= 0 && lastBrace >= firstBrace
      ? withoutFences.slice(firstBrace, lastBrace + 1)
      : withoutFences

  try {
    return JSON.parse(jsonCandidate) as T
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown JSON parse error'
    throw new Error(`Claude returned invalid JSON: ${detail}`)
  }
}

function normalizeGeneratedMeal(
  meal: Partial<GeneratedMeal> | undefined,
  mealType: typeof PLAN_MEAL_TYPES[number],
  profile: GeneratePlanInput['profile'],
  dayOfWeek: number
): GeneratedMeal {
  const title = typeof meal?.title === 'string' && meal.title.trim().length > 0
    ? meal.title
    : `${mealType.toLowerCase()} plan for day ${dayOfWeek + 1}`

  const estCostPerServing = typeof meal?.estCostPerServing === 'number' && meal.estCostPerServing > 0
    ? meal.estCostPerServing
    : Math.max(1.5, roundCurrency((profile.weeklyBudget / 21) * (mealType === 'DINNER' ? 1.25 : 0.9)))

  const readyInMinutes = typeof meal?.readyInMinutes === 'number' && meal.readyInMinutes > 0
    ? Math.min(Math.max(Math.round(meal.readyInMinutes), 5), profile.cookingTimeMax)
    : Math.min(profile.cookingTimeMax, mealType === 'DINNER' ? 35 : 20)

  const ingredients = Array.isArray(meal?.ingredients) && meal.ingredients.length > 0
    ? meal.ingredients
    : [
        { name: 'olive oil', amount: 1, unit: 'tbsp' },
        { name: 'garlic', amount: 1, unit: 'clove' },
        { name: 'seasonal vegetables', amount: 2, unit: 'cup' },
      ]

  const instructions = Array.isArray(meal?.instructions) && meal.instructions.length > 0
    ? meal.instructions
    : [
        { step: 1, text: 'Prep ingredients and season to taste.' },
        { step: 2, text: 'Cook until tender and serve warm.' },
      ]

  return {
    mealType,
    title,
    estCostPerServing,
    readyInMinutes,
    tags: Array.isArray(meal?.tags) ? meal.tags : [],
    ingredients,
    instructions,
    nutrition: meal?.nutrition && typeof meal.nutrition === 'object'
      ? meal.nutrition
      : { calories: 450, protein: 25, carbs: 40, fat: 18 },
    // Enrichment fields (optional)
    flavorProfile: typeof meal?.flavorProfile === 'string' ? meal.flavorProfile : undefined,
    cuisineOrigin: typeof meal?.cuisineOrigin === 'string' ? meal.cuisineOrigin : undefined,
    difficulty: ['easy', 'medium', 'challenging'].includes(meal?.difficulty ?? '')
      ? (meal?.difficulty as 'easy' | 'medium' | 'challenging')
      : undefined,
    dishType: typeof meal?.dishType === 'string' ? meal.dishType : undefined,
    cookingTips: Array.isArray(meal?.cookingTips) ? meal.cookingTips : undefined,
    techniques: Array.isArray(meal?.techniques) ? meal.techniques : undefined,
    equipmentNeeded: Array.isArray(meal?.equipmentNeeded) ? meal.equipmentNeeded : undefined,
    prepTime: typeof meal?.prepTime === 'number' ? meal.prepTime : undefined,
    canMakeAhead: typeof meal?.canMakeAhead === 'string' ? meal.canMakeAhead : undefined,
    storageInfo: typeof meal?.storageInfo === 'string' ? meal.storageInfo : undefined,
    substitutions: Array.isArray(meal?.substitutions) ? meal.substitutions : undefined,
    nutritionContext: typeof meal?.nutritionContext === 'string' ? meal.nutritionContext : undefined,
    healthBenefits: Array.isArray(meal?.healthBenefits) ? meal.healthBenefits : undefined,
    allergenWarnings: Array.isArray(meal?.allergenWarnings) ? meal.allergenWarnings : undefined,
    mealPairings: meal?.mealPairings && typeof meal.mealPairings === 'object'
      ? meal.mealPairings
      : undefined,
    yieldDescription: typeof meal?.yieldDescription === 'string' ? meal.yieldDescription : undefined,
  }
}

function normalizeGeneratedPlan(
  plan: GeneratedPlan,
  profile: GeneratePlanInput['profile'],
  dayCount: number = 7
): GeneratedPlan {
  const dayMap = new Map<number, GeneratedDay>()
  for (const day of plan.days ?? []) {
    if (typeof day?.dayOfWeek !== 'number') continue
    if (day.dayOfWeek < 0 || day.dayOfWeek > 6) continue
    if (!dayMap.has(day.dayOfWeek)) dayMap.set(day.dayOfWeek, day)
  }

  const globalMeals = (plan.days ?? []).flatMap((day) => day?.meals ?? [])
  const globalByType = new Map<string, GeneratedMeal>()
  for (const meal of globalMeals) {
    if (meal && typeof meal.mealType === 'string' && !globalByType.has(meal.mealType)) {
      globalByType.set(meal.mealType, meal as GeneratedMeal)
    }
  }

  const normalizedDays: GeneratedDay[] = []

  for (let dayOfWeek = 0; dayOfWeek < dayCount; dayOfWeek++) {
    const sourceDay = dayMap.get(dayOfWeek)
    const sourceMeals = sourceDay?.meals ?? []

    const dayByType = new Map<string, GeneratedMeal>()
    for (const meal of sourceMeals) {
      if (meal && typeof meal.mealType === 'string' && !dayByType.has(meal.mealType)) {
        dayByType.set(meal.mealType, meal as GeneratedMeal)
      }
    }

    const meals = PLAN_MEAL_TYPES.map((mealType, index) => {
      const chosen =
        dayByType.get(mealType) ??
        globalByType.get(mealType) ??
        (sourceMeals[index] as GeneratedMeal | undefined)
      return normalizeGeneratedMeal(chosen, mealType, profile, dayOfWeek)
    })

    normalizedDays.push({ dayOfWeek, meals })
  }

  const totalEstCost = getPlanEstimatedCost({ totalEstCost: 0, days: normalizedDays }, profile.servings)
  return { totalEstCost, days: normalizedDays }
}

export async function generateMealPlan(input: GeneratePlanInput): Promise<GeneratedPlan> {
  const { profile, weekBudget, favourites, tier, dayCount = 3 } = input

  const favouritesContext =
    favourites && favourites.length > 0
      ? `The user's most-cooked favourites are: ${favourites
          .slice(0, 5)
          .map((f) => `${f.title} (cooked ${f.timesCooked}x, rated ${f.userRating}/5)`)
          .join(', ')}. Use these as a guide for their taste preferences.`
      : ''

  const prompt = `You are an expert culinary instructor creating personalized meal plans.

CONTEXT:
- Weekly food budget: $${weekBudget}
- Dietary goals: ${profile.dietaryGoals.join(', ') || 'balanced'}
- Allergies/restrictions: ${profile.allergies.join(', ') || 'none'}
- Preferred cuisines: ${profile.cuisinePrefs.join(', ') || 'any'}
- Max cooking time: ${profile.cookingTimeMax} min per meal
- Servings: ${profile.servings}
${favouritesContext}

TASK:
Generate a ${dayCount}-day meal plan (${dayCount * 3} recipes - BREAKFAST, LUNCH, DINNER each day).
Keep recipes simple and output compact.

For EACH recipe include ONLY:
- mealType: "BREAKFAST" | "LUNCH" | "DINNER"
- title: short appetizing name
- difficulty: "easy" | "medium" | "challenging"
- estCostPerServing: number
- readyInMinutes: number
- tags: 2 tags max
- ingredients: 4-5 items [{ name, amount, unit }]
- instructions: exactly 3 steps [{ step, text }] — one sentence each
- nutrition: { calories, protein, carbs, fat }

Return exactly ${dayCount} days, dayOfWeek 0 through ${dayCount - 1}.

Respond ONLY with this JSON shape (no extra fields):
{
  "totalEstCost": number,
  "days": [
    {
      "dayOfWeek": 0,
      "meals": [
        {
          "mealType": "BREAKFAST",
          "title": string,
          "difficulty": "easy" | "medium" | "challenging",
          "estCostPerServing": number,
          "readyInMinutes": number,
          "tags": [string],
          "ingredients": [{ "name": string, "amount": number, "unit": string }],
          "instructions": [{ "step": number, "text": string }],
          "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number }
        }
      ]
    }
  ]
}`

  const maxTokens = tier === 'FREE' ? 4000 : 8000

  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => {
        reject(new Error('Claude API call timed out after 120 seconds. This may indicate rate limiting or network issues.'))
      }, 120000)
    )

    const response = await Promise.race([
      anthropic.messages.create({
        model: AI_MODELS.MEAL_PLAN,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }],
      }),
      timeoutPromise,
    ])

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = parseJsonResponse<GeneratedPlan>(text)
    const normalized = normalizeGeneratedPlan(parsed, profile, dayCount)
    return normalized
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error during meal plan generation'
    throw new Error(`Meal plan generation failed: ${msg}`)
  }
}

export async function generateDayMeals(
  planId: string,
  dayOfWeek: number,
  profile: GeneratePlanInput['profile']
) {
  // Validate inputs
  if (dayOfWeek < 0 || dayOfWeek > 6) {
    throw new Error(`Invalid dayOfWeek: ${dayOfWeek}. Must be 0-6.`)
  }

  // Check if meals already exist for this day
  const existingMeals = await prisma.meal.findMany({
    where: { mealPlanId: planId, dayOfWeek },
  })
  if (existingMeals.length > 0) {
    throw new Error(`Meals already exist for day ${dayOfWeek} in this plan.`)
  }

  // Fetch current plan to know the weekly budget context
  const existingPlan = await prisma.mealPlan.findUnique({
    where: { id: planId },
    include: { meals: true },
  })
  if (!existingPlan) {
    throw new Error(`Plan ${planId} not found.`)
  }

  const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const dayLabel = dayLabels[dayOfWeek]

  const singleDayPrompt = `You are an expert culinary instructor creating personalized meal recipes.

CONTEXT:
- Dietary goals: ${profile.dietaryGoals.join(', ') || 'balanced'}
- Allergies/restrictions: ${profile.allergies.join(', ') || 'none'}
- Preferred cuisines: ${profile.cuisinePrefs.join(', ') || 'any'}
- Max cooking time: ${profile.cookingTimeMax} min per meal
- Servings: ${profile.servings}

TASK:
Generate 3 meals for ${dayLabel} (BREAKFAST, LUNCH, DINNER in order). Each should be practical, delicious, and stay within cooking time limits.

For EACH recipe, be concise:
- title: Clear, appetizing name
- ingredients: 4-5 items with amounts and units
- instructions: exactly 3 steps (one sentence each)
- readyInMinutes: Total time (prep + cooking)
- estCostPerServing: Budget-conscious estimate
- prepTime: Minutes to prep before cooking
- equipmentNeeded: 1-2 tools max
- difficulty: "easy" | "medium" | "challenging"
- nutrition: { calories, protein (g), carbs (g), fat (g) }
- tags: 2-3 tags max
- allergenWarnings: only if relevant, otherwise []
- nutritionContext: one short sentence

Respond ONLY with valid JSON:
{
  "meals": [
    {
      "mealType": "BREAKFAST" | "LUNCH" | "DINNER",
      "title": string,
      "difficulty": "easy" | "medium" | "challenging",
      "estCostPerServing": number,
      "readyInMinutes": number,
      "prepTime": number,
      "tags": string[],
      "ingredients": [{ "name": string, "amount": number, "unit": string }],
      "instructions": [{ "step": number, "text": string }],
      "equipmentNeeded": [string],
      "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number },
      "allergenWarnings": [string],
      "nutritionContext": string
    }
  ]
}`

  let parsed
  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.MEAL_PLAN_DAY,
      max_tokens: 3000,
      messages: [{ role: 'user', content: singleDayPrompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    parsed = parseJsonResponse<{ meals: GeneratedMeal[] }>(text)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Failed to generate meals for ${dayLabel}: ${msg}`)
  }

  // Create recipes and meals for this day
  for (const meal of parsed.meals) {
    const recipe = await prisma.recipe.create({
      data: {
        title: meal.title,
        readyInMinutes: meal.readyInMinutes,
        servings: profile.servings,
        ingredients: meal.ingredients,
        instructions: meal.instructions,
        nutrition: meal.nutrition,
        tags: meal.tags,
        imageUrl: null,
        flavorProfile: meal.flavorProfile,
        cuisineOrigin: meal.cuisineOrigin,
        difficulty: meal.difficulty,
        dishType: meal.dishType,
        cookingTips: meal.cookingTips ?? [],
        techniques: meal.techniques ?? [],
        equipmentNeeded: meal.equipmentNeeded ?? [],
        prepTime: meal.prepTime,
        canMakeAhead: meal.canMakeAhead,
        storageInfo: meal.storageInfo,
        substitutions: meal.substitutions,
        nutritionContext: meal.nutritionContext,
        healthBenefits: meal.healthBenefits ?? [],
        allergenWarnings: meal.allergenWarnings ?? [],
        mealPairings: meal.mealPairings,
        yieldDescription: meal.yieldDescription,
        source: 'ai_generated' as const,
      },
    })

    await prisma.meal.create({
      data: {
        mealPlanId: planId,
        dayOfWeek,
        mealType: meal.mealType as typeof PLAN_MEAL_TYPES[number],
        estCost: meal.estCostPerServing * profile.servings,
        bestStore: 'TBD',
        recipeId: recipe.id,
      },
    })
  }

  // Recalculate plan's total cost
  const allMeals = await prisma.meal.findMany({
    where: { mealPlanId: planId },
  })
  const newTotalCost = allMeals.reduce((sum, m) => sum + m.estCost, 0)

  await prisma.mealPlan.update({
    where: { id: planId },
    data: { totalEstCost: newTotalCost },
  })

  // Return the updated plan
  const updatedPlan = await prisma.mealPlan.findUnique({
    where: { id: planId },
    include: { meals: { include: { recipe: true } } },
  })

  return updatedPlan!
}

// ─── Save ─────────────────────────────────────────────────────────────────────

function getWeekStart(): Date {
  const now = new Date()
  const day = now.getDay() // 0 = Sun, 1 = Mon
  const diff = day === 0 ? -6 : 1 - day // shift to Monday
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  monday.setHours(0, 0, 0, 0)
  return monday
}

export async function saveMealPlan(userId: string, planData: GeneratedPlan, servings: number) {
  const weekStarting = getWeekStart()
  const totalEstCost = getPlanEstimatedCost(planData, servings)

  const mealPlan = await prisma.mealPlan.create({
    data: {
      userId,
      weekStarting,
      totalEstCost,
      meals: {
        create: planData.days.flatMap((day) =>
          day.meals.map((meal) => ({
            dayOfWeek: day.dayOfWeek,
            mealType: meal.mealType as any,
            estCost: getMealEstimatedCost(meal.estCostPerServing, servings),
            bestStore: '',
            recipe: {
              create: {
                source: 'ai_generated',
                title: meal.title,
                readyInMinutes: meal.readyInMinutes,
                servings,
                ingredients: meal.ingredients,
                instructions: meal.instructions,
                nutrition: meal.nutrition,
                tags: meal.tags,
                cuisineType: [],
                diets: [],
                // Enrichment fields
                flavorProfile: meal.flavorProfile,
                cuisineOrigin: meal.cuisineOrigin,
                difficulty: meal.difficulty,
                dishType: meal.dishType,
                cookingTips: meal.cookingTips ?? [],
                techniques: meal.techniques ?? [],
                equipmentNeeded: meal.equipmentNeeded ?? [],
                prepTime: meal.prepTime,
                canMakeAhead: meal.canMakeAhead,
                storageInfo: meal.storageInfo,
                substitutions: meal.substitutions,
                nutritionContext: meal.nutritionContext,
                healthBenefits: meal.healthBenefits ?? [],
                allergenWarnings: meal.allergenWarnings ?? [],
                mealPairings: meal.mealPairings,
                yieldDescription: meal.yieldDescription,
              },
            },
          }))
        ),
      },
    },
    include: {
      meals: {
        include: { recipe: true },
      },
    },
  })

  return mealPlan
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getCurrentPlan(userId: string) {
  const weekStart = getWeekStart()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 7)

  return prisma.mealPlan.findFirst({
    where: {
      userId,
      weekStarting: { gte: weekStart, lt: weekEnd },
    },
    orderBy: { createdAt: 'desc' },
    include: { meals: { include: { recipe: true } } },
  })
}

export async function getPlans(userId: string, page = 1) {
  const pageSize = 10
  const skip = (page - 1) * pageSize

  const [plans, total] = await Promise.all([
    prisma.mealPlan.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { meals: { include: { recipe: true } } },
    }),
    prisma.mealPlan.count({ where: { userId } }),
  ])

  return { plans, total }
}

export async function getMeal(planId: string, mealId: string) {
  return prisma.meal.findFirst({
    where: { id: mealId, mealPlanId: planId },
    include: { recipe: true },
  })
}

// ─── Regenerate ───────────────────────────────────────────────────────────────

export async function regenerateMeal(
  planId: string,
  mealId: string,
  profile: GeneratePlanInput['profile']
) {
  const existing = await prisma.meal.findFirst({
    where: { id: mealId, mealPlanId: planId },
    include: { recipe: true },
  })

  if (!existing) throw new Error('Meal not found')

  const singleMealPrompt = `You are a nutritionist and meal planning assistant.

Generate exactly ONE ${existing.mealType} meal for a user with these requirements:
- Dietary goals: ${profile.dietaryGoals.join(', ') || 'balanced'}
- Allergies / restrictions: ${profile.allergies.join(', ') || 'none'}
- Max cooking time: ${profile.cookingTimeMax} minutes
- Servings: ${profile.servings}

Respond ONLY with a valid JSON object in this exact shape:
{
  "mealType": "${existing.mealType}",
  "title": string,
  "estCostPerServing": number,
  "readyInMinutes": number,
  "tags": string[],
  "ingredients": [{ "name": string, "amount": number, "unit": string }],
  "instructions": [{ "step": number, "text": string }],
  "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number }
}`

  const response = await anthropic.messages.create({
    model: AI_MODELS.MEAL_REGEN,
    max_tokens: 2000,
    messages: [{ role: 'user', content: singleMealPrompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const newMealData = parseJsonResponse<GeneratedMeal>(text)
  const normalizedMealCost = getMealEstimatedCost(newMealData.estCostPerServing, profile.servings)

  const updatedRecipe = await prisma.recipe.update({
    where: { id: existing.recipeId },
    data: {
      title: newMealData.title,
      readyInMinutes: newMealData.readyInMinutes,
      servings: profile.servings,
      ingredients: newMealData.ingredients,
      instructions: newMealData.instructions,
      nutrition: newMealData.nutrition,
      tags: newMealData.tags,
    },
  })

  const updatedMeal = await prisma.meal.update({
    where: { id: mealId },
    data: { estCost: normalizedMealCost },
    include: { recipe: true },
  })

  const siblingMeals = await prisma.meal.findMany({
    where: { mealPlanId: planId },
  })

  const totalEstCost = roundCurrency(
    siblingMeals.reduce(
      (sum, meal) => sum + (meal.id === mealId ? normalizedMealCost : meal.estCost),
      0
    )
  )

  await prisma.mealPlan.update({
    where: { id: planId },
    data: { totalEstCost },
  })

  return { meal: updatedMeal, totalEstCost }
}
