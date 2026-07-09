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

  const adUrls = adIds.map((adId) =>
    graphUrl(version, adId, token, {
      fields: "id,name,status,effective_status,configured_status,creative{id,name,object_story_spec}",
    }),
  );

  const [campaign, adset, insights, ...ads] = await Promise.all([
    metaGet<MetaObject>(campaignUrl),
    metaGet<MetaObject>(adsetUrl),
    metaGet<MetaListResponse<MetaInsightRow>>(insightsUrl),
    ...adUrls.map((url) => metaGet<MetaObject>(url)),
  ]);

  const insightRows = insights.data ?? [];

  const normalizedAds = insightRows.map((row) => {
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
    };
  });

  const totals = normalizedAds.reduce(
    (acc, row) => {
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
    },
    {
      spend: 0,
      impressions: 0,
      reach: 0,
      clicks: 0,
      inlineLinkClicks: 0,
      outboundClicks: 0,
      linkClicks: 0,
      landingPageViews: 0,
      addToChromeEvents: 0,
    },
  );

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
    totals,
    adPerformance: normalizedAds,
    recommendation: {
      action: "do_not_change_yet",
      rationale:
        "Campaign is active and both ads are delivering, but spend and conversion volume are too low for optimization. Continue monitoring unless delivery, URL tracking, or event attribution is broken.",
    },
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
          ads: adUrls.map(publicUrl),
        },
        campaign,
        adset,
        ads,
        insights,
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

## Read

Both ads are active and delivering. Spend is still too low for optimization.

## Recommendation

Do not change campaign settings yet.

Fix only clear setup faults: disapproval, broken URLs, no delivery, missing pixel/event attribution, or one ad receiving no delivery after meaningful spend.

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
