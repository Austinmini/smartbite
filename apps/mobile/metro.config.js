const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Enable package exports so reanimated v4 resolves its web-safe build
config.resolver.unstable_enablePackageExports = true

module.exports = config
