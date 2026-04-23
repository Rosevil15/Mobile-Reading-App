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

      // Step 1: get student's assignment rows
      const { data: asData, error: asErr } = await supabase
        .from('assignment_students')
        .select('id, completed, score, assignment_id')
        .eq('student_id', session.userId)

      if (asErr || !asData?.length) { setAssignments([]); setLoading(false); return }

      // Step 2: get assignment details
      const assignmentIds = asData.map((a: any) => a.assignment_id)
      const { data: aData } = await supabase
        .from('assignments')
        .select('id, title, deadline, required_score, material_id')
        .in('id', assignmentIds)

      // Step 3: get material details
      const materialIds = [...new Set((aData ?? []).map((a: any) => a.material_id))]
      const { data: mData } = await supabase
        .from('reading_materials')
        .select('id, title, content, difficulty_level')
        .in('id', materialIds)

      const aMap: Record<string, any> = {}
      ;(aData ?? []).forEach((a: any) => { aMap[a.id] = a })
      const mMap: Record<string, any> = {}
      ;(mData ?? []).forEach((m: any) => { mMap[m.id] = m })

      const mapped: Assignment[] = asData.map((row: any) => {
        const a = aMap[row.assignment_id] ?? {}
        const m = mMap[a.material_id] ?? {}
        return {
          id: row.id,
          assignmentId: a.id ?? '',
          title: a.title ?? '—',
          materialId: m.id ?? '',
          materialTitle: m.title ?? '—',
          materialContent: m.content ?? '',
          materialDifficulty: m.difficulty_level ?? 'easy',
          deadline: a.deadline ?? '',
          requiredScore: a.required_score ?? 0,
          completed: row.completed,
          score: row.score,
        }
      }).sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())

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
