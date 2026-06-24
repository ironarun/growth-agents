import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

type VisibleCopy = {
  primaryText: string;
  headline: string;
  description: string;
};

type AdLibraryExample = {
  isPlaceholder?: boolean;
  isPartialCapture?: boolean;
  extractionStatus?: string;
  libraryId?: string | null;
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

type NormalizedAdRecord = AdLibraryExample & {
  sourceArtifactPath: string;
  sourceMode: 'capture_file' | 'captures_dir';
  usableCopy: boolean;
};

type PatternCount = {
  value: string;
  count: number;
  exampleAdvertisers: string[];
};

type CreativePatternAnalysis = {
  generatedAt: string;
  sourceMode: 'capture_file' | 'captures_dir';
  sourceCapturePath: string | null;
  capturesDir: string | null;
  captureStatus: string;
  total_records_read: number;
  usable_records: number;
  skipped_records: number;
  totalExamples: number;
  realExampleCount: number;
  placeholderExampleCount: number;
  sufficientForConclusions: boolean;
  status: 'needs_real_research' | 'analysis_ready';
  repeatedAdvertisers: PatternCount[];
  hookPatterns: PatternCount[];
  copyFormattingPatterns: PatternCount[];
  visualEvidenceAvailable: PatternCount[];
  ctaPatterns: PatternCount[];
  offerFramingPatterns: PatternCount[];
  longevitySignals: PatternCount[];
  patternsWorthAdaptingForVerbatim: string[];
  patternsToAvoid: string[];
  recommendedTemplateDirections: string[];
  rendererImplications: string[];
  humanReviewNotes: string[];
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

function resolveCapturePath(rawPath: string | undefined): string {
  const capturePath = rawPath && rawPath.trim() !== '' ? rawPath : DEFAULT_CAPTURE_PATH;
  const resolvedPath = resolvePath(capturePath);

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
    isPartialCapture: value.isPartialCapture === true,
    ...(typeof value.extractionStatus === 'string' ? { extractionStatus: value.extractionStatus } : {}),
    ...(typeof value.libraryId === 'string' || value.libraryId === null ? { libraryId: value.libraryId } : {}),
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

function copyText(example: AdLibraryExample): string {
  return [example.visibleCopy.primaryText, example.visibleCopy.headline, example.visibleCopy.description].join(' ').trim();
}

function hasUsableCopy(example: AdLibraryExample): boolean {
  const text = copyText(example);
  return text !== '' && !looksPlaceholder(text);
}

function normalizeCapture(capture: CaptureFile, sourceArtifactPath: string, sourceMode: 'capture_file' | 'captures_dir'): NormalizedAdRecord[] {
  return capture.examples.map((example) => ({
    ...example,
    sourceArtifactPath,
    sourceMode,
    usableCopy: hasUsableCopy(example),
  }));
}

function readCaptureFile(filePath: string, sourceMode: 'capture_file' | 'captures_dir'): NormalizedAdRecord[] {
  return normalizeCapture(validateCaptureFile(readJson(filePath)), filePath, sourceMode);
}

function readCapturesDir(capturesDir: string): NormalizedAdRecord[] {
  const resolvedDir = resolvePath(capturesDir);

  if (!existsSync(resolvedDir)) {
    fail(`Captures directory does not exist: ${resolvedDir}`);
  }

  return readdirSync(resolvedDir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .flatMap((file) => readCaptureFile(join(resolvedDir, file), 'captures_dir'));
}

function countPatterns(examples: NormalizedAdRecord[], getValue: (example: NormalizedAdRecord) => string): PatternCount[] {
  const counts = new Map<string, { count: number; advertisers: Set<string> }>();

  for (const example of examples) {
    const value = getValue(example).trim();

    if (value === '' || value === 'unknown' || value.includes('unknown_needs')) {
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

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function inferHookPattern(example: NormalizedAdRecord): string {
  const text = copyText(example).toLowerCase();

  if (copyText(example).includes('?')) return 'question-led problem framing';
  if (/trust|trusted|confidence|citations|verifiable|reviewer|review|claims|supported/.test(text)) return 'trust-and-review proof framing';
  if (/faster|smarter|save time|productivity|automate|efficient|momentum/.test(text)) return 'speed-and-productivity promise';
  if (/ai assistant|gemini|workspace|writing assistant/.test(text)) return 'AI assistant as workflow helper';
  if (/clients|customers|business|professionals|teams/.test(text)) return 'professional workflow outcome';
  return 'benefit-led product claim';
}

function inferCopyFormattingPattern(example: NormalizedAdRecord): string {
  const primary = example.visibleCopy.primaryText;

  if (primary.split('\n').filter(Boolean).length >= 3) return 'multi-line feature list';
  if (/With .+, you can:/i.test(primary)) return 'setup line followed by capability bullets';
  if (/over \d|million|trusted by/i.test(primary)) return 'social-proof lead';
  if (primary.length <= 95) return 'short single-sentence primary text';
  return 'paragraph primary text with headline support';
}

function inferVisualEvidence(example: NormalizedAdRecord): string {
  if (!example.screenshotPath) return 'no screenshot evidence';
  if (/modal/i.test(example.screenshotPath)) return 'cropped ad detail screenshot available';
  if (/viewport/i.test(example.screenshotPath)) return 'viewport screenshot available';
  return 'screenshot evidence available';
}

function inferOfferFraming(example: NormalizedAdRecord): string {
  const text = copyText(example).toLowerCase();

  if (/free|try|trial|no charge/.test(text) || /sign up|download|install/i.test(example.cta)) return 'low-friction try/download offer';
  if (/learn more/i.test(example.cta)) return 'education-led learn-more offer';
  if (/trusted|million|professionals rely/.test(text)) return 'credibility-led product proof';
  if (/faster|smarter|save time|automate/.test(text)) return 'productivity gain offer';
  return 'general product benefit offer';
}

function buildVerbatimAdaptations(records: NormalizedAdRecord[]): string[] {
  const adaptations = [
    'before-client-review: Show the moment before AI-assisted work reaches a client, with one visible review step inserted.',
    'external-review-standard: Adapt peer-review and proofreader patterns into a professional second-pass standard for client-facing AI work.',
    'AI-draft-risk: Use competitor speed/productivity framing as contrast, then ask what checks the confident draft.',
    'workflow-before-action: Make the missing step between output and action visible as a simple workflow card.',
    'confidence-check: Pair a confident AI output with a concrete challenge or review checklist.',
    'reviewer-saves-you-later: Borrow the reviewer-style feedback pattern without copying academic branding or claims.',
  ];
  const hasReviewLanguage = records.some((record) => /review|confidence|claims|supported|citations/i.test(copyText(record)));

  return hasReviewLanguage ? adaptations : adaptations.slice(0, 5);
}

function buildAnalysis(
  records: NormalizedAdRecord[],
  sourceMode: 'capture_file' | 'captures_dir',
  sourceCapturePath: string | null,
  capturesDir: string | null,
): CreativePatternAnalysis {
  const usableRecords = records.filter((record) => record.usableCopy);
  const placeholderExampleCount = records.filter((record) => record.isPlaceholder === true && !record.usableCopy).length;
  const hasEnoughRealData = usableRecords.length >= 5;
  const hookPatterns = countPatterns(usableRecords, inferHookPattern);
  const copyFormattingPatterns = countPatterns(usableRecords, inferCopyFormattingPattern);
  const visualEvidenceAvailable = countPatterns(usableRecords, inferVisualEvidence);
  const ctaPatterns = countPatterns(usableRecords, (record) => record.cta);
  const offerFramingPatterns = countPatterns(usableRecords, inferOfferFraming);
  const longevitySignals = countPatterns(usableRecords, (record) => record.longevitySignal);
  const repeatedAdvertisers = countPatterns(usableRecords, (record) => record.advertiser);

  return {
    generatedAt: new Date().toISOString(),
    sourceMode,
    sourceCapturePath,
    capturesDir,
    captureStatus: sourceMode === 'captures_dir' ? 'captures_dir_normalized' : 'capture_file_normalized',
    total_records_read: records.length,
    usable_records: usableRecords.length,
    skipped_records: records.length - usableRecords.length,
    totalExamples: records.length,
    realExampleCount: usableRecords.length,
    placeholderExampleCount,
    sufficientForConclusions: hasEnoughRealData,
    status: hasEnoughRealData ? 'analysis_ready' : 'needs_real_research',
    repeatedAdvertisers,
    hookPatterns,
    copyFormattingPatterns,
    visualEvidenceAvailable,
    ctaPatterns,
    offerFramingPatterns,
    longevitySignals,
    patternsWorthAdaptingForVerbatim: hasEnoughRealData
      ? [
          'Repeated competitor pattern: simple product promise plus concrete CTA, usually not elaborate visual storytelling.',
          'Several examples use proof or trust language. Map this to Verbatim as review, challenge, or defensibility before action.',
          'Short primary copy with a concrete headline is a safer next renderer target than abstract brand lines.',
          'Cropped ad-detail evidence supports building product-style cards and proof blocks, not generic decorative ads.',
          ...buildVerbatimAdaptations(usableRecords),
        ]
      : [],
    patternsToAvoid: [
      'Do not claim profitability from active status, start date, or repeated creative.',
      'Do not copy competitor branding, layouts, logos, or exact ad creative.',
      'Do not treat longevity as proof of performance.',
      'Do not render final Verbatim ads directly from this analysis without human template approval.',
      'Avoid generic AI productivity claims that make Verbatim look interchangeable with writing assistants.',
    ],
    recommendedTemplateDirections: hasEnoughRealData
      ? buildVerbatimAdaptations(usableRecords)
      : [
          'Capture and reprocess more real examples before drawing template conclusions.',
          'Use placeholder output only to validate analyzer mechanics.',
        ],
    rendererImplications: [
      'Support consistent Verbatim logo placement across static ads.',
      'Support cropped product-style card layouts based on captured ad-detail screenshot evidence.',
      'Support quote or testimonial style cards without copying competitor testimonial content.',
      'Support before/after review patterns for AI output before and after adversarial review.',
      'Support checklist or scoring visuals for confidence-check and review-standard concepts.',
      'Support a large hook plus concrete proof block for direct, adult-to-adult consultant ads.',
      'Use Verbatim pink as an accent only where appropriate, not as a full one-note palette.',
    ],
    humanReviewNotes: [
      'All pattern recommendations require human review before renderer changes.',
      'Captured text and screenshots are source evidence, not permission to copy creative.',
      'Platform labels may remain incomplete when Meta exposes only icon placeholders in text.',
      'Review each reprocessed capture before treating it as a completed research example.',
    ],
    notes: [
      'Analysis is based only on captured and reprocessed Meta Ad Library records.',
      'The analyzer does not call Meta, OpenAI, or image generation APIs.',
      'Longevity is treated as a proxy only, never proof of profitability.',
    ],
  };
}

function formatPatternCounts(patterns: PatternCount[]): string {
  if (patterns.length === 0) {
    return '- No pattern available from current data.';
  }

  return patterns
    .map((pattern) => `- ${pattern.value}: ${pattern.count} record(s). Advertisers: ${pattern.exampleAdvertisers.join(', ')}`)
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
Source mode: ${analysis.sourceMode}
Source capture path: ${analysis.sourceCapturePath ?? 'not used'}
Captures dir: ${analysis.capturesDir ?? 'not used'}
Capture status: ${analysis.captureStatus}

## Data Sufficiency

- Total records read: ${analysis.total_records_read}
- Usable records: ${analysis.usable_records}
- Skipped records: ${analysis.skipped_records}
- Total examples: ${analysis.totalExamples}
- Real examples: ${analysis.realExampleCount}
- Placeholder examples: ${analysis.placeholderExampleCount}
- Sufficient for conclusions: ${analysis.sufficientForConclusions ? 'yes' : 'no'}
- Status: ${analysis.status}

## Repeated Advertisers

${formatPatternCounts(analysis.repeatedAdvertisers)}

## Hook Patterns

${formatPatternCounts(analysis.hookPatterns)}

## Copy Formatting Patterns

${formatPatternCounts(analysis.copyFormattingPatterns)}

## Visual Evidence Available

${formatPatternCounts(analysis.visualEvidenceAvailable)}

## CTA Patterns

${formatPatternCounts(analysis.ctaPatterns)}

## Offer And Framing Patterns

${formatPatternCounts(analysis.offerFramingPatterns)}

## Longevity Signals

${formatPatternCounts(analysis.longevitySignals)}

## Patterns Worth Adapting For Verbatim

${formatBullets(analysis.patternsWorthAdaptingForVerbatim)}

## Patterns To Avoid

${formatBullets(analysis.patternsToAvoid)}

## Recommended Verbatim Template Directions

${formatBullets(analysis.recommendedTemplateDirections)}

## Renderer Implications

${formatBullets(analysis.rendererImplications)}

## Human Review Notes

${formatBullets(analysis.humanReviewNotes)}

## Notes

${formatBullets(analysis.notes)}

## Human Review

- [ ] Captured records reviewed
- [ ] Pattern analysis reviewed
- [ ] Template direction approved before rendering
- [ ] No competitor creative copied
- [ ] No profitability inferred from longevity
`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const capturesDirArg = args.get('--captures-dir');
  const sourceCapturePath = capturesDirArg ? null : resolveCapturePath(process.env.AD_LIBRARY_CAPTURE_PATH);
  const capturesDir = capturesDirArg ? resolvePath(capturesDirArg) : null;
  const records = capturesDir
    ? readCapturesDir(capturesDir)
    : readCaptureFile(sourceCapturePath ?? DEFAULT_CAPTURE_PATH, 'capture_file');
  const analysis = buildAnalysis(records, capturesDir ? 'captures_dir' : 'capture_file', sourceCapturePath, capturesDir);
  const timestamp = analysis.generatedAt.replace(/[:.]/g, '-');
  const outputDir = join(process.cwd(), 'output', `run-${timestamp}`);
  mkdirSync(outputDir, { recursive: true });

  const jsonPath = join(outputDir, 'paid-ads-creative-pattern-analysis.json');
  const markdownPath = join(outputDir, 'paid-ads-creative-pattern-analysis.md');

  writeFileSync(jsonPath, `${JSON.stringify(analysis, null, 2)}\n`, 'utf8');
  writeFileSync(markdownPath, formatMarkdown(analysis), 'utf8');

  console.log('paid_ads_creative_pattern_analysis_json_path:', jsonPath);
  console.log('paid_ads_creative_pattern_analysis_md_path:', markdownPath);
  console.log('total_records_read:', analysis.total_records_read);
  console.log('usable_records:', analysis.usable_records);
  console.log('skipped_records:', analysis.skipped_records);
  console.log('sufficient_for_conclusions:', analysis.sufficientForConclusions ? 'yes' : 'no');
  console.log('status:', analysis.status);
}

main();
