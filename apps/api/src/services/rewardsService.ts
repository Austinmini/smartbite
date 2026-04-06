import { prisma } from '../lib/prisma'

export type BitesReason =
  | 'WELCOME_BONUS'
  | 'PRICE_SCAN'
  | 'PIONEER_SCAN'
  | 'VERIFIED_SCAN'
  | 'STALE_UPDATE'
  | 'STREAK_7_DAY'
  | 'STREAK_30_DAY'
  | 'WEEKLY_GOAL'
  | 'REFERRAL_BONUS'
  | 'REDEMPTION'
  | 'ADMIN_ADJUSTMENT'

export type BadgeType =
  | 'FIRST_SCAN'
  | 'STREAK_7_DAY'
  | 'STREAK_30_DAY'
  | 'PIONEER'
  | 'VERIFIED'
  | 'CENTURY'
  | 'PRICE_CHAMPION'
  | 'COMMUNITY_HERO'

export interface ScanObservation {
  id: string
  upc: string
  storeId: string
  storeName: string
  price: number
  userId: string
  scannedAt: Date
}

export interface RewardBreakdown {
  amount: number
  reason: BitesReason
}

export interface ScanRewardResult {
  totalAwarded: number
  breakdown: RewardBreakdown[]
}

// ── awardBites ────────────────────────────────────────────────────────────────

export async function awardBites(
  userId: string,
  amount: number,
  reason: BitesReason,
  referenceId?: string
): Promise<void> {
  await prisma.$transaction([
    prisma.bitesLedger.create({
      data: { userId, amount, reason, referenceId },
    }),
    prisma.bitesBalance.upsert({
      where: { userId },
      update: {
        balance: { increment: amount },
        lifetimeEarned: { increment: Math.max(0, amount) },
      },
      create: {
        userId,
        balance: amount,
        lifetimeEarned: Math.max(0, amount),
      },
    }),
  ])
  await checkAndAwardBadges(userId)
}

// ── processScanReward ─────────────────────────────────────────────────────────

export async function processScanReward(
  userId: string,
  observation: ScanObservation
): Promise<ScanRewardResult> {
  const rewards: RewardBreakdown[] = []

  // Base scan reward
  rewards.push({ amount: 5, reason: 'PRICE_SCAN' })

  // Pioneer bonus — first scan at this store across all users
  const existingScans = await prisma.priceObservation.count({
    where: { storeId: observation.storeId },
  })
  if (existingScans === 0) {
    rewards.push({ amount: 15, reason: 'PIONEER_SCAN' })
  }

  // Stale update bonus — canonical price hasn't been updated in 5+ days
  const canonical = await prisma.canonicalPrice.findUnique({
    where: { upc_storeId: { upc: observation.upc, storeId: observation.storeId } },
  })
  if (canonical) {
    const fiveDaysAgo = new Date()
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5)
    if (canonical.lastUpdated < fiveDaysAgo) {
      rewards.push({ amount: 5, reason: 'STALE_UPDATE' })
    }
  }

  // Award all
  for (const r of rewards) {
    await awardBites(userId, r.amount, r.reason, observation.id)
  }

  // Update scan streak
  await updateStreak(userId)

  // Increment scan count on profile
  await prisma.userProfile.update({
    where: { userId },
    data: { scanCount: { increment: 1 } },
  })

  return {
    totalAwarded: rewards.reduce((sum, r) => sum + r.amount, 0),
    breakdown: rewards,
  }
}

// ── updateStreak ──────────────────────────────────────────────────────────────

export async function updateStreak(userId: string): Promise<void> {
  const streak = await prisma.scanStreak.findUnique({ where: { userId } })
  const today = startOfDay(new Date())

  if (streak?.lastScanDate) {
    const lastDay = startOfDay(new Date(streak.lastScanDate))
    // Already scanned today — no update needed
    if (isSameDay(lastDay, today)) return
  }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  let newStreak = 1
  if (streak?.lastScanDate) {
    const lastDay = startOfDay(new Date(streak.lastScanDate))
    if (isSameDay(lastDay, yesterday)) {
      newStreak = streak.currentStreak + 1
    }
  }

  const longestStreak = Math.max(newStreak, streak?.longestStreak ?? 0)

  await prisma.scanStreak.upsert({
    where: { userId },
    update: {
      currentStreak: newStreak,
      longestStreak,
      lastScanDate: new Date(),
    },
    create: {
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastScanDate: new Date(),
    },
  })

  if (newStreak === 7) {
    await awardBites(userId, 25, 'STREAK_7_DAY')
  }
  if (newStreak === 30) {
    await awardBites(userId, 100, 'STREAK_30_DAY')
  }
}

// ── checkAndAwardBadges ───────────────────────────────────────────────────────

export async function checkAndAwardBadges(userId: string): Promise<void> {
  const [balance, profile, existing] = await Promise.all([
    prisma.bitesBalance.findUnique({ where: { userId } }),
    prisma.userProfile.findUnique({ where: { userId }, select: { scanCount: true } }),
    prisma.userBadge.findMany({ where: { userId } }),
  ])

  const has = (b: BadgeType) => existing.some((e: { badge: string }) => e.badge === b)
  const scanCount = profile?.scanCount ?? 0
  const lifetimeEarned = balance?.lifetimeEarned ?? 0

  const toAward: BadgeType[] = []
  if (!has('FIRST_SCAN') && scanCount >= 1) toAward.push('FIRST_SCAN')
  if (!has('CENTURY') && scanCount >= 100) toAward.push('CENTURY')
  if (!has('PRICE_CHAMPION') && lifetimeEarned >= 2000) toAward.push('PRICE_CHAMPION')

  await prisma.userBadge.createMany({
    data: toAward.map((badge) => ({ userId, badge })),
    skipDuplicates: true,
  })
}

// ── Date helpers ─────────────────────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
