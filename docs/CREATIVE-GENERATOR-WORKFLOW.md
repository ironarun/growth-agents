# Creative Generator Workflow

## Purpose

The creative-generator should not generate random ad variants from a written brief alone.

The goal is to build a repeatable creative workflow that can learn from research, approved examples, reusable templates, and eventually performance data.

## Current workflow

The current v0.2 workflow is:

```text
sample-brief.json
-> researchInputs
-> referenceExamples
-> templateCandidates
-> approvedTemplates
-> variant records
-> output/run-{timestamp}/manifest.json
```

No PNG rendering happens yet.

That is intentional.

The manifest layer must become stable before visual rendering, Meta upload, or performance analysis.

## Why templates matter

Ad generation should not begin from a blank page.

A useful creative-generator should be able to accept:

- audience research
- pain points
- competitor patterns
- resonant copy patterns
- resonant visual patterns
- approved example ads
- user-selected references
- prior winning creative patterns

From those inputs, it should propose reusable template candidates.

Only approved templates should be used for variant generation.

## Intended future workflow

```text
research audience pain
-> research resonant ad copy and creative patterns
-> collect reference examples
-> infer template candidates
-> human approves templates
-> generate variants from approved templates
-> render static assets
-> manually upload to Meta
-> collect funnel and performance data
-> recommend next creative test
```

## Template records

A template candidate should include:

- `templateId`
- `templateName`
- `sourceReferences`
- `layoutPattern`
- `copyPattern`
- `visualRules`
- `whyThisTemplate`
- `approvalStatus`

Allowed approval statuses:

- `approved`
- `needs-review`
- `rejected`

Only `approved` templates should generate variants.

## Variant records

Each generated variant should link back to a template.

A variant should include:

- `id`
- `templateId`
- `hook`
- `bodyCopy`
- `visualTreatment`
- `audience`
- `status`
- `notes`

The `templateId` matters because future performance analysis should tell us which template pattern worked, not just which individual ad worked.

## Research inputs

The research layer should eventually be supplied by a separate skill, likely `pain-point-scraper` or a future research-planner.

For now, research fields can be human-curated placeholders.

Research inputs should include:

- `audiencePainPoints`
- `competitorPatterns`
- `resonantCopyPatterns`
- `resonantVisualPatterns`
- `objectionsToAddress`
- `sourceNotes`

## Reference examples

Reference examples can be:

- real ads
- screenshots
- competitor examples
- user-approved creative samples
- written descriptions of a creative model
- prior winning variants

In early versions, reference examples may be structured text only.

Later, the generator should accept image files or links and extract useful template patterns from them.

## Current boundary

Do not build these yet:

- PNG rendering
- Meta API upload
- autonomous optimization
- Supabase warehouse tables
- live scraping
- MCP server
- Hermes deployment

The next safe implementation step is to harden schema validation and make the brief path configurable from the CLI.

## Core principle

Do not generate more creative before the system knows what pattern it is testing.

Templates first.

Variants second.

Rendering third.

Performance feedback fourth.
