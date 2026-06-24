import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

type PatternCount = {
  value: string;
  count: number;
  exampleAdvertisers: string[];
};

type CreativePatternAnalysis = {
  generatedAt?: string;
  sourceMode?: string;
  total_records_read: number;
  usable_records: number;
  skipped_records: number;
  status: string;
  hookPatterns: PatternCount[];
  copyFormattingPatterns: PatternCount[];
  visualEvidenceAvailable: PatternCount[];
  ctaPatterns: PatternCount[];
  offerFramingPatterns: PatternCount[];
  recommendedTemplateDirections: string[];
  rendererImplications: string[];
};

type CopySlots = {
  hook: string;
  proof_support_line: string;
  body_or_microcopy: string;
  cta_text: string;
  optional_eyebrow: string;
};

type TemplateSpec = {
  template_id: string;
  template_name: string;
  source_pattern_basis: string[];
  why_this_template: string;
  verbatim_concept_fit: string[];
  target_audience: string;
  ratio_support: string[];
  layout_structure: string[];
  copy_slots: CopySlots;
  required_brand_elements: string[];
  allowed_colors: string[];
  logo_usage: string;
  typography_guidance: string[];
  visual_rules: string[];
  forbidden_elements: string[];
  source_evidence_references: string[];
  implementation_notes_for_renderer: string[];
  human_review_checklist: string[];
  approved_for_rendering: false;
};

type TemplateSpecRun = {
  generated_at: string;
  source_analysis_path: string;
  source_analysis_summary: {
    generated_at: string | null;
    source_mode: string | null;
    total_records_read: number;
    usable_records: number;
    skipped_records: number;
    status: string;
  };
  template_count: number;
  templates: TemplateSpec[];
  notes: string[];
};

const FORBIDDEN_OUTPUT_PATTERNS = [
  /truth layer/i,
  /proves correctness/i,
  /guarantees accuracy/i,
  /catches every hallucination/i,
  /you don't know what you're missing/i,
  /you don.t know what you.re missing/i,
  /—/,
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

function validatePatternCount(value: unknown, fieldName: string): PatternCount[] {
  if (!Array.isArray(value)) {
    fail(`Analysis field ${fieldName} must be an array.`);
  }

  return value.map((item, index) => {
    if (!isRecord(item)) {
      fail(`Analysis field ${fieldName}[${index}] must be an object.`);
    }

    if (typeof item.value !== 'string' || typeof item.count !== 'number') {
      fail(`Analysis field ${fieldName}[${index}] must include value and count.`);
    }

    return {
      value: item.value,
      count: item.count,
      exampleAdvertisers: Array.isArray(item.exampleAdvertisers)
        ? item.exampleAdvertisers.map((advertiser) => String(advertiser))
        : [],
    };
  });
}

function validateStringArray(value: unknown, fieldName: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    fail(`Analysis field ${fieldName} must be an array of strings.`);
  }

  return value.map((item) => String(item));
}

function validateAnalysis(value: unknown): CreativePatternAnalysis {
  if (!isRecord(value)) {
    fail('Creative pattern analysis must be a JSON object.');
  }

  const totalRecordsRead = value.total_records_read;
  const usableRecords = value.usable_records;
  const skippedRecords = value.skipped_records;

  if (typeof totalRecordsRead !== 'number') {
    fail('Analysis field total_records_read must be a number.');
  }

  if (typeof usableRecords !== 'number') {
    fail('Analysis field usable_records must be a number.');
  }

  if (typeof skippedRecords !== 'number') {
    fail('Analysis field skipped_records must be a number.');
  }

  if (typeof value.status !== 'string') {
    fail('Analysis field status must be a string.');
  }

  const analysis: CreativePatternAnalysis = {
    ...(typeof value.generatedAt === 'string' ? { generatedAt: value.generatedAt } : {}),
    ...(typeof value.sourceMode === 'string' ? { sourceMode: value.sourceMode } : {}),
    total_records_read: totalRecordsRead,
    usable_records: usableRecords,
    skipped_records: skippedRecords,
    status: value.status,
    hookPatterns: validatePatternCount(value.hookPatterns, 'hookPatterns'),
    copyFormattingPatterns: validatePatternCount(value.copyFormattingPatterns, 'copyFormattingPatterns'),
    visualEvidenceAvailable: validatePatternCount(value.visualEvidenceAvailable, 'visualEvidenceAvailable'),
    ctaPatterns: validatePatternCount(value.ctaPatterns, 'ctaPatterns'),
    offerFramingPatterns: validatePatternCount(value.offerFramingPatterns, 'offerFramingPatterns'),
    recommendedTemplateDirections: validateStringArray(value.recommendedTemplateDirections, 'recommendedTemplateDirections'),
    rendererImplications: validateStringArray(value.rendererImplications, 'rendererImplications'),
  };

  if (analysis.usable_records <= 0) {
    fail('Creative pattern analysis has no usable records. Capture and reprocess real ads before generating template specs.');
  }

  return analysis;
}

