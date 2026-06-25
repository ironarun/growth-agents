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
  style: RenderStyle;
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

const SUPPORTED_STYLES = ['editorial-annotation', 'document-interruption', 'stark-contrast', 'editorial-collage'] as const;
type RenderStyle = (typeof SUPPORTED_STYLES)[number];

const DEFAULT_STYLE: RenderStyle = 'document-interruption';

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
  deepPink: '#d4154d',
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

function svgTextLinesWithFill(
  lines: string[],
  x: number,
  y: number,
  fontSize: number,
  lineHeight: number,
  weight: number,
  fill: string,
): string {
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * lineHeight}" font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${escapeXml(line)}</text>`,
    )
    .join('\n');
}

function renderFooter(logoDataUri: string, y = 944): string {
  return `
    <image href="${logoDataUri}" x="64" y="${y}" width="132" height="31" preserveAspectRatio="xMinYMid meet" />
    <text x="236" y="${y + 23}" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="500" fill="${COLORS.muted}">${escapeXml(CREATIVE.positioningLine)}</text>
    <rect x="790" y="${y - 22}" width="226" height="70" rx="35" fill="${COLORS.ink}" />
    <text x="903" y="${y + 21}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="750" fill="${COLORS.surface}">${escapeXml(CREATIVE.ctaText)}</text>
  `;
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

function buildDocumentInterruptionSvg(logoDataUri: string): string {
  const hookLines = wrapText(CREATIVE.hook, 20);
  const proofStartY = 668;

  const proofRows = CREATIVE.proofLines
    .map((line, index) => {
      const y = proofStartY + index * 70;
      return `
        <line x1="610" y1="${y}" x2="904" y2="${y}" stroke="${index === 0 ? COLORS.deepPink : COLORS.border}" stroke-width="${index === 0 ? 3 : 2}" />
        <text x="610" y="${y + 38}" font-family="Arial, Helvetica, sans-serif" font-size="25" font-weight="650" fill="${COLORS.ink}">${escapeXml(line)}</text>
      `;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
    <rect width="${CANVAS}" height="${CANVAS}" fill="${COLORS.background}" />
    <rect x="0" y="0" width="1080" height="1080" fill="${COLORS.background}" />
    <path d="M0 0 H1080 V214 C870 178 684 184 522 221 C326 266 170 264 0 232 Z" fill="${COLORS.pinkSurface}" />
    <rect x="64" y="70" width="112" height="7" rx="3.5" fill="${COLORS.pink}" />
    <text x="64" y="123" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="750" letter-spacing="3.5" fill="${COLORS.muted}">CONFIDENT AI WORK</text>

    ${svgTextLines(hookLines, 64, 218, 70, 82, 750)}

    <g transform="rotate(-2 300 628)">
      <rect x="62" y="498" width="534" height="294" rx="0" fill="${COLORS.surface}" stroke="${COLORS.border}" stroke-width="1.5" />
      <rect x="62" y="498" width="10" height="294" fill="${COLORS.pinkSurface}" />
      <rect x="98" y="548" width="252" height="20" rx="10" fill="#d9d9d9" opacity="0.92" />
      <rect x="98" y="598" width="418" height="13" rx="6.5" fill="#eeeeee" />
      <rect x="98" y="636" width="364" height="13" rx="6.5" fill="#eeeeee" />
      <rect x="98" y="674" width="392" height="13" rx="6.5" fill="#eeeeee" />
      <rect x="98" y="724" width="280" height="13" rx="6.5" fill="#eeeeee" />
    </g>

    <path d="M547 486 C621 525 674 601 675 689 C677 786 617 849 557 878" fill="none" stroke="${COLORS.pink}" stroke-width="7" stroke-linecap="round" />
    <path d="M548 486 L592 508 L556 532 Z" fill="${COLORS.pink}" />
    <circle cx="557" cy="878" r="11" fill="${COLORS.deepPink}" />

    <rect x="554" y="488" width="462" height="402" rx="0" fill="${COLORS.pinkSurface}" />
    <rect x="568" y="498" width="448" height="382" rx="0" fill="${COLORS.surface}" stroke="${COLORS.ink}" stroke-width="2.4" />
    <rect x="568" y="498" width="448" height="92" fill="${COLORS.ink}" />
    <text x="610" y="549" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="750" letter-spacing="2.8" fill="${COLORS.surface}">REVIEW BEFORE ACTION</text>
    <text x="610" y="621" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="650" fill="${COLORS.muted}">Before client use,</text>
    <text x="610" y="649" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="650" fill="${COLORS.muted}">Verbatim checks:</text>
    ${proofRows}

    <rect x="64" y="892" width="952" height="1.5" fill="${COLORS.border}" />
    ${renderFooter(logoDataUri)}
  </svg>`;
}

function buildEditorialAnnotationSvg(logoDataUri: string): string {
  const hookLines = wrapText(CREATIVE.hook, 18);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
    <rect width="${CANVAS}" height="${CANVAS}" fill="${COLORS.surface}" />
    <rect x="0" y="0" width="182" height="1080" fill="${COLORS.pinkSurface}" />
    <rect x="64" y="64" width="8" height="776" rx="4" fill="${COLORS.pink}" />
    <rect x="84" y="64" width="4" height="776" rx="2" fill="${COLORS.deepPink}" opacity="0.85" />
    <text x="108" y="110" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="750" letter-spacing="3.4" fill="${COLORS.deepPink}">MARGIN REVIEW</text>
    ${svgTextLines(hookLines, 108, 206, 74, 86, 760)}

    <g transform="translate(112 534)">
      <line x1="0" y1="0" x2="812" y2="0" stroke="${COLORS.ink}" stroke-width="2" />
      <rect x="-16" y="26" width="560" height="286" fill="${COLORS.pinkSurface}" />
      <rect x="-16" y="26" width="8" height="286" fill="${COLORS.pink}" />
      <text x="24" y="76" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="650" fill="${COLORS.muted}">Before client use, Verbatim checks:</text>
      <text x="24" y="150" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="760" fill="${COLORS.ink}">weak claims</text>
      <text x="24" y="216" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="760" fill="${COLORS.ink}">missing counterpoints</text>
      <text x="24" y="282" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="760" fill="${COLORS.ink}">overconfident reasoning</text>
      <path d="M602 52 C662 84 706 155 706 244" fill="none" stroke="${COLORS.pink}" stroke-width="5.5" stroke-linecap="round" />
      <text x="632" y="96" transform="rotate(-8 632 96)" font-family="Georgia, 'Times New Roman', serif" font-size="29" font-style="italic" fill="${COLORS.deepPink}">challenge before action</text>
      <circle cx="604" cy="52" r="8" fill="${COLORS.pink}" />
    </g>

    <rect x="64" y="892" width="952" height="1.5" fill="${COLORS.border}" />
    ${renderFooter(logoDataUri)}
  </svg>`;
}

function buildStarkContrastSvg(logoDataUri: string): string {
  const hookLines = wrapText(CREATIVE.hook, 16);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
    <rect width="${CANVAS}" height="${CANVAS}" fill="${COLORS.ink}" />
    <rect x="46" y="46" width="988" height="988" fill="${COLORS.ink}" stroke="#222222" stroke-width="1.5" />
    <rect x="46" y="46" width="988" height="138" fill="${COLORS.pinkSurface}" />
    <rect x="74" y="74" width="118" height="7" rx="3.5" fill="${COLORS.pink}" />
    <text x="74" y="130" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="760" letter-spacing="3.5" fill="#bdbdbd">CONFIDENCE IS NOT REVIEW</text>
    ${svgTextLinesWithFill(hookLines, 74, 236, 72, 84, 780, COLORS.surface)}

    <g transform="translate(74 568)">
      <rect x="0" y="0" width="654" height="278" fill="${COLORS.pinkSurface}" />
      <rect x="0" y="0" width="18" height="278" fill="${COLORS.pink}" />
      <rect x="18" y="0" width="10" height="278" fill="${COLORS.deepPink}" />
      <text x="52" y="58" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="${COLORS.muted}">Before client use, Verbatim checks:</text>
      <text x="52" y="122" font-family="Arial, Helvetica, sans-serif" font-size="35" font-weight="780" fill="${COLORS.ink}">weak claims</text>
      <text x="52" y="184" font-family="Arial, Helvetica, sans-serif" font-size="35" font-weight="780" fill="${COLORS.ink}">missing counterpoints</text>
      <text x="52" y="246" font-family="Arial, Helvetica, sans-serif" font-size="35" font-weight="780" fill="${COLORS.ink}">overconfident reasoning</text>
    </g>

    <g transform="translate(752 568)">
      <rect x="-18" y="-22" width="252" height="164" fill="none" stroke="${COLORS.pink}" stroke-width="4" />
      <rect x="-18" y="-22" width="48" height="164" fill="${COLORS.deepPink}" />
      <text x="52" y="27" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#d7d7d7">review before</text>
      <text x="52" y="64" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#d7d7d7">the answer</text>
      <text x="52" y="101" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="700" fill="#d7d7d7">becomes action</text>
    </g>

    <rect x="46" y="890" width="988" height="144" fill="${COLORS.surface}" />
    ${renderFooter(logoDataUri, 944)}
  </svg>`;
}

function iconSvg(index: number, x: number, y: number): string {
  if (index === 0) {
    return `
      <rect x="${x}" y="${y}" width="34" height="34" rx="5" fill="none" stroke="${COLORS.pink}" stroke-width="3" />
      <path d="M${x + 10} ${y + 10} L${x + 24} ${y + 24} M${x + 24} ${y + 10} L${x + 10} ${y + 24}" stroke="${COLORS.pink}" stroke-width="3" stroke-linecap="round" />
    `;
  }

  if (index === 1) {
    return `
      <path d="M${x + 3} ${y + 5} H${x + 31} Q${x + 36} ${y + 5} ${x + 36} ${y + 10} V${y + 25} Q${x + 36} ${y + 30} ${x + 31} ${y + 30} H${x + 17} L${x + 8} ${y + 38} V${y + 30} H${x + 3} Q${x - 2} ${y + 30} ${x - 2} ${y + 25} V${y + 10} Q${x - 2} ${y + 5} ${x + 3} ${y + 5} Z" fill="none" stroke="${COLORS.pink}" stroke-width="3" stroke-linejoin="round" />
      <circle cx="${x + 10}" cy="${y + 18}" r="2.2" fill="${COLORS.pink}" />
      <circle cx="${x + 18}" cy="${y + 18}" r="2.2" fill="${COLORS.pink}" />
      <circle cx="${x + 26}" cy="${y + 18}" r="2.2" fill="${COLORS.pink}" />
    `;
  }

  return `
    <path d="M${x + 18} ${y + 3} L${x + 36} ${y + 36} H${x} Z" fill="none" stroke="${COLORS.pink}" stroke-width="3" stroke-linejoin="round" />
    <line x1="${x + 18}" y1="${y + 14}" x2="${x + 18}" y2="${y + 24}" stroke="${COLORS.pink}" stroke-width="3" stroke-linecap="round" />
    <circle cx="${x + 18}" cy="${y + 30}" r="2.5" fill="${COLORS.pink}" />
  `;
}

function buildEditorialCollageSvg(logoDataUri: string): string {
  const headlineLines = ['The draft', 'sounds', 'finished.', 'Has anyone', 'challenged it?'];

  const reviewRows = CREATIVE.proofLines
    .map((line, index) => {
      const y = 194 + index * 72;
      return `
        ${iconSvg(index, 72, y - 29)}
        <text x="132" y="${y}" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="760" fill="${COLORS.ink}">${escapeXml(line)}</text>
        ${index < CREATIVE.proofLines.length - 1 ? `<line x1="66" y1="${y + 28}" x2="414" y2="${y + 28}" stroke="#d7c8c8" stroke-width="1.5" />` : ''}
      `;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">
    <defs>
      <filter id="paperShadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#0a0a0a" flood-opacity="0.16" />
      </filter>
      <filter id="softShadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="12" stdDeviation="12" flood-color="#0a0a0a" flood-opacity="0.18" />
      </filter>
      <filter id="paperTexture" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="8" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.96 0 0 0 0 0.93 0 0 0 0 0.89 0 0 0 0.16 0" />
      </filter>
      <linearGradient id="blushWash" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${COLORS.pinkSurface}" />
        <stop offset="0.56" stop-color="#fff8f8" />
        <stop offset="1" stop-color="${COLORS.surface}" />
      </linearGradient>
    </defs>

    <rect width="${CANVAS}" height="${CANVAS}" fill="url(#blushWash)" />
    <path d="M0 0 H720 C655 210 522 334 336 391 C206 431 94 429 0 410 Z" fill="${COLORS.pinkSurface}" opacity="0.92" />
    <path d="M0 1080 C198 974 332 930 520 947 C684 962 839 940 1080 832 V1080 Z" fill="${COLORS.pink}" opacity="0.10" />
    <rect width="${CANVAS}" height="${CANVAS}" filter="url(#paperTexture)" opacity="0.28" />

    <g transform="translate(642 72) rotate(8 230 370)" filter="url(#paperShadow)">
      <rect x="0" y="0" width="510" height="738" fill="#fbfaf7" stroke="${COLORS.border}" stroke-width="1.2" />
      <rect x="78" y="140" width="200" height="12" rx="6" fill="#d9d9d9" opacity="0.9" />
      <rect x="78" y="178" width="372" height="10" rx="5" fill="#e5e5e5" />
      <rect x="78" y="214" width="330" height="10" rx="5" fill="#e5e5e5" />
      <rect x="78" y="250" width="396" height="10" rx="5" fill="#e5e5e5" />
      <rect x="78" y="286" width="285" height="10" rx="5" fill="#e5e5e5" />
      <rect x="78" y="392" width="360" height="10" rx="5" fill="#e5e5e5" />
      <rect x="78" y="428" width="230" height="10" rx="5" fill="#e5e5e5" />
      <rect x="78" y="464" width="318" height="10" rx="5" fill="#e5e5e5" />
      <rect x="286" y="180" width="198" height="14" rx="7" fill="${COLORS.pinkSurface}" opacity="0.9" />
      <rect x="310" y="610" width="146" height="13" rx="6.5" fill="${COLORS.pinkSurface}" opacity="0.95" />
    </g>

    <path d="M854 213 C812 225 788 254 782 289" fill="none" stroke="${COLORS.pink}" stroke-width="2.5" stroke-linecap="round" />
    <path d="M782 289 L770 272 M782 289 L798 276" fill="none" stroke="${COLORS.pink}" stroke-width="2.5" stroke-linecap="round" />
    <text x="874" y="205" transform="rotate(8 874 205)" font-family="Georgia, 'Times New Roman', serif" font-size="26" font-style="italic" fill="${COLORS.deepPink}">Too certain?</text>
    <ellipse cx="966" cy="474" rx="84" ry="52" transform="rotate(8 966 474)" fill="none" stroke="${COLORS.pink}" stroke-width="2.6" />
    <ellipse cx="966" cy="474" rx="96" ry="60" transform="rotate(12 966 474)" fill="none" stroke="${COLORS.pink}" stroke-width="1.8" opacity="0.75" />
    <text x="920" y="465" transform="rotate(8 920 465)" font-family="Georgia, 'Times New Roman', serif" font-size="25" font-style="italic" fill="${COLORS.deepPink}">what is</text>
    <text x="928" y="494" transform="rotate(8 928 494)" font-family="Georgia, 'Times New Roman', serif" font-size="25" font-style="italic" fill="${COLORS.deepPink}">missing?</text>

    <rect x="74" y="92" width="112" height="7" rx="3.5" fill="${COLORS.pink}" />
    <text x="74" y="143" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="760" letter-spacing="4.4" fill="${COLORS.pink}">FOR CLIENT-FACING AI WORK</text>
    ${svgTextLinesWithFill(headlineLines, 74, 254, 68, 82, 760, COLORS.ink).replaceAll('Arial, Helvetica, sans-serif', "Georgia, 'Times New Roman', serif")}
    <text x="76" y="760" font-family="Georgia, 'Times New Roman', serif" font-size="35" font-style="italic" fill="${COLORS.pink}">challenge before action</text>
    <path d="M73 784 C210 759 356 757 520 780" fill="none" stroke="${COLORS.pink}" stroke-width="3.5" stroke-linecap="round" />

    <g transform="translate(548 564) rotate(4 230 204)" filter="url(#softShadow)">
      <rect x="0" y="0" width="468" height="356" fill="${COLORS.pinkSurface}" stroke="#ead7d9" stroke-width="1.2" />
      <rect x="0" y="0" width="36" height="356" fill="${COLORS.pink}" />
      <rect x="36" y="0" width="8" height="356" fill="${COLORS.deepPink}" opacity="0.85" />
      <text x="72" y="76" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="780" letter-spacing="2.8" fill="${COLORS.deepPink}">BEFORE CLIENT USE,</text>
      <text x="72" y="108" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="780" letter-spacing="2.8" fill="${COLORS.deepPink}">VERBATIM CHECKS:</text>
      <line x1="72" y1="140" x2="410" y2="140" stroke="${COLORS.pink}" stroke-width="2" />
      ${reviewRows}
    </g>

    <path d="M958 532 C1015 536 1017 590 964 592 C925 594 925 560 955 560 C989 560 991 607 951 628" fill="none" stroke="${COLORS.deepPink}" stroke-width="6" stroke-linecap="round" opacity="0.9" />

    <line x1="74" y1="944" x2="1008" y2="944" stroke="${COLORS.pink}" stroke-width="1.4" opacity="0.7" />
    <image href="${logoDataUri}" x="74" y="980" width="188" height="44" preserveAspectRatio="xMinYMid meet" />
    <line x1="296" y1="976" x2="296" y2="1022" stroke="${COLORS.muted}" stroke-width="1.2" opacity="0.55" />
    <text x="326" y="1008" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="500" fill="${COLORS.muted}">${escapeXml(CREATIVE.positioningLine)}</text>
    <rect x="744" y="970" width="264" height="62" rx="31" fill="${COLORS.pink}" />
    <text x="876" y="1010" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="27" font-weight="760" fill="${COLORS.surface}">${escapeXml(CREATIVE.ctaText)}</text>
  </svg>`;
}

function buildSvg(logoDataUri: string, style: RenderStyle): string {
  if (style === 'editorial-collage') return buildEditorialCollageSvg(logoDataUri);
  if (style === 'editorial-annotation') return buildEditorialAnnotationSvg(logoDataUri);
  if (style === 'stark-contrast') return buildStarkContrastSvg(logoDataUri);
  return buildDocumentInterruptionSvg(logoDataUri);
}

function parseStyle(rawStyle: string | undefined): RenderStyle {
  if (!rawStyle) return DEFAULT_STYLE;
  if ((SUPPORTED_STYLES as readonly string[]).includes(rawStyle)) return rawStyle as RenderStyle;

  fail(`Unsupported --style ${rawStyle}. Supported styles: ${SUPPORTED_STYLES.join(', ')}.`);
}

function outputFilename(style: RenderStyle): string {
  return `verbatim_meta_01_large-hook-proof_confident-draft_${style}_1x1_v01.png`;
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
Style: ${result.style}

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
  const style = parseStyle(args.get('--style'));
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

  const outputImagePath = join(outputDir, outputFilename(style));
  const resultJsonPath = join(outputDir, 'paid-ads-template-render-result.json');
  const resultMdPath = join(outputDir, 'paid-ads-template-render-result.md');
  const logoDataUri = readLogoDataUri(logoPath);
  const svg = buildSvg(logoDataUri, style);
  const dimensions = await renderPng(svg, outputImagePath);

  const result: RenderResult = {
    rendered_at: renderedAt,
    source_template_specs_path: templateSpecsPath,
    template_id: template.template_id,
    template_name: template.template_name,
    style,
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
      `Rendered style variant: ${style}.`,
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
  console.log('style:', result.style);
  console.log('dimensions:', `${result.dimensions.width}x${result.dimensions.height}`);
  console.log('logo_asset_used:', result.logo_asset_used ? 'yes' : 'no');
  console.log('approved_for_upload:', result.lifecycle.approved_for_upload);
  console.log('human_review_required:', result.lifecycle.human_review_required);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
