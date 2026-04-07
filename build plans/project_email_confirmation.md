---
name: Email confirmation disabled in Supabase
description: Email confirmation was turned off for Sprint 1 dev testing — must be re-enabled before launch
type: project
---

Email confirmation is currently **disabled** in Supabase Auth settings (Authentication → Providers → Email → Confirm email = OFF).

**Why:** Turned off during Sprint 1 testing so signup works without clicking a confirmation email. Supabase returns no session when confirmation is required, which our signup route treats as an error.

**How to apply:** Before Sprint 8 (App Store ready), re-enable email confirmation and update the signup route to handle the "check your email" case — return a 201 with `{ requiresConfirmation: true }` instead of treating missing session as an error. Add a confirmation screen to the mobile onboarding flow.
