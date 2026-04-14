import React from 'react'
import { StyleSheet, Text, View, Animated, ScrollView } from 'react-native'

export default function FeaturesLoadingScreen() {
  const opacity = React.useRef(new Animated.Value(0.3)).current

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    ).start()
  }, [opacity])

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Animated Header */}
        <Animated.View style={[styles.animatedIcon, { opacity }]}>
          <Text style={styles.icon}>⭐</Text>
        </Animated.View>

        <Text style={styles.title}>Unlock Smart Features</Text>
        <Text style={styles.subtitle}>Your 7-day trial of Pro unlocks powerful tools to save even more</Text>

        {/* Feature Grid */}
        <View style={styles.grid}>
          <FeatureCard
            icon="📊"
            title="Price Trends"
            description="See how prices change over time at your stores"
            premium
          />
          <FeatureCard
            icon="🤖"
            title="AI Suggestions"
            description="Smart price predictions based on community data"
            premium
          />
          <FeatureCard
            icon="🔔"
            title="Price Alerts"
            description="Get notified when your favorite recipes drop in price"
            premium
          />
          <FeatureCard
            icon="🏪"
            title="Multi-Store Scan"
            description="Compare prices across multiple stores at once"
            premium
          />
        </View>

        {/* Free Features */}
        <View style={styles.freeSection}>
          <Text style={styles.freeSectionTitle}>Always Free:</Text>
          <View style={styles.freeFeatures}>
            <FreeFeature icon="📱" text="Barcode scanner" />
            <FreeFeature icon="🎯" text="Smart meal planning" />
            <FreeFeature icon="💪" text="Earn Bites rewards" />
            <FreeFeature icon="📝" text="Shopping lists" />
          </View>
        </View>

        {/* CTA */}
        <View style={styles.cta}>
          <Text style={styles.ctaText}>
            Try Pro free for 7 days. Cancel anytime. Membership renews at $9.99/month.
          </Text>
        </View>
      </ScrollView>

      {/* Loading Indicator */}
      <View style={styles.footer}>
        <Text style={styles.loadingText}>Setting up your meal plan...</Text>
        <View style={styles.dots}>
          <Animated.View style={[styles.dot, { opacity: Animated.divide(opacity, 2) }]} />
          <Animated.View style={[styles.dot, styles.dotDelay, { opacity: Animated.divide(opacity, 2) }]} />
          <Animated.View style={[styles.dot, styles.dotDelay2, { opacity: Animated.divide(opacity, 2) }]} />
        </View>
      </View>
    </View>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  premium,
}: {
  icon: string
  title: string
  description: string
  premium?: boolean
}) {
  return (
    <View style={[styles.card, premium && styles.cardPremium]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{icon}</Text>
        {premium && <View style={styles.premiumBadge}><Text style={styles.premiumText}>Pro</Text></View>}
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  )
}

function FreeFeature({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.freeFeature}>
      <Text style={styles.freeIcon}>{icon}</Text>
      <Text style={styles.freeText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  animatedIcon: {
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  grid: {
    gap: 12,
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardPremium: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  cardIcon: {
    fontSize: 28,
  },
  premiumBadge: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  premiumText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
  freeSection: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  freeSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 12,
  },
  freeFeatures: {
    gap: 8,
  },
  freeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  freeIcon: {
    fontSize: 18,
    minWidth: 24,
  },
  freeText: {
    fontSize: 13,
    color: '#b45309',
    fontWeight: '500',
  },
  cta: {
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    padding: 12,
  },
  ctaText: {
    fontSize: 12,
    color: '#15803d',
    lineHeight: 16,
    fontStyle: 'italic',
  },
  footer: {
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  dotDelay: {
    marginLeft: -2,
  },
  dotDelay2: {
    marginLeft: -2,
  },
})
