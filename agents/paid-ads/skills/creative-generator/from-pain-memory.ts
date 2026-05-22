/// <reference types="node" />

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Confidence = 'low' | 'medium' | 'high';

interface PainMemoryRecord {
  id: string;
  sourcePostId: string;
  platform: string;
  topic: string;
  selectedProfile: string;
  audience: string;
  painPoint: string;
  audienceLanguage: string;
  objection: string;
  emotionalTrigger: string;
  creativeAngle: string;
  suggestedTemplateUse: string;
  confidence: Confidence;
  notes: string;
}

interface CreativeResearchInputs {
  audiencePainPoints: string[];
  competitorPatterns: string[];
  resonantCopyPatterns: string[];
  resonantVisualPatterns: string[];
  objectionsToAddress: string[];
  sourceNotes: string[];
}

interface ConvertedResearchInputs {
  generatedAt: string;
  sourcePainMemoryPath: string;
  includedRecordIds: string[];
  excludedRecordIds: string[];
  researchInputs: CreativeResearchInputs;
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..', '..');

function fail(message: string): never {
  throw new Error(message);
}

function resolveInputPath(rawPath: string): string {
  return isAbsolute(rawPath) ? rawPath : resolve(repoRoot, rawPath);
}

function readPainMemory(filePath: string): PainMemoryRecord[] {
  let rawJson: string;

  try {
    rawJson = readFileSync(filePath, 'utf-8');
  } catch (error) {
    fail(`Could not read pain memory file: ${filePath}. ${String(error)}`);
  }

  try {
    const parsed = JSON.parse(rawJson) as unknown;

    if (!Array.isArray(parsed)) {
      fail('Pain memory JSON must be an array of records.');
    }

    return parsed as PainMemoryRecord[];
  } catch (error) {
    fail(`Invalid JSON in pain memory file: ${filePath}. ${String(error)}`);
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function noteFor(record: PainMemoryRecord): string {
  return [
    `${record.id}: platform=${record.platform}`,
    `topic=${record.topic}`,
    `profile=${record.selectedProfile}`,
    `audience=${record.audience}`,
    `emotionalTrigger=${record.emotionalTrigger}`,
    `creativeAngle=${record.creativeAngle}`,
    `suggestedTemplateUse=${record.suggestedTemplateUse}`,
    `notes=${record.notes}`,
  ].join(' | ');
}

function convertPainMemory(records: PainMemoryRecord[], sourcePath: string): ConvertedResearchInputs {
  const included = records.filter((record) => record.confidence !== 'low');
  const excluded = records.filter((record) => record.confidence === 'low');

  if (included.length === 0) {
    fail('No pain memory records remain after filtering out low-confidence records.');
  }

  return {
    generatedAt: new Date().toISOString(),
    sourcePainMemoryPath: sourcePath,
    includedRecordIds: included.map((record) => record.id),
    excludedRecordIds: excluded.map((record) => record.id),
    researchInputs: {
      audiencePainPoints: unique(included.map((record) => record.painPoint)),
      competitorPatterns: [],
      resonantCopyPatterns: unique(included.map((record) => record.audienceLanguage)),
      resonantVisualPatterns: [],
      objectionsToAddress: unique(included.map((record) => record.objection)),
      sourceNotes: unique(included.flatMap((record) => [
        `${record.id}: ${record.emotionalTrigger} ${record.creativeAngle}`,
        `${record.id}: ${record.suggestedTemplateUse}`,
        noteFor(record),
      ])),
    },
  };
}

function main() {
  const rawInputPath = process.argv[2];

  if (rawInputPath === undefined || rawInputPath.trim() === '') {
    fail('Missing required CLI argument: path to pain-point-memory.json.');
  }

  const inputPath = resolveInputPath(rawInputPath);

  if (!existsSync(inputPath)) {
    fail(`Pain memory file does not exist: ${inputPath}`);
  }

  const records = readPainMemory(inputPath);
  const converted = convertPainMemory(records, inputPath);
  const timestamp = converted.generatedAt.replace(/[:.]/g, '-');
  const runDir = join(repoRoot, 'output', `run-${timestamp}`);
  const outputPath = join(runDir, 'creative-research-inputs.json');

  mkdirSync(runDir, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(converted, null, 2)}\n`, 'utf-8');

  console.log(outputPath);
  console.log(`included=${converted.includedRecordIds.length}`);
  console.log(`excluded=${converted.excludedRecordIds.length}`);
}

main();
