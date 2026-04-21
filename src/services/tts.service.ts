import * as Speech from 'expo-speech'

/**
 * TTSService wraps Expo Speech to provide text-to-speech playback
 * with rate control and availability checking.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export class TTSService {
  private static readonly MIN_RATE = 0.5
  private static readonly MAX_RATE = 2.0

  /**
   * Speak the given text at the specified rate.
   * Rate is clamped to [0.5, 2.0] before being passed to Expo Speech.
   * Requirements: 3.1, 3.3
   */
  speak(text: string, rate: number): void {
    const clampedRate = Math.min(
      TTSService.MAX_RATE,
      Math.max(TTSService.MIN_RATE, rate)
    )
    Speech.speak(text, { rate: clampedRate })
  }

  /**
   * Stop speech playback immediately.
   * Requirements: 3.2
   */
  stop(): void {
    Speech.stop()
  }

  /**
   * Check whether the device speech engine is available.
   * Requirements: 3.4
   */
  async isAvailable(): Promise<boolean> {
    try {
      const voices = await Speech.getAvailableVoicesAsync()
      return voices.length > 0
    } catch {
      return false
    }
  }
}

export const ttsService = new TTSService()
