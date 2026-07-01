import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import sharp from 'sharp';

type OverlayManifest = {
  generated_at: string;
  concept_id: string;
  style_id: string;
  input_path: string;
  output_path: string;
  output_filename: string;
  logo_asset_path: string;
  actual_dimensions: {
    width: number;
    height: number;
  };
  logo_width: number;
  logo_x: number;
  logo_y: number;
  logo_status: 'official_logo_overlaid';
  patch_applied: false;
  background_added: false;
  approved_for_upload: false;
  uploaded_to_meta: false;
  meta_ad_id: null;
  human_review_required: true;
};

const DEFAULT_LOGO_PATH = 'brand/verbatim/logo-pink.png';
const BASE_CANVAS = 1080;
const DEFAULT_LOGO_X = 41;
const DEFAULT_LOGO_WIDTH = 276;
const DEFAULT_LOGO_TOP = 997;
const DEFAULT_BOTTOM_MARGIN = 28;

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs(args: string[]): Map<string, string> {
  const parsed = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (!arg?.startsWith('--')) continue;

    const value = args[index + 1];

    if (!value || value.startsWith('--')) {
      fail(`Missing value for ${arg}.`);
    }

    parsed.set(arg, value);
    index += 1;
  }

  return parsed;
}

function resolvePath(rawPath: string): string {
  return isAbsolute(rawPath) ? rawPath : resolve(process.cwd(), rawPath);
}

function requiredArg(args: Map<string, string>, key: string): string {
  const value = args.get(key);

  if (!value) {
    fail(`Missing required argument ${key}.`);
  }

  return value;
}

function optionalPositiveIntegerArg(args: Map<string, string>, key: string): number | null {
  const value = args.get(key);

  if (!value) return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    fail(`${key} must be a non-negative number.`);
  }

  return Math.round(parsed);
}

function scale(value: number, scaleFactor: number): number {
  return Math.round(value * scaleFactor);
}

