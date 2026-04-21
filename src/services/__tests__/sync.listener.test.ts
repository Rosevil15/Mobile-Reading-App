jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn(),
  },
}))

import NetInfo from '@react-native-community/netinfo'
import { startSyncListener } from '../sync.listener'

const mockAddEventListener = NetInfo.addEventListener as jest.Mock

describe('startSyncListener', () => {
  let capturedListener: (state: { isConnected: boolean | null }) => void
  let mockUnsubscribe: jest.Mock
  let mockSync: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()
    mockUnsubscribe = jest.fn()
    mockSync = jest.fn().mockResolvedValue({ uploadedRecordings: 0, uploadedProgressRecords: 0, errors: [] })

    mockAddEventListener.mockImplementation((listener: typeof capturedListener) => {
      capturedListener = listener
      return mockUnsubscribe
    })
  })

  it('returns an unsubscribe function', () => {
    const unsubscribe = startSyncListener({ sync: mockSync } as any)
    expect(typeof unsubscribe).toBe('function')
    unsubscribe()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('triggers sync when transitioning from offline to online', () => {
    startSyncListener({ sync: mockSync } as any)

    // First event: offline
    capturedListener({ isConnected: false })
    expect(mockSync).not.toHaveBeenCalled()

    // Second event: online (offline→online transition)
    capturedListener({ isConnected: true })
    expect(mockSync).toHaveBeenCalledTimes(1)
  })

  it('does NOT trigger sync when already online and stays online', () => {
    startSyncListener({ sync: mockSync } as any)

    capturedListener({ isConnected: true })
    capturedListener({ isConnected: true })

    expect(mockSync).not.toHaveBeenCalled()
  })

  it('does NOT trigger sync on the very first online event (no prior offline state)', () => {
    startSyncListener({ sync: mockSync } as any)

    // First event ever is online — previouslyConnected was null, not false
    capturedListener({ isConnected: true })
    expect(mockSync).not.toHaveBeenCalled()
  })

  it('triggers sync again after a second offline→online transition', () => {
    startSyncListener({ sync: mockSync } as any)

    capturedListener({ isConnected: false })
    capturedListener({ isConnected: true })
    capturedListener({ isConnected: false })
    capturedListener({ isConnected: true })

    expect(mockSync).toHaveBeenCalledTimes(2)
  })

  it('does NOT trigger sync when transitioning from online to offline', () => {
    startSyncListener({ sync: mockSync } as any)

    capturedListener({ isConnected: true })
    capturedListener({ isConnected: false })

    expect(mockSync).not.toHaveBeenCalled()
  })
})
