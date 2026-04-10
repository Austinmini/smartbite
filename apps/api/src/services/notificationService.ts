// Notification service — sends push notifications via Expo Push API
// In V1, this is a stub that logs notifications. Wire to Expo Push in Sprint 8.

interface PushNotification {
  title: string
  body: string
  data?: Record<string, unknown>
}

export async function sendPushNotification(
  userId: string,
  notification: PushNotification
): Promise<void> {
  // TODO Sprint 8: look up user's Expo push token and call Expo Push API
  // For now, log the notification for observability
  console.log(`[push] userId=${userId} title="${notification.title}" body="${notification.body}"`)
}
