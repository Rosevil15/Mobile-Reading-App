const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// On web, replace native-only modules with empty stubs
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const webStubs = [
      'expo-sqlite',
      'expo-av',
      'expo-speech',
    ]
    if (webStubs.some((m) => moduleName === m || moduleName.startsWith(m + '/'))) {
      return {
        filePath: require.resolve('./src/stubs/native-stub.js'),
        type: 'sourceFile',
      }
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
