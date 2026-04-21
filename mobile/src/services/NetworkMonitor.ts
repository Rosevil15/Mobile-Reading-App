import { Platform } from 'react-native';

class NetworkMonitor {
  async isOnline(): Promise<boolean> {
    if (Platform.OS === 'web') {
      return navigator.onLine;
    }
    try {
      const NetInfo = await import('@react-native-community/netinfo');
      const state = await NetInfo.default.fetch();
      return !!(state.isConnected && state.isInternetReachable);
    } catch { return true; }
  }

  subscribe(callback: (isOnline: boolean) => void): () => void {
    if (Platform.OS === 'web') {
      const onOnline = () => callback(true);
      const onOffline = () => callback(false);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);
      return () => {
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
      };
    }
    let unsubscribe: (() => void) | null = null;
    import('@react-native-community/netinfo').then(NetInfo => {
      unsubscribe = NetInfo.default.addEventListener((state: any) => {
        callback(!!(state.isConnected && state.isInternetReachable));
      });
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }
}

export const networkMonitor = new NetworkMonitor();
export default networkMonitor;
