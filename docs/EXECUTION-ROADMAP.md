# Execution Roadmap

This is the strict 7 to 10 day execution roadmap for `growth-agents`.

Current objective:

```text
Build the smallest useful GTM engine slice for Verbatim's consultant ad test.
```

## 1. Current State

What exists:

- Supabase warehouse exists.
- Supabase smoke test exists.
- Manual consultant source ingest exists.
- Warehouse-backed consultant ad review exists.

What does not exist yet:

- Dedicated Hermes `growth-agents` agent.
- Serper pain-search workflow.
- Sufficient real source evidence.

Hard gate:

- Funnel verification is still required before Meta spend.

## 2. Hard Decision

Do not use Arun's personal Hermes agent for this work.

Create a separate dedicated Hermes agent named:

```text
growth-agents-operator
```

This agent should operate only inside the `growth-agents` scope unless explicitly assigned otherwise.

## 3. Agent Boot Protocol

Create these files later:

```text
agents/runtime/hermes/growth-agents-operator/SOUL.md
agents/runtime/hermes/growth-agents-operator/INSTRUCTIONS.md
agents/runtime/hermes/growth-agents-operator/SKILL.md
agents/runtime/hermes/growth-agents-operator/TASK.template.md
agents/runtime/hermes/growth-agents-operator/REPORT.template.md
agents/runtime/hermes/growth-agents-operator/README.md
```

The boot protocol should make the agent useful without giving it broad authority.

## 4. Allowed And Forbidden Actions

Allowed:

- Read repo docs.
- Run approved npm scripts.
- Write to Supabase through scripts.
- Generate output files.
- Report results.

Forbidden:

- Edit `.env`.
- Print secrets.
- Post publicly.
- Upload ads.
- Spend money.
- Scrape LinkedIn.
- Bypass CAPTCHA or anti-abuse systems.
- Touch `ai-highlighter` unless explicitly assigned.
- Change Supabase schema without explicit approval.

## 5. First Proof Task

The dedicated Hermes agent must first run:

```powershell
npm.cmd run supabase:smoke
npm.cmd run consultant:ad-review
npx.cmd tsc --noEmit
```

Success means:

- Supabase connection works.
- Warehouse-backed ad review generation works.
- TypeScript still passes.

## 6. Next Workflow

Build Serper consultant pain search:

```text
Serper
-> raw_source_events
-> source_documents
-> pain_points
-> ad_angles
-> human_review_items
-> consultant-ad-review.md
```

Hard limits:

- Max 6 queries.
- Max 5 results per query.
- Max 30 `source_documents`.
- Max 10 `pain_points`.
- Max 10 `human_review_items`.
- No full-page scraping in v0.
- No fake evidence.
- Dedupe URLs.

The point is source-backed pain discovery, not volume.

## 7. Current Verbatim Positioning

Use:

```text
Adversarial review for AI.
```

Supporting frame:

```text
AI is prone to overconfidence, hollow flattery, and hallucination. Verbatim challenges AI work before users act on it.
```

Deprecated:

```text
You don't know what you're missing. Find out before it costs you.
```

Do not use the deprecated hook in new ad concepts.

## 8. Funnel Gate

No Meta spend until:

- Pixel fires.
- Domain is verified.
- Signup or waitlist works.
- CTA click is tracked.
- Destination URL works.

Creative generation without funnel verification is not progress.

## 9. Out Of Scope

Out of scope for this phase:

- SEO.
- Outreach.
- Apollo.
- Instantly.
- LinkedIn scraping.
- Meta API upload.
- Autonomous optimization.
- Dashboard.
- Multi-agent fleet.

Do not expand the scope until the consultant ad test has source-backed concepts and a verified funnel.

## 10. Exact Next Sequence

A. `docs/execution-roadmap`

B. `docs/current-positioning-cleanup`

C. `hermes/growth-agent-operator-boot`

D. `agent/consultant-pain-search`

E. Run agent-operated search

F. Generate five ad candidates

G. Verify funnel

H. Manual Meta upload
