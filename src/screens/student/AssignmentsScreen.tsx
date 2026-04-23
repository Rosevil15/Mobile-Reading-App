import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { supabase } from '../../services/supabase'
import { AuthService } from '../../services/auth.service'
import { AppLayout } from '../../components/AppLayout'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'

interface Props {
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
}

interface Assignment {
  id: string
  assignmentId: string
  title: string
  materialId: string
  materialTitle: string
  materialContent: string
  materialDifficulty: string
  deadline: string
  requiredScore: number
  completed: boolean
  score: number | null
}

export function StudentAssignmentsScreen({ activeScreen, title, onNavigate, onLogout }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAssignments = useCallback(async () => {
    setLoading(true)
    try {
      const session = await AuthService.getSession()
      if (!session) return

      const { data } = await supabase
        .from('assignment_students')
        .select(`
          id,
          completed,
          score,
          assignments (
            id, title, deadline, required_score,
            reading_materials ( id, title, content, difficulty_level )
          )
        `)
        .eq('student_id', session.userId)
        .order('created_at', { ascending: false })

      const mapped: Assignment[] = (data ?? []).map((row: any) => ({
        id: row.id,
        assignmentId: row.assignments?.id,
        title: row.assignments?.title ?? '—',
        materialId: row.assignments?.reading_materials?.id ?? '',
        materialTitle: row.assignments?.reading_materials?.title ?? '—',
        materialContent: row.assignments?.reading_materials?.content ?? '',
        materialDifficulty: row.assignments?.reading_materials?.difficulty_level ?? 'easy',
        deadline: row.assignments?.deadline ?? '',
        requiredScore: row.assignments?.required_score ?? 0,
        completed: row.completed,
        score: row.score,
      }))
      setAssignments(mapped)
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAssignments() }, [fetchAssignments])

  const isOverdue = (deadline: string) => !deadline ? false : new Date(deadline) < new Date()
  const daysLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  const pending = assignments.filter(a => !a.completed)
  const completed = assignments.filter(a => a.completed)

  return (
    <AppLayout role="student" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      <ConnectivityIndicator />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : assignments.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No assignments yet.</Text>
          <Text style={styles.emptyHint}>Your teacher hasn't assigned anything yet.</Text>
        </View>
      ) : (
        <FlatList
          data={[...pending, ...completed]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            pending.length > 0 ? (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📋 Pending ({pending.length})</Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const showCompletedHeader = index === pending.length && completed.length > 0
            return (
              <>
                {showCompletedHeader && (
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>✅ Completed ({completed.length})</Text>
                  </View>
                )}
                <View style={[styles.card, item.completed && styles.cardDone, isOverdue(item.deadline) && !item.completed && styles.cardOverdue]}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    {item.completed
                      ? <View style={styles.doneBadge}><Text style={styles.doneBadgeText}>✓ Done</Text></View>
                      : isOverdue(item.deadline)
                        ? <View style={styles.overdueBadge}><Text style={styles.overdueBadgeText}>Overdue</Text></View>
                        : <View style={styles.dueBadge}><Text style={styles.dueBadgeText}>{daysLeft(item.deadline)}d left</Text></View>
                    }
                  </View>

                  <Text style={styles.materialName}>📖 {item.materialTitle}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>📅 Due: {new Date(item.deadline).toLocaleDateString()}</Text>
                    <Text style={styles.meta}>⭐ Required: {item.requiredScore}%</Text>
                    {item.score !== null && <Text style={styles.meta}>🎯 Score: {item.score}%</Text>}
                  </View>

                  {!item.completed && (
                    <TouchableOpacity
                      style={[styles.startBtn, isOverdue(item.deadline) && styles.startBtnOverdue]}
                      onPress={() => onNavigate('Reading', {
                        material: {
                          id: item.materialId,
                          title: item.materialTitle,
                          content: item.materialContent,
                          difficultyLevel: item.materialDifficulty,
                        },
                        assignmentStudentId: item.id,
                        requiredScore: item.requiredScore,
                      })}
                    >
                      <Text style={styles.startBtnText}>
                        {isOverdue(item.deadline) ? '⚠️ Start (Overdue)' : '▶ Start Reading'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )
          }}
        />
      )}
    </AppLayout>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  emptyHint: { fontSize: 13, color: '#9ca3af', marginTop: 6, textAlign: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 32 },
  sectionHeader: { marginBottom: 8, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#2563eb' },
  cardDone: { borderLeftColor: '#16a34a', opacity: 0.8 },
  cardOverdue: { borderLeftColor: '#dc2626' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  doneBadge: { backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  doneBadgeText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
  overdueBadge: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  overdueBadgeText: { fontSize: 11, fontWeight: '700', color: '#dc2626' },
  dueBadge: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  dueBadgeText: { fontSize: 11, fontWeight: '700', color: '#d97706' },
  materialName: { fontSize: 13, color: '#6b7280', marginBottom: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  meta: { fontSize: 12, color: '#374151', backgroundColor: '#f3f4f6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  startBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  startBtnOverdue: { backgroundColor: '#dc2626' },
  startBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})
