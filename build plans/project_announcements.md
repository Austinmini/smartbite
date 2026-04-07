---
name: Announcements feature — broadcast banners and modals to users
description: Admin-insertable announcements delivered to users on app open. Banner or modal, tier-targeted, dismissible.
type: project
---

## What it does
Allows the team to broadcast messages to users without an app update — outage notices, feature launches, promotions, maintenance windows.

## Schema

```prisma
model Announcement {
  id          String             @id @default(cuid())
  title       String
  body        String
  type        AnnouncementType   @default(BANNER)
  style       AnnouncementStyle  @default(INFO)
  targetTiers Tier[]             // empty = all tiers
  ctaText     String?
  ctaDeepLink String?            // e.g. "/(tabs)/rewards" or "https://..."
  active      Boolean            @default(true)
  startsAt    DateTime           @default(now())
  endsAt      DateTime?          // null = no expiry
  createdAt   DateTime           @default(now())
}

enum AnnouncementType {
  BANNER   // persistent strip at top of home screen, dismissible
  MODAL    // shown once per session on app open
}

enum AnnouncementStyle {
  INFO     // blue  — feature announcements, tips
  SUCCESS  // green — positive news, milestones
  WARNING  // amber — degraded service, upcoming maintenance
  PROMO    // purple — subscription promotions
}
```

## API
- `GET /announcements` — returns active, non-expired announcements filtered to user's tier. Cached in Redis 5min.
- No admin UI in V1 — insert directly into DB via SQL or Prisma Studio.

## Mobile
- Fetched on home screen mount alongside `GET /plans/current`
- Dismissed announcement IDs stored in AsyncStorage — survive app restarts
- `AnnouncementBanner` component: coloured strip with title, optional CTA button, ✕ dismiss
- MODAL type shown once per session (in-memory flag, not persisted — reappears next cold open)

## V1 launch use cases
- "Prices for HEB stores are being updated — scans may show stale data for a few hours" (WARNING)
- "🎉 SmartBite just launched in Dallas! Scan prices to help your community." (SUCCESS)
- "Try Pro free for 7 days — no credit card needed." (PROMO, targetTiers: [FREE])
- "Scheduled maintenance Sunday 2–4am CT. The app will be read-only." (WARNING)

## Implementation status
- [ ] Prisma schema + migration
- [ ] `GET /announcements` route
- [ ] `AnnouncementBanner` component (mobile)
- [ ] Home screen integration + AsyncStorage dismissal
- [ ] MODAL treatment for type=MODAL announcements
