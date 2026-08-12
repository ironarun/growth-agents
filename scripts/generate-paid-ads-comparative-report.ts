/// <reference types="node" />

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

type ClientConfig = {
  client_id: string;
  client_name: string;
};

type CampaignConfig = {
  campaign_id: string;
  name: string;
  objective?: string;
  purpose?: string;
  hypothesis?: string;
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
  landing_page?: {
    url?: string;
  };
  conversion_event?: {
    name?: string;
    meaning?: string;
  };
  known_risks?: Array<{
    id: string;
    severity: string;
    status: string;
    description: string;
  }>;
};

type Totals = {
  spend: number;
  impressions: number;
  reach?: number;
  clicks?: number;
  inlineLinkClicks?: number;
  outboundClicks: number;
  linkClicks?: number;
  landingPageViews: number;
  addToChromeEvents: number;
};

type MonitoringSummary = {
  generatedAt?: string;
  since?: string;
  until?: string;
  campaign?: {
    id?: string;
    name?: string;
    objective?: string;
  };
  client?: {
    clientName?: string;
    clientSlug?: string;
  };
  totals?: Totals;
  adPerformance?: Array<Record<string, unknown>>;
  placementTotals?: Array<Record<string, unknown>>;
};

type CampaignComparison = {
  campaign_id: string;
  campaign_name: string;
  audience: string;
  angle: string;
  local_data_status: "found" | "missing";
  monitoring_source_path: string | null;
  metrics: {
    spend: number | null;
    impressions: number | null;
    cpm: number | null;
    ctr: number | null;
    outbound_clicks: number | null;
    landing_page_views: number | null;
    add_to_chrome_clicks: number | null;
    installs_or_downloads: number | null;
    installs_or_downloads_note: string;
    activated_users: number | null;
    activated_users_note: string;
    cost_per_landing_page_view: number | null;
    cost_per_add_to_chrome_click: number | null;
    cost_per_activated_user: number | null;
  };
  primary_failure_point: string;
  diagnosis: string;
};

type CliArgs = {
  client: string;
};

const defaultClient = "verbatim";
const consultantCampaignName = "Verbatim First Flight - Consultants - 2026-07";
const suspiciousCampaignSlug = "suspiciously-polished-2026-07";
const normalizedMonitoringDir = path.join("data", "paid-ads", "monitoring", "normalized");

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { client: defaultClient };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--client") {
      if (!next) fail("Missing value for --client.");
      args.client = next;
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

function safeText(value: unknown): string {
  if (value === undefined || value === null || value === "") return "unknown";
  return String(value);
}

function money(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "unknown";
  return `$${value.toFixed(2)}`;
}

function integer(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "unknown";
  return String(Math.round(value));
}

function percent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "unknown";
  return `${value.toFixed(2)}%`;
}

function ratio(value: number, divisor: number): number | null {
  if (divisor <= 0) return null;
  return value / divisor;
}

function cpm(totals: Totals | null): number | null {
  if (!totals) return null;
  const value = ratio(totals.spend, totals.impressions);
  return value === null ? null : value * 1000;
}

function ctr(totals: Totals | null): number | null {
  if (!totals) return null;
  const value = ratio(totals.outboundClicks, totals.impressions);
  return value === null ? null : value * 100;
}

function costPer(value: number | null, count: number | null): number | null {
  if (value === null || count === null || count <= 0) return null;
  return value / count;
}

