import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

export interface ChecklistActions {
  profileComplete: boolean
  firstPlanGenerated: boolean
  firstRecipeCooked: boolean
  firstScan: boolean
  firstPurchase: boolean
}

interface Props {
  completedActions: ChecklistActions
}

const CHECKLIST_ITEMS: { key: keyof ChecklistActions; label: string }[] = [
  { key: 'profileComplete', label: 'Set up your profile' },
  { key: 'firstPlanGenerated', label: 'Generate your first plan' },
  { key: 'firstRecipeCooked', label: 'Mark a recipe as cooked' },
  { key: 'firstScan', label: 'Scan a grocery item' },
  { key: 'firstPurchase', label: 'Record your first purchase' },
]

export function OnboardingChecklist({ completedActions }: Props) {
  const total = CHECKLIST_ITEMS.length
  const done = CHECKLIST_ITEMS.filter((item) => completedActions[item.key]).length

  if (done === total) return null

  return (
    <View style={styles.card} testID="onboarding-checklist">
      <Text style={styles.heading}>Getting started</Text>
      <Text style={styles.progress}>{done} of {total} complete</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(done / total) * 100}%` }]} />
      </View>
      <View style={styles.list}>
        {CHECKLIST_ITEMS.map((item) => {
          const completed = completedActions[item.key]
          return (
            <View
              key={item.key}
              testID={`checklist-item-${item.key}-${completed ? 'done' : 'pending'}`}
              style={styles.itemRow}
            >
              <View style={[styles.dot, completed && styles.dotDone]}>
                {completed && <Text style={styles.check}>✓</Text>}
              </View>
              <Text style={[styles.itemLabel, completed && styles.itemLabelDone]}>
                {item.label}
              </Text>
            </View>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  heading: { fontSize: 16, fontWeight: '700', color: '#15803d', marginBottom: 4 },
  progress: { fontSize: 13, color: '#16a34a', marginBottom: 10 },
  progressTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#d1fae5',
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: { height: '100%', backgroundColor: '#22c55e' },
  list: { gap: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#86efac',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  check: { color: '#fff', fontSize: 12, fontWeight: '700' },
  itemLabel: { fontSize: 14, color: '#374151', flex: 1 },
  itemLabelDone: { textDecorationLine: 'line-through', color: '#9ca3af' },
})
