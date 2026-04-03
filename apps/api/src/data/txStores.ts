export const V1_SUPPORTED_CHAINS = [
  'heb',
  'centralmarket',
  'wholefoods',
  'walmart',
  'kroger',
  'aldi',
] as const

export type SupportedChain = (typeof V1_SUPPORTED_CHAINS)[number]

export const TX_STORE_SEED = [
  { name: 'HEB', chain: 'heb', tier: 'everyday', logo: { bg: '#E8F5E9', text: 'H', color: '#2E7D32' } },
  { name: 'Central Market', chain: 'centralmarket', tier: 'premium', logo: { bg: '#F3E5F5', text: 'CM', color: '#6A1B9A' }, note: 'HEB-owned' },
  { name: 'Whole Foods', chain: 'wholefoods', tier: 'premium', logo: { bg: '#EAF7EA', text: 'WF', color: '#1A6B1A' }, note: 'Amazon-owned' },
  { name: 'Walmart Supercenter', chain: 'walmart', tier: 'budget', logo: { bg: '#E3F2FD', text: 'W', color: '#1565C0' } },
  { name: 'Kroger', chain: 'kroger', tier: 'everyday', logo: { bg: '#E8F5E9', text: 'K', color: '#2E7D32' } },
  { name: 'Aldi', chain: 'aldi', tier: 'budget', logo: { bg: '#FFF8E1', text: 'A', color: '#F57F17' } },
]

export interface MealMeStore {
  id: string
  name: string
  chain?: string
  distanceMiles: number
  address: string
  lat: number
  lng: number
}

export function filterToV1Stores(stores: MealMeStore[]): MealMeStore[] {
  return stores.filter((s) =>
    V1_SUPPORTED_CHAINS.some(
      (chain) =>
        s.name.toLowerCase().includes(chain) || s.chain?.toLowerCase() === chain
    )
  )
}
