import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import sharp from 'sharp';

type TemplateSpecsFile = {
  generated_at: string;
  source_analysis_path: string;
  templates: Array<{
    template_id: string;
    template_name: string;
    approved_for_rendering: boolean;
    source_pattern_basis: string[];
    implementation_notes_for_renderer: string[];
  }>;
};

type RenderResult = {
  rendered_at: string;
  source_template_specs_path: string;
  template_id: string;
  template_name: string;
  concept_id: string;
  concept_name: string;
  output_image_path: string;
  output_filename: string;
  dimensions: {
    width: number;
    height: number;
  };
  logo_asset_path: string;
  logo_asset_used: boolean;
  renderer: string;
  lifecycle: {
    approved_for_upload: false;
    uploaded_to_meta: false;
    meta_ad_id: null;
    human_review_required: true;
  };
  qa_checklist: string[];
  notes: string[];
};

const DEFAULT_TEMPLATE_SPECS_PATH = 'output/run-2026-06-24T05-42-54-161Z/paid-ads-template-specs.json';
const LOGO_PATH = 'brand/verbatim/logo-pink.png';
const CANVAS = 1080;
const TEMPLATE_ID = 'large-hook-plus-proof-block';
const CONCEPT_ID = 'concept-01-confident-draft';
const OUTPUT_FILENAME = 'verbatim_meta_01_large-hook-proof_confident-draft_1x1_v01.png';

const CREATIVE = {
  conceptName: 'Confident Draft',
  hook: 'The draft sounds finished. Has anyone challenged it?',
  proofLines: [
    'weak claims',
    'missing counterpoints',
    'overconfident reasoning',
  ],
  proofIntro: 'Before client use, Verbatim checks:',
  positioningLine: 'Adversarial review for AI',
  ctaText: 'Try Verbatim',
};

const COLORS = {
  background: '#fafafa',
  surface: '#ffffff',
  ink: '#0a0a0a',
  muted: '#555555',
  border: '#e8e8e8',
  pink: '#f12258',
  pinkSurface: '#fff0f2',
};

const FORBIDDEN_COPY_PATTERNS = [
  /—/,
  /truth layer/i,
  /proves correctness/i,
  /guarantees accuracy/i,
  /catches every hallucination/i,
  /you don't know what you're missing/i,
];

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  } catch (error) {
    fail(`Invalid JSON or unreadable file: ${filePath}. ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateTemplateSpecs(value: unknown): TemplateSpecsFile {
  if (!isRecord(value)) {
    fail('Template specs file must be a JSON object.');
  }

  if (typeof value.generated_at !== 'string') {
    fail('Template specs file is missing generated_at.');
  }

  if (typeof value.source_analysis_path !== 'string') {
    fail('Template specs file is missing source_analysis_path.');
  }

  if (!Array.isArray(value.templates)) {
    fail('Template specs file is missing templates array.');
  }

  return {
    generated_at: value.generated_at,
    source_analysis_path: value.source_analysis_path,
    templates: value.templates.map((template, index) => {
      if (!isRecord(template)) {
        fail(`templates[${index}] must be an object.`);
      }

      if (typeof template.template_id !== 'string' || typeof template.template_name !== 'string') {
        fail(`templates[${index}] must include template_id and template_name.`);
      }

      return {
        template_id: template.template_id,
        template_name: template.template_name,
        approved_for_rendering: template.approved_for_rendering === true,
        source_pattern_basis: Array.isArray(template.source_pattern_basis)
          ? template.source_pattern_basis.map((item) => String(item))
          : [],
        implementation_notes_for_renderer: Array.isArray(template.implementation_notes_for_renderer)
          ? template.implementation_notes_for_renderer.map((item) => String(item))
          : [],
      };
    }),
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current === '' ? word : `${current} ${word}`;

    if (next.length > maxChars && current !== '') {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current !== '') {
    lines.push(current);
  }

  return lines;
}

function svgTextLines(lines: string[], x: number, y: number, fontSize: number, lineHeight: number, weight = 600): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${COLORS.ink}">${escapeXml(line)}</text>`,
    )
    .join('\n');
}

function assertCopyIsSafe(): void {
  const customerFacingText = [
    CREATIVE.hook,
    ...CREATIVE.proofLines,
    CREATIVE.positioningLine,
    CREATIVE.ctaText,
  ].join(' ');

  for (const pattern of FORBIDDEN_COPY_PATTERNS) {
    if (pattern.test(customerFacingText)) {
      fail(`Customer-facing copy contains forbidden language: ${pattern.toString()}`);
    }
  }
}

function readLogoDataUri(logoPath: string): string {
  if (!existsSync(logoPath)) {
    fail(`Logo asset does not exist: ${logoPath}`);
  }

  const logo = readFileSync(logoPath);

  if (logo.length === 0) {
    fail(`Logo asset is empty: ${logoPath}`);
  }

  return `data:image/png;base64,${logo.toString('base64')}`;
}

