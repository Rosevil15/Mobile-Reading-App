import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { Audio } from 'expo-av'
import { supabase } from '../../services/supabase'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'
import { AppLayout } from '../../components/AppLayout'

interface Props {
  studentId: string
  studentName: string
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
  onBack: () => void
}

interface ProgressRow {
  id: string; material_title: string; score: number
  fluency_rating: string; words_per_minute: number
  session_date: string; file_url: string | null
}

export function StudentDetailScreen({ studentId, activeScreen, title, onNavigate, onLogout, onBack }: Props) {
  const [records, setRecords] = useState<ProgressRow[]>([])
  const [loading, setLoading] = useState(true)
  const soundRef = useRef<Audio.Sound | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('progress_records').select(`id, material_title, score, fluency_rating, words_per_minute, session_date, recordings!left ( file_url )`).eq('student_id', studentId).order('session_date', { ascending: false })
      if (error) throw error
      setRecords((data ?? []).map((r: any) => ({ id: r.id, material_title: r.material_title, score: r.score, fluency_rating: r.fluency_rating, words_per_minute: r.words_per_minute, session_date: r.session_date, file_url: Array.isArray(r.recordings) ? (r.recordings[0]?.file_url ?? null) : (r.recordings?.file_url ?? null) })))
    } catch { setRecords([]) } finally { setLoading(false) }
  }, [studentId])

  useEffect(() => { fetchRecords(); return () => { soundRef.current?.unloadAsync() } }, [fetchRecords])

  const handlePlayback = useCallback(async (record: ProgressRow) => {
    if (!record.file_url) return
    if (soundRef.current) { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); soundRef.current = null }
    if (playingId === record.id) { setPlayingId(null); return }
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: record.file_url }, { shouldPlay: true })
      soundRef.current = sound; setPlayingId(record.id)
      sound.setOnPlaybackStatusUpdate((s) => { if (s.isLoaded && s.didJustFinish) { setPlayingId(null); sound.unloadAsync(); soundRef.current = null } })
    } catch { setPlayingId(null) }
  }, [playingId])

  return (
    <AppLayout role="teacher" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      <ConnectivityIndicator />
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Text style={styles.backText}>← Back to Dashboard</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>No progress records found.</Text></View>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.material_title}</Text>
              <Text style={styles.cardDate}>{new Date(item.session_date).toLocaleDateString()}</Text>
              <View style={styles.statsRow}>
                <Stat label="Score" value={`${item.score}/100`} />
                <Stat label="Fluency" value={item.fluency_rating} />
                <Stat label="WPM" value={String(item.words_per_minute)} />
              </View>
              {item.file_url != null && (
                <TouchableOpacity style={[styles.playBtn, playingId === item.id && styles.playBtnActive]} onPress={() => handlePlayback(item)}>
                  <Text style={styles.playBtnText}>{playingId === item.id ? '⏹ Stop' : '▶ Play Recording'}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </AppLayout>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#6b7280', textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  backBtn: { marginBottom: 12 },
  backText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 16, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardDate: { fontSize: 13, color: '#6b7280', marginTop: 2, marginBottom: 10 },
  statsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 15, fontWeight: '700', color: '#1d4ed8' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  playBtn: { backgroundColor: '#2563eb', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start' },
  playBtnActive: { backgroundColor: '#dc2626' },
  playBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
})
