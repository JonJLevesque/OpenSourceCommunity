# Social Pipeline Setup Guide

The social pipeline worker monitors 11 platforms for brand mentions, competitor activity, and keyword matches. Every connector is **optional** — the pipeline runs fine with only the platforms you configure. You can start with Reddit (no credentials needed) and add others as you obtain API access.

---

## How it works

1. A Cloudflare cron job triggers the pipeline on a schedule (every 5 min for Twitter, every 10 for Reddit, hourly for LinkedIn/YouTube/etc.)
2. The pipeline fetches raw mentions from each platform using your API credentials
3. Each mention is deduplicated via Redis, enriched with AI sentiment analysis, and stored in `si_mentions`
4. Alert conditions are evaluated — volume spikes, sentiment surges, competitor mentions
5. You review mentions in the **Intelligence → Inbox** UI and see trends in **Intelligence → Sentiment**

---

## Platform Overview

| Platform | Credentials needed | What's monitored | Rate limit |
|----------|-------------------|-----------------|-----------|
| **Reddit** | None | Posts and comments matching keywords | ~60 req/min |
| **HackerNews** | None | Posts and comments | Liberal |
| **Twitter / X** | Bearer token | Tweets matching keywords | 10 req/15 min (free tier) |
| **GitHub** | Personal access token | Issues, PRs, Discussions | 5,000 req/hr |
| **YouTube** | API key | Video comments | 10,000 units/day |
| **Discord** | Bot token + channel IDs | Messages in configured channels | 50 req/sec |
| **LinkedIn** | OAuth2 access token | Posts matching keywords | ~100 req/day |
| **TikTok** | Client key + secret | Video descriptions | 1,000 req/day |
| **G2** | Partner API key | Product reviews | Varies by plan |
| **Trustpilot** | API key + business unit ID | Business reviews | 1,000 req/hr |
| **Product Hunt** | Developer token | Product launches and posts | 500 req/hr |

---

## Reddit

No credentials required. The Reddit connector uses the public JSON API.

**What it collects:** Post titles + text, and comments from subreddits that match your keyword groups.

**Setup:** No setup needed. Reddit will be included in any pipeline run automatically.

**Tips:**
- Terms like `my-product` work better than generic words — overly broad keywords will pull in noise
- The connector searches `r/all` by default; it will find posts across all public subreddits

---

## HackerNews

No credentials required. Uses the official Algolia HN Search API.

**What it collects:** Story titles and comments mentioning your keywords.

**Setup:** No setup needed.

---

## Twitter / X

**Credentials needed:** `TWITTER_BEARER_TOKEN`

**API tier required:** Basic ($100/mo) or higher. The free tier does not include search. The Academic/Essential tier may work but has very low rate limits.

**Getting a bearer token:**

