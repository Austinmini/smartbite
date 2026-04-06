import { useState } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { apiClient } from '@/lib/apiClient'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useProfileStore } from '@/stores/profileStore'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const onboardingComplete = useProfileStore((s) => s.onboardingComplete)
  const router = useRouter()

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password')
      return
    }
    setLoading(true)
    try {
      const res = await apiClient.post<{ access_token: string; refresh_token: string; user: { id: string; email: string; tier: 'FREE' | 'PLUS' | 'PRO' } }>(
        '/auth/login',
        { email, password }
      )
      // Hand the session to the Supabase client so it manages token refresh automatically
      await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token })
      setUser(res.user, res.access_token, res.refresh_token)
      router.replace(onboardingComplete ? '/(tabs)' : '/(auth)/onboarding/location')
    } catch (err: any) {
      Alert.alert('Sign in failed', err.message ?? 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container} testID="login-screen">
      <Text style={styles.title}>SmartBite</Text>
      <Text style={styles.subtitle}>Sign in to your account</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        testID="email-input"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        testID="password-input"
      />
      <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading} testID="login-btn">
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign in</Text>}
      </TouchableOpacity>
      <Link href="/(auth)/signup" style={styles.link}>
        Don't have an account? Sign up
      </Link>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24, justifyContent: 'center' },
  title: { fontSize: 32, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 32 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 12, minHeight: 44 },
  btn: { backgroundColor: '#22c55e', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4, minHeight: 44 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 20, color: '#22c55e', fontSize: 15 },
})
