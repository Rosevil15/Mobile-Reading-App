import { Platform } from 'react-native'

/**
 * TTSService wraps Expo Speech for native, falls back to Web Speech API on web.
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export class TTSService {
  private static readonly MIN_RATE = 0.5
  private static readonly MAX_RATE = 2.0

  speak(text: string, rate: number): void {
    const clampedRate = Math.min(TTSService.MAX_RATE, Math.max(TTSService.MIN_RATE, rate))

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = clampedRate
        window.speechSynthesis.speak(utterance)
      }
      return
    }

    const Speech = require('expo-speech')
    Speech.speak(text, { rate: clampedRate })
  }

  stop(): void {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
      }
      return
    }
    const Speech = require('expo-speech')
    Speech.stop()
  }

  async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined' && 'speechSynthesis' in window
    }
    try {
      const Speech = require('expo-speech')
      const voices = await Speech.getAvailableVoicesAsync()
      return voices.length > 0
    } catch {
      return false
    }
  }
}

export const ttsService = new TTSService()
