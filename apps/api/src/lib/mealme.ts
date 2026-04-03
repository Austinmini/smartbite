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
