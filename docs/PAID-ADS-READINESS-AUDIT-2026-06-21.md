# Paid Ads Readiness Audit 2026-06-21

## Current Repo State

`growth-agents` has matured past the original weekend skeleton. The content/distribution loop is complete enough to pause, and the repo now has useful infrastructure patterns for:

- source discovery
- source extraction
- authority and attribution gates
- human-reviewable drafts
- manual publication logging
- LinkedIn analytics snapshot ingestion
- conservative performance review

Recent git history confirms the current work has been content/distribution focused. Latest visible commit:

```text
d5c8aa3 docs: capture content distribution loop checkpoint
```

The original Paid Ads Agent v0.1 remains partly implemented. The most important blocker is still the original rule from `AGENTS.md`: funnel instrumentation comes before creative volume.

## Existing Paid Ads Assets

### Creative Generator

Path:

```text
agents/paid-ads/skills/creative-generator/
```

Existing files:

- `index.ts`
- `sample-brief.json`
- `from-pain-memory.ts`

Current capability:

- Reads `sample-brief.json`.
- Supports optional external `creative-research-inputs.json`.
- Merges research inputs.
- Filters approved template candidates.
- Generates deterministic planned variant records.
- Writes `output/run-{timestamp}/manifest.json`.

Current limitation:

- It does not render PNGs.
- It does not produce Meta-ready creative files.
- It does not include manual upload packaging.
- `sample-brief.json` still contains deprecated historical hooks, including `You don't know what you're missing. Find out before it costs you.` This must be cleaned before any new ad concept generation.

### Pain Memory To Creative Inputs

Path:

```text
agents/paid-ads/skills/creative-generator/from-pain-memory.ts
```

Current capability:

- Converts `pain-point-memory.json` into `creative-research-inputs.json`.
- Filters low-confidence records.
- Maps pain points, audience language, objections, emotional triggers, and creative angles into Creative Generator research inputs.

Current limitation:

- This is local JSON plumbing from Conversation Scout.
- It is not yet tied to paid ad performance or Meta results.

### Consultant Ad Research Workflow

Paths:

```text
scripts/search-consultant-ai-pain.ts
scripts/generate-consultant-ad-review.ts
scripts/ingest-manual-consultant-sources.ts
agents/paid-ads/workflows/consultant-ad-research/manual-sources.example.json
```

Current capability:

- Runs bounded Serper searches for consultant/professional AI risk.
- Stores raw source events, source documents, pain points, ad angles, and human review items in Supabase.
- Generates a warehouse-backed `consultant-ad-review.md`.
- Uses current positioning: `Adversarial review for AI.`
- Avoids the deprecated hook in generated ad angles.

Current limitation:

- Source evidence is search-result/snippet based unless manually ingested.
- The ad review is a concept review, not a Meta upload package.
- There is no ad creative image rendering.
- There is no Meta Ads API integration.

## Existing Content-Loop Assets That Can Be Reused

The content loop added several reusable operating patterns:

- Human-reviewable markdown artifacts in `output/run-{timestamp}/`.
- Source authority and attribution gates.
- Replacement-source extraction before using claims publicly.
- Conservative performance review that refuses to over-interpret thin data.
- Snapshot-based analytics ingestion.
- Manual publication and manual distribution as explicit human gates.

Reusable for paid ads:

- Evidence-first workflow design.
- Conservative interpretation of early performance.
- Human approval checkboxes.
- Time-based snapshot artifacts.
- Supabase-backed workflow runs and review items.
- The principle that creative should not be generated from weak or stale context.

## Scripts And Folders Present

### Creative Generation

- `agents/paid-ads/skills/creative-generator/index.ts`
- `agents/paid-ads/skills/creative-generator/sample-brief.json`
- `agents/paid-ads/skills/creative-generator/from-pain-memory.ts`
- npm scripts:
  - `generate:creative`
  - `creative:from-pain-memory`

Status: manifest-producing skeleton exists. PNG rendering does not exist.

### Pain-Point Research

- `scripts/search-consultant-ai-pain.ts`
- `scripts/ingest-manual-consultant-sources.ts`
- Conversation Scout pain memory flow exists under `agents/conversation-scout/`.

Status: source-backed research and pain-point storage exist. Paid-ad-specific research workflow exists but needs current source quality review before new ad concepts.

### Meta Upload

No Meta uploader script or skill exists.

Status: not built, and should not be built yet.

### Funnel Tracking

No funnel verification script exists in `growth-agents`.

Known funnel requirements are documented in:

- `AGENTS.md`
- `SETUP.md`
- `WEEKEND-PLAN.md`
- `briefs/verbatim-consultant-test.md`
- `docs/VERBATIM-CONTEXT.md`

Status: tracking readiness is unknown from `growth-agents` alone.

### Performance Review

For content distribution:

- `scripts/log-distribution-performance.ts`
- `scripts/ingest-linkedin-analytics-export.ts`
- `scripts/review-distribution-performance.ts`

For paid ads:

- No Meta ad performance logger exists.
- No Meta export ingestion exists.
- No next-test recommendation script exists for paid ads.

Status: performance review patterns exist, but paid-ad performance workflow is not implemented.

## Funnel Instrumentation Readiness Checklist

These items must be verified before generating or running paid ads.

