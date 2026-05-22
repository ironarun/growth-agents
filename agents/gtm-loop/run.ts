/// <reference types="node" />

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface CommandResult {
  stdout: string;
  stderr: string;
}

interface LoopSummary {
  conversationScoutReviewPath: string;
  painMemoryPath: string;
  creativeResearchInputsPath: string;
  creativeManifestPath: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..');
const defaultSeedPath = 'agents/conversation-scout/seed-posts.json';
const tsxCliPath = resolve(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');

function fail(message: string): never {
  throw new Error(message);
}

function resolveFromRepo(pathValue: string): string {
  return isAbsolute(pathValue) ? pathValue : resolve(repoRoot, pathValue);
}

function runTsxScript(scriptPath: string, scriptArgs: string[]): CommandResult {
  const result = spawnSync(
    process.execPath,
    [tsxCliPath, scriptPath, ...scriptArgs],
    {
      cwd: repoRoot,
      encoding: 'utf-8',
      shell: false,
    },
  );

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';

  if (stdout.trim() !== '') {
    process.stdout.write(stdout);
  }

  if (stderr.trim() !== '') {
    process.stderr.write(stderr);
  }

  if (result.error !== undefined) {
    fail(`Failed to start script "${scriptPath}": ${result.error.message}`);
  }

  if (result.status !== 0) {
    fail(`Script "${scriptPath}" failed with exit code ${result.status ?? 'unknown'}.`);
  }

  return { stdout, stderr };
}

function findPrintedPath(output: string, suffix: string): string {
  const normalizedSuffix = suffix.replace(/\//g, '\\');
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const pathLine = lines.find((line) => (
    line.endsWith(suffix) ||
    line.endsWith(normalizedSuffix)
  ));

  if (pathLine === undefined) {
    fail(`Could not find output path ending in "${suffix}".`);
  }

  const resolvedPath = resolveFromRepo(pathLine);

  if (!existsSync(resolvedPath)) {
    fail(`Expected output file does not exist: ${resolvedPath}`);
  }

  return resolvedPath;
}

function main() {
  const seedPath = process.argv[2] ?? defaultSeedPath;
  const resolvedSeedPath = resolveFromRepo(seedPath);

  if (!existsSync(resolvedSeedPath)) {
    fail(`Seed input file does not exist: ${resolvedSeedPath}`);
  }

  console.log(`Running GTM loop with seed file: ${resolvedSeedPath}`);

  const scoutResult = runTsxScript('agents/conversation-scout/index.ts', [seedPath]);
  const conversationScoutReviewPath = findPrintedPath(
    scoutResult.stdout,
    'conversation-scout-review.md',
  );
  const painMemoryPath = findPrintedPath(scoutResult.stdout, 'pain-point-memory.json');

  const converterResult = runTsxScript(
    'agents/paid-ads/skills/creative-generator/from-pain-memory.ts',
    [painMemoryPath],
  );
  const creativeResearchInputsPath = findPrintedPath(
    converterResult.stdout,
    'creative-research-inputs.json',
  );

  const generatorResult = runTsxScript(
    'agents/paid-ads/skills/creative-generator/index.ts',
    [creativeResearchInputsPath],
  );
  const creativeManifestPath = findPrintedPath(generatorResult.stdout, 'manifest.json');

  const summary: LoopSummary = {
    conversationScoutReviewPath,
    painMemoryPath,
    creativeResearchInputsPath,
    creativeManifestPath,
  };

  console.log('');
  console.log('GTM loop complete.');
  console.log(JSON.stringify(summary, null, 2));
}

main();
