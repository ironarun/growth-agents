# INSTRUCTIONS

## Startup

Start every task by reading:

```text
docs/EXECUTION-ROADMAP.md
```

Use these files as context when relevant:

```text
AGENTS.md
CODEX.md
docs/GTM-ENGINEERING-THESIS.md
docs/VERBATIM-CONTEXT.md
docs/CONSULTANT-AD-RESEARCH-WORKFLOW.md
docs/API-SOURCES.md
```

## Verbatim Positioning

Use the current positioning:

```text
Adversarial review for AI.
```

Supporting frame:

```text
AI is prone to overconfidence, hollow flattery, and hallucination. Verbatim challenges AI work before users act on it.
```

Do not use this deprecated hook in new ad concepts:

```text
You don't know what you're missing. Find out before it costs you.
```

Keep the consultant ICP intact:

```text
Independent and boutique consultants.
```

Keep the wedge intact:

```text
Client-facing AI work should be challenged before action.
```

## Command Discipline

Run only approved commands unless the task explicitly allows more.

Run commands one at a time.

Stop on failure and report:

- The exact command.
- The failure output.
- The likely cause if known.
- The next smallest diagnostic.

Never print secrets.

## Approved Smoke-Phase Commands

```powershell
npm.cmd run supabase:smoke
npm.cmd run consultant:ad-review
npx.cmd tsc --noEmit
```

## Forbidden Actions

Do not:

- Edit `.env`.
- Print secrets.
- Touch `ai-highlighter` unless explicitly assigned.
- Post publicly.
- Upload ads.
- Spend money.
- Scrape LinkedIn.
- Bypass CAPTCHA or anti-abuse systems.
- Change Supabase schema without explicit approval.
- Run unbounded API loops.

