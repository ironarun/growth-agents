# Atlas Runtime Status

## 1. Runtime Status

- Hermes is installed on native Windows.
- Hermes version: `v0.14.0 (2026.5.16)`.
- Atlas profile exists.
- Atlas is invoked with:

```powershell
hermes -p atlas
```

- The generated `atlas` wrapper opens as a shell script on Windows and should not be used directly.

## 2. Atlas Profile

Profile path:

```text
C:\Users\Arun\AppData\Local\hermes\profiles\atlas
```

Profile setup:

- `SOUL.md` was copied from the repo boot file.
- Working directory is fixed to:

```text
C:\Users\Arun\growth-agents
```

## 3. Terminal Proof Result

Command:

```powershell
hermes -p atlas -z "<SMOKE-TASK instruction>"
```

Atlas read:

- `SOUL.md`
- `INSTRUCTIONS.md`
- `SMOKE-TASK.md`
- `REPORT.template.md`
- `docs/EXECUTION-ROADMAP.md`

Command results:

- `npm.cmd run supabase:smoke` passed.
- `npm.cmd run consultant:ad-review` passed.
- `npx.cmd tsc --noEmit` passed.

Smoke test output:

- `workflow_run` id: `13ff334e-698f-4fca-bd35-a1652ce85372`
- Consultant ad review output path:

```text
C:\Users\Arun\growth-agents\output\run-2026-05-26T19-58-35-927Z\consultant-ad-review.md
```

- `sample_evidence_warning`: yes.
- No secrets printed.

## 4. Current Limitation

- Atlas is not connected to Telegram yet.
- Web Search and Extract tools are not configured in Hermes yet.
- The ad review still uses sample evidence.
- Serper consultant pain search has not been built yet.

## 5. Next Steps

1. Build the Serper consultant pain search workflow in the repo.
2. Have Atlas run the search and ad review through approved commands.
3. Configure Telegram only after the local workflow is stable.

