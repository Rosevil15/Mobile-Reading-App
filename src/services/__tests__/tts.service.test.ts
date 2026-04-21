import * as Speech from 'expo-speech'
import * as fc from 'fast-check'
import { TTSService } from '../tts.service'

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(),
}))

const mockSpeak = Speech.speak as jest.Mock
const mockStop = Speech.stop as jest.Mock
const mockGetVoices = Speech.getAvailableVoicesAsync as jest.Mock

describe('TTSService', () => {
  let service: TTSService

  beforeEach(() => {
    service = new TTSService()
    jest.clearAllMocks()
  })

  // ── speak() ──────────────────────────────────────────────────────────────

  describe('speak()', () => {
    it('calls Speech.speak with the provided text', () => {
      service.speak('Hello world', 1.0)
      expect(mockSpeak).toHaveBeenCalledWith('Hello world', expect.objectContaining({ rate: 1.0 }))
    })

    it('clamps rate below 0.5 to 0.5', () => {
      service.speak('test', 0.1)
      expect(mockSpeak).toHaveBeenCalledWith('test', expect.objectContaining({ rate: 0.5 }))
    })

    it('clamps rate above 2.0 to 2.0', () => {
      service.speak('test', 5.0)
      expect(mockSpeak).toHaveBeenCalledWith('test', expect.objectContaining({ rate: 2.0 }))
    })

    it('passes rate of exactly 0.5 unchanged', () => {
      service.speak('test', 0.5)
      expect(mockSpeak).toHaveBeenCalledWith('test', expect.objectContaining({ rate: 0.5 }))
    })

    it('passes rate of exactly 2.0 unchanged', () => {
      service.speak('test', 2.0)
      expect(mockSpeak).toHaveBeenCalledWith('test', expect.objectContaining({ rate: 2.0 }))
    })

    // Feature: mobile-reading-app, Property 9: TTS speech rate validation
    it('accepts any rate in [0.5, 2.0] without clamping', () => {
      // Validates: Requirements 3.3
      fc.assert(
        fc.property(fc.float({ min: 0.5, max: 2.0, noNaN: true }), (rate) => {
          jest.clearAllMocks()
          service.speak('text', rate)
          const calledRate = mockSpeak.mock.calls[0][1].rate as number
          expect(calledRate).toBeGreaterThanOrEqual(0.5)
          expect(calledRate).toBeLessThanOrEqual(2.0)
          // Within range: rate should not be altered
          expect(Math.abs(calledRate - rate)).toBeLessThan(1e-5)
        }),
        { numRuns: 100 }
      )
    })

    it('clamps any rate outside [0.5, 2.0] to the nearest boundary', () => {
      // Validates: Requirements 3.3
      fc.assert(
        fc.property(
          fc.oneof(
            fc.float({ min: Math.fround(-100), max: Math.fround(0.4999), noNaN: true }),
            fc.float({ min: Math.fround(2.0001), max: Math.fround(100), noNaN: true })
          ),
          (rate) => {
            jest.clearAllMocks()
            service.speak('text', rate)
            const calledRate = mockSpeak.mock.calls[0][1].rate as number
            expect(calledRate).toBeGreaterThanOrEqual(0.5)
            expect(calledRate).toBeLessThanOrEqual(2.0)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  // ── stop() ───────────────────────────────────────────────────────────────

  describe('stop()', () => {
    it('calls Speech.stop', () => {
      service.stop()
      expect(mockStop).toHaveBeenCalledTimes(1)
    })
  })

  // ── isAvailable() ─────────────────────────────────────────────────────────

  describe('isAvailable()', () => {
    it('returns true when voices are available', async () => {
      mockGetVoices.mockResolvedValue([{ identifier: 'en-US', name: 'English', quality: 'Default', language: 'en-US' }])
      const result = await service.isAvailable()
      expect(result).toBe(true)
    })

    it('returns false when no voices are available', async () => {
      mockGetVoices.mockResolvedValue([])
      const result = await service.isAvailable()
      expect(result).toBe(false)
    })

    it('returns false when getAvailableVoicesAsync throws', async () => {
      mockGetVoices.mockRejectedValue(new Error('Speech engine unavailable'))
      const result = await service.isAvailable()
      expect(result).toBe(false)
    })
  })
})
