import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { AuthService } from '../../services/auth.service'
import { ProgressRepo } from '../../repositories/progress.repo'
import type { ProgressRecord } from '../../types'
import type { StudentStackParamList } from './HomeScreen'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'

type Props = DrawerScreenProps<StudentStackParamList, 'Profile'>

const repo = new ProgressRepo()

/**
 * Profile screen for students — displays their reading progress history.
 * Requirements: 5.2, 5.3, 5.5
 */
export function ProfileScreen(_props: Props) {
  const [records, setRecords] = useState<ProgressRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const session = await AuthService.getSession()
      if (!session) return
      const data = await repo.getByStudent(session.userId)
      if (!cancelled) {
        setRecords(data)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <View style={styles.screen}>
        <ConnectivityIndicator />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" accessibilityLabel="Loading progress" />
        </View>
      </View>
    )
  }

  if (records.length === 0) {
    return (
      <View style={styles.screen}>
        <ConnectivityIndicator />
        <View style={styles.center}>
          <Text style={styles.emptyText}>No reading sessions yet.</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <ConnectivityIndicator />
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ProgressCard record={item} />}
      />
    </View>
  )
}

function ProgressCard({ record }: { record: ProgressRecord }) {
  const date = record.sessionDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.title}>{record.materialTitle}</Text>
      <View style={styles.row}>
        <Stat label="Score" value={`${record.score}/100`} />
        <Stat label="Fluency" value={record.fluencyRating} />
        <Stat label="WPM" value={String(record.wordsPerMinute)} />
      </View>
      <Text style={styles.date}>{date}</Text>
    </View>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb' },
  emptyText: { fontSize: 16, color: '#6b7280' },
  list: { padding: 16, gap: 12, backgroundColor: '#f9fafb' },
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
  title: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 15, fontWeight: '700', color: '#2563eb' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  date: { fontSize: 12, color: '#9ca3af', textAlign: 'right' },
})
