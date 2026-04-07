---
name: Barcode product lookup — multi-source pipeline + client cache
description: Enhanced product lookup using OFF + USDA in parallel, with local AsyncStorage cache for instant repeat scans.
type: project
---

## Current state
- `GET /products/lookup/:upc` calls Open Food Facts, caches result in Item/Product table
- Hard 404 on miss — bad for HEB store brands and regional TX products

## Target architecture

### Server: parallel multi-source lookup (no hard 404)
```
Priority: Item table (cache) → OFF + USDA in parallel → merge → cache → return partial data on miss
```

Sources:
- **Open Food Facts** (free, no key, 3M+ products): name, brand, image, unit size, ingredients
- **USDA FoodData Central** (free, API key required, 3600 req/hr): name, brand, nutrition, GTIN/UPC coverage

Merge strategy: OFF wins on image + brand; USDA wins on nutrition + category.
Return partial data even if only one source matches — never 404 a valid UPC.

New fields to add to Item/Product table:
- `nutrition: Json?` — { calories, protein, carbs, fat } from USDA
- `ingredients: String?` — ingredients list from OFF
- `category: String?` — derived from OFF category or USDA food group

### Client: AsyncStorage product cache
```typescript
// stores/productCacheStore.ts — Zustand persisted to AsyncStorage

interface CachedProduct {
  upc: string
  name: string
  brand: string | null
  imageUrl: string | null
  unitSize: string | null
  cachedAt: number  // unix ms — entries expire after 30 days
}

// Key: 'product_cache' → Record<upc, CachedProduct>
// Max 500 entries — LRU eviction (drop oldest on overflow)
```

Lookup flow in scanner/confirm.tsx:
1. Check AsyncStorage cache (instant, works offline) → hit: show immediately
2. GET /products/lookup/:upc → hit: show + write to cache
3. Miss: show "New product — your scan helps!" + manual name entry

## Environment variables needed
```bash
USDA_API_KEY=your-free-key  # get at https://fdc.nal.usda.gov/api-guide.html
```

## Files to create/update
- `src/lib/usda.ts` — new USDA FoodData Central client
- `src/routes/products.ts` — parallel fan-out, merge, never-404 strategy
- `src/lib/openFoodFacts.ts` — add `ingredients` and `category` fields
- `apps/mobile/stores/productCacheStore.ts` — new Zustand+AsyncStorage cache
- `apps/mobile/app/scanner/confirm.tsx` — check cache before API call

## Implementation status
- [ ] `src/lib/usda.ts` USDA client
- [ ] Updated `products.ts` with parallel lookup + merge
- [ ] `productCacheStore.ts` with 30-day TTL + 500-item LRU
- [ ] `scanner/confirm.tsx` updated to check cache first
- [ ] USDA_API_KEY added to .env.example
