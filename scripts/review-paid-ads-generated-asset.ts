import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

type ReviewManifest = {
  asset_id: string;
  reviewed_at: string;
  concept_id: string;
  style_id: string;
  asset_path: string;
  source_generated_candidate_path: null;
  source_brief_path: string;
  finalization_manifest_path: null;
  visual_review_status: string;
  text_accuracy_status: string;
  logo_status: string;
  selected_for_iteration: true;
  approved_for_upload: false;
  uploaded_to_meta: false;
  meta_ad_id: null;
  human_review_required: true;
  human_notes: string;
};

const DEFAULT_HUMAN_NOTES =
  'Selected Concept 02 candidate 03 for continued first-flight preparation. Visual direction approved. Text appears acceptable. Logo was corrected through image editing. Not yet approved for Meta upload.';
const SOURCE_BRIEF_PATH = 'output/run-2026-06-25T19-42-10-826Z/paid-ads-image-render-briefs.md';

const REVIEW_STATUSES = new Set(['approved', 'pending', 'needs_revision', 'rejected']);
const LOGO_STATUSES = new Set([
  'official_logo_overlaid',
  'corrected_in_image_edit',
  'pending',
  'needs_revision',
  'rejected',
]);

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

function validateStatus(label: string, value: string, allowed: Set<string>): string {
  if (!allowed.has(value)) {
    fail(`${label} must be one of: ${Array.from(allowed).join(', ')}.`);
  }

  return value;
}

function formatMarkdown(manifest: ReviewManifest): string {
  return `# Paid Ads Generated Asset Review

Reviewed at: ${manifest.reviewed_at}
Asset ID: ${manifest.asset_id}
Concept ID: ${manifest.concept_id}
Style ID: ${manifest.style_id}

## Asset

- Asset path: ${manifest.asset_path}
- Source generated candidate path: ${manifest.source_generated_candidate_path ?? 'null'}
- Source brief path: ${manifest.source_brief_path ?? 'null'}
- Finalization manifest path: ${manifest.finalization_manifest_path ?? 'null'}

## Review Status

- Visual review status: ${manifest.visual_review_status}
- Text accuracy status: ${manifest.text_accuracy_status}
- Logo status: ${manifest.logo_status}
- Selected for iteration: ${manifest.selected_for_iteration}

## Human Notes

${manifest.human_notes}

## Lifecycle

- Approved for upload: ${manifest.approved_for_upload}
- Uploaded to Meta: ${manifest.uploaded_to_meta}
- Meta ad ID: ${manifest.meta_ad_id ?? 'null'}
- Human review required: ${manifest.human_review_required}

## Human Approval

- [ ] Arun approved this asset for manual Meta upload
- [ ] Campaign URL and UTM values verified
- [ ] Meta Pixel and AddToChromeClick verified before spend
- [ ] Budget cap reviewed before publishing
`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const assetPath = resolvePath(requiredArg(args, '--asset'));
  const conceptId = requiredArg(args, '--concept');
  const styleId = requiredArg(args, '--style');
  const visualStatus = validateStatus('--visual-status', requiredArg(args, '--visual-status'), REVIEW_STATUSES);
  const textStatus = validateStatus('--text-status', requiredArg(args, '--text-status'), REVIEW_STATUSES);
  const logoStatus = validateStatus('--logo-status', requiredArg(args, '--logo-status'), LOGO_STATUSES);
  const humanNotes = args.get('--human-notes') ?? DEFAULT_HUMAN_NOTES;
  const sourceBriefPath = resolvePath(SOURCE_BRIEF_PATH);

  if (!existsSync(assetPath)) {
    fail(`Selected asset does not exist: ${assetPath}`);
  }

  const reviewedAt = new Date().toISOString();
  const outputDir = join(process.cwd(), 'output', `run-${reviewedAt.replace(/[:.]/g, '-')}`);
  mkdirSync(outputDir, { recursive: true });

  const reviewJsonPath = join(outputDir, 'paid-ads-generated-asset-review.json');
  const reviewMdPath = join(outputDir, 'paid-ads-generated-asset-review.md');

  const manifest: ReviewManifest = {
    asset_id: `paid-ads-generated-asset-review-${conceptId}-${styleId}`,
    reviewed_at: reviewedAt,
    concept_id: conceptId,
    style_id: styleId,
    asset_path: assetPath,
    source_generated_candidate_path: null,
    source_brief_path: sourceBriefPath,
    finalization_manifest_path: null,
    visual_review_status: visualStatus,
    text_accuracy_status: textStatus,
    logo_status: logoStatus,
    selected_for_iteration: true,
    approved_for_upload: false,
    uploaded_to_meta: false,
    meta_ad_id: null,
    human_review_required: true,
    human_notes: humanNotes,
  };

  writeFileSync(reviewJsonPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeFileSync(reviewMdPath, formatMarkdown(manifest), 'utf8');

  console.log('paid_ads_generated_asset_review_json_path:', reviewJsonPath);
  console.log('paid_ads_generated_asset_review_md_path:', reviewMdPath);
  console.log('asset_path:', manifest.asset_path);
  console.log('visual_review_status:', manifest.visual_review_status);
  console.log('text_accuracy_status:', manifest.text_accuracy_status);
  console.log('logo_status:', manifest.logo_status);
  console.log('approved_for_upload:', manifest.approved_for_upload);
  console.log('uploaded_to_meta:', manifest.uploaded_to_meta);
  console.log('meta_ad_id:', manifest.meta_ad_id ?? 'null');
  console.log('human_review_required:', manifest.human_review_required);
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