function findPattern(patterns: PatternCount[], value: string): PatternCount | null {
  return patterns.find((pattern) => pattern.value.toLowerCase() === value.toLowerCase()) ?? null;
}

function formatPattern(pattern: PatternCount | null, fallback: string): string {
  if (!pattern) return fallback;

  const advertiserText =
    pattern.exampleAdvertisers.length > 0 ? ` Advertisers observed: ${pattern.exampleAdvertisers.join(', ')}.` : '';

  return `${pattern.value}: ${pattern.count} captured record(s).${advertiserText}`;
}

function hasDirection(analysis: CreativePatternAnalysis, direction: string): boolean {
  return analysis.recommendedTemplateDirections.some((item) => item.toLowerCase().includes(direction.toLowerCase()));
}

function buildTemplates(analysis: CreativePatternAnalysis, analysisPath: string): TemplateSpec[] {
  const questionLed = findPattern(analysis.hookPatterns, 'question-led problem framing');
  const trustReview = findPattern(analysis.hookPatterns, 'trust-and-review proof framing');
  const multiLine = findPattern(analysis.copyFormattingPatterns, 'multi-line feature list');
  const paragraph = findPattern(analysis.copyFormattingPatterns, 'paragraph primary text with headline support');
  const visualEvidence = findPattern(analysis.visualEvidenceAvailable, 'cropped ad detail screenshot available');
  const learnMore = findPattern(analysis.ctaPatterns, 'Learn more') ?? findPattern(analysis.ctaPatterns, 'Learn More');
  const educationOffer = findPattern(analysis.offerFramingPatterns, 'education-led learn-more offer');

  return [
    {
      template_id: 'large-hook-plus-proof-block',
      template_name: 'Large Hook Plus Proof Block',
      source_pattern_basis: [
        formatPattern(questionLed, 'Question-led problem framing was recommended by the analysis.'),
        formatPattern(paragraph, 'Paragraph primary text with headline support appeared in captured records.'),
        'Renderer implication: large hook plus concrete proof block.',
        formatPattern(learnMore, 'Learn-more CTAs appeared in captured records.'),
      ],
      why_this_template:
        'This is the cleanest first Verbatim template because it turns the strongest consultant question into a simple visual hierarchy without pretending to show product UI.',
      verbatim_concept_fit: ['confidence-check', 'AI-draft-risk', 'workflow-before-action'],
      target_audience: 'Independent and boutique consultants using AI for client-facing work.',
      ratio_support: ['1:1'],
      layout_structure: [
        'Top section: one large question-led hook using black ink on white or off-white.',
        'Middle or lower proof block: two or three short review-oriented support lines.',
        'Footer: Verbatim logo, small positioning line, and restrained pink accent.',
      ],
      copy_slots: {
        hook: 'Question-led hook about confident AI output or client-facing review.',
        proof_support_line: 'Short support line using checks before action, review before the client sees it, or pressure-tests client-facing work.',
        body_or_microcopy: 'One concise line explaining that Verbatim challenges confident AI output before use.',
        cta_text: 'Try Verbatim or Learn more.',
        optional_eyebrow: 'Adversarial review for AI.',
      },
      required_brand_elements: [
        'Use brand/verbatim/logo-pink.png on light backgrounds.',
        'Use brand pink #f12258 only as a thin accent or small highlight.',
        'Keep a visible Verbatim brand mark without overpowering the hook.',
      ],
      allowed_colors: ['#ffffff', '#fafafa', '#0a0a0a', '#111111', '#333333', '#555555', '#e8e8e8', '#f12258', '#fff0f2'],
      logo_usage:
        'Place the logo in a consistent footer or lower-left position. Use the pink logo on light backgrounds and avoid recoloring the asset.',
      typography_guidance: [
        'Use a large, mobile-readable headline.',
        'Keep line breaks intentional and avoid tiny proof text.',
        'Use restrained business-publication typography rather than SaaS dashboard styling.',
      ],
      visual_rules: [
        'Use white or off-white space as the main field.',
        'Keep the proof block visually secondary to the hook.',
        'Use one pink accent line or bracket, not a hot-pink background.',
      ],
      forbidden_elements: [
        'No fake UI.',
        'No fake metrics.',
        'No fake customer logos.',
        'No robots.',
        'No absolute correctness claims.',
        'No copied competitor layout.',
      ],
      source_evidence_references: [
        analysisPath,
        'Pattern: question-led problem framing.',
        'Pattern: paragraph primary text with headline support.',
        'Renderer implication: large hook plus concrete proof block.',
      ],
      implementation_notes_for_renderer: [
        'Renderer needs headline text wrapping for 1080x1080.',
        'Renderer needs a proof-block component with two or three short lines.',
        'Renderer should expose logo position, accent line position, and proof block spacing.',
      ],
      human_review_checklist: [
        'Hook is direct and not generic AI hype.',
        'Proof block does not imply guaranteed accuracy.',
        'Text remains readable on mobile.',
        'Logo and pink accent follow brand guidance.',
      ],
      approved_for_rendering: false,
    },
    {
      template_id: 'checklist-or-scoring-visual',
      template_name: 'Checklist Or Scoring Visual',
      source_pattern_basis: [
        formatPattern(multiLine, 'Multi-line feature list appeared in captured records.'),
        formatPattern(trustReview, 'Trust and review language appeared in captured records.'),
        'Renderer implication: checklist or scoring visuals.',
        hasDirection(analysis, 'external-review-standard')
          ? 'Recommended direction present: external-review-standard.'
          : 'Recommended direction inferred from review-standard patterns.',
      ],
      why_this_template:
        'The checklist format makes review visible without turning the ad into fake product UI. It can show what gets challenged before work reaches a client.',
      verbatim_concept_fit: ['external-review-standard', 'confidence-check', 'reviewer-saves-you-later'],
      target_audience: 'Consultants and client-service operators who need a review standard for AI-assisted deliverables.',
      ratio_support: ['1:1'],
      layout_structure: [
        'Left or top: compact question-led hook.',
        'Main card: illustrative review checklist with three to five rows.',
        'Footer: Verbatim logo and small positioning line.',
      ],
      copy_slots: {
        hook: 'Short question about what checked the AI answer.',
        proof_support_line: 'Illustrative checklist labels such as claim, assumption, risk, missing counterpoint, and client impact.',
        body_or_microcopy: 'Small line that the checklist is illustrative, not a product screenshot.',
        cta_text: 'Pressure-test the work.',
        optional_eyebrow: 'Checks before action.',
      },
      required_brand_elements: [
        'Use brand/verbatim/logo-pink.png on light backgrounds.',
        'Use black or near-black type.',
        'Use #f12258 only for check marks, a small score accent, or the active review row.',
      ],
      allowed_colors: ['#ffffff', '#fafafa', '#0a0a0a', '#111111', '#333333', '#555555', '#e8e8e8', '#f12258', '#fff0f2'],
      logo_usage:
        'Keep the logo small and stable, preferably lower left or lower right. Do not place it inside the illustrative checklist.',
      typography_guidance: [
        'Use clear labels, not dense paragraphs.',
        'Keep checklist row text large enough for mobile.',
        'Avoid compliance-software typography and heavy table styling.',
      ],
      visual_rules: [
        'Label the checklist as illustrative if it resembles an interface.',
        'Use simple rows, borders, and one accent color.',
        'Avoid fake scores that imply measured performance.',
      ],
      forbidden_elements: [
        'No fake product screenshot unless explicitly marked illustrative.',
        'No numeric performance score.',
        'No total-coverage claims.',
        'No competitor branding.',
        'No copied feature-list wording from captured ads.',
      ],
      source_evidence_references: [
        analysisPath,
        'Pattern: multi-line feature list.',
        'Pattern: trust-and-review proof framing.',
        'Renderer implication: checklist/scoring visual.',
      ],
      implementation_notes_for_renderer: [
        'Renderer needs a reusable checklist-card component.',
        'Renderer needs a safe illustrative label option.',
        'Renderer should support row icons using simple vector shapes or text, not external icon dependencies.',
      ],
      human_review_checklist: [
        'Checklist is clearly illustrative if it resembles UI.',
        'No fake metric or score appears.',
        'The review rows map to real Verbatim wedge language.',
        'The ad still reads as direct and adult-to-adult.',
      ],
      approved_for_rendering: false,
    },
    {
      template_id: 'before-client-review-workflow',
      template_name: 'Before Client Review Workflow',
      source_pattern_basis: [
        hasDirection(analysis, 'before-client-review')
          ? 'Recommended direction present: before-client-review.'
          : 'Before-client-review direction is aligned with Verbatim paid test strategy.',
        hasDirection(analysis, 'workflow-before-action')
          ? 'Recommended direction present: workflow-before-action.'
          : 'Workflow-before-action direction is aligned with renderer implications.',
        formatPattern(educationOffer, 'Education-led learn-more offers appeared in captured records.'),
        'Renderer implication: before/after review pattern.',
      ],
      why_this_template:
        'This template visualizes the missing step between AI output and client action, which is the clearest bridge from captured workflow ads to Verbatim positioning.',
      verbatim_concept_fit: ['before-client-review', 'workflow-before-action', 'AI-draft-risk'],
      target_audience: 'Independent consultants, boutique firms, and AI-forward client-service professionals.',
      ratio_support: ['1:1'],
      layout_structure: [
        'Three-step visual: AI draft -> adversarial review -> client-ready decision point.',
        'Use the pink accent only on the review step.',
        'Place a short hook above or beside the workflow.',
        'Footer carries logo and CTA.',
      ],
      copy_slots: {
        hook: 'Question about who pushes back before the client sees the work.',
        proof_support_line: 'Review before the client sees it.',
        body_or_microcopy: 'Verbatim pressure-tests client-facing AI work before action.',
        cta_text: 'Add a review step.',
        optional_eyebrow: 'Client-facing AI work needs challenge.',
      },
      required_brand_elements: [
        'Use brand/verbatim/logo-pink.png on light backgrounds.',
        'Use #f12258 only to identify the review step.',
        'Keep the rest of the workflow neutral and understated.',
      ],
      allowed_colors: ['#ffffff', '#fafafa', '#0a0a0a', '#111111', '#333333', '#555555', '#e8e8e8', '#f12258', '#fff0f2'],
      logo_usage:
        'Place the logo outside the workflow diagram. The logo should not become one of the workflow nodes.',
      typography_guidance: [
        'Use short node labels and a larger hook.',
        'Do not use tiny process text.',
        'Use enough spacing for the workflow to remain legible in feed.',
      ],
      visual_rules: [
        'Workflow must be visibly illustrative.',
        'Use simple arrows or connectors.',
        'Do not show fake client names, fake reports, or fake approval stamps.',
      ],
      forbidden_elements: [
        'No fake client deliverables.',
        'No fake approval badge.',
        'No guarantee language.',
        'No enterprise compliance look.',
        'No exact competitor layout recreation.',
      ],
      source_evidence_references: [
        analysisPath,
        'Recommended direction: before-client-review.',
        'Recommended direction: workflow-before-action.',
        'Renderer implication: before/after review pattern.',
      ],
      implementation_notes_for_renderer: [
        'Renderer needs a three-node workflow layout.',
        'Renderer should support accenting one node only.',
        'Renderer needs safeguards for label length and mobile readability.',
      ],
      human_review_checklist: [
        'Workflow reads as the missing review step, not as automation magic.',
        'No customer-facing copy uses generic AI hype.',
        'No unsupported promise appears.',
        'Pink is an accent only.',
      ],
      approved_for_rendering: false,
    },
  ];
}

