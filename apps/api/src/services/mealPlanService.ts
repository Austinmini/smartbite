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

export async function generateMealPlan(input: GeneratePlanInput): Promise<GeneratedPlan> {
  const { profile, weekBudget, favourites, tier } = input

  const favouritesContext =
    favourites && favourites.length > 0
      ? `The user's most-cooked favourites are: ${favourites
          .slice(0, 5)
          .map((f) => `${f.title} (cooked ${f.timesCooked}x, rated ${f.userRating}/5)`)
          .join(', ')}. Use these as a guide for their taste preferences.`
      : ''

  const prompt = `You are a nutritionist and meal planning assistant.

Generate a weekly meal plan with exactly ${PLAN_DAY_COUNT} days for a user with these requirements:
- Weekly food budget: $${weekBudget}
- Dietary goals: ${profile.dietaryGoals.join(', ') || 'balanced'}
- Allergies / restrictions: ${profile.allergies.join(', ') || 'none'}
- Preferred cuisines: ${profile.cuisinePrefs.join(', ') || 'any'}
- Max cooking time per meal: ${profile.cookingTimeMax} minutes
- Servings per meal: ${profile.servings}
${favouritesContext}

Plan requirements:
- Return exactly 7 days with dayOfWeek values 0, 1, 2, 3, 4, 5, 6
- For each day include exactly these meals in order: BREAKFAST, LUNCH, DINNER
- Do not include any meal types beyond BREAKFAST, LUNCH, DINNER

Be concise to keep JSON compact: ingredient lists should be 4-6 items and instructions should be 2-4 steps per meal.

Respond ONLY with a valid JSON object in this exact shape:
{
  "totalEstCost": number,
  "days": [
    {
      "dayOfWeek": 0,
      "meals": [
        {
          "mealType": "BREAKFAST" | "LUNCH" | "DINNER",
          "title": string,
          "estCostPerServing": number,
          "readyInMinutes": number,
          "tags": string[],
          "ingredients": [{ "name": string, "amount": number, "unit": string }],
          "instructions": [{ "step": number, "text": string }],
          "nutrition": { "calories": number, "protein": number, "carbs": number, "fat": number }
        }
      ]
    }
  ]
}`

  const maxTokens = tier === 'FREE' ? 7000 : 12000

  const response = await anthropic.messages.create({
    model: AI_MODELS.MEAL_PLAN,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return parseJsonResponse<GeneratedPlan>(text)
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
    model: AI_MODELS.MEAL_PLAN,
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
