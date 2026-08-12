# DEVIN.md

## Operating Rules

Use GitHub pull requests for all changes.

Never merge without Arun approval.

Prefer small PRs that are easy to review. Keep each PR focused on one implementation task or one documentation task.

Do not create a second repo.

Do not modify any stash.

## Repo Boundaries

`growth-agents` is for GTM infrastructure, campaign workspaces, reporting, research, recommendations, and decision loops.

Product repos remain separate from Growth Agents.

`ai-highlighter` is the Verbatim product repo. It owns Verbatim product, website, extension, funnel instrumentation, and production application changes.

Future product repos should be treated the same way: product code belongs in the product repo, not in Growth Agents.

## Paid Media Guardrails

Do not build Meta write automation unless explicitly requested.

Do not change budgets, pause ads, create ads, upload ads, or modify Meta campaigns unless explicitly requested.

Human approval is required before paid-media changes.

## Generated Artifacts

Do not commit `output/run-*` artifacts unless explicitly approved.

Generated reports and intermediate outputs should normally remain untracked.

## Client Workspace Rules

Use `clients/{client}/client.config.json` and campaign configs as the source of truth.

Use `docs/CLIENT-WORKSPACE-SPEC.md` as the multi-client contract.

Verbatim is the first completed client workspace, not the hardcoded model.

Future clients should start from `clients/_template`.

## Human Approval Gates

Human approval is required before:

- customer-facing actions
- paid-media changes
- external publishing
- product changes
- public website changes
- production funnel instrumentation changes

## Validation

Run relevant validation commands before reporting success.

For client workspace changes, run:

```text
npm.cmd run validate:client -- --client {client-slug}
```

For TypeScript changes, run:

```text
npx.cmd tsc --noEmit
```

Report any command that could not be run and why.
