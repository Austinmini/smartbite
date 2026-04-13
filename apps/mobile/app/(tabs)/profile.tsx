import React from 'react'
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, Share, Modal } from 'react-native'
import { useRouter } from 'expo-router'
import { apiClient } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
import { useSubscriptionStore } from '@/stores/subscriptionStore'
import { FeedbackSheet } from '@/components/FeedbackSheet'
import { ReferralCard } from '@/components/ReferralCard'
import { TrialBanner } from '@/components/TrialBanner'
import { fetchSubscriptionStatus } from '@/lib/revenueCat'

const DIETARY_GOAL_OPTIONS = [
  { key: 'high-protein', label: 'High protein' },
  { key: 'low-carb', label: 'Low carb' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'low-calorie', label: 'Low calorie' },
  { key: 'balanced', label: 'Balanced' },
  { key: 'mediterranean', label: 'Mediterranean' },
  { key: 'keto', label: 'Keto' },
]

const ALLERGY_OPTIONS = [
  { key: 'gluten', label: 'Gluten' },
  { key: 'dairy', label: 'Dairy' },
  { key: 'nuts', label: 'Nuts' },
  { key: 'eggs', label: 'Eggs' },
  { key: 'shellfish', label: 'Shellfish' },
  { key: 'soy', label: 'Soy' },
]

