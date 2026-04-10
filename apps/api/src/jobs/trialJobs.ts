// Trial lifecycle jobs — run via BullMQ cron workers
// expireTrials:          daily at 2am CT — downgrades expired trials
// sendTrialEndingReminders: daily at 10am CT — day-6 push to users about to lose trial

import { prisma } from '../lib/prisma'
import { sendPushNotification } from '../services/notificationService'
import { addDays, startOfDay } from 'date-fns'

// Downgrade PRO users whose trial has expired and have no active RevenueCat subscription
export async function expireTrials(): Promise<void> {
  const now = new Date()
  const expired = await prisma.user.findMany({
    where: {
      tier: 'PRO',
      trialEndsAt: { lt: now },
      revenueCatUserId: null, // no paid subscription
    },
    select: { id: true },
  })

  for (const user of expired) {
    await prisma.user.update({
      where: { id: user.id },
      data: { tier: 'FREE', trialEndsAt: null },
    })
    await sendPushNotification(user.id, {
      title: 'Your Pro trial has ended',
      body: 'Upgrade to Pro for $9.99/mo to keep price trends, AI suggestions, and more.',
      data: { screen: 'paywall' },
    })
  }
}

// Send day-6 reminder to users whose trial ends within the next 24 hours
export async function sendTrialEndingReminders(): Promise<void> {
  const now = new Date()
  const tomorrow = addDays(now, 1)
  const dayAfter = addDays(now, 2)

  const expiringSoon = await prisma.user.findMany({
    where: {
      tier: 'PRO',
      trialEndsAt: { gte: tomorrow, lt: dayAfter },
      revenueCatUserId: null,
    },
    select: { id: true },
  })

  for (const user of expiringSoon) {
    await sendPushNotification(user.id, {
      title: 'Pro trial ends tomorrow',
      body: "You've been using price trends, AI suggestions & unlimited plans. Keep it for $9.99/mo.",
      data: { screen: 'paywall' },
    })
  }
}

// BullMQ worker setup — call this from index.ts on server start
// Jobs run on a schedule; Redis connection required.
export async function startTrialJobWorkers() {
  // Only start workers when Redis is configured (not in test)
  if (process.env.NODE_ENV === 'test' || !process.env.REDIS_HOST) return

  try {
    const { Queue, Worker } = await import('bullmq')
    const connection = { host: process.env.REDIS_HOST ?? 'localhost', port: Number(process.env.REDIS_PORT ?? 6379) }

    // Trial expiry queue — daily at 2am CT (UTC-5 = 7am UTC)
    const expiryQueue = new Queue('trial-expiry', { connection })
    await expiryQueue.upsertJobScheduler('daily-expiry', { pattern: '0 7 * * *' }, {
      name: 'expire-trials',
      data: {},
    })

    new Worker('trial-expiry', async () => { await expireTrials() }, { connection })

    // Trial ending reminder queue — daily at 10am CT (UTC-5 = 3pm UTC)
    const reminderQueue = new Queue('trial-reminders', { connection })
    await reminderQueue.upsertJobScheduler('daily-reminder', { pattern: '0 15 * * *' }, {
      name: 'trial-ending-reminder',
      data: {},
    })

    new Worker('trial-reminders', async () => { await sendTrialEndingReminders() }, { connection })

    console.log('[jobs] Trial lifecycle workers started')
  } catch (err) {
    console.error('[jobs] Failed to start trial workers:', err)
  }
}
