export function getApiBaseUrl(): string {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (configuredUrl) return configuredUrl

  return 'http://localhost:3000'
}
