import React, { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { supabase } from '../../services/supabase'
import { AuthService } from '../../services/auth.service'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'

export type TeacherStackParamList = {
  Dashboard: undefined
  StudentDetail: { studentId: string; studentName: string }
}

type Props = NativeStackScreenProps<TeacherStackParamList, 'Dashboard'>

interface Student {
  id: string
  name: string | null
  email: string | null
}

/**
 * Teacher dashboard — lists all students associated with the teacher.
 * Tapping a student navigates to StudentDetailScreen.
 * Requirements: 6.1, 6.2
 */
export function DashboardScreen({ navigation }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const session = await AuthService.getSession()
      if (!session) return

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('teacher_id', session.userId)

      if (error) throw error
      setStudents(data ?? [])
    } catch {
      setStudents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  if (loading) {
    return (
      <View style={styles.screen}>
        <ConnectivityIndicator />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" accessibilityLabel="Loading students" />
        </View>
      </View>
    )
  }

  if (students.length === 0) {
    return (
      <View style={styles.screen}>
        <ConnectivityIndicator />
        <View style={styles.center}>
          <Text style={styles.emptyText}>No students are associated with your account.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <ConnectivityIndicator />
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate('StudentDetail', {
                studentId: item.id,
                studentName: item.name ?? item.email ?? 'Student',
              })
            }
            accessibilityRole="button"
            accessibilityLabel={`View progress for ${item.name ?? item.email ?? 'student'}`}
          >
            <Text style={styles.cardName}>{item.name ?? '—'}</Text>
            <Text style={styles.cardEmail}>{item.email ?? ''}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardEmail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
})
