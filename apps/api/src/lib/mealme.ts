import type { MealMeStore } from '../data/txStores'

export async function queryNearbyStores(lat: number, lng: number, radiusMiles = 10): Promise<MealMeStore[]> {
  const apiKey = process.env.MEALME_API_KEY
  if (!apiKey) return []

  const res = await fetch('https://api.mealme.ai/v3/stores/search', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: { lat, lng }, radius_miles: radiusMiles, limit: 20 }),
  })

  if (!res.ok) return []

  const data = await res.json() as { stores?: MealMeStore[] }
  return (data.stores ?? []).map((s: any) => ({
    id: s.store_id ?? s.id,
    name: s.store_name ?? s.name,
    chain: s.chain?.toLowerCase(),
    distanceMiles: s.distance_miles ?? 0,
    address: s.address ?? '',
    lat: s.lat ?? lat,
    lng: s.lng ?? lng,
  }))
}

export interface MealMePriceRequest {
  ingredient: { name: string; amount: number; unit: string }
  store: { storeId: string; storeName: string; chain: string }
}

export interface MealMePriceResult {
  price: number
  unit: string
  available: boolean
  source: 'api'
}

export async function queryMealMe(
  params: MealMePriceRequest
): Promise<MealMePriceResult | null> {
  const apiKey = process.env.MEALME_API_KEY
  if (!apiKey) return null

  const res = await fetch('https://api.mealme.ai/v3/products/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: params.ingredient.name,
      store_id: params.store.storeId,
      limit: 1,
    }),
  })

  if (!res.ok) return null

  const data = (await res.json()) as { products?: Array<Record<string, any>> }
  const product = data.products?.[0]
  const price = product?.price ?? product?.sale_price ?? product?.offers?.[0]?.price

  if (typeof price !== 'number') return null

  return {
    price: Math.round(price * 100) / 100,
    unit: params.ingredient.unit,
    available: true,
    source: 'api',
  }
}
