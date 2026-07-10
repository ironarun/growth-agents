import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

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
  adName: string;
  adId: string;
  dateStart: string;
  dateStop: string;
  ctr: number;
  cpc: number;
  cpm: number;
  period?: "pre_change" | "change_day_mixed" | "post_change";
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
  account: {
    pixelId: string;
    customConversionName: string;
    customConversionId: string;
    customEventName: string;
  };
  campaign: Record<string, unknown>;
  adset: Record<string, unknown>;
  totals: Totals;
  adPerformance: AdPerformanceRow[];
  placementTotals: PlacementTotal[];
  recommendation?: {
    action: string;
    severity: string;
    rationale: string;
    findings: string[];
    humanReviewRequired: boolean;
    optimizationActionsAllowed: boolean;
  };
  humanChangeLog?: Array<{ timestampEt: string; change: string }>;
  reportingNotes?: {
    placementChangeDate: string;
    preChangeData: string;
    changeDayData: string;
    postChangeData: string;
  };
};

const normalizedDir = path.join("data", "paid-ads", "monitoring", "normalized");
const operatorReportDir = path.join("data", "paid-ads", "operator-reports");

function fail(message: string): never {
  throw new Error(message);
}

function isoStamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function maybe(value: unknown): string {
  if (value === undefined || value === null || value === "") {
    return "unknown";
  }

  return String(value);
}

function markdownTable(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) {
    return "_No rows._";
  }

  const headers = Object.keys(rows[0] ?? {});
  const header = `| ${headers.join(" | ")} |`;
  const divider = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows
    .map((row) => `| ${headers.map((headerName) => row[headerName] ?? "").join(" | ")} |`)
    .join("\n");

  return [header, divider, body].join("\n");
}

async function latestNormalizedSummaryPath(): Promise<string> {
  let files: string[];

  try {
    files = await readdir(normalizedDir);
  } catch {
    fail(
      [
        `No normalized Meta monitoring summaries found in ${normalizedDir}.`,
        "Run this first:",
        "npm run consultant:paid-ads-meta-monitoring",
      ].join("\n"),
    );
  }

  const candidates = files.filter((file) => {
    return file.startsWith("meta-monitoring-summary-") && file.endsWith(".json");
  });

  if (candidates.length === 0) {
    fail(
      [
        `No normalized Meta monitoring summaries found in ${normalizedDir}.`,
        "Run this first:",
        "npm run consultant:paid-ads-meta-monitoring",
      ].join("\n"),
    );
  }

  const withStats = await Promise.all(
    candidates.map(async (file) => {
      const fullPath = path.join(normalizedDir, file);
      return {
        path: fullPath,
        mtimeMs: (await stat(fullPath)).mtimeMs,
      };
    }),
  );

  return withStats.sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.path ?? fail("Unable to resolve latest monitoring summary.");
}

async function readSummary(summaryPath: string): Promise<MonitoringSummary> {
  const parsed = JSON.parse(await readFile(summaryPath, "utf-8")) as Partial<MonitoringSummary>;

  if (!parsed.totals || !Array.isArray(parsed.adPerformance) || !Array.isArray(parsed.placementTotals)) {
    fail(`Monitoring summary is missing expected fields: ${summaryPath}`);
  }

  return parsed as MonitoringSummary;
}

function trackingRead(summary: MonitoringSummary): string[] {
  const rows: string[] = [];
  const actionsPresent = summary.adPerformance.some((row) => (row.rawActions ?? []).length > 0);

  if (!actionsPresent) {
    rows.push("Tracking risk: no action rows are present in the monitoring summary.");
  } else {
    rows.push("Meta action rows are present in the monitoring summary.");
  }

  if (summary.totals.landingPageViews > 0 && summary.totals.addToChromeEvents === 0) {
    rows.push("Funnel friction: landing page views are present, but AddToChrome is still zero.");
  }

  if (summary.totals.landingPageViews === 0 && summary.totals.outboundClicks > 0) {
    rows.push("Landing page continuation risk: outbound clicks are present, but no landing page views are recorded.");
  }

  if (summary.totals.addToChromeEvents > 0) {
    rows.push("AddToChrome is firing in paid traffic.");
  }

  return rows;
}

