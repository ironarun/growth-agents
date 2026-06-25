import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type LifecycleGates = {
  approved_for_generation: false;
  generated_asset_path: null;
  approved_for_upload: false;
  uploaded_to_meta: false;
  meta_ad_id: null;
  human_review_required: true;
};

type ConceptDefinition = {
  concept_id: string;
  concept_name: string;
  template_id: string;
  style_id: 'editorial-collage';
  recommended_output_filename: string;
  exact_required_text: {
    kicker: string;
    headline: string;
    handwritten_note: string;
    document_annotations: string[];
    review_card: {
      heading: string;
      lines: string[];
    };
    positioning: string;
    cta: string;
  };
  art_direction: string[];
  composition_requirements: string[];
  negative_constraints: string[];
  prompt: string;
  qa_checklist: string[];
  lifecycle_gates: LifecycleGates;
};

type RenderBriefsFile = {
  generated_at: string;
  style_id: 'editorial-collage';
  concept_id: string;
  ratio: '1:1';
  target_dimensions: {
    width: 1080;
    height: 1080;
  };
  source_docs_used: string[];
  brand_colors: {
    primary_pink: '#f12258';
    pink_surface: '#fff0f2';
    deep_pink: '#d4154d';
    ink: '#0a0a0a';
    white: '#ffffff';
    off_white: '#fafafa';
    border: '#e8e8e8';
  };
  logo_assets_to_use: string[];
  briefs: ConceptDefinition[];
};

const STYLE_ID = 'editorial-collage';
const TEMPLATE_ID = 'large-hook-plus-proof-block';

const SOURCE_DOCS = [
  'docs/PAID-ADS-FIRST-TEST-PACKET-2026-06-21.md',
  'docs/PAID-ADS-FIRST-FLIGHT-ASSET-SPECS-2026-06-21.md',
  'output/run-2026-06-24T05-42-54-161Z/paid-ads-template-specs.json',
  'brand/verbatim/brand-guide.md',
  'brand/verbatim/brand-colors.md',
  'docs/VERBATIM-BRAND-ASSET-REFERENCE-2026-06-22.md',
];

const LOGO_ASSETS = [
  'brand/verbatim/logo-pink.png',
  'brand/verbatim/logo-white.png',
];

const BRAND_COLORS = {
  primary_pink: '#f12258',
  pink_surface: '#fff0f2',
  deep_pink: '#d4154d',
  ink: '#0a0a0a',
  white: '#ffffff',
  off_white: '#fafafa',
  border: '#e8e8e8',
} as const;

const SHARED_ART_DIRECTION = [
  'Premium editorial collage for a paid social image.',
  'Off-white, ivory, and blush surfaces with paper texture feeling.',
  'Verbatim pink #f12258 used confidently but not as a hot-pink poster.',
  'Large editorial serif headline with mobile-readable hierarchy.',
  'Draft or report sheet in the background, treated as illustrative and not fake client work.',
  'Pink margin-review annotations, review marks, brackets, circles, or underlines.',
  'Pink review note card or review slip with short checks.',
  'Subtle shadows and layering.',
  'Polished paid social creative for consultants.',
  'Editorial magazine plus creative studio, not SaaS dashboard.',
];

const SHARED_NEGATIVE_CONSTRAINTS = [
  'No fake UI dashboard.',
  'No fake metrics.',
  'No fake customer names.',
  'No fake approval stamp.',
  'No robots.',
  'No stock people.',
  'No truth layer language.',
  'No correctness guarantee.',
  'No copied competitor layouts.',
  'No em dashes in customer-facing copy.',
  'No unreadable tiny text.',
  'Do not imply Verbatim proves correctness.',
  'Do not invent or approximate the Verbatim logo.',
];

const SHARED_QA_CHECKLIST = [
  'Required visible text is present exactly.',
  'Bottom-left footer area is clean enough for official logo overlay.',
  'No generated or approximated Verbatim logo appears.',
  'The image remains readable at mobile feed size.',
  'Pink feels like a Verbatim review layer, not a hot-pink poster.',
  'No fake UI, fake metrics, fake customer names, or fake approval stamp.',
  'No truth-layer, correctness guarantee, or deprecated hook language.',
  'Asset remains review-gated before generation, upload, or spend.',
];

function lifecycleGates(): LifecycleGates {
  return {
    approved_for_generation: false,
    generated_asset_path: null,
    approved_for_upload: false,
    uploaded_to_meta: false,
    meta_ad_id: null,
    human_review_required: true,
  };
}

