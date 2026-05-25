# Consultant Ad Research Workflow

This is the first real GTM engine workflow for Verbatim.

The goal is to generate better Meta ad concepts for independent and boutique consultants using real source evidence about AI overconfidence, hollow flattery, hallucination, and client-facing risk.

Verbatim is the first product pushed through this workflow. The workflow itself is the asset.

Current positioning:

```text
Adversarial review for AI.
```

Supporting frame:

```text
AI is prone to overconfidence, hollow flattery, and hallucination. Verbatim challenges AI work before users act on it.
```

## Workflow

```text
positioning input
-> source research
-> raw source storage
-> normalized source documents
-> pain point extraction
-> ad angles
-> ad variants
-> human review
-> manual Meta upload
-> later performance feedback
```

## Memory Layer

Supabase is the memory layer for this workflow.

Agents should read and write these tables instead of relying on chat history or local JSON files:

- `workflow_runs`: one record per workflow execution.
- `raw_source_events`: raw request and response records from future source tools.
- `source_documents`: normalized source pages, posts, notes, articles, and comments.
- `pain_points`: extracted audience pain, objections, emotional triggers, and evidence.
- `ad_angles`: reusable concept directions derived from pain points.
- `ad_variants`: planned ad variants for manual review and later rendering.
- `human_review_items`: anything Arun should approve, edit, reject, or upload manually.

The immediate point is not automation. The immediate point is reliable memory.

## Consultant Test Focus

The first audience is:

```text
Independent and boutique consultants
```

The working wedge is:

```text
Client-facing AI work should be challenged before action.
```

The research should prioritize evidence about:

- AI overconfidence.
- Hollow flattery from assistants.
- Hallucination in professional work.
- Missing assumptions in client deliverables.
- Reputational risk for consultants.
- The gap between confidence and correctness.

Deprecated hook, do not use in new ad concepts:

```text
You don't know what you're missing. Find out before it costs you.
```

## Human Review

The system should produce human-reviewable actions:

- Source documents worth keeping.
- Pain points worth using.
- Ad angles worth testing.
- Ad variants worth generating or uploading.
- Risk notes that should stop weak or misleading creative.

Manual Meta upload remains the right boundary for this phase.

## Current Boundary

This migration creates the warehouse foundation only.

External API calls come next. This migration does not:

- Call Serper.
- Call Exa.
- Call Firecrawl.
- Call Keywords Everywhere.
- Call Meta.
- Upload ads.
- Deploy Hermes.
- Build a UI.

## Next Implementation Step

The next smallest implementation step is a local script that creates a `workflow_runs` record and inserts manually supplied source documents into `source_documents`, then extracts a small set of `pain_points` for review.
