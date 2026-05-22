/// <reference types="node" />

import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Hook {
  id: string;
  text: string;
}

interface VisualTreatment {
  id: string;
  name: string;
  description: string;
}

interface Audience {
  label: string;
  jobTitles: string[];
  employers: string[];
  interests: string[];
  behaviors: string[];
}

interface Brand {
  primaryColor: string;
  lightPinkSurface: string;
  wordmark: string;
  voice: string;
  site: string;
}

interface Product {
  name: string;
  tagline: string;
  description: string;
  url: string;
  feature: string;
}

interface ResearchInputs {
  audiencePainPoints: string[];
  competitorPatterns: string[];
  resonantCopyPatterns: string[];
  resonantVisualPatterns: string[];
  objectionsToAddress: string[];
  sourceNotes: string[];
}

interface ReferenceExample {
  referenceId: string;
  name: string;
  source: string;
  whyItWorks: string;
  copyPattern: string;
  visualPattern: string;
  caution: string;
}

interface TemplateCandidate {
  templateId: string;
  templateName: string;
  sourceReferences: string[];
  layoutPattern: string;
  copyPattern: string;
  visualRules: string[];
  whyThisTemplate: string;
  approvalStatus: 'approved' | 'needs-review' | 'rejected';
}

interface Brief {
  product: Product;
  audience: Audience;
  primaryHook: Hook;
  secondaryHook: Hook;
  bodyCopyOptions: string[];
  visualTreatments: VisualTreatment[];
  brand: Brand;
  researchInputs: ResearchInputs;
  referenceExamples: ReferenceExample[];
  templateCandidates: TemplateCandidate[];
  outputCount: number;
}

interface Variant {
  id: string;
  templateId: string;
  hook: Hook;
  bodyCopy: string;
  visualTreatment: VisualTreatment;
  audience: string;
  status: 'planned';
  notes: string;
}

interface Manifest {
  runId: string;
  generatedAt: string;
  briefPath: string;
  sourceResearchInputPath: string | null;
  product: Product;
  audience: string;
  researchInputs: ResearchInputs;
  referenceExamples: ReferenceExample[];
  templateCandidates: TemplateCandidate[];
  approvedTemplates: TemplateCandidate[];
  variantCount: number;
  variants: Variant[];
}

const here = dirname(fileURLToPath(import.meta.url));
const briefPath = join(here, 'sample-brief.json');
const repoRoot = resolve(here, '..', '..', '..', '..');

const researchInputFields: Array<keyof ResearchInputs> = [
  'audiencePainPoints',
  'competitorPatterns',
  'resonantCopyPatterns',
  'resonantVisualPatterns',
  'objectionsToAddress',
  'sourceNotes',
];

function fail(message: string): never {
  throw new Error(message);
}

function readJsonFile(filePath: string): unknown {
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8')) as unknown;
  } catch (error) {
    fail(`Invalid JSON or unreadable file: ${filePath}. ${String(error)}`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateResearchInputs(value: unknown): ResearchInputs {
  if (!isRecord(value)) {
    fail('External research input JSON must include a researchInputs object.');
  }

  const researchInputs = value.researchInputs;
  if (!isRecord(researchInputs)) {
    fail('External research input JSON is missing researchInputs.');
  }

  for (const field of researchInputFields) {
    if (!Array.isArray(researchInputs[field])) {
      fail(`External researchInputs.${field} must be an array.`);
    }
  }

  return {
    audiencePainPoints: (researchInputs.audiencePainPoints as unknown[]).map((item) => String(item)),
    competitorPatterns: (researchInputs.competitorPatterns as unknown[]).map((item) => String(item)),
    resonantCopyPatterns: (researchInputs.resonantCopyPatterns as unknown[]).map((item) => String(item)),
    resonantVisualPatterns: (researchInputs.resonantVisualPatterns as unknown[]).map((item) => String(item)),
    objectionsToAddress: (researchInputs.objectionsToAddress as unknown[]).map((item) => String(item)),
    sourceNotes: (researchInputs.sourceNotes as unknown[]).map((item) => String(item)),
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function mergeResearchInputs(base: ResearchInputs, external: ResearchInputs): ResearchInputs {
  return {
    audiencePainPoints: dedupe([...base.audiencePainPoints, ...external.audiencePainPoints]),
    competitorPatterns: dedupe([...base.competitorPatterns, ...external.competitorPatterns]),
    resonantCopyPatterns: dedupe([...base.resonantCopyPatterns, ...external.resonantCopyPatterns]),
    resonantVisualPatterns: dedupe([...base.resonantVisualPatterns, ...external.resonantVisualPatterns]),
    objectionsToAddress: dedupe([...base.objectionsToAddress, ...external.objectionsToAddress]),
    sourceNotes: dedupe([...base.sourceNotes, ...external.sourceNotes]),
  };
}

function resolveOptionalResearchInputPath(rawPath: string | undefined): string | null {
  if (rawPath === undefined || rawPath.trim() === '') {
    return null;
  }

  const resolvedPath = isAbsolute(rawPath) ? rawPath : resolve(repoRoot, rawPath);

  if (!existsSync(resolvedPath)) {
    fail(`External research input file does not exist: ${resolvedPath}`);
  }

  return resolvedPath;
}

const brief = readJsonFile(briefPath) as Brief;
const sourceResearchInputPath = resolveOptionalResearchInputPath(process.argv[2]);

if (sourceResearchInputPath !== null) {
  const externalResearchInputs = validateResearchInputs(readJsonFile(sourceResearchInputPath));
  brief.researchInputs = mergeResearchInputs(brief.researchInputs, externalResearchInputs);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = join(repoRoot, 'output', `run-${timestamp}`);
mkdirSync(runDir, { recursive: true });

const hooks: Hook[] = [brief.primaryHook, brief.secondaryHook];
const approvedTemplates = brief.templateCandidates.filter(
  (template) => template.approvalStatus === 'approved',
);
const variants: Variant[] = [];

for (let index = 0; index < brief.outputCount; index += 1) {
  const template = approvedTemplates[index % approvedTemplates.length];
  const hook = hooks[index % hooks.length];
  const bodyCopy = brief.bodyCopyOptions[index % brief.bodyCopyOptions.length];
  const treatment = brief.visualTreatments[index % brief.visualTreatments.length];

  if (
    template === undefined ||
    hook === undefined ||
    bodyCopy === undefined ||
    treatment === undefined
  ) {
    break;
  }

  const variantNumber = String(index + 1).padStart(3, '0');
  variants.push({
    id: `${template.templateId}-v${variantNumber}`,
    templateId: template.templateId,
    hook,
    bodyCopy,
    visualTreatment: treatment,
    audience: brief.audience.label,
    status: 'planned',
    notes: `${template.templateName}: ${hook.id} x ${treatment.id} for ${brief.audience.label}.`,
  });
}

const manifest: Manifest = {
  runId: `run-${timestamp}`,
  generatedAt: new Date().toISOString(),
  briefPath: briefPath.split(repoRoot).join('').replace(/\\/g, '/'),
  sourceResearchInputPath,
  product: brief.product,
  audience: brief.audience.label,
  researchInputs: brief.researchInputs,
  referenceExamples: brief.referenceExamples,
  templateCandidates: brief.templateCandidates,
  approvedTemplates,
  variantCount: variants.length,
  variants,
};

const manifestPath = join(runDir, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

console.log(manifestPath);
