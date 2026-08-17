/// <reference types="node" />

import "dotenv/config";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  redactSecrets,
  runPaidAdsOperator,
  type CommandRequest,
  type CommandResult,
  type RunManifest,
} from "./lib/paid-ads-operator-runner.js";

type CliArgs = {
  client: string;
  campaign: string;
};

const secretEnvNames = [
  "META_ACCESS_TOKEN",
  "META_APP_SECRET",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "PERPLEXITY_API_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "HERMES_API_KEY",
  "COMPOSIO_API_KEY",
];

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(argv: string[]): CliArgs {
  let client: string | null = null;
  let campaign: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--client") {
      if (!next) fail("Missing value for --client.");
      client = next;
      index += 1;
    } else if (arg === "--campaign") {
      if (!next) fail("Missing value for --campaign.");
      campaign = next;
      index += 1;
    }
  }

  if (!client || !campaign) {
    fail("Usage: npm run operator -- --client {client-slug} --campaign {campaign-slug}");
  }

  return { client, campaign };
}

function secretValues(): string[] {
  return secretEnvNames
    .map((name) => process.env[name] ?? "")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function spawnStageCommand(repoRoot: string, request: CommandRequest): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["--import", "tsx", path.join(repoRoot, request.script), ...request.args],
      {
        cwd: repoRoot,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ exit_code: code ?? 1, stdout, stderr });
    });
  });
}

function freshnessText(manifest: RunManifest): string {
  const freshness = manifest.source_data_as_of;

  if (freshness.status === "unknown") return "unknown";

  const range = freshness.reporting_range;
  const rangeText = range ? ` (reporting range ${range.since ?? "unknown"} to ${range.until ?? "unknown"})` : "";

  return `${freshness.meta_data_as_of ?? "unknown"}${rangeText}`;
}

function printSuccess(manifest: RunManifest, manifestPath: string): void {
  console.log("Paid ads operator run succeeded.");
  console.log(`Run ID: ${manifest.run_id}`);
  console.log(`Client: ${manifest.client_id}`);
  console.log(`Campaign: ${manifest.campaign_id}`);
  console.log(`Status: ${manifest.status}`);
  console.log(`Source data as of: ${freshnessText(manifest)}`);
  console.log(`Operator report: ${manifest.outputs.operator_report_markdown ?? "not created"}`);
  console.log(`Comparative report: ${manifest.outputs.comparative_report_markdown ?? "not created"}`);
  console.log(`Run manifest: ${manifestPath}`);

  if (manifest.warnings.length === 0) {
    console.log("Warnings: none");
    return;
  }

  console.log("Warnings:");
  for (const warning of manifest.warnings) {
    console.log(`- ${warning}`);
  }
}

function printFailure(manifest: RunManifest, manifestPath: string): void {
  const failedStage = manifest.stages.find((stage) => stage.status === "failed");

  console.error("Paid ads operator run failed.");
  console.error(`Run ID: ${manifest.run_id}`);
  console.error(`Failed stage: ${failedStage?.name ?? "unknown"}`);
  console.error(`Error: ${failedStage?.error ?? manifest.errors[0] ?? "unknown error"}`);
  console.error(`Run manifest: ${manifestPath}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const secrets = secretValues();

  const result = await runPaidAdsOperator(args, {
    repoRoot,
    now: () => new Date(),
    secretValues: secrets,
    runCommand: (request) => spawnStageCommand(repoRoot, request),
  });

  if (result.manifest.status === "succeeded") {
    printSuccess(result.manifest, result.manifestPath);
  } else {
    printFailure(result.manifest, result.manifestPath);
  }

  process.exit(result.exitCode);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(redactSecrets(message, secretValues()));
  process.exit(1);
});
