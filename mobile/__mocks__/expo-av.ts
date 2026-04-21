// Mock for expo-av in test environment
export const Audio = {
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
  Recording: jest.fn().mockImplementation(() => ({
    prepareToRecordAsync: jest.fn().mockResolvedValue(undefined),
    startAsync: jest.fn().mockResolvedValue(undefined),
    stopAndUnloadAsync: jest.fn().mockResolvedValue(undefined),
    getURI: jest.fn().mockReturnValue('file:///mock/recording.m4a'),
    getStatusAsync: jest.fn().mockResolvedValue({
      durationMillis: 5000,
      isRecording: false,
    }),
  })),
  RecordingOptionsPresets: {
    HIGH_QUALITY: {
      android: { sampleRate: 44100 },
      ios: { sampleRate: 44100 },
    },
  },
};
