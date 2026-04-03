import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import 'react-native-reanimated'

import { useColorScheme } from '@/components/useColorScheme'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'

export { ErrorBoundary } from 'expo-router'

export const unstable_settings = {
  initialRouteName: '(tabs)',
}

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync()
  }, [loaded])

  if (!loaded) return null

  return <RootLayoutNav />
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const { token, _hasHydrated } = useAuthStore()
  const { onboardingComplete } = useProfileStore()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (!_hasHydrated) return

    const inAuth = segments[0] === '(auth)'
    const inTabs = segments[0] === '(tabs)'

    if (!token) {
      // Not logged in — go to login
      if (!inAuth) router.replace('/(auth)/login')
    } else if (!onboardingComplete) {
      // Logged in but not onboarded
      if (!inAuth) router.replace('/(auth)/onboarding/location')
    } else {
      // Fully set up — go to tabs
      if (inAuth) router.replace('/(tabs)')
    }
  }, [token, onboardingComplete, _hasHydrated, segments])

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  )
}
