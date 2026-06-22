# Paid Ads Agent Runtime 2026-06-22

## Purpose

Paid Ads Agent Runtime v0.1 creates the first terminal-facing agent interaction surface in `growth-agents`.

The goal is to stop treating paid ads work as disconnected scripts driven by chat prompts. The runtime accepts a user instruction, extracts source URLs, routes the work to a skill, writes artifacts, and returns a concise terminal response.

## Command

```text
npm.cmd run agent:paid-ads -- "I like this Meta ad. Here's the URL: https://www.facebook.com/ads/library/..."
```

## Current Behavior

The agent:

1. Accepts one natural-language instruction as CLI input.
2. Preserves the full instruction as `user_instruction`.
3. Extracts URLs.
4. Detects Meta Ad Library URLs.
5. Routes Meta Ad Library URLs to `capture-ad-library-source`.
6. Writes `output/run-{timestamp}/agent-run.json`.
7. Writes `output/run-{timestamp}/agent-run.md`.
8. Writes skill artifacts.
9. Requires human review.

If no URL is provided, the agent returns a useful terminal message and does not create a run artifact.

If the URL is unsupported, the agent writes an `unsupported-source` artifact instead of failing silently.

## Current Skill

### capture-ad-library-source

Input:

- `source_url`
- `user_note`

Outputs:

- `output/run-{timestamp}/paid-ads-source-capture.json`
- `output/run-{timestamp}/paid-ads-source-capture.md`
- `data/paid-ads/ad-library-captures/{slug}.json`

The capture record is compatible with the existing creative pattern analyzer schema.

## Browser Capture Boundary

Browser capture is deferred in v0.1.

Reason:

- Meta Ad Library pages may require session state.
- The agent must not bypass CAPTCHA, login walls, rate limits, or anti-automation controls.
- A false extraction is worse than a partial capture.

Current extraction status:

```text
needs_browser_capture
```

The skill captures durable source metadata and URL-derived fields, then marks the record as partial. It does not fabricate advertiser, visible copy, CTA, destination URL, active status, or longevity.

## Human Review Gate

Every agent run includes:

```text
human_review_required: true
```

The current workflow is:

```text
user instruction
-> URL extraction
-> source capture skill
-> partial durable record
-> human/browser review
-> completed capture file
-> creative pattern analyzer
-> renderer direction
```

## What The Agent Does Not Do

Paid Ads Agent v0.1 does not:

- generate ad images
- render PNGs
- upload to Meta
- call OpenAI
- scrape Meta
- crawl multiple ads
- bypass platform controls
- make performance claims from ad longevity
- treat partial captures as creative proof

## Next Likely Step

Add an approved browser capture mode for one Meta Ad Library page at a time.

That mode should:

- capture a screenshot when the page is accessible
- capture visible text
- attempt structured extraction of advertiser, active status, start date, visible copy, CTA, destination URL, platform labels, and multiple-version signals
- stop cleanly if the page is blocked
- preserve the human review gate
