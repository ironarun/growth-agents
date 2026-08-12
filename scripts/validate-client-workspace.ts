/// <reference types="node" />

import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

type CliArgs = {
  client: string | null;
};

type ValidationResult = {
  client: string;
  passed: string[];
  warnings: string[];
  failures: string[];
};

const requiredContextFiles = [
  "brand.md",
  "product.md",
  "audience.md",
  "offer.md",
  "voice.md",
  "tracking.md",
];

const requiredCampaignDocs = [
  "campaign-brief.md",
  "ads.md",
  "landing-page.md",
  "tracking-checklist.md",
  "launch-report.md",
  "decision-log.md",
  path.join("assets", "README.md"),
  path.join("outputs", "README.md"),
];

const terminalCampaignStatuses = ["ended", "closed", "failed", "paused"];

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { client: null };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--client") {
      if (!next) {
        throw new Error("Missing value for --client.");
      }
      args.client = next;
      index += 1;
    }
  }

  return args;
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf-8")) as unknown;
}

async function validateJsonFile(filePath: string, result: ValidationResult): Promise<unknown | null> {
  try {
    const parsed = await readJson(filePath);
    result.passed.push(`JSON parses: ${filePath}`);
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.failures.push(`JSON failed to parse: ${filePath} (${message})`);
    return null;
  }
}

function requireFile(filePath: string, result: ValidationResult): boolean {
  if (existsSync(filePath)) {
    result.passed.push(`Found: ${filePath}`);
    return true;
  }

  result.failures.push(`Missing required file: ${filePath}`);
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function campaignHasTerminalStatus(config: unknown): boolean {
  if (!isRecord(config)) return false;

  const status = config.status;
  const statusText = JSON.stringify(status ?? "").toLowerCase();

  return terminalCampaignStatuses.some((terminalStatus) => statusText.includes(terminalStatus));
}

async function listDirectories(root: string): Promise<string[]> {
  if (!existsSync(root)) return [];

  const entries = await readdir(root);
  const directories: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry);
    if ((await stat(fullPath)).isDirectory()) {
      directories.push(entry);
    }
  }

  return directories;
}

async function walk(root: string): Promise<string[]> {
  if (!existsSync(root)) return [];

  const entries = await readdir(root);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(root, entry);
    const entryStat = await stat(fullPath);

    if (entryStat.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function hasGeneratedRunArtifact(filePath: string, clientRoot: string): boolean {
  const relativePath = path.relative(clientRoot, filePath).replace(/\\/g, "/");
  return relativePath.includes("output/run-") || relativePath.includes("outputs/run-");
}

async function validateClient(client: string): Promise<ValidationResult> {
  const result: ValidationResult = {
    client,
    passed: [],
    warnings: [],
    failures: [],
  };
  const clientRoot = path.join("clients", client);
  const clientConfigPath = path.join(clientRoot, "client.config.json");

  if (!existsSync(clientRoot)) {
    result.failures.push(`Missing client workspace: ${clientRoot}`);
    return result;
  }

  result.passed.push(`Found client workspace: ${clientRoot}`);

  if (requireFile(clientConfigPath, result)) {
    await validateJsonFile(clientConfigPath, result);
  }

  for (const file of requiredContextFiles) {
    requireFile(path.join(clientRoot, "context", file), result);
  }

  const jsonFiles = (await walk(clientRoot)).filter((filePath) => filePath.endsWith(".json"));

  for (const jsonFile of jsonFiles) {
    await validateJsonFile(jsonFile, result);
  }

  const generatedRunFiles = (await walk(clientRoot)).filter((filePath) => hasGeneratedRunArtifact(filePath, clientRoot));

  if (generatedRunFiles.length > 0) {
    for (const filePath of generatedRunFiles) {
      result.failures.push(`Generated output/run-* artifact found inside client workspace: ${filePath}`);
    }
  } else {
    result.passed.push("No generated output/run-* artifacts found inside client workspace.");
  }

  const campaignsRoot = path.join(clientRoot, "campaigns");
  const campaignDirs = await listDirectories(campaignsRoot);

  if (campaignDirs.length === 0) {
    result.warnings.push(`No campaign folders found under: ${campaignsRoot}`);
  }

  for (const campaignDir of campaignDirs) {
    const campaignRoot = path.join(campaignsRoot, campaignDir);
    const campaignConfigPath = path.join(campaignRoot, "campaign.config.json");
    let campaignConfig: unknown = null;

    if (requireFile(campaignConfigPath, result)) {
      campaignConfig = await validateJsonFile(campaignConfigPath, result);
    }

    for (const doc of requiredCampaignDocs) {
      requireFile(path.join(campaignRoot, doc), result);
    }

    if (campaignHasTerminalStatus(campaignConfig)) {
      requireFile(path.join(campaignRoot, "campaign-closeout.md"), result);
    } else if (!existsSync(path.join(campaignRoot, "campaign-closeout.md"))) {
      result.warnings.push(`Optional closeout missing for active campaign: ${campaignRoot}`);
    }
  }

  return result;
}

function printResult(result: ValidationResult): void {
  console.log(`Client workspace validation: ${result.client}`);
  console.log("");

  if (result.passed.length > 0) {
    console.log("Passed:");
    for (const item of result.passed) {
      console.log(`- ${item}`);
    }
    console.log("");
  }

  if (result.warnings.length > 0) {
    console.log("Warnings:");
    for (const item of result.warnings) {
      console.log(`- ${item}`);
    }
    console.log("");
  }

  if (result.failures.length > 0) {
    console.log("Failures:");
    for (const item of result.failures) {
      console.log(`- ${item}`);
    }
  } else {
    console.log("Validation passed.");
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.client) {
    throw new Error("Usage: npm.cmd run validate:client -- --client {client-slug}");
  }

  const result = await validateClient(args.client);
  printResult(result);

  if (result.failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
