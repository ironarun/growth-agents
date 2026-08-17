/// <reference types="node" />

import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export const manifestSchemaVersion = "0.1";

// Mirrors the campaign slug hardcoded in scripts/generate-paid-ads-comparative-report.ts.
// The comparative implementation only knows how to compare that campaign against the
// earlier consultant campaign, so any other campaign must be skipped instead of compared.
export const comparativeSupportedCampaignId = "suspiciously-polished-2026-07";

export const normalizedMonitoringDir = path.join("data", "paid-ads", "monitoring", "normalized");

export type StageName =
  | "resolve_client_workspace"
  | "validate_client_workspace"
  | "resolve_campaign_workspace"
  | "meta_monitoring"
  | "normalized_summary"
  | "operator_report"
  | "comparative_report";

export type StageStatus = "running" | "succeeded" | "failed" | "skipped";

export type RunStatus = "running" | "succeeded" | "failed";

export type StageRecord = {
  name: StageName;
  status: StageStatus;
  started_at: string;
  completed_at: string | null;
  output_paths: string[];
  error: string | null;
  skipped_reason: string | null;
};

export type SourceDataFreshness = {
  status: "known" | "unknown";
  meta_data_as_of: string | null;
  reporting_range: {
    since: string | null;
    until: string | null;
  } | null;
  source_path: string | null;
  note: string;
};

export type RunOutputs = {
  monitoring_raw_snapshot: string | null;
  monitoring_normalized_summary: string | null;
  monitoring_report_markdown: string | null;
  operator_report_markdown: string | null;
  operator_report_json: string | null;
  comparative_report_markdown: string | null;
  comparative_report_json: string | null;
  run_manifest: string;
};

export type RunManifest = {
  schema_version: string;
  run_id: string;
  client_id: string;
  campaign_id: string;
  started_at: string;
  completed_at: string | null;
  status: RunStatus;
  source_data_as_of: SourceDataFreshness;
  stages: StageRecord[];
  outputs: RunOutputs;
  warnings: string[];
  errors: string[];
};

export type CommandRequest = {
  stage: StageName;
  script: string;
  args: string[];
};

export type CommandResult = {
  exit_code: number;
  stdout: string;
  stderr: string;
};

export type OperatorRunnerDeps = {
  repoRoot: string;
  runCommand: (request: CommandRequest) => Promise<CommandResult>;
  now: () => Date;
  secretValues?: string[];
};

export type OperatorRunnerOptions = {
  client: string;
  campaign: string;
};

export type OperatorRunResult = {
  manifest: RunManifest;
  manifestPath: string;
  exitCode: number;
};

type MonitoringSummary = {
  generatedAt?: string;
  since?: string;
  until?: string;
  campaignWorkspace?: {
    campaignId?: unknown;
    campaignName?: unknown;
  };
  campaign?: {
    id?: unknown;
    name?: unknown;
  };
};

export type CampaignIdentityMatch = "match" | "mismatch" | "unverifiable";

type CampaignConfig = {
  campaign_id?: string;
  client_id?: string;
  name?: string;
};

type ClientConfig = {
  client_id?: string;
  client_name?: string;
};

class StageFailure extends Error {}

class StageSkip extends Error {}

export function runIdFor(date: Date): string {
  return `run-${date.toISOString().replace(/[:.]/g, "-")}`;
}

export function redactSecrets(value: string, secretValues: string[] = []): string {
  let output = value.replace(/access_token=[^&\s"']+/g, "access_token=[REDACTED]");

  for (const secret of secretValues) {
    if (secret.trim().length < 8) continue;
    output = output.split(secret).join("[REDACTED]");
  }

  return output;
}

export function parseLabeledPath(stdout: string, label: string): string | null {
  const lines = stdout.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith(`${label}:`)) continue;

    const value = trimmed.slice(label.length + 1).trim();
    if (value.length > 0) return value;
  }

  return null;
}

function stableString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Campaign identity comes from the workspace campaign ID that Meta monitoring
 * copies into the summary, never from the human-readable campaign name.
 * "unverifiable" means one of the two records carries no stable identifier.
 */
