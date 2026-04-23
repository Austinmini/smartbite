const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1'

export interface UsdaProduct {
  name: string
  brand: string | null
  unitSize: string | null
  nutrition: {
    calories: number | null
    protein: number | null
    carbs: number | null
    fat: number | null
  } | null
}

function getNutrient(nutrients: any[], nutrientId: number): number | null {
  const found = nutrients.find((n: any) => n.nutrientId === nutrientId || n.nutrient?.id === nutrientId)
  return found ? (found.amount ?? found.value ?? null) : null
}

export async function lookupByUpc(upc: string): Promise<UsdaProduct | null> {
  const apiKey = process.env.USDA_API_KEY
  if (!apiKey) return null

  try {
    // USDA search by gtinUpc
    const res = await fetch(
      `${USDA_BASE}/foods/search?query=${upc}&dataType=Branded&pageSize=1&api_key=${apiKey}`
    )
    if (!res.ok) return null

    const data = await res.json()
    const food = data.foods?.[0]
    if (!food || food.gtinUpc !== upc) return null

    const nutrients: any[] = food.foodNutrients ?? []

    return {
      name: food.description as string,
      brand: (food.brandOwner as string) || null,
      unitSize: food.servingSizeUnit
        ? `${food.servingSize ?? ''} ${food.servingSizeUnit}`.trim()
        : null,
      nutrition: {
        calories: getNutrient(nutrients, 1008),  // Energy (kcal)
        protein: getNutrient(nutrients, 1003),   // Protein
        carbs: getNutrient(nutrients, 1005),     // Carbohydrates
        fat: getNutrient(nutrients, 1004),       // Total lipids (fat)
      },
    }
  } catch {
    return null
  }
}
