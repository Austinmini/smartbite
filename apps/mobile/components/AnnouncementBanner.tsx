import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

export interface Announcement {
  id: string
  title: string
  body: string
  type: 'INFO' | 'FEATURE' | 'ALERT' | 'PROMO'
  ctaLabel: string | null
  ctaUrl: string | null
}

interface Props {
  announcement: Announcement
  onDismiss: (id: string) => void
  onCtaPress?: (url: string) => void
}

const TYPE_COLORS: Record<Announcement['type'], string> = {
  INFO: '#e0f2fe',
  FEATURE: '#dcfce7',
  ALERT: '#fef3c7',
  PROMO: '#ede9fe',
}

const TYPE_BORDER: Record<Announcement['type'], string> = {
  INFO: '#7dd3fc',
  FEATURE: '#86efac',
  ALERT: '#fcd34d',
  PROMO: '#c4b5fd',
}

const TYPE_TEXT: Record<Announcement['type'], string> = {
  INFO: '#0369a1',
  FEATURE: '#166534',
  ALERT: '#92400e',
  PROMO: '#5b21b6',
}

export function AnnouncementBanner({ announcement, onDismiss, onCtaPress }: Props) {
  const bg = TYPE_COLORS[announcement.type]
  const border = TYPE_BORDER[announcement.type]
  const textColor = TYPE_TEXT[announcement.type]

  return (
    <View
      testID={`announcement-banner-${announcement.id}`}
      style={[styles.banner, { backgroundColor: bg, borderColor: border }]}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: textColor }]}>{announcement.title}</Text>
        <Text style={[styles.body, { color: textColor }]}>{announcement.body}</Text>
        {announcement.ctaLabel && (
          <TouchableOpacity
            testID={`announcement-cta-${announcement.id}`}
            style={[styles.ctaBtn, { borderColor: textColor }]}
            onPress={() => announcement.ctaUrl && onCtaPress?.(announcement.ctaUrl)}
          >
            <Text style={[styles.ctaText, { color: textColor }]}>{announcement.ctaLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        testID={`announcement-dismiss-${announcement.id}`}
        style={styles.dismissBtn}
        onPress={() => onDismiss(announcement.id)}
        accessibilityLabel="Dismiss announcement"
      >
        <Text style={[styles.dismissText, { color: textColor }]}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  content: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: '700' },
  body: { fontSize: 13, lineHeight: 18 },
  ctaBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 6,
  },
  ctaText: { fontSize: 12, fontWeight: '600' },
  dismissBtn: { minWidth: 32, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  dismissText: { fontSize: 14, fontWeight: '700' },
})
