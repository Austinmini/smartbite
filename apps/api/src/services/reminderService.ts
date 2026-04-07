import { prisma } from '../lib/prisma'
import { anthropic } from '../lib/anthropic'
import { AI_MODELS } from '../lib/aiConfig'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReminderSuggestion {
  itemName: string
  suggestedQuantity: number
  suggestedUnit: string
  suggestedFrequencyDays: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
}

// ─── getReminderSuggestions ───────────────────────────────────────────────────

const MIN_PURCHASES_FOR_AI = 3

export async function getReminderSuggestions(userId: string): Promise<ReminderSuggestion[]> {
  const history = await prisma.purchaseHistory.findMany({
    where: { userId },
    orderBy: { purchasedAt: 'desc' },
    select: { itemName: true, purchasedAt: true, quantity: true, unit: true, storeName: true },
  })

  if (history.length === 0) return []

  // Group by itemName
  const grouped = new Map<string, typeof history>()
  for (const row of history) {
    if (!grouped.has(row.itemName)) grouped.set(row.itemName, [])
    grouped.get(row.itemName)!.push(row)
  }

  // Separate items that qualify for AI vs rule-based
  const aiItems: Array<{ name: string; purchases: typeof history }> = []

  for (const [name, purchases] of grouped.entries()) {
    if (purchases.length >= MIN_PURCHASES_FOR_AI) {
      aiItems.push({ name, purchases })
    }
  }

  if (aiItems.length === 0) return []

  const itemSummaries = aiItems
    .map(({ name, purchases }) => {
      const intervals = purchases
        .slice(0, -1)
        .map((p, i) => {
          const next = purchases[i + 1]
          return Math.round(
            (p.purchasedAt.getTime() - next.purchasedAt.getTime()) / 86400000
          )
        })
        .filter((d) => d > 0)

      const avgInterval =
        intervals.length > 0
          ? Math.round(intervals.reduce((s, d) => s + d, 0) / intervals.length)
          : 7

      const latest = purchases[0]
      return `- "${name}": ${purchases.length} purchases, avg every ${avgInterval} days, last qty ${latest.quantity} ${latest.unit} at ${latest.storeName}`
    })
    .join('\n')

  const prompt = `You are a smart grocery assistant analyzing a user's purchase history.

Purchase history (items bought >= 3 times):
${itemSummaries}

For each item listed, suggest a restock reminder. Return ONLY a valid JSON array:
[
  {
    "itemName": string,
    "suggestedQuantity": number,
    "suggestedUnit": string,
    "suggestedFrequencyDays": number,
    "confidence": "high" | "medium" | "low",
    "reasoning": string (1-2 sentences)
  }
]`

  try {
    const response = await anthropic.messages.create({
      model: AI_MODELS.REMINDERS,
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const firstBracket = clean.indexOf('[')
    const lastBracket = clean.lastIndexOf(']')
    const jsonStr =
      firstBracket >= 0 && lastBracket > firstBracket
        ? clean.slice(firstBracket, lastBracket + 1)
        : clean

    return JSON.parse(jsonStr) as ReminderSuggestion[]
  } catch {
    return []
  }
}