function formatMarkdown(manifest: OverlayManifest): string {
  return `# Paid Ads Logo Overlay

Generated at: ${manifest.generated_at}
Concept ID: ${manifest.concept_id}
Style ID: ${manifest.style_id}

## Input

- Input path: ${manifest.input_path}
- Logo asset path: ${manifest.logo_asset_path}

## Output

- Output path: ${manifest.output_path}
- Output filename: ${manifest.output_filename}
- Actual dimensions: ${manifest.actual_dimensions.width}x${manifest.actual_dimensions.height}

## Logo Placement

- Logo width: ${manifest.logo_width}
- Logo x: ${manifest.logo_x}
- Logo y: ${manifest.logo_y}
- Logo status: ${manifest.logo_status}

## Safety

- Patch applied: ${manifest.patch_applied}
- Background added: ${manifest.background_added}

## Lifecycle

- Approved for upload: ${manifest.approved_for_upload}
- Uploaded to Meta: ${manifest.uploaded_to_meta}
- Meta ad ID: ${manifest.meta_ad_id ?? 'null'}
- Human review required: ${manifest.human_review_required}

## Human QA

- [ ] Logo appears without a box or background artifact.
- [ ] No source copy changed.
- [ ] No CTA changed.
- [ ] No non-logo design elements were altered.
- [ ] Asset remains gated before upload.
`;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const inputPath = resolvePath(requiredArg(args, '--input'));
  const conceptId = requiredArg(args, '--concept');
  const styleId = requiredArg(args, '--style');
  const logoAssetPath = resolvePath(args.get('--logo') ?? DEFAULT_LOGO_PATH);
  const outputName = args.get('--output-name');

  if (!existsSync(inputPath)) {
    fail(`Input PNG does not exist: ${inputPath}`);
  }

  if (!existsSync(logoAssetPath)) {
    fail(`Logo PNG does not exist: ${logoAssetPath}`);
  }

  const inputMetadata = await sharp(inputPath).metadata();

  if (!inputMetadata.width || !inputMetadata.height) {
    fail(`Could not read input image dimensions: ${inputPath}`);
  }

  if (inputMetadata.width !== inputMetadata.height) {
    fail(`Input image must be square. Received ${inputMetadata.width}x${inputMetadata.height}.`);
  }

  const scaleFactor = inputMetadata.width / BASE_CANVAS;
  const logoWidth = optionalPositiveIntegerArg(args, '--logo-width') ?? scale(DEFAULT_LOGO_WIDTH, scaleFactor);
  const logoX = optionalPositiveIntegerArg(args, '--logo-x') ?? scale(DEFAULT_LOGO_X, scaleFactor);
  const resizedLogo = sharp(logoAssetPath).resize({ width: logoWidth, withoutEnlargement: true }).png();
  const logoBuffer = await resizedLogo.toBuffer();
  const logoMetadata = await sharp(logoBuffer).metadata();

  if (!logoMetadata.width || !logoMetadata.height) {
    fail(`Could not read resized logo dimensions: ${logoAssetPath}`);
  }

  const defaultLogoTop = scale(DEFAULT_LOGO_TOP, scaleFactor);
  const maxLogoTop = inputMetadata.height - logoMetadata.height - scale(DEFAULT_BOTTOM_MARGIN, scaleFactor);
  const logoY = optionalPositiveIntegerArg(args, '--logo-y') ?? Math.min(defaultLogoTop, maxLogoTop);

  if (logoX + logoMetadata.width > inputMetadata.width || logoY + logoMetadata.height > inputMetadata.height) {
    fail(
      `Logo placement is outside image bounds. Image ${inputMetadata.width}x${inputMetadata.height}, logo ${logoMetadata.width}x${logoMetadata.height} at ${logoX},${logoY}.`,
    );
  }

  const generatedAt = new Date().toISOString();
  const outputDir = join(process.cwd(), 'output', `run-${generatedAt.replace(/[:.]/g, '-')}`);
  mkdirSync(outputDir, { recursive: true });

  const outputFilename = outputName ?? `${basename(inputPath, '.png')}_official-logo_1x1_v01.png`;
  const outputPath = join(outputDir, outputFilename);
  const manifestJsonPath = join(outputDir, 'paid-ads-logo-overlay.json');
  const manifestMdPath = join(outputDir, 'paid-ads-logo-overlay.md');

  await sharp(inputPath)
    .rotate()
    .composite([
      {
        input: logoBuffer,
        left: logoX,
        top: logoY,
      },
    ])
    .png()
    .toFile(outputPath);

  const outputMetadata = await sharp(outputPath).metadata();

  if (outputMetadata.width !== inputMetadata.width || outputMetadata.height !== inputMetadata.height) {
    fail(`Output dimensions changed unexpectedly: ${outputMetadata.width}x${outputMetadata.height}.`);
  }

  const manifest: OverlayManifest = {
    generated_at: generatedAt,
    concept_id: conceptId,
    style_id: styleId,
    input_path: inputPath,
    output_path: outputPath,
    output_filename: outputFilename,
    logo_asset_path: logoAssetPath,
    actual_dimensions: {
      width: outputMetadata.width,
      height: outputMetadata.height,
    },
    logo_width: logoWidth,
    logo_x: logoX,
    logo_y: logoY,
    logo_status: 'official_logo_overlaid',
    patch_applied: false,
    background_added: false,
    approved_for_upload: false,
    uploaded_to_meta: false,
    meta_ad_id: null,
    human_review_required: true,
  };

  writeFileSync(manifestJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeFileSync(manifestMdPath, formatMarkdown(manifest), 'utf8');

  console.log('paid_ads_logo_overlay_png_path:', outputPath);
  console.log('paid_ads_logo_overlay_json_path:', manifestJsonPath);
  console.log('paid_ads_logo_overlay_md_path:', manifestMdPath);
  console.log('concept_id:', manifest.concept_id);
  console.log('style_id:', manifest.style_id);
  console.log('actual_dimensions:', `${manifest.actual_dimensions.width}x${manifest.actual_dimensions.height}`);
  console.log('logo_status:', manifest.logo_status);
  console.log('patch_applied:', manifest.patch_applied);
  console.log('background_added:', manifest.background_added);
  console.log('approved_for_upload:', manifest.approved_for_upload);
  console.log('uploaded_to_meta:', manifest.uploaded_to_meta);
  console.log('meta_ad_id:', manifest.meta_ad_id ?? 'null');
  console.log('human_review_required:', manifest.human_review_required);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
