import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, SafeAreaView,
} from 'react-native'
import { AuthService } from '../../services/auth.service'
import type { Session, Role } from '../../types'

interface Props {
  onAuthSuccess: (session: Session) => void
}

type Screen = 'login' | 'register'

export function AuthScreens({ onAuthSuccess }: Props) {
  const [screen, setScreen] = useState<Screen>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('student')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return }
    setError(null); setLoading(true)
    try {
      const session = await AuthService.login(email.trim(), password)
      onAuthSuccess(session)
    } catch (err: any) {
      setError(err.message ?? 'An unexpected error occurred.')
    } finally { setLoading(false) }
  }

  async function handleRegister() {
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return }
    setError(null); setLoading(true)
    try {
      const session = await AuthService.register(email.trim(), password, role)
      onAuthSuccess(session)
    } catch (err: any) {
      setError(err.message ?? 'An unexpected error occurred.')
    } finally { setLoading(false) }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.card}>
            <Text style={styles.appName}>📖 Reading App</Text>
            <Text style={styles.title}>{screen === 'login' ? 'Sign In' : 'Create Account'}</Text>

            <TextInput style={styles.input} placeholder="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} editable={!loading} />
            <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} editable={!loading} />

            {screen === 'register' && (
              <>
                <Text style={styles.label}>I am a:</Text>
                <View style={styles.roleRow}>
                  {(['student', 'teacher'] as Role[]).map((r) => (
                    <TouchableOpacity key={r} style={[styles.roleBtn, role === r && styles.roleBtnActive]} onPress={() => setRole(r)} disabled={loading}>
                      <Text style={[styles.roleText, role === r && styles.roleTextActive]}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={[styles.btn, loading && styles.btnDisabled]} onPress={screen === 'login' ? handleLogin : handleRegister} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{screen === 'login' ? 'Sign In' : 'Create Account'}</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setScreen(screen === 'login' ? 'register' : 'login'); setError(null) }} disabled={loading}>
              <Text style={styles.link}>
                {screen === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign In'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f4f6' },
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 28, maxWidth: 420, width: '100%', alignSelf: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  appName: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 8, color: '#1e3a5f' },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 24, color: '#111827' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, marginBottom: 14, fontSize: 15, color: '#111827', backgroundColor: '#f9fafb' },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  roleRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  roleBtn: { flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  roleBtnActive: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  roleText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  roleTextActive: { color: '#2563eb' },
  error: { color: '#dc2626', fontSize: 13, marginBottom: 12 },
  btn: { backgroundColor: '#2563eb', borderRadius: 8, padding: 14, alignItems: 'center', marginBottom: 14 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#2563eb', textAlign: 'center', fontSize: 14 },
})
