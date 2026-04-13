import { PostHog } from 'posthog-react-native'

/**
 * Analytics event types for PostHog tracking
 * Used throughout the app to maintain consistent event names and properties
 */

export type AnalyticsEvent =
  | { name: 'user_signup'; properties: { tier: string } }
  | { name: 'user_login'; properties: { method: 'email' | 'google' } }
  | { name: 'onboarding_complete'; properties: { stores_selected: number; profile_complete: boolean } }
  | { name: 'meal_plan_generated'; properties: { tier: string; days: number; personalized: boolean } }
  | { name: 'recipe_saved'; properties: { recipe_id: string; collection?: string } }
  | { name: 'recipe_unsaved'; properties: { recipe_id: string } }
  | { name: 'recipe_marked_cooked'; properties: { recipe_id: string; servings: number } }
  | { name: 'item_scanned'; properties: { upc: string; store: string; price: number } }
  | { name: 'purchase_submitted'; properties: { ingredient_name: string; quantity: number; unit: string; store: string } }
  | { name: 'subscription_purchased'; properties: { tier: 'plus' | 'pro'; duration: string; source: string } }
  | { name: 'trial_started'; properties: { tier: string; duration_days: number } }
  | { name: 'trial_ended'; properties: { tier: string; converted: boolean } }
  | { name: 'price_trend_viewed'; properties: { ingredient: string; days: number } }
  | { name: 'price_suggestion_viewed'; properties: { ingredient: string; suggestion_type: string } }
  | { name: 'reminder_created'; properties: { item: string; frequency_days: number } }
  | { name: 'reminder_triggered'; properties: { item: string } }
  | { name: 'reward_redeemed'; properties: { bites_amount: number; reward_type: string } }
  | { name: 'referral_shared'; properties: { channel: 'clipboard' | 'share_sheet' } }
  | { name: 'feature_gate_hit'; properties: { feature: string; tier: string } }

/**
 * Track an analytics event with PostHog
 * All events are automatically tagged with the current tier and user ID
 */
export function trackEvent(event: AnalyticsEvent) {
  try {
    PostHog.capture(event.name, event.properties)
  } catch (error) {
    console.warn(`Failed to track event ${event.name}:`, error)
  }
}

/**
 * Set PostHog user properties/super properties
 * Called on login to associate events with the authenticated user
 */
export function setUserProperties(userId: string, tier: string) {
  try {
    PostHog.identify(userId)
    PostHog.setPersonProperties({ tier })
  } catch (error) {
    console.warn('Failed to set PostHog user properties:', error)
  }
}

/**
 * Clear user context when logging out
 */
export function clearUserProperties() {
  try {
    PostHog.reset()
  } catch (error) {
    console.warn('Failed to clear PostHog user properties:', error)
  }
}
