import React, { useEffect, useState, useCallback } from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { AuthService } from '../services/auth.service'
import type { Session } from '../types'
import { AuthScreens } from '../screens/auth/AuthScreens'
import { StudentNavigator } from './StudentNavigator'
import { TeacherNavigator } from './TeacherNavigator'

export function RootNavigator() {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    AuthService.getSession().then(setSession).finally(() => setLoading(false))
  }, [])

  const handleAuthSuccess = useCallback((newSession: Session) => {
    setSession(newSession)
  }, [])

  const handleLogout = useCallback(() => {
    setSession(null)
  }, [])

  if (loading) {
    return <View style={styles.loader}><ActivityIndicator size="large" /></View>
  }

  if (!session) {
    return <AuthScreens onAuthSuccess={handleAuthSuccess} />
  }

  if (session.role === 'teacher') {
    return <TeacherNavigator onLogout={handleLogout} />
  }

  return <StudentNavigator onLogout={handleLogout} />
}

const styles = StyleSheet.create({
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
})
