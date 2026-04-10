// RevenueCat initialization and subscription sync
// Called once on app launch from _layout.tsx

import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { apiClient } from './apiClient'

// RevenueCat requires a native development build — it does not work in Expo Go.
function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo'
}

export type Tier = 'FREE' | 'PLUS' | 'PRO'

export interface SubscriptionStatus {
  tier: Tier
  isTrial: boolean
  trialEndsAt: string | null
  daysRemaining: number | null
  renewalDate: string | null
  limits: Record<string, unknown>
}

// Identify the current user with RevenueCat
export async function identifyRevenueCatUser(userId: string): Promise<void> {
  if (isExpoGo()) return
  try {
    const Purchases = (await import('react-native-purchases')).default
    await Purchases.logIn(userId)
  } catch (err) {
    console.warn('[revenueCat] identifyUser failed:', err)
  }
}

// Configure RevenueCat SDK — call once on app start (before user identification)
export async function configureRevenueCat(): Promise<void> {
  if (isExpoGo()) {
    console.log('[revenueCat] Skipping — not supported in Expo Go. Use a development build.')
    return
  }
  try {
    const Purchases = (await import('react-native-purchases')).default
    const LOG_LEVEL = (await import('react-native-purchases')).LOG_LEVEL

    const apiKey =
      Platform.OS === 'ios'
        ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? ''
        : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? ''

    if (!apiKey) {
      console.warn('[revenueCat] No API key configured')
      return
    }

    Purchases.setLogLevel(LOG_LEVEL.ERROR)
    await Purchases.configure({ apiKey })
  } catch (err) {
    console.warn('[revenueCat] configure failed:', err)
  }
}

// Get current entitlements and sync tier to API
export async function syncSubscription(token?: string): Promise<Tier> {
  if (isExpoGo()) return 'FREE'
  try {
    const Purchases = (await import('react-native-purchases')).default
    const customerInfo = await Purchases.getCustomerInfo()

    const hasPlus = customerInfo.entitlements.active['plus'] !== undefined
    const hasPro = customerInfo.entitlements.active['pro'] !== undefined
    const proEntitlement = customerInfo.entitlements.active['pro']
    const isTrialPeriod = proEntitlement?.periodType === 'TRIAL'

    const tier: Tier = hasPro ? 'PRO' : hasPlus ? 'PLUS' : 'FREE'

    // Sync to API (heals any DB drift without requiring webhook)
    await apiClient.post('/subscription/sync', { tier, isTrialPeriod }, token)

    return tier
  } catch (err) {
    console.warn('[revenueCat] syncSubscription failed:', err)
    return 'FREE'
  }
}

// Fetch subscription status from API (includes trial info)
export async function fetchSubscriptionStatus(token?: string): Promise<SubscriptionStatus | null> {
  try {
    return await apiClient.get<SubscriptionStatus>('/subscription/status', token)
  } catch {
    return null
  }
}

// Purchase a product — returns true on success
export async function purchaseProduct(productId: string): Promise<boolean> {
  if (isExpoGo()) {
    console.log('[revenueCat] Purchase not available in Expo Go — use a development build.')
    return false
  }
  try {
    const Purchases = (await import('react-native-purchases')).default
    const offerings = await Purchases.getOfferings()
    const pkg = offerings.current?.availablePackages.find(p => p.product.identifier === productId)
    if (!pkg) {
      console.warn('[revenueCat] Product not found:', productId)
      return false
    }
    await Purchases.purchasePackage(pkg)
    return true
  } catch (err: any) {
    if (err?.userCancelled) return false
    console.warn('[revenueCat] purchase failed:', err)
    return false
  }
}

// Restore purchases — call from "Restore purchases" button
export async function restorePurchases(): Promise<Tier> {
  if (isExpoGo()) return 'FREE'
  try {
    const Purchases = (await import('react-native-purchases')).default
    const customerInfo = await Purchases.restorePurchases()
    const hasPlus = customerInfo.entitlements.active['plus'] !== undefined
    const hasPro = customerInfo.entitlements.active['pro'] !== undefined
    return hasPro ? 'PRO' : hasPlus ? 'PLUS' : 'FREE'
  } catch (err) {
    console.warn('[revenueCat] restorePurchases failed:', err)
    return 'FREE'
  }
}
