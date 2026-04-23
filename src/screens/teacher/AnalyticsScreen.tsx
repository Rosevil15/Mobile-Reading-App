import React, { useCallback, useEffect, useState } from 'react'
import {
  View, Text, ScrollView, ActivityIndicator,
  StyleSheet, TouchableOpacity,
} from 'react-native'
import { supabase } from '../../services/supabase'
import { AuthService } from '../../services/auth.service'
import { AppLayout } from '../../components/AppLayout'

interface Props {
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
}

interface StudentStat {
  id: string
  name: string | null
  email: string | null
  avgScore: number
  totalSessions: number
  lastSession: string | null
  wpm: number
}

interface WeeklyPoint { label: string; count: number; avgScore: number }

export function AnalyticsScreen({ activeScreen, title, onNavigate, onLogout }: Props) {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<StudentStat[]>([])
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [overallAvg, setOverallAvg] = useState(0)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const session = await AuthService.getSession()
      if (!session) return

      const { data: profileData } = await supabase
        .from('profiles').select('id, name, email').eq('teacher_id', session.userId)
      const studentList = profileData ?? []
      const ids = studentList.map((s: any) => s.id)

      let progressData: any[] = []
      if (ids.length > 0) {
        const { data } = await supabase
          .from('progress_records')
          .select('student_id, score, words_per_minute, session_date')
          .in('student_id', ids)
          .order('session_date', { ascending: false })
        progressData = data ?? []
      }

      // Per-student stats
      const stats: StudentStat[] = studentList.map((s: any) => {
        const recs = progressData.filter((r: any) => r.student_id === s.id)
        const avg = recs.length ? Math.round(recs.reduce((a: number, r: any) => a + r.score, 0) / recs.length) : 0
        const wpm = recs.length ? Math.round(recs.reduce((a: number, r: any) => a + r.words_per_minute, 0) / recs.length) : 0
        return { id: s.id, name: s.name, email: s.email, avgScore: avg, totalSessions: recs.length, lastSession: recs[0]?.session_date ?? null, wpm }
      })

      // Weekly data (last 7 days)
      const weekPoints: WeeklyPoint[] = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const label = d.toLocaleDateString(undefined, { weekday: 'short' })
        const dayRecs = progressData.filter((r: any) => {
          const rd = new Date(r.session_date)
          return rd.toDateString() === d.toDateString()
        })
        const avg = dayRecs.length ? Math.round(dayRecs.reduce((a: number, r: any) => a + r.score, 0) / dayRecs.length) : 0
        weekPoints.push({ label, count: dayRecs.length, avgScore: avg })
      }

      const allScores = progressData.map((r: any) => r.score)
      setStudents(stats)
      setWeekly(weekPoints)
      setTotalSessions(progressData.length)
      setOverallAvg(allScores.length ? Math.round(allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length) : 0)
    } catch { } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const topPerformers = [...students].sort((a, b) => b.avgScore - a.avgScore).slice(0, 3)
  const slowReaders = [...students].filter(s => s.wpm > 0).sort((a, b) => a.wpm - b.wpm).slice(0, 3)
  const needsHelp = [...students].filter(s => s.totalSessions > 0).sort((a, b) => a.avgScore - b.avgScore).slice(0, 3)
  const maxCount = Math.max(...weekly.map(w => w.count), 1)

  return (
    <AppLayout role="teacher" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>

          {/* Summary cards */}
          <View style={styles.summaryRow}>
            <SummaryCard label="Total Students" value={String(students.length)} color="#2563eb" icon="👥" />
            <SummaryCard label="Total Sessions" value={String(totalSessions)} color="#16a34a" icon="📖" />
            <SummaryCard label="Avg Score" value={`${overallAvg}%`} color="#d97706" icon="⭐" />
          </View>

          {/* Weekly activity chart */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📅 Weekly Activity</Text>
            <View style={styles.barChart}>
              {weekly.map((w, i) => (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barValue}>{w.count > 0 ? w.count : ''}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: Math.max(4, (w.count / maxCount) * 80), backgroundColor: w.count > 0 ? '#2563eb' : '#e5e7eb' }]} />
                  </View>
                  <Text style={styles.barLabel}>{w.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Weekly avg score */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📈 Weekly Avg Score</Text>
            <View style={styles.barChart}>
              {weekly.map((w, i) => (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barValue}>{w.avgScore > 0 ? `${w.avgScore}%` : ''}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.bar, { height: Math.max(4, (w.avgScore / 100) * 80), backgroundColor: w.avgScore >= 70 ? '#16a34a' : w.avgScore >= 40 ? '#d97706' : '#dc2626' }]} />
                  </View>
                  <Text style={styles.barLabel}>{w.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Top performers */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏆 Top Performers</Text>
            {topPerformers.length === 0
              ? <Text style={styles.emptyText}>No data yet</Text>
              : topPerformers.map((s, i) => (
                <StudentRow key={s.id} rank={i + 1} name={s.name ?? s.email ?? 'Student'} value={`${s.avgScore}% avg`} color="#16a34a" />
              ))
            }
          </View>

          {/* Needs attention (low scores) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⚠️ Needs Attention</Text>
            {needsHelp.length === 0
              ? <Text style={styles.emptyText}>No data yet</Text>
              : needsHelp.map((s, i) => (
                <StudentRow key={s.id} rank={i + 1} name={s.name ?? s.email ?? 'Student'} value={`${s.avgScore}% avg`} color="#dc2626" />
              ))
            }
          </View>

          {/* Slow readers */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🐢 Slow Readers</Text>
            {slowReaders.length === 0
              ? <Text style={styles.emptyText}>No data yet</Text>
              : slowReaders.map((s, i) => (
                <StudentRow key={s.id} rank={i + 1} name={s.name ?? s.email ?? 'Student'} value={`${s.wpm} WPM`} color="#d97706" />
              ))
            }
          </View>

          {/* All students table */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 All Students</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, styles.tableCellName]}>Student</Text>
              <Text style={styles.tableCell}>Sessions</Text>
              <Text style={styles.tableCell}>Avg Score</Text>
              <Text style={styles.tableCell}>WPM</Text>
            </View>
            {students.length === 0
              ? <Text style={styles.emptyText}>No students yet</Text>
              : students.map((s) => (
                <View key={s.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableCellName]} numberOfLines={1}>{s.name ?? s.email ?? '—'}</Text>
                  <Text style={styles.tableCell}>{s.totalSessions}</Text>
                  <Text style={[styles.tableCell, { color: s.avgScore >= 70 ? '#16a34a' : s.avgScore >= 40 ? '#d97706' : '#dc2626', fontWeight: '700' }]}>{s.avgScore}%</Text>
                  <Text style={styles.tableCell}>{s.wpm > 0 ? s.wpm : '—'}</Text>
                </View>
              ))
            }
          </View>

        </ScrollView>
      )}
    </AppLayout>
  )
}

