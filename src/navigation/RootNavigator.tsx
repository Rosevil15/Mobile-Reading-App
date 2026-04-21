import React, { useEffect, useState, useCallback } from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { AuthService } from '../services/auth.service'
import type { Session } from '../types'
import { AuthNavigator } from './AuthNavigator'
import { StudentNavigator } from './StudentNavigator'
import { TeacherNavigator } from './TeacherNavigator'

/**
 * Root navigator — checks the persisted session on mount and routes to the
 * appropriate navigator based on the user's role.
 *
 * Requirements: 1.4, 1.5, 6.1
 */
export function RootNavigator() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    AuthService.getSession()
      .then(setSession)
      .finally(() => setLoading(false))
  }, [])

  /** Called by auth screens after a successful login or registration. */
  const handleAuthSuccess = useCallback(async (newSession?: Session) => {
    if (newSession) {
      setSession(newSession)
    } else {
      const s = await AuthService.getSession()
      setSession(s)
    }
  }, [])

  /** Called by authenticated screens when the user logs out. */
  const handleLogout = useCallback(() => {
    setSession(null)
  }, [])

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {session === null && <AuthNavigator onAuthSuccess={handleAuthSuccess} />}
      {session?.role === 'student' && <StudentNavigator onLogout={handleLogout} />}
      {session?.role === 'teacher' && <TeacherNavigator onLogout={handleLogout} />}
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
