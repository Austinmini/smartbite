const OFF_BASE = 'https://world.openfoodfacts.org/api/v3'

export interface OpenFoodFactsProduct {
  name: string
  brand: string | null
  imageUrl: string | null
  unitSize: string | null
}

export async function lookupByUpc(upc: string): Promise<OpenFoodFactsProduct | null> {
  try {
    const res = await fetch(
      `${OFF_BASE}/product/${upc}?fields=product_name,brands,image_url,quantity`
    )
    if (!res.ok) return null

    const data = await res.json()
    if (data.status !== 'success' || !data.product?.product_name) return null

    return {
      name: data.product.product_name as string,
      brand: (data.product.brands as string) || null,
      imageUrl: (data.product.image_url as string) || null,
      unitSize: (data.product.quantity as string) || null,
    }
  } catch {
    return null
  }
}
