import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native'
import { AuthService } from '../../services/auth.service'
import { GamificationService, pointsToStars, BADGE_DEFINITIONS } from '../../services/gamification.service'
import type { GamificationData } from '../../services/gamification.service'
import { AppLayout } from '../../components/AppLayout'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'

interface Props {
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
}

export function RewardsScreen({ activeScreen, title, onNavigate, onLogout }: Props) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<GamificationData | null>(null)

  useEffect(() => {
    async function load() {
      const session = await AuthService.getSession()
      if (!session) return
      const d = await GamificationService.getStudentData(session.userId)
      setData(d)
      setLoading(false)
    }
    load()
  }, [])

  const stars = data ? pointsToStars(data.points) : 0
  const allBadgeKeys = Object.keys(BADGE_DEFINITIONS)
  const earnedKeys = new Set(data?.badges.map(b => b.key) ?? [])

  return (
    <AppLayout role="student" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      <ConnectivityIndicator />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <StatCard icon="⭐" label="Stars" value={'⭐'.repeat(stars) || '—'} color="#d97706" />
            <StatCard icon="💎" label="Points" value={String(data?.points ?? 0)} color="#7c3aed" />
            <StatCard icon="🔥" label="Streak" value={`${data?.streak ?? 0} days`} color="#dc2626" />
          </View>

          {/* Points to next star */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⭐ Star Progress</Text>
            <StarProgress points={data?.points ?? 0} />
          </View>

          {/* Badges */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🏅 Badges</Text>
            <View style={styles.badgeGrid}>
              {allBadgeKeys.map((key) => {
                const badge = BADGE_DEFINITIONS[key]
                const earned = earnedKeys.has(key)
                return (
                  <View key={key} style={[styles.badge, !earned && styles.badgeLocked]}>
                    <Text style={[styles.badgeIcon, !earned && styles.badgeIconLocked]}>{earned ? badge.icon : '🔒'}</Text>
                    <Text style={[styles.badgeLabel, !earned && styles.badgeLabelLocked]}>{badge.label}</Text>
                    <Text style={styles.badgeDesc}>{badge.description}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        </ScrollView>
      )}
    </AppLayout>
  )
}

function StarProgress({ points }: { points: number }) {
  const thresholds = [0, 10, 50, 150, 300, 500]
  const stars = pointsToStars(points)
  const nextThreshold = thresholds[stars + 1] ?? thresholds[thresholds.length - 1]
  const prevThreshold = thresholds[stars]
  const progress = stars >= 5 ? 1 : (points - prevThreshold) / (nextThreshold - prevThreshold)

  return (
    <View>
      <View style={styles.starRow}>
        {[1,2,3,4,5].map((s) => (
          <Text key={s} style={[styles.starIcon, s <= stars ? styles.starEarned : styles.starEmpty]}>⭐</Text>
        ))}
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` as any }]} />
      </View>
      <Text style={styles.progressLabel}>
        {stars >= 5 ? 'Max stars reached! 🎉' : `${points} / ${nextThreshold} points to next star`}
      </Text>
    </View>
  )
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 14, paddingBottom: 32 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', borderTopWidth: 3, elevation: 2 },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 14 },
  starRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  starIcon: { fontSize: 28 },
  starEarned: { opacity: 1 },
  starEmpty: { opacity: 0.25 },
  progressTrack: { height: 10, backgroundColor: '#e5e7eb', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  progressBar: { height: '100%', backgroundColor: '#d97706', borderRadius: 5 },
  progressLabel: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badge: { width: '47%', backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#bbf7d0' },
  badgeLocked: { backgroundColor: '#f9fafb', borderColor: '#e5e7eb' },
  badgeIcon: { fontSize: 28, marginBottom: 6 },
  badgeIconLocked: { opacity: 0.4 },
  badgeLabel: { fontSize: 13, fontWeight: '700', color: '#15803d', textAlign: 'center' },
  badgeLabelLocked: { color: '#9ca3af' },
  badgeDesc: { fontSize: 10, color: '#6b7280', textAlign: 'center', marginTop: 4 },
})