1. Go to [developer.twitter.com](https://developer.twitter.com) and create an account
2. Create a new Project and App
3. In your App settings, go to **Keys and Tokens**
4. Copy the **Bearer Token** under "Authentication Tokens"
5. Set it as `TWITTER_BEARER_TOKEN`

**Rate limits:** The Recent Search endpoint allows 10 requests per 15 minutes on Basic tier. The pipeline runs every 5 minutes per tenant, so if you have many tenants you may hit limits.

**Set the secret:**
```bash
wrangler secret put TWITTER_BEARER_TOKEN
```

---

## GitHub

**Credentials needed:** `GITHUB_TOKEN`

**What it collects:** Issues, pull requests, and Discussions that mention your keywords across all of GitHub.

**Getting a token:**

**Option A — Classic Personal Access Token (easiest):**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click **Generate new token (classic)**
3. Select scopes: `public_repo` is sufficient for public repositories. No scopes needed for public content — the token just increases your rate limit from 60 to 5,000 req/hr
4. Copy the token and set it as `GITHUB_TOKEN`

**Option B — Fine-grained PAT (recommended for orgs):**
1. Go to GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Set resource owner to your org
3. Repository access: "All repositories" or specific repos
4. Permissions: **Issues** (Read-only), **Pull requests** (Read-only) — that's all you need
5. Note: Discussions require the GraphQL API which works with either token type

**Rate limits:**
- Unauthenticated: 60 req/hr (too low, always use a token)
- Authenticated: 5,000 req/hr REST + 5,000 points/hr GraphQL
- The connector makes 2 API calls per run (1 REST search + 1 GraphQL search)

**Set the secret:**
```bash
wrangler secret put GITHUB_TOKEN
```

---

## YouTube

**Credentials needed:** `YOUTUBE_API_KEY`

**What it collects:** Comments on YouTube videos whose titles or descriptions match your keywords.

**How it works:** The connector searches for videos matching your keywords, then fetches comments from each video. It caps at 10 videos × 50 comments = up to 500 mentions per run.

**Getting an API key:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Go to **APIs & Services → Library** and search for "YouTube Data API v3"
4. Click **Enable**
5. Go to **APIs & Services → Credentials**
6. Click **Create Credentials → API Key**
7. (Recommended) Click **Restrict Key** → set API restrictions to "YouTube Data API v3"
8. Copy the API key and set it as `YOUTUBE_API_KEY`

**Quota:**
- Free tier: **10,000 units/day**
- Each `search.list` call costs **100 units**
- Each `commentThreads.list` call costs **1 unit**
- One pipeline run = ~100 units (1 search) + up to 10 units (comments) = ~110 units
- At 1 run/hour, that's ~2,640 units/day — well within the free quota

> **Important:** YouTube's quota resets daily at midnight Pacific Time. If you exceed the quota, the connector will silently skip until midnight.

**Set the secret:**
```bash
wrangler secret put YOUTUBE_API_KEY
```

---

## Discord

**Credentials needed:** `DISCORD_BOT_TOKEN` + `DISCORD_CHANNEL_IDS`

**Important:** Discord's REST API has no keyword search for bots. The connector fetches recent messages from channels you specify and filters locally for your keywords. You must explicitly configure which channels to monitor.

**Creating a Discord bot:**

1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. Click **New Application**, give it a name
3. Go to the **Bot** tab
4. Click **Add Bot**
5. Under **Privileged Gateway Intents**, enable **MESSAGE CONTENT INTENT** — this is required to read message content
6. Copy the **Token** and set it as `DISCORD_BOT_TOKEN`

**Inviting the bot to your server:**

1. Go to **OAuth2 → URL Generator**
2. Scopes: `bot`
3. Bot Permissions: `Read Messages/View Channels`, `Read Message History`
4. Open the generated URL and invite the bot to your server

**Getting channel IDs:**

1. In Discord, go to User Settings → Advanced → Enable **Developer Mode**
2. Right-click any channel you want to monitor → **Copy Channel ID**
3. Comma-separate multiple IDs: `DISCORD_CHANNEL_IDS=123456789,987654321`

**Set the secrets:**
```bash
wrangler secret put DISCORD_BOT_TOKEN
wrangler secret put DISCORD_CHANNEL_IDS
```

> **Tip:** Create a read-only bot role in your Discord server and only grant it access to the channels you want monitored. Don't give it write permissions.

---

## LinkedIn

**Credentials needed:** `LINKEDIN_ACCESS_TOKEN` (and optionally `LINKEDIN_ORG_URN`)

**API access required:** LinkedIn's Community Management API requires an approved LinkedIn Partner application. This is the most difficult connector to set up.

**What it collects:** LinkedIn posts matching your keywords across the platform.

**Getting access:**

**Step 1 — Create a LinkedIn App:**
1. Go to [linkedin.com/developers/apps](https://www.linkedin.com/developers/apps)
2. Click **Create App**
3. Associate it with a LinkedIn Company Page (required)
4. Fill in the required fields and submit

**Step 2 — Request API products:**
In your app settings, go to **Products** and request:
- **Marketing Developer Platform** — gives you `r_organization_social` scope
- Alternatively: **Community Management API** if available in your region

> **Note:** Product approval can take days to weeks. LinkedIn manually reviews requests. Without approval, your token will not have the required scopes.

**Step 3 — Generate an access token:**
Once your app is approved:
1. Use the OAuth 2.0 Authorization Code Flow
2. Request scopes: `r_organization_social`, `r_liteprofile`
3. The access token expires — LinkedIn tokens last 60 days. You'll need to refresh them manually or implement a refresh flow

**Step 4 — Find your org URN (optional):**
If you want to scope monitoring to posts about your specific organization:
1. Go to your LinkedIn Company Page
2. The URL will be `linkedin.com/company/{slug}` — the numeric ID is visible in the page source or API responses
3. Format: `LINKEDIN_ORG_URN=urn:li:organization:12345`

**Rate limits:** ~100 API calls/day. The connector batches all keywords into one query per run to stay within this limit.

**Set the secrets:**
```bash
wrangler secret put LINKEDIN_ACCESS_TOKEN
wrangler secret put LINKEDIN_ORG_URN   # optional
```

---

## TikTok

**Credentials needed:** `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET`

**API access required:** TikTok Research API — requires an approved application. Not available to all developers.

**What it collects:** TikTok videos whose descriptions match your keywords.

**Getting Research API access:**

1. Go to [developers.tiktok.com](https://developers.tiktok.com)
2. Create an account and a new app
3. Under your app, apply for the **Research API** product
4. Fill in the research purpose, data usage, and privacy policy — TikTok reviews these manually
5. Once approved, you'll see `client_key` and `client_secret` in your app dashboard

> **Note:** TikTok Research API is intended for academic/research use. If your use case is commercial analytics, be sure your application describes that accurately.

**Rate limits:** The connector caps results at 20 videos per run (TikTok's API limit per page).

**Set the secrets:**
```bash
wrangler secret put TIKTOK_CLIENT_KEY
wrangler secret put TIKTOK_CLIENT_SECRET
```

---

## G2

**Credentials needed:** `G2_API_KEY` (and optionally `G2_PRODUCT_SLUG`)

**API access required:** G2 Partner API — requires approved partner status.

**What it collects:** Reviews of your product on G2, filtered by keywords.

**Getting Partner API access:**

1. Go to [sell.g2.com/partners/technology/api](https://sell.g2.com/partners/technology/api) and apply
2. Once approved, you'll receive a `PRIVATE-TOKEN` API key
3. Find your product slug in the G2 URL: `g2.com/products/{your-product-slug}/reviews`

**Set the secrets:**
```bash
wrangler secret put G2_API_KEY
wrangler secret put G2_PRODUCT_SLUG   # optional but recommended
```

---

## Trustpilot

**Credentials needed:** `TRUSTPILOT_API_KEY` + `TRUSTPILOT_BUSINESS_UNIT_ID`

**What it collects:** Customer reviews of your business on Trustpilot, filtered by keywords.

**Getting API access:**

1. Log into [business.trustpilot.com](https://business.trustpilot.com)
2. Go to **Integrations → API**
3. Create an API key application (select "Business" use case)
4. Copy your **API Key**

**Finding your Business Unit ID:**

```bash
curl "https://api.trustpilot.com/v1/business-units/find?name=YourBusinessName&apikey=YOUR_API_KEY"
```

The response will include your `id` — that's your Business Unit ID.

**Set the secrets:**
```bash
wrangler secret put TRUSTPILOT_API_KEY
wrangler secret put TRUSTPILOT_BUSINESS_UNIT_ID
```

---

## Product Hunt

**Credentials needed:** `PRODUCTHUNT_API_KEY`

**What it collects:** Product launches and posts on Product Hunt that mention your keywords.

**Getting a developer token:**

1. Go to [api.producthunt.com/v2/oauth/applications](https://api.producthunt.com/v2/oauth/applications) (requires a Product Hunt account)
2. Create a new application
3. For the token type, use **Developer Token** (not user OAuth) — it grants read access to public Product Hunt data without user authorization
4. Copy the **Developer Token**

**Rate limits:** 500 requests/hour. The connector makes 1 request per run.

**Set the secret:**
```bash
wrangler secret put PRODUCTHUNT_API_KEY
```

---

## Sentiment Analysis

The pipeline enriches every mention with a sentiment label (`positive`, `negative`, `neutral`, `mixed`) and a score. Three providers are supported:

### Cloudflare Workers AI (recommended for Cloudflare deployments)

Add the AI binding to `apps/social-pipeline/wrangler.toml`:

```toml
[ai]
binding = "AI"
```

No additional env vars needed — the `AI` binding is free with Cloudflare's Workers AI. Set `SENTIMENT_PROVIDER=cloudflare` or leave it unset (auto-detected when the binding is present).

### Ollama (recommended for local dev / self-hosted)

Run Ollama locally or on a server:

```bash
docker compose up -d   # starts Ollama via docker-compose.yml
docker exec osc-ollama ollama pull llama3.2:1b
```

Set:
```
SENTIMENT_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
```

### HuggingFace Inference API

Set:
```
SENTIMENT_PROVIDER=huggingface
HUGGINGFACE_API_TOKEN=your-token   # optional for public models, required for private
```

Uses the `distilbert-base-uncased-finetuned-sst-2-english` model by default. Works without a token for public models but rate limits are stricter.

---

## Testing the pipeline locally

Once you have at least one connector configured, test it:

```bash
# Start the pipeline worker locally
cd apps/social-pipeline
wrangler dev

# In another terminal, trigger a manual run:
curl -X POST http://localhost:8788/trigger \
  -H "Content-Type: application/json" \
  -d '{"platforms": ["reddit"]}'

# Check health of all connectors:
curl http://localhost:8788/health
```

Watch the wrangler dev logs — you'll see each connector's output, any API errors, and how many mentions were inserted.

---

## Adding keyword groups

Before the pipeline has anything to look for, you need to create keyword groups in the UI:

1. Go to **Intelligence → Keywords** in your community
2. Click **Add keyword group**
3. Set the type: `brand` (your brand), `competitor` (competitors), or `custom`
4. Add your keywords (comma or newline separated): product names, handles, hashtags, etc.
5. Select which platforms to monitor

The pipeline will start picking up mentions on its next scheduled run.

---

## Cron schedule

| Trigger | Platforms | Frequency |
|---------|-----------|-----------|
| `*/5 * * * *` | Twitter | Every 5 min |
| `*/10 * * * *` | Reddit | Every 10 min |
| `*/15 * * * *` | HackerNews, GitHub | Every 15 min |
| `0 * * * *` | LinkedIn, YouTube, G2, Trustpilot, Product Hunt | Every hour |

Discord and TikTok are not yet on the cron schedule by default — add them to the `getPlatformsForCron` map in `apps/social-pipeline/src/index.ts` to enable scheduled polling.

---

## Troubleshooting

**"Connector for 'X' not yet implemented"** — The platform is in the cron schedule but has no registered connector. Check that the required env vars are set.

**LinkedIn returns 0 results** — Your token likely doesn't have `r_organization_social` scope. Re-check that your LinkedIn app has the Marketing Developer Platform product approved and the token was generated with the correct scopes.

**YouTube quota exceeded** — The daily quota resets at midnight Pacific Time. Reduce the cron frequency or request a quota increase in Google Cloud Console.

**Discord messages have no content** — The `MESSAGE_CONTENT` privileged intent is not enabled on your bot. Enable it in the Discord Developer Portal under your app → Bot → Privileged Gateway Intents.

**TikTok returns auth errors** — The Research API uses client credentials flow (not user OAuth). Verify both `TIKTOK_CLIENT_KEY` and `TIKTOK_CLIENT_SECRET` are set correctly and your application has Research API access approved.

**Mentions show "neutral" for everything** — Sentiment provider isn't configured or the AI binding is missing. Check `SENTIMENT_PROVIDER` and your wrangler.toml AI binding.
