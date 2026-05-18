import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Brief = {
  product: {
    name: string;
    description: string;
    wedge: string;
    featureFocus: string;
  };
  audience: string;
  primaryHook: string;
  secondaryHook: string;
  bodyCopyOptions: string[];
  visualTreatments: string[];
  brand: {
    name: string;
    primaryColor: string;
    surfaceColor: string;
    voice: string;
    brandLine: string;
    avoidWords: string[];
  };
  outputCount: number;
};

type VariantRecord = {
  id: string;
  hook: string;
  bodyCopy: string;
  visualTreatment: string;
  audience: string;
  status: 'planned';
  notes: string;
};

type Manifest = {
  runId: string;
  createdAt: string;
  sourceBrief: string;
  product: Brief['product'];
  brand: Brief['brand'];
  outputCount: number;
  variants: VariantRecord[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');
const sampleBriefPath = path.join(__dirname, 'sample-brief.json');

function createRunId(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function generateVariants(brief: Brief): VariantRecord[] {
  const hooks = [brief.primaryHook, brief.secondaryHook];

  return Array.from({ length: brief.outputCount }, (_, index) => {
    const hook = hooks[index % hooks.length] ?? brief.primaryHook;
    const bodyCopy = brief.bodyCopyOptions[index % brief.bodyCopyOptions.length] ?? '';
    const visualTreatment = brief.visualTreatments[index % brief.visualTreatments.length] ?? 'unspecified';
    const variantNumber = String(index + 1).padStart(2, '0');

    return {
      id: `verbatim-consultant-${variantNumber}`,
      hook,
      bodyCopy,
      visualTreatment,
      audience: brief.audience,
      status: 'planned',
      notes: `Plan ${visualTreatment} static ad for the ${brief.product.featureFocus} wedge.`,
    };
  });
}

async function readBrief(): Promise<Brief> {
  const rawBrief = await readFile(sampleBriefPath, 'utf8');
  return JSON.parse(rawBrief) as Brief;
}

async function main() {
  const brief = await readBrief();
  const createdAt = new Date();
  const runId = createRunId(createdAt);
  const outputDir = path.join(repoRoot, 'output', `run-${runId}`);
  const manifestPath = path.join(outputDir, 'manifest.json');

  const manifest: Manifest = {
    runId,
    createdAt: createdAt.toISOString(),
    sourceBrief: path.relative(repoRoot, sampleBriefPath),
    product: brief.product,
    brand: brief.brand,
    outputCount: brief.outputCount,
    variants: generateVariants(brief),
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log(`Wrote manifest: ${manifestPath}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
