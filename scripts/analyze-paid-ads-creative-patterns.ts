import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

type VisibleCopy = {
  primaryText: string;
  headline: string;
  description: string;
};

type AdLibraryExample = {
  isPlaceholder?: boolean;
  advertiser: string;
  adLibraryUrl: string;
  platform: string[];
  activeStatus: string;
  startDateIfVisible: string | null;
  longevitySignal: string;
  visualFormat: string;
  hookType: string;
  offerType: string;
  cta: string;
  landingPage: string;
  visibleCopy: VisibleCopy;
  screenshotPath: string | null;
  whyThisAdMayBeWorking: string;
  patternTags: string[];
  relevanceToVerbatim: string;
};

type CaptureFile = {
  captureVersion: string;
  captureStatus: string;
  capturedAt: string | null;
  researcher: string;
  source: string;
  notes: string[];
  examples: AdLibraryExample[];
};

type PatternCount = {
  value: string;
  count: number;
  exampleAdvertisers: string[];
};

type CreativePatternAnalysis = {
  generatedAt: string;
  sourceCapturePath: string;
  captureStatus: string;
  totalExamples: number;
  realExampleCount: number;
  placeholderExampleCount: number;
  sufficientForConclusions: boolean;
  status: 'needs_real_research' | 'analysis_ready';
  repeatedHookPatterns: PatternCount[];
  repeatedVisualLayouts: PatternCount[];
  repeatedCtaStructures: PatternCount[];
  longevitySignals: PatternCount[];
  patternsWorthAdaptingForVerbatim: string[];
  patternsToAvoid: string[];
  recommendedTemplateDirections: string[];
  notes: string[];
};

const DEFAULT_CAPTURE_PATH = 'data/paid-ads/ad-library-capture-template.json';
const REQUIRED_FIELDS: Array<keyof AdLibraryExample> = [
  'advertiser',
  'adLibraryUrl',
  'platform',
  'activeStatus',
  'startDateIfVisible',
  'longevitySignal',
  'visualFormat',
  'hookType',
  'offerType',
  'cta',
  'landingPage',
  'visibleCopy',
  'screenshotPath',
  'whyThisAdMayBeWorking',
  'patternTags',
  'relevanceToVerbatim',
];

function fail(message: string): never {
  throw new Error(message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveCapturePath(rawPath: string | undefined): string {
  const capturePath = rawPath && rawPath.trim() !== '' ? rawPath : DEFAULT_CAPTURE_PATH;
  const resolvedPath = isAbsolute(capturePath) ? capturePath : resolve(process.cwd(), capturePath);

  if (!existsSync(resolvedPath)) {
    fail(`Ad Library capture file does not exist: ${resolvedPath}`);
  }

  return resolvedPath;
}

function readJson(filePath: string): unknown {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  } catch (error) {
    fail(`Invalid JSON or unreadable file: ${filePath}. ${error instanceof Error ? error.message : String(error)}`);
  }
}

function validateVisibleCopy(value: unknown, exampleIndex: number): VisibleCopy {
  if (!isRecord(value)) {
    fail(`examples[${exampleIndex}].visibleCopy must be an object.`);
  }

  for (const field of ['primaryText', 'headline', 'description']) {
    if (typeof value[field] !== 'string') {
      fail(`examples[${exampleIndex}].visibleCopy.${field} must be a string.`);
    }
  }

  return {
    primaryText: String(value.primaryText),
    headline: String(value.headline),
    description: String(value.description),
  };
}

function validateExample(value: unknown, exampleIndex: number): AdLibraryExample {
  if (!isRecord(value)) {
    fail(`examples[${exampleIndex}] must be an object.`);
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in value)) {
      fail(`examples[${exampleIndex}] is missing required field: ${field}`);
    }
  }

  if (!Array.isArray(value.platform) || value.platform.some((item) => typeof item !== 'string')) {
    fail(`examples[${exampleIndex}].platform must be an array of strings.`);
  }

  if (!Array.isArray(value.patternTags) || value.patternTags.some((item) => typeof item !== 'string')) {
    fail(`examples[${exampleIndex}].patternTags must be an array of strings.`);
  }

  for (const field of [
    'advertiser',
    'adLibraryUrl',
    'activeStatus',
    'longevitySignal',
    'visualFormat',
    'hookType',
    'offerType',
    'cta',
    'landingPage',
    'whyThisAdMayBeWorking',
    'relevanceToVerbatim',
  ]) {
    if (typeof value[field] !== 'string') {
      fail(`examples[${exampleIndex}].${field} must be a string.`);
    }
  }

  if (value.startDateIfVisible !== null && typeof value.startDateIfVisible !== 'string') {
    fail(`examples[${exampleIndex}].startDateIfVisible must be a string or null.`);
  }

  if (value.screenshotPath !== null && typeof value.screenshotPath !== 'string') {
    fail(`examples[${exampleIndex}].screenshotPath must be a string or null.`);
  }

  return {
    isPlaceholder: value.isPlaceholder === true,
    advertiser: String(value.advertiser),
    adLibraryUrl: String(value.adLibraryUrl),
    platform: value.platform.map((item) => String(item)),
    activeStatus: String(value.activeStatus),
    startDateIfVisible: value.startDateIfVisible === null ? null : String(value.startDateIfVisible),
    longevitySignal: String(value.longevitySignal),
    visualFormat: String(value.visualFormat),
    hookType: String(value.hookType),
    offerType: String(value.offerType),
    cta: String(value.cta),
    landingPage: String(value.landingPage),
    visibleCopy: validateVisibleCopy(value.visibleCopy, exampleIndex),
    screenshotPath: value.screenshotPath === null ? null : String(value.screenshotPath),
    whyThisAdMayBeWorking: String(value.whyThisAdMayBeWorking),
    patternTags: value.patternTags.map((item) => String(item)),
    relevanceToVerbatim: String(value.relevanceToVerbatim),
  };
}

