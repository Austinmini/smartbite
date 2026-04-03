Run a database operation in apps/api. Usage: /db $ARGUMENTS

Supported operations:
- `migrate`  — run `prisma migrate dev` (requires DATABASE_URL in .env)
- `generate` — run `prisma generate` to regenerate the Prisma client after schema changes
- `push`     — run `prisma db push` (schema push without migration file, use for prototyping)
- `studio`   — open Prisma Studio in the browser
- `reset`    — run `prisma migrate reset` (drops and recreates the dev DB — confirm with user first)

Always run `generate` automatically after any schema change, even if not explicitly asked.
Always run from the `apps/api` directory.
