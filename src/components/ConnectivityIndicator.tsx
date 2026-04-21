import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, Animated } from 'react-native'
import NetInfo from '@react-native-community/netinfo'

interface ConnectivityIndicatorProps {
  /**
   * When true, shows a brief "Synced" indicator while online.
   * Requirements: 8.5
   */
  synced?: boolean
}

/**
 * Reusable connectivity indicator banner.
 *
 * - Shows an amber "Offline" banner when the device has no network connection.
 * - When back online and `synced` is true, briefly shows a green "Synced" indicator.
 * - Hides entirely when online and not in the synced flash state.
 *
 * Requirements: 7.4, 8.5
 */
export function ConnectivityIndicator({ synced = false }: ConnectivityIndicatorProps) {
  const [isConnected, setIsConnected] = useState<boolean>(true)
  const [showSynced, setShowSynced] = useState(false)
  const opacity = React.useRef(new Animated.Value(1)).current

  // Subscribe to network state changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true)
    })
    return unsubscribe
  }, [])

  // When synced prop flips to true while online, show the "Synced" flash then fade out
  useEffect(() => {
    if (synced && isConnected) {
      setShowSynced(true)
      opacity.setValue(1)
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }).start(() => setShowSynced(false))
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [synced, isConnected, opacity])

  if (!isConnected) {
    return (
      <View style={styles.offlineBanner} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <Text style={styles.offlineText}>Offline</Text>
      </View>
    )
  }

  if (showSynced) {
    return (
      <Animated.View
        style={[styles.syncedBanner, { opacity }]}
        accessibilityRole="status"
        accessibilityLiveRegion="polite"
      >
        <Text style={styles.syncedText}>Synced</Text>
      </Animated.View>
    )
  }

  return null
}

const styles = StyleSheet.create({
  offlineBanner: {
    backgroundColor: '#fef3c7',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
    alignItems: 'center',
  },
  offlineText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '600',
  },
  syncedBanner: {
    backgroundColor: '#d1fae5',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#6ee7b7',
    alignItems: 'center',
  },
  syncedText: {
    color: '#065f46',
    fontSize: 13,
    fontWeight: '600',
  },
})
