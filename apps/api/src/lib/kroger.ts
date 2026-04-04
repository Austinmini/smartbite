let tokenCache: { accessToken: string; expiresAt: number } | null = null

export interface KrogerPriceRequest {
  ingredient: { name: string; amount: number; unit: string }
  store: { storeId: string; storeName: string; chain: string }
}

export interface KrogerPriceResult {
  price: number
  unit: string
  available: boolean
  source: 'api'
}

async function getKrogerAccessToken(): Promise<string | null> {
  const clientId = process.env.KROGER_CLIENT_ID
  const clientSecret = process.env.KROGER_CLIENT_SECRET

  if (!clientId || !clientSecret) return null
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.accessToken

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://api.kroger.com/v1/connect/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=product.compact',
  })

  if (!res.ok) return null

  const data = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!data.access_token) return null

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 1800) * 1000,
  }

  return tokenCache.accessToken
}

export async function queryKrogerProduct(
  params: KrogerPriceRequest
): Promise<KrogerPriceResult | null> {
  const accessToken = await getKrogerAccessToken()
  if (!accessToken) return null

  const res = await fetch(
    `https://api.kroger.com/v1/products?filter.term=${encodeURIComponent(
      params.ingredient.name
    )}&filter.locationId=${encodeURIComponent(params.store.storeId)}&filter.limit=1`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!res.ok) return null

  const data = (await res.json()) as { data?: Array<Record<string, any>> }
  const item = data.data?.[0]
  const regular = item?.items?.[0]?.price?.regular
  const promo = item?.items?.[0]?.price?.promo
  const price = typeof promo === 'number' ? promo : regular

  if (typeof price !== 'number') return null

  return {
    price: Math.round(price * 100) / 100,
    unit: params.ingredient.unit,
    available: true,
    source: 'api',
  }
}
