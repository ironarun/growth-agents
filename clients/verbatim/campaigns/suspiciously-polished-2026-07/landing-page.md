# Landing Page: Suspiciously Polished

**Production URL:** `https://helloverbatim.com/suspiciously-polished`
**Route:** `/suspiciously-polished`
**Implementation repo:** `ai-highlighter`
**GTM documentation repo:** `growth-agents`

## Role in the campaign

The page receives Meta traffic from both approved creatives and explains the consumer problem behind Suspiciously Polished.

The page should make clear that:

- some AI answers sound more trustworthy than they are
- Verbatim has another model challenge the answer
- Debate is the skepticism layer
- Council compares multiple models
- Library saves what the user wants to keep
- Insights tracks model behavior over time

## Product behavior rules

- Debate starts from the Verbatim V button.
- Highlighting belongs to Library.
- We do not highlight what we distrust.
- We highlight what we want to keep.
- Do not invent a flow in which highlighting launches Debate.

## Tracking

Verified events:

```text
PageView
AddToChromeClick
```

Verified `AddToChromeClick` parameters:

```json
{
  "page": "suspiciously-polished",
  "headline": "suspiciously-polished"
}
```

## Current production copy audit

A live-page audit on 2026-07-26 confirmed that the page still contains inaccurate free-product language:

```text
Add to Chrome · Free
Verbatim is a free Chrome extension. Adding it is how you try it.
Free Chrome extension. Requires desktop Chrome.
```

This conflicts with the current trial-to-paid product model.

Required action:

```text
Correct the production copy in ai-highlighter before campaign spend is scaled.
```

Do not patch this in `growth-agents`. This file records the requirement and the campaign risk.

## Navigation audit

The production HTML currently includes links for About, Benchmark, Blog, Papers, FAQ, and Sign in. Because a paid landing page was intended to use a focused logo-only header, visually confirm whether those links are visible on the live page. If visible, record a separate `ai-highlighter` correction.

## Current hero state

The production page currently leads with:

```text
Does your AI answer look suspiciously polished?
```

The deployed supporting line uses `Pressure-test any AI answer in place...`. That wording is deployed state. Do not silently revise it from the Growth Agents workspace. A copy change requires explicit approval and implementation in `ai-highlighter`.