function promptFor(concept: {
  name: string;
  headline: string;
  handwrittenNote: string;
  annotations: string[];
  reviewHeading: string;
  reviewLines: string[];
}): string {
  return [
    `Create a 1:1 1080x1080 static Meta paid ad image for Verbatim, a product positioned as adversarial review for AI.`,
    `Use a premium editorial collage style for consultants: off-white, ivory, and blush background, paper texture feeling, layered draft or report sheet, subtle shadows, large editorial serif headline, and Verbatim pink #f12258 as a confident review-layer accent.`,
    `Required kicker text: "FOR CLIENT-FACING AI WORK".`,
    `Required headline text: "${concept.headline}".`,
    `Required handwritten note text: "${concept.handwrittenNote}".`,
    `Required document annotation text: "${concept.annotations.join('" and "')}".`,
    `Required review card heading: "${concept.reviewHeading}".`,
    `Required review card lines: "${concept.reviewLines.join('", "')}".`,
    `Required positioning text: "Adversarial review for AI".`,
    `Required CTA text: "Try Verbatim".`,
    `Leave a clean bottom-left footer area for the official Verbatim logo to be added later. Do not invent or approximate the logo.`,
    `Composition: large black serif headline on the left, illustrative tilted draft or report sheet on the right, pink margin-review annotations, pink review note card in the lower right, logo-safe footer area bottom left, CTA lower right.`,
    `The visual should feel like editorial magazine plus creative studio, not SaaS dashboard or enterprise compliance software.`,
    `Avoid fake UI, fake metrics, fake customer names, fake approval stamps, robots, stock people, copied competitor layouts, tiny unreadable text, truth layer language, and any claim that Verbatim proves correctness or guarantees accuracy.`,
  ].join(' ');
}