function buildSvg(logoDataUri: string): string {
  const hookLines = wrapText(CREATIVE.hook, 20);
  const proofStartY = 668;

  const proofRows = CREATIVE.proofLines
    .map((line, index) => {
      const y = proofStartY + index * 70;
      return `
        <line x1="610" y1="${y}" x2="904" y2="${y}" stroke="${index === 0 ? COLORS.pink : COLORS.border}" stroke-width="${index === 0 ? 3 : 2}" />
        <text x="610" y="${y + 38}" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="650" fill="${COLORS.ink}">${escapeXml(line)}</text>
      `;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
    <rect width="${CANVAS}" height="${CANVAS}" fill="${COLORS.background}" />
    <rect x="0" y="0" width="1080" height="1080" fill="${COLORS.background}" />
    <rect x="64" y="70" width="112" height="7" rx="3.5" fill="${COLORS.pink}" />
    <text x="64" y="123" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="750" letter-spacing="3.5" fill="${COLORS.muted}">CONFIDENT AI WORK</text>

    ${svgTextLines(hookLines, 64, 218, 70, 82, 750)}

    <g transform="rotate(-2 300 628)">
      <rect x="62" y="498" width="534" height="294" rx="20" fill="${COLORS.surface}" stroke="${COLORS.border}" stroke-width="1.5" />
      <rect x="98" y="548" width="252" height="20" rx="10" fill="#d9d9d9" opacity="0.92" />
      <rect x="98" y="598" width="418" height="13" rx="6.5" fill="#eeeeee" />
      <rect x="98" y="636" width="364" height="13" rx="6.5" fill="#eeeeee" />
      <rect x="98" y="674" width="392" height="13" rx="6.5" fill="#eeeeee" />
      <rect x="98" y="724" width="280" height="13" rx="6.5" fill="#eeeeee" />
    </g>

    <path d="M573 492 C619 535 657 602 658 684 C660 775 614 837 557 878" fill="none" stroke="${COLORS.pink}" stroke-width="5" stroke-linecap="round" />
    <circle cx="579" cy="492" r="9" fill="${COLORS.pink}" />
    <circle cx="557" cy="878" r="9" fill="${COLORS.pink}" />

    <rect x="568" y="498" width="448" height="382" rx="30" fill="${COLORS.surface}" stroke="${COLORS.ink}" stroke-width="2.4" />
    <rect x="568" y="498" width="448" height="78" rx="30" fill="${COLORS.ink}" />
    <rect x="568" y="544" width="448" height="48" fill="${COLORS.ink}" />
    <text x="610" y="549" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="750" letter-spacing="2.8" fill="${COLORS.surface}">REVIEW BEFORE ACTION</text>
    <text x="610" y="621" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="650" fill="${COLORS.muted}">Before client use,</text>
    <text x="610" y="649" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="650" fill="${COLORS.muted}">Verbatim checks:</text>
    ${proofRows}

    <rect x="64" y="892" width="952" height="1.5" fill="${COLORS.border}" />
    <image href="${logoDataUri}" x="64" y="944" width="132" height="31" preserveAspectRatio="xMinYMid meet" />
    <text x="236" y="967" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="500" fill="${COLORS.muted}">${escapeXml(CREATIVE.positioningLine)}</text>
    <rect x="790" y="922" width="226" height="70" rx="35" fill="${COLORS.ink}" />
    <text x="903" y="965" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="750" fill="${COLORS.surface}">${escapeXml(CREATIVE.ctaText)}</text>
  </svg>`;
}

function formatChecklist(items: string[]): string {
  return items.map((item) => `- [ ] ${item}`).join('\n');
}

function formatMarkdown(result: RenderResult): string {
  return `# Paid Ads Template Render Result

Rendered at: ${result.rendered_at}
Template ID: ${result.template_id}
Template name: ${result.template_name}
Concept ID: ${result.concept_id}
Concept name: ${result.concept_name}

## Output

- Image path: ${result.output_image_path}
- Filename: ${result.output_filename}
- Dimensions: ${result.dimensions.width}x${result.dimensions.height}
- Renderer: ${result.renderer}

## Brand Assets

- Logo asset path: ${result.logo_asset_path}
- Logo asset used: ${result.logo_asset_used ? 'yes' : 'no'}

## Creative Content

- Hook: ${CREATIVE.hook}
- Proof line 1: ${CREATIVE.proofLines[0]}
- Proof line 2: ${CREATIVE.proofLines[1]}
- Proof line 3: ${CREATIVE.proofLines[2]}
- Positioning line: ${CREATIVE.positioningLine}
- CTA text: ${CREATIVE.ctaText}

## Lifecycle

- Approved for upload: ${result.lifecycle.approved_for_upload}
- Uploaded to Meta: ${result.lifecycle.uploaded_to_meta}
- Meta ad ID: ${result.lifecycle.meta_ad_id ?? 'null'}
- Human review required: ${result.lifecycle.human_review_required}

## QA Checklist

${formatChecklist(result.qa_checklist)}

## Notes

${result.notes.map((note) => `- ${note}`).join('\n')}

## Human Approval

- [ ] Arun reviewed rendered PNG
- [ ] Arun approved brand treatment
- [ ] Arun approved copy treatment
- [ ] Approved for manual Meta upload
`;
}

async function renderPng(svg: string, outputPath: string): Promise<{ width: number; height: number }> {
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  const metadata = await sharp(outputPath).metadata();

  if (metadata.width !== CANVAS || metadata.height !== CANVAS) {
    fail(`Rendered PNG dimensions were ${metadata.width}x${metadata.height}, expected ${CANVAS}x${CANVAS}.`);
  }

  return {
    width: metadata.width,
    height: metadata.height,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const templateId = args.get('--template');
  const conceptId = args.get('--concept');
  const templateSpecsPath = resolvePath(args.get('--template-specs-path') ?? DEFAULT_TEMPLATE_SPECS_PATH);
  const logoPath = resolvePath(LOGO_PATH);

  if (templateId !== TEMPLATE_ID) {
    fail(`This renderer only supports --template ${TEMPLATE_ID}.`);
  }

  if (conceptId !== CONCEPT_ID) {
    fail(`This renderer only supports --concept ${CONCEPT_ID}.`);
  }

  if (!existsSync(templateSpecsPath)) {
    fail(`Template specs file does not exist: ${templateSpecsPath}`);
  }

  assertCopyIsSafe();

  const templateSpecs = validateTemplateSpecs(readJson(templateSpecsPath));
  const template = templateSpecs.templates.find((item) => item.template_id === TEMPLATE_ID);

  if (!template) {
    fail(`Template specs file does not include template_id ${TEMPLATE_ID}.`);
  }

  const renderedAt = new Date().toISOString();
  const outputDir = join(process.cwd(), 'output', `run-${renderedAt.replace(/[:.]/g, '-')}`);
  mkdirSync(outputDir, { recursive: true });

  const outputImagePath = join(outputDir, OUTPUT_FILENAME);
  const resultJsonPath = join(outputDir, 'paid-ads-template-render-result.json');
  const resultMdPath = join(outputDir, 'paid-ads-template-render-result.md');
  const logoDataUri = readLogoDataUri(logoPath);
  const svg = buildSvg(logoDataUri);
  const dimensions = await renderPng(svg, outputImagePath);

  const result: RenderResult = {
    rendered_at: renderedAt,
    source_template_specs_path: templateSpecsPath,
    template_id: template.template_id,
    template_name: template.template_name,
    concept_id: CONCEPT_ID,
    concept_name: CREATIVE.conceptName,
    output_image_path: outputImagePath,
    output_filename: basename(outputImagePath),
    dimensions,
    logo_asset_path: logoPath,
    logo_asset_used: true,
    renderer: 'svg_sharp_template_renderer',
    lifecycle: {
      approved_for_upload: false,
      uploaded_to_meta: false,
      meta_ad_id: null,
      human_review_required: true,
    },
    qa_checklist: [
      'PNG is 1080x1080.',
      'Brand logo uses brand/verbatim/logo-pink.png.',
      'Brand pink is used only as an accent.',
      'Main background is white or off-white.',
      'Hook is mobile-readable.',
      'Proof block is secondary to the hook.',
      'No fake UI.',
      'No fake metrics.',
      'No robots.',
      'No unsupported accuracy or correctness promises.',
      'No em dashes in customer-facing copy.',
      'Lifecycle remains gated before upload.',
    ],
    notes: [
      'Rendered only the large-hook-plus-proof-block template family.',
      'This is a deterministic local SVG-to-PNG render using Sharp.',
      'Template specs remain a human review source. Upload approval is still false.',
      `Source template specs generated at ${templateSpecs.generated_at}.`,
      `Source analysis path: ${templateSpecs.source_analysis_path}.`,
    ],
  };

  writeFileSync(resultJsonPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  writeFileSync(resultMdPath, formatMarkdown(result), 'utf8');

  console.log('paid_ads_template_render_png_path:', outputImagePath);
  console.log('paid_ads_template_render_result_json_path:', resultJsonPath);
  console.log('paid_ads_template_render_result_md_path:', resultMdPath);
  console.log('template_id:', result.template_id);
  console.log('concept_id:', result.concept_id);
  console.log('dimensions:', `${result.dimensions.width}x${result.dimensions.height}`);
  console.log('logo_asset_used:', result.logo_asset_used ? 'yes' : 'no');
  console.log('approved_for_upload:', result.lifecycle.approved_for_upload);
  console.log('human_review_required:', result.lifecycle.human_review_required);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
