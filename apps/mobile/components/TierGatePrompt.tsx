import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

interface Props {
  visible: boolean
  feature: string
  requiredTier: 'PLUS' | 'PRO'
  onUpgrade: () => void
  onClose: () => void
  hasUsedTrial?: boolean
}

export function TierGatePrompt({ visible, feature, requiredTier, onUpgrade, onClose, hasUsedTrial }: Props) {
  if (!visible) return null

  const tierLabel = requiredTier === 'PRO' ? 'Pro' : 'Plus'
  const price = requiredTier === 'PRO' ? '$9.99/mo' : '$4.99/mo'
  const upgradeLabel = hasUsedTrial ? `Get Pro back · ${price}` : `Upgrade to ${tierLabel} · ${price}`

  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <Text style={styles.badge}>{tierLabel.toUpperCase()}</Text>
        <Text style={styles.title}>{feature}</Text>
        <Text style={styles.body}>
          {hasUsedTrial
            ? `You used ${feature} during your Pro trial. Upgrade to keep access.`
            : `${feature} is available on ${tierLabel} and above.`}
        </Text>

        <TouchableOpacity style={styles.upgradeBtn} onPress={onUpgrade} accessibilityLabel={upgradeLabel}>
          <Text style={styles.upgradeBtnText}>{upgradeLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Not now">
          <Text style={styles.closeBtnText}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#f0fdf4', color: '#15803d', fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  body: { fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 20 },
  upgradeBtn: { backgroundColor: '#0f766e', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 10, minHeight: 44 },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn: { alignItems: 'center', padding: 12, minHeight: 44 },
  closeBtnText: { color: '#9ca3af', fontSize: 15 },
})