function SummaryCard({ label, value, color, icon }: { label: string; value: string; color: string; icon: string }) {
  return (
    <View style={[styles.summaryCard, { borderTopColor: color }]}>
      <Text style={styles.summaryIcon}>{icon}</Text>
      <Text style={[styles.summaryValue, { color }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  )
}

function StudentRow({ rank, name, value, color }: { rank: number; name: string; value: string; color: string }) {
  return (
    <View style={styles.studentRow}>
      <Text style={styles.rank}>#{rank}</Text>
      <Text style={styles.studentName} numberOfLines={1}>{name}</Text>
      <Text style={[styles.studentValue, { color }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  summaryRow: { flexDirection: 'row', gap: 10 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderTopWidth: 3, elevation: 2 },
  summaryIcon: { fontSize: 22, marginBottom: 4 },
  summaryValue: { fontSize: 20, fontWeight: '800' },
  summaryLabel: { fontSize: 10, color: '#6b7280', textAlign: 'center', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 110 },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 9, color: '#6b7280', height: 14 },
  barTrack: { width: '60%', height: 80, justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: '#6b7280' },
  studentRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6', gap: 10 },
  rank: { fontSize: 13, fontWeight: '700', color: '#9ca3af', width: 24 },
  studentName: { flex: 1, fontSize: 14, color: '#111827', fontWeight: '500' },
  studentValue: { fontSize: 14, fontWeight: '700' },
  tableHeader: { flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', marginBottom: 4 },
  tableRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  tableCell: { flex: 1, fontSize: 13, color: '#374151', textAlign: 'center' },
  tableCellName: { flex: 2, textAlign: 'left', fontWeight: '500' },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', paddingVertical: 12 },
})
