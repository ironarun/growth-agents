# Content Distribution Loop Checkpoint 2026-06-21

## Current Main Branch Tip

Current recent tip from `git log --oneline -15`:

```text
657593d feat: ingest LinkedIn analytics exports
```

Recent content/distribution commits include:

- `c006ad3 feat: review distribution performance logs`
- `d142f7d feat: rewrite drafts with approved replacement source`
- `809fa7a feat: extract approved replacement sources`
- `4d62ef7 feat: generate missing layer LinkedIn comments`
- `957b88f feat: log manual distribution performance`
- `00e4425 feat: generate LinkedIn distribution drafts from published artifacts`
- `28dbb43 feat: log manually published content artifacts`
- `3d98ccd docs: capture first content run retrospective`

## Completed Content And Distribution Workflow

The Verbatim content/distribution loop now covers the first real source-to-published-to-measured cycle:

1. Discover source surfaces through bounded Serper search.
2. Extract one approved source with Firecrawl.
3. Clean extracted source text.
4. Generate a richer content brief from extracted source text.
5. Generate a draft from the extracted-source brief.
6. Review source authority and attribution strategy.
7. Detect when a replacement example is needed.
8. Retrieve higher-authority replacement examples.
9. Extract the approved replacement source.
10. Rewrite the draft using the approved replacement source.
11. Log the manually published article artifact.
12. Generate a LinkedIn distribution draft.
13. Log or ingest distribution performance.
14. Review distribution performance conservatively.

Manual publishing remains intentional because public writing needs human judgment. The repo should assist source handling, drafting, review, and measurement, not bypass editorial approval.

## New Scripts Added Since The Prior Roadmap

Current `scripts/` list:

- `extract-approved-content-source.ts`
- `extract-replacement-source.ts`
- `generate-brief-from-extracted-source.ts`
- `generate-consultant-ad-review.ts`
- `generate-content-brief.ts`
- `generate-content-draft.ts`
- `generate-draft-from-extracted-source-brief.ts`
- `generate-linkedin-distribution-draft.ts`
- `generate-missing-layer-comment.ts`
- `ingest-linkedin-analytics-export.ts`
- `ingest-manual-consultant-sources.ts`
- `log-distribution-performance.ts`
- `log-published-artifact.ts`
- `retrieve-replacement-examples.ts`
- `review-content-draft.ts`
- `review-distribution-performance.ts`
- `rewrite-content-draft.ts`
- `rewrite-with-approved-replacement.ts`
- `search-consultant-ai-pain.ts`
- `supabase-smoke-test.ts`

Newer content/distribution loop scripts added after the first source-to-draft work:

- `extract-replacement-source.ts`
- `generate-linkedin-distribution-draft.ts`
- `generate-missing-layer-comment.ts`
- `ingest-linkedin-analytics-export.ts`
- `log-distribution-performance.ts`
- `log-published-artifact.ts`
- `retrieve-replacement-examples.ts`
- `review-distribution-performance.ts`
- `rewrite-with-approved-replacement.ts`

## What Each Script Does

- `search-consultant-ai-pain.ts`: Runs bounded Serper searches, stores source and review candidates, and creates consultant ad/content opportunities.
- `extract-approved-content-source.ts`: Extracts one approved content source with Firecrawl and cleans the text for stronger brief generation.
- `generate-brief-from-extracted-source.ts`: Turns cleaned extracted source text into a richer Verbatim content brief with authority and attribution gates.
- `generate-draft-from-extracted-source-brief.ts`: Generates a reviewable Verbatim draft from the extracted-source brief.
- `review-content-draft.ts`: Produces an editorial critique before rewrite or publication.
- `rewrite-content-draft.ts`: Rewrites a draft using the editorial review while preserving human review gates.
- `retrieve-replacement-examples.ts`: Searches for higher-authority replacement examples when low-authority attribution or derivative risk is detected.
- `extract-replacement-source.ts`: Extracts and cleans the approved replacement source, producing a replacement-source brief.
- `rewrite-with-approved-replacement.ts`: Rewrites an existing draft using the approved replacement source brief.
- `log-published-artifact.ts`: Records a manually published article and ties it back to the source pipeline artifacts.
- `generate-linkedin-distribution-draft.ts`: Creates a human-reviewable LinkedIn post draft from the latest published artifact.
- `log-distribution-performance.ts`: Logs manually entered distribution performance when exports are not available or when placeholder records are needed.
- `ingest-linkedin-analytics-export.ts`: Reads a LinkedIn single-post analytics Excel export and produces a structured analytics snapshot.
- `review-distribution-performance.ts`: Reviews distribution performance from the manual log plus the latest LinkedIn analytics snapshot when available.
- `generate-missing-layer-comment.ts`: Drafts high-quality LinkedIn comments using the missing-layer pattern.
- `generate-consultant-ad-review.ts`: Generates a warehouse-backed consultant ad review from Supabase review items.
- `ingest-manual-consultant-sources.ts`: Ingests manually collected consultant research sources into Supabase.
- `generate-content-brief.ts`: Generates an initial snippet-based content brief from content opportunity review items.
- `generate-content-draft.ts`: Generates an initial content draft from the latest content brief.
- `supabase-smoke-test.ts`: Verifies the repo can write/read the Supabase warehouse.

