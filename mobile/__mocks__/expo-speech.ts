// Mock for expo-speech in test environment
export const speak = jest.fn();
export const stop = jest.fn();
export const pause = jest.fn();
export const resume = jest.fn();
export const isSpeakingAsync = jest.fn().mockResolvedValue(false);
export const getAvailableVoicesAsync = jest.fn().mockResolvedValue([]);
