Run the full test suite across all packages.

1. Run `pnpm --filter @smartbite/api test` and report pass/fail counts.
2. Run `pnpm --filter @smartbite/mobile test` and report pass/fail counts.
3. If any tests fail, show the failure output and fix the failures before finishing.
4. Confirm final result: "X passing, 0 failing" for each package.

Do not mark any sprint task complete until this command passes clean.