const CONCEPTS: Record<string, Omit<ConceptDefinition, 'prompt' | 'lifecycle_gates'>> = {
  'concept-01-confident-draft': {
    concept_id: 'concept-01-confident-draft',
    concept_name: 'Confident Draft',
    template_id: TEMPLATE_ID,
    style_id: STYLE_ID,
    recommended_output_filename: 'verbatim_meta_01_confident-draft_editorial-collage_generated-candidate_1x1_v01.png',
    exact_required_text: {
      kicker: 'FOR CLIENT-FACING AI WORK',
      headline: 'The draft sounds finished. Has anyone challenged it?',
      handwritten_note: 'challenge before action',
      document_annotations: ['Too certain?', 'what is missing?'],
      review_card: {
        heading: 'BEFORE CLIENT USE, VERBATIM CHECKS:',
        lines: ['weak claims', 'missing counterpoints', 'overconfident reasoning'],
      },
      positioning: 'Adversarial review for AI',
      cta: 'Try Verbatim',
    },
    art_direction: SHARED_ART_DIRECTION,
    composition_requirements: [
      'Large serif headline dominates the left side.',
      'Illustrative draft sheet sits behind the review card.',
      'Review card contrasts confident draft with challenged-before-use framing.',
      'Footer reserves bottom-left logo area for official logo overlay.',
    ],
    negative_constraints: SHARED_NEGATIVE_CONSTRAINTS,
    qa_checklist: SHARED_QA_CHECKLIST,
  },
  'concept-02-before-the-client': {
    concept_id: 'concept-02-before-the-client',
    concept_name: 'Before The Client',
    template_id: TEMPLATE_ID,
    style_id: STYLE_ID,
    recommended_output_filename: 'verbatim_meta_02_before-the-client_editorial-collage_generated-candidate_1x1_v01.png',
    exact_required_text: {
      kicker: 'FOR CLIENT-FACING AI WORK',
      headline: 'Before the client sees it, who pushes back?',
      handwritten_note: 'review before delivery',
      document_annotations: ['client version?', 'push back here'],
      review_card: {
        heading: 'BEFORE DELIVERY, VERBATIM CHECKS:',
        lines: ['unsupported claims', 'weak assumptions', 'client-facing risk'],
      },
      positioning: 'Adversarial review for AI',
      cta: 'Try Verbatim',
    },
    art_direction: SHARED_ART_DIRECTION,
    composition_requirements: [
      'Make the client-facing moment feel like the threshold.',
      'Use an illustrative draft or deliverable sheet without fake client names.',
      'Show the review card interrupting the path from draft to client version.',
      'Footer reserves bottom-left logo area for official logo overlay.',
    ],
    negative_constraints: SHARED_NEGATIVE_CONSTRAINTS,
    qa_checklist: SHARED_QA_CHECKLIST,
  },
  'concept-04-sounds-ready': {
    concept_id: 'concept-04-sounds-ready',
    concept_name: 'Sounds Ready',
    template_id: TEMPLATE_ID,
    style_id: STYLE_ID,
    recommended_output_filename: 'verbatim_meta_04_sounds-ready_editorial-collage_generated-candidate_1x1_v01.png',
    exact_required_text: {
      kicker: 'FOR CLIENT-FACING AI WORK',
      headline: 'Your AI sounds ready. Is it?',
      handwritten_note: 'confidence is not review',
      document_annotations: ['sounds finished', 'not checked'],
      review_card: {
        heading: 'BEFORE YOU ACT, VERBATIM CHECKS:',
        lines: ['confident claims', 'missing caveats', 'thin reasoning'],
      },
      positioning: 'Adversarial review for AI',
      cta: 'Try Verbatim',
    },
    art_direction: SHARED_ART_DIRECTION,
    composition_requirements: [
      'Contrast polished confidence with visible review pressure.',
      'Make the annotation layer feel like the missing challenge step.',
      'Keep the headline short, sharp, and dominant.',
      'Footer reserves bottom-left logo area for official logo overlay.',
    ],
    negative_constraints: SHARED_NEGATIVE_CONSTRAINTS,
    qa_checklist: SHARED_QA_CHECKLIST,
  },
  'concept-07-missing-disagreement': {
    concept_id: 'concept-07-missing-disagreement',
    concept_name: 'Missing Disagreement',
    template_id: TEMPLATE_ID,
    style_id: STYLE_ID,
    recommended_output_filename: 'verbatim_meta_07_missing-disagreement_editorial-collage_generated-candidate_1x1_v01.png',
    exact_required_text: {
      kicker: 'FOR CLIENT-FACING AI WORK',
      headline: 'What part of your AI workflow disagrees with you?',
      handwritten_note: 'build in disagreement',
      document_annotations: ['who pushes back?', 'argue the other side'],
      review_card: {
        heading: 'VERBATIM ADDS DISAGREEMENT AROUND:',
        lines: ['assumptions', 'recommendations', 'reasoning gaps'],
      },
      positioning: 'Adversarial review for AI',
      cta: 'Try Verbatim',
    },
    art_direction: SHARED_ART_DIRECTION,
    composition_requirements: [
      'Make disagreement feel like a useful workflow layer, not a fight.',
      'Use pink annotation marks to signal pushback inside the AI workflow.',
      'Avoid meme tone or angry argument imagery.',
      'Footer reserves bottom-left logo area for official logo overlay.',
    ],
    negative_constraints: SHARED_NEGATIVE_CONSTRAINTS,
    qa_checklist: SHARED_QA_CHECKLIST,
  },
};

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

function buildConcept(rawConcept: string): ConceptDefinition {
  const base = CONCEPTS[rawConcept];

  if (!base) {
    fail(`Unsupported --concept ${rawConcept}. Supported concepts: ${Object.keys(CONCEPTS).join(', ')}.`);
  }

  return {
    ...base,
    prompt: promptFor({
      name: base.concept_name,
      headline: base.exact_required_text.headline,
      handwrittenNote: base.exact_required_text.handwritten_note,
      annotations: base.exact_required_text.document_annotations,
      reviewHeading: base.exact_required_text.review_card.heading,
      reviewLines: base.exact_required_text.review_card.lines,
    }),
    lifecycle_gates: lifecycleGates(),
  };
}

