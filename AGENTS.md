# AGENTS.md

## Purpose

This file is shared context for any coding agent working in this repo.

`growth-agents` is a small GTM engineering infrastructure layer.

The first customer is Verbatim.

The immediate objective is not to build a full marketing automation platform. The immediate objective is to build the smallest useful slice of a growth agent stack, use it on Verbatim, learn from real data, and then decide what to expand.

## Repos

### growth-agents

Path:

```text
C:\Users\Arun\growth-agents\
```

This repo contains the GTM engineering layer:
- Paid Ads Agent
- SEO Agent
- Content Strategist Agent
- Outreach Agent
- shared utilities
- briefs
- output artifacts
- future data layer and agent runtime work

### ai-highlighter

Path:

```text
C:\Users\Arun\ai-highlighter\
```

This is the Verbatim product repo:
- Chrome extension
- Next.js website
- Supabase-backed app
- helloverbatim.com

Do not confuse the two repos.

If a task requires changing Verbatim’s site, extension, funnel instrumentation, or Supabase schema for the production app, that work belongs in `ai-highlighter`.

If a task requires building marketing agents, creative generation, campaign analysis, outreach workflows, or GTM infrastructure, that work belongs in `growth-agents`.

## Product context: Verbatim

Verbatim is a confidence layer for AI work.

It helps users pressure-test important AI responses before relying on them.

Verbatim started from a behavior Arun kept repeating manually:
1. Get an important response from one AI model.
2. Send that response to another model for critique.
3. Ask what was missing, wrong, overstated, or under-examined.
4. Bring the critique back to improve the original answer.

That loop became Verbatim.

## Verbatim features

Verbatim has four core features:

1. **Library**
   Saves valuable AI outputs. Highlighting is about keeping, not distrusting.

2. **Debate**
   Pressure-tests a specific AI response or conclusion across models. This is the current paid-acquisition wedge.

3. **Council**
   Runs a parallel multi-model panel.

4. **Insights**
   Tracks model behavior and performance over time.

Important distinction:

We do not highlight what we distrust.
We highlight what we want to keep.

Debate is the skepticism layer.
Library is the memory layer.

## Current GTM test

The first growth-agents dogfood test is for Verbatim.

Audience:

```text
Independent and boutique consultants
```

Reason:

- Findable
- Able to pay
- High reputational pain if AI-generated work is wrong in a client deliverable

Current wedge:

```text
Pressure-test AI conclusions before sending client-facing work.
```

Primary hook:

```text
You don’t know what you’re missing. Find out before it costs you.
```

Secondary hook:

```text
You don’t always have someone to push back. AI never does.
```

## Build principle

Do not confuse impressive demos with durable infrastructure.

The public demos show agents:
- generating ads
- uploading campaigns
- analyzing performance
- pausing losers
- promoting winners

The durable value is underneath:
- clean source data
- normalized records
- reliable access
- agent-readable summaries
- repeatable workflows
- human-reviewable actions
- performance feedback loops

## Phase 1 scope

Phase 1 is Paid Ads Agent v0.1.

It includes:

1. Structured creative brief input
2. Ad variant planning
3. Static ad generation
4. Output manifest
5. Manual Meta upload support
6. Funnel instrumentation checklist
7. Later performance summary and next-test recommendation

Phase 1 does not include:

- full data warehouse
- full MCP server
- autonomous Meta optimization
- automatic budget changes
- multi-client dashboard
- Hermes deployment
- replacing Graphed
- pretending the system is complete

## Priority rule

Funnel instrumentation comes before creative volume.

A working funnel with three ads is better than thirty generated ads pointed at a broken measurement system.

Before scaling creative generation, verify:

1. Meta Pixel fires on helloverbatim.com.
2. Domain verification is live.
3. Waitlist capture writes email and tier to Supabase.
4. Add-to-Chrome click or install intent is tracked.
5. Debate-run behavior can be measured or manually inspected.

## Coding rules

- Make small, reviewable changes.
- Inspect before editing.
- Prefer boring working code over ambitious abstractions.
- Do not add unnecessary dependencies.
- Do not build future phases unless explicitly asked.
- Do not overwrite existing docs unless explicitly asked.
- Keep generated assets in `output/`.
- Do not commit `.env`.
- Do not expose API keys.
- Do not assume missing files exist. Inspect first.

## Customer-facing voice rules

For Verbatim copy:

- No em dashes.
- No generic SaaS language.
- No “leverage.”
- No “transform.”
- No “revolutionize.”
- No “AI-powered.”
- Keep the tone direct, skeptical, adult-to-adult.

Verbatim’s sharper brand line:

```text
A.I. JUST GOT A BULLSHIT METER.
```

Use that energy without turning every sentence into a bumper sticker.

## Working with Arun

Arun drives.

The build partner should:
- give one next step at a time when the terrain is unfamiliar
- explain what to run
- explain what success looks like
- explain what output to paste back
- interpret results quickly
- push back when the direction is wrong
- avoid broad option surveys unless asked

Do not produce a grand architecture when the next step is a two-command sanity check.
