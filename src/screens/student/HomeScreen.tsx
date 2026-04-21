import React, { useEffect, useLayoutEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { ReadingMaterialRepo } from '../../repositories/reading-material.repo'
import type { ReadingMaterial } from '../../types'
import { ConnectivityIndicator } from '../../components/ConnectivityIndicator'

export type StudentStackParamList = {
  StudentHome: undefined
  Reading: { material: ReadingMaterial }
  Profile: undefined
}

type Props = NativeStackScreenProps<StudentStackParamList, 'StudentHome'>

const repo = new ReadingMaterialRepo()

/**
 * Home screen for students — lists available reading materials.
 * Shows an offline banner when there is no network connection.
 * Requirements: 2.1, 2.3, 7.1, 7.4
 */
export function HomeScreen({ navigation }: Props) {
  const [materials, setMaterials] = useState<ReadingMaterial[]>([])
  const [loading, setLoading] = useState(true)

  // Add Profile button to header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          accessibilityRole="button"
          accessibilityLabel="View profile"
          style={{ marginRight: 4 }}
        >
          <Text style={{ color: '#2563eb', fontSize: 15, fontWeight: '600' }}>Profile</Text>
        </TouchableOpacity>
      ),
    })
  }, [navigation])

  const fetchMaterials = useCallback(async () => {
    setLoading(true)
    try {
      const data = await repo.getAll()
      setMaterials(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  const difficultyColor: Record<string, string> = {
    easy: '#16a34a',
    medium: '#d97706',
    hard: '#dc2626',
  }

  return (
    <View style={styles.container}>
      <ConnectivityIndicator />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" accessibilityLabel="Loading materials" />
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
              onPress={() => navigation.navigate('Reading', { material: item })}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, difficulty: ${item.difficultyLevel}`}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text
                style={[
                  styles.cardDifficulty,
                  { color: difficultyColor[item.difficultyLevel] ?? '#555' },
                ]}
              >
                {item.difficultyLevel.charAt(0).toUpperCase() + item.difficultyLevel.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 16, color: '#6b7280' },
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  cardDifficulty: { fontSize: 13, fontWeight: '500' },
})