function validateCaptureFile(value: unknown): CaptureFile {
  if (!isRecord(value)) {
    fail('Capture file must be a JSON object.');
  }

  if (!Array.isArray(value.examples)) {
    fail('Capture file must include an examples array.');
  }

  return {
    captureVersion: typeof value.captureVersion === 'string' ? value.captureVersion : 'unknown',
    captureStatus: typeof value.captureStatus === 'string' ? value.captureStatus : 'unknown',
    capturedAt: typeof value.capturedAt === 'string' ? value.capturedAt : null,
    researcher: typeof value.researcher === 'string' ? value.researcher : 'unknown',
    source: typeof value.source === 'string' ? value.source : 'manual_meta_ad_library_research',
    notes: Array.isArray(value.notes) ? value.notes.map((note) => String(note)) : [],
    examples: value.examples.map((example, index) => validateExample(example, index)),
  };
}

function looksPlaceholder(value: string): boolean {
  return value.toLowerCase().includes('placeholder');
}

function isRealExample(example: AdLibraryExample): boolean {
  const inspectedFields = [
    example.advertiser,
    example.adLibraryUrl,
    example.longevitySignal,
    example.visualFormat,
    example.hookType,
    example.offerType,
    example.cta,
    example.landingPage,
    example.whyThisAdMayBeWorking,
    example.relevanceToVerbatim,
  ];

  return example.isPlaceholder !== true && !inspectedFields.some(looksPlaceholder);
}

