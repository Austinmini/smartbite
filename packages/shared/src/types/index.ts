// Shared TypeScript types used by both apps/api and apps/mobile

export type Tier = 'FREE' | 'PLUS' | 'PRO'

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'

export type SupportedChain =
  | 'heb'
  | 'centralmarket'
  | 'wholefoods'
  | 'walmart'
  | 'kroger'
  | 'aldi'

export interface UserLocation {
  zip: string
  lat: number
  lng: number
  city: string
}

export interface Ingredient {
  name: string
  amount: number
  unit: string
}

export interface RecipeStep {
  step: number
  text: string
}

export interface NutritionInfo {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface IngredientPrice {
  ingredient: string
  price: number
  unit: string
  available: boolean
}

export type PriceConfidence = 'high' | 'medium' | 'low'
export type PriceSource = 'canonical' | 'api' | 'estimate'

export interface PriceDisplay {
  amount: number
  confidence: PriceConfidence
  source: PriceSource
  capturedAt: Date
}

export interface StoreResult {
  storeName: string
  storeId: string
  totalCost: number
  distanceMiles: number
  items: IngredientPrice[]
}

export interface ScanResult {
  bestSingleStore: StoreResult
  bestSplitOption: {
    totalCost: number
    savings: number
    worthSplitting: boolean
    stores: (StoreResult & { subtotal: number })[]
  } | null
}
