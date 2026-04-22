import React, { useCallback, useEffect, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { supabase } from '../../services/supabase'
import { AuthService } from '../../services/auth.service'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'
import { AppLayout } from '../../components/AppLayout'

export type TeacherStackParamList = {
  Dashboard: undefined
  StudentDetail: { studentId: string; studentName: string }
  AddMaterial: undefined
}

interface Props {
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
}

interface Student {
  id: string; name: string | null; email: string | null
  lastSession: string | null; avgScore: number | null; totalSessions: number
}

export function DashboardScreen({ activeScreen, title, onNavigate, onLogout }: Props) {
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<{ totalStudents: number; totalSessions: number; avgScore: number; activeThisWeek: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [teacherName, setTeacherName] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const session = await AuthService.getSession()
      if (!session) return
      setTeacherName(session.email.split('@')[0])
      const { data: profileData } = await supabase.from('profiles').select('id, name, email').eq('teacher_id', session.userId)
      const studentList = profileData ?? []
      const studentIds = studentList.map((s: any) => s.id)
      let progressData: any[] = []
      if (studentIds.length > 0) {
        const { data } = await supabase.from('progress_records').select('student_id, score, session_date').in('student_id', studentIds).order('session_date', { ascending: false })
        progressData = data ?? []
      }
      const enriched: Student[] = studentList.map((s: any) => {
        const records = progressData.filter((r: any) => r.student_id === s.id)
        const avgScore = records.length ? Math.round(records.reduce((sum: number, r: any) => sum + r.score, 0) / records.length) : null
        return { id: s.id, name: s.name, email: s.email, lastSession: records[0]?.session_date ?? null, avgScore, totalSessions: records.length }
      })
      const oneWeekAgo = new Date(); oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
      const allScores = progressData.map((r: any) => r.score)
      setStudents(enriched)
      setStats({ totalStudents: enriched.length, totalSessions: progressData.length, avgScore: allScores.length ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length) : 0, activeThisWeek: enriched.filter((s) => s.lastSession && new Date(s.lastSession) >= oneWeekAgo).length })
    } catch { setStudents([]) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <AppLayout role="teacher" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      <ConnectivityIndicator />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              <View style={styles.header}>
                <Text style={styles.greeting}>Welcome, {teacherName}</Text>
              </View>
              {stats && (
                <View style={styles.statsRow}>
                  <StatCard label="Students" value={String(stats.totalStudents)} color="#2563eb" />
                  <StatCard label="Sessions" value={String(stats.totalSessions)} color="#16a34a" />
                  <StatCard label="Avg Score" value={stats.avgScore ? `${stats.avgScore}%` : '—'} color="#d97706" />
                  <StatCard label="Active/Week" value={String(stats.activeThisWeek)} color="#7c3aed" />
                </View>
              )}
              <Text style={styles.sectionTitle}>{students.length === 0 ? 'No students yet' : 'Your Students'}</Text>
            </>
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No students associated with your account.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onNavigate('StudentDetail', { studentId: item.id, studentName: item.name ?? item.email ?? 'Student' })}>
              <View style={styles.cardLeft}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(item.name ?? item.email ?? 'S')[0].toUpperCase()}</Text></View>
                <View>
                  <Text style={styles.cardName}>{item.name ?? '—'}</Text>
                  <Text style={styles.cardEmail}>{item.email ?? ''}</Text>
                  {item.lastSession && <Text style={styles.cardDate}>Last: {new Date(item.lastSession).toLocaleDateString()}</Text>}
                </View>
              </View>
              <View style={styles.cardRight}>
                {item.avgScore !== null && <View style={styles.scoreBadge}><Text style={styles.scoreText}>{item.avgScore}%</Text></View>}
                <Text style={styles.sessionCount}>{item.totalSessions} sessions</Text>
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </AppLayout>
  )
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingBottom: 24 },
  header: { backgroundColor: '#1e3a5f', padding: 20 },
  greeting: { fontSize: 20, fontWeight: '700', color: '#fff' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  statCard: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10, alignItems: 'center', borderTopWidth: 3 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#6b7280', marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 10, borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#2563eb' },
  cardName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  cardEmail: { fontSize: 12, color: '#6b7280', marginTop: 1 },
  cardDate: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  scoreBadge: { backgroundColor: '#dcfce7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  scoreText: { fontSize: 14, fontWeight: '700', color: '#16a34a' },
  sessionCount: { fontSize: 11, color: '#9ca3af' },
  chevron: { fontSize: 20, color: '#d1d5db' },
  emptyBox: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
})
