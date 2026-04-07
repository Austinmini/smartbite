---
name: Scalability findings — what to fix before 10k users
description: Architecture is sound. Four targeted fixes needed before hitting 10k users.
type: project
---

Architecture is fundamentally scalable (stateless API, Redis caching, BullMQ). Four gaps to address:

## Fix now (5 min)
**PgBouncer connection pooling** — Prisma opens a pool per process. Supabase Pro allows ~200 connections. Under 2–3 API instances at load, this exhausts.
- Enable PgBouncer in Supabase dashboard
- Append `?pgbouncer=true&connection_limit=1` to `DATABASE_URL`

## Fix in Sprint 5 (when building canonical price job)
**Canonical price recompute must be event-driven, not a cron** — a nightly full-table scan on `PriceObservation` will lock up as data grows.
- `POST /prices/observation` should enqueue a BullMQ job with `{ itemId, storeId }`
- Job queries only `scannedAt: { gte: subDays(new Date(), 7) }` — never without time bound
- Schema already has `@@index([storeId, scannedAt])` — use it

**PriceObservation archival** — at 10k active scanners, table hits 1–2M rows within months.
- Monthly archival job: move observations older than 90 days to `PriceObservationArchive`

## Fix in Sprint 7 (before launch)
**Plan generation must be async** — currently holds HTTP connection open 10–15s while awaiting Claude. At peak (Monday morning, everyone generating), this queues up against Anthropic rate limits.
- `POST /plans/generate` → enqueue BullMQ job → return `{ planId, status: "generating" }` immediately
- Mobile already polls `GET /plans/current` on home mount — no client change needed

## What does NOT need changing
- API horizontal scaling: already stateless, add Railway instances in config
- Redis: single instance fine to ~50k users
- Rate limiting: per-endpoint from Sprint 1
- Tier enforcement: server-side middleware
- Prisma query safety: parameterised by default

**Why:** recorded after architecture review at Sprint 4 completion. Apply each fix at the sprint where the relevant feature is built — don't optimise prematurely.