| Item | Status From `growth-agents` | Notes |
| --- | --- | --- |
| Meta Pixel presence | Unknown | Must be checked in `ai-highlighter` and live site. |
| Meta domain verification | Unknown | Must be checked in Meta Business settings. |
| Waitlist capture | Unknown | Must be checked in `ai-highlighter` and Supabase. |
| Waitlist tier capture | Unknown | Required for paid-intent signal. |
| Add-to-Chrome click tracking | Unknown | Must be checked in Verbatim site code and analytics events. |
| Extension install signal | Unknown | Requires product/extension instrumentation. |
| Debate run tracking | Unknown | Requires extension/app instrumentation or manual inspection path. |
| Landing page URL plan | Partial | Brief points to `https://helloverbatim.com`; campaign URL/UTM plan not yet defined. |
| Manual Meta upload support | Partial | Brief has targeting and upload guidance; no upload package/checklist artifact yet. |
| Ad creative manifest support | Partial | `generate:creative` writes planned manifest records. |
| Performance logging path | Missing for paid ads | Content distribution logging exists, not paid ad logging. |
| Next-test recommendation path | Missing for paid ads | Conservative review pattern exists, but no paid ad analyzer. |

## What Must Be Verified In `ai-highlighter`

Do not assume these exist. They require switching to:

```text
C:\Users\Arun\ai-highlighter
```

Required checks:

1. Meta Pixel code exists and uses the correct Pixel ID.
2. Pixel fires on `https://helloverbatim.com`.
3. Meta Events Manager receives live `PageView`.
4. Domain verification is complete in Meta Business settings.
5. Waitlist form exists on the intended landing path.
6. Waitlist form writes email to Supabase.
7. Waitlist form writes tier selection.
8. Add-to-Chrome click fires a custom event or equivalent analytics event.
9. Extension install can be measured or manually reconciled.
10. Debate run behavior can be measured or manually inspected.
11. Campaign landing URL and any UTM plan are accepted by the live site.

## What Can Be Audited From `growth-agents` Alone

Can audit:

- Brief quality and stale hook risk.
- Current Verbatim positioning.
- Consultant ICP definition.
- Creative manifest skeleton.
- Research input plumbing.
- Supabase warehouse scripts and consultant ad research workflow.
- Human-reviewable ad concept generation.
- Existing output artifact patterns.
- Missing paid ad performance and upload infrastructure.

Cannot audit:

- Live Pixel firing.
- Domain verification.
- Waitlist database writes in the Verbatim app.
- Extension install telemetry.
- Debate run telemetry.
- Live landing page conversion behavior.
- Chrome Web Store install path behavior.

## What Is Missing Before Paid Ads Should Run

Critical missing items:

- Verified Meta Pixel on the live landing page.
- Verified Meta domain.
- Verified waitlist email and tier capture.
- Verified Add-to-Chrome click tracking.
- Verified extension install signal or manual install reconciliation.
- Verified Debate run tracking or manual inspection method.
- Campaign URL/UTM plan.
- Manual Meta upload checklist/package.
- Current paid ad brief without deprecated hooks.
- Static creative rendering or a manual design handoff format.
- Paid ad performance logging or export ingestion.
- Paid ad next-test recommendation path.

The repo is not ready to run paid ads until the funnel instrumentation checks are complete.

## What Can Be Built Next In `growth-agents`

The next useful `growth-agents` task should not generate variants yet. It should create a funnel/instrumentation readiness artifact that can be filled from `ai-highlighter` verification.

Candidate next artifact:

```text
docs or scripts for paid-ads funnel readiness checklist
```

Better as a script:

```text
scripts/generate-paid-ads-readiness-checklist.ts
```

Output:

```text
output/run-{timestamp}/paid-ads-readiness-checklist.md
```

Purpose:

- Encode the exact pre-Meta-spend gates.
- Record which checks are unknown, passed, failed, or need `ai-highlighter`.
- Keep `growth-agents` as the operating layer without pretending it can verify product instrumentation alone.

## Recommended Next Branch And Task

Recommended branch:

```text
agent/paid-ads-funnel-readiness-checklist
```

Recommended task:

Create a local paid ads readiness checklist generator that produces a human-reviewable artifact for the Verbatim consultant Meta test.

It should:

- Not inspect `ai-highlighter`.
- Not call Meta.
- Not call Supabase unless explicitly expanded later.
- Not generate ad variants.
- Mark product instrumentation items as `unknown` by default.
- Include fields for Arun to paste verification notes from Pixel Helper, Events Manager, Supabase, and the live product.

## Do Not Build Yet

Do not build these next:

- Meta API uploader.
- Autonomous optimization daemon.
- Budget automation.
- Campaign creation through API.
- PNG rendering.
- Bulk ad generation.
- New ad hooks.
- New ad variants.
- Multi-agent runtime.
- Hermes paid ads operator specialization.
- Dashboard.
- Full ad warehouse analytics.

The right next step is readiness and measurement, not creative volume.

## Human Approval Checklist

Before any paid ads are generated or uploaded:

- [ ] Current positioning confirmed: `Adversarial review for AI.`
- [ ] Deprecated hook removed from active paid ad brief inputs.
- [ ] Consultant ICP still approved.
- [ ] Funnel landing URL selected.
- [ ] Meta Pixel verified live.
- [ ] Meta domain verification confirmed.
- [ ] Waitlist email capture verified.
- [ ] Waitlist tier capture verified.
- [ ] Add-to-Chrome click tracking verified.
- [ ] Extension install signal verified or manual reconciliation defined.
- [ ] Debate run tracking verified or manual inspection path defined.
- [ ] Campaign URL/UTM plan approved.
- [ ] Manual Meta upload plan approved.
- [ ] Performance logging path selected.
- [ ] Human approves moving from readiness audit to creative generation.

## Bottom Line

Paid Ads Agent v0.1 has useful foundations, but it is not ready for creative generation or paid spend.

The creative manifest skeleton and source-backed ad angle review are real assets. The funnel instrumentation state is unknown. Because the repo rule is explicit that funnel instrumentation comes before creative volume, the smallest next task is a paid ads funnel readiness checklist artifact, followed by a separate `ai-highlighter` verification pass.

