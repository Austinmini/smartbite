Write tests first, then implement. Usage: /tdd $ARGUMENTS

$ARGUMENTS describes the feature or function to build (e.g. "POST /auth/signup route").

## Required sequence — do not skip steps

### Step 1: Write the test file
- Create the test file before touching any implementation code.
- Tests must cover: happy path, auth failure (if applicable), validation failure, edge cases, and tier gate (if applicable).
- Use factories from `apps/api/src/test/factories.ts` for test data.
- Mock all external services (Anthropic, MealMe, Kroger, Supabase) — never hit real APIs.
- Run the tests immediately: `pnpm --filter @smartbite/api test -- --testPathPattern=<file>`.
- **Confirm they fail.** If they pass before implementation exists, the tests are wrong — fix them first.

### Step 2: Show the failure output
Report the exact failure reason. It must be a real failure (function not found, route returns 404, assertion fails) — not a syntax error or import error. Fix import/syntax issues silently before reporting.

### Step 3: Implement the minimum code to make the tests pass
- Write only what the tests require. No extra features, no speculative code.
- Do not modify the tests to match the implementation — change the implementation to match the tests.

### Step 4: Confirm green
Run the tests again. Report: "X passing, 0 failing."
Then run the full suite to confirm no regressions: `pnpm --filter @smartbite/api test`.

### Step 5: Commit
Tests and implementation travel together in the same commit.
