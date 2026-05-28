# Content Engine Workflow

## 1. Purpose

The content engine turns live source discovery into reviewable Verbatim content drafts.

It is not an autopublishing system. It is a source-to-draft workflow that keeps each step human-reviewable.

## 2. Core Frame

AI creates confident work faster than humans can verify it.

Verbatim creates the adversarial review layer for moments where trust matters.

Key question:

```text
What part of your AI workflow is responsible for disagreement?
```

## 3. Current Workflow

```powershell
npm.cmd run consultant:search-pain
npm.cmd run consultant:content-opportunities-review
npm.cmd run consultant:content-brief
npm.cmd run consultant:content-draft
npm.cmd run consultant:content-edit-review
npm.cmd run consultant:content-rewrite
```

## 4. What Each Script Does

`scripts/search-consultant-ai-pain.ts`

Runs the bounded Serper consultant AI pain search. It stores raw search events, normalizes source documents, extracts conservative pain points, creates ad angle review items, and creates `content_opportunity` review items from source surfaces related to AI governance, consulting, risk, and AI workflows.

`scripts/generate-content-opportunities-review.ts`

Reads `content_opportunity` human review items from the latest completed `consultant_ai_pain_search` workflow and writes a markdown review file for source selection.

`scripts/generate-content-brief.ts`

Reads approved or pending `content_opportunity` review items from the latest completed search workflow and turns one selected opportunity into a human-reviewable content brief.

`scripts/generate-content-draft.ts`

Finds the latest `content-brief.md` artifact and creates a short Verbatim response draft from the existing brief data only. It does not read Supabase or the source page.

`scripts/review-content-draft.ts`

Finds the latest `content-draft.md` artifact and produces a strict editorial critique. It identifies public-readiness issues, internal process language, weak openings, missing product ladder context, and rewrite instructions.

`scripts/rewrite-content-draft.ts`

Finds the latest `content-draft.md` and `content-edit-review.md`, then creates a stronger review-required rewrite. The rewrite keeps product language reader-facing and moves product-name mapping into editor notes.

## 5. Human Review Gates

- Content opportunities are `human_review_items`.
- Briefs require approval before drafting.
- Drafts require editorial review before revision.
- Rewrites require human approval before publishing.
- Nothing publishes automatically.

The workflow should produce better judgment, not remove judgment.

## 6. Current Limitations

- Search uses Serper snippets only.
- No Firecrawl extraction yet.
- No Strapi publishing.
- No sitemap or Search Console automation.
- No LinkedIn posting.
- No Meta upload.
- No autopublishing.

## 7. Next Likely Additions

- Firecrawl extraction for one approved source.
- Publish-ready markdown export.
- Strapi draft creation.
- Sitemap and Search Console workflow.
- Daily Atlas-run workflow.
- Telegram operation after the local workflow stabilizes.

## 8. Safety Rules

- Do not expose secrets.
- Do not publish automatically.
- Do not scrape every result.
- Do not call Firecrawl until a source is selected.
- Do not touch `ai-highlighter` unless explicitly assigned.
- Keep generated output human-reviewable.

## 9. Example Command Sequence

```powershell
npm.cmd run consultant:search-pain
npm.cmd run consultant:content-opportunities-review
npm.cmd run consultant:content-brief
npm.cmd run consultant:content-draft
npm.cmd run consultant:content-edit-review
npm.cmd run consultant:content-rewrite
npx.cmd tsc --noEmit
```

