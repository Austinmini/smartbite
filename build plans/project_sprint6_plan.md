---
name: Sprint 6 plan — Favourites, Collections, Feedback channel
description: Save and organise favourite recipes. In-app feedback and bug reporting.
type: project
---

# Sprint 6
> "I can save recipes I love, organise them, and tell the team what's broken"

**Status:** COMPLETE — 380 tests passing (262 API + 118 mobile)

---

## API tasks

### Favourites
- [ ] `POST /favourites` — save recipe, returns 409 if already saved, 403 if free user at 10-item limit
- [ ] `DELETE /favourites/:recipeId`
- [ ] `PUT /favourites/:recipeId` — update rating (1–5), notes, timesCooked
- [ ] `GET /favourites?sort=recent|mostCooked` — paginated

### Collections
- [ ] `GET /collections`
- [ ] `POST /collections` — create (returns 403 if free user already has 1)
- [ ] `PUT /collections/:id` — rename / update emoji
- [ ] `DELETE /collections/:id`
- [ ] `POST /collections/:id/recipes` — add recipe
- [ ] `DELETE /collections/:id/recipes/:recipeId`

### Feedback channel
- [ ] `Feedback` model — userId?, type (BUG|FEATURE_REQUEST|PRICE_ISSUE|GENERAL), subject?, body, appVersion?, platform?
- [ ] `POST /feedback` — authenticated, rate limited 5/hr, stores in DB
- [ ] Migration for Feedback table

### Referral UI (backend already built in Sprint 1)
- [ ] `GET /referral/code` — confirm working end-to-end
- [ ] `GET /referral/stats` — { invited, converted, totalBitesEarned }

---

## Mobile tasks

### Favourites
- [ ] `FavouriteButton` component — heart toggle with Reanimated pop animation
- [ ] `CollectionPicker` bottom sheet — list collections + "New collection" inline input
- [ ] Wire to recipe detail screen

### Saved screen
- [ ] 3 tabs: Collections grid, All saved, Most cooked (sorted by timesCooked)
- [ ] Collection detail screen — recipes within a collection
- [ ] Rating + notes bottom sheet (long-press trigger on saved recipe card)
- [ ] "Cook again" shortcut — adds recipe back to current week's plan in one tap
- [ ] Empty state when no favourites yet

### Feedback channel
- [ ] `FeedbackSheet` component — type picker (4 options), subject input, body multiline input, submit
- [ ] Profile screen: "Send feedback" / "Contact us" button → opens FeedbackSheet
- [ ] `scanner/success.tsx`: "Report wrong price" button → opens FeedbackSheet pre-filled with type=PRICE_ISSUE
- [ ] Success toast: "Thanks! We'll review your feedback."

### Referral UI
- [ ] Referral card in Profile screen — unique code + share button (native share sheet)
- [ ] "X invited, Y converted" stats
- [ ] Post-upgrade success screen: referral CTA "Share with a friend — you both earn 150 Bites"

---

## Tab bar cleanup (UX — do this sprint)

**Problem:** There are currently 7 tabs showing (Home, Explore, Pantry, Saved, Rewards, Profile, Reminders).
`reminders.tsx` lives in `(tabs)/` so Expo Router auto-registers it as a tab even though it has no explicit `Tabs.Screen` entry in `_layout.tsx`.

**Tasks:**
- [ ] Reduce to max 5 tabs — recommended: **Home, Explore, Pantry, Saved, Profile**
  - Rewards moves into Profile screen (already has a rewards section)
  - Reminders moves into Profile screen (already accessible from there)
  - Add `href: null` to any tab that should not appear in the bar, OR move the file out of `(tabs)/`
- [ ] Hide or disable tabs the user's tier can't access yet — use `href: null` in `Tabs.Screen` options based on `useAuthStore` tier
  - Explore (Spoonacular browse) — placeholder only, hide until Sprint 6 content is built
  - Any Pro-only tab should show an upgrade prompt rather than silently hiding
- [ ] Fix `reminders.tsx` being auto-registered — move it to `app/reminders/index.tsx` or suppress with `href: null` in `_layout.tsx`

## Definition of done
```
✓ Tapping heart saves recipe and shows CollectionPicker immediately
✓ Saved recipes persist across restarts
✓ Collections can be created, renamed, deleted
✓ "Most cooked" sort is accurate
✓ Rating and notes saved and visible on next open
✓ "Cook again" successfully adds recipe to current week's plan
✓ Empty state when no favourites
✓ Free user blocked at 10 favourites and 1 collection
✓ Feedback form submits and stores in DB (verify with Prisma Studio)
✓ "Report wrong price" from scanner pre-fills type correctly
✓ Referral code visible and shareable from Profile
```
