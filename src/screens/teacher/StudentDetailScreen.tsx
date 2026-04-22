import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { Audio } from 'expo-av'
import { supabase } from '../../services/supabase'
import type { TeacherStackParamList } from './DashboardScreen'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'

type Props = DrawerScreenProps<TeacherStackParamList, 'StudentDetail'>

interface ProgressRow {
  id: string
  material_title: string
  score: number
  fluency_rating: string
  words_per_minute: number
  session_date: string
  file_url: string | null
}

/**
 * Displays a selected student's progress records fetched from Supabase.
 * Records with an associated recording show a playback button.
 * Requirements: 6.3, 6.4, 6.5
 */
export function StudentDetailScreen({ route }: Props) {
  const { studentId } = route.params
  const [records, setRecords] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const soundRef = useRef<Audio.Sound | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('progress_records')
        .select(`
          id,
          material_title,
          score,
          fluency_rating,
          words_per_minute,
          session_date,
          recordings!left ( file_url )
        `)
        .eq('student_id', studentId)
        .order('session_date', { ascending: false })

      if (error) throw error

      const rows: ProgressRow[] = (data ?? []).map((r: any) => ({
        id: r.id,
        material_title: r.material_title,
        score: r.score,
        fluency_rating: r.fluency_rating,
        words_per_minute: r.words_per_minute,
        session_date: r.session_date,
        file_url: Array.isArray(r.recordings)
          ? (r.recordings[0]?.file_url ?? null)
          : (r.recordings?.file_url ?? null),
      }))

      setRecords(rows)
    } catch {
      setRecords([])
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    fetchRecords()
    return () => {
      soundRef.current?.unloadAsync()
    }
  }, [fetchRecords])

  const handlePlayback = useCallback(async (record: ProgressRow) => {
    if (!record.file_url) return

    if (soundRef.current) {
      await soundRef.current.stopAsync()
      await soundRef.current.unloadAsync()
      soundRef.current = null
    }

    if (playingId === record.id) {
      setPlayingId(null)
      return
    }

    try {
      const { sound } = await Audio.Sound.createAsync(
        { uri: record.file_url },
        { shouldPlay: true },
      )
      soundRef.current = sound
      setPlayingId(record.id)
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlayingId(null)
          sound.unloadAsync()
          soundRef.current = null
        }
      })
    } catch {
      setPlayingId(null)
    }
  }, [playingId])

  if (loading) {
    return (
      <View style={styles.screen}>
        <ConnectivityIndicator />
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" accessibilityLabel="Loading progress records" />
        </View>
      </View>
    )
  }

  if (records.length === 0) {
    return (
      <View style={styles.screen}>
        <ConnectivityIndicator />
        <View style={styles.center}>
          <Text style={styles.emptyText}>No progress records found for this student.</Text>
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
        renderItem={({ item }) => (
          <RecordCard
            record={item}
            isPlaying={playingId === item.id}
            onPlay={handlePlayback}
          />
        )}
      />
    </View>
  )
}

interface RecordCardProps {
  record: ProgressRow
  isPlaying: boolean
  onPlay: (record: ProgressRow) => void
}

function RecordCard({ record, isPlaying, onPlay }: RecordCardProps) {
  const date = new Date(record.session_date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{record.material_title}</Text>
      <Text style={styles.cardDate}>{date}</Text>
      <View style={styles.statsRow}>
        <Stat label="Score" value={`${record.score}/100`} />
        <Stat label="Fluency" value={record.fluency_rating} />
        <Stat label="WPM" value={String(record.words_per_minute)} />
      </View>
      {record.file_url != null && (
        <TouchableOpacity
          style={[styles.playButton, isPlaying && styles.playButtonActive]}
          onPress={() => onPlay(record)}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Stop recording playback' : 'Play recording'}
        >
          <Text style={styles.playButtonText}>{isPlaying ? '⏹ Stop' : '▶ Play Recording'}</Text>
        </TouchableOpacity>
      )}
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
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardDate: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  playButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  playButtonActive: { backgroundColor: '#dc2626' },
  playButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
