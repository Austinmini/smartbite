import { StyleSheet, Text, View, ScrollView } from 'react-native'
import { useLocalSearchParams } from 'expo-router'

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()

  return (
    <ScrollView style={styles.container} testID="recipe-detail-screen">
      <Text style={styles.title}>Recipe {id}</Text>
      <View testID="ingredients-list">
        <Text style={styles.sectionTitle}>Ingredients</Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', padding: 24, paddingBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', paddingHorizontal: 24, paddingVertical: 12 },
})