## Current Manual Human Steps

- Select which source or replacement example is editorially acceptable.
- Approve source extraction before using it in a stronger brief.
- Edit and approve content briefs, drafts, rewrites, and final article copy.
- Publish blog posts manually.
- Publish LinkedIn posts manually.
- Export LinkedIn analytics from LinkedIn.
- Decide whether a comment, reply, follow-up post, or new article should be created from qualitative feedback.

Manual publishing remains part of the design. The public version needs judgment, not just automation.

## Current Automated Steps

- Bounded source discovery through approved scripts.
- Single-source extraction and cleanup.
- Source authority and attribution strategy gating.
- Replacement example retrieval and classification.
- Replacement source extraction and brief creation.
- Draft generation and rewrite artifact creation.
- Published artifact logging.
- LinkedIn distribution draft generation.
- LinkedIn analytics Excel ingestion.
- Distribution performance review with conservative sufficiency rules.

## LinkedIn Analytics Export Ingestion Behavior

`consultant:ingest-linkedin-analytics` reads `LINKEDIN_ANALYTICS_EXPORT_PATH` and parses the LinkedIn Excel export sheet named `Post analytics`.

It generates:

```text
output/run-{timestamp}/linkedin-analytics-snapshot.md
```

The snapshot includes:

- Source export path
- Channel
- Post URL
- Post date
- Post publish time
- Snapshot imported timestamp
- Metrics table
- Demographics table
- Data completeness notes
- Approval checkboxes

LinkedIn analytics are not manually typed. They are ingested from Excel export snapshots.

The script preserves LinkedIn's own fields. It does not fabricate clicks. If LinkedIn provides `Link engagements`, that remains `Link engagements`; it is not converted into clicks.

Future analytics snapshots should be treated as time-based snapshots, not overwrites. A later export should create a later snapshot artifact so the loop can see how post performance changes over time.

## Current Waiting State

The latest LinkedIn analytics snapshot produced an early weak signal:

- Impressions: `52`
- Reactions: `3`
- Comments: `1`
- Reposts: `0`
- Link engagements: `0`
- Clicks: `unknown`
- No qualitative notes

The performance review now treats this as limited data, not a sufficient basis for a confident next content/action recommendation.

Important rule: performance review must not over-interpret low-impression data. A single comment may be worth reading manually, but it is not enough to infer audience response.

## Next Operational Step For This Loop

Wait for more LinkedIn data, then export another single-post analytics snapshot and run:

```text
npm.cmd run consultant:ingest-linkedin-analytics
npm.cmd run consultant:distribution-performance-review
```

If the later snapshot still shows weak performance at a larger sample size, consider testing a sharper distribution angle around the concrete KPMG incident and the process-failure frame.

Do not build more content plumbing until there is a real operational need.

## Recommended Next Build Direction

The content/distribution loop is now complete enough to pause.

Next build priority should return to Paid Ads Agent v0.1, starting with funnel and instrumentation readiness, not more content infrastructure.

The priority remains:

1. Verify the Verbatim funnel.
2. Confirm Pixel, domain, signup/waitlist, CTA tracking, and destination URL readiness.
3. Then resume paid ads workflow work.

This matches the repo rule from `AGENTS.md`: funnel instrumentation comes before creative volume.