export function compareSummaryCampaign(
  summary: MonitoringSummary,
  campaign: CampaignConfig,
): CampaignIdentityMatch {
  const summaryCampaignId = stableString(summary.campaignWorkspace?.campaignId);
  const configCampaignId = stableString(campaign.campaign_id);

  if (summaryCampaignId === null || configCampaignId === null) return "unverifiable";

  return summaryCampaignId === configCampaignId ? "match" : "mismatch";
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf-8")) as T;
}

async function listNormalizedSummaries(repoRoot: string): Promise<string[]> {
  const directory = path.join(repoRoot, normalizedMonitoringDir);

  let entries: string[];

  try {
    entries = await readdir(directory);
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.startsWith("meta-monitoring-summary-") && entry.endsWith(".json"))
    .sort()
    .reverse()
    .map((entry) => path.join(normalizedMonitoringDir, entry));
}

async function findLatestMatchingSummary(
  repoRoot: string,
  campaign: CampaignConfig,
): Promise<string | null> {
  for (const relativePath of await listNormalizedSummaries(repoRoot)) {
    try {
      const summary = await readJsonFile<MonitoringSummary>(path.join(repoRoot, relativePath));
      if (compareSummaryCampaign(summary, campaign) === "match") return relativePath;
    } catch {
      continue;
    }
  }

  return null;
}

async function hasComparisonData(repoRoot: string, campaign: CampaignConfig): Promise<boolean> {
  for (const relativePath of await listNormalizedSummaries(repoRoot)) {
    try {
      const summary = await readJsonFile<MonitoringSummary>(path.join(repoRoot, relativePath));
      if (compareSummaryCampaign(summary, campaign) === "mismatch") return true;
    } catch {
      continue;
    }
  }

  return false;
}

