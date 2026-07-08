# Paid Ads Meta Monitoring Spine 2026-07-08

## Purpose

This document defines the read-only monitoring spine for Paid Ads Agent v0.1.

It is a plan and implementation skeleton only. It does not call the Meta API, change the campaign, pause ads, change budgets, create creatives, or publish anything.

## Current Campaign Scope

Campaign:

- Name: `Verbatim First Flight - Consultants - 2026-07`
- Campaign ID: `6962618508954`
- Objective: `Traffic`
- Budget: `$20/day` at ad set level

Ad set:

- Name: `Consultants - Static Editorial - First Flight`
- Ad set ID: `6962618509154`
- Performance goal: `landing page views`
- Placements: Facebook desktop only

Ads:

| Concept | Meta ad name | Meta ad ID |
| --- | --- | --- |
| `concept-01-confident-draft` | `concept-01-finished-challenged` | `6964007863354` |
| `concept-04-sounds-ready` | `concept-04-polished-problem` | `6964011910954` |

Measurement:

- Pixel: `Verbatim Website`
- Pixel ID: `26411512478545039`
- Custom conversion: `Add to Chrome - consultants`
- Landing page: `/consultants`

## Repo Conventions Inspected

The current repo keeps durable paid ads source-of-truth records under `data/paid-ads/` and human-readable operating docs under `docs/`.

Existing relevant data folders include:

- `data/paid-ads/meta-upload-packets/`
- `data/paid-ads/funnel-readiness/`
- `data/paid-ads/placement-assets/`
- `data/paid-ads/selected-assets/`

Existing scripts use `tsx`, TypeScript, and local artifacts written under `output/run-{timestamp}/`. Several scripts use `dotenv/config` for environment variables. API-backed source work stores raw request and response records separately when a helper exists, but this monitoring pass does not add an API caller.

## Read-Only Boundary

The first monitoring implementation must be read-only.

Allowed:

- Read campaign, ad set, ad, creative, and insights metadata.
- Read daily insights by ad.
- Read action breakdowns for landing page views and custom conversion events if available.
- Store raw API response snapshots.
- Store normalized local JSON summaries.
- Produce daily markdown reports.
- Produce recommendations that require human review.

Not allowed:

- No campaign edits.
- No budget edits.
- No ad set edits.
- No ad edits.
- No automatic pausing.
- No automatic creative changes.
- No automatic upload.
- No autonomous optimization.

## Minimum Data Model

### Campaigns

Fields:

- `campaign_id`
- `campaign_name`
- `objective`
- `configured_status`
- `effective_status`
- `daily_budget_source`
- `created_time`
- `start_time`
- `stop_time`
- `landing_page`
- `pixel_id`
- `custom_conversion_name`
- `raw_snapshot_path`

### Ad Sets

Fields:

- `adset_id`
- `campaign_id`
- `adset_name`
- `configured_status`
- `effective_status`
- `daily_budget`
- `optimization_goal`
- `billing_event`
- `bid_strategy`
- `publisher_platforms`
- `device_platforms`
- `placements`
- `raw_snapshot_path`

### Ads

Fields:

- `ad_id`
- `adset_id`
- `campaign_id`
- `ad_name`
- `concept_id`
- `configured_status`
- `effective_status`
- `creative_id`
- `destination_url`
- `utm_campaign`
- `utm_content`
- `headline_variant`
- `raw_snapshot_path`

### Creatives And Concepts

Fields:

- `concept_id`
- `concept_name`
- `creative_id`
- `selected_asset_paths`
- `primary_text`
- `headline`
- `description`
- `cta`
- `logo_status`
- `approved_for_upload`
- `uploaded_to_meta`
- `human_review_required`
- `source_index_path`

### Daily Insights

One row per ad per date.

Fields:

- `date`
- `campaign_id`
- `adset_id`
- `ad_id`
- `concept_id`
- `spend`
- `impressions`
- `reach`
- `link_clicks`
- `landing_page_views`
- `ctr`
- `cpc`
- `cost_per_landing_page_view`
- `add_to_chrome_custom_conversion_count`
- `cost_per_add_to_chrome_custom_conversion`
- `actions_raw`
- `cost_per_action_type_raw`
- `raw_snapshot_path`

### Landing Page And Custom Conversion Events

Fields:

- `date`
- `pixel_id`
- `custom_conversion_name`
- `custom_conversion_id`
- `event_name`
- `event_count`
- `attribution_source`
- `matched_action_type`
- `campaign_id`
- `adset_id`
- `ad_id`
- `notes`

### Recommendations

Recommendations are advisory only.

Fields:

- `generated_at`
- `scope`
- `severity`
- `observation`
- `recommendation`
- `evidence`
- `human_review_required`
- `allowed_action_type`
- `blocked_automation`
- `status`

Allowed recommendation statuses:

- `monitor_only`
- `needs_tracking_verification`
- `needs_human_review`
- `ready_for_manual_decision`
- `insufficient_data`

## Required Environment Variables

Do not hard-code secrets.

Required for the first read-only ingestion script:

- `META_ACCESS_TOKEN`
- `META_AD_ACCOUNT_ID`
- `META_CAMPAIGN_ID=6962618508954`
- `META_ADSET_ID=6962618509154`
- `META_AD_IDS=6964007863354,6964011910954`
- `META_PIXEL_ID=26411512478545039`
- `META_CUSTOM_CONVERSION_NAME=Add to Chrome - consultants`

Recommended:

- `META_API_VERSION`
- `META_CUSTOM_CONVERSION_ID`
- `META_MONITORING_SINCE`
- `META_MONITORING_UNTIL`
- `META_MONITORING_OUTPUT_DIR`
- `META_READ_ONLY=1`

Optional later:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Supabase should not be required for the first implementation. Local JSON should be enough for v0.1.

## Required Meta Access

Minimum expected permissions for read-only monitoring:

- `ads_read`
- `read_insights`

Required access scope:

- The token must have read access to the ad account containing campaign `6962618508954`.
- The token must be able to read insights for the ad account.
- Custom conversion counts must be visible in insights action breakdowns or through the relevant read endpoint.

Do not request write permissions for this spine.

If a future implementation needs to read custom conversion definitions directly, verify the current Meta API permission requirements before adding that call.

## Recommended First Script

Recommended script name:

```text
scripts/ingest-meta-campaign-monitoring.ts
```

Recommended npm script:

```text
consultant:paid-ads-meta-monitoring
```

This should be implemented in a later branch after credentials are available and the exact read fields are confirmed.

## Read-Only Ingestion Shape

The script should:

1. Load `dotenv/config`.
2. Validate required env vars.
3. Refuse to run if `META_READ_ONLY` is explicitly set to anything other than `1` or `true`.
4. Fetch campaign metadata.
5. Fetch ad set metadata.
6. Fetch ad metadata for the two known ads.
7. Fetch daily insights by ad for the requested date range.
8. Normalize Meta action arrays into named metrics.
9. Write raw responses separately from normalized summaries.
10. Write a markdown daily report for human review.

Suggested raw output layout:

```text
output/run-{timestamp}/raw/meta/campaign-6962618508954.json
output/run-{timestamp}/raw/meta/adset-6962618509154.json
output/run-{timestamp}/raw/meta/ad-6964007863354.json
output/run-{timestamp}/raw/meta/ad-6964011910954.json
output/run-{timestamp}/raw/meta/insights-by-ad.json
```

Suggested normalized output layout:

```text
output/run-{timestamp}/meta-campaign-monitoring-summary.json
output/run-{timestamp}/meta-campaign-monitoring-daily-report.md
```

Suggested durable local index, only after the script is stable:

```text
data/paid-ads/monitoring/snapshots/{date}/meta-campaign-monitoring-summary.json
```

## Metrics

The first report should include:

- Spend
- Impressions
- Reach, if available
- Link clicks
- Landing page views
- CTR
- CPC
- Cost per landing page view
- Add-to-Chrome custom conversion count, if available
- Cost per Add-to-Chrome event, if available

Computed metrics:

- `ctr = link_clicks / impressions`
- `cpc = spend / link_clicks`
- `cost_per_landing_page_view = spend / landing_page_views`
- `cost_per_add_to_chrome_custom_conversion = spend / add_to_chrome_custom_conversion_count`

When the denominator is zero or unavailable, keep the metric as `null`. Do not invent a value.

## Daily Report Spec

The daily markdown report should answer:

1. What changed yesterday?
2. Is delivery active?
3. Which ad spent more?
4. Which ad got more link clicks?
5. Which ad got more landing page views?
6. Is `Add to Chrome - consultants` firing?
7. Is the cost per landing page view within a tolerable first-test range?
8. Is any intervention warranted?
9. What should Arun inspect manually?
10. What should not be concluded yet?

The report should include:

- Campaign status
- Ad set status
- Per-ad status
- Per-ad metrics table
- Tracking health note
- Desktop-only placement note
- Data sufficiency note
- Human-review recommendation

## Recommendation Rules

The first monitoring layer should be conservative.

Recommend `monitor_only` when:

- Delivery is active.
- Spend is low.
- No tracking issue is visible.
- The data sample is too small.

Recommend `needs_tracking_verification` when:

- Spend and landing page views are present but the Add-to-Chrome custom conversion remains zero or missing.
- PageView or landing page views appear inconsistent.
- A known tracking field disappears from the API response.

Recommend `needs_human_review` when:

- One ad spends materially more than the other without clear performance signal.
- One ad receives clicks but no landing page views.
- Cost per landing page view is unusually high.
- The custom conversion fires for one ad but not the other.

Never automatically:

- Pause an ad.
- Change ad set budget.
- Change placements.
- Edit creative.
- Change landing page URLs.

## Data Sufficiency

Do not over-interpret the first few dollars of spend.

Suggested first-pass thresholds:

- Under `$20` total spend: monitoring only.
- Under `500` impressions per ad: insufficient for creative conclusion.
- Fewer than `20` landing page views: insufficient for landing page conclusion.
- Zero Add-to-Chrome events with low traffic: tracking health question, not proof of failure.

These thresholds are operating guardrails, not statistical claims.

## Open Questions Before Implementation

- Is the custom conversion available in ad insights as an action type, or does it need a separate custom conversion read?
- What exact action type does Meta return for `Add to Chrome - consultants`?
- Are landing page views available under the selected Traffic setup and placement mix?
- Will the campaign remain desktop-only after launch?
- Should normalized monitoring summaries later be stored in Supabase, or should local JSON remain the v0.1 source of truth?

## Next Build Step

Implement `scripts/ingest-meta-campaign-monitoring.ts` as a read-only local ingestion script after credentials are available.

The first implementation should write raw response snapshots and a normalized daily report under `output/run-{timestamp}/` only. Warehouse storage can wait until the metric mapping is proven.
