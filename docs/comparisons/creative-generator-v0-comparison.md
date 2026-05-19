# Creative Generator v0 Comparison

## Baseline

Starting point:

- `baseline/creative-generator-skeleton`
- Commit: `426d6df`
- Task: build creative-generator v0 as JSON brief -> variant records -> manifest.json

## Codex result

Branch:

- `codex/step-0-readiness`

Commit:

- `87bf5e8`

Summary:

- Produced a lean implementation.
- Added `sample-brief.json`, `index.ts`, npm script.
- Also edited `tsconfig.json` to enable Node types.
- Generated 10 variants and passed TypeScript.

Diff artifact:

- `docs/comparisons/codex-creative-generator.diff`

## Claude Code result

Branch:

- `claude/creative-generator-skeleton`

Commit:

- `771a50b`

Summary:

- Produced a richer implementation.
- Added a more detailed sample brief with targeting context.
- Generated variants as hooks x visual treatments.
- Avoided editing `tsconfig.json` by using a local Node type reference.
- Generated 10 variants and passed TypeScript.

Diff artifact:

- `docs/comparisons/claude-creative-generator.diff`

## Decision

Claude Code wins this first task narrowly.

Reason:

- Better context retention.
- Better brief structure.
- Cleaner variant planning logic.
- Fewer config-level changes.

Codex still performed well:

- Smaller implementation.
- Stayed in scope.
- Passed tests.
- Useful as a lean implementation lane.

## Current operating model

Use hybrid mode for now:

- ChatGPT coordinates the build and comparison.
- Claude Code is favored for context-heavy implementation.
- Codex remains useful for lean implementation and speed tests.
- Repo docs remain the source of truth.

No model owns the company memory. The repo owns the memory.
