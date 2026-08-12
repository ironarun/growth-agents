# Devin Transition

## Operating Model

ChatGPT remains the strategic and review layer.

Devin becomes the implementation worker.

GitHub is the source of truth for code review, PR history, and merge decisions.

Repo docs, not chat threads, hold durable memory.

## Current Growth Agents State

Growth Agents now has a generic multi-client workspace contract in:

```text
docs/CLIENT-WORKSPACE-SPEC.md
```

Each client workspace lives under:

```text
clients/{client-slug}/
```

Verbatim is client one. It is not the hardcoded model.

Future clients should start from:

```text
clients/_template/
```

Before agent work begins for a client, the workspace should pass:

```text
npm.cmd run validate:client -- --client {client-slug}
```

## Repo Boundary

Growth Agents owns GTM infrastructure, campaign workspaces, monitoring, reporting, research, recommendations, and decision loops.

Product repos remain separate.

For Verbatim, product work belongs in:

```text
C:\Users\Arun\ai-highlighter
```

That repo owns the product, website, extension, and funnel instrumentation.

## Paid Ads State

The Verbatim consultant campaign failed before AddToChrome intent.

The Verbatim Suspiciously Polished campaign produced AddToChromeClick intent, but did not produce active usage or customers.

No further Verbatim paid tests should run until activation tracking and onboarding improve.

## Likely First Devin Implementation Task

The first Devin implementation task after onboarding should likely be Chrome install onboarding and activation tracking in `ai-highlighter`.

The needed instrumentation includes:

- confirmed install
- extension opened
- V button clicked
- Debate started
- Debate completed
- retained usage
- customer/subscription signal

## Guardrails

Do not use Growth Agents to change product code.

Do not build Meta write automation unless explicitly requested.

Do not change budgets, pause ads, create ads, or upload ads unless explicitly requested.

Do not commit generated `output/run-*` artifacts unless explicitly approved.

Human approval is required before customer-facing actions, paid-media changes, external publishing, or product changes.
