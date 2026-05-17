# ARCHITECTURE

Four agents (Graphed-style) on top of Hermes runtime. Each agent runs as a Hermes process; subskills are tools the agent calls.

## Layer cake

```
┌──────────────────────────────────────────────────┐
│ INTERFACE                                        │
│  Claude.ai chat  (strategic build partner)       │
│  Claude Code     (implementation)                │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│ AGENTS  (Hermes runtime, persistent)             │
│  1. Paid Ads Agent                               │
│  2. SEO Agent                                    │
│  3. Content Strategist Agent                     │
│  4. Outreach Agent                               │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│ SUBSKILLS  (called by agents, written in TS)     │
│  creative-generator, meta-uploader,              │
│  optimization-daemon, cold-email-funnel, ...     │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│ TOOL LAYER  (Composio MCP + custom MCPs)         │
│  Meta Ads API, Google Ads, Perplexity, Apollo,   │
│  Phantom Buster, Million Verifier, Instantly,    │
│  Raphonic, Search Console, ...                   │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│ DATA WAREHOUSE  (Supabase Postgres)              │
│  Ad performance, funnel events, waitlist,        │
│  content metadata, outreach state                │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│ DEPLOYMENT  (Railway: cron + persistent agents)  │
└──────────────────────────────────────────────────┘
```

## The four agents

### 1. Paid Ads Agent

**Job:** Run paid acquisition end-to-end: research, create, upload, monitor, optimize.

**Subskills:**
- `creative-generator`: React + html2canvas, generates 1080x1080 PNG ad variants from a Brief
- `pain-point-scraper`: Perplexity-based research, feeds hooks and body copy from real user pain
- `meta-uploader`: Facebook Marketing API client, uploads creatives as drafts
- `optimization-daemon`: Cron that pauses low-performers, promotes winners to dedicated ad sets
- `ads-performance-analyzer`: Pulls Meta + Supabase, reports CPI/CPM/install/conversion

**Tools required:**
- Meta Marketing API (Google Ads, TikTok added later)
- Perplexity API
- Anthropic API
- Supabase (performance warehousing)

### 2. SEO Agent

**Job:** Build a compounding organic channel.

**Subskills:**
- `keyword-researcher`: Search Console + Ahrefs (when available), identifies opportunities
- `landing-page-generator`: Generates Next.js landing pages aligned to keyword intent
- `blog-post-drafter`: Drafts long-form posts with citations, ships to Verbatim's blog

**Tools required:**
- Google Search Console API
- Ahrefs API (or alternative)
- Anthropic API
- Vercel deployment (for generated pages)

### 3. Content Strategist Agent

**Job:** Tell us what content actually drives revenue and where the gaps are.

**Subskills:**
- `performance-analyzer`: Joins Supabase event data with content metadata, attributes revenue
- `brief-generator`: Drafts content briefs from real performance signals
- `gap-finder`: Identifies funnel positions with low content coverage

**Tools required:**
- Supabase (analytics)
- Anthropic API

### 4. Outreach Agent

**Job:** Manage all human-to-human outreach (cold email, podcast, LinkedIn).

**Subskills:**
- `cold-email-funnel`: Phantom Buster → Apollo → Million Verifier → Instantly
- `podcast-outreach`: Raphonic → verify → Instantly pitch
- `linkedin-outreach`: ICP identification → personalized first messages

**Tools required:**
- Phantom Buster API
- Apollo API
- Million Verifier API
- Instantly API
- Raphonic API
- Composio (connector layer)

## Round sequencing

**Round 1 (this weekend):** Paid Ads Agent v0.1
- `creative-generator` (full implementation)
- `pain-point-scraper` (minimal: manual pain points seeded, automated retrieval later)
- No Hermes deployment yet (skill runs locally via Claude Code)

**Round 2 (week 2):** Paid Ads Agent v1.0
- `meta-uploader` (Marketing API integration)
- `optimization-daemon` (cron, deployed to Railway)
- `ads-performance-analyzer` (Supabase tables for ad performance)
- First Hermes deployment

**Round 3 (week 3-4):** Outreach Agent v0.1
- `cold-email-funnel`
- `podcast-outreach`
- Composio integration

**Round 4+ (month 2+):** SEO Agent and Content Strategist Agent

## Why Hermes for the runtime

- Built for persistent agents (not one-shot CLI)
- Self-evolving (per Nick at orgo.ai)
- Decoupled from model choice (swap Claude/GPT/open-source per task)
- Supports the agent jockey pattern: N agents running in background
- Productizable: clients can run their own Hermes agents using our skills

Local dev happens in Claude Code (this repo). Hermes is the deployment target starting Round 2.

## Data model (Supabase tables)

Tables to create in Round 1 (most can wait until Round 2):

- `waitlist` (id, email, tier, created_at) — already needed for Verbatim test, lives in ai-highlighter's Supabase
- `ad_creatives` (id, agent, brief_hash, hook, body, image_url, status, created_at)
- `ad_performance` (id, ad_id, impressions, clicks, cpm, cpc, ctr, conversions, date) — Round 2
- `outreach_contacts` (id, source, email, role, company, status) — Round 3
- `content_pieces` (id, title, url, type, published_at, revenue_attributed) — Round 4

## Reference patterns

- Cody Schneider's bulk Facebook ad generator (Cloud Code Marketing Masterclass transcript) is the direct pattern for `creative-generator`
- Nick's Hermes + Orgo deployment (Solo Agent Business transcript) is the pattern for production agent hosting
- Graphed's 4-agent UI (paid ads / SEO / content / outreach) is the user-facing organization model

## What this architecture is NOT

- Not a microservices monorepo (skills are local modules, agents are deployable processes)
- Not a SaaS product (yet) — this is the operating stack for our own products
- Not a competitor to Graphed (different scale, different positioning, different price)
- Not over-engineered for Round 1 (foundation + one subskill ships this weekend)
