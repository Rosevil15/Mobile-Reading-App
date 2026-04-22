import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { supabase } from '../../services/supabase'
import { AppLayout } from '../../components/AppLayout'

interface Props {
  activeScreen: string
  title: string
  onNavigate: (screen: string, params?: any) => void
  onLogout: () => void
  onBack: () => void
}

type Difficulty = 'easy' | 'medium' | 'hard'
const DIFFICULTIES: { label: string; value: Difficulty; color: string }[] = [
  { label: 'Easy', value: 'easy', color: '#16a34a' },
  { label: 'Medium', value: 'medium', color: '#d97706' },
  { label: 'Hard', value: 'hard', color: '#dc2626' },
]

export function AddMaterialScreen({ activeScreen, title, onNavigate, onLogout, onBack }: Props) {
  const [materialTitle, setMaterialTitle] = useState('')
  const [content, setContent] = useState('')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!materialTitle.trim()) { Alert.alert('Missing title', 'Please enter a title.'); return }
    if (!content.trim()) { Alert.alert('Missing content', 'Please enter the passage content.'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('reading_materials').insert({ title: materialTitle.trim(), content: content.trim(), difficulty_level: difficulty })
      if (error) throw error
      Alert.alert('Success', 'Reading material added.', [{ text: 'OK', onPress: onBack }])
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save.')
    } finally { setSaving(false) }
  }

  return (
    <AppLayout role="teacher" activeScreen={activeScreen} title={title} onNavigate={onNavigate} onLogout={onLogout}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backText}>← Back to Dashboard</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Title</Text>
          <TextInput style={styles.input} placeholder="e.g. The Water Cycle" value={materialTitle} onChangeText={setMaterialTitle} editable={!saving} />

          <Text style={styles.label}>Difficulty Level</Text>
          <View style={styles.diffRow}>
            {DIFFICULTIES.map((d) => (
              <TouchableOpacity key={d.value} style={[styles.diffBtn, difficulty === d.value && { backgroundColor: d.color, borderColor: d.color }]} onPress={() => setDifficulty(d.value)} disabled={saving}>
                <Text style={[styles.diffText, difficulty === d.value && { color: '#fff' }]}>{d.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Reading Passage</Text>
          <TextInput style={styles.textArea} placeholder="Enter the full reading passage here..." value={content} onChangeText={setContent} multiline numberOfLines={10} textAlignVertical="top" editable={!saving} />
          <Text style={styles.charCount}>{content.length} characters</Text>

          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Material</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppLayout>
  )
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  backBtn: { marginBottom: 16 },
  backText: { color: '#2563eb', fontSize: 14, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827' },
  diffRow: { flexDirection: 'row', gap: 10 },
  diffBtn: { flex: 1, borderWidth: 1.5, borderColor: '#d1d5db', borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  diffText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  textArea: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 15, color: '#111827', minHeight: 200 },
  charCount: { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 4 },
  saveBtn: { backgroundColor: '#2563eb', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
})
