import { useState } from 'react'
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { Link, useRouter } from 'expo-router'
import { apiClient } from '@/lib/apiClient'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export default function SignupScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const setUser = useAuthStore((s) => s.setUser)
  const router = useRouter()

  async function handleSignup() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password')
      return
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const res = await apiClient.post<{ access_token: string; refresh_token: string; user: { id: string; email: string; tier: 'FREE' | 'PLUS' | 'PRO' } }>(
        '/auth/signup',
        { email, password }
      )
      // Hand the session to the Supabase client so it manages token refresh automatically
      await supabase.auth.setSession({ access_token: res.access_token, refresh_token: res.refresh_token })
      setUser(res.user, res.access_token)
      router.replace('/(auth)/onboarding/location')
    } catch (err: any) {
      const msg = err.status === 409 ? 'An account with this email already exists' : (err.message ?? 'Sign up failed')
      Alert.alert('Sign up failed', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container} testID="signup-screen">
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Start eating well within your budget</Text>
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
        placeholder="Password (min 8 characters)"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        testID="password-input"
      />
      <TouchableOpacity style={styles.btn} onPress={handleSignup} disabled={loading} testID="signup-btn">
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create account</Text>}
      </TouchableOpacity>
      <Link href="/(auth)/login" style={styles.link}>
        Already have an account? Sign in
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
