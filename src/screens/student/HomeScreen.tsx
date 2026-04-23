import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native'
import { supabase } from '../../services/supabase'
import { ReadingMaterialRepo } from '../../repositories/reading-material.repo'
import type { ReadingMaterial } from '../../types'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'
import { AppLayout } from '../../components/AppLayout'

export type StudentStackParamList = {
  StudentHome: undefined
  Reading: { material: ReadingMaterial }
  Profile: undefined
}

interface Props {
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
}

const repo = new ReadingMaterialRepo()

export function HomeScreen({ activeScreen, title, onNavigate, onLogout }: Props) {
  const [materials, setMaterials] = useState<ReadingMaterial[]>([])
  const [loading, setLoading] = useState(true)

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    try {
      let data: ReadingMaterial[] = []
      if (Platform.OS === 'web') {
        const { data: rows } = await supabase
          .from('reading_materials')
          .select('id, title, content, difficulty_level')
          .order('created_at', { ascending: true })
        data = (rows ?? []).map((r: any) => ({
          id: r.id, title: r.title, content: r.content, difficultyLevel: r.difficulty_level,
        }))
      } else {
        data = await repo.getAll()
      }
      setMaterials(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMaterials() }, [fetchMaterials])

  const difficultyColor: Record<string, string> = {
    easy: '#16a34a', medium: '#d97706', hard: '#dc2626',
  }

  return (
    <AppLayout role="student" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      <ConnectivityIndicator />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : materials.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No reading materials available.</Text>
        </View>
      ) : (
        <FlatList
          data={materials}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => onNavigate('Reading', { material: item })}
              accessibilityRole="button"
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={[styles.cardDifficulty, { color: difficultyColor[item.difficultyLevel] ?? '#555' }]}>
                {item.difficultyLevel.charAt(0).toUpperCase() + item.difficultyLevel.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </AppLayout>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#6b7280' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  cardDifficulty: { fontSize: 13, fontWeight: '500' },
})
