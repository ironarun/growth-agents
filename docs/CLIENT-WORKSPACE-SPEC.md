# Client Workspace Specification

Growth Agents supports multiple clients. Each client gets one durable workspace under:

```text
clients/{client-slug}/
```

Verbatim is the first completed example. It is not the hardcoded model.

## Purpose

A client workspace is the source of truth for GTM agents. It keeps client context, campaign records, decision logs, launch notes, tracking constraints, and closeouts in one repo-visible structure.

Product repos remain separate from Growth Agents. If work requires changing a website, extension, app, database, or production product code, it belongs in the product repo. Growth Agents stores GTM infrastructure, campaign planning, reporting, and human-reviewable recommendations.

## Required Structure

```text
clients/{client-slug}/
  client.config.json
  decision-log.md
  context/
    brand.md
    product.md
    audience.md
    offer.md
    voice.md
    tracking.md
  campaigns/
    {campaign-slug}/
      campaign.config.json
      campaign-brief.md
      ads.md
      landing-page.md
      tracking-checklist.md
      launch-report.md
      decision-log.md
      campaign-closeout.md
      assets/
        README.md
      outputs/
        README.md
```

`campaign-closeout.md` is optional for active campaigns. It is required when a campaign status is ended, closed, failed, or paused.

## Client Context

Client context files are shared inputs for GTM agents:

- `brand.md`: brand system, identity, visual constraints, logo and asset rules.
- `product.md`: product truth, workflow constraints, feature boundaries, unsupported claims.
- `audience.md`: target users, excluded users, pain, motivations, objections.
- `offer.md`: pricing, package, CTA, destination, conversion path, known offer risks.
- `voice.md`: language rules, approved phrases, banned phrases, tone constraints.
- `tracking.md`: events, pixels, conversion semantics, attribution limits, fields to ignore.

Agents should read these files before creating customer-facing recommendations.

## Campaign Folders

Each campaign folder preserves:

- campaign configuration
- campaign brief
- ad records
- landing-page requirements
- tracking checklist
- launch report
- closeout when applicable
- local asset notes
- output pointers
- campaign-specific decisions

Campaign folders should be append-friendly. Do not rewrite historical decisions to make later conclusions look cleaner.

## Config Rules

Scripts should read `clients/{client-slug}/client.config.json` and campaign config files instead of hardcoding Verbatim values.

Config files should contain durable facts, not secrets. Do not commit API keys, access tokens, ad account credentials, private customer data, or `.env` contents.

## Generated Outputs

Generated artifacts belong in:

```text
output/run-{timestamp}/
```

Generated `output/run-*` artifacts should not be committed unless explicitly approved. Client workspaces may include README files that point to outputs, but generated run folders should stay outside the client workspace.

## Human Review

Human approval is required before:

- customer-facing copy changes
- public website changes
- paid media changes
- budget changes
- campaign pausing
- ad uploads
- external publishing
- claims about performance or attribution

Agents may produce recommendations and artifacts. They must not silently perform public or paid actions.

## Starting a New Client

1. Copy `clients/_template/` to `clients/{client-slug}/`.
2. Fill in client context files.
3. Fill in `client.config.json`.
4. Create the first campaign folder from `clients/_template/campaigns/_template/`.
5. Run:

```text
npm.cmd run validate:client -- --client {client-slug}
```

Do not begin agent work until the workspace validates.
