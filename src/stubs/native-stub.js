// Stub for native-only Expo modules on web platform
// expo-sqlite, expo-av, expo-speech are not available in browsers

module.exports = new Proxy({}, {
  get: (_, prop) => {
    // Return no-op functions and empty objects for any property access
    if (prop === '__esModule') return true
    if (prop === 'default') return new Proxy({}, {
      get: () => () => {},
    })
    return new Proxy(function () {}, {
      get: () => new Proxy(function () {}, { get: () => () => {} }),
      apply: () => Promise.resolve(null),
    })
  },
})
