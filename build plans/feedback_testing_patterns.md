---
name: API testing patterns
description: Fastify v5 test setup — app.inject, jest.config.js specifics, mock patterns
type: feedback
---

Always use `app.inject()` for Fastify route tests. Never use Supertest.

**Why:** Fastify v5 is incompatible with Supertest — `app.server` fails without `await app.ready()`, and `app.close()` hangs indefinitely due to rate-limit plugin timers.

**How to apply:** Every API route test file must follow this exact pattern:

```typescript
import '../../test/mocks/prisma'
import '../../test/mocks/supabase'
import { buildApp } from '../../app'

let app: Awaited<ReturnType<typeof buildApp>>

beforeAll(async () => {
  app = await buildApp()
  await app.ready()
})
afterAll(async () => { await app.close() })
beforeEach(() => { jest.clearAllMocks() })

// Test:
const res = await app.inject({ method: 'POST', url: '/auth/login', payload: { ... }, headers: { ... } })
expect(res.statusCode).toBe(200)
expect(res.json()).toHaveProperty('access_token')
```

Additional rules:
- `jest.config.js` (not .ts) — sets `process.env.NODE_ENV = 'test'` and `process.env.JWT_SECRET_TEST` at the top before module.exports
- `setupFilesAfterEnv` is the correct key (not `setupFilesAfterFramework`)
- `forceExit: true` in jest config prevents Jest from hanging
- In-process module-level caches (like the Map in stores.ts) persist across tests in the same suite — use distinct coordinates/keys per test
- Mock external libs at the file level: `jest.mock('../../lib/mealme', () => ({ queryNearbyStores: jest.fn() }))`
