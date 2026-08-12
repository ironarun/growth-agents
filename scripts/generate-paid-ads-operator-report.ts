/// <reference types="node" />

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

type ClientConfig = {
  client_id: string;
  client_name: string;
  status?: string;
  positioning?: {
    one_line?: string;
    promise?: string;
    consumer_action_language?: string;
  };
  urls?: {
    website?: string;
    chrome_web_store?: string;
  };
};

type CampaignConfig = {
  campaign_id: string;
  client_id: string;
  name: string;
  status?: Record<string, unknown>;
  objective?: string;
  purpose?: string;
  audience?: {
    description?: string;
    device?: string[];
    placements?: string[];
  };
  meta?: {
    campaign_name?: string;
    ad_set_name?: string;
    dataset_name?: string;
    pixel_id?: string;
    custom_conversion_name?: string;
    source_event?: string;
    cta?: string;
  };
  conversion_event?: {
    name?: string;
    meaning?: string;
    ignore_for_reporting?: string[];
  };
  landing_page?: {
    url?: string;
    confirmed_issue?: string;
  };
  approved_copy?: {
    primary_text?: string;
    headline?: string;
    description?: string;
    cta?: string;
    image_cta?: string;
  };
  ads?: CampaignAd[];
  approvals?: Record<string, unknown>;
  known_risks?: KnownRisk[];
  monitoring?: {
    allowed_recommendations?: string[];
    automated_actions?: boolean;
  };
};

type CampaignAd = {
  ad_id: string;
  meta_name: string;
  creative_variable: string;
  utm_content: string;
  destination_url: string;
  asset_path: string;
  asset_status: string;
};

type KnownRisk = {
  id: string;
  severity: string;
  status: string;
  owner_repo: string;
  description: string;
};

type Totals = {
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

type AdPerformanceRow = Totals & {
  adId: string;
  adName: string;
  dateStart: string;
  dateStop: string;
  cpm: number;
  cpc: number;
  ctr: number;
  costPerAddToChrome: number | null;
  rawActions?: Array<{ action_type: string; value: string }>;
};

type PlacementTotal = Totals & {
  publisherPlatform: string;
  platformPosition: string;
  placementKey: string;
  spendShare: number;
};

type MonitoringSummary = {
  generatedAt: string;
  since: string;
  until: string;
  client?: {
    clientName?: string;
    clientSlug?: string;
    landingPageUrl?: string;
  };
  account?: {
    pixelId?: string;
    customConversionName?: string;
    customConversionId?: string;
    customEventName?: string;
  };
  campaign?: Record<string, unknown>;
  adset?: Record<string, unknown>;
  totals?: Totals;
  adPerformance?: AdPerformanceRow[];
  placementTotals?: PlacementTotal[];
};

type RecommendationAction = "hold" | "investigate" | "pause manually" | "create next variant";

type Recommendation = {
  action: RecommendationAction;
  rationale: string;
  findings: string[];
  humanReviewRequired: true;
  automatedActionsAllowed: false;
};

type CliArgs = {
  client: string;
  campaign: string;
};

const defaultClient = "verbatim";
const defaultCampaign = "suspiciously-polished-2026-07";
const normalizedMonitoringDir = path.join("data", "paid-ads", "monitoring", "normalized");

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    client: defaultClient,
    campaign: defaultCampaign,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--client") {
      if (!next) fail("Missing value for --client.");
      args.client = next;
      index += 1;
    } else if (arg === "--campaign") {
      if (!next) fail("Missing value for --campaign.");
      args.campaign = next;
      index += 1;
    }
  }

  return args;
}

async function readJson<T>(filePath: string): Promise<T> {
  if (!existsSync(filePath)) {
    fail(`Missing required file: ${filePath}`);
  }

  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

async function readTextIfExists(filePath: string): Promise<string> {
  if (!existsSync(filePath)) return "";
  return readFile(filePath, "utf-8");
}

function isoStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function money(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unknown";
  return `$${value.toFixed(2)}`;
}

function numberText(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unknown";
  return String(Math.round(value));
}

function percentFromRate(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unknown";
  return `${value.toFixed(2)}%`;
}

function percent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "unknown";
  return `${(value * 100).toFixed(1)}%`;
}

