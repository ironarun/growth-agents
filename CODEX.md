# CODEX.md

## Role

Codex is the implementation agent for this repo.

ChatGPT is the strategic build partner.

Arun drives.

Codex should implement small, reviewable changes and avoid speculative architecture.

## Default working loop

For each task:

1. Inspect the relevant files.
2. State what exists.
3. State the smallest useful change.
4. Make the change.
5. Run the relevant command or test.
6. Report exactly what changed.
7. Report what remains.

## First responsibility

Do not start by coding.

First, inspect the repo and produce an implementation readiness report.

Read:

- `CLAUDE.md`
- `ARCHITECTURE.md`
- `SETUP.md`
- `WEEKEND-PLAN.md`
- `briefs/verbatim-consultant-test.md`
- `AGENTS.md`
- `CODEX.md`
- `package.json`
- `tsconfig.json`

Then report:

1. What exists
2. What is missing
3. Whether the repo is ready for `creative-generator` v0
4. The smallest next coding task
5. Any risks that would cause us to build a flashy demo instead of useful infrastructure

## Important context

This project is inspired by GTM engineering workflows where agents create marketing assets, analyze campaigns, and recommend next actions.

But the goal is not to copy anyone else.

The goal is to build Arun’s own narrow, useful GTM infrastructure layer for Verbatim first.

The long-term lesson is the operating know-how:
- how to structure the data
- how to create agent-readable context
- how to constrain workflows
- how to keep humans in the approval loop
- how to feed performance data back into the next action

## Phase 1 implementation target

Build `creative-generator` v0.

Location:

```text
agents/paid-ads/skills/creative-generator/
```

Initial goal:

```text
JSON brief → variant plan → output/run-{timestamp}/manifest.json
```

Do not render PNGs in the first skeleton unless explicitly asked.

The first skeleton should:
- read a sample JSON brief
- generate structured variant records
- write `manifest.json`
- create a timestamped output folder
- be runnable through an npm script

Only after the skeleton works should PNG rendering be added.

## Do not build yet

Do not build these until explicitly requested:

- Meta API uploader
- autonomous ad optimization
- data warehouse
- MCP server
- Hermes deployment
- full multi-agent runtime
- multi-client dashboard

## Commands and reporting

When giving commands, be exact.

Good:

```bash
npm run generate:creative
```

Bad:

```text
Run the app and see if it works.
```

When done, report:

```text
Files changed:
- path/to/file

Command run:
- npm run ...

Result:
- success or failure

Next recommended step:
- ...
```

## Failure behavior

If something fails:

1. Do not keep looping.
2. Show the error.
3. Name the likely cause.
4. Propose the next smallest diagnostic.

## Copy rules

Customer-facing Verbatim copy must avoid em dashes.

Avoid:
- leverage
- transform
- revolutionize
- AI-powered
- seamless
- unlock

Prefer:
- pressure-test
- confidence
- before you rely on it
- what’s missing
- what could go wrong
- client-facing risk
