---
name: In-app feedback and contact channel
description: Users can submit bug reports, feature requests, and general feedback from the Profile screen.
type: project
---

## Schema

```prisma
model Feedback {
  id         String       @id @default(cuid())
  userId     String?
  user       User?        @relation(fields: [userId], references: [id])
  type       FeedbackType
  subject    String?
  body       String
  appVersion String?      // from expo-constants
  platform   String?      // 'ios' | 'android' | 'web'
  createdAt  DateTime     @default(now())
}

enum FeedbackType {
  BUG
  FEATURE_REQUEST
  PRICE_ISSUE
  GENERAL
}
```

## API
- `POST /feedback` — authenticated. Stores in DB + optionally emails the team.
  - Rate limited: 5 per hour per user (prevent spam)
  - Body: `{ type, subject?, body }` 
  - Response: `{ id }` — 201

## Mobile — FeedbackSheet
- Entry point: Profile screen → "Send feedback" button
- Bottom sheet with:
  - Type selector: Bug / Feature request / Price issue / General
  - Subject (optional, single line)
  - Body (required, multiline, min 10 chars)
  - Submit button → success toast "Thanks! We'll review your feedback."
- Pre-fill type when triggered from a specific context (e.g. "Report wrong price" on scanner success → type=PRICE_ISSUE)

## Admin visibility (V1 — no admin UI needed)
Query directly: `SELECT * FROM "Feedback" ORDER BY "createdAt" DESC LIMIT 50;`
Or Prisma Studio: `pnpm db:studio`

## V2 additions
- Email notification to team on each submission (nodemailer or Resend)
- Slack webhook for real-time visibility
- Admin dashboard with feedback triage

## Implementation status
- [ ] Prisma schema + migration
- [ ] `POST /feedback` route
- [ ] `FeedbackSheet` component (mobile)
- [ ] Profile screen entry point
- [ ] "Report wrong price" trigger from scanner success screen
