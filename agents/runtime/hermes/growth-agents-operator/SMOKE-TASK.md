# SMOKE TASK

## Objective

Prove the dedicated Hermes operator can run approved repo commands without exposing secrets.

## Repo Path

```text
C:\Users\Arun\growth-agents
```

## Required Context

Read first:

```text
docs/EXECUTION-ROADMAP.md
```

Use if needed:

```text
AGENTS.md
CODEX.md
docs/CONSULTANT-AD-RESEARCH-WORKFLOW.md
docs/API-SOURCES.md
```

## Approved Commands

```powershell
npm.cmd run supabase:smoke
npm.cmd run consultant:ad-review
npx.cmd tsc --noEmit
```

## Forbidden Actions

- Do not edit `.env`.
- Do not print secrets.
- Do not touch `ai-highlighter`.
- Do not post publicly.
- Do not upload ads.
- Do not spend money.
- Do not scrape LinkedIn.
- Do not bypass CAPTCHA or anti-abuse systems.
- Do not change Supabase schema.
- Do not run unbounded API loops.

## Required Output

Report:

- Exact commands run.
- Whether each command passed.
- `workflow_run` id from the smoke test if available.
- Consultant ad review output path if generated.
- Confirmation that no secrets were printed.

## Failure Condition

Stop immediately if any approved command fails.

Report the exact failing command, visible error output, and next smallest diagnostic.

