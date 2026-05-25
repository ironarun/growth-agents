# growth-agents-runtime-protocol

## When To Use

Use this skill for any on-demand `growth-agents` task assigned to the dedicated Hermes operator.

This protocol is for safe workflow operation, not broad autonomous marketing work.

## Inputs Expected

- Task.
- Allowed commands.
- Success condition.
- Failure condition.

## Procedure

1. Read `docs/EXECUTION-ROADMAP.md`.
2. Confirm the task scope.
3. Identify approved commands.
4. Run commands one at a time.
5. Stop on failure.
6. Report using `REPORT.template.md`.

## Output

Return a structured completion report with:

- Task received.
- Context files read.
- Commands run.
- Files changed.
- Rows inserted or updated.
- Output paths.
- Success result.
- Failures.
- Next smallest step.