function spendRead(summary: MonitoringSummary): string[] {
  const rows = [
    `Spend is ${money(summary.totals.spend)} across ${summary.totals.impressions} impressions and ${summary.totals.outboundClicks} outbound clicks.`,
  ];

  if (summary.totals.spend < 10) {
    rows.push("Spend is still too low for optimization.");
  }

  if (summary.totals.spend >= 10 && summary.totals.landingPageViews < 20) {
    rows.push("Spend is above the first-read threshold, but landing page view volume is still thin.");
  }

  return rows;
}

function creativeRead(summary: MonitoringSummary): string[] {
  if (summary.adPerformance.length === 0) {
    return ["No ad-level rows are available."];
  }

  const sortedBySpend = [...summary.adPerformance].sort((a, b) => b.spend - a.spend);
  const sortedByOutboundClicks = [...summary.adPerformance].sort((a, b) => b.outboundClicks - a.outboundClicks);
  const topSpend = sortedBySpend[0];
  const topClicks = sortedByOutboundClicks[0];

  if (!topSpend || !topClicks) {
    return ["No ad-level rows are available."];
  }

  const rows = [
    `${topSpend.adName} has spent the most so far at ${money(topSpend.spend)}.`,
    `${topClicks.adName} has the most outbound clicks so far with ${topClicks.outboundClicks}.`,
  ];

  if (summary.totals.addToChromeEvents === 0) {
    rows.push("Do not declare a creative winner while AddToChrome remains zero.");
  }

  if (summary.adPerformance.some((row) => row.period === "change_day_mixed" || row.period === "pre_change")) {
    rows.push("Creative read is affected by pre-change or mixed placement data.");
  }

  return rows;
}

function placementRead(summary: MonitoringSummary): string[] {
  if (summary.placementTotals.length === 0) {
    return ["No placement rows are available."];
  }

  const topPlacement = [...summary.placementTotals].sort((a, b) => b.spendShare - a.spendShare)[0];

  if (!topPlacement) {
    return ["No placement rows are available."];
  }

  const rows = [
    `${topPlacement.publisherPlatform} / ${topPlacement.platformPosition} has the highest spend share at ${percent(topPlacement.spendShare)}.`,
  ];

  if (topPlacement.spendShare > 0.5 && topPlacement.addToChromeEvents === 0) {
    rows.push("Placement risk: one placement has more than 50% of spend and zero AddToChrome.");
  }

  if (summary.reportingNotes) {
    rows.push("Placement concentration may reflect pre-change or mixed data until a clean post-correction read is available.");
  }

  return rows;
}

function doToday(summary: MonitoringSummary): string[] {
  const rows = [
    "Review the Meta ad set to confirm Facebook Feed-only delivery remains in place.",
    "Check whether any post-correction spend has accumulated before making a creative call.",
    "Verify the /consultants page and Add to Chrome path manually from the campaign URL.",
  ];

  if (summary.totals.landingPageViews > 0 && summary.totals.addToChromeEvents === 0) {
    rows.push("Inspect the landing page path for friction between landing page view and AddToChrome click.");
  }

  if (summary.totals.spend < 10) {
    rows.push("Wait for more spend before optimization.");
  }

  return rows;
}

function doNotDo(): string[] {
  return [
    "Do not pause ads automatically.",
    "Do not change budget automatically.",
    "Do not change placements automatically.",
    "Do not edit creative or URLs from this report.",
    "Do not declare a creative winner from pre-change or mixed placement data.",
    "Do not create new variants today unless Arun explicitly changes the task.",
  ];
}

