import React, { useState, useEffect } from 'react'
import { Modal, Animated, Easing } from 'react-native'
import CommunityLoadingScreen from './CommunityLoadingScreen'
import FeaturesLoadingScreen from './FeaturesLoadingScreen'

interface OnboardingLoadingModalProps {
  visible: boolean
}

export default function OnboardingLoadingModal({ visible }: OnboardingLoadingModalProps) {
  const [screenIndex, setScreenIndex] = useState(0)
  const fadeAnim = React.useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!visible) return

    // Switch screens every 10 seconds with a fade transition
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
      ]).start()

      setScreenIndex((prev) => (prev + 1) % 2)
    }, 10000)

    return () => clearInterval(interval)
  }, [visible, fadeAnim])

  const screens = [<CommunityLoadingScreen key="community" />, <FeaturesLoadingScreen key="features" />]

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent transparent={false}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>{screens[screenIndex]}</Animated.View>
    </Modal>
  )
}