function countPatterns(examples: AdLibraryExample[], getValue: (example: AdLibraryExample) => string): PatternCount[] {
  const counts = new Map<string, { count: number; advertisers: Set<string> }>();

  for (const example of examples) {
    const value = getValue(example).trim();

    if (value === '') {
      continue;
    }

    const current = counts.get(value) ?? { count: 0, advertisers: new Set<string>() };
    current.count += 1;
    current.advertisers.add(example.advertiser);
    counts.set(value, current);
  }

  return [...counts.entries()]
    .map(([value, entry]) => ({
      value,
      count: entry.count,
      exampleAdvertisers: [...entry.advertisers].sort(),
    }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

function repeatedOnly(patterns: PatternCount[]): PatternCount[] {
  return patterns.filter((pattern) => pattern.count > 1);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function buildAnalysis(capture: CaptureFile, sourceCapturePath: string): CreativePatternAnalysis {
  const realExamples = capture.examples.filter(isRealExample);
  const placeholderExampleCount = capture.examples.length - realExamples.length;
  const hasEnoughRealData = realExamples.length >= 5;

  if (!hasEnoughRealData) {
    return {
      generatedAt: new Date().toISOString(),
      sourceCapturePath,
      captureStatus: capture.captureStatus,
      totalExamples: capture.examples.length,
      realExampleCount: realExamples.length,
      placeholderExampleCount,
      sufficientForConclusions: false,
      status: 'needs_real_research',
      repeatedHookPatterns: [],
      repeatedVisualLayouts: [],
      repeatedCtaStructures: [],
      longevitySignals: [],
      patternsWorthAdaptingForVerbatim: [],
      patternsToAvoid: [
        'Do not adapt placeholder examples.',
        'Do not render more images from internal taste alone.',
        'Do not infer profitability from an active ad without more evidence.',
      ],
      recommendedTemplateDirections: [
        'Capture 15 to 25 real Meta Ad Library examples before the next renderer pass.',
        'Prioritize ads with visible longevity signals and clear visual formats.',
        'Tag examples by hook type, visual format, CTA, offer type, and relevance to Verbatim.',
      ],
      notes: [
        'Real research is required before making creative pattern conclusions.',
        'Placeholder data was treated as insufficient evidence.',
        'Longevity should be treated as a proxy, not proof of profitability.',
      ],
    };
  }

  const hookPatterns = countPatterns(realExamples, (example) => example.hookType);
  const visualLayouts = countPatterns(realExamples, (example) => example.visualFormat);
  const ctaStructures = countPatterns(realExamples, (example) => example.cta);
  const longevitySignals = countPatterns(realExamples, (example) => example.longevitySignal);
  const patternTags = unique(realExamples.flatMap((example) => example.patternTags));
  const relevantNotes = unique(realExamples.map((example) => example.relevanceToVerbatim));

  return {
    generatedAt: new Date().toISOString(),
    sourceCapturePath,
    captureStatus: capture.captureStatus,
    totalExamples: capture.examples.length,
    realExampleCount: realExamples.length,
    placeholderExampleCount,
    sufficientForConclusions: true,
    status: 'analysis_ready',
    repeatedHookPatterns: repeatedOnly(hookPatterns),
    repeatedVisualLayouts: repeatedOnly(visualLayouts),
    repeatedCtaStructures: repeatedOnly(ctaStructures),
    longevitySignals,
    patternsWorthAdaptingForVerbatim: [
      ...patternTags.map((tag) => `Pattern tag observed: ${tag}`),
      ...relevantNotes.map((note) => `Verbatim relevance note: ${note}`),
    ],
    patternsToAvoid: [
      'Avoid fake UI, fake metrics, fake logos, and generic AI productivity visuals.',
      "Avoid copying competitor layouts without mapping the pattern to Verbatim's review-before-action wedge.",
      'Avoid treating longevity as proof of profitability.',
    ],
    recommendedTemplateDirections: [
      'Adapt repeated hook and visual patterns only when they clarify client-facing AI review.',
      'Prefer templates that make the missing review step visible.',
      'Feed approved template directions into the next renderer pass before producing more PNGs.',
    ],
    notes: [
      'Analysis is based only on manually captured examples.',
      'Review screenshots and landing pages manually before approving renderer changes.',
      'Longevity is a proxy, not proof of profitability.',
    ],
  };
}

function formatPatternCounts(patterns: PatternCount[]): string {
  if (patterns.length === 0) {
    return '- No repeated pattern available from current data.';
  }

  return patterns
    .map((pattern) => `- ${pattern.value}: ${pattern.count} example(s). Advertisers: ${pattern.exampleAdvertisers.join(', ')}`)
    .join('\n');
}

function formatBullets(items: string[]): string {
  if (items.length === 0) {
    return '- None available from current data.';
  }

  return items.map((item) => `- ${item}`).join('\n');
}

function formatMarkdown(analysis: CreativePatternAnalysis): string {
  return `# Paid Ads Creative Pattern Analysis

Generated at: ${analysis.generatedAt}
Source capture path: ${analysis.sourceCapturePath}
Capture status: ${analysis.captureStatus}

## Data Sufficiency

- Total examples: ${analysis.totalExamples}
- Real examples: ${analysis.realExampleCount}
- Placeholder examples: ${analysis.placeholderExampleCount}
- Sufficient for conclusions: ${analysis.sufficientForConclusions ? 'yes' : 'no'}
- Status: ${analysis.status}

## Repeated Hook Patterns

${formatPatternCounts(analysis.repeatedHookPatterns)}

## Repeated Visual Layouts

${formatPatternCounts(analysis.repeatedVisualLayouts)}

## Repeated CTA Structures

${formatPatternCounts(analysis.repeatedCtaStructures)}

## Longevity Signals

${formatPatternCounts(analysis.longevitySignals)}

## Patterns Worth Adapting For Verbatim

${formatBullets(analysis.patternsWorthAdaptingForVerbatim)}

## Patterns To Avoid

${formatBullets(analysis.patternsToAvoid)}

## Recommended Template Directions For Next Renderer Pass

${formatBullets(analysis.recommendedTemplateDirections)}

## Notes

${formatBullets(analysis.notes)}

## Human Review

- [ ] Real ad-library examples captured
- [ ] Pattern analysis reviewed
- [ ] Template direction approved before rendering
`;
}

function main(): void {
  const sourceCapturePath = resolveCapturePath(process.env.AD_LIBRARY_CAPTURE_PATH);
  const capture = validateCaptureFile(readJson(sourceCapturePath));
  const analysis = buildAnalysis(capture, sourceCapturePath);
  const timestamp = analysis.generatedAt.replace(/[:.]/g, '-');
  const outputDir = join(process.cwd(), 'output', `run-${timestamp}`);
  mkdirSync(outputDir, { recursive: true });

  const jsonPath = join(outputDir, 'paid-ads-creative-pattern-analysis.json');
  const markdownPath = join(outputDir, 'paid-ads-creative-pattern-analysis.md');

  writeFileSync(jsonPath, `${JSON.stringify(analysis, null, 2)}\n`, 'utf8');
  writeFileSync(markdownPath, formatMarkdown(analysis), 'utf8');

  console.log('paid_ads_creative_pattern_analysis_json_path:', jsonPath);
  console.log('paid_ads_creative_pattern_analysis_md_path:', markdownPath);
  console.log('real_example_count:', analysis.realExampleCount);
  console.log('sufficient_for_conclusions:', analysis.sufficientForConclusions ? 'yes' : 'no');
  console.log('status:', analysis.status);
}

main();
