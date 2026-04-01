<div align="center">

```
 ██╗   ██╗ ██████╗
 ██║   ██║██╔════╝
 ██║   ██║██║
 ██║   ██║██║
 ╚██████╔╝╚██████╗
  ╚═════╝  ╚═════╝
```

# UltimateCommunity

**The open-source community platform with built-in AI social intelligence — self-host it on Cloudflare in minutes.**

[![License: Non-Commercial](https://img.shields.io/badge/License-Non--Commercial-red.svg?style=flat-square)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20Realtime-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](./CONTRIBUTING.md)

</div>

---

## What is this?

UltimateCommunity is an open-source, self-hostable community platform with 11 built-in modules — forums, ideas, events, courses, webinars, knowledge base, chat, members, notifications, and AI-powered social intelligence — all running on Cloudflare's global edge network. Deploy it on Cloudflare Pages + Workers with your own Supabase project and own your data completely. Released under a non-commercial open-source license: free to use, fork, and self-host.

---

## Live Demo

**[https://opensourcecommunity.io](https://opensourcecommunity.io)** — Sign up and explore a live community instance.

---

## 11 Modules

| Module | Description | Status |
|--------|-------------|--------|
| **Forums** | Threaded discussions, categories, reactions | ✅ Live |
| **Ideas** | Vote-based feature request board | ✅ Live |
| **Events** | In-person & virtual + RSVP | ✅ Live |
| **Knowledge Base** | Searchable docs and articles | ✅ Live |
| **Courses** | Structured learning paths and lessons | ✅ Live |
| **Webinars** | Live and recorded video sessions | ✅ Live |
| **Chat** | Real-time channels (Supabase Realtime) | ✅ Live |
| **Social Intelligence** | AI monitoring across Reddit, Twitter/X, LinkedIn | ✅ Live |
| **Members** | Member directory, profiles, roles, leaderboards | ✅ Live |
| **Notifications** | In-app alerts and email digests | ✅ Live |
| **Multilingual AI** | AI-powered translation to/from any language | 🗺️ Roadmap |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| **API** | Hono on Cloudflare Workers |
| **Database** | PostgreSQL (Supabase) + Drizzle ORM |
| **Auth** | Supabase Auth (email/password + OAuth) |
| **Realtime** | Supabase Realtime (chat) |
| **Storage** | Supabase Storage |
| **Hosting** | Cloudflare Pages (web) + Cloudflare Workers (API) |
| **Social Pipeline** | Cloudflare Worker + social API integrations |
| **Monorepo** | Turborepo + pnpm workspaces |

---

## Quick Start (Local Dev)

**Prerequisites:** Node.js 22+, pnpm 9+, Docker, Supabase CLI

```bash
git clone https://github.com/JonJLevesque/OpenSourceCommunity.git
cd OpenSourceCommunity
pnpm install

# Copy env examples
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env

# Start local Supabase
npx supabase start

# Push DB schema + seed
pnpm db:push && pnpm db:seed

# Start dev servers
pnpm dev

# Open http://localhost:3001 → /setup to create your community
```

The dev command starts all apps in parallel via Turborepo:

| App | URL |
|-----|-----|
| Frontend | http://localhost:3001 |
| API | http://localhost:8787 |
| Supabase Studio | http://localhost:54323 |

Visit `/setup` to create your community and admin account on first run.

---

## Deploy to Cloudflare (Production)

1. **Fork** this repository
2. **Connect Cloudflare Pages** — link your fork to a new Pages project, set the build command to `pnpm --filter web build` and output directory to `apps/web/.vercel/output/static`
3. **Set environment variables** in the Cloudflare Pages dashboard (see [Environment Variables](#environment-variables) below)
4. **Deploy the API worker** — configure `apps/api/wrangler.toml` with your domain and run `pnpm --filter @osc/api run deploy`
5. **Deploy the social pipeline worker** — `pnpm --filter @osc/social-pipeline run deploy`

Enable the `nodejs_compat` compatibility flag in Cloudflare Pages under Settings → Functions → Compatibility flags.

Full deployment details: [`/docs/self-hosting.md`](./docs/self-hosting.md) _(if present)_ or open a Discussion for help.

---

## Environment Variables

### `apps/web/.env.local`

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `NEXT_PUBLIC_API_URL` | API worker URL (e.g. `https://api.yourdomain.com`) |
| `NEXT_PUBLIC_APP_URL` | Your frontend domain (e.g. `https://yourdomain.com`) |
| `NEXT_PUBLIC_TENANT_SLUG` | Your community slug — required for single-domain deployments |

### API Worker (`apps/api/wrangler.toml` vars/secrets)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SUPABASE_JWT_SECRET` | JWT secret from Supabase project settings |
| `DEFAULT_TENANT_SLUG` | Default tenant slug for single-tenant deployments |
| `APP_DOMAIN` | Your app domain |

---

## Project Structure

```
apps/
  web/                  # Next.js frontend (Cloudflare Pages)
  api/                  # Hono API worker (Cloudflare Workers)
  social-pipeline/      # Social intelligence worker
packages/
  db/                   # Drizzle schema + migrations
  core/                 # ModuleRegistry, EventBus, shared types
  config/               # Shared tsconfig + eslint configs
```

---

## Contributing

Fork → branch → PR. All contributions are welcome — bug fixes, new features, docs, tests.

1. Check [open issues](https://github.com/JonJLevesque/OpenSourceCommunity/issues) before starting
2. For large changes, open an issue first to discuss the approach
3. Branch from `main`: `feat/your-feature`, `fix/your-fix`
4. Run `pnpm lint && pnpm typecheck` before pushing
5. Follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide including how to add a new module.

This project is built in public — contributions are genuinely welcome.

---

## Roadmap

- ActivityPub / Fediverse federation
- Multilingual AI (translate content on the fly)
- Slack bridge (sync Slack workspace with forums)
- Member gamification (badges, points, leaderboards)
- Mobile app

---

## License

Released under the **[OpenSourceCommunity Non-Commercial License](./LICENSE)**.

Free for personal, educational, and non-commercial use.

For commercial licensing: [hello@opensourcecommunity.io](mailto:hello@opensourcecommunity.io)

---

<div align="center">

Built in public by [JonJLevesque](https://github.com/JonJLevesque) and contributors.

[Star the repo if you find it useful](https://github.com/JonJLevesque/OpenSourceCommunity)

</div>
