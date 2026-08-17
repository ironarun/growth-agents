/// <reference types="node" />

import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  normalizedMonitoringDir,
  runPaidAdsOperator,
  type CommandRequest,
  type CommandResult,
  type RunManifest,
  type StageName,
} from "../scripts/lib/paid-ads-operator-runner.js";

const client = "verbatim";
const campaign = "suspiciously-polished-2026-07";
const campaignName = "Verbatim First Flight - Suspiciously Polished - Consumer - 2026-07";
const priorCampaign = "consultants-client-facing-ai-review-v1";
const priorCampaignName = "Verbatim First Flight - Consultants - 2026-07";
const accessToken = "EAAG-super-secret-meta-token-value";

type CommandOverrides = Partial<Record<StageName, CommandResult>>;

function ok(stdout: string): CommandResult {
  return { exit_code: 0, stdout, stderr: "" };
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

async function createWorkspace(options?: {
  clientId?: string;
  campaignId?: string;
  campaignClientId?: string;
  withPriorCampaignSummary?: boolean;
  withCampaignSummary?: boolean;
  summaryCampaignId?: string | null;
  summaryCampaignName?: string;
}): Promise<string> {
  const repoRoot = await mkdtemp(path.join(tmpdir(), "operator-runner-"));
  const clientId = options?.clientId ?? client;
  const campaignId = options?.campaignId ?? campaign;

  await writeJson(path.join(repoRoot, "clients", clientId, "client.config.json"), {
    client_id: clientId,
    client_name: "Verbatim",
  });

  await writeJson(
    path.join(repoRoot, "clients", clientId, "campaigns", campaignId, "campaign.config.json"),
    {
      campaign_id: campaignId,
      client_id: options?.campaignClientId ?? clientId,
      name: campaignName,
    },
  );

  if (options?.withCampaignSummary ?? true) {
    await writeCampaignSummary(repoRoot, "meta-monitoring-summary-2026-07-25.json", {
      workspaceCampaignId:
        options && "summaryCampaignId" in options ? options.summaryCampaignId : campaignId,
      name: options?.summaryCampaignName ?? campaignName,
    });
  }

  if (options?.withPriorCampaignSummary) {
    await writeCampaignSummary(repoRoot, "meta-monitoring-summary-2026-07-20.json", {
      workspaceCampaignId: priorCampaign,
      name: priorCampaignName,
    });
  }

  return repoRoot;
}

async function writeCampaignSummary(
  repoRoot: string,
  fileName: string,
  identity: { workspaceCampaignId?: string | null; name: string },
): Promise<string> {
  const relativePath = path.join(normalizedMonitoringDir, fileName);
  const workspaceCampaignId = identity.workspaceCampaignId;

  await writeJson(path.join(repoRoot, relativePath), {
    generatedAt: "2026-07-25T09:00:00.000Z",
    since: "2026-07-08",
    until: "2026-07-24",
    ...(workspaceCampaignId
      ? {
          campaignWorkspace: {
            campaignId: workspaceCampaignId,
            campaignName: identity.name,
          },
        }
      : {}),
    campaign: { id: "6962618508954", name: identity.name },
    totals: { spend: 12.34 },
  });

  return relativePath;
}

function fakeRunner(repoRoot: string, overrides: CommandOverrides = {}) {
  const calls: StageName[] = [];

  const defaults: Partial<Record<StageName, CommandResult>> = {
    validate_client_workspace: ok("Validation passed.\n"),
    meta_monitoring: ok(
      [
        "Meta monitoring complete.",
        `Raw snapshot: ${path.join("data", "paid-ads", "monitoring", "raw", "meta-monitoring-raw-2026-07-25.json")}`,
        `Normalized summary: ${path.join(normalizedMonitoringDir, "meta-monitoring-summary-2026-07-25.json")}`,
        `Markdown report: ${path.join("data", "paid-ads", "monitoring", "reports", "meta-monitoring-report-2026-07-24.md")}`,
      ].join("\n"),
    ),
    operator_report: ok(
      [
        "Paid Ads Operator Report v0.2 complete.",
        `Markdown report: ${path.join("output", "run-stage", "paid-ads-operator-report.md")}`,
        `Campaign summary: ${path.join("output", "run-stage", "campaign-summary.json")}`,
      ].join("\n"),
    ),
    comparative_report: ok(
      [
        "Comparative Paid Ads Report v0.3 complete.",
        `Markdown report: ${path.join("output", "run-stage", "paid-ads-comparative-report.md")}`,
        `Comparative summary: ${path.join("output", "run-stage", "paid-ads-comparative-summary.json")}`,
      ].join("\n"),
    ),
  };

  const runCommand = async (request: CommandRequest): Promise<CommandResult> => {
    calls.push(request.stage);
    const result = overrides[request.stage] ?? defaults[request.stage];

    if (!result) {
      throw new Error(`Unexpected stage command: ${request.stage}`);
    }

    return result;
  };

  return { calls, runCommand, repoRoot };
}

function clock(): () => Date {
  let tick = 0;

  return () => {
    tick += 1;
    return new Date(Date.UTC(2026, 6, 25, 10, 0, tick));
  };
}

async function run(repoRoot: string, overrides: CommandOverrides = {}) {
  const runner = fakeRunner(repoRoot, overrides);
  const result = await runPaidAdsOperator(
    { client, campaign },
    {
      repoRoot,
      now: clock(),
      secretValues: [accessToken],
      runCommand: runner.runCommand,
    },
  );

  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, result.manifestPath), "utf-8"),
  ) as RunManifest;

  return { ...result, persistedManifest: manifest, calls: runner.calls };
}

