import { Platform } from 'react-native'

/**
 * TTSService wraps Expo Speech for native, falls back to Web Speech API on web.
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export class TTSService {
  private static readonly MIN_RATE = 0.5
  private static readonly MAX_RATE = 2.0
  private onWordCallback: ((wordIndex: number) => void) | null = null
  private onEndCallback: (() => void) | null = null

  setOnWord(cb: ((wordIndex: number) => void) | null) {
    this.onWordCallback = cb
  }

  setOnEnd(cb: (() => void) | null) {
    this.onEndCallback = cb
  }

  speak(text: string, rate: number): void {
    const clampedRate = Math.min(TTSService.MAX_RATE, Math.max(TTSService.MIN_RATE, rate))

    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.speechSynthesis) return
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = clampedRate

      // Use boundary event for accurate word sync
      utterance.onboundary = (event) => {
        if (event.name === 'word' && this.onWordCallback) {
          // Find which word index this character offset corresponds to
          const charIndex = event.charIndex
          const textBefore = text.substring(0, charIndex)
          const wordIndex = textBefore.split(/\s+/).filter(Boolean).length
          this.onWordCallback(wordIndex)
        }
      }

      utterance.onend = () => {
        this.onEndCallback?.()
      }

      utterance.onerror = () => {
        this.onEndCallback?.()
      }

      window.speechSynthesis.speak(utterance)
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
      this.onEndCallback?.()
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
