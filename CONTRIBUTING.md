# Contributing to UltimateCommunity

Thank you for your interest in contributing. This document covers local setup, the development workflow, and how to add a new module.

## Prerequisites

- **Node.js** 22+
- **pnpm** 9+ (`npm install -g pnpm`)
- **Docker** (for local Redis, Mailpit, and Ollama)
- **Supabase CLI** (`npm install -g supabase`)
- **Cloudflare account** — optional, only needed for deploying Workers or testing Cloudflare-specific behavior

## Local Setup

```bash
# 1. Clone and install
git clone https://github.com/JonJLevesque/OpenSourceCommunity.git
cd OpenSourceCommunity
pnpm install

# 2. Start Supabase (Postgres, Auth, Realtime, Storage, Studio)
npx supabase start
# Note the API URL, anon key, and service role key from the output

# 3. Start supplementary services
docker compose up -d
# Redis → localhost:6379
# Mailpit → localhost:8025  (local email UI)
# Ollama → localhost:11434  (local AI sentiment)

# Pull the Ollama model (first time only):
docker exec uc-ollama ollama pull llama3.2:1b

# 4. Copy and fill environment files
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.dev.vars.example apps/api/.dev.vars
cp apps/social-pipeline/.dev.vars.example apps/social-pipeline/.dev.vars

# 5. Set up the database
pnpm db:push    # Push Drizzle schema to Supabase Postgres
pnpm db:seed    # Seed a dev tenant

# 6. Start dev servers
pnpm dev
# Web:            http://localhost:3001
# API:            http://localhost:8787
# Supabase Studio: http://localhost:54323
```

Visit `http://localhost:3001/setup` to create your community and admin account.

## Project Structure

```
apps/
  api/              # Hono API — Cloudflare Workers
  web/              # Next.js 15 frontend — Cloudflare Pages
  social-pipeline/  # Social intelligence cron worker
packages/
  config/           # Shared tsconfig and eslint configs
  core/             # ModuleRegistry, EventBus, shared types
  db/               # Drizzle ORM schema, client, migrations, seed
```

## Development Workflow

1. **Branch naming**: `feat/short-description`, `fix/short-description`, `chore/short-description`
2. **Keep PRs focused** — one feature or fix per PR
3. **Run checks before pushing**:
   ```bash
   pnpm lint
   pnpm typecheck
   ```
4. **TypeScript strict mode** is enabled — no `any`, no `tsc` errors, no merges
5. **Server Components first** — reach for `'use client'` only when you need interactivity or browser APIs

## Adding a New Module

The platform uses a `ModuleDefinition` contract from `@osc/core`. New modules self-register and never require changes to core routing.

**1. Create the module directory in the API:**

```
apps/api/src/modules/<name>/
  index.ts    # ModuleDefinition export
  routes.ts   # Hono route handlers
  types.ts    # Module-specific types (optional)
```

**2. Implement `ModuleDefinition`:**

```typescript
// apps/api/src/modules/<name>/index.ts
import type { ModuleDefinition } from '@osc/core'
import { registerRoutes } from './routes'

export const myModule: ModuleDefinition = {
  id: 'my-module',
  name: 'My Module',
  routes: registerRoutes,
  permissions: ['my-module:read', 'my-module:write'],
  onEnable: async (tenantId) => { /* optional */ },
  onDisable: async (tenantId) => { /* optional */ },
}
```

**3. Register the module** in `apps/api/src/core/routes.ts`.

**4. Add a DB schema** in `packages/db/src/schema/<name>.ts`, export it from the package index, then generate a migration:

```bash
pnpm --filter @osc/db generate
```

**5. Add the module key** to `ModuleKey` in `packages/core/src/types.ts`.

**6. Add frontend pages** under `apps/web/app/(tenant)/<name>/`.

**7. Open a PR** describing the module, its use case, and any schema changes.

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(forums): add pinned thread support
fix(auth): correct cookie expiry on session refresh
chore(deps): bump drizzle-orm to 0.39
docs(readme): update quick start
test(ideas): add vote deduplication test
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`

## Opening Issues

- **Bug reports** — steps to reproduce, expected vs. actual behavior, OS + Node version
- **Feature requests** — describe the use case and who benefits
- **Questions** — use [GitHub Discussions](https://github.com/JonJLevesque/OpenSourceCommunity/discussions) rather than issues

## License

By contributing, you agree that your contributions will be licensed under the same [Non-Commercial License](./LICENSE) as the project.