function markdownTable(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return "_No rows._";

  const first = rows[0];
  if (!first) return "_No rows._";

  const headers = Object.keys(first);
  const header = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${headers.map((header) => row[header] ?? "").join(" | ")} |`)
    .join("\n");

  return [header, divider, body].join("\n");
}

async function readMonitoringSummaries(): Promise<Array<{ filePath: string; summary: MonitoringSummary; mtimeMs: number }>> {
  let files: string[];

  try {
    files = await readdir(normalizedMonitoringDir);
  } catch {
    return [];
  }

  const summaries: Array<{ filePath: string; summary: MonitoringSummary; mtimeMs: number }> = [];
  const candidates = files.filter((file) => file.startsWith("meta-monitoring-summary-") && file.endsWith(".json"));

  for (const file of candidates) {
    const filePath = path.join(normalizedMonitoringDir, file);
    const fileStat = await stat(filePath);
    summaries.push({
      filePath,
      summary: await readJson<MonitoringSummary>(filePath),
      mtimeMs: fileStat.mtimeMs,
    });
  }

  return summaries.sort((a, b) => b.mtimeMs - a.mtimeMs);
}

function findLatestSummary(
  summaries: Array<{ filePath: string; summary: MonitoringSummary }>,
  matcher: (summary: MonitoringSummary) => boolean,
): { filePath: string; summary: MonitoringSummary } | null {
  for (const candidate of summaries) {
    if (matcher(candidate.summary)) {
      return candidate;
    }
  }

  return null;
}

function campaignName(summary: MonitoringSummary): string {
  return safeText(summary.campaign?.name);
}

function campaignId(summary: MonitoringSummary): string {
  return safeText(summary.campaign?.id);
}

function buildConsultantComparison(args: {
  summaryMatch: { filePath: string; summary: MonitoringSummary } | null;
  audienceContext: string;
  decisionLog: string;
}): CampaignComparison {
  const totals = args.summaryMatch?.summary.totals ?? null;
  const noNewUsersRecorded =
    args.decisionLog.includes("no AddToChrome events or new users") || args.audienceContext.includes("no new users");

  return {
    campaign_id: "consultants-2026-07",
    campaign_name: consultantCampaignName,
    audience: "Independent and boutique consultants",
    angle: "Client-facing AI work should be challenged before action.",
    local_data_status: args.summaryMatch ? "found" : "missing",
    monitoring_source_path: args.summaryMatch?.filePath ?? null,
    metrics: {
      spend: totals?.spend ?? 50,
      impressions: totals?.impressions ?? null,
      cpm: cpm(totals),
      ctr: ctr(totals),
      outbound_clicks: totals?.outboundClicks ?? 47,
      landing_page_views: totals?.landingPageViews ?? 14,
      add_to_chrome_clicks: totals?.addToChromeEvents ?? 0,
      installs_or_downloads: null,
      installs_or_downloads_note: noNewUsersRecorded ? "No new users recorded in decision log." : "Not available locally.",
      activated_users: noNewUsersRecorded ? 0 : null,
      activated_users_note: noNewUsersRecorded ? "Decision log records no new users." : "Not available locally.",
      cost_per_landing_page_view: costPer(totals?.spend ?? 50, totals?.landingPageViews ?? 14),
      cost_per_add_to_chrome_click: costPer(totals?.spend ?? 50, totals?.addToChromeEvents ?? 0),
      cost_per_activated_user: noNewUsersRecorded ? costPer(totals?.spend ?? 50, 0) : null,
    },
    primary_failure_point: "Landing-page to Add-to-Chrome intent.",
    diagnosis:
      "The consultant campaign generated outbound clicks but only a small number of landing page views, then zero AddToChromeClick events and no new users. The failure point was before install intent.",
  };
}

function buildSuspiciousComparison(args: {
  campaignConfig: CampaignConfig;
  summaryMatch: { filePath: string; summary: MonitoringSummary } | null;
}): CampaignComparison {
  const totals = args.summaryMatch?.summary.totals ?? null;
  const localDataFound = args.summaryMatch !== null;
  const installsNote = localDataFound
    ? "Install/download count is not included in the local Meta monitoring summary unless explicitly recorded elsewhere. AddToChromeClick is intent, not confirmed install."
    : "Operator context says the campaign produced some downloads/installs, but exact counts are not available locally.";
  const activationNote = localDataFound
    ? "Activation/customer count is not available in the local Meta monitoring summary."
    : "Operator context says downloads/installs did not translate into active usage or customers. Exact activation count is not available locally.";

  return {
    campaign_id: args.campaignConfig.campaign_id,
    campaign_name: args.campaignConfig.name,
    audience: args.campaignConfig.audience?.description ?? "Heavy daily users of ChatGPT, Claude, Gemini, Grok, Perplexity, and similar AI tools.",
    angle: "Suspiciously polished AI answers need a second opinion.",
    local_data_status: localDataFound ? "found" : "missing",
    monitoring_source_path: args.summaryMatch?.filePath ?? null,
    metrics: {
      spend: totals?.spend ?? null,
      impressions: totals?.impressions ?? null,
      cpm: cpm(totals),
      ctr: ctr(totals),
      outbound_clicks: totals?.outboundClicks ?? null,
      landing_page_views: totals?.landingPageViews ?? null,
      add_to_chrome_clicks: totals?.addToChromeEvents ?? null,
      installs_or_downloads: null,
      installs_or_downloads_note: installsNote,
      activated_users: null,
      activated_users_note: activationNote,
      cost_per_landing_page_view: costPer(totals?.spend ?? null, totals?.landingPageViews ?? null),
      cost_per_add_to_chrome_click: costPer(totals?.spend ?? null, totals?.addToChromeEvents ?? null),
      cost_per_activated_user: null,
    },
    primary_failure_point: "Install/download to activation.",
    diagnosis:
      localDataFound
        ? "Suspiciously Polished has local Meta delivery and click-intent metrics. Confirmed installs, activation, and customers are still not normalized locally."
        : "Suspiciously Polished appears to move the failure later in the funnel. The campaign reportedly produced downloads or installs, but those did not become active usage or customers. Exact live metrics are not available in local monitoring data.",
  };
}

function comparisonTable(campaigns: CampaignComparison[]): Array<Record<string, string | number>> {
  return campaigns.map((campaign) => ({
    Campaign: campaign.campaign_name,
    Audience: campaign.audience,
    Angle: campaign.angle,
    Spend: money(campaign.metrics.spend),
    Impressions: integer(campaign.metrics.impressions),
    CPM: money(campaign.metrics.cpm),
    CTR: percent(campaign.metrics.ctr),
    "Outbound clicks": integer(campaign.metrics.outbound_clicks),
    "Landing page views": integer(campaign.metrics.landing_page_views),
    AddToChromeClick: integer(campaign.metrics.add_to_chrome_clicks),
    "Installs/downloads": campaign.metrics.installs_or_downloads === null ? campaign.metrics.installs_or_downloads_note : integer(campaign.metrics.installs_or_downloads),
    "Activated users": campaign.metrics.activated_users === null ? campaign.metrics.activated_users_note : integer(campaign.metrics.activated_users),
    "Cost / LPV": money(campaign.metrics.cost_per_landing_page_view),
    "Cost / AddToChrome": money(campaign.metrics.cost_per_add_to_chrome_click),
    "Cost / activated user": money(campaign.metrics.cost_per_activated_user),
    "Primary failure point": campaign.primary_failure_point,
  }));
}

function recommendation(consultant: CampaignComparison, suspicious: CampaignComparison): string[] {
  const recommendations = [
    "Do not scale spend until activation is understood.",
    "Do not build Meta automation or automatic optimization from this comparison.",
  ];

  if (
    suspicious.metrics.installs_or_downloads_note.includes("produced some downloads/installs") ||
    suspicious.primary_failure_point.includes("activation")
  ) {
    recommendations.unshift("Investigate activation and onboarding before producing more creative volume.");
  }

  if (consultant.metrics.add_to_chrome_clicks === 0 && suspicious.primary_failure_point.includes("activation")) {
    recommendations.push(
      "Classify Suspiciously Polished as a later-stage funnel failure, not the same failure as the consultant campaign.",
    );
  }

  recommendations.push(
    "Because comments show message confusion, the next creative test should explain Verbatim in plainer language after activation tracking is understood.",
  );

  if (suspicious.local_data_status === "missing") {
    recommendations.push("Attach local Suspiciously Polished Meta metrics before making a confident numerical comparison.");
  }

  return recommendations;
}

function buildMarkdown(args: {
  client: ClientConfig;
  campaignConfig: CampaignConfig;
  consultant: CampaignComparison;
  suspicious: CampaignComparison;
  dataAvailability: Record<string, unknown>;
  outputJsonPath: string;
}): string {
  const recommendations = recommendation(args.consultant, args.suspicious);
  const suspiciousDataFound = args.suspicious.local_data_status === "found";

  return [
    "# Comparative Paid Ads Report v0.3",
    "",
    `Generated at: ${new Date().toISOString()}`,
    `Client: ${args.client.client_name}`,
    "",
    "## Executive Summary",
    "",
    "- The consultant campaign failed before install intent: spend created outbound clicks and a small number of landing page views, but no AddToChromeClick events or new users.",
    "- The Suspiciously Polished campaign appears to have moved the failure later: operator context says it produced some downloads or installs, but those did not become active usage or customers.",
    suspiciousDataFound
      ? "- Local normalized Meta data for Suspiciously Polished was found and is used in the comparison table."
      : "- Local normalized Meta data for Suspiciously Polished was not found, so this report uses placeholders for live campaign metrics rather than mixing in consultant data.",
    "- The next work should be activation and onboarding diagnosis, followed by a clearer plain-language creative test if tracking confirms the same confusion.",
    "",
    "## Campaign Comparison Table",
    "",
    markdownTable(comparisonTable([args.consultant, args.suspicious])),
    "",
    "## Funnel Comparison",
    "",
    "### Consultant campaign",
    "",
    "- Funnel path observed locally: spend to outbound clicks to landing page views to zero AddToChromeClick.",
    `- Local monitoring source: ${args.consultant.monitoring_source_path ?? "not found"}`,
    "- Interpretation: the offer, landing page, device path, or Add-to-Chrome step failed before install intent.",
    "",
    "### Suspiciously Polished campaign",
    "",
    `- Local monitoring source: ${args.suspicious.monitoring_source_path ?? "not found"}`,
    suspiciousDataFound
      ? "- Local Meta data is available for delivery, clicks, landing page views, and AddToChromeClick intent."
      : "- Operator context: some downloads or installs occurred, but active usage and customers did not follow.",
    "- Interpretation: this is likely a later-stage funnel failure, from install/download to activation, not purely an ad click failure.",
    "",
    "## Campaign 1: Consultant Campaign Diagnosis",
    "",
    args.consultant.diagnosis,
    "",
    "The consultant framing was rational and risk-led. It generated some click activity, but the conversion path did not create install intent. This campaign should stay paused unless the landing-page and Add-to-Chrome path are materially changed.",
    "",
    "## Campaign 2: Suspiciously Polished Diagnosis",
    "",
    args.suspicious.diagnosis,
    "",
    suspiciousDataFound
      ? "Suspiciously Polished is now comparable through the AddToChromeClick intent stage. It still is not comparable through confirmed install, activation, retention, or customer stages because those fields are not normalized locally."
      : "Suspiciously Polished is not cleanly comparable until exact spend, impressions, clicks, PageViews, AddToChromeClick events, installs, and activation are attached locally. The reported install/download signal means it should not be declared the same failure as the consultant campaign.",
    "",
    "## Where Each Campaign Failed",
    "",
    markdownTable([
      {
        Campaign: "Consultants",
        "Failure point": args.consultant.primary_failure_point,
        "What it means": "People clicked, but the page and Add-to-Chrome path did not convert.",
      },
      {
        Campaign: "Suspiciously Polished",
        "Failure point": args.suspicious.primary_failure_point,
        "What it means": "The message may create enough intent to download or install, but the product does not yet create activation or retained usage.",
      },
    ]),
    "",
    "## Qualitative Comment Signal",
    "",
    "- Some comments suggest the phrase resonates with people who recognize AI writing as too polished or too obviously artificial.",
    "- Some comments suggest confusion: users may interpret the product as AI detection, anti-AI, plagiarism detection, or AI attacking AI.",
    "- Treat comments as weak qualitative signal, not proof.",
    "",
    "## Tracking Gaps",
    "",
    suspiciousDataFound
      ? "- Suspiciously Polished live Meta delivery metrics were found locally."
      : "- Suspiciously Polished live Meta metrics were not found in the local normalized monitoring summaries.",
    "- Install/download counts are not locally normalized in this report.",
    "- Activated users and customers are not locally normalized in this report.",
    "- AddToChromeClick remains an intent event, not a confirmed install.",
    "- The path from install to first Debate run needs explicit instrumentation or a reliable manual audit.",
    "",
    "## Recommendation",
    "",
    recommendations.map((item) => `- ${item}`).join("\n"),
    "",
    "## Data Availability",
    "",
    `- Consultant local metrics: ${args.consultant.local_data_status}`,
    `- Suspiciously Polished local metrics: ${args.suspicious.local_data_status}`,
    `- Suspiciously Polished campaign config: ${args.campaignConfig.name}`,
    "",
    "## Guardrails",
    "",
    "- Read-only report only.",
    "- No Meta write actions were performed.",
    "- No budgets changed.",
    "- No ads paused.",
    "- No creative uploaded.",
    "- Human review is required before any campaign action.",
    "",
    "## Files",
    "",
    `- Comparative summary JSON: ${args.outputJsonPath}`,
    "",
  ].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const clientRoot = path.join("clients", args.client);
  const campaignRoot = path.join(clientRoot, "campaigns", suspiciousCampaignSlug);
  const runDir = path.join("output", `run-${isoStamp()}`);

  const clientConfig = await readJson<ClientConfig>(path.join(clientRoot, "client.config.json"));
  const suspiciousCampaignConfig = await readJson<CampaignConfig>(path.join(campaignRoot, "campaign.config.json"));
  const audienceContext = await readTextIfExists(path.join(clientRoot, "context", "audience.md"));
  const decisionLog = await readTextIfExists(path.join(campaignRoot, "decision-log.md"));
  const productContext = await readTextIfExists(path.join(clientRoot, "context", "product.md"));
  const trackingContext = await readTextIfExists(path.join(clientRoot, "context", "tracking.md"));
  const offerContext = await readTextIfExists(path.join(clientRoot, "context", "offer.md"));
  const adsDocument = await readTextIfExists(path.join(campaignRoot, "ads.md"));
  const launchReport = await readTextIfExists(path.join(campaignRoot, "launch-report.md"));

  const summaries = await readMonitoringSummaries();
  const consultantSummary = findLatestSummary(summaries, (summary) => campaignName(summary) === consultantCampaignName);
  const suspiciousSummary = findLatestSummary(
    summaries,
    (summary) =>
      campaignName(summary) === suspiciousCampaignConfig.name ||
      campaignId(summary) === suspiciousCampaignConfig.campaign_id,
  );

  const consultant = buildConsultantComparison({
    summaryMatch: consultantSummary,
    audienceContext,
    decisionLog,
  });
  const suspicious = buildSuspiciousComparison({
    campaignConfig: suspiciousCampaignConfig,
    summaryMatch: suspiciousSummary,
  });
  const recommendations = recommendation(consultant, suspicious);

  await mkdir(runDir, { recursive: true });

  const summaryPath = path.join(runDir, "paid-ads-comparative-summary.json");
  const markdownPath = path.join(runDir, "paid-ads-comparative-report.md");

  const sourcePaths = {
    client_config: path.join(clientRoot, "client.config.json"),
    product_context: path.join(clientRoot, "context", "product.md"),
    tracking_context: path.join(clientRoot, "context", "tracking.md"),
    audience_context: path.join(clientRoot, "context", "audience.md"),
    offer_context: path.join(clientRoot, "context", "offer.md"),
    suspicious_campaign_config: path.join(campaignRoot, "campaign.config.json"),
    suspicious_ads: path.join(campaignRoot, "ads.md"),
    suspicious_launch_report: path.join(campaignRoot, "launch-report.md"),
    suspicious_decision_log: path.join(campaignRoot, "decision-log.md"),
    consultant_monitoring_summary: consultant.monitoring_source_path,
    suspicious_monitoring_summary: suspicious.monitoring_source_path,
  };

  const dataAvailability = {
    consultant_local_monitoring_summary_found: consultant.local_data_status === "found",
    suspicious_local_monitoring_summary_found: suspicious.local_data_status === "found",
    suspicious_uses_operator_context_for_downloads: suspicious.local_data_status === "missing",
    exact_suspicious_installs_available_locally: false,
    exact_suspicious_activated_users_available_locally: false,
  };

  const output = {
    generated_at: new Date().toISOString(),
    version: "0.3",
    client: {
      client_id: clientConfig.client_id,
      client_name: clientConfig.client_name,
    },
    source_paths: sourcePaths,
    source_context_loaded: {
      product_context: productContext.length > 0,
      tracking_context: trackingContext.length > 0,
      audience_context: audienceContext.length > 0,
      offer_context: offerContext.length > 0,
      suspicious_ads: adsDocument.length > 0,
      suspicious_launch_report: launchReport.length > 0,
      suspicious_decision_log: decisionLog.length > 0,
    },
    data_availability: dataAvailability,
    campaigns: [consultant, suspicious],
    qualitative_comment_signal: {
      status: "weak_qualitative_signal",
      resonance:
        "Some comments suggest the phrase resonates with people who recognize AI writing as too polished or too obviously artificial.",
      confusion:
        "Some comments suggest confusion: users may interpret the product as AI detection, anti-AI, plagiarism detection, or AI attacking AI.",
      interpretation: "Use comments as directional input for message clarity, not proof of performance.",
    },
    recommendation: {
      action: "investigate_activation_before_more_creative_volume",
      recommendations,
      meta_automation_recommended: false,
      scale_spend_recommended: false,
      human_review_required: true,
    },
    guardrails: {
      read_only: true,
      meta_write_actions_performed: false,
      autonomous_optimization: false,
      budget_changes: false,
      ad_pauses: false,
      uploads: false,
    },
  };

  await writeFile(summaryPath, JSON.stringify(output, null, 2), "utf-8");
  await writeFile(
    markdownPath,
    buildMarkdown({
      client: clientConfig,
      campaignConfig: suspiciousCampaignConfig,
      consultant,
      suspicious,
      dataAvailability,
      outputJsonPath: summaryPath,
    }),
    "utf-8",
  );

  console.log("Comparative Paid Ads Report v0.3 complete.");
  console.log(`Markdown report: ${markdownPath}`);
  console.log(`Comparative summary: ${summaryPath}`);
  console.log(`Consultant local data: ${consultant.local_data_status}`);
  console.log(`Suspiciously Polished local data: ${suspicious.local_data_status}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
