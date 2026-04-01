# OpenSourceCommunity — Product Requirements Document

**Product**: OpenSourceCommunity
**Version**: 1.0 (MVP)
**Status**: Draft
**Last Updated**: 2026-03-26

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Target Personas](#3-target-personas)
4. [Product Principles](#4-product-principles)
5. [Feature Breakdown](#5-feature-breakdown)
   - 5.1 [Core Platform](#51-core-platform)
   - 5.2 [Module: Forums](#52-module-forums--discussions)
   - 5.3 [Module: Ideas](#53-module-ideas--feature-requests)
   - 5.4 [Module: Events](#54-module-events)
   - 5.5 [Module: Courses](#55-module-courses--learning)
   - 5.6 [Module: Webinars](#56-module-webinars)
   - 5.7 [Module: Knowledge Base](#57-module-knowledge-base)
   - 5.8 [Module: Social Intelligence](#58-module-social-intelligence)
6. [Module Dependency Map](#6-module-dependency-map)
7. [Information Architecture](#7-information-architecture)
8. [Multi-Tenancy Model](#8-multi-tenancy-model)
9. [Pricing Model](#9-pricing-model)
10. [Competitive Landscape](#10-competitive-landscape)
11. [Success Metrics](#11-success-metrics)
12. [MVP Phasing](#12-mvp-phasing)
13. [Risks & Mitigations](#13-risks--mitigations)
14. [Open Questions](#14-open-questions)

---

## 1. Executive Summary

OpenSourceCommunity is a modular, multi-tenant B2B SaaS community platform that unifies two capabilities that today require separate tools and budgets: **community engagement** (forums, ideas, events, courses, webinars, knowledge base) and **cross-platform social intelligence** (mention tracking, sentiment analysis, competitor monitoring, advocate identification across 12+ platforms).

The product targets B2B SaaS companies that run customer communities for retention, support deflection, and expansion revenue. Today these teams cobble together Discourse or Bettermode for forums, Common Room or Orbit for social listening, Gainsight for CS health scores, and custom dashboards for analytics. The result is fragmented data, duplicated effort, and blind spots.

OpenSourceCommunity delivers a single platform where community managers run their community **and** understand what is being said about their product everywhere — with a modular architecture so customers pay only for what they use.

### Why now

Three converging trends make this the right moment:
1. B2B SaaS companies are shifting from sales-led to community-led growth
2. Social signal fragmentation across platforms has made manual monitoring untenable
3. Existing community platforms are either engagement-only or intelligence-only, forcing multi-vendor stacks

**Target ACV**: $15K–$80K (mid-market to enterprise)

---

## 2. Problem Statement

### The Two-Tool Tax

Community managers use one tool for their owned community (Discourse, Bettermode, Khoros) and a separate tool for social listening (Common Room, Orbit, Mention). This creates:

- Double the vendor cost and admin overhead
- No correlation between community activity and external brand perception
- Two separate member identity graphs that never merge — the person posting on your forum is also tweeting about you, but you would never know

### Module Lock-in

Platforms like Khoros and Gainsight sell monolithic suites. Customers pay for 20 features and use 4. Discourse is cheap but forum-only — adding ideas, events, or courses means more point solutions. Bettermode is modular but lacks any social intelligence.

### No Actionable Loop

Even when teams have both engagement and intelligence tools, there is no closed loop. A CS leader sees negative sentiment spiking on Reddit but has no way to pull that person into their community for resolution. A community manager sees a power user on the forum but does not know that same user is also an advocate on Twitter with 15K followers.

### Enterprise Readiness Gaps

Discourse lacks SAML SSO below Business tier ($500/month). Bettermode gates SSO to Premium (custom pricing). Neither has real CRM bidirectional sync. Community managers who need Salesforce integration resort to Zapier workarounds that break quarterly.

### Attribution Black Hole

Community teams cannot prove ROI. There is no attribution from "user participated in community" to "user expanded their contract." CS leaders and executive sponsors cannot justify budget without this data, so community programs get deprioritized at review time.

---

## 3. Target Personas

### Primary: Community Manager — "Maya"

- **Role**: Community Manager or Community Lead at a B2B SaaS company (Series B to public)
- **Day job**: Runs forums, plans events, manages moderation, surfaces product feedback, nurtures advocates
- **Goals**: Grow engagement, surface product feedback, reduce support tickets, identify advocates
- **Frustrations**: Toggling between 4+ tools daily; cannot prove community value to leadership; moderation is manual and slow; no visibility into what members say on external platforms
- **OpenSourceCommunity value**: Single pane for community operations and external listening; unified member profiles; actionable alerts

### Primary: Customer Success Leader — "Derek"

- **Role**: VP or Director of Customer Success
- **Day job**: Owns renewal and expansion goals; manages CS team; tracks account health
- **Goals**: Reduce churn, increase NPS, drive expansion, build self-serve support
- **Frustrations**: Community data is siloed from Salesforce/HubSpot; cannot correlate community engagement with renewal likelihood; no executive dashboard
- **OpenSourceCommunity value**: CRM sync; sentiment trends by account; community health metrics tied to CS outcomes

### Secondary: Developer Relations Lead — "Priya"

- **Role**: Head of DevRel or Developer Advocacy
- **Day job**: Builds technical community, runs developer events, creates educational content, tracks developer sentiment
- **Goals**: Build a technical community, track GitHub/HN/Reddit mentions, identify contributors, run technical events and courses
- **Frustrations**: Social listening tools do not cover GitHub Discussions or Hacker News; community platform does not support code blocks well; events and courses in separate tools
- **OpenSourceCommunity value**: Broad platform coverage including GitHub/HN; rich text with code support; events and courses in one place

### Budget Holder: Executive Sponsor — "Raj"

- **Role**: CRO, COO, or CEO
- **Day job**: Revenue and growth accountability; community is a line item they must justify
- **Goals**: Understand community ROI, justify investment, see community as a growth lever
- **Frustrations**: Gets anecdotal reports, not data; community feels like a cost center
- **OpenSourceCommunity value**: Executive dashboards (post-MVP attribution module); clear metrics connecting community activity to revenue and retention

---

## 4. Product Principles

1. **Modular by default** — Every engagement module can be enabled or disabled independently per tenant. Customers never pay for features they do not use. The platform must function fully with any single module active.

2. **Intelligence-informed engagement** — Social intelligence is not a bolt-on; it is woven into engagement modules. Forum threads surface related external mentions. Idea boards auto-link to tweets requesting the same feature. Member profiles merge internal and external activity.

3. **Enterprise-ready from day one** — SSO, RBAC, tenant isolation, audit logging, and CRM sync are not premium upsells — they ship in the base platform. This removes the most common blockers in mid-market and enterprise sales cycles.

4. **Community manager ergonomics first** — Every design decision optimizes for the daily workflow of a community manager. Dashboards, moderation queues, and alert systems are designed for the person who lives in this tool 8 hours a day.

5. **Prove the ROI** — Every feature should contribute data toward answering "what is the community worth?" Attribution is post-MVP, but the data model collects attribution-ready signals from day one.

6. **API-first architecture** — Every feature available in the UI is available via API. This enables customer integrations and ensures the platform can be embedded in existing workflows.

7. **Privacy and trust by design** — Social intelligence monitors public data only. Members own their data. GDPR, SOC 2 Type II, and tenant isolation are architectural constraints, not afterthoughts.

---

## 5. Feature Breakdown

### 5.1 Core Platform

The core platform provides the substrate all modules depend on. It is always active and cannot be disabled.

#### Authentication & Identity

| ID | User Story |
|----|-----------|
| US-CORE-01 | As an org admin, I can configure SSO via SAML 2.0 or OIDC so members authenticate through our identity provider |
| US-CORE-02 | As a member, I can sign up with email/password or social login (Google, GitHub, LinkedIn) |
| US-CORE-03 | As a member, my profile can link my external social handles (Twitter, LinkedIn, GitHub) voluntarily |

#### Roles & Permissions

| ID | User Story |
|----|-----------|
| US-CORE-04 | As an org admin, I can define custom roles with granular permissions (create content, moderate, manage members, configure modules, access analytics) |
| US-CORE-05 | As an org admin, built-in roles exist: Org Admin, Moderator, Member, Guest — custom roles extend these |
| US-CORE-06 | As an org admin, I can assign roles at the workspace level or scoped to a specific module/space (e.g., moderator of only the Ideas module) |

#### Workspace & Tenant Management

| ID | User Story |
|----|-----------|
| US-CORE-07 | As a platform operator, each customer org is a fully isolated tenant with its own subdomain (acme.opensourcecommunity.io) or custom domain |
| US-CORE-08 | As an org admin, I can configure workspace branding: logo, colors, fonts, custom CSS |
| US-CORE-09 | As an org admin, I can enable/disable individual modules from the workspace settings panel without engineering support |

#### Notifications

| ID | User Story |
|----|-----------|
| US-CORE-10 | As a member, I receive notifications (in-app, email, Slack/Teams webhook) for mentions, replies, event reminders, and followed content |
| US-CORE-11 | As a member, I can configure my notification preferences per channel and per module |

#### Search

| ID | User Story |
|----|-----------|
| US-CORE-12 | As a member, I can perform a unified search across all enabled modules (forums, KB, ideas, events, courses) with faceted filtering |

#### API & Webhooks

| ID | User Story |
|----|-----------|
| US-CORE-13 | As a developer, I can access all platform functionality via REST API (OpenAPI 3.1 spec) and GraphQL endpoint |
| US-CORE-14 | As an org admin, I can configure webhooks for key events (new member, new post, new idea vote, sentiment alert) to push to external systems |

#### CRM Integration

| ID | User Story |
|----|-----------|
| US-CORE-15 | As an org admin, I can connect Salesforce or HubSpot for bidirectional sync of contacts, accounts, and community activity |
| US-CORE-16 | As a Salesforce user, I see a "Community Activity" panel on the Account record showing recent posts, idea votes, event attendance, and sentiment score |

---

### 5.2 Module: Forums / Discussions

**Purpose**: Threaded discussions organized by category for peer-to-peer support, product discussion, and community interaction.

| ID | User Story |
|----|-----------|
| US-FORUM-01 | As a member, I can create a discussion thread with a title, rich text body (Markdown + WYSIWYG, images, code blocks, embeds), and category |
| US-FORUM-02 | As a member, I can reply to a thread; replies support 3 levels of nesting then go flat |
| US-FORUM-03 | As a member, I can @mention other members in a post and they receive a notification |
| US-FORUM-04 | As a member, I can react to posts with emoji reactions (configurable per org) |
| US-FORUM-05 | As a moderator, I can pin a thread to the top of a category or globally |
| US-FORUM-06 | As a moderator, I can lock, archive, move, merge, or split threads |
| US-FORUM-07 | As a moderator, I have a moderation queue showing reported content and auto-flagged content (first-time posters with links, etc.) |
| US-FORUM-08 | As a member, I can mark a reply as "accepted answer" on my own thread, converting it to a resolved Q&A |
| US-FORUM-09 | As an org admin, I can create categories and subcategories, each with their own permissions (public, members-only, role-restricted) |
| US-FORUM-10 | As a member, I can follow a category or thread to receive new-activity notifications |
| US-FORUM-11 | As a member, I can filter and sort threads by: newest, most active, unanswered, most votes |

---

### 5.3 Module: Ideas / Feature Requests

**Purpose**: Structured product feedback collection with voting, status tracking, and admin response — replacing scattered feedback in tickets, emails, and Slack.

| ID | User Story |
|----|-----------|
| US-IDEAS-01 | As a member, I can submit an idea with a title, description (rich text), and category/tag |
| US-IDEAS-02 | As a member, I can upvote an idea (one vote per member per idea) and see the total vote count |
| US-IDEAS-03 | As a member, I can comment on an idea to add context, use cases, or alternative approaches |
| US-IDEAS-04 | As an org admin, I can set an idea's status: New / Under Review / Planned / In Progress / Shipped / Declined — with a required status note |
| US-IDEAS-05 | As a member who voted on or submitted an idea, I receive a notification when the status changes |
| US-IDEAS-06 | As an org admin, I can merge duplicate ideas, preserving votes and comments from both |
| US-IDEAS-07 | As an org admin, I can view ideas sorted by: most votes, newest, trending (vote velocity), by status, by CRM account |
| US-IDEAS-08 | As an org admin, I can post an official response to an idea (distinguished visually from member comments) |
| US-IDEAS-09 | As a member, I can filter ideas by status, category, and my-votes |
| US-IDEAS-10 | As an org admin, I can link an idea to an external tracker (Jira, Linear, Shortcut) via URL |

---

### 5.4 Module: Events

**Purpose**: Virtual and in-person event management with RSVP, calendar integration, reminders, and recording hosting.

| ID | User Story |
|----|-----------|
| US-EVENT-01 | As an org admin or moderator, I can create an event with: title, description, date/time (with timezone), location (virtual link or physical address), capacity limit, and cover image |
| US-EVENT-02 | As a member, I can RSVP (Going / Interested / Not Going) and see the attendee list |
| US-EVENT-03 | As a member, I can add an event to my calendar (Google, Outlook, Apple) via .ics or direct integration |
| US-EVENT-04 | As a registered attendee, I receive email reminders 24h and 1h before the event (configurable) |
| US-EVENT-05 | As an org admin, I can upload a recording after an event and it becomes on-demand content on the event page |
| US-EVENT-06 | As an org admin, I can create recurring events (weekly, monthly) with a series view |
| US-EVENT-07 | As a member, I can browse upcoming events in list or calendar view, filtered by category/tag |
| US-EVENT-08 | As an org admin, I can see event analytics: RSVPs, attendance, recording views |

---

### 5.5 Module: Courses / Learning

**Purpose**: Structured learning paths with lessons, progress tracking, and completion certificates for customer education, onboarding, and enablement.

| ID | User Story |
|----|-----------|
| US-COURSE-01 | As an org admin, I can create a course with: title, description, cover image, and a sequence of lessons |
| US-COURSE-02 | As an org admin, I can create lessons within a course containing: rich text, embedded video, downloadable resources, and an optional quiz |
| US-COURSE-03 | As an org admin, I can organize courses into learning paths (ordered course sequences) |
| US-COURSE-04 | As a member, I can enroll in a course and track my progress (lessons completed / total) |
| US-COURSE-05 | As a member, when I complete all lessons (and pass required quizzes), I am marked as having completed the course |
| US-COURSE-06 | As a member, I can download a completion certificate (PDF) for completed courses; template is configurable by org admin |
| US-COURSE-07 | As an org admin, I can see course analytics: enrollments, completion rates, drop-off by lesson, quiz scores |
| US-COURSE-08 | As an org admin, I can restrict course access by role or group (e.g., customer-only, partner-only) |

---

### 5.6 Module: Webinars

**Purpose**: Live and on-demand webinar experience with Q&A and polls, integrated with existing streaming infrastructure.

| ID | User Story |
|----|-----------|
| US-WEBINAR-01 | As an org admin, I can create a webinar with: title, description, date/time, speakers, and a streaming integration (Zoom Webinar, YouTube Live, or custom RTMP) |
| US-WEBINAR-02 | As a member, I can register for a webinar and add it to my calendar |
| US-WEBINAR-03 | As an attendee during a live webinar, I can submit questions via a built-in Q&A panel; moderators can answer or mark as answered |
| US-WEBINAR-04 | As an attendee during a live webinar, I can participate in polls created by the host and see aggregated results |
| US-WEBINAR-05 | As an org admin, I can publish the recording as on-demand content with chapters/timestamps after the event ends |
| US-WEBINAR-06 | As a member, I can browse on-demand webinars and watch replays with the Q&A transcript visible alongside the recording |
| US-WEBINAR-07 | As an org admin, I can see webinar analytics: registrations, live attendance, peak concurrent viewers, Q&A engagement, poll participation, replay views |

---

### 5.7 Module: Knowledge Base

**Purpose**: Searchable repository of articles for documentation, guides, FAQs, and best practices — reducing support ticket volume.

| ID | User Story |
|----|-----------|
| US-KB-01 | As an org admin or designated author, I can create an article with: title, rich text body (images, code blocks, callouts, tables), category, and tags |
| US-KB-02 | As an author, I can manage article versions — each save creates a version; I can view history and revert |
| US-KB-03 | As an org admin, I can organize articles into a hierarchical category tree (up to 3 levels deep) |
| US-KB-04 | As a member, I can search articles with full-text search and faceted filtering by category and tag |
| US-KB-05 | As a member, I can provide feedback on an article ("Was this helpful?" yes/no + optional comment) |
| US-KB-06 | As an author, I can see article analytics: views, unique viewers, search appearances, helpfulness score, time on page |
| US-KB-07 | As an org admin, I can set article visibility: public (SEO-indexed), members-only, or role-restricted |
| US-KB-08 | As a member browsing the forums, relevant KB articles are surfaced as suggestions in the thread sidebar |

---

### 5.8 Module: Social Intelligence

**Purpose**: Cross-platform monitoring, sentiment analysis, and advocate identification — the core differentiator that no community platform offers natively.

#### Monitoring & Data Collection

| ID | User Story |
|----|-----------|
| US-SI-01 | As an org admin, I can configure monitoring keywords: brand names, product names, competitor names, and custom terms |
| US-SI-02 | As an org admin, I can select which platforms to monitor: Twitter/X, LinkedIn, Reddit, YouTube, TikTok, Discord (public servers), Slack (via integration), Hacker News, GitHub Discussions, G2, Trustpilot, Product Hunt |
| US-SI-03 | As a community manager, I see a unified "Social Inbox" of all mentions across all platforms, sorted newest first, with source icons and links to original posts |
| US-SI-04 | As a community manager, I can filter the Social Inbox by platform, sentiment, keyword group (brand vs. competitor), date range, and author |

#### Sentiment Analysis

| ID | User Story |
|----|-----------|
| US-SI-05 | As a community manager, each mention is automatically classified as positive, negative, neutral, or mixed, with a confidence score |
| US-SI-06 | As a community manager, I can see a sentiment trend dashboard showing sentiment distribution over time (daily/weekly/monthly) with overlays for product launches, incidents, or custom events |
| US-SI-07 | As a community manager, I can correct the sentiment classification on any mention, feeding back into the model |

#### Alerts

| ID | User Story |
|----|-----------|
| US-SI-08 | As a community manager, I receive real-time alerts (in-app + email + Slack/Teams webhook) when mention volume spikes above a configurable threshold (e.g., 3× normal hourly volume) |
| US-SI-09 | As a community manager, I receive a "crisis alert" when negative sentiment exceeds a threshold (e.g., >60% negative in a rolling 4-hour window) |
| US-SI-10 | As an org admin, I can configure alert rules: thresholds, notification channels, and recipients |

#### Competitor Monitoring

| ID | User Story |
|----|-----------|
| US-SI-11 | As a community manager, I can track competitor mentions and see side-by-side sentiment comparisons (our brand vs. Competitor A vs. Competitor B) |
| US-SI-12 | As a community manager, I can see share-of-voice metrics: how often our brand is mentioned relative to competitors over a selected time period |

#### Advocate & Influencer Identification

| ID | User Story |
|----|-----------|
| US-SI-13 | As a community manager, the system identifies "advocates" — individuals who mention our brand positively and frequently, ranked by reach and frequency |
| US-SI-14 | As a community manager, I can view an advocate's profile card: platforms active on, mention count, sentiment breakdown, estimated reach, and whether they are a community member |
| US-SI-15 | As a community manager, I can take action on an advocate: invite to community, add to CRM as contact, tag for outreach, or assign to a team member |

#### Integration with Engagement Modules

| ID | User Story |
|----|-----------|
| US-SI-16 | As a community manager viewing a member's profile, I see their external mentions alongside their community activity (unified profile) |
| US-SI-17 | As a community manager, I can create a forum thread or idea from an external mention with one click, pre-populated with source context and a link |

---

## 6. Module Dependency Map

```
CORE PLATFORM (always required)
    ├── Auth (SSO, social login, email/password)
    ├── Roles & Permissions
    ├── Tenant Management & Branding
    ├── Notifications Engine
    ├── Unified Search
    ├── REST API & Webhooks
    └── CRM Integration
         │
         ├── ENGAGEMENT MODULES (independent of each other)
         │   ├── Forums ────────── requires: Core only
         │   ├── Ideas ─────────── requires: Core only
         │   ├── Events ────────── requires: Core only
         │   ├── Courses ───────── requires: Core only
         │   ├── Webinars ──────── requires: Core only
         │   └── Knowledge Base ── requires: Core only
         │
         ├── INTELLIGENCE MODULE
         │   └── Social Intelligence ── requires: Core only
         │                              enhanced when Engagement modules active
         │
         └── POST-MVP MODULES
             ├── Gamification ──────── requires: Core + ≥1 Engagement module
             ├── Attribution ───────── requires: Core + CRM Integration
             ├── AI Moderation ─────── requires: Core + ≥1 Engagement module
             └── Credentials/Certs ─── requires: Core + Courses module
```

**Cross-module enhancements** (gracefully degraded if either module is disabled):
- **KB ↔ Forums**: Relevant KB articles surfaced in forum thread sidebar
- **Social Intel ↔ Forums/Ideas**: One-click thread/idea creation from external mentions
- **Social Intel ↔ Members**: Unified profiles merging community + social activity
- **Social Intel ↔ CRM**: Sentiment score pushed to CRM account health

---

## 7. Information Architecture

### Navigation Model

```
[Workspace Logo / Name]

HOME
  └── Activity feed, quick stats, notifications, announcements

COMMUNITY  (shown per enabled engagement module)
  ├── Forums
  ├── Ideas
  ├── Events
  ├── Courses
  ├── Webinars
  └── Knowledge Base

INTELLIGENCE  (shown if Social Intelligence module enabled)
  ├── Social Inbox
  ├── Sentiment Dashboard
  ├── Competitors
  ├── Advocates
  └── Alerts Config

MEMBERS
  ├── Member Directory
  └── [Individual Profile]

ADMIN  (visible to Org Admin role only)
  ├── Modules (enable/disable, configure)
  ├── Branding & Customization
  ├── Roles & Permissions
  ├── Members & Invitations
  ├── Integrations
  │   ├── SSO (SAML / OIDC)
  │   ├── CRM (Salesforce, HubSpot)
  │   └── Webhooks
  ├── Analytics (per-module dashboards)
  └── Billing & Plan
```

### URL Structure

```
{tenant}.opensourcecommunity.io/
  /forums
  /forums/{category-slug}
  /forums/{category-slug}/{thread-slug}
  /ideas
  /ideas/{idea-slug}
  /events
  /events/{event-slug}
  /courses
  /courses/{course-slug}/lessons/{lesson-number}
  /webinars
  /webinars/{webinar-slug}
  /kb
  /kb/{category-slug}/{article-slug}
  /intelligence/inbox
  /intelligence/sentiment
  /intelligence/competitors
  /intelligence/advocates
  /members
  /members/{username}
  /admin/...
```

---

## 8. Multi-Tenancy Model

### Architecture: Shared Schema + PostgreSQL Row-Level Security

Every table carries a `tenant_id` column. PostgreSQL RLS policies enforce data isolation at the database level. Each request sets `app.current_tenant_id` via `SET LOCAL` before query execution — enforced by middleware, not application logic per endpoint.

Large tenants (500K+ members) can be routed to dedicated database instances via configuration, without code changes.

### Tenant Hierarchy

```
Platform (OpenSourceCommunity SaaS)
  └── Organization (one per customer company)
        ├── Workspace Settings (branding, module config, integrations)
        ├── Roles (org-level RBAC)
        ├── Members
        │     ├── Profile (identity, linked social handles)
        │     └── Role assignments (org-wide or space-scoped)
        └── Module Data
              (forum categories/threads, ideas, events, courses, webinars,
               KB articles, social intel keywords/mentions)
```

### Key Decisions

- **Zero cross-tenant data sharing**: A person who is a member of two different tenant communities has two completely separate profiles
- **Custom domains**: Each tenant can use a custom domain (community.acme.com) with automatic TLS provisioning
- **Data residency**: MVP targets US region; EU region option added in v2.0 for GDPR-sensitive customers
- **White-labeling**: "Powered by OpenSourceCommunity" branding removable at Growth tier and above

### Resource Limits by Tier

| Resource | Starter | Growth | Enterprise |
|----------|---------|--------|------------|
| Members | 5,000 | 25,000 | 100,000+ |
| Admin seats | 3 | 10 | Unlimited |
| Storage | 10 GB | 100 GB | 1 TB+ |
| API rate limit | 100 req/min | 1,000 req/min | Custom |
| Social Intel keywords | 10 | 50 | 250+ |
| Social Intel platforms | 5 | All 12 | All 12 |
| Social mention retention | 90 days | 1 year | Unlimited |

---

## 9. Pricing Model

### Structure: Module-Based + Member-Count Hybrid

**Base platform fee** (always required):
- Includes: Core Platform (auth, roles, branding, search, notifications, API, webhooks, CRM sync, Forums)
- Forums are included in the base — they are the anchor that drives adoption
- Tiered by **member count** (not admin seats — communities should not be penalized for adding moderators)

| Tier | Monthly | Members | Notes |
|------|---------|---------|-------|
| Starter | $399/mo | Up to 5K | Self-serve, no SSO |
| Growth | $999/mo | Up to 25K | SSO included, white-label |
| Enterprise | Custom | 25K+ | Custom SLA, data residency, dedicated infra |

**Module add-ons** (each independently priced):

| Module | Starter | Growth | Enterprise |
|--------|---------|--------|------------|
| Ideas | +$149/mo | +$299/mo | Custom |
| Events | +$149/mo | +$299/mo | Custom |
| Courses | +$199/mo | +$399/mo | Custom |
| Webinars | +$199/mo | +$399/mo | Custom |
| Knowledge Base | +$99/mo | +$199/mo | Custom |
| Social Intelligence | +$299/mo | +$599/mo | Custom |

**Bundle discounts**:
- "Full Engagement" (all 6 engagement modules): 30% off a la carte
- "Community + Intelligence" (all 6 engagement + Social Intel): 35% off
- "All-In": 40% off

**Usage-based overages** (metered):
- Storage over tier limit
- Social Intelligence API calls over tier limit
- Member count overage: soft cap with 30-day grace period, then auto tier-up

### Pricing Rationale

- **Forums free in base**: Removes adoption friction; establishes platform as community hub
- **Member-count pricing**: Aligns cost with value; doesn't penalize teams for inviting moderators
- **Social Intelligence as premium add-on**: Core differentiator, deserves separate pricing; enables upsell from engagement-only customers
- **Self-serve for Starter**: Product-led growth motion; sales-assisted for Growth and Enterprise

### Competitive Context

| Competitor | Price | What's Missing |
|---|---|---|
| Bettermode Starter | ~$399/mo | No SSO, no API, no intelligence |
| Discourse Business | ~$500/mo | Forum-only, no intelligence, no events/courses |
| Common Room (intelligence only) | ~$500–$2,000/mo | No community engagement |
| Khoros | $50K+/yr | Overpriced monolith, no modular pricing |

Our Growth + Full Intelligence at ~$2,600/mo ($31K/yr) competes against a $500 Discourse + $1,500 Common Room stack ($24K/yr) while delivering unified data, better integrations, and a single platform to manage.

---

## 10. Competitive Landscape

### Direct Engagement Competitors

| Competitor | Strengths | Weaknesses | Our Advantage |
|---|---|---|---|
| **Khoros** | Enterprise-grade, 200+ integrations, strong moderation, gamification | Monolithic (no modular pricing), $50K+/yr minimum, slow to innovate, no social intelligence | Modular pricing at 1/3 the cost; social intelligence native; modern UX |
| **Gainsight Customer Communities** | Tight CS platform integration, health scores | Community features are basic; requires Gainsight CS platform; no social listening; closed ecosystem | Standalone; deeper engagement features; social intelligence; open API |
| **Bettermode** | Modern UI, modular, developer-friendly, reasonable pricing | No social intelligence; SSO gated to premium; weak CRM integration | Social intelligence as native module; SSO in base; CRM sync from day 1 |
| **Discourse** | Open source, strong technical community, mature forum engine | Forum-only; no events, courses, webinars, KB, or intelligence; limited enterprise without plugins | Full module suite; social intelligence; purpose-built for B2B SaaS |

### Social Intelligence Competitors

| Competitor | Strengths | Weaknesses | Our Advantage |
|---|---|---|---|
| **Common Room** | Excellent cross-platform intelligence, identity resolution, GTM signals | No community engagement; observation without action; expensive | Combined platform: observe AND act; lower total cost; closed loop |
| **Orbit** | Developer community focus, GitHub integration | Product direction uncertain post-acquisition; narrowing feature set | Stable independent product; broader scope |
| **Mention** | Simple brand monitoring | No community engagement; basic features | Full platform with action loop; better B2B SaaS focus |

### Positioning Statement

**For** B2B SaaS community teams **who** need to run their customer community and understand external brand perception, **OpenSourceCommunity is** a modular community platform **that** combines engagement (forums, ideas, events, courses, webinars, KB) with cross-platform social intelligence **unlike** Discourse (forum-only), Bettermode (no intelligence), Khoros (monolithic and overpriced), or Common Room (intelligence-only).

---

## 11. Success Metrics

### Platform-Level KPIs

| Metric | Target (12 mo post-GA) |
|---|---|
| Paying tenants | 150 |
| ARR | $3M |
| Net Revenue Retention | >120% |
| Monthly logo churn | <3% |
| Avg modules per tenant | 2.5+ |
| Social Intelligence attach rate | >40% of tenants |
| Time to first post (new tenant) | <30 minutes |

### Customer-Facing KPIs

**Engagement Health**
- Monthly Active Members (MAM) as % of total members
- Posts per member per month
- Ideas submitted and voted on per month
- Event RSVP-to-attendance conversion rate
- Course completion rate
- KB helpfulness score

**Social Intelligence Health**
- Mention volume trend (growing = increasing brand awareness)
- Net sentiment score (% positive minus % negative)
- Advocate count and growth
- Mean time to alert acknowledgment

**Business Outcomes** (post-MVP attribution module)
- Support tickets deflected (KB + forum resolved questions vs. ticket volume)
- NPS correlation with community engagement score
- Expansion revenue from community-engaged accounts vs. non-engaged
- Community-influenced pipeline (contacts who engaged pre-purchase)

---

## 12. MVP Phasing

### v1.0 — Closed Beta (Target: Month 6)

**Goal**: Core loop working for 10–15 design partners. Validate the engagement + intelligence combination.

**Scope**:
- Core Platform: email/password auth + Google/GitHub social login; 4 built-in RBAC roles; tenant management; branding (logo + colors); in-app + email notifications; full-text search; REST API; webhooks
- Forums: Complete (US-FORUM-01 through US-FORUM-11)
- Ideas: Complete except Jira/Linear integration (US-IDEAS-01 through US-IDEAS-09)
- Social Intelligence: Twitter/X, Reddit, LinkedIn, Hacker News, GitHub Discussions (5 platforms); sentiment analysis; Social Inbox; volume spike alerts; keyword configuration

**Not in v1.0**: Events, Courses, Webinars, KB, SSO (SAML/OIDC), competitor monitoring, advocate ID, GraphQL API, bidirectional CRM sync, custom domains

### v1.1 — General Availability (Target: Month 9)

**Additional scope**:
- SSO: SAML 2.0 + OIDC
- Knowledge Base: Complete (US-KB-01 through US-KB-08)
- Events: Complete (US-EVENT-01 through US-EVENT-08)
- Social Intelligence: All 12 platforms; competitor monitoring (US-SI-11, US-SI-12); advocate identification (US-SI-13 through US-SI-15); crisis alerts (US-SI-09); one-click content creation (US-SI-17)
- CRM: Bidirectional Salesforce sync; unidirectional HubSpot sync
- Custom domains with automatic TLS
- GraphQL API
- Unified member profiles (community + social, US-SI-16)

### v1.2 — Full Module Suite (Target: Month 12)

**Additional scope**:
- Courses / Learning: Complete
- Webinars: Complete
- CRM: Bidirectional HubSpot sync
- Ideas: Jira/Linear integration (US-IDEAS-10)
- Per-module analytics dashboards in Admin
- Audit logging
- White-label option (Growth tier)

### v2.0 — Intelligence & Monetization (Target: Month 18)

**Additional scope**:
- Gamification: Points, badges, leaderboards, configurable achievement rules
- Attribution & Analytics: Campaign tracking, conversion attribution, community health metrics, executive dashboards (proving ROI)
- AI Moderation: Content flagging, toxicity detection, spam detection, suggested moderator actions (never auto-acting)
- Credentials & Certs: Verifiable certificates, skill paths, integration with Credly/Accredible
- EU data residency option
- SOC 2 Type II certification
- Mobile-responsive PWA (native mobile apps in v2.x)

---

## 13. Risks & Mitigations

### R1: Social Platform API Access and Reliability

**Risk**: Twitter/X, LinkedIn, Reddit, and others frequently change API terms, pricing, or access. Twitter's API has become increasingly expensive since 2023.

**Impact**: High — Social Intelligence is the core differentiator.

**Mitigations**:
- Build a "Platform Adapter" abstraction so each connector is a replaceable module
- Maintain multiple data collection strategies per platform: official API, RSS, public web monitoring (respecting robots.txt/ToS), and partner data aggregators (Brandwatch, SocialBee) as fallbacks
- Design graceful degradation: if one platform's feed fails, others continue; surface platform health in admin panel
- Quarterly legal review of each platform's ToS

### R2: Scope Creep Delays MVP

**Risk**: 6 engagement modules + Social Intelligence + core platform in 9 months is aggressive.

**Impact**: Medium-High — missed GA date destroys design partner trust.

**Mitigations**:
- v1.0 (beta at Month 6) ships only Forums + Ideas + Social Intel — achievable with an 8–10 engineer team
- Module squads work in parallel (2–3 engineers per module)
- Strict "MVP vs. enhanced" acceptance criteria per user story; only MVP ships in target version
- Use open-source components where sensible: Tiptap (rich text editor), Meilisearch (search), react-email (transactional emails)

### R3: Selling "Modular" Creates Decision Fatigue

**Risk**: Modular pricing lengthens sales cycles as buyers evaluate each module independently.

**Impact**: Medium — slower time-to-close; lower initial deal sizes.

**Mitigations**:
- Default sales motion to bundles ("Full Engagement Suite," "All-In") with a la carte as secondary option
- 30-day free trial with all modules enabled so buyers experience the integrated value before choosing
- In-app "module explorer" during onboarding: 3-question quiz → recommended module bundle
- Bundle discounts (30–40%) make bundles financially obvious vs. a la carte

### R4: Incumbent Lock-in

**Risk**: Customers on Khoros, Discourse, or Bettermode face high switching costs (content migration, URL redirects, member re-onboarding).

**Impact**: Medium — slows new logo acquisition.

**Mitigations**:
- Build migration tooling for top 3 competitors (Discourse, Bettermode, Khoros): import content, members, and URL mappings
- White-glove migration service for Enterprise (included) and Growth (paid add-on)
- URL redirect mapping preserves SEO equity from legacy community URLs
- Year 1 ICP focus: new communities (no prior tool = zero switching cost)

### R5: Tenant Isolation Failures

**Risk**: Multi-tenant architecture risks cross-tenant data leakage.

**Impact**: Critical — a single incident destroys customer trust and may trigger regulatory consequences.

**Mitigations**:
- PostgreSQL RLS as defense-in-depth (in addition to application-level tenant filtering)
- All queries pass through middleware that injects tenant context; direct queries prohibited
- Automated tenant isolation test suite in CI: creates two tenants, populates data, asserts zero cross-leakage across every API endpoint
- Third-party penetration test focused on tenant isolation before GA

### R6: Sentiment Analysis Accuracy

**Risk**: General-purpose sentiment models achieve ~70–80% accuracy. B2B SaaS uses domain-specific language ("the API is killing us" = negative; "this release killed it" = positive).

**Impact**: Medium — inaccurate sentiment erodes trust in the intelligence module.

**Mitigations**:
- Fine-tune a base transformer (`cardiffnlp/twitter-roberta-base-sentiment`) on a B2B SaaS corpus
- Build the human correction loop (US-SI-07) from day one — corrections feed back into model retraining
- Display confidence scores alongside labels so users know when the system is uncertain
- Target >85% accuracy at GA; >90% by v1.2 as correction data accumulates

### R7: Common Room Competes Directly

**Risk**: Common Room is well-funded, established in intelligence, and could add engagement features.

**Impact**: Medium — competitive pressure on the core differentiator.

**Mitigations**:
- Advantage is the integrated action loop: intelligence + engagement in one platform. Common Room adding forums would be like Salesforce adding a community — mediocre, because engagement is not their core competency
- Win on the combined value proposition, not intelligence alone
- Ship intelligence-to-action features early (US-SI-17, US-SI-15) that only work when you own both sides

### R8: GDPR and Privacy Compliance for Social Monitoring

**Risk**: Monitoring public social media posts touches personal data under GDPR.

**Impact**: High — regulatory risk, especially for EU customers.

**Mitigations**:
- Lawful basis: legitimate interest (Art. 6(1)(f)) for processing publicly available data for brand monitoring; document the LIA
- Monitor only public posts; never private/locked accounts, DMs, or non-public groups
- Provide a data subject removal mechanism for any individual to request deletion of their mentions from our platform
- Ephemerally cache raw post content; store metadata + sentiment score + link to original; do not retain full post text beyond 90 days (configurable)
- Complete a DPIA (Data Protection Impact Assessment) before GA
- EU data residency option in v2.0 for customers requiring in-region processing

---

## 14. Open Questions

1. **Self-serve vs. sales-led for Starter tier?** Recommendation: self-serve with product-led onboarding for Starter; sales-assisted for Growth and Enterprise.

2. **White-label depth**: Should customers be able to remove "Powered by OpenSourceCommunity"? Recommendation: Growth tier and above only.

3. **Mobile**: Native mobile apps or responsive web for MVP? Recommendation: responsive web for MVP + PWA; native apps in v2.x.

4. **AI in MVP**: Any AI features (AI-suggested replies, article summaries) in v1.0? Recommendation: No — keep AI for post-MVP except sentiment analysis in Social Intelligence, which is core to the module, not optional.

5. **Automated moderation in v1.0**: Manual-only queue, or include configurable rules (e.g., block links from new members)? Recommendation: manual queue + configurable rules (no AI), shipping in v1.0.

6. **Discord integration depth**: Monitor public Discord servers, or also offer Discord bot integration for private servers? Recommendation: public server monitoring only for v1.0; opt-in bot for v1.1.

7. **Slack integration**: Monitor public Slack workspaces (limited via API) or require customers to install a Slack app in their own workspace? Recommendation: customer-installed Slack app for their own workspace signals + public channel monitoring separately.
