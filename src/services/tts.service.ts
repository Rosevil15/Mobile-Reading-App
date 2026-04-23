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
  private boundaryFired = false

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

      // Pre-build word start positions for accurate charIndex → word index lookup
      const wordPositions: number[] = []
      const wordRegex = /\S+/g
      let m: RegExpExecArray | null
      while ((m = wordRegex.exec(text)) !== null) {
        wordPositions.push(m.index)
      }

      utterance.onboundary = (event) => {
        if (event.name !== 'word' || !this.onWordCallback) return
        this.boundaryFired = true
        const ci = event.charIndex
        // Find the word whose start position is closest to charIndex
        let idx = 0
        for (let i = 0; i < wordPositions.length; i++) {
          if (wordPositions[i] <= ci) idx = i
          else break
        }
        this.onWordCallback(idx)
      }

      utterance.onend = () => {
        this.onEndCallback?.()
      }

      utterance.onerror = () => {
        this.onEndCallback?.()
      }

      this.boundaryFired = false
      window.speechSynthesis.speak(utterance)

      // Fallback timer if onboundary doesn't fire (Safari)
      setTimeout(() => {
        if (!this.boundaryFired && this.onWordCallback) {
          const msPerWord = (1000 / clampedRate) * 0.4
          let idx = 0
          const timer = setInterval(() => {
            if (idx >= wordPositions.length) { clearInterval(timer); return }
            this.onWordCallback?.(idx++)
          }, msPerWord)
        }
      }, 300)
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
