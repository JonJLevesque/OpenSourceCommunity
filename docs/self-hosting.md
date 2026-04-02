# Self-Hosting Guide

This guide walks you through deploying OpenSourceCommunity on your own infrastructure using Cloudflare Workers + Pages and Supabase.

---

## Prerequisites

| Tool | Minimum version | Notes |
|------|----------------|-------|
| Node.js | 22+ | |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker | Any recent | For local dev only (Postgres + Redis) |
| [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) | 3+ | `pnpm add -g wrangler` |
| Cloudflare account | Free tier works | For Workers + Pages + AI |
| Supabase project | Free tier works | Auth + Realtime + Database |
| Upstash Redis | Free tier works | Rate-limiting + dedup |
| Resend account | Free tier works | Transactional email |

---

## 1. Clone and install

```bash
git clone https://github.com/JonJLevesque/OpenSourceCommunity.git
cd OpenSourceCommunity
pnpm install
```

---

## 2. Supabase setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Note your **Project URL**, **Anon Key**, **Service Role Key**, and **JWT Secret** — you'll need all four
3. Find your **Database connection string** in Project Settings → Database → Connection string (use the "Transaction" pooler string for Workers)

### Run migrations

```bash
DATABASE_URL="postgresql://..." pnpm --filter @osc/db migrate
```

### Apply Row-Level Security policies

Open `packages/db/src/rls.sql` and run the contents in your Supabase SQL Editor (or via `psql`). This is **required** — without it, data isolation between tenants is not enforced at the database level.

### Apply auth triggers

Open `packages/db/src/triggers.sql` and run it in the Supabase SQL Editor. This creates the `handle_new_user` trigger that automatically creates a `public.users` row and joins new signups to your community as members. Without this, users can log in but cannot access any community content.

### (Optional) Seed dev data

```bash
DATABASE_URL="postgresql://..." pnpm --filter @osc/db seed
# Creates a tenant with slug "dev" and an admin user
```

---

## 3. Local development

### Copy environment files

```bash
cp apps/api/.dev.vars.example        apps/api/.dev.vars
cp apps/web/.env.example             apps/web/.env.local
cp apps/social-pipeline/.dev.vars.example  apps/social-pipeline/.dev.vars
```

