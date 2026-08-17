# Paid Ads Operator Runner v0.1

One command runs the existing paid-ads operating workflow from beginning to end and records what happened.

The runner does not reimplement any stage. It resolves the workspaces, then calls the existing scripts as child processes and records their output paths in a run manifest.

## Canonical command

```text
npm run operator -- --client verbatim --campaign suspiciously-polished-2026-07
```

`npm run paid-ads:operator-run` is the same command under the repo `paid-ads:` naming convention.

### Required arguments

- `--client {client-slug}`: a client workspace under `clients/{client-slug}/`.
- `--campaign {campaign-slug}`: a campaign workspace under `clients/{client-slug}/campaigns/{campaign-slug}/`.

Both are required. There is no default client and no default campaign.

## Prerequisites

- `npm install`
- `META_ACCESS_TOKEN` in `.env`, plus the campaign Meta identifiers described in `.env.example`. The runner reads Meta only. It performs no write actions.
- The client workspace must pass `npm run validate:client -- --client {client-slug}`.
- The campaign workspace `campaign.config.json` must declare the requested `campaign_id` and the requested `client_id`.

## Stages

| Stage | What it does | Underlying implementation |
| --- | --- | --- |
| `resolve_client_workspace` | Reads and checks `clients/{client}/client.config.json` | runner |
| `validate_client_workspace` | Runs the existing validator | `scripts/validate-client-workspace.ts` |
| `resolve_campaign_workspace` | Reads and checks `campaign.config.json` | runner |
| `meta_monitoring` | Read-only Meta monitoring | `scripts/ingest-meta-campaign-monitoring.ts` |
| `normalized_summary` | Locates the normalized summary for the campaign and reads its freshness | runner |
| `operator_report` | Paid ads operator report | `scripts/generate-paid-ads-operator-report.ts` |
| `comparative_report` | Comparative paid ads report, or an explicit skip | `scripts/generate-paid-ads-comparative-report.ts` |

## Expected outputs

The stage scripts keep writing where they already write:

- `data/paid-ads/monitoring/raw/`, `data/paid-ads/monitoring/normalized/`, `data/paid-ads/monitoring/reports/`
- `output/run-*/paid-ads-operator-report.md` and `output/run-*/campaign-summary.json`
- `output/run-*/paid-ads-comparative-report.md` and `output/run-*/paid-ads-comparative-summary.json`

The runner adds one file:

```text
output/run-{timestamp}/run-manifest.json
```

`output/` is gitignored. Do not commit run artifacts.

## Success behavior

A run succeeds only when every required stage succeeds. On success the runner prints the run ID, client, campaign, status, source-data freshness, operator report path, comparative report path when one was created, the manifest path, and any warnings, then exits `0`.

## Failure behavior

When a required stage fails, the runner stops, marks the manifest `failed`, records the stage error, prints the run ID, the failed stage, the error, and the manifest path to stderr, then exits nonzero. The manifest is written when the run begins and rewritten after every stage transition, so an interrupted or failed run stays inspectable.

Access tokens and other configured secrets are redacted from the manifest and the console summary.

## Comparative report skips

A missing comparison never fails the run. The comparative stage is recorded as `skipped` with a reason when:

- the requested campaign is not the campaign the comparative implementation supports, or
- no normalized monitoring summary exists for any campaign other than the requested one.

The runner does not manufacture a comparison from incompatible data.

## Source-data freshness

`source_data_as_of` in the manifest comes from the normalized monitoring summary, not from the moment the run started:

- `meta_data_as_of`: when the Meta insights response was read.
- `reporting_range`: the `since` and `until` used for the insights request.
- `source_path`: the normalized summary used.

If the summary exposes neither, the status is `unknown` and a warning is recorded. Freshness reflects when Meta data was read, not live campaign state.

## Run manifest

Location: `output/run-{timestamp}/run-manifest.json`.

```json
{
  "schema_version": "0.1",
  "run_id": "run-2026-07-25T09-00-00-000Z",
  "client_id": "verbatim",
  "campaign_id": "suspiciously-polished-2026-07",
  "started_at": "2026-07-25T09:00:00.000Z",
  "completed_at": "2026-07-25T09:00:42.000Z",
  "status": "succeeded",
  "source_data_as_of": {
    "status": "known",
    "meta_data_as_of": "2026-07-25T09:00:20.000Z",
    "reporting_range": { "since": "2026-07-08", "until": "2026-07-24" },
    "source_path": "data/paid-ads/monitoring/normalized/meta-monitoring-summary-2026-07-25T09-00-20-000Z.json",
    "note": "Freshness reflects when the Meta insights response was read, not live campaign state."
  },
  "stages": [
    {
      "name": "meta_monitoring",
      "status": "succeeded",
      "started_at": "2026-07-25T09:00:05.000Z",
      "completed_at": "2026-07-25T09:00:20.000Z",
      "output_paths": ["data/paid-ads/monitoring/normalized/meta-monitoring-summary-2026-07-25T09-00-20-000Z.json"],
      "error": null,
      "skipped_reason": null
    }
  ],
  "outputs": {
    "monitoring_raw_snapshot": "data/paid-ads/monitoring/raw/meta-monitoring-raw-2026-07-25T09-00-20-000Z.json",
    "monitoring_normalized_summary": "data/paid-ads/monitoring/normalized/meta-monitoring-summary-2026-07-25T09-00-20-000Z.json",
    "monitoring_report_markdown": "data/paid-ads/monitoring/reports/meta-monitoring-report-2026-07-24.md",
    "operator_report_markdown": "output/run-2026-07-25T09-00-30-000Z/paid-ads-operator-report.md",
    "operator_report_json": "output/run-2026-07-25T09-00-30-000Z/campaign-summary.json",
    "comparative_report_markdown": null,
    "comparative_report_json": null,
    "run_manifest": "output/run-2026-07-25T09-00-00-000Z/run-manifest.json"
  },
  "warnings": [],
  "errors": []
}
```

Valid run statuses: `running`, `succeeded`, `failed`.

Valid stage statuses: `running`, `succeeded`, `failed`, `skipped`.

## Example

Verbatim, Suspiciously Polished campaign:

```text
npm run operator -- --client verbatim --campaign suspiciously-polished-2026-07
```

Successful output looks like this:

```text
Paid ads operator run succeeded.
Run ID: run-2026-07-25T09-00-00-000Z
Client: verbatim
Campaign: suspiciously-polished-2026-07
Status: succeeded
Source data as of: 2026-07-25T09:00:20.000Z (reporting range 2026-07-08 to 2026-07-24)
Operator report: output/run-2026-07-25T09-00-30-000Z/paid-ads-operator-report.md
Comparative report: output/run-2026-07-25T09-00-35-000Z/paid-ads-comparative-report.md
Run manifest: output/run-2026-07-25T09-00-00-000Z/run-manifest.json
Warnings: none
```

Failed output looks like this:

```text
Paid ads operator run failed.
Run ID: run-2026-07-25T09-10-00-000Z
Failed stage: meta_monitoring
Error: scripts/ingest-meta-campaign-monitoring.ts exited with code 1: Missing required Meta access token. Set one of these env vars: META_ACCESS_TOKEN.
Run manifest: output/run-2026-07-25T09-10-00-000Z/run-manifest.json
```

## Tests

```text
npm test
```

The runner tests inject a fake stage command runner and fixture workspaces, so they never call Meta.

## Guardrails

The runner is read-only against Meta. It does not create campaigns, change budgets, pause ads, upload creative, or schedule itself. Human approval is still required before any paid-media change.
