import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useRouter } from 'expo-router'
import { SavedRecipeEditor } from '../../components/SavedRecipeEditor'
import { useMealPlanStore } from '../../stores/mealPlanStore'
import { useSavedRecipesStore, type SavedFavourite } from '../../stores/savedRecipesStore'

export default function SavedScreen() {
  const router = useRouter()
  const [tab, setTab] = React.useState<'collections' | 'saved' | 'mostCooked'>('collections')
  const [editingFavourite, setEditingFavourite] = React.useState<SavedFavourite | null>(null)
  const favourites = useSavedRecipesStore((state) => state.favourites)
  const collections = useSavedRecipesStore((state) => state.collections)
  const getSortedFavourites = useSavedRecipesStore((state) => state.getSortedFavourites)
  const updateFavourite = useSavedRecipesStore((state) => state.updateFavourite)
  const removeFavourite = useSavedRecipesStore((state) => state.removeFavourite)
  const plan = useMealPlanStore((state) => state.plan)

  const visibleFavourites =
    tab === 'mostCooked' ? getSortedFavourites('mostCooked') : getSortedFavourites('recent')

  function addCookAgain(favourite: SavedFavourite) {
    if (!plan) return
    const nextMeal = {
      id: `saved-${Date.now()}`,
      mealPlanId: plan.id,
      dayOfWeek: new Date().getDay(),
      mealType: 'DINNER' as const,
      estCost: 0,
      bestStore: 'Saved',
      recipe: favourite.recipe,
    }
    useMealPlanStore.getState().setPlan({
      ...plan,
      meals: [...plan.meals, nextMeal],
    })
    router.push(`/recipe/${nextMeal.id}`)
  }

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Saved</Text>
      <Text style={styles.subtitle}>Your favourite recipes</Text>

      <View style={styles.tabs}>
        {[
          { key: 'collections', label: 'Collections' },
          { key: 'saved', label: 'All saved' },
          { key: 'mostCooked', label: 'Most cooked' },
        ].map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.tabChip, tab === item.key && styles.tabChipSelected]}
            onPress={() => setTab(item.key as 'collections' | 'saved' | 'mostCooked')}
          >
            <Text style={[styles.tabChipText, tab === item.key && styles.tabChipTextSelected]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {favourites.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No favourites yet</Text>
          <Text style={styles.emptyBody}>
            Heart a recipe from the recipe detail screen and it will show up here.
          </Text>
        </View>
      ) : null}

      {tab === 'collections' && collections.map((collection) => (
        <View key={collection.id} style={styles.collectionCard}>
          <Text style={styles.collectionTitle}>{collection.emoji} {collection.name}</Text>
          {collection.recipeIds.length === 0 ? (
            <Text style={styles.collectionEmpty}>No recipes yet.</Text>
          ) : (
            collection.recipeIds.map((recipeId) => {
              const favourite = favourites.find((entry) => entry.recipeId === recipeId)
              if (!favourite) return null
              return (
                <SavedRecipeRow
                  key={favourite.recipeId}
                  favourite={favourite}
                  onPress={() => router.push(`/recipe/${favourite.recipeId}`)}
                  onLongPress={() => setEditingFavourite(favourite)}
                  onCookAgain={() => addCookAgain(favourite)}
                  onRemove={() => removeFavourite(favourite.recipeId)}
                />
              )
            })
          )}
        </View>
      ))}

      {tab !== 'collections' && visibleFavourites.map((favourite) => (
        <SavedRecipeRow
          key={favourite.recipeId}
          favourite={favourite}
          onPress={() => router.push(`/recipe/${favourite.recipeId}`)}
          onLongPress={() => setEditingFavourite(favourite)}
          onCookAgain={() => addCookAgain(favourite)}
          onRemove={() => removeFavourite(favourite.recipeId)}
        />
      ))}
    </ScrollView>
    <SavedRecipeEditor
      visible={editingFavourite !== null}
      favourite={editingFavourite}
      onClose={() => setEditingFavourite(null)}
      onSave={(updates) => {
        if (!editingFavourite) return
        updateFavourite(editingFavourite.recipeId, updates)
        setEditingFavourite(null)
      }}
    />
    </>
  )
}

function SavedRecipeRow({
  favourite,
  onPress,
  onLongPress,
  onCookAgain,
  onRemove,
}: {
  favourite: SavedFavourite
  onPress: () => void
  onLongPress: () => void
  onCookAgain: () => void
  onRemove: () => void
}) {
  return (
    <TouchableOpacity style={styles.recipeCard} onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.recipeHeader}>
        <Text style={styles.recipeTitle}>{favourite.recipe.title}</Text>
        <Text style={styles.recipeCooked}>{favourite.timesCooked} cooked</Text>
      </View>
      <Text style={styles.recipeMeta}>
        {favourite.recipe.readyInMinutes} min • {favourite.recipe.servings} servings
      </Text>
      {favourite.notes ? <Text style={styles.recipeNotes}>{favourite.notes}</Text> : null}
      <View style={styles.recipeActions}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onCookAgain}>
          <Text style={styles.secondaryBtnText}>Cook again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.ghostBtn} onPress={onRemove}>
          <Text style={styles.ghostBtnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 28, fontWeight: '700', color: '#1a1a1a', marginTop: 16 },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4, marginBottom: 18 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  tabChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: '#f1f5f9', minHeight: 42 },
  tabChipSelected: { backgroundColor: '#0f766e' },
  tabChipText: { fontSize: 14, fontWeight: '700', color: '#475569' },
  tabChipTextSelected: { color: '#fff' },
  emptyState: { paddingVertical: 36, alignItems: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  emptyBody: { fontSize: 15, lineHeight: 22, color: '#64748b', textAlign: 'center', marginTop: 8 },
  collectionCard: { borderRadius: 18, backgroundColor: '#f8fafc', padding: 16, marginBottom: 16 },
  collectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 10 },
  collectionEmpty: { fontSize: 14, color: '#64748b' },
  recipeCard: { borderRadius: 18, backgroundColor: '#f8fafc', padding: 16, marginBottom: 14 },
  recipeHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  recipeTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0f172a' },
  recipeCooked: { fontSize: 13, color: '#0f766e', fontWeight: '700' },
  recipeMeta: { fontSize: 13, color: '#64748b', marginTop: 6 },
  recipeNotes: { fontSize: 14, color: '#334155', marginTop: 10 },
  recipeActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  secondaryBtn: { backgroundColor: '#0f766e', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, minHeight: 42, justifyContent: 'center' },
  secondaryBtnText: { color: '#fff', fontWeight: '700' },
  ghostBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, minHeight: 42, justifyContent: 'center' },
  ghostBtnText: { color: '#475569', fontWeight: '700' },
})
