import { prisma } from '../lib/prisma'
import { anthropic } from '../lib/anthropic'
import { AI_MODELS } from '../lib/aiConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PriceBucket {
  week: string      // ISO week label e.g. "2026-W10"
  avgPrice: number
  observationCount: number
}

export interface PriceSuggestion {
  action: 'buy' | 'hold' | 'substitute'
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
}

export interface ShoppingListItemWithTrend {
  name: string
  amount: number
  unit: string
  storeId?: string
  trendDirection: 'up' | 'down' | 'stable' | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getIsoWeek(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 4 - (d.getDay() || 7))
  const yearStart = new Date(d.getFullYear(), 0, 1)
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

// ─── getPriceTrend ────────────────────────────────────────────────────────────

export async function getPriceTrend({
  ingredient,
  storeId,
  days = 30,
}: {
  ingredient: string
  storeId: string
  days?: number
}): Promise<PriceBucket[]> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  const observations = await prisma.priceObservation.findMany({
    where: {
      productName: { equals: ingredient, mode: 'insensitive' },
      storeId,
      scannedAt: { gte: cutoff },
    },
    orderBy: { scannedAt: 'asc' },
  })

  if (observations.length === 0) return []

  // Group into weekly buckets
  const bucketMap = new Map<string, number[]>()
  for (const obs of observations) {
    const week = getIsoWeek(obs.scannedAt)
    if (!bucketMap.has(week)) bucketMap.set(week, [])
    bucketMap.get(week)!.push(obs.price)
  }

  return Array.from(bucketMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, prices]) => ({
      week,
      avgPrice: Math.round((prices.reduce((s, p) => s + p, 0) / prices.length) * 100) / 100,
      observationCount: prices.length,
    }))
}

// ─── getTrendDirection ────────────────────────────────────────────────────────

export function getTrendDirection(
  buckets: PriceBucket[]
): 'up' | 'down' | 'stable' | null {
  if (buckets.length < 2) return null

  const prev = buckets[buckets.length - 2].avgPrice
  const curr = buckets[buckets.length - 1].avgPrice
  const changePct = (curr - prev) / prev

  if (changePct > 0.05) return 'up'
  if (changePct < -0.05) return 'down'
  return 'stable'
}

// ─── getAiPriceSuggestion ─────────────────────────────────────────────────────

export async function getAiPriceSuggestion({
  ingredient,
  storeId,
  trendData,
}: {
  ingredient: string
  storeId: string
  trendData: PriceBucket[]
}): Promise<PriceSuggestion> {
  if (trendData.length < 2) {
    return {
      action: 'hold',
      reasoning: 'insufficient data to generate a suggestion — need at least 2 weeks of prices.',
      confidence: 'low',
    }
  }

  const prompt = `You are a grocery pricing analyst helping a shopper decide when to buy.

Ingredient: "${ingredient}" at store "${storeId}"

Weekly price trend (oldest → newest):
${trendData.map((b) => `${b.week}: $${b.avgPrice} (${b.observationCount} observations)`).join('\n')}

Based on this data, respond ONLY with a valid JSON object:
{
  "action": "buy" | "hold" | "substitute",
  "reasoning": string (1-2 sentences, reference the actual price change),
  "confidence": "high" | "medium" | "low"
}`

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.PRICE_SUGGEST,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean) as PriceSuggestion

    if (!['buy', 'hold', 'substitute'].includes(parsed.action)) {
      throw new Error('Invalid action')
    }
    return parsed
  } catch {
    const direction = getTrendDirection(trendData)
    return {
      action: direction === 'up' ? 'buy' : 'hold',
      reasoning: `Price is ${direction ?? 'changing'} — monitor over the next week before deciding.`,
      confidence: 'low',
    }
  }
}

// ─── enrichShoppingListWithTrends ─────────────────────────────────────────────

export async function enrichShoppingListWithTrends(
  items: Array<{ name: string; amount: number; unit: string; storeId?: string }>
): Promise<ShoppingListItemWithTrend[]> {
  return Promise.all(
    items.map(async (item) => {
      const storeId = item.storeId ?? ''
      const buckets = await getPriceTrend({ ingredient: item.name, storeId, days: 30 })
      return {
        ...item,
        trendDirection: getTrendDirection(buckets),
      }
    })
  )
}
