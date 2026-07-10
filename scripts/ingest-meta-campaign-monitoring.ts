import "dotenv/config";
import fetch from "node-fetch";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

type MetaInsightAction = {
  action_type: string;
  value: string;
};

type MetaInsightRow = {
  campaign_id: string;
  campaign_name: string;
  adset_id: string;
  adset_name: string;
  ad_id: string;
  ad_name: string;
  publisher_platform?: string;
  platform_position?: string;
  date_start: string;
  date_stop: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  inline_link_clicks?: string;
  outbound_clicks?: MetaInsightAction[];
  actions?: MetaInsightAction[];
  cost_per_action_type?: MetaInsightAction[];
  cpm?: string;
  cpc?: string;
  ctr?: string;
};

type MetaListResponse<T> = {
  data: T[];
  paging?: unknown;
};

type MetaObject = Record<string, unknown>;

type NormalizedPerformanceRow = {
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adsetName: string;
  adId: string;
  adName: string;
  dateStart: string;
  dateStop: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  inlineLinkClicks: number;
  outboundClicks: number;
  linkClicks: number;
  landingPageViews: number;
  addToChromeEvents: number;
  cpm: number;
  cpc: number;
  ctr: number;
  costPerOutboundClick: number | null;
  costPerInlineLinkClick: number | null;
  costPerAddToChrome: number | null;
  rawActions: MetaInsightAction[];
  period: "pre_change" | "change_day_mixed" | "post_change";
};

type NormalizedPlacementRow = NormalizedPerformanceRow & {
  publisherPlatform: string;
  platformPosition: string;
  placementKey: string;
};

type PerformanceTotals = {
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  inlineLinkClicks: number;
  outboundClicks: number;
  linkClicks: number;
  landingPageViews: number;
  addToChromeEvents: number;
};

type Recommendation = {
  action: string;
  severity: "monitor_only" | "needs_tracking_verification" | "needs_human_review" | "insufficient_data";
  rationale: string;
  findings: string[];
  humanReviewRequired: true;
  optimizationActionsAllowed: false;
};

const requiredEnv = [
  "META_ACCESS_TOKEN",
  "META_AD_ACCOUNT_ID",
  "META_CAMPAIGN_ID",
  "META_ADSET_ID",
  "META_AD_IDS",
  "META_PIXEL_ID",
  "META_CUSTOM_CONVERSION_NAME",
  "META_CUSTOM_CONVERSION_ID",
];

const humanChangeLog = [
  {
    timestampEt: "2026-07-10 01:55 AM ET",
    change:
      "Manual placement correction to Facebook Feed only. Removed Right Column, Marketplace, Search Results, and limited spending to excluded placements.",
  },
];

const placementChangeDate = "2026-07-10";

function requireEnv(name: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }

  return value.trim();
}

function num(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function actionValue(actions: MetaInsightAction[] | undefined, actionType: string): number {
  if (!actions) return 0;

  const found = actions.find((action) => action.action_type === actionType);
  return found ? num(found.value) : 0;
}

function findActionContains(actions: MetaInsightAction[] | undefined, fragment: string): number {
  if (!actions) return 0;

  return actions
    .filter((action) => action.action_type.toLowerCase().includes(fragment.toLowerCase()))
    .reduce((sum, action) => sum + num(action.value), 0);
}

function isoStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function metaGet<T>(url: URL): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Meta API error ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
}