function stage(manifest: RunManifest, name: StageName) {
  const found = manifest.stages.find((item) => item.name === name);
  assert.ok(found, `Expected stage ${name} to be recorded.`);
  return found;
}

test("orchestrates every stage and records a successful manifest", async () => {
  const repoRoot = await createWorkspace({ withPriorCampaignSummary: true });
  const { exitCode, manifest, persistedManifest, calls } = await run(repoRoot);

  assert.equal(exitCode, 0);
  assert.equal(manifest.status, "succeeded");
  assert.deepEqual(calls, [
    "validate_client_workspace",
    "meta_monitoring",
    "operator_report",
    "comparative_report",
  ]);
  assert.deepEqual(
    manifest.stages.map((item) => item.name),
    [
      "resolve_client_workspace",
      "validate_client_workspace",
      "resolve_campaign_workspace",
      "meta_monitoring",
      "normalized_summary",
      "operator_report",
      "comparative_report",
    ],
  );
  assert.ok(manifest.stages.every((item) => item.status === "succeeded"));
  assert.equal(manifest.schema_version, "0.1");
  assert.equal(manifest.client_id, client);
  assert.equal(manifest.campaign_id, campaign);
  assert.ok(manifest.completed_at);
  assert.equal(
    manifest.outputs.operator_report_markdown,
    path.join("output", "run-stage", "paid-ads-operator-report.md"),
  );
  assert.equal(
    manifest.outputs.comparative_report_markdown,
    path.join("output", "run-stage", "paid-ads-comparative-report.md"),
  );
  assert.deepEqual(persistedManifest, manifest);
});

test("records source data freshness from the normalized monitoring summary", async () => {
  const repoRoot = await createWorkspace({ withPriorCampaignSummary: true });
  const { manifest } = await run(repoRoot);

  assert.equal(manifest.source_data_as_of.status, "known");
  assert.equal(manifest.source_data_as_of.meta_data_as_of, "2026-07-25T09:00:00.000Z");
  assert.deepEqual(manifest.source_data_as_of.reporting_range, {
    since: "2026-07-08",
    until: "2026-07-24",
  });
  assert.equal(
    manifest.source_data_as_of.source_path,
    path.join(normalizedMonitoringDir, "meta-monitoring-summary-2026-07-25.json"),
  );
});

test("fails when the client workspace is invalid", async () => {
  const repoRoot = await createWorkspace({ withPriorCampaignSummary: true });
  const { exitCode, manifest, persistedManifest } = await run(repoRoot, {
    validate_client_workspace: {
      exit_code: 1,
      stdout: "Failures:\n- Missing required file: clients/verbatim/context/offer.md\n",
      stderr: "",
    },
  });

  assert.equal(exitCode, 1);
  assert.equal(manifest.status, "failed");
  assert.equal(stage(manifest, "validate_client_workspace").status, "failed");
  assert.match(String(stage(manifest, "validate_client_workspace").error), /Missing required file/);
  assert.equal(manifest.stages.length, 2);
  assert.equal(persistedManifest.status, "failed");
  assert.ok(persistedManifest.completed_at);
});

test("fails when the client workspace does not exist", async () => {
  const repoRoot = await createWorkspace({ clientId: "not-a-client" });
  const { exitCode, manifest } = await run(repoRoot);

  assert.equal(exitCode, 1);
  assert.equal(stage(manifest, "resolve_client_workspace").status, "failed");
  assert.match(String(stage(manifest, "resolve_client_workspace").error), /Missing client workspace config/);
});

test("fails when the campaign is unknown", async () => {
  const repoRoot = await createWorkspace({ campaignId: "not-a-campaign" });
  const { exitCode, manifest, calls } = await run(repoRoot);

  assert.equal(exitCode, 1);
  assert.equal(stage(manifest, "resolve_campaign_workspace").status, "failed");
  assert.match(
    String(stage(manifest, "resolve_campaign_workspace").error),
    /Missing campaign workspace config/,
  );
  assert.deepEqual(calls, ["validate_client_workspace"]);
});

