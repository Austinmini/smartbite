---
name: Sprint 6 plan — Favourites, Collections, Feedback channel
description: Save and organise favourite recipes. In-app feedback and bug reporting.
type: project
---

# Sprint 6
> "I can save recipes I love, organise them, and tell the team what's broken"

**Status:** IMPLEMENTED CORE SLICE — follow-up polish remaining

---

## API tasks

### Favourites
- [x] `POST /favourites` — save recipe, returns 409 if already saved, 403 if free user at 10-item limit
- [x] `DELETE /favourites/:recipeId`
- [x] `PUT /favourites/:recipeId` — update rating (1–5), notes, timesCooked
- [x] `GET /favourites?sort=recent|mostCooked` — paginated

### Collections
- [x] `GET /collections`
- [x] `POST /collections` — create (returns 403 if free user already has 1)
- [x] `PUT /collections/:id` — rename / update emoji
- [x] `DELETE /collections/:id`
- [x] `POST /collections/:id/recipes` — add recipe
- [x] `DELETE /collections/:id/recipes/:recipeId`

### Feedback channel
- [x] `Feedback` model — userId?, type (BUG|FEATURE_REQUEST|PRICE_ISSUE|GENERAL), subject?, body, appVersion?, platform?
- [x] `POST /feedback` — authenticated, rate limited 5/hr, stores in DB
- [x] Migration for Feedback table

### Referral UI (backend already built in Sprint 1)
- [x] `GET /referral/code` — confirm working end-to-end
- [x] `GET /referral/stats` — { invited, converted, totalBitesEarned }

---

## Mobile tasks

### Favourites
- [x] `FavouriteButton` component — heart toggle
- [ ] Reanimated pop animation polish
- [x] `CollectionPicker` bottom sheet — list collections + "New collection" inline input
- [x] Wire to recipe detail screen

### Saved screen
- [x] 3 tabs: Collections grid, All saved, Most cooked (sorted by timesCooked)
- [ ] Collection detail screen — separate route polish still open
- [x] Rating + notes bottom sheet (long-press trigger on saved recipe card)
- [x] "Cook again" shortcut — adds recipe back to current week's plan in one tap
- [x] Empty state when no favourites yet

### Feedback channel
- [x] `FeedbackSheet` component — type picker (4 options), subject input, body multiline input, submit
- [x] Profile screen: "Send feedback" / "Contact us" button → opens FeedbackSheet
- [x] `scanner/success.tsx`: "Report wrong price" button → opens FeedbackSheet pre-filled with type=PRICE_ISSUE
- [x] Success toast: "Thanks! We'll review your feedback."

### Referral UI
- [x] Referral card in Profile screen — unique code + share button (native share sheet)
- [x] "X invited, Y converted" stats
- [ ] Post-upgrade success screen: referral CTA "Share with a friend — you both earn 150 Bites"

---

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

## Remaining follow-up
- Add the Reanimated heart pop animation on save
- Split collections into a dedicated collection detail route instead of inline grouped cards
- Add the post-upgrade referral CTA screen mentioned in the original scope
- Sync mobile saved/collections state with the new API routes instead of local-only persistence
