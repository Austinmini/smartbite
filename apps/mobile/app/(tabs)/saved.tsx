import { StyleSheet, Text, View } from 'react-native'

export default function SavedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved</Text>
      <Text style={styles.subtitle}>Your favourite recipes</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
})