Fill in each file with your real values (see the [Environment Variables](#environment-variables) reference below).

> **Important:** `INTERNAL_SECRET` must be the **same value** in both `apps/api/.dev.vars` and `apps/social-pipeline/.dev.vars`. It authenticates internal HTTP calls from the pipeline worker to the API worker.

### Start local services

```bash
docker compose up -d
# PostgreSQL → localhost:5432
# Redis      → localhost:6379
# Mailpit    → localhost:8025  (email preview UI)
# Ollama     → localhost:11434 (local AI sentiment)

# Pull the sentiment model (first time only):
docker exec osc-ollama ollama pull llama3.2:1b
```

### Run

```bash
pnpm dev
# Web  → http://localhost:3001
# API  → http://localhost:8787
# Pipeline → http://localhost:8788
```

---

## 4. Production deployment

### 4a. Configure wrangler.toml files

**`apps/api/wrangler.toml`** — set your real values:

```toml
account_id = "your-cloudflare-account-id"  # from dash.cloudflare.com

[vars]
NODE_ENV = "production"
SUPABASE_URL = "https://yourproject.supabase.co"
CORS_ORIGINS = "https://yourdomain.com"
DEFAULT_TENANT_SLUG = "your-community-slug"  # slug you chose during /setup

# Uncomment and set your domain:
[[routes]]
pattern = "api.yourdomain.com/*"
zone_name = "yourdomain.com"
```

**`apps/social-pipeline/wrangler.toml`** — set:

```toml
account_id = "your-cloudflare-account-id"

[vars]
SUPABASE_URL = "https://yourproject.supabase.co"
```

### 4b. Deploy the API Worker

```bash
cd apps/api

# Set all secrets (one-time, stored in Cloudflare):
wrangler secret put DATABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put SUPABASE_JWT_SECRET
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put RESEND_API_KEY
wrangler secret put INTERNAL_SECRET   # must match pipeline's INTERNAL_SECRET

wrangler deploy
```

### 4c. Deploy the Social Pipeline Worker

```bash
cd apps/social-pipeline

wrangler secret put DATABASE_URL
wrangler secret put UPSTASH_REDIS_REST_URL
wrangler secret put UPSTASH_REDIS_REST_TOKEN
wrangler secret put INTERNAL_SECRET          # must match API's INTERNAL_SECRET
wrangler secret put API_BASE_URL             # e.g. https://api.yourdomain.com

# Optional social platform keys:
wrangler secret put TWITTER_BEARER_TOKEN
wrangler secret put REDDIT_CLIENT_ID
wrangler secret put REDDIT_CLIENT_SECRET

wrangler deploy
```

### 4d. Deploy the Web App (Cloudflare Pages)

```bash
cd apps/web

NEXT_PUBLIC_API_URL=https://api.yourdomain.com \
NEXT_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
NEXT_PUBLIC_APP_URL=https://yourdomain.com \
NEXT_PUBLIC_TENANT_SLUG=your-community-slug \
pnpm build:cf

wrangler pages deploy .vercel/output/static --project-name your-project-name
```

> `NEXT_PUBLIC_TENANT_SLUG` must match the slug you set during setup (e.g. `community`). It's baked in at build time and tells the web app which tenant to target on single-domain deployments.

### 4e. DNS configuration

| Record | Type | Value |
|--------|------|-------|
| `api.yourdomain.com` | Worker route (set in wrangler.toml) | Cloudflare Worker |
| `yourdomain.com` | Custom domain on CF Pages project | Cloudflare Pages |
| `*.yourdomain.com` | CNAME | CF Pages project domain (for tenant subdomains) |

---

## 5. Cloudflare Queue setup (optional)

The platform supports Cloudflare Queues for async mention processing. To enable:

1. Create a queue in the Cloudflare dashboard: `mention-processing`
2. Uncomment the `[[queues.producers]]` block in `apps/social-pipeline/wrangler.toml`
3. Uncomment the `[[queues.producers]]` block in `apps/api/wrangler.toml` (for the ingestion queue)

---

## 6. Creating your first tenant

After deployment, visit `https://yourdomain.com/setup`. The setup wizard will:

1. Create your community tenant with the slug and name you choose
2. Create your admin account (email + password)
3. Enable the modules you select

After setup completes, sign in at `/login` — you'll have full access to the admin panel at `/admin`.

> **Note:** The `/setup` endpoint is locked after the first tenant is created. If you need to re-run setup (e.g. testing a fresh install), delete the tenant row from your database first.

---

## Environment Variables

### `apps/api`

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Supabase transaction pooler) |
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (never expose to client) |
| `SUPABASE_JWT_SECRET` | ✅ | JWT secret from Supabase dashboard → Settings → API |
| `UPSTASH_REDIS_REST_URL` | ✅ | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | Upstash Redis REST token |
| `RESEND_API_KEY` | ✅ | Resend API key for transactional email |
| `INTERNAL_SECRET` | ✅ | Shared secret for pipeline→API internal routes. Any random string — must match pipeline's value |
| `CORS_ORIGINS` | ✅ | Comma-separated allowed origins (e.g. `https://yourdomain.com`) |
| `DEFAULT_TENANT_SLUG` | ✅ | Slug of your community (set in `[vars]` in wrangler.toml). Used as fallback when tenant can't be resolved from subdomain — required for single-domain deployments |
| `APP_DOMAIN` | Optional | Base domain for tenant subdomain resolution (e.g. `yourdomain.com`) |
| `EMAIL_PROVIDER` | Optional | `resend` (default) or `mailgun` |
| `EMAIL_FROM` | Optional | Sender address (e.g. `Community <hello@yourdomain.com>`) |
| `EMAIL_DOMAIN` | Optional | Mailgun sending domain |

### `apps/web`

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `NEXT_PUBLIC_API_URL` | ✅ | URL of the deployed API Worker |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL of the web app itself |
| `NEXT_PUBLIC_TENANT_SLUG` | ✅ | Slug of your community tenant. Baked in at build time — must match the slug you used during `/setup` |

### `apps/social-pipeline`

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Needed for some auth operations |
| `UPSTASH_REDIS_REST_URL` | ✅ | For mention deduplication |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | |
| `API_BASE_URL` | ✅ | URL of the API Worker (for alert callbacks) |
| `INTERNAL_SECRET` | ✅ | Must match API's `INTERNAL_SECRET` |
| `TWITTER_BEARER_TOKEN` | Optional | Twitter/X API v2 bearer token |
| `REDDIT_CLIENT_ID` | Optional | Reddit app client ID |
| `REDDIT_CLIENT_SECRET` | Optional | Reddit app client secret |
| `GITHUB_TOKEN` | Optional | GitHub personal access token or fine-grained PAT |
| `LINKEDIN_ACCESS_TOKEN` | Optional | OAuth2 token with `r_organization_social` scope |
| `LINKEDIN_ORG_URN` | Optional | e.g. `urn:li:organization:12345` — scopes monitoring to your org |
| `YOUTUBE_API_KEY` | Optional | Google Cloud API key with YouTube Data API v3 enabled |
| `DISCORD_BOT_TOKEN` | Optional | Discord bot token — requires `MESSAGE_CONTENT` intent |
| `DISCORD_CHANNEL_IDS` | Optional | Comma-separated channel IDs to monitor (e.g. `123456,789012`) |
| `TIKTOK_CLIENT_KEY` | Optional | TikTok Research API client key |
| `TIKTOK_CLIENT_SECRET` | Optional | TikTok Research API client secret |
| `G2_API_KEY` | Optional | G2 Partner API key (requires partner approval at data.g2.com) |
| `G2_PRODUCT_SLUG` | Optional | Your product's slug on G2 (e.g. `my-product`) |
| `TRUSTPILOT_API_KEY` | Optional | Trustpilot Business API key |
| `TRUSTPILOT_BUSINESS_UNIT_ID` | Optional | Your Trustpilot business unit ID |
| `PRODUCTHUNT_API_KEY` | Optional | Product Hunt developer token |
| `SENTIMENT_PROVIDER` | Optional | `cloudflare` \| `ollama` \| `huggingface` (default: cloudflare if AI binding present) |
| `OLLAMA_URL` | Optional | Base URL for Ollama (self-hosted AI) |
| `HUGGINGFACE_API_TOKEN` | Optional | HuggingFace Inference API token |

For a detailed per-platform setup guide including where to get credentials and rate limit information, see [**Social Pipeline Setup**](./social-pipeline.md).

---

## Troubleshooting

**"No tenant found for this domain"** — The tenant middleware couldn't resolve a tenant from the request host. Make sure you've created a tenant with the matching slug, and that `APP_DOMAIN` is set correctly in the API worker.

**"JWT expired" / auth errors** — Verify `SUPABASE_JWT_SECRET` matches the value in your Supabase dashboard under Settings → API → JWT Settings.

**Social pipeline not running** — Wrangler cron triggers only fire in production. Use `curl -X POST http://localhost:8788/trigger -d '{"platforms":["reddit"]}'` to test locally.

**Email not sending** — Confirm `RESEND_API_KEY` is set and the `EMAIL_FROM` domain is verified in your Resend account.
