# First Content Run Retrospective

## Summary

The first real Verbatim content-engine run produced and published:

https://helloverbatim.com/blog/ai-workflow-responsible-for-disagreement

The run used Serper source discovery, Firecrawl extraction, extracted source cleaning, a brief from extracted source text, draft generation, source authority review, replacement-example detection, replacement-example retrieval, human editorial judgment, and manual publication.

The core lesson: a source can be useful as an idea trigger without being useful as an attributed reference.

## What The System Did Well

- Found a relevant source about AI output verification.
- Extracted and cleaned the source text.
- Generated a strong content brief from the extracted source.
- Generated a usable first draft.
- Flagged the original source as low authority.
- Recommended no attribution for the low-authority LinkedIn source.
- Identified derivative risk around source-specific framing.
- Flagged that an independent replacement example was needed.
- Retrieved a strong replacement example after refinement: the KPMG report withdrawal covered by TechCrunch.

## What The Human Changed

- Dropped attribution to the low-authority source.
- Replaced abstract and legal framing with the concrete KPMG/TechCrunch example.
- Used the EY example as a reinforcing case.
- Tightened the article for publication.
- Published manually.

## Core Lessons

- Source relevance is not source authority.
- Attribution is a strategic decision, not an automatic obligation.
- Detection without replacement creates thinner drafts.
- Replacement examples need to be concrete incidents, not background explainers.
- Human review worked as intended.

## New Infrastructure Added

- Source authority and attribution gate.
- Replacement Example Need section in extracted-source briefs.
- Replacement-example retrieval workflow.
- Page-type filtering for replacement candidates.
- Canonical URL dedupe.
- Strong concrete example classification.

## Remaining Gaps

- No automatic draft rewrite using an approved replacement yet.
- No published artifact logger yet.
- No distribution workflow yet.
- No performance feedback loop yet.
- No analytics from published content back into the next content recommendation.

## Next Recommended Steps

1. Add published artifact logger.
2. Add manual approval path from `replacement-example-review.md`.
3. Add rewrite-from-approved-replacement step.
4. Create LinkedIn distribution draft from the published article.
5. Track performance manually before automating.