function assertLogoReservationLanguage(brief: ConceptDefinition): void {
  const required = 'Leave a clean bottom-left footer area for the official Verbatim logo to be added later. Do not invent or approximate the logo.';

  if (!brief.prompt.includes(required)) {
    fail('Prompt is missing official logo reservation language.');
  }
}

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function formatMarkdown(file: RenderBriefsFile): string {
  const brief = file.briefs[0];

  if (!brief) {
    fail('Cannot format markdown without a brief.');
  }

  return `# Paid Ads Image Render Brief

Generated at: ${file.generated_at}
Concept ID: ${brief.concept_id}
Concept name: ${brief.concept_name}
Template ID: ${brief.template_id}
Style ID: ${brief.style_id}
Ratio: ${file.ratio}
Target dimensions: ${file.target_dimensions.width}x${file.target_dimensions.height}
Recommended output filename: ${brief.recommended_output_filename}

## Source Docs Used

${formatList(file.source_docs_used)}

## Brand Colors

- Primary pink: ${file.brand_colors.primary_pink}
- Pink surface: ${file.brand_colors.pink_surface}
- Deep pink: ${file.brand_colors.deep_pink}
- Ink: ${file.brand_colors.ink}
- White: ${file.brand_colors.white}
- Off-white: ${file.brand_colors.off_white}
- Border: ${file.brand_colors.border}

## Logo Assets To Use

${formatList(file.logo_assets_to_use)}

## Exact Required Text

- Kicker: ${brief.exact_required_text.kicker}
- Headline: ${brief.exact_required_text.headline}
- Handwritten note: ${brief.exact_required_text.handwritten_note}
- Document annotation 1: ${brief.exact_required_text.document_annotations[0]}
- Document annotation 2: ${brief.exact_required_text.document_annotations[1]}
- Review card heading: ${brief.exact_required_text.review_card.heading}
- Review card line 1: ${brief.exact_required_text.review_card.lines[0]}
- Review card line 2: ${brief.exact_required_text.review_card.lines[1]}
- Review card line 3: ${brief.exact_required_text.review_card.lines[2]}
- Positioning: ${brief.exact_required_text.positioning}
- CTA: ${brief.exact_required_text.cta}

## Art Direction

${formatList(brief.art_direction)}

## Composition Requirements

${formatList(brief.composition_requirements)}

## Negative Constraints

${formatList(brief.negative_constraints)}

## Paste-Ready Image Model Prompt

${brief.prompt}

## QA Checklist

${brief.qa_checklist.map((item) => `- [ ] ${item}`).join('\n')}

## Lifecycle Gates

- Approved for generation: ${brief.lifecycle_gates.approved_for_generation}
- Generated asset path: ${brief.lifecycle_gates.generated_asset_path ?? 'null'}
- Approved for upload: ${brief.lifecycle_gates.approved_for_upload}
- Uploaded to Meta: ${brief.lifecycle_gates.uploaded_to_meta}
- Meta ad ID: ${brief.lifecycle_gates.meta_ad_id ?? 'null'}
- Human review required: ${brief.lifecycle_gates.human_review_required}
`;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const style = args.get('--style');
  const conceptId = args.get('--concept');

  if (style !== STYLE_ID) {
    fail(`This generator currently supports --style ${STYLE_ID}.`);
  }

  if (!conceptId) {
    fail(`Missing required argument --concept. Supported concepts: ${Object.keys(CONCEPTS).join(', ')}.`);
  }

  const brief = buildConcept(conceptId);
  assertLogoReservationLanguage(brief);

  const generatedAt = new Date().toISOString();
  const outputDir = join(process.cwd(), 'output', `run-${generatedAt.replace(/[:.]/g, '-')}`);
  mkdirSync(outputDir, { recursive: true });

  const file: RenderBriefsFile = {
    generated_at: generatedAt,
    style_id: STYLE_ID,
    concept_id: brief.concept_id,
    ratio: '1:1',
    target_dimensions: {
      width: 1080,
      height: 1080,
    },
    source_docs_used: SOURCE_DOCS,
    brand_colors: BRAND_COLORS,
    logo_assets_to_use: LOGO_ASSETS,
    briefs: [brief],
  };

  const jsonPath = join(outputDir, 'paid-ads-image-render-briefs.json');
  const mdPath = join(outputDir, 'paid-ads-image-render-briefs.md');

  writeFileSync(jsonPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  writeFileSync(mdPath, formatMarkdown(file), 'utf8');

  console.log('paid_ads_image_render_briefs_json_path:', jsonPath);
  console.log('paid_ads_image_render_briefs_md_path:', mdPath);
  console.log('concept_id:', brief.concept_id);
  console.log('concept_name:', brief.concept_name);
  console.log('style_id:', brief.style_id);
  console.log('recommended_output_filename:', brief.recommended_output_filename);
  console.log('logo_reservation_language_present:', brief.prompt.includes('Do not invent or approximate the logo') ? 'yes' : 'no');
  console.log('approved_for_generation:', brief.lifecycle_gates.approved_for_generation);
  console.log('approved_for_upload:', brief.lifecycle_gates.approved_for_upload);
  console.log('uploaded_to_meta:', brief.lifecycle_gates.uploaded_to_meta);
  console.log('meta_ad_id:', brief.lifecycle_gates.meta_ad_id ?? 'null');
  console.log('human_review_required:', brief.lifecycle_gates.human_review_required);
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
