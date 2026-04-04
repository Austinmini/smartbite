import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { useColorScheme } from '@/components/useColorScheme'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'
// react-native-reanimated bare import omitted — causes import.meta error on web (Reanimated v4)
// Re-add when animations are needed (Sprint 4+) and web bundling is resolved

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

  // On web, onRehydrateStorage can miss before first render — force it
  useEffect(() => {
    const unsub = useAuthStore.persist.onFinishHydration(() => {
      useAuthStore.getState().setHasHydrated(true)
    })
    if (useAuthStore.persist.hasHydrated()) {
      useAuthStore.getState().setHasHydrated(true)
    }
    return unsub
  }, [])

  useEffect(() => {
    if (!_hasHydrated) return

    const inAuth = segments[0] === '(auth)'

    if (!token) {
      if (!inAuth) router.replace('/(auth)/login')
    } else if (!onboardingComplete) {
      if (!inAuth) router.replace('/(auth)/onboarding/location')
    } else {
      if (inAuth) router.replace('/(tabs)')
    }
  }, [token, onboardingComplete, _hasHydrated, segments])

  if (!_hasHydrated) return null

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipe/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="shopping-list/[planId]" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  )
}
