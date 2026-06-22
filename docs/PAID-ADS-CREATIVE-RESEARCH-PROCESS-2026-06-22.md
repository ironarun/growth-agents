# Paid Ads Creative Research Process 2026-06-22

## Purpose

The first deterministic renderer produced a technically valid image, but the visual strategy was too thin. Paid Ads Agent v0.1 needs a creative research layer before more images are rendered.

This process separates:

1. Source capture from Meta Ad Library.
2. Pattern analysis across observed ads.
3. Template direction for the next renderer pass.
4. Rendering and upload, which remain separate human-gated steps.

No image should be rendered from taste alone when observable ad patterns are available.

## What To Search

Use Meta Ad Library manually or through an approved browser agent. Do not scrape Meta. Do not call Meta APIs.

Search competitor and adjacent categories:

- AI writing tools.
- AI meeting tools.
- AI research tools.
- Browser extensions.
- Consultant productivity tools.
- Grammarly-like review tools.
- Notion, Gamma, Jasper-style AI productivity tools.

Search by advertiser and category terms such as:

- Grammarly AI
- Notion AI
- Gamma AI
- Jasper AI
- Otter AI
- Fireflies AI
- Perplexity
- Arc browser extension
- Chrome productivity extension
- consultant productivity
- AI writing assistant
- AI research assistant
- AI meeting notes
- review writing tool
- fact check AI

## What To Capture Per Ad

Capture each ad in `data/paid-ads/ad-library-capture-template.json` or a copy of that file.

Required fields:

- `advertiser`
- `adLibraryUrl`
- `platform`
- `activeStatus`
- `startDateIfVisible`
- `longevitySignal`
- `visualFormat`
- `hookType`
- `offerType`
- `cta`
- `landingPage`
- `visibleCopy`
- `screenshotPath`
- `whyThisAdMayBeWorking`
- `patternTags`
- `relevanceToVerbatim`

Optional but useful notes:

- Whether the ad has multiple active versions.
- Whether the same visual format appears across campaigns.
- Whether the hook is product-led, pain-led, proof-led, offer-led, or curiosity-led.
- Whether the visual is a real product screenshot, fake UI, founder video, testimonial, social proof card, all-type card, or before/after comparison.
- Whether the ad appears to have survived long enough to suggest it may be useful.

Longevity is a proxy, not proof of profitability. An ad can run for a long time because it is profitable, because it is forgotten, because budgets are small, or because the advertiser is testing slowly.

## Research Notes For Verbatim

The current Verbatim campaign frame:

```text
Adversarial review for AI.
```

Current wedge:

```text
Client-facing AI work should be challenged before action.
```

Research should look for durable patterns that can carry this frame without making Verbatim look like enterprise compliance software.

Useful pattern questions:

- Do working ads lead with a question, a claim, proof, or offer?
- Do they show the product, a workflow, a result, or a plain type idea?
- Do they use founder-like language or polished SaaS copy?
- Do they rely on screenshots, testimonials, authority marks, or simple typographic contrast?
- Do they make a professional risk legible without scare tactics?
- Do they clarify one workflow step that is missing?

## Brand And Asset Gap

This repo contains partial Verbatim brand context:

- Primary pink: `#F12258`
- Light pink surface: `#FFF0F2`
- Wordmark text: `Verbatim`
- Voice guidance in `AGENTS.md`, `docs/VERBATIM-CONTEXT.md`, and `briefs/verbatim-consultant-test.md`

A full brand guide and committed logo assets are not present in this repo. Before materially improving the renderer beyond text-only layouts, copy in or reference:

- approved logo or wordmark asset
- favicon or app icon if used
- approved typeface guidance
- approved product screenshots, especially Debate
- examples of existing Verbatim visuals that should be matched

## Analysis Boundary

The analyzer script can summarize repeated patterns from captured examples. It cannot prove which ads are profitable.

The analyzer must not:

- fabricate ad examples
- treat placeholder data as evidence
- conclude an ad worked only because it is active
- recommend rendering from fewer than real captured examples without flagging the limitation

The output should guide the next renderer pass, not replace creative judgment.

## Recommended Research Batch

For the next pass, capture 15 to 25 real examples:

- 3 to 5 from AI writing tools
- 3 to 5 from AI meeting tools
- 3 to 5 from AI research tools
- 2 to 4 from browser extensions
- 2 to 4 from consultant productivity tools
- 2 to 4 from Grammarly-like review tools

The goal is not volume. The goal is enough repeated pattern signal to decide whether the next Verbatim image should be:

- product screenshot led
- missing-workflow diagram
- sharp all-type question
- review card or checklist
- proof or incident-led
- before/after workflow comparison

## Next Renderer Pass

The next renderer should consume a pattern analysis artifact before producing more PNGs.

Expected flow:

```text
Meta Ad Library manual research
-> ad-library-capture.json
-> paid-ads-creative-pattern-analysis
-> renderer template direction
-> human-approved static image render
```

Rendering remains out of scope for this research task.
