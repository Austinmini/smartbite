module.exports = function (api) {
  api.cache(true)
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-transform-import-meta', // transforms import.meta for Metro web
      'react-native-reanimated/plugin',      // must be last
    ],
  }
}
