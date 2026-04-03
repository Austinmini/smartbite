import { StyleSheet, Text, View } from 'react-native'

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Account & preferences</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
})
