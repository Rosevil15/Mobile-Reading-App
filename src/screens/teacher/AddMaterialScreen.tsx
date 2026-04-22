import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import type { DrawerScreenProps } from '@react-navigation/drawer'
import { supabase } from '../../services/supabase'
import type { TeacherStackParamList } from './DashboardScreen'

type Props = DrawerScreenProps<TeacherStackParamList, 'AddMaterial'>

type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTIES: { label: string; value: Difficulty; color: string }[] = [
  { label: 'Easy', value: 'easy', color: '#16a34a' },
  { label: 'Medium', value: 'medium', color: '#d97706' },
  { label: 'Hard', value: 'hard', color: '#dc2626' },
]

export function AddMaterialScreen({ navigation }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Missing title', 'Please enter a title for the reading material.')
      return
    }
    if (!content.trim()) {
      Alert.alert('Missing content', 'Please enter the reading passage content.')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('reading_materials')
        .insert({
          title: title.trim(),
          content: content.trim(),
          difficulty_level: difficulty,
        })

      if (error) throw error

      Alert.alert('Success', 'Reading material added successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ])
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save reading material.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. The Water Cycle"
          value={title}
          onChangeText={setTitle}
          editable={!saving}
        />

        <Text style={styles.label}>Difficulty Level</Text>
        <View style={styles.difficultyRow}>
          {DIFFICULTIES.map((d) => (
            <TouchableOpacity
              key={d.value}
              style={[
                styles.difficultyBtn,
                difficulty === d.value && { backgroundColor: d.color, borderColor: d.color },
              ]}
              onPress={() => setDifficulty(d.value)}
              disabled={saving}
              accessibilityRole="radio"
              accessibilityState={{ checked: difficulty === d.value }}
            >
              <Text
                style={[
                  styles.difficultyText,
                  difficulty === d.value && { color: '#fff' },
                ]}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Reading Passage</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Enter the full reading passage here..."
          value={content}
          onChangeText={setContent}
          multiline
          numberOfLines={10}
          textAlignVertical="top"
          editable={!saving}
        />

        <Text style={styles.charCount}>{content.length} characters</Text>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save reading material"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save Material</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  scroll: { padding: 20, paddingBottom: 40 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
  },
  difficultyRow: { flexDirection: 'row', gap: 10 },
  difficultyBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  difficultyText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    minHeight: 200,
  },
  charCount: { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 4 },
  saveBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