export async function runPaidAdsOperator(
  options: OperatorRunnerOptions,
  deps: OperatorRunnerDeps,
): Promise<OperatorRunResult> {
  const { repoRoot } = deps;
  const secretValues = deps.secretValues ?? [];
  const startedAt = deps.now();
  const runId = runIdFor(startedAt);
  const runDir = path.join("output", runId);
  const manifestPath = path.join(runDir, "run-manifest.json");

  const manifest: RunManifest = {
    schema_version: manifestSchemaVersion,
    run_id: runId,
    client_id: options.client,
    campaign_id: options.campaign,
    started_at: startedAt.toISOString(),
    completed_at: null,
    status: "running",
    source_data_as_of: {
      status: "unknown",
      meta_data_as_of: null,
      reporting_range: null,
      source_path: null,
      note: "Meta monitoring has not reported source data freshness yet.",
    },
    stages: [],
    outputs: {
      monitoring_raw_snapshot: null,
      monitoring_normalized_summary: null,
      monitoring_report_markdown: null,
      operator_report_markdown: null,
      operator_report_json: null,
      comparative_report_markdown: null,
      comparative_report_json: null,
      run_manifest: manifestPath,
    },
    warnings: [],
    errors: [],
  };

  await mkdir(path.join(repoRoot, runDir), { recursive: true });

  const writeManifest = async (): Promise<void> => {
    await writeFile(
      path.join(repoRoot, manifestPath),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf-8",
    );
  };

  await writeManifest();

  let campaignConfig: CampaignConfig = {};

  const runStage = async (name: StageName, body: () => Promise<string[]>): Promise<boolean> => {
    if (manifest.status === "failed") return false;

    const record: StageRecord = {
      name,
      status: "running",
      started_at: deps.now().toISOString(),
      completed_at: null,
      output_paths: [],
      error: null,
      skipped_reason: null,
    };

    manifest.stages.push(record);
    await writeManifest();

    try {
      record.output_paths = await body();
      record.status = "succeeded";
      record.completed_at = deps.now().toISOString();
      await writeManifest();
      return true;
    } catch (error) {
      const message = redactSecrets(
        error instanceof Error ? error.message : String(error),
        secretValues,
      );
      record.completed_at = deps.now().toISOString();

      if (error instanceof StageSkip) {
        record.status = "skipped";
        record.skipped_reason = message;
        manifest.warnings.push(`${name} skipped: ${message}`);
        await writeManifest();
        return true;
      }

      record.status = "failed";
      record.error = message;
      manifest.status = "failed";
      manifest.errors.push(`${name} failed: ${message}`);
      manifest.completed_at = record.completed_at;
      await writeManifest();
      return false;
    }
  };

  const runScript = async (
    stage: StageName,
    script: string,
    args: string[],
  ): Promise<CommandResult> => {
    const result = await deps.runCommand({ stage, script, args });

    if (result.exit_code !== 0) {
      const detail = [result.stderr.trim(), result.stdout.trim()].filter(Boolean).join("\n").trim();
      throw new StageFailure(
        `${script} exited with code ${result.exit_code}${detail ? `: ${detail}` : "."}`,
      );
    }

    return result;
  };

  await runStage("resolve_client_workspace", async () => {
    const clientConfigPath = path.join("clients", options.client, "client.config.json");

    if (!existsSync(path.join(repoRoot, clientConfigPath))) {
      throw new StageFailure(`Missing client workspace config: ${clientConfigPath}`);
    }

    const clientConfig = await readJsonFile<ClientConfig>(path.join(repoRoot, clientConfigPath));

    if (clientConfig.client_id !== options.client) {
      throw new StageFailure(
        `Client workspace config declares client_id ${String(clientConfig.client_id)} but ${options.client} was requested.`,
      );
    }

    return [clientConfigPath];
  });

  await runStage("validate_client_workspace", async () => {
    await runScript("validate_client_workspace", "scripts/validate-client-workspace.ts", [
      "--client",
      options.client,
    ]);

    return [];
  });

  await runStage("resolve_campaign_workspace", async () => {
    const campaignConfigPath = path.join(
      "clients",
      options.client,
      "campaigns",
      options.campaign,
      "campaign.config.json",
    );

    if (!existsSync(path.join(repoRoot, campaignConfigPath))) {
      throw new StageFailure(`Missing campaign workspace config: ${campaignConfigPath}`);
    }

    campaignConfig = await readJsonFile<CampaignConfig>(path.join(repoRoot, campaignConfigPath));

    if (campaignConfig.campaign_id !== options.campaign) {
      throw new StageFailure(
        `Campaign workspace config declares campaign_id ${String(campaignConfig.campaign_id)} but ${options.campaign} was requested.`,
      );
    }

    if (campaignConfig.client_id !== options.client) {
      throw new StageFailure(
        `Campaign ${options.campaign} belongs to client ${String(campaignConfig.client_id)}, not ${options.client}.`,
      );
    }

    return [campaignConfigPath];
  });

  await runStage("meta_monitoring", async () => {
    const result = await runScript("meta_monitoring", "scripts/ingest-meta-campaign-monitoring.ts", [
      "--client",
      options.client,
      "--campaign",
      options.campaign,
    ]);

    manifest.outputs.monitoring_raw_snapshot = parseLabeledPath(result.stdout, "Raw snapshot");
    manifest.outputs.monitoring_normalized_summary = parseLabeledPath(
      result.stdout,
      "Normalized summary",
    );
    manifest.outputs.monitoring_report_markdown = parseLabeledPath(result.stdout, "Markdown report");

    return [
      manifest.outputs.monitoring_raw_snapshot,
      manifest.outputs.monitoring_normalized_summary,
      manifest.outputs.monitoring_report_markdown,
    ].filter((value): value is string => value !== null);
  });

  await runStage("normalized_summary", async () => {
    const fromMonitoring = manifest.outputs.monitoring_normalized_summary;
    const summaryPath =
      fromMonitoring && existsSync(path.join(repoRoot, fromMonitoring))
        ? fromMonitoring
        : await findLatestMatchingSummary(repoRoot, campaignConfig);

    if (!summaryPath) {
      throw new StageFailure(
        `No normalized monitoring summary found for campaign ${options.campaign} under ${normalizedMonitoringDir}.`,
      );
    }

    if (summaryPath !== fromMonitoring) {
      manifest.warnings.push(
        `Meta monitoring did not report a normalized summary path. Reused the newest matching summary: ${summaryPath}.`,
      );
    }

    manifest.outputs.monitoring_normalized_summary = summaryPath;

    const summary = await readJsonFile<MonitoringSummary>(path.join(repoRoot, summaryPath));

    const identityMatch = compareSummaryCampaign(summary, campaignConfig);

    if (identityMatch === "unverifiable") {
      throw new StageFailure(
        `Normalized summary ${summaryPath} does not record a campaignWorkspace.campaignId, so it cannot be verified against campaign ${options.campaign}. Regenerate it with --campaign ${options.campaign}.`,
      );
    }

    if (identityMatch === "mismatch") {
      throw new StageFailure(
        `Normalized summary ${summaryPath} belongs to campaign ${String(
          summary.campaignWorkspace?.campaignId,
        )}, not the requested campaign ${options.campaign}.`,
      );
    }

    const generatedAt = typeof summary.generatedAt === "string" ? summary.generatedAt : null;
    const since = typeof summary.since === "string" ? summary.since : null;
    const until = typeof summary.until === "string" ? summary.until : null;

    manifest.source_data_as_of = {
      status: generatedAt || since || until ? "known" : "unknown",
      meta_data_as_of: generatedAt,
      reporting_range: since || until ? { since, until } : null,
      source_path: summaryPath,
      note:
        generatedAt || since || until
          ? "Freshness reflects when the Meta insights response was read, not live campaign state."
          : "The normalized summary did not expose a generation timestamp or reporting range.",
    };

    if (manifest.source_data_as_of.status === "unknown") {
      manifest.warnings.push(
        "Source data freshness is unknown. Do not treat the reports as current Meta data.",
      );
    }

    return [summaryPath];
  });

  await runStage("operator_report", async () => {
    const result = await runScript("operator_report", "scripts/generate-paid-ads-operator-report.ts", [
      "--client",
      options.client,
      "--campaign",
      options.campaign,
    ]);

    manifest.outputs.operator_report_markdown = parseLabeledPath(result.stdout, "Markdown report");
    manifest.outputs.operator_report_json = parseLabeledPath(result.stdout, "Campaign summary");

    if (!manifest.outputs.operator_report_markdown) {
      throw new StageFailure(
        "The operator report script did not report a markdown report path.",
      );
    }

    return [manifest.outputs.operator_report_markdown, manifest.outputs.operator_report_json].filter(
      (value): value is string => value !== null,
    );
  });

  await runStage("comparative_report", async () => {
    if (options.campaign !== comparativeSupportedCampaignId) {
      throw new StageSkip(
        `The comparative report implementation only supports campaign ${comparativeSupportedCampaignId}.`,
      );
    }

    if (!(await hasComparisonData(repoRoot, campaignConfig))) {
      throw new StageSkip(
        `No normalized monitoring summary exists for a comparison campaign under ${normalizedMonitoringDir}.`,
      );
    }

    const result = await runScript(
      "comparative_report",
      "scripts/generate-paid-ads-comparative-report.ts",
      ["--client", options.client],
    );

    manifest.outputs.comparative_report_markdown = parseLabeledPath(result.stdout, "Markdown report");
    manifest.outputs.comparative_report_json = parseLabeledPath(result.stdout, "Comparative summary");

    return [
      manifest.outputs.comparative_report_markdown,
      manifest.outputs.comparative_report_json,
    ].filter((value): value is string => value !== null);
  });

  if (manifest.status !== "failed") {
    manifest.status = "succeeded";
    manifest.completed_at = deps.now().toISOString();
    await writeManifest();
  }

  return {
    manifest,
    manifestPath,
    exitCode: manifest.status === "succeeded" ? 0 : 1,
  };
}