function safe(value: unknown): string {
  if (value === undefined || value === null || value === "") return "unknown";
  return String(value);
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

function matchesCampaign(summary: MonitoringSummary, campaign: CampaignConfig): boolean {
  const summaryCampaignName = String(summary.campaign?.name ?? "");
  const summaryCampaignId = String(summary.campaign?.id ?? "");

  return summaryCampaignName === campaign.name || summaryCampaignId === campaign.campaign_id;
}

async function latestMatchingMonitoringSummary(campaign: CampaignConfig): Promise<{
  path: string;
  summary: MonitoringSummary;
} | null> {
  let files: string[];

  try {
    files = await readdir(normalizedMonitoringDir);
  } catch {
    return null;
  }

  const candidates = files.filter((file) => file.startsWith("meta-monitoring-summary-") && file.endsWith(".json"));
  const withStats = await Promise.all(
    candidates.map(async (file) => {
      const fullPath = path.join(normalizedMonitoringDir, file);
      return {
        path: fullPath,
        mtimeMs: (await stat(fullPath)).mtimeMs,
      };
    }),
  );

  const newestFirst = withStats.sort((a, b) => b.mtimeMs - a.mtimeMs);

  for (const candidate of newestFirst) {
    const summary = await readJson<MonitoringSummary>(candidate.path);
    if (matchesCampaign(summary, campaign)) {
      return {
        path: candidate.path,
        summary,
      };
    }
  }

  return null;
}

function zeroTotals(): Totals {
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

function enrichAdRows(campaignAds: CampaignAd[], performanceRows: AdPerformanceRow[]): Array<{
  configuredAd: CampaignAd;
  performance: AdPerformanceRow | null;
}> {
  return campaignAds.map((configuredAd) => {
    const performance =
      performanceRows.find((row) => row.adName === configuredAd.meta_name) ??
      performanceRows.find((row) => row.adName.toLowerCase().includes(configuredAd.creative_variable.toLowerCase())) ??
      performanceRows.find((row) => row.adName.toLowerCase().includes(configuredAd.utm_content.toLowerCase())) ??
      null;

    return {
      configuredAd,
      performance,
    };
  });
}

function metricTotals(summary: MonitoringSummary | null): Totals {
  return summary?.totals ?? zeroTotals();
}

function linkCtr(totals: Totals): number | null {
  if (totals.impressions <= 0) return null;
  return (totals.outboundClicks / totals.impressions) * 100;
}

function costPerAddToChrome(totals: Totals): number | null {
  if (totals.addToChromeEvents <= 0) return null;
  return totals.spend / totals.addToChromeEvents;
}

function hasTrackingActions(summary: MonitoringSummary | null): boolean {
  return Boolean(summary?.adPerformance?.some((row) => (row.rawActions ?? []).length > 0));
}

function recommendationFor(
  campaign: CampaignConfig,
  monitoring: MonitoringSummary | null,
  adRows: ReturnType<typeof enrichAdRows>,
): Recommendation {
  const totals = metricTotals(monitoring);
  const findings: string[] = [];

  if (!monitoring) {
    return {
      action: "investigate",
      rationale:
        "No normalized monitoring summary matching this campaign was found. Run or wire the read-only Meta monitoring query for the live campaign before making performance decisions.",
      findings: [
        "Campaign workspace exists, but live Meta delivery data is not available in the local normalized monitoring folder.",
        "Do not infer performance from the older consultant campaign summaries.",
      ],
      humanReviewRequired: true,
      automatedActionsAllowed: false,
    };
  }

  const spendTooLow = totals.spend < 10;
  const trackingBroken = !hasTrackingActions(monitoring) && totals.spend > 0;
  const clicksButNoPageView = totals.outboundClicks > 0 && totals.landingPageViews === 0;
  const pageViewsButNoAddToChrome = totals.landingPageViews >= 20 && totals.addToChromeEvents === 0;
  const weakCtr = totals.impressions >= 1000 && linkCtr(totals) !== null && (linkCtr(totals) ?? 0) < 0.6;

  if (spendTooLow) {
    findings.push("Spend is below $10, so delivery is too early for optimization.");
  }

  if (trackingBroken) {
    findings.push("Meta action rows are absent even though spend is present. Treat this as a tracking or ingestion issue.");
  }

  if (clicksButNoPageView) {
    findings.push("Outbound clicks are present but PageView is zero. Investigate destination and tracking.");
  }

  if (pageViewsButNoAddToChrome) {
    findings.push("PageViews exist at meaningful volume but AddToChromeClick is zero. Investigate landing-page and offer friction.");
  }

  const underperforming = adRows
    .filter((row) => row.performance !== null)
    .map((row) => ({
      ad: row.configuredAd,
      performance: row.performance as AdPerformanceRow,
    }))
    .filter((row) => row.performance.spend >= 10 && row.performance.outboundClicks === 0 && row.performance.addToChromeEvents === 0);

  if (underperforming.length > 0) {
    findings.push(
      `${underperforming.map((row) => row.ad.creative_variable).join(", ")} creative has meaningful spend with no outbound clicks or AddToChromeClick.`,
    );
  }

  if (weakCtr && totals.addToChromeEvents === 0) {
    findings.push("Both creatives have weak link CTR and no conversion signal at the campaign level.");
  }

  for (const risk of campaign.known_risks ?? []) {
    if (risk.status.includes("open")) {
      findings.push(`Known open risk: ${risk.description}`);
    }
  }

  if (trackingBroken || clicksButNoPageView || pageViewsButNoAddToChrome) {
    return {
      action: "investigate",
      rationale: "The report shows a tracking, destination, or funnel issue that should be checked before creative decisions.",
      findings,
      humanReviewRequired: true,
      automatedActionsAllowed: false,
    };
  }

  if (spendTooLow) {
    return {
      action: "hold",
      rationale: "Delivery is too early or spend is too low for a reliable decision.",
      findings,
      humanReviewRequired: true,
      automatedActionsAllowed: false,
    };
  }

  if (underperforming.length > 0) {
    return {
      action: "pause manually",
      rationale: "One creative has meaningful spend with no response. Any pause must be manual after human review.",
      findings,
      humanReviewRequired: true,
      automatedActionsAllowed: false,
    };
  }

  if (weakCtr && totals.addToChromeEvents === 0) {
    return {
      action: "create next variant",
      rationale: "Creative response is weak and there is no conversion signal. Prepare a new variant only after human review.",
      findings,
      humanReviewRequired: true,
      automatedActionsAllowed: false,
    };
  }

  if (findings.length === 0) {
    findings.push("No intervention signal found in the current read-only report.");
  }

  return {
    action: "hold",
    rationale: "Continue monitoring. No automatic optimization action is allowed.",
    findings,
    humanReviewRequired: true,
    automatedActionsAllowed: false,
  };
}

function placementRows(summary: MonitoringSummary | null): Array<Record<string, string | number>> {
  return (summary?.placementTotals ?? []).map((row) => ({
    Platform: row.publisherPlatform,
    Placement: row.platformPosition,
    Spend: money(row.spend),
    "Spend share": percent(row.spendShare),
    Impressions: row.impressions,
    "Outbound clicks": row.outboundClicks,
    PageViews: row.landingPageViews,
    AddToChromeClick: row.addToChromeEvents,
  }));
}

function trackingIssues(
  campaign: CampaignConfig,
  trackingContext: string,
  trackingChecklist: string,
  summary: MonitoringSummary | null,
): string[] {
  const issues: string[] = [];

  if (!summary) {
    issues.push("No matching normalized Meta monitoring summary found for this campaign.");
  }

  if (summary && !hasTrackingActions(summary) && summary.totals && summary.totals.spend > 0) {
    issues.push("Monitoring summary has spend but no Meta action rows.");
  }

  if (summary && summary.totals && summary.totals.outboundClicks > 0 && summary.totals.landingPageViews === 0) {
    issues.push("Outbound clicks are present but PageView is zero.");
  }

  if (trackingContext.includes("SubscribedButtonClick")) {
    issues.push("SubscribedButtonClick is documented as ignored and must not be treated as the campaign success event.");
  }

  if (trackingChecklist.includes("[ ] Confirm AddToChromeClick continues after paid traffic")) {
    issues.push("Checklist still requires paid-traffic AddToChromeClick confirmation.");
  }

  for (const risk of campaign.known_risks ?? []) {
    if (risk.id === "conversion-semantics") {
      issues.push(risk.description);
    }
  }

  return [...new Set(issues)];
}

function offerAndCopyRisks(campaign: CampaignConfig, offerContext: string): string[] {
  const risks = new Set<string>();

  if (campaign.landing_page?.confirmed_issue) {
    risks.add(campaign.landing_page.confirmed_issue);
  }

  for (const risk of campaign.known_risks ?? []) {
    if (risk.id.includes("pricing") || risk.status.includes("open")) {
      risks.add(`${risk.severity}: ${risk.description}`);
    }
  }

  if (offerContext.includes("must be corrected") || offerContext.includes("confirmed mismatch")) {
    risks.add("Offer context records a confirmed free-product language mismatch on the landing page.");
  }

  return [...risks];
}

function configuredAdTable(adRows: ReturnType<typeof enrichAdRows>): Array<Record<string, string | number>> {
  return adRows.map(({ configuredAd, performance }) => ({
    Creative: configuredAd.creative_variable,
    "Meta name": configuredAd.meta_name,
    Spend: performance ? money(performance.spend) : "no matching monitoring row",
    Impressions: performance ? performance.impressions : "unknown",
    "Link CTR": performance ? percentFromRate(linkCtr(performance)) : "unknown",
    "Outbound clicks": performance ? performance.outboundClicks : "unknown",
    PageViews: performance ? performance.landingPageViews : "unknown",
    AddToChromeClick: performance ? performance.addToChromeEvents : "unknown",
    "Cost / AddToChrome": performance ? money(performance.costPerAddToChrome) : "unknown",
  }));
}

function buildMarkdownReport(args: {
  client: ClientConfig;
  campaign: CampaignConfig;
  monitoringPath: string | null;
  monitoring: MonitoringSummary | null;
  recommendation: Recommendation;
  adRows: ReturnType<typeof enrichAdRows>;
  trackingIssues: string[];
  offerRisks: string[];
  outputJsonPath: string;
}): string {
  const { client, campaign, monitoring, monitoringPath, recommendation, adRows } = args;
  const totals = metricTotals(monitoring);

  return [
    "# Paid Ads Operator Report v0.2",
    "",
    `Generated at: ${new Date().toISOString()}`,
    "",
    "## Campaign",
    "",
    `- Client: ${client.client_name}`,
    `- Campaign name: ${campaign.name}`,
    `- Campaign status: ${safe(campaign.status?.workspace_state)}`,
    `- Meta review: ${safe(campaign.status?.meta_review)}`,
    `- Delivery: ${safe(campaign.status?.delivery)}`,
    `- Landing page: ${safe(campaign.landing_page?.url)}`,
    `- Conversion event: ${safe(campaign.conversion_event?.name)}`,
    `- Pixel/dataset: ${safe(campaign.meta?.dataset_name)} / ${safe(campaign.meta?.pixel_id)}`,
    `- Monitoring summary: ${monitoringPath ?? "not found for this campaign"}`,
    "",
    "## Metrics",
    "",
    `- Spend: ${money(totals.spend)}`,
    `- Impressions: ${numberText(totals.impressions)}`,
    `- CPM: ${monitoring?.adPerformance?.length ? money(totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : null) : "unknown"}`,
    `- Link CTR: ${percentFromRate(linkCtr(totals))}`,
    `- Outbound clicks: ${numberText(totals.outboundClicks)}`,
    `- Landing page views: ${numberText(totals.landingPageViews)}`,
    `- AddToChromeClick: ${numberText(totals.addToChromeEvents)}`,
    `- Cost per AddToChromeClick: ${money(costPerAddToChrome(totals))}`,
    "",
    "## Ad-Level Split",
    "",
    markdownTable(configuredAdTable(adRows)),
    "",
    "## Placement Delivery",
    "",
    markdownTable(placementRows(monitoring)),
    "",
    "## Tracking Issues",
    "",
    args.trackingIssues.length ? args.trackingIssues.map((issue) => `- ${issue}`).join("\n") : "- No tracking issue detected from available data.",
    "",
    "## Known Offer/Copy Risks",
    "",
    args.offerRisks.length ? args.offerRisks.map((risk) => `- ${risk}`).join("\n") : "- No open offer or copy risk recorded.",
    "",
    "## Recommendation",
    "",
    `- Action: ${recommendation.action}`,
    `- Rationale: ${recommendation.rationale}`,
    "",
    recommendation.findings.map((finding) => `- ${finding}`).join("\n"),
    "",
    "Human review is required before any campaign change.",
    "",
    "## Guardrails",
    "",
    "- No Meta write actions were performed.",
    "- Do not change budgets from this report.",
    "- Do not pause ads automatically.",
    "- Do not upload or edit creative from this report.",
    "- Do not treat AddToChromeClick as a confirmed install.",
    "",
    "## Files",
    "",
    `- Campaign summary JSON: ${args.outputJsonPath}`,
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const clientRoot = path.join("clients", args.client);
  const campaignRoot = path.join(clientRoot, "campaigns", args.campaign);
  const runDir = path.join("output", `run-${isoStamp()}`);

  const clientConfig = await readJson<ClientConfig>(path.join(clientRoot, "client.config.json"));
  const campaignConfig = await readJson<CampaignConfig>(path.join(campaignRoot, "campaign.config.json"));
  const trackingContext = await readTextIfExists(path.join(clientRoot, "context", "tracking.md"));
  const offerContext = await readTextIfExists(path.join(clientRoot, "context", "offer.md"));
  const trackingChecklist = await readTextIfExists(path.join(campaignRoot, "tracking-checklist.md"));

  const matchingMonitoring = await latestMatchingMonitoringSummary(campaignConfig);
  const monitoring = matchingMonitoring?.summary ?? null;
  const adRows = enrichAdRows(campaignConfig.ads ?? [], monitoring?.adPerformance ?? []);
  const recommendation = recommendationFor(campaignConfig, monitoring, adRows);
  const currentTrackingIssues = trackingIssues(campaignConfig, trackingContext, trackingChecklist, monitoring);
  const currentOfferRisks = offerAndCopyRisks(campaignConfig, offerContext);

  await mkdir(runDir, { recursive: true });

  const summaryPath = path.join(runDir, "campaign-summary.json");
  const markdownPath = path.join(runDir, "paid-ads-operator-report.md");

  const summary = {
    generated_at: new Date().toISOString(),
    version: "0.2",
    client: {
      client_id: clientConfig.client_id,
      client_name: clientConfig.client_name,
    },
    campaign: {
      campaign_id: campaignConfig.campaign_id,
      name: campaignConfig.name,
      status: campaignConfig.status ?? null,
      objective: campaignConfig.objective ?? null,
      landing_page: campaignConfig.landing_page ?? null,
      conversion_event: campaignConfig.conversion_event ?? null,
      pixel_dataset: {
        dataset_name: campaignConfig.meta?.dataset_name ?? null,
        pixel_id: campaignConfig.meta?.pixel_id ?? null,
      },
    },
    monitoring: {
      status: monitoring ? "matched_summary_found" : "missing_matching_summary",
      source_path: matchingMonitoring?.path ?? null,
      since: monitoring?.since ?? null,
      until: monitoring?.until ?? null,
    },
    metrics: {
      ...metricTotals(monitoring),
      cpm: totalsCpm(metricTotals(monitoring)),
      linkCtr: linkCtr(metricTotals(monitoring)),
      costPerAddToChrome: costPerAddToChrome(metricTotals(monitoring)),
    },
    ad_level_split: adRows,
    placement_delivery: monitoring?.placementTotals ?? [],
    tracking_issues: currentTrackingIssues,
    known_offer_copy_risks: currentOfferRisks,
    recommendation,
    guardrails: {
      read_only: true,
      meta_write_actions_performed: false,
      automated_optimization: false,
      human_review_required: true,
    },
  };

  await writeFile(summaryPath, JSON.stringify(summary, null, 2), "utf-8");
  await writeFile(
    markdownPath,
    buildMarkdownReport({
      client: clientConfig,
      campaign: campaignConfig,
      monitoringPath: matchingMonitoring?.path ?? null,
      monitoring,
      recommendation,
      adRows,
      trackingIssues: currentTrackingIssues,
      offerRisks: currentOfferRisks,
      outputJsonPath: summaryPath,
    }),
    "utf-8",
  );

  console.log("Paid Ads Operator Report v0.2 complete.");
  console.log(`Markdown report: ${markdownPath}`);
  console.log(`Campaign summary: ${summaryPath}`);
  console.log(`Recommendation: ${recommendation.action}`);
}

function totalsCpm(totals: Totals): number | null {
  if (totals.impressions <= 0) return null;
  return (totals.spend / totals.impressions) * 1000;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