test("fails and preserves the manifest when Meta monitoring fails", async () => {
  const repoRoot = await createWorkspace();
  const { exitCode, manifest, persistedManifest, calls } = await run(repoRoot, {
    meta_monitoring: {
      exit_code: 1,
      stdout: "",
      stderr: "Meta API error 400: invalid request",
    },
  });

  assert.equal(exitCode, 1);
  assert.equal(manifest.status, "failed");
  assert.equal(stage(manifest, "meta_monitoring").status, "failed");
  assert.match(String(stage(manifest, "meta_monitoring").error), /Meta API error 400/);
  assert.deepEqual(calls, ["validate_client_workspace", "meta_monitoring"]);
  assert.equal(persistedManifest.stages.length, 4);
  assert.equal(persistedManifest.errors.length, 1);
  assert.equal(
    persistedManifest.stages.filter((item) => item.status === "succeeded").length,
    3,
  );
});

test("fails when operator report generation fails", async () => {
  const repoRoot = await createWorkspace();
  const { exitCode, manifest } = await run(repoRoot, {
    operator_report: {
      exit_code: 1,
      stdout: "",
      stderr: "Missing required file: clients/verbatim/campaigns/x/campaign.config.json",
    },
  });

  assert.equal(exitCode, 1);
  assert.equal(manifest.status, "failed");
  assert.equal(stage(manifest, "operator_report").status, "failed");
  assert.equal(manifest.outputs.operator_report_markdown, null);
  assert.equal(manifest.stages.some((item) => item.name === "comparative_report"), false);
});

test("skips the comparative stage when no comparison data exists", async () => {
  const repoRoot = await createWorkspace();
  const { exitCode, manifest, calls } = await run(repoRoot);

  assert.equal(exitCode, 0);
  assert.equal(manifest.status, "succeeded");
  assert.equal(stage(manifest, "comparative_report").status, "skipped");
  assert.match(
    String(stage(manifest, "comparative_report").skipped_reason),
    /No normalized monitoring summary exists for a comparison campaign/,
  );
  assert.equal(manifest.outputs.comparative_report_markdown, null);
  assert.equal(calls.includes("comparative_report"), false);
  assert.equal(manifest.warnings.length, 1);
});

test("accepts a summary whose display name differs from the workspace name", async () => {
  const repoRoot = await createWorkspace({
    summaryCampaignName: "Verbatim First Flight - Suspiciously Polished - Consumer - 2026-07 (renamed in Meta)",
    withPriorCampaignSummary: true,
  });
  const { exitCode, manifest } = await run(repoRoot);

  assert.equal(exitCode, 0);
  assert.equal(manifest.status, "succeeded");
  assert.equal(stage(manifest, "normalized_summary").status, "succeeded");
});

test("fails when the summary carries a different stable campaign identifier", async () => {
  const repoRoot = await createWorkspace({ summaryCampaignId: priorCampaign });
  const { exitCode, manifest } = await run(repoRoot);

  assert.equal(exitCode, 1);
  assert.equal(stage(manifest, "normalized_summary").status, "failed");
  assert.match(
    String(stage(manifest, "normalized_summary").error),
    new RegExp(`belongs to campaign ${priorCampaign}`),
  );
});

test("fails when display names match but stable identifiers differ", async () => {
  const repoRoot = await createWorkspace({
    summaryCampaignId: priorCampaign,
    summaryCampaignName: campaignName,
  });
  const { exitCode, manifest } = await run(repoRoot);

  assert.equal(exitCode, 1);
  assert.equal(stage(manifest, "normalized_summary").status, "failed");
  assert.match(
    String(stage(manifest, "normalized_summary").error),
    new RegExp(`not the requested campaign ${campaign}`),
  );
});

test("fails when the summary carries no stable campaign identifier", async () => {
  const repoRoot = await createWorkspace({ summaryCampaignId: null });
  const { exitCode, manifest } = await run(repoRoot);

  assert.equal(exitCode, 1);
  assert.equal(stage(manifest, "normalized_summary").status, "failed");
  assert.match(
    String(stage(manifest, "normalized_summary").error),
    /does not record a campaignWorkspace\.campaignId/,
  );
});

test("does not write secrets into the manifest", async () => {
  const repoRoot = await createWorkspace({ withPriorCampaignSummary: true });
  const { manifestPath } = await run(repoRoot, {
    meta_monitoring: {
      exit_code: 1,
      stdout: "",
      stderr: `Meta API request failed for https://graph.facebook.com/v23.0/act_1/insights?access_token=${accessToken}`,
    },
  });

  const raw = await readFile(path.join(repoRoot, manifestPath), "utf-8");

  assert.equal(raw.includes(accessToken), false);
  assert.match(raw, /access_token=\[REDACTED\]/);
});
