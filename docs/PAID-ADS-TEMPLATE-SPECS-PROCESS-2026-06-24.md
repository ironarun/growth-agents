# Paid Ads Template Specs Process

## Purpose

The template spec step turns captured Meta Ad Library pattern analysis into human-reviewable Verbatim static ad template families.

It sits between creative research and rendering:

1. Capture Meta Ad Library examples.
2. Reprocess captured text into structured records.
3. Analyze creative patterns.
4. Generate template specs.
5. Human reviews and approves template families.
6. Renderer implementation happens only after approval.

## Current Input

The generator reads a paid ads creative pattern analysis JSON file, such as:

```text
output/run-2026-06-24T05-26-18-832Z/paid-ads-creative-pattern-analysis.json
```

The analysis should come from real captured and reprocessed Meta Ad Library records, not placeholder template data.

## Command

```powershell
npm.cmd run consultant:paid-ads-template-specs -- --analysis-path .\output\run-2026-06-24T05-26-18-832Z\paid-ads-creative-pattern-analysis.json
```

## Output

The generator writes:

```text
output/run-{timestamp}/paid-ads-template-specs.json
output/run-{timestamp}/paid-ads-template-specs.md
```

The markdown file is for human review. The JSON file is the structured handoff for a future renderer pass.

## First Template Families

The first Verbatim template families are:

- large-hook-plus-proof-block
- checklist-or-scoring-visual
- before-client-review-workflow

These map captured competitor patterns into safe Verbatim structures without copying competitor creative.

## Human Gate

Every generated template spec must include:

```json
"approved_for_rendering": false
```

Rendering should not proceed until Arun approves a specific template family and any required copy slots.

## Brand Rules

Use the canonical Verbatim assets in:

```text
brand/verbatim/
```

Required rules:

- Use `brand/verbatim/logo-pink.png` on light backgrounds.
- Use `brand/verbatim/logo-white.png` only on dark backgrounds.
- Use brand pink `#f12258` as an accent only.
- Use white, off-white, ink, muted, and border neutrals from the brand docs.
- Do not make the ads generic hot-pink designs.
- Do not invent logos, customer names, fake product screens, or fake metrics.
- Do not make absolute correctness or accuracy promises.
- Do not use em dashes in customer-facing copy.

## Safe Verbatim Language

Allowed language includes:

- adversarial review for AI
- checks before action
- challenges confident AI output
- pressure-tests client-facing work
- review before the client sees it

Avoid:

- truth layer
- absolute correctness promises
- accuracy guarantees
- total hallucination coverage claims
- unsupported performance claims

## Renderer Handoff

The template spec output should tell a future renderer:

- which layout family to implement
- which copy slots are required
- which brand assets and colors are allowed
- which visual elements are forbidden
- which source pattern basis supports the template
- which human review checks must pass before rendering

This process does not generate PNGs, upload to Meta, or create final ad variants.
