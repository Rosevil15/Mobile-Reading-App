const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude backend folder from being watched by Metro
config.watchFolders = [];
config.resolver.blockList = [
  /mobile\/backend\/.*/,
  /\.kiro\/.*/,
];

module.exports = config;
