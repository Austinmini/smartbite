import { useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import * as Location from 'expo-location'
import { apiClient } from '@/lib/apiClient'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore, StoreItem } from '@/stores/profileStore'

const CHAIN_LOGOS: Record<string, { bg: string; text: string; color: string }> = {
  heb: { bg: '#E8F5E9', text: 'H', color: '#2E7D32' },
  centralmarket: { bg: '#F3E5F5', text: 'CM', color: '#6A1B9A' },
  wholefoods: { bg: '#EAF7EA', text: 'WF', color: '#1A6B1A' },
  walmart: { bg: '#E3F2FD', text: 'W', color: '#1565C0' },
  kroger: { bg: '#E8F5E9', text: 'K', color: '#2E7D32' },
  aldi: { bg: '#FFF8E1', text: 'A', color: '#F57F17' },
}

export default function LocationScreen() {
  const router = useRouter()
  const token = useAuthStore((s) => s.token)
  const { nearbyStores, selectedStores, setLocation, setNearbyStores, toggleStore } = useProfileStore()
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [locationGranted, setLocationGranted] = useState(nearbyStores.length > 0)

  async function requestLocation() {
    setLoadingLocation(true)
    try {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Location required', 'SavvySpoon needs your location to find nearby stores.')
        setLoadingLocation(false)
        return
      }

      const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
      const { latitude: lat, longitude: lng } = coords.coords

      setLocation({ lat, lng })

      const res = await apiClient.get<{ stores: StoreItem[] }>(
        `/stores/nearby?lat=${lat}&lng=${lng}`,
        token ?? undefined
      )
      setNearbyStores(res.stores)
      setLocationGranted(true)
    } catch (err: any) {
      Alert.alert('Error', 'Could not load nearby stores. Please try again.')
    } finally {
      setLoadingLocation(false)
    }
  }

  function renderStore({ item }: { item: StoreItem }) {
    const selected = selectedStores.some((store) => store.id === item.id)
    const disabled = !selected && selectedStores.length >= 2
    const logo = CHAIN_LOGOS[item.chain ?? ''] ?? { bg: '#F5F5F5', text: '?', color: '#666' }

    return (
      <TouchableOpacity
        style={[styles.storeRow, selected && styles.storeRowSelected, disabled && styles.storeRowDisabled]}
        onPress={() => !disabled && toggleStore(item)}
        disabled={disabled}
        accessibilityLabel={`${item.name}, ${item.distanceMiles.toFixed(1)} miles`}
        testID={`store-${item.chain}`}
      >
        <View style={[styles.storeLogo, { backgroundColor: logo.bg }]}>
          <Text style={[styles.storeLogoText, { color: logo.color }]}>{logo.text}</Text>
        </View>
        <View style={styles.storeInfo}>
          <Text style={[styles.storeName, disabled && styles.textDisabled]}>{item.name}</Text>
          <Text style={[styles.storeDist, disabled && styles.textDisabled]}>{item.distanceMiles.toFixed(1)} mi away</Text>
        </View>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
            {selected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container} testID="location-screen">
      <Text style={styles.step}>Step 1 of 5</Text>
      <Text style={styles.title}>Find your stores</Text>
      <Text style={styles.subtitle}>Pick up to 2 stores you shop at regularly.</Text>

      {!locationGranted ? (
        <View style={styles.permissionBox}>
          <Text style={styles.permissionText}>SavvySpoon needs your location to find stores near you.</Text>
          <TouchableOpacity style={styles.btn} onPress={requestLocation} disabled={loadingLocation} testID="location-allow-btn">
            {loadingLocation
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.btnText}>Allow location access</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={styles.hint}>
            {selectedStores.length === 2 ? 'Max 2 stores selected' : `${selectedStores.length}/2 selected`}
          </Text>
          <FlatList
            data={nearbyStores}
            keyExtractor={(s) => s.id}
            renderItem={renderStore}
            style={styles.list}
            testID="store-list"
          />
        </>
      )}

      <TouchableOpacity
        style={[styles.btn, selectedStores.length === 0 && styles.btnDisabled]}
        onPress={() => router.push('/(auth)/onboarding/servings')}
        disabled={selectedStores.length === 0}
        testID="continue-btn"
      >
        <Text style={styles.btnText}>Continue</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, paddingTop: 56 },
  step: { fontSize: 13, color: '#9ca3af', fontWeight: '500', marginBottom: 4 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  permissionBox: { flex: 1, justifyContent: 'center', gap: 16 },
  permissionText: { fontSize: 16, color: '#444', textAlign: 'center', lineHeight: 24 },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 12 },
  list: { flex: 1, marginBottom: 16 },
  storeRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 10, minHeight: 64 },
  storeRowSelected: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  storeRowDisabled: { opacity: 0.4 },
  storeLogo: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  storeLogoText: { fontSize: 13, fontWeight: '700' },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  storeDist: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  textDisabled: { color: '#9ca3af' },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  checkboxSelected: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btn: { backgroundColor: '#22c55e', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8, minHeight: 44 },
  btnDisabled: { backgroundColor: '#d1d5db' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
