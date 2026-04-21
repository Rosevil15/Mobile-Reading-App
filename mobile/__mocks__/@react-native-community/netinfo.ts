// Mock for @react-native-community/netinfo in test environment
const NetInfo = {
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn().mockReturnValue(() => {}),
  useNetInfo: jest.fn().mockReturnValue({ isConnected: true, isInternetReachable: true }),
};

export default NetInfo;