function formatReport(summary: MonitoringSummary, summaryPath: string): string {
  const generatedAt = new Date().toISOString();
  const adRows = summary.adPerformance.map((row) => ({
    Ad: row.adName,
    Spend: money(row.spend),
    "Outbound clicks": row.outboundClicks,
    "Landing page views": row.landingPageViews,
    AddToChrome: row.addToChromeEvents,
    Period: row.period ?? "unknown",
  }));
  const placementRows = summary.placementTotals.map((row) => ({
    Platform: row.publisherPlatform,
    Placement: row.platformPosition,
    Spend: money(row.spend),
    "Spend share": percent(row.spendShare),
    "Landing page views": row.landingPageViews,
    AddToChrome: row.addToChromeEvents,
  }));
  const changeLog = summary.humanChangeLog?.length
    ? summary.humanChangeLog.map((entry) => `- ${entry.timestampEt}: ${entry.change}`)
    : ["- No human change log entries found in the monitoring summary."];

  return [
    "# Paid Ads Daily Operator Report",
    "",
    `Generated: ${generatedAt}`,
    "",
    `Monitoring summary used: ${summaryPath}`,
    "",
    `Date range: ${summary.since} to ${summary.until}`,
    "",
    "## Campaign Status",
    "",
    `- Campaign: ${maybe(summary.campaign.name)}`,
    `- Campaign status: ${maybe(summary.campaign.effective_status)}`,
    `- Objective: ${maybe(summary.campaign.objective)}`,
    `- Ad set: ${maybe(summary.adset.name)}`,
    `- Ad set status: ${maybe(summary.adset.effective_status)}`,
    `- Optimization goal: ${maybe(summary.adset.optimization_goal)}`,
    "",
    "## Tracking Status",
    "",
    ...trackingRead(summary).map((line) => `- ${line}`),
    "",
    "## Spend And Funnel Metrics",
    "",
    ...spendRead(summary).map((line) => `- ${line}`),
    "",
    `- Landing page views: ${summary.totals.landingPageViews}`,
    `- AddToChrome: ${summary.totals.addToChromeEvents}`,
    "",
    markdownTable(adRows),
    "",
    "## Creative Read",
    "",
    ...creativeRead(summary).map((line) => `- ${line}`),
    "",
    "## Placement Read",
    "",
    ...placementRead(summary).map((line) => `- ${line}`),
    "",
    markdownTable(placementRows),
    "",
    "## Decision Log Reminder",
    "",
    ...changeLog,
    "",
    summary.reportingNotes
      ? [
        "- Pre-change data may include placements removed by the manual correction.",
        "- Change-day data can mix pre-change and post-change delivery.",
        "- Use a clean post-change read before making optimization decisions.",
      ].join("\n")
      : "- No pre-change / post-change note found.",
    "",
    "## Recommendation",
    "",
    `- Action: ${summary.recommendation?.action ?? "monitor_only"}`,
    `- Severity: ${summary.recommendation?.severity ?? "monitor_only"}`,
    `- Rationale: ${summary.recommendation?.rationale ?? "Continue monitoring. No automatic optimization action is allowed."}`,
    "",
    ...(summary.recommendation?.findings ?? ["No recommendation findings found."]).map((finding) => `- ${finding}`),
    "",
    "Human review is required before any campaign change.",
    "",
    "## Do Today",
    "",
    ...doToday(summary).map((line) => `- [ ] ${line}`),
    "",
    "## Do Not Do",
    "",
    ...doNotDo().map((line) => `- ${line}`),
    "",
    "## Gate",
    "",
    "- [x] Read-only report generated",
    "- [x] No automatic campaign edits",
    "- [ ] Human reviewed",
    "- [ ] Manual action chosen, if any",
    "",
  ].join("\n");
}

async function main() {
  const summaryPath = await latestNormalizedSummaryPath();
  const summary = await readSummary(summaryPath);
  const runStamp = isoStamp();
  const reportPath = path.join(operatorReportDir, `paid-ads-daily-operator-report-${summary.until}-${runStamp}.md`);

  await mkdir(operatorReportDir, { recursive: true });
  await writeFile(reportPath, formatReport(summary, summaryPath), "utf-8");

  console.log("Paid ads daily operator report complete.");
  console.log(`Monitoring summary used: ${summaryPath}`);
  console.log(`Operator report: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