const CHAIN_OPTIONS = [
  { key: 'heb', label: 'HEB' },
  { key: 'centralmarket', label: 'Central Market' },
  { key: 'wholefoods', label: 'Whole Foods' },
  { key: 'walmart', label: 'Walmart' },
  { key: 'kroger', label: 'Kroger' },
  { key: 'aldi', label: 'Aldi' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function PreferenceRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <View style={styles.prefRow}>
      <View style={styles.prefInfo}>
        <Text style={styles.prefLabel}>{label}</Text>
        <Text style={styles.prefValue}>{value}</Text>
      </View>
      {onEdit && (
        <TouchableOpacity onPress={onEdit} style={styles.editBtn} accessibilityLabel={`Edit ${label}`}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

export default function ProfileScreen() {
  const router = useRouter()
  const { user, token, clearUser } = useAuthStore()
  const {
    weeklyBudget,
    preferredRetailers,
    dietaryGoals,
    allergies,
    cuisinePrefs,
    cookingTimeMax,
    servings,
    setDietaryGoals,
    setAllergies,
    setCookingTimeMax,
    setServings,
    setWeeklyBudget,
    setPreferredRetailers,
  } = useProfileStore()
  const { isTrial, daysRemaining, setStatus } = useSubscriptionStore()
  const [feedbackVisible, setFeedbackVisible] = React.useState(false)
  const [referralCode, setReferralCode] = React.useState<string | null>(null)
  const [referralStats, setReferralStats] = React.useState({ invited: 0, converted: 0, totalBitesEarned: 0 })
  const [budgetEditorVisible, setBudgetEditorVisible] = React.useState(false)
  const [storesEditorVisible, setStoresEditorVisible] = React.useState(false)
  const [dietaryEditorVisible, setDietaryEditorVisible] = React.useState(false)
  const [cookingEditorVisible, setCookingEditorVisible] = React.useState(false)
  const [savingPreferences, setSavingPreferences] = React.useState(false)
  const [draftWeeklyBudget, setDraftWeeklyBudget] = React.useState(100)
  const [draftPreferredRetailers, setDraftPreferredRetailers] = React.useState<string[]>([])
  const [draftDietaryGoals, setDraftDietaryGoals] = React.useState<string[]>([])
  const [draftAllergies, setDraftAllergies] = React.useState<string[]>([])
  const [draftCookingTimeMax, setDraftCookingTimeMax] = React.useState(60)
  const [draftServings, setDraftServings] = React.useState(2)

  React.useEffect(() => {
    if (!token) return
    let active = true

    Promise.all([
      apiClient.get<{ code: string }>('/referral/code', token),
      apiClient.get<{ invited: number; converted: number; totalBitesEarned: number }>('/referral/stats', token),
      fetchSubscriptionStatus(token),
    ])
      .then(([code, stats, subStatus]) => {
        if (!active) return
        setReferralCode(code.code)
        setReferralStats(stats)
        if (subStatus) {
          setStatus({
            isTrial: subStatus.isTrial,
            trialEndsAt: subStatus.trialEndsAt,
            daysRemaining: subStatus.daysRemaining,
            renewalDate: subStatus.renewalDate,
          })
        }
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [token])

  async function handleLogout() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiClient.post('/auth/logout', {}, token ?? undefined)
          } catch { /* ignore errors */ }
          clearUser()
        },
      },
    ])
  }

  async function handleFeedbackSubmit(payload: {
    type: 'BUG' | 'FEATURE_REQUEST' | 'PRICE_ISSUE' | 'GENERAL'
    subject?: string
    body: string
  }) {
    try {
      await apiClient.post('/feedback', payload, token ?? undefined)
      setFeedbackVisible(false)
      Alert.alert('Thanks!', "We'll review your feedback.")
    } catch (err: any) {
      Alert.alert('Could not send feedback', err.message ?? 'Please try again.')
    }
  }

  async function handleShareReferral() {
    if (!referralCode) return
    await Share.share({
      message: `Use my SavvySpoon code ${referralCode} and we both earn 150 Bites.`,
    })
  }

  function openDietaryEditor() {
    setDraftDietaryGoals(dietaryGoals)
    setDraftAllergies(allergies)
    setDietaryEditorVisible(true)
  }

  function openCookingEditor() {
    setDraftCookingTimeMax(cookingTimeMax)
    setDraftServings(servings)
    setCookingEditorVisible(true)
  }

  function openBudgetEditor() {
    setDraftWeeklyBudget(weeklyBudget)
    setBudgetEditorVisible(true)
  }

  function openStoresEditor() {
    setDraftPreferredRetailers(preferredRetailers)
    setStoresEditorVisible(true)
  }

  function toggleDraftValue(value: string, current: string[], setter: (next: string[]) => void) {
    if (current.includes(value)) {
      setter(current.filter((item) => item !== value))
      return
    }
    setter([...current, value])
  }

  async function saveDietaryPreferences() {
    if (!token) return
    setSavingPreferences(true)
    try {
      await apiClient.put('/profile', {
        dietaryGoals: draftDietaryGoals,
        allergies: draftAllergies,
      }, token)
      setDietaryGoals(draftDietaryGoals)
      setAllergies(draftAllergies)
      setDietaryEditorVisible(false)
    } catch (err: any) {
      Alert.alert('Could not save dietary preferences', err.message ?? 'Please try again.')
    } finally {
      setSavingPreferences(false)
    }
  }

  async function saveWeeklyBudget() {
    if (!token) return
    setSavingPreferences(true)
    try {
      await apiClient.put('/profile', {
        weeklyBudget: draftWeeklyBudget,
      }, token)
      setWeeklyBudget(draftWeeklyBudget)
      setBudgetEditorVisible(false)
    } catch (err: any) {
      Alert.alert('Could not save budget', err.message ?? 'Please try again.')
    } finally {
      setSavingPreferences(false)
    }
  }

  async function savePreferredStores() {
    if (!token) return
    setSavingPreferences(true)
    try {
      await apiClient.put('/profile/retailers', {
        preferredRetailers: draftPreferredRetailers,
      }, token)
      setPreferredRetailers(draftPreferredRetailers)
      setStoresEditorVisible(false)
    } catch (err: any) {
      Alert.alert('Could not save preferred stores', err.message ?? 'Please try again.')
    } finally {
      setSavingPreferences(false)
    }
  }

  async function saveCookingPreferences() {
    if (!token) return
    setSavingPreferences(true)
    try {
      await apiClient.put('/profile', {
        cookingTimeMax: draftCookingTimeMax,
        servings: draftServings,
      }, token)
      setCookingTimeMax(draftCookingTimeMax)
      setServings(draftServings)
      setCookingEditorVisible(false)
    } catch (err: any) {
      Alert.alert('Could not save cooking preferences', err.message ?? 'Please try again.')
    } finally {
      setSavingPreferences(false)
    }
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TrialBanner
          isTrial={isTrial}
          daysRemaining={daysRemaining}
          onPress={() => router.push('/paywall')}
        />
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{user?.tier ?? 'FREE'}</Text>
        </View>

        <Section title="Shopping">
          <PreferenceRow
            label="Weekly budget"
            value={`$${weeklyBudget}`}
            onEdit={openBudgetEditor}
          />
          <PreferenceRow
            label="Preferred stores"
            value={preferredRetailers.length > 0 ? preferredRetailers.join(', ') : 'None selected'}
            onEdit={openStoresEditor}
          />
        </Section>

        <Section title="Dietary">
          <PreferenceRow
            label="Goals"
            value={dietaryGoals.length > 0 ? dietaryGoals.join(', ') : 'None set'}
            onEdit={openDietaryEditor}
          />
          <PreferenceRow
            label="Allergies"
            value={allergies.length > 0 ? allergies.join(', ') : 'None'}
            onEdit={openDietaryEditor}
          />
          {cuisinePrefs.length > 0 && (
            <PreferenceRow label="Cuisines" value={cuisinePrefs.join(', ')} />
          )}
          <PreferenceRow label="Max cook time" value={`${cookingTimeMax} min`} onEdit={openCookingEditor} />
          <PreferenceRow label="Servings" value={String(servings)} onEdit={openCookingEditor} />
        </Section>

        <Section title="Account">
          <PreferenceRow
            label="Subscription"
            value={isTrial ? `Pro Trial · ${daysRemaining ?? 0} days left` : (user?.tier ?? 'Free')}
            onEdit={() => router.push('/paywall')}
          />
          <PreferenceRow
            label="Bites & Rewards"
            value="Balance, badges, leaderboard"
            onEdit={() => router.push('/(tabs)/rewards')}
          />
          <PreferenceRow
            label="Reminders"
            value="Restock reminders for staples"
            onEdit={() => router.push('/(tabs)/reminders')}
          />
        </Section>

        {referralCode ? (
          <Section title="Referral">
            <ReferralCard
              code={referralCode}
              invited={referralStats.invited}
              converted={referralStats.converted}
              onShare={handleShareReferral}
            />
            <Text style={styles.referralNote}>
              {referralStats.totalBitesEarned} total Bites earned from referrals.
            </Text>
          </Section>
        ) : null}

        <TouchableOpacity style={styles.feedbackBtn} onPress={() => setFeedbackVisible(true)}>
          <Text style={styles.feedbackText}>Send feedback</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>

        <FeedbackSheet
          visible={feedbackVisible}
          onClose={() => setFeedbackVisible(false)}
          onSubmit={handleFeedbackSubmit}
        />
      </ScrollView>

      <Modal visible={dietaryEditorVisible} animationType="slide" onRequestClose={() => setDietaryEditorVisible(false)}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalScrollContent}>
          <Text style={styles.modalTitle}>Edit dietary preferences</Text>
          <Text style={styles.modalLabel}>Goals</Text>
          <View style={styles.chipGrid}>
            {DIETARY_GOAL_OPTIONS.map((option) => {
              const selected = draftDietaryGoals.includes(option.key)
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => toggleDraftValue(option.key, draftDietaryGoals, setDraftDietaryGoals)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <Text style={styles.modalLabel}>Allergies</Text>
          <View style={styles.chipGrid}>
            {ALLERGY_OPTIONS.map((option) => {
              const selected = draftAllergies.includes(option.key)
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.chip, selected && styles.chipActive]}
                  onPress={() => toggleDraftValue(option.key, draftAllergies, setDraftAllergies)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive]}>{option.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setDietaryEditorVisible(false)}
              disabled={savingPreferences}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={saveDietaryPreferences} disabled={savingPreferences}>
              <Text style={styles.modalSaveText}>{savingPreferences ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={budgetEditorVisible} animationType="slide" onRequestClose={() => setBudgetEditorVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Edit weekly budget</Text>
          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Weekly budget</Text>
            <View style={styles.stepperControl}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setDraftWeeklyBudget((value) => Math.max(20, value - 10))}
              >
                <Text style={styles.stepperButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>${draftWeeklyBudget}</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setDraftWeeklyBudget((value) => Math.min(2000, value + 10))}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.chipGrid}>
            {[50, 100, 150, 200, 300].map((amount) => (
              <TouchableOpacity
                key={amount}
                style={[styles.chip, draftWeeklyBudget === amount && styles.chipActive]}
                onPress={() => setDraftWeeklyBudget(amount)}
              >
                <Text style={[styles.chipText, draftWeeklyBudget === amount && styles.chipTextActive]}>
                  ${amount}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setBudgetEditorVisible(false)}
              disabled={savingPreferences}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={saveWeeklyBudget} disabled={savingPreferences}>
              <Text style={styles.modalSaveText}>{savingPreferences ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={storesEditorVisible} animationType="slide" onRequestClose={() => setStoresEditorVisible(false)}>
        <ScrollView style={styles.modalContainer} contentContainerStyle={styles.modalScrollContent}>
          <Text style={styles.modalTitle}>Edit preferred stores</Text>
          <Text style={styles.modalHint}>Choose up to 2 stores.</Text>
          <View style={styles.chipGrid}>
            {CHAIN_OPTIONS.map((option) => {
              const selected = draftPreferredRetailers.includes(option.key)
              const disabled = !selected && draftPreferredRetailers.length >= 2
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.chip, selected && styles.chipActive, disabled && styles.chipDisabled]}
                  onPress={() => {
                    if (selected) {
                      setDraftPreferredRetailers((current) => current.filter((item) => item !== option.key))
                      return
                    }
                    if (draftPreferredRetailers.length < 2) {
                      setDraftPreferredRetailers((current) => [...current, option.key])
                    }
                  }}
                  disabled={disabled}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextActive, disabled && styles.chipTextDisabled]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setStoresEditorVisible(false)}
              disabled={savingPreferences}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={savePreferredStores} disabled={savingPreferences}>
              <Text style={styles.modalSaveText}>{savingPreferences ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>

      <Modal visible={cookingEditorVisible} animationType="slide" onRequestClose={() => setCookingEditorVisible(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Edit cooking preferences</Text>

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Max cook time</Text>
            <View style={styles.stepperControl}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setDraftCookingTimeMax((value) => Math.max(10, value - 5))}
              >
                <Text style={styles.stepperButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{draftCookingTimeMax} min</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setDraftCookingTimeMax((value) => Math.min(180, value + 5))}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.stepperRow}>
            <Text style={styles.stepperLabel}>Servings</Text>
            <View style={styles.stepperControl}>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setDraftServings((value) => Math.max(1, value - 1))}
              >
                <Text style={styles.stepperButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{draftServings}</Text>
              <TouchableOpacity
                style={styles.stepperButton}
                onPress={() => setDraftServings((value) => Math.min(12, value + 1))}
              >
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setCookingEditorVisible(false)}
              disabled={savingPreferences}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSaveButton} onPress={saveCookingPreferences} disabled={savingPreferences}>
              <Text style={styles.modalSaveText}>{savingPreferences ? 'Saving...' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
  email: { fontSize: 15, color: '#6b7280', marginTop: 4 },
  tierBadge: { alignSelf: 'flex-start', backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8, marginBottom: 24 },
  tierText: { fontSize: 12, fontWeight: '700', color: '#15803d', letterSpacing: 0.5 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#9ca3af', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  prefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  prefInfo: { flex: 1 },
  prefLabel: { fontSize: 14, color: '#374151', fontWeight: '500' },
  prefValue: { fontSize: 14, color: '#6b7280', marginTop: 2, textTransform: 'capitalize' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f3f4f6', minHeight: 44, justifyContent: 'center' },
  editText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  feedbackBtn: { marginTop: 8, marginBottom: 12, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#0f766e', alignItems: 'center', minHeight: 44 },
  feedbackText: { color: '#0f766e', fontSize: 16, fontWeight: '600' },
  referralNote: { fontSize: 13, color: '#64748b', marginTop: 10 },
  logoutBtn: { marginTop: 8, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center', minHeight: 44 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 56 },
  modalScrollContent: { paddingBottom: 24 },
  modalTitle: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', marginBottom: 20 },
  modalLabel: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 10, marginTop: 6 },
  modalHint: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  chip: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: '#f0fdf4', borderColor: '#16a34a' },
  chipDisabled: { opacity: 0.4 },
  chipText: { color: '#374151', fontWeight: '500' },
  chipTextActive: { color: '#15803d' },
  chipTextDisabled: { color: '#9ca3af' },
  stepperRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepperLabel: { fontSize: 16, color: '#111827', fontWeight: '600' },
  stepperControl: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: { fontSize: 20, color: '#111827', lineHeight: 20 },
  stepperValue: { minWidth: 72, textAlign: 'center', fontSize: 15, color: '#374151', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalCancelText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#16a34a',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  modalSaveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