function assertSafeOutput(run: TemplateSpecRun): void {
  if (run.templates.length < 2 || run.templates.length > 3) {
    fail(`Expected 2 or 3 template specs. Generated ${run.templates.length}.`);
  }

  if (run.templates.some((template) => template.approved_for_rendering !== false)) {
    fail('Every template must be gated with approved_for_rendering: false.');
  }

  const serialized = JSON.stringify(run);

  for (const pattern of FORBIDDEN_OUTPUT_PATTERNS) {
    if (pattern.test(serialized)) {
      fail(`Generated template specs contain forbidden language: ${pattern.toString()}`);
    }
  }
}

function formatBullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function formatCopySlots(copySlots: CopySlots): string {
  return [
    `- Hook: ${copySlots.hook}`,
    `- Proof/support line: ${copySlots.proof_support_line}`,
    `- Body or microcopy: ${copySlots.body_or_microcopy}`,
    `- CTA text: ${copySlots.cta_text}`,
    `- Optional eyebrow: ${copySlots.optional_eyebrow}`,
  ].join('\n');
}

function formatTemplate(template: TemplateSpec): string {
  return `## ${template.template_name}

- Template ID: ${template.template_id}
- Approved for rendering: ${template.approved_for_rendering}
- Target audience: ${template.target_audience}
- Ratio support: ${template.ratio_support.join(', ')}

### Source Pattern Basis

${formatBullets(template.source_pattern_basis)}

### Why This Template

${template.why_this_template}

### Verbatim Concept Fit

${formatBullets(template.verbatim_concept_fit)}

### Layout Structure

${formatBullets(template.layout_structure)}

### Copy Slots

${formatCopySlots(template.copy_slots)}

### Required Brand Elements

${formatBullets(template.required_brand_elements)}

### Allowed Colors

${formatBullets(template.allowed_colors)}

### Logo Usage

${template.logo_usage}

### Typography Guidance

${formatBullets(template.typography_guidance)}

### Visual Rules

${formatBullets(template.visual_rules)}

### Forbidden Elements

${formatBullets(template.forbidden_elements)}

### Source Evidence References

${formatBullets(template.source_evidence_references)}

### Implementation Notes For Renderer

${formatBullets(template.implementation_notes_for_renderer)}

### Human Review Checklist

${template.human_review_checklist.map((item) => `- [ ] ${item}`).join('\n')}
`;
}

