import React from 'react'
import { StyleSheet, Text, View, Animated } from 'react-native'

export default function CommunityLoadingScreen() {
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
      <View style={styles.content}>
        {/* Animated Header */}
        <Animated.View style={[styles.animatedIcon, { opacity }]}>
          <Text style={styles.icon}>🛒</Text>
        </Animated.View>

        <Text style={styles.title}>Real Community. Real Savings.</Text>
        <Text style={styles.subtitle}>Your meal plan is being powered by crowdsourced pricing</Text>

        {/* Visual: Community Network */}
        <View style={styles.networkContainer}>
          <View style={styles.networkRow}>
            <View style={[styles.person, styles.personLeft]}>
              <Text style={styles.personEmoji}>👤</Text>
              <Text style={styles.label}>Scan</Text>
            </View>
            <View style={styles.connector} />
            <View style={styles.centerNode}>
              <Text style={styles.centerEmoji}>💰</Text>
            </View>
            <View style={styles.connector} />
            <View style={[styles.person, styles.personRight]}>
              <Text style={styles.personEmoji}>👤</Text>
              <Text style={styles.label}>Save</Text>
            </View>
          </View>
        </View>

        {/* Key Benefits */}
        <View style={styles.benefits}>
          <BenefitRow icon="📱" text="Scan barcodes while shopping " highlight="anywhere" />
          <BenefitRow icon="🤝" text="Help your community save money " highlight="together" />
          <BenefitRow icon="✅" text="Every scan makes pricing more accurate " highlight="for everyone" />
        </View>

        {/* Call to Action */}
        <View style={styles.cta}>
          <Text style={styles.ctaText}>🎯 Tip: The more scans in your area, the better prices we can show you!</Text>
        </View>
      </View>

      {/* Loading Indicator */}
      <View style={styles.footer}>
        <Text style={styles.loadingText}>Generating your personalized meal plan...</Text>
        <View style={styles.dots}>
          <Animated.View style={[styles.dot, { opacity: Animated.divide(opacity, 2) }]} />
          <Animated.View style={[styles.dot, styles.dotDelay, { opacity: Animated.divide(opacity, 2) }]} />
          <Animated.View style={[styles.dot, styles.dotDelay2, { opacity: Animated.divide(opacity, 2) }]} />
        </View>
      </View>
    </View>
  )
}

function BenefitRow({ icon, text, highlight }: { icon: string; text: string; highlight: string }) {
  return (
    <View style={styles.benefitRow}>
      <Text style={styles.benefitIcon}>{icon}</Text>
      <Text style={styles.benefitText}>
        {text.split(highlight)[0]}
        <Text style={styles.highlight}>{highlight}</Text>
        {text.split(highlight)[1]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
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
  networkContainer: {
    marginBottom: 40,
    paddingHorizontal: 12,
  },
  networkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  person: {
    alignItems: 'center',
    width: 60,
  },
  personEmoji: {
    fontSize: 40,
    marginBottom: 4,
  },
  personLeft: {
    paddingLeft: 8,
  },
  personRight: {
    paddingRight: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#22c55e',
    textAlign: 'center',
  },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  centerNode: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerEmoji: {
    fontSize: 32,
  },
  benefits: {
    gap: 16,
    marginBottom: 32,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
  },
  benefitIcon: {
    fontSize: 22,
    marginTop: 2,
    minWidth: 28,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  highlight: {
    fontWeight: '700',
    color: '#22c55e',
  },
  cta: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
    padding: 14,
    borderRadius: 8,
  },
  ctaText: {
    fontSize: 13,
    color: '#15803d',
    lineHeight: 18,
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
