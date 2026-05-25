# GTM Engineering Thesis

## Working thesis

Small teams can use AI agents to perform GTM work that previously required marketers, analysts, operators, and agencies.

But agents only become useful when they operate on reliable context.

The valuable layer is not the agent alone.

The valuable layer is the infrastructure that lets the agent see the right data, reason over it safely, and produce human-reviewable actions.

## The problem

Direct agent-to-API workflows are fragile.

An agent can call an API and still make a bad decision because it does not actually have the full picture.

Common failure modes:

### 1. Rate limits

APIs are not designed for unlimited agent exploration.

An agent trying to analyze campaigns, upload creative, scrape profiles, or poll performance can quickly hit rate limits.

### 2. Pagination

Many APIs return partial result sets.

The agent may believe it has analyzed the full account when it only saw one page of results.

This creates false confidence.

### 3. Partial context

Even if the API call succeeds, the agent may only see a narrow slice of the business.

It may miss:
- spend history
- creative metadata
- audience definitions
- downstream conversions
- prior tests
- customer quality
- revenue impact

### 4. Raw data bloat

Raw business data can be too large to fit usefully into an LLM context window.

One million rows of ad, Shopify, CRM, or analytics data cannot simply be handed to a model.

### 5. Confident wrongness

The most dangerous failure mode is not the agent saying:

```text
I don’t know.
```

The dangerous failure mode is the agent confidently recommending action based on incomplete data.

## The infrastructure pattern

The long-term pattern is:

```text
source APIs
→ data pipeline
→ warehouse
→ normalized views
→ agent-readable summaries
→ MCP or tool access
→ human-reviewable actions
→ performance feedback loop
```

This is the infrastructure layer that makes GTM agents useful.

## What growth-agents is building

`growth-agents` is building the smallest useful version of this pattern.

Not a full platform.

Not a giant warehouse.

Not a flashy demo.

A narrow operating loop that can be used on Verbatim first.

## First customer

Verbatim.

Verbatim is currently positioned as:

```text
Adversarial review for AI.
```

AI is prone to overconfidence, hollow flattery, and hallucination. Verbatim challenges AI work before users act on it.

The first GTM test is aimed at independent and boutique consultants who need to pressure-test AI-generated conclusions before client-facing use.

## First slice: Paid Ads Agent v0.1

The first useful slice is:

```text
pain-point research
→ structured creative brief
→ generated static ad variants
→ manual Meta upload
→ funnel instrumentation
→ performance review
→ next creative recommendation
```

## Why manual upload first

Manual upload is acceptable in Phase 1.

The goal is not to automate everything immediately.

The goal is to learn:
- which hooks get attention
- which audience responds
- whether waitlist intent appears
- whether installs happen
- whether users run debates
- whether the consultant ICP is worth a second test

Automation before signal creates machinery around guesses.

## Phase 1 includes

- structured briefs
- creative generation
- output manifests
- static PNG generation
- manual curation
- manual Meta upload
- funnel tracking checklist
- early performance interpretation

## Phase 1 does not include

- full data warehouse
- autonomous Meta optimization
- automated budget changes
- multi-client dashboard
- Hermes deployment
- full MCP server
- cold email automation
- podcast outreach automation
- SEO automation

## Long-term opportunity

If the Verbatim test works, the operating knowledge becomes useful beyond Verbatim.

Possible future forms:
- productized GTM engineering service
- vertical growth-agent infrastructure
- internal agency tooling
- agent stack for founders
- data-backed marketing automation layer

## Core principle

Build the smallest useful slice.

Use it on a real product.

Measure what happens.

Only then automate the next layer.