function formatMarkdown(run: TemplateSpecRun): string {
  return `# Paid Ads Template Specs

Generated at: ${run.generated_at}
Source analysis path: ${run.source_analysis_path}

## Analysis Summary

- Analysis generated at: ${run.source_analysis_summary.generated_at ?? 'unknown'}
- Source mode: ${run.source_analysis_summary.source_mode ?? 'unknown'}
- Total records read: ${run.source_analysis_summary.total_records_read}
- Usable records: ${run.source_analysis_summary.usable_records}
- Skipped records: ${run.source_analysis_summary.skipped_records}
- Analysis status: ${run.source_analysis_summary.status}
- Template specs generated: ${run.template_count}

## Render Gate

These specs are not approved for rendering by default.

${run.templates.map(formatTemplate).join('\n')}

## Notes

${formatBullets(run.notes)}

## Human Approval

- [ ] Template families reviewed
- [ ] Source pattern basis accepted
- [ ] Brand guidance accepted
- [ ] Approved templates selected for renderer implementation
- [ ] No images generated from this file without explicit approval
`;
}

function buildRun(analysisPath: string, analysis: CreativePatternAnalysis): TemplateSpecRun {
  const generatedAt = new Date().toISOString();
  const templates = buildTemplates(analysis, analysisPath);
  const run: TemplateSpecRun = {
    generated_at: generatedAt,
    source_analysis_path: analysisPath,
    source_analysis_summary: {
      generated_at: analysis.generatedAt ?? null,
      source_mode: analysis.sourceMode ?? null,
      total_records_read: analysis.total_records_read,
      usable_records: analysis.usable_records,
      skipped_records: analysis.skipped_records,
      status: analysis.status,
    },
    template_count: templates.length,
    templates,
    notes: [
      'Template specs are derived from captured Meta Ad Library pattern analysis, not copied competitor creative.',
      'Longevity and active status are not treated as proof of profitability.',
      'Each template remains human-gated with approved_for_rendering: false.',
      'No images were generated by this script.',
    ],
  };

  assertSafeOutput(run);

  return run;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const rawAnalysisPath = args.get('--analysis-path');

  if (!rawAnalysisPath) {
    fail('Missing required --analysis-path argument.');
  }

  const analysisPath = resolvePath(rawAnalysisPath);

  if (!existsSync(analysisPath)) {
    fail(`Creative pattern analysis file does not exist: ${analysisPath}`);
  }

  const analysis = validateAnalysis(readJson(analysisPath));
  const run = buildRun(analysisPath, analysis);
  const timestamp = run.generated_at.replace(/[:.]/g, '-');
  const outputDir = join(process.cwd(), 'output', `run-${timestamp}`);
  mkdirSync(outputDir, { recursive: true });

  const jsonPath = join(outputDir, 'paid-ads-template-specs.json');
  const markdownPath = join(outputDir, 'paid-ads-template-specs.md');

  writeFileSync(jsonPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
  writeFileSync(markdownPath, formatMarkdown(run), 'utf8');

  console.log('paid_ads_template_specs_json_path:', jsonPath);
  console.log('paid_ads_template_specs_md_path:', markdownPath);
  console.log('template_count:', run.template_count);
  console.log('template_families:', run.templates.map((template) => template.template_id).join(', '));
  console.log('approved_for_rendering:', run.templates.every((template) => template.approved_for_rendering === false) ? 'false_for_all' : 'check_required');
}

main();
