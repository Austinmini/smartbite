import { StyleSheet, Text, View, TextInput, TouchableOpacity } from 'react-native'
import { Link } from 'expo-router'

export default function SignupScreen() {
  return (
    <View style={styles.container} testID="signup-screen">
      <Text style={styles.title}>Create account</Text>
      <Text style={styles.subtitle}>Start eating well within your budget</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        testID="email-input"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        testID="password-input"
      />
      <TouchableOpacity style={styles.btn} testID="signup-btn">
        <Text style={styles.btnText}>Create account</Text>
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
