---
name: TDD preference
description: User requires test-first development — tests must be written and confirmed failing before any implementation
type: feedback
---

Always write tests before implementation. The sequence is: write test → confirm it fails → implement → confirm green.

**Why:** User explicitly asked for tests to drive development, not follow it.

**How to apply:** On every new feature or route, create the test file first. Run it to confirm failure. Only then write implementation. Use /tdd command to structure this. Never write implementation and tests simultaneously or implementation first.
