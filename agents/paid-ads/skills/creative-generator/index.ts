/// <reference types="node" />

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
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

interface Brief {
  product: Product;
  audience: Audience;
  primaryHook: Hook;
  secondaryHook: Hook;
  bodyCopyOptions: string[];
  visualTreatments: VisualTreatment[];
  brand: Brand;
  outputCount: number;
}

interface Variant {
  id: string;
  hook: Hook;
  bodyCopy: string;
  visualTreatment: VisualTreatment;
  audience: string;
  status: 'planned';
  notes: string;
}

interface Manifest {
  generatedAt: string;
  product: string;
  feature: string;
  audience: string;
  brand: Brand;
  briefPath: string;
  variantCount: number;
  variants: Variant[];
}

const here = dirname(fileURLToPath(import.meta.url));
const briefPath = join(here, 'sample-brief.json');
const brief = JSON.parse(readFileSync(briefPath, 'utf-8')) as Brief;

const repoRoot = resolve(here, '..', '..', '..', '..');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runDir = join(repoRoot, 'output', `run-${timestamp}`);
mkdirSync(runDir, { recursive: true });

const hooks: Hook[] = [brief.primaryHook, brief.secondaryHook];
const variants: Variant[] = [];

let counter = 1;
for (const hook of hooks) {
  for (const treatment of brief.visualTreatments) {
    if (variants.length >= brief.outputCount) break;
    const bodyCopy = brief.bodyCopyOptions[variants.length % brief.bodyCopyOptions.length];
    if (bodyCopy === undefined) continue;
    const id = `v${String(counter).padStart(3, '0')}`;
    counter += 1;
    variants.push({
      id,
      hook,
      bodyCopy,
      visualTreatment: treatment,
      audience: brief.audience.label,
      status: 'planned',
      notes: `${hook.id} x ${treatment.id} for ${brief.audience.label}.`,
    });
  }
  if (variants.length >= brief.outputCount) break;
}

const manifest: Manifest = {
  generatedAt: new Date().toISOString(),
  product: brief.product.name,
  feature: brief.product.feature,
  audience: brief.audience.label,
  brand: brief.brand,
  briefPath: briefPath.split(repoRoot).join('').replace(/\\/g, '/'),
  variantCount: variants.length,
  variants,
};

const manifestPath = join(runDir, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

console.log(manifestPath);