function graphUrl(version: string, objectPath: string, token: string, params: Record<string, string>): URL {
  const url = new URL(`https://graph.facebook.com/${version}/${objectPath}`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("access_token", token);

  return url;
}

function publicUrl(url: URL): string {
  const clone = new URL(url.toString());
  clone.searchParams.delete("access_token");
  return clone.toString();
}

function markdownTable(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return "_No rows._";

  const headers = Object.keys(rows[0] ?? {});
  const header = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${headers.map((headerName) => row[headerName] ?? "").join(" | ")} |`)
    .join("\n");

  return [header, divider, body].join("\n");
}

function classifyPeriod(dateStart: string, dateStop: string): "pre_change" | "change_day_mixed" | "post_change" {
  if (dateStop < placementChangeDate) {
    return "pre_change";
  }

  if (dateStart > placementChangeDate) {
    return "post_change";
  }

  return "change_day_mixed";
}

function normalizeInsightRow(
  row: MetaInsightRow,
  customEventName: string,
  customConversionId: string,
): NormalizedPerformanceRow {
  const spend = num(row.spend);
  const impressions = num(row.impressions);
  const clicks = num(row.clicks);
  const inlineLinkClicks = num(row.inline_link_clicks);
  const outboundClicks = actionValue(row.outbound_clicks, "outbound_click");
  const linkClicks = actionValue(row.actions, "link_click");
  const landingPageViews = findActionContains(row.actions, "landing_page_view");
  const addToChromeEvents =
    actionValue(row.actions, customEventName) +
    actionValue(row.actions, `offsite_conversion.custom.${customConversionId}`) +
    actionValue(row.actions, `onsite_conversion.custom.${customConversionId}`) +
    findActionContains(row.actions, customConversionId);

  return {
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    adsetId: row.adset_id,
    adsetName: row.adset_name,
    adId: row.ad_id,
    adName: row.ad_name,
    dateStart: row.date_start,
    dateStop: row.date_stop,
    spend,
    impressions,
    reach: num(row.reach),
    clicks,
    inlineLinkClicks,
    outboundClicks,
    linkClicks,
    landingPageViews,
    addToChromeEvents,
    cpm: num(row.cpm),
    cpc: num(row.cpc),
    ctr: num(row.ctr),
    costPerOutboundClick: outboundClicks > 0 ? spend / outboundClicks : null,
    costPerInlineLinkClick: inlineLinkClicks > 0 ? spend / inlineLinkClicks : null,
    costPerAddToChrome: addToChromeEvents > 0 ? spend / addToChromeEvents : null,
    rawActions: row.actions ?? [],
    period: classifyPeriod(row.date_start, row.date_stop),
  };
}

function normalizePlacementRow(
  row: MetaInsightRow,
  customEventName: string,
  customConversionId: string,
): NormalizedPlacementRow {
  const base = normalizeInsightRow(row, customEventName, customConversionId);
  const publisherPlatform = row.publisher_platform ?? "unknown";
  const platformPosition = row.platform_position ?? "unknown";

  return {
    ...base,
    publisherPlatform,
    platformPosition,
    placementKey: `${publisherPlatform}:${platformPosition}`,
  };
}

function zeroTotals(): PerformanceTotals {
  return {
    spend: 0,
    impressions: 0,
    reach: 0,
    clicks: 0,
    inlineLinkClicks: 0,
    outboundClicks: 0,
    linkClicks: 0,
    landingPageViews: 0,
    addToChromeEvents: 0,
  };
}

function addToTotals(acc: PerformanceTotals, row: NormalizedPerformanceRow): PerformanceTotals {
  acc.spend += row.spend;
  acc.impressions += row.impressions;
  acc.reach += row.reach;
  acc.clicks += row.clicks;
  acc.inlineLinkClicks += row.inlineLinkClicks;
  acc.outboundClicks += row.outboundClicks;
  acc.linkClicks += row.linkClicks;
  acc.landingPageViews += row.landingPageViews;
  acc.addToChromeEvents += row.addToChromeEvents;
  return acc;
}

function placementTotals(rows: NormalizedPlacementRow[]): Array<PerformanceTotals & {
  placementKey: string;
  publisherPlatform: string;
  platformPosition: string;
  spendShare: number;
}> {
  const totalSpend = rows.reduce((sum, row) => sum + row.spend, 0);
  const grouped = new Map<string, PerformanceTotals & {
    placementKey: string;
    publisherPlatform: string;
    platformPosition: string;
  }>();

  for (const row of rows) {
    const current = grouped.get(row.placementKey) ?? {
      ...zeroTotals(),
      placementKey: row.placementKey,
      publisherPlatform: row.publisherPlatform,
      platformPosition: row.platformPosition,
    };

    addToTotals(current, row);
    grouped.set(row.placementKey, current);
  }

  return [...grouped.values()]
    .map((row) => ({
      ...row,
      spendShare: totalSpend > 0 ? row.spend / totalSpend : 0,
    }))
    .sort((a, b) => b.spend - a.spend);
}

function buildRecommendation(
  totals: PerformanceTotals,
  normalizedAds: NormalizedPerformanceRow[],
  groupedPlacements: ReturnType<typeof placementTotals>,
): Recommendation {
  const findings: string[] = [];
  const trackingEventsAbsent =
    totals.landingPageViews === 0 &&
    totals.addToChromeEvents === 0 &&
    normalizedAds.every((row) => row.rawActions.length === 0);

  if (totals.spend < 10) {
    findings.push("Spend is below $10, so the sample is too low for optimization.");
  }

  if (trackingEventsAbsent) {
    findings.push("Tracking events are absent entirely from the current insights response. Verify attribution and event mapping.");
  }

  if (totals.spend >= 10 && totals.addToChromeEvents === 0 && totals.landingPageViews > 0) {
    findings.push("Landing page views are present but AddToChrome is zero. This flags possible funnel friction.");
  }

  const riskyPlacement = groupedPlacements.find((placement) => {
    return placement.spendShare > 0.5 && placement.addToChromeEvents === 0;
  });

  if (riskyPlacement) {
    findings.push(
      `Placement risk: ${riskyPlacement.publisherPlatform} / ${riskyPlacement.platformPosition} consumed ${(riskyPlacement.spendShare * 100).toFixed(1)}% of spend with zero AddToChrome events.`,
    );
  }

  if (findings.length === 0) {
    findings.push("No intervention signal found in the current read-only report.");
  }

  if (totals.spend < 10) {
    return {
      action: "monitor_only",
      severity: trackingEventsAbsent ? "needs_tracking_verification" : "insufficient_data",
      rationale: "Spend is too low for optimization. Do not change campaign settings based on this sample.",
      findings,
      humanReviewRequired: true,
      optimizationActionsAllowed: false,
    };
  }

  if (trackingEventsAbsent) {
    return {
      action: "verify_tracking",
      severity: "needs_tracking_verification",
      rationale: "Attribution or event mapping may be missing because no tracking actions were returned.",
      findings,
      humanReviewRequired: true,
      optimizationActionsAllowed: false,
    };
  }

  if (findings.some((finding) => finding.includes("funnel friction") || finding.includes("Placement risk"))) {
    return {
      action: "human_review_required",
      severity: "needs_human_review",
      rationale: "The report shows a possible setup or funnel issue, but changes must remain manual.",
      findings,
      humanReviewRequired: true,
      optimizationActionsAllowed: false,
    };
  }

  return {
    action: "monitor_only",
    severity: "monitor_only",
    rationale: "Continue monitoring. No automatic optimization action is allowed.",
    findings,
    humanReviewRequired: true,
    optimizationActionsAllowed: false,
  };
}

async function main() {
  for (const name of requiredEnv) {
    requireEnv(name);
  }

  const token = requireEnv("META_ACCESS_TOKEN");
  const adAccountId = requireEnv("META_AD_ACCOUNT_ID");
  const campaignId = requireEnv("META_CAMPAIGN_ID");
  const adsetId = requireEnv("META_ADSET_ID");
  const adIds = requireEnv("META_AD_IDS")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  const pixelId = requireEnv("META_PIXEL_ID");
  const customConversionName = requireEnv("META_CUSTOM_CONVERSION_NAME");
  const customConversionId = requireEnv("META_CUSTOM_CONVERSION_ID");
  const customEventName = process.env.META_CUSTOM_EVENT_NAME?.trim() || "AddToChromeClick";

  const version = process.env.META_API_VERSION?.trim() || "v23.0";
  const since = process.env.META_MONITORING_SINCE?.trim() || "2026-07-08";
  const until = process.env.META_MONITORING_UNTIL?.trim() || today();
  const outputDir = process.env.META_MONITORING_OUTPUT_DIR?.trim() || "data/paid-ads/monitoring";

  const runStamp = isoStamp();

  const rawDir = path.join(outputDir, "raw");
  const normalizedDir = path.join(outputDir, "normalized");
  const reportDir = path.join(outputDir, "reports");

  await mkdir(rawDir, { recursive: true });
  await mkdir(normalizedDir, { recursive: true });
  await mkdir(reportDir, { recursive: true });

  const campaignUrl = graphUrl(version, campaignId, token, {
    fields: "id,name,account_id,status,effective_status,configured_status,objective,buying_type,start_time,stop_time",
  });

  const adsetUrl = graphUrl(version, adsetId, token, {
    fields: "id,name,status,effective_status,configured_status,daily_budget,start_time,end_time,billing_event,optimization_goal,bid_strategy",
  });

  const insightFields = [
    "campaign_id",
    "campaign_name",
    "adset_id",
    "adset_name",
    "ad_id",
    "ad_name",
    "date_start",
    "date_stop",
    "spend",
    "impressions",
    "reach",
    "clicks",
    "inline_link_clicks",
    "outbound_clicks",
    "actions",
    "cost_per_action_type",
    "cpm",
    "cpc",
    "ctr",
  ].join(",");

  const insightsUrl = graphUrl(version, `act_${adAccountId}/insights`, token, {
    level: "ad",
    fields: insightFields,
    time_range: JSON.stringify({ since, until }),
    filtering: JSON.stringify([{ field: "campaign.id", operator: "IN", value: [campaignId] }]),
  });

  const placementInsightsUrl = graphUrl(version, `act_${adAccountId}/insights`, token, {
    level: "ad",
    fields: insightFields,
    breakdowns: "publisher_platform,platform_position",
    time_range: JSON.stringify({ since, until }),
    filtering: JSON.stringify([{ field: "campaign.id", operator: "IN", value: [campaignId] }]),
  });

  const adUrls = adIds.map((adId) =>
    graphUrl(version, adId, token, {
      fields: "id,name,status,effective_status,configured_status,creative{id,name,object_story_spec}",
    }),
  );

  const [campaign, adset, insights, placementInsights, ...ads] = await Promise.all([
    metaGet<MetaObject>(campaignUrl),
    metaGet<MetaObject>(adsetUrl),
    metaGet<MetaListResponse<MetaInsightRow>>(insightsUrl),
    metaGet<MetaListResponse<MetaInsightRow>>(placementInsightsUrl),
    ...adUrls.map((url) => metaGet<MetaObject>(url)),
  ]);

  const insightRows = insights.data ?? [];
  const placementInsightRows = placementInsights.data ?? [];

  const normalizedAds = insightRows.map((row) => normalizeInsightRow(row, customEventName, customConversionId));
  const placementPerformance = placementInsightRows.map((row) => normalizePlacementRow(row, customEventName, customConversionId));
  const groupedPlacements = placementTotals(placementPerformance);

  const totals = normalizedAds.reduce(
    (acc, row) => addToTotals(acc, row),
    zeroTotals(),
  );

  const recommendation = buildRecommendation(totals, normalizedAds, groupedPlacements);

  const summary = {
    generatedAt: new Date().toISOString(),
    since,
    until,
    account: {
      adAccountId,
      pixelId,
      customConversionName,
      customConversionId,
      customEventName,
    },
    campaign,
    adset,
    ads,
    humanChangeLog,
    reportingNotes: {
      placementChangeDate,
      preChangeData:
        "Rows ending before 2026-07-10 are pre-change data and may include placements removed by the manual correction.",
      changeDayData:
        "Rows dated 2026-07-10 are mixed unless a narrower hourly export is used. Treat them as transition-day data.",
      postChangeData:
        "Rows starting after 2026-07-10 are post-change data when available and should reflect the Facebook Feed-only correction.",
    },
    totals,
    adPerformance: normalizedAds,
    placementPerformance,
    placementTotals: groupedPlacements,
    recommendation,
  };

  const rawPath = path.join(rawDir, `meta-monitoring-raw-${runStamp}.json`);
  const normalizedPath = path.join(normalizedDir, `meta-monitoring-summary-${runStamp}.json`);
  const reportPath = path.join(reportDir, `meta-monitoring-report-${until}.md`);

  await writeFile(
    rawPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        endpoints: {
          campaign: publicUrl(campaignUrl),
          adset: publicUrl(adsetUrl),
          insights: publicUrl(insightsUrl),
          placementInsights: publicUrl(placementInsightsUrl),
          ads: adUrls.map(publicUrl),
        },
        campaign,
        adset,
        ads,
        insights,
        placementInsights,
      },
      null,
      2,
    ),
  );

  await writeFile(normalizedPath, JSON.stringify(summary, null, 2));

  const reportRows = normalizedAds.map((row) => ({
    Ad: row.adName,
    Spend: `$${row.spend.toFixed(2)}`,
    Impressions: row.impressions,
    Clicks: row.clicks,
    "Inline link clicks": row.inlineLinkClicks,
    "Outbound clicks": row.outboundClicks,
    CTR: `${row.ctr.toFixed(2)}%`,
    CPC: `$${row.cpc.toFixed(2)}`,
    CPM: `$${row.cpm.toFixed(2)}`,
    "AddToChrome": row.addToChromeEvents,
    Period: row.period,
  }));

  const placementRows = groupedPlacements.map((row) => ({
    Platform: row.publisherPlatform,
    Placement: row.platformPosition,
    Spend: `$${row.spend.toFixed(2)}`,
    "Spend share": `${(row.spendShare * 100).toFixed(1)}%`,
    Impressions: row.impressions,
    "Inline link clicks": row.inlineLinkClicks,
    "Landing page views": row.landingPageViews,
    AddToChrome: row.addToChromeEvents,
  }));

  const report = `# Meta Campaign Monitoring Report

Generated: ${new Date().toISOString()}

Date range: ${since} to ${until}

## Campaign

- Name: ${(campaign.name as string) ?? campaignId}
- Campaign ID: ${campaignId}
- Status: ${String(campaign.effective_status ?? "unknown")}
- Objective: ${String(campaign.objective ?? "unknown")}
- Ad set: ${String(adset.name ?? adsetId)}
- Ad set status: ${String(adset.effective_status ?? "unknown")}

## Totals

- Spend: $${totals.spend.toFixed(2)}
- Impressions: ${totals.impressions}
- Reach: ${totals.reach}
- Clicks: ${totals.clicks}
- Inline link clicks: ${totals.inlineLinkClicks}
- Outbound clicks: ${totals.outboundClicks}
- Landing page views detected in actions: ${totals.landingPageViews}
- AddToChrome events detected in actions: ${totals.addToChromeEvents}

## Ad-level performance

${markdownTable(reportRows)}

## Placement breakdown

${markdownTable(placementRows)}

## Human change log

${humanChangeLog.map((entry) => `- ${entry.timestampEt}: ${entry.change}`).join("\n")}

## Pre-change and post-change read

- Pre-change data: rows ending before ${placementChangeDate}. These may include placements removed by the manual correction.
- Change-day data: rows dated ${placementChangeDate}. Daily Meta insights can mix pre-change and post-change delivery unless a narrower export is used.
- Post-change data: rows starting after ${placementChangeDate}. These should reflect the Facebook Feed-only correction when available.

## Read

${recommendation.findings.map((finding) => `- ${finding}`).join("\n")}

## Recommendation

Action: ${recommendation.action}

Severity: ${recommendation.severity}

${recommendation.rationale}

All optimization actions remain human-review only. Do not automatically pause ads, change budget, change placements, edit creative, or change destination URLs.

## Files

- Raw snapshot: ${rawPath}
- Normalized summary: ${normalizedPath}
`;

  await writeFile(reportPath, report);

  console.log("Meta monitoring complete.");
  console.log(`Raw snapshot: ${rawPath}`);
  console.log(`Normalized summary: ${normalizedPath}`);
  console.log(`Markdown report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
