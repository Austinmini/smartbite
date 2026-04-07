import React from 'react'
import { StyleSheet, Text, TouchableOpacity } from 'react-native'

interface Props {
  isSaved: boolean
  onPress: () => void
}

export function FavouriteButton({ isSaved, onPress }: Props) {
  return (
    <TouchableOpacity
      testID="favourite-button"
      accessibilityRole="button"
      accessibilityLabel={isSaved ? 'Saved recipe' : 'Save recipe'}
      style={[styles.button, isSaved && styles.buttonSaved]}
      onPress={onPress}
    >
      <Text style={styles.icon}>{isSaved ? '♥' : '♡'}</Text>
      <Text style={[styles.label, isSaved && styles.labelSaved]}>{isSaved ? 'Saved' : 'Save'}</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#fecdd3',
    backgroundColor: '#fff1f2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  buttonSaved: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  icon: {
    fontSize: 15,
    color: '#be123c',
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    color: '#be123c',
    fontWeight: '700',
  },
  labelSaved: {
    color: '#fff',
  },
})
