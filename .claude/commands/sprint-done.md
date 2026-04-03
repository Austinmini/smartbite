Review everything built this session for Sprint $ARGUMENTS.

1. **TDD audit** — for each feature built, confirm a test file exists and was written before the implementation. Flag any feature that shipped without tests.
2. **Run the full test suite** — `pnpm --filter @smartbite/api test --coverage` and `pnpm --filter @smartbite/mobile test --coverage`. All tests must be green. Fix any failures before continuing.
3. **Coverage check** — confirm coverage meets the sprint target from CLAUDE.md. Fail if below threshold.
4. **Mark completed tasks** — check off completed items in CLAUDE.md sprint checklist.
5. **Sync README** — run `/sync-progress` to mirror checklist state into README.md.
6. **Note any surprises** — add API quirks, changed decisions, or deferred items to the Notes section in CLAUDE.md.
7. **Suggest a commit message** — summarise what was built and confirm tests are green in the message body.
