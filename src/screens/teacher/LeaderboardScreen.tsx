import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { AuthService } from '../../services/auth.service'
import { GamificationService } from '../../services/gamification.service'
import { AppLayout } from '../../components/AppLayout'

interface Props {
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
}

export function LeaderboardScreen({ activeScreen, title, onNavigate, onLogout }: Props) {
  const [loading, setLoading] = useState(true)
  const [entries, setEntries] = useState<{ name: string; email: string; points: number; streak: number; stars: number }[]>([])

  useEffect(() => {
    async function load() {
      const session = await AuthService.getSession()
      if (!session) return
      const data = await GamificationService.getLeaderboard(session.userId)
      setEntries(data)
      setLoading(false)
    }
    load()
  }, [])

  const medalColors = ['#f59e0b', '#9ca3af', '#b45309']
  const medals = ['🥇', '🥈', '🥉']

  return (
    <AppLayout role="teacher" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.heading}>🏆 Student Leaderboard</Text>

          {entries.length === 0 ? (
            <View style={styles.empty}><Text style={styles.emptyText}>No student data yet.</Text></View>
          ) : (
            entries.map((entry, i) => (
              <View key={i} style={[styles.row, i < 3 && { borderLeftColor: medalColors[i], borderLeftWidth: 4 }]}>
                <Text style={styles.rank}>{i < 3 ? medals[i] : `#${i + 1}`}</Text>
                <View style={styles.info}>
                  <Text style={styles.name}>{entry.name}</Text>
                  <Text style={styles.email}>{entry.email}</Text>
                </View>
                <View style={styles.stats}>
                  <Text style={styles.points}>{entry.points} pts</Text>
                  <Text style={styles.streak}>🔥 {entry.streak}d</Text>
                  <Text style={styles.stars}>{'⭐'.repeat(entry.stars) || '—'}</Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </AppLayout>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, paddingBottom: 32 },
  heading: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 16, textAlign: 'center' },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { fontSize: 15, color: '#9ca3af' },
  row: {
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 10,
    elevation: 2, gap: 12, borderLeftWidth: 0, borderLeftColor: 'transparent',
  },
  rank: { fontSize: 22, width: 36, textAlign: 'center' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#111827' },
  email: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  stats: { alignItems: 'flex-end', gap: 2 },
  points: { fontSize: 14, fontWeight: '800', color: '#7c3aed' },
  streak: { fontSize: 12, color: '#dc2626' },
  stars: { fontSize: 12 },
})
