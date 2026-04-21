import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import axios from 'axios';
import { BASE_URL } from '../config/api';
import { useAppContext } from '../context/AppContext';
import authService from '../services/AuthService';
import localStorageService from '../services/LocalStorageService';
import { ProgressRecord, ReadingMaterial } from '../types';

interface MaterialWithScore extends ReadingMaterial {
  bestScore: number | null;
  downloading: boolean;
}

interface Props {
  // Minimal navigation prop — full wiring happens in task 18.1
  navigation?: { navigate: (screen: string, params?: object) => void };
}

export default function MaterialListScreen({ navigation }: Props) {
  const { isOnline, session } = useAppContext();

  const [materials, setMaterials] = useState<MaterialWithScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Requirement 3.2: only bundled or downloaded materials
      const all = await localStorageService.getMaterials();
      const available = all.filter((m) => m.bundled || !!m.downloadedAt);

      // Requirement 9.3: show best previous score per material
      let records: ProgressRecord[] = [];
      if (session?.userId) {
        records = await localStorageService.getProgressRecords(session.userId);
      }

      const withScores: MaterialWithScore[] = available.map((m) => {
        const materialRecords = records.filter((r) => r.materialId === m.id);
        const bestScore =
          materialRecords.length > 0
            ? Math.max(...materialRecords.map((r) => r.sessionScore))
            : null;
        return { ...m, bestScore, downloading: false };
      });

      setMaterials(withScores);
    } catch (err: any) {
      setError('Failed to load materials. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [session?.userId]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  // Requirement 3.4: download material when online
  async function handleDownload(material: MaterialWithScore) {
    setMaterials((prev) =>
      prev.map((m) => (m.id === material.id ? { ...m, downloading: true } : m))
    );
    try {
      const token = await authService.getToken();
      const response = await axios.get<ReadingMaterial>(
        `${BASE_URL}/materials/${material.id}/download`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      const downloaded: ReadingMaterial = {
        ...response.data,
        downloadedAt: new Date().toISOString(),
      };
      await localStorageService.saveMaterial(downloaded);
      // Refresh list so the Download button disappears
      await loadMaterials();
    } catch (err: any) {
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === material.id ? { ...m, downloading: false } : m
        )
      );
      setError('Download failed. Please try again.');
    }
  }

  // Requirement 3.3: navigate to ReadingSession with selected material
  function handleSelect(material: MaterialWithScore) {
    navigation?.navigate('ReadingSession', { material });
  }

  function levelColor(level: string): string {
    switch (level) {
      case 'beginner':
        return '#38a169';
      case 'intermediate':
        return '#d69e2e';
      case 'advanced':
        return '#e53e3e';
      default:
        return '#718096';
    }
  }

  function renderItem({ item }: { item: MaterialWithScore }) {
    const isDownloaded = !!item.downloadedAt;
    const showDownload = isOnline && !item.bundled && !isDownloaded;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelect(item)}
        testID={`material-item-${item.id}`}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.meta}>
            <View
              style={[styles.levelBadge, { backgroundColor: levelColor(item.level) }]}
            >
              <Text style={styles.levelText}>{item.level}</Text>
            </View>
            {item.bestScore !== null && (
              <Text style={styles.score} testID={`best-score-${item.id}`}>
                Best: {Math.round(item.bestScore)}%
              </Text>
            )}
          </View>
        </View>

        {showDownload && (
          <TouchableOpacity
            style={styles.downloadButton}
            onPress={() => handleDownload(item)}
            disabled={item.downloading}
            testID={`download-button-${item.id}`}
          >
            {item.downloading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.downloadText}>Download</Text>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90E2" testID="loading-indicator" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Reading Materials</Text>

      {error ? (
        <Text style={styles.error} testID="error-message">
          {error}
        </Text>
      ) : null}

      {materials.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>
            No materials available.{'\n'}
            {isOnline
              ? 'Download materials to get started.'
              : 'Connect to the internet to download materials.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={materials}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          testID="materials-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  score: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: '500',
  },
  downloadButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 12,
    minWidth: 90,
    alignItems: 'center',
  },
  downloadText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    color: '#e53e3e',
    fontSize: 14,
    textAlign: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
  },
});
