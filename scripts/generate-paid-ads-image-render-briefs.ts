import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Ratio = '1:1' | '4:5' | '9:16' | '1.91:1';

type LifecycleGates = {
  approved_for_generation: false;
  generated_asset_path: null;
  approved_for_upload: false;
  uploaded_to_meta: false;
  meta_ad_id: null;
  human_review_required: true;
};

type Dimensions = {
  width: number;
  height: number;
};

type ConceptDefinition = {
  concept_id: string;
  concept_name: string;
  template_id: string;
  style_id: 'editorial-collage';
  source_selected_asset_path: string;
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
  copy_source_note: string;
};

type PlacementBrief = ConceptDefinition & {
  ratio: Ratio;
  target_dimensions: Dimensions;
  recommended_output_filename: string;
  placement_strategy: string[];
  safe_zone_requirements: string[];
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
  requested_concept: string;
  requested_ratios: Ratio[];
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
  first_flight_logo_standard: {
    logo_asset: 'brand/verbatim/logo-pink.png';
    base_canvas: '1080x1080';
    base_logo_width: 276;
    base_logo_x: 41;
    base_logo_y: 997;
    placement_note: string;
  };
  briefs: PlacementBrief[];
  recommendation: {
    include_191x1: false;
    reason: string;
  };
  motion_spec: {
    duration_seconds: string;
    principle: string;
    allowed_motion: string[];
    forbidden_motion: string[];
    status: 'planned_not_built';
  };
};

const STYLE_ID = 'editorial-collage';
const TEMPLATE_ID = 'large-hook-plus-proof-block';

const SOURCE_DOCS = [
  'docs/PAID-ADS-FIRST-TEST-PACKET-2026-06-21.md',
  'docs/PAID-ADS-FIRST-FLIGHT-ASSET-SPECS-2026-06-21.md',
  'data/paid-ads/selected-assets/first-flight-selected-assets-2026-06-30.json',
  'data/paid-ads/meta-upload-packets/first-flight-meta-upload-packet-2026-07-01.json',
  'docs/PAID-ADS-LOGO-STANDARD-2026-07-01.md',
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

const SUPPORTED_RATIOS: Ratio[] = ['1:1', '4:5', '9:16', '1.91:1'];
const DEFAULT_RATIOS: Ratio[] = ['1:1'];
const FIRST_FLIGHT_CONCEPTS = [
  'concept-01-confident-draft',
  'concept-02-before-the-client',
  'concept-04-sounds-ready',
  'concept-07-missing-disagreement',
];

const SHARED_ART_DIRECTION = [
  'Premium editorial collage for a paid social image.',
  'Light/pink editorial direction with off-white, ivory, and selective blush surfaces.',
  'Verbatim pink #f12258 used as a confident review-layer accent, not as a hot-pink poster.',
  'Large editorial serif headline with strong black contrast and mobile-readable hierarchy.',
  'Layered paper or draft/report sheet, treated as illustrative and not fake client work.',
  'Pink margin-review annotations, review marks, brackets, circles, or underlines.',
  'Clean review note card or review slip with short checks.',
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
  'No black-background version.',
  'No truth layer language.',
  'No correctness guarantee.',
  'No copied competitor layouts.',
  'No em dashes in customer-facing copy.',
  'No unreadable tiny text.',
  'Do not imply Verbatim proves correctness.',
  'Do not invent or approximate the Verbatim logo.',
  'Do not rely on Meta auto-cropping as the final asset strategy.',
];

const SHARED_QA_CHECKLIST = [
  'Required visible text is present exactly.',
  'Layout is recomposed for the requested ratio, not cropped from a square asset.',
  'Bottom-left footer area uses or reserves the official Verbatim logo treatment standard.',
  'No generated or approximated Verbatim logo appears.',
  'The image remains readable at mobile placement size.',
  'Pink feels like a Verbatim review layer, not a hot-pink poster.',
  'No fake UI, fake metrics, fake customer names, or fake approval stamp.',
  'No truth-layer, correctness guarantee, deprecated hook, or em dash language.',
  'Asset remains review-gated before generation, upload, or spend.',
];

const CONCEPTS: Record<string, ConceptDefinition> = {
  'concept-01-confident-draft': {
    concept_id: 'concept-01-confident-draft',
    concept_name: 'Confident Draft',
    template_id: TEMPLATE_ID,
    style_id: STYLE_ID,
    source_selected_asset_path: 'assets/paid-ads/selected-candidates/verbatim_meta_01_confident-draft_editorial-collage_selected-candidate-04_finalized-logo_1x1_v01.png',
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
    copy_source_note: 'Uses approved selected Concept 01 copy direction from the first-flight upload packet and selected asset review.',
  },
  'concept-02-before-the-client': {
    concept_id: 'concept-02-before-the-client',
    concept_name: 'Before The Client',
    template_id: TEMPLATE_ID,
    style_id: STYLE_ID,
    source_selected_asset_path: 'assets/paid-ads/selected-candidates/verbatim_meta_02_before-the-client_editorial-collage_selected-candidate-03_finalized-logo_1x1_v01.png',
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
    copy_source_note: 'Uses approved selected Concept 02 copy direction from the first-flight upload packet and selected asset review.',
  },
  'concept-04-sounds-ready': {
    concept_id: 'concept-04-sounds-ready',
    concept_name: 'Polished Is Not Pressure Tested',
    template_id: TEMPLATE_ID,
    style_id: STYLE_ID,
    source_selected_asset_path: 'assets/paid-ads/selected-candidates/verbatim_meta_04_polished-pressure-tested_editorial-collage_selected-candidate-02_official-logo_1x1_v03.png',
    exact_required_text: {
      kicker: 'FOR CLIENT-FACING AI WORK',
      headline: "Your AI work reads polished. That's the problem.",
      handwritten_note: 'Polished is not pressure tested.',
      document_annotations: ['sounds finished', 'not checked'],
      review_card: {
        heading: 'BEFORE YOU ACT, VERBATIM CHECKS:',
        lines: ['confident claims', 'missing caveats', 'thin reasoning'],
      },
      positioning: 'Adversarial review for AI',
      cta: 'Try Verbatim',
    },
    copy_source_note: 'Uses approved selected Concept 04 v03 copy direction from the first-flight selected asset index and upload packet.',
  },
  'concept-07-missing-disagreement': {
    concept_id: 'concept-07-missing-disagreement',
    concept_name: 'Missing Disagreement',
    template_id: TEMPLATE_ID,
    style_id: STYLE_ID,
    source_selected_asset_path: 'assets/paid-ads/selected-candidates/verbatim_meta_07_missing-disagreement_editorial-collage_selected-candidate-01_official-logo_1x1_v03.png',
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
    copy_source_note: 'Uses approved selected Concept 07 copy direction from the first-flight upload packet and selected asset review.',
  },
};

function fail(message: string): never {
  throw new Error(message);
}

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

function dimensionsFor(ratio: Ratio): Dimensions {
  if (ratio === '1:1') return { width: 1080, height: 1080 };
  if (ratio === '4:5') return { width: 1080, height: 1350 };
  if (ratio === '9:16') return { width: 1080, height: 1920 };
  return { width: 1200, height: 628 };
}

function parseRatios(rawRatios: string | undefined): Ratio[] {
  if (!rawRatios) return DEFAULT_RATIOS;

  const ratios = rawRatios.split(',').map((ratio) => ratio.trim()).filter(Boolean);

  if (ratios.length === 0) {
    fail('At least one ratio is required.');
  }

  return ratios.map((ratio) => {
    if (!SUPPORTED_RATIOS.includes(ratio as Ratio)) {
      fail(`Unsupported ratio ${ratio}. Supported ratios: ${SUPPORTED_RATIOS.join(', ')}.`);
    }

    return ratio as Ratio;
  });
}

function conceptsFor(rawConcept: string): ConceptDefinition[] {
  if (rawConcept === 'all-first-flight') {
    return FIRST_FLIGHT_CONCEPTS.map((conceptId) => {
      const concept = CONCEPTS[conceptId];

      if (!concept) fail(`Missing configured concept ${conceptId}.`);
      return concept;
    });
  }

  const concept = CONCEPTS[rawConcept];

  if (!concept) {
    fail(`Unsupported --concept ${rawConcept}. Supported concepts: ${FIRST_FLIGHT_CONCEPTS.join(', ')} or all-first-flight.`);
  }

  return [concept];
}

function conceptNumber(conceptId: string): string {
  const match = /^concept-(\d+)/.exec(conceptId);
  return match?.[1] ?? 'xx';
}

function filenameSlug(concept: ConceptDefinition): string {
  if (concept.concept_id === 'concept-01-confident-draft') return 'confident-draft';
  if (concept.concept_id === 'concept-02-before-the-client') return 'before-the-client';
  if (concept.concept_id === 'concept-04-sounds-ready') return 'polished-pressure-tested';
  if (concept.concept_id === 'concept-07-missing-disagreement') return 'missing-disagreement';
  return concept.concept_id.replace(/^concept-\d+-/, '');
}

function ratioSlug(ratio: Ratio): string {
  if (ratio === '1:1') return '1x1';
  if (ratio === '4:5') return '4x5';
  if (ratio === '9:16') return '9x16';
  return '191x1';
}

function recommendedFilename(concept: ConceptDefinition, ratio: Ratio): string {
  return `verbatim_meta_${conceptNumber(concept.concept_id)}_${filenameSlug(concept)}_editorial-collage_${ratioSlug(ratio)}_v01.png`;
}

function placementStrategyFor(ratio: Ratio): string[] {
  if (ratio === '1:1') {
    return [
      'Use square feed composition for broad placement compatibility.',
      'Preserve the approved square visual hierarchy while keeping text away from edges.',
      'Use this as the reference placement for copy and brand consistency.',
    ];
  }

  if (ratio === '4:5') {
    return [
      'Recompose for mobile feed, not as a crop from the square asset.',
      'Use the added vertical space for stronger headline breathing room and a cleaner review card.',
      'Keep the logo/footer treatment stable and avoid bottom-heavy whitespace.',
    ];
  }

  if (ratio === '9:16') {
    return [
      'Purpose-build for Stories/Reels with strong mobile readability.',
      'Use a vertical narrative stack: kicker, headline, illustrative draft layer, review card, CTA/footer.',
      'Keep only the most important annotations and avoid dense note clusters.',
    ];
  }

  return [
    'Optional landscape placement only after 1:1, 4:5, and 9:16 are working.',
    'Use only if Meta placement mix requires a dedicated landscape asset.',
    'Do not produce by cropping a vertical or square composition.',
  ];
}

function safeZonesFor(ratio: Ratio): string[] {
  if (ratio === '9:16') {
    return [
      'Canvas: 1080x1920.',
      'Keep headline, review card text, CTA, and logo inside a central safe zone.',
      'Avoid top UI collision by keeping essential text below roughly 220px.',
      'Avoid bottom UI collision by keeping CTA and logo above roughly 1760px.',
      'Do not place required copy in the extreme top or bottom interface zones.',
    ];
  }

  if (ratio === '4:5') {
    return [
      'Canvas: 1080x1350.',
      'Keep headline in the upper half with generous side margins.',
      'Keep review card and CTA above the bottom footer area.',
      'Use footer/logo treatment consistently without crowding Meta feed UI.',
    ];
  }

  if (ratio === '1:1') {
    return [
      'Canvas: 1080x1080.',
      'Keep main copy inside a centered safe area with generous margins.',
      'Keep logo and CTA readable but restrained in the footer.',
    ];
  }

  return [
    'Canvas: 1200x628.',
    'Keep copy wide and sparse.',
    'Use only after vertical and square placements are finalized.',
  ];
}

function compositionFor(concept: ConceptDefinition, ratio: Ratio): string[] {
  const base = [
    'Use light/pink editorial collage, not a black-background version.',
    'Use layered paper, draft/report sheet, pink annotation marks, and a clean review card.',
    'Use the official Verbatim footer logo treatment standard or reserve the same footer area for later overlay.',
    'Do not crop the approved 1:1 PNG. Recompose the layout for this ratio.',
  ];

  if (ratio === '9:16') {
    return [
      ...base,
      'Make the headline large and stacked for phone viewing.',
      'Let the draft/report sheet sit mid-frame or slightly behind the review card.',
      'Keep the review card compact enough to avoid a poster full of text.',
      'Place CTA near lower right but above Stories/Reels UI collision zones.',
      'Keep the logo footer stable and readable without competing with the CTA.',
    ];
  }

  if (ratio === '4:5') {
    return [
      ...base,
      'Use the extra vertical height for headline breathing room and layered paper depth.',
      'Place the review card in the lower third or lower-right quadrant without feeling like a cropped square.',
      'Keep annotations sparse and readable.',
    ];
  }

  if (ratio === '1:1') {
    return [
      ...base,
      'Use the approved selected square asset as direction, not as a crop source.',
      'Balance headline, document layer, review card, logo, and CTA in a square composition.',
    ];
  }

  return [
    ...base,
    'Compress the visual system into a wide editorial layout only if this placement is explicitly needed.',
  ];
}

function promptFor(concept: ConceptDefinition, ratio: Ratio): string {
  const text = concept.exact_required_text;
  const dimensions = dimensionsFor(ratio);
  const placement = placementStrategyFor(ratio).join(' ');
  const safeZones = safeZonesFor(ratio).join(' ');

  return [
    `Create a ${ratio} ${dimensions.width}x${dimensions.height} static Meta paid ad image for Verbatim, a product positioned as adversarial review for AI.`,
    `Use the approved light/pink premium editorial collage direction: off-white, ivory, selective blush surfaces, layered paper, subtle shadows, a draft/report sheet, pink margin-review annotations, a clean pink review note card, and strong mobile-readable black editorial serif headline typography.`,
    `Required kicker text: "${text.kicker}".`,
    `Required main headline text exactly: "${text.headline}".`,
    `Required handwritten note text exactly: "${text.handwritten_note}".`,
    `Required document annotation text exactly: "${text.document_annotations.join('" and "')}".`,
    `Required review card heading exactly: "${text.review_card.heading}".`,
    `Required review card lines exactly: "${text.review_card.lines.join('", "')}".`,
    `Required positioning text exactly: "${text.positioning}".`,
    `Required CTA text exactly: "${text.cta}".`,
    `Placement strategy: ${placement}`,
    `Safe zone requirements: ${safeZones}`,
    `Composition: ${compositionFor(concept, ratio).join(' ')}`,
    `Use Verbatim pink #f12258 confidently as the review accent, with #fff0f2 as selective blush surface and #d4154d only for depth. Keep the dominant field ivory or off-white, not hot pink.`,
    `Use the official Verbatim footer logo treatment standard. If the image model cannot use the official logo asset, leave a clean bottom-left footer area for the official logo to be added later. Do not invent or approximate the logo.`,
    `Avoid fake UI, fake metrics, fake customer names, fake approval stamps, robots, stock people, copied competitor layouts, tiny unreadable text, truth layer language, em dashes, and any claim that Verbatim proves correctness or guarantees accuracy.`,
  ].join(' ');
}

function buildBrief(concept: ConceptDefinition, ratio: Ratio): PlacementBrief {
  return {
    ...concept,
    ratio,
    target_dimensions: dimensionsFor(ratio),
    recommended_output_filename: recommendedFilename(concept, ratio),
    placement_strategy: placementStrategyFor(ratio),
    safe_zone_requirements: safeZonesFor(ratio),
    art_direction: SHARED_ART_DIRECTION,
    composition_requirements: compositionFor(concept, ratio),
    negative_constraints: SHARED_NEGATIVE_CONSTRAINTS,
    prompt: promptFor(concept, ratio),
    qa_checklist: SHARED_QA_CHECKLIST,
    lifecycle_gates: lifecycleGates(),
  };
}

function assertBriefIsSafe(brief: PlacementBrief): void {
  const text = [
    brief.exact_required_text.kicker,
    brief.exact_required_text.headline,
    brief.exact_required_text.handwritten_note,
    ...brief.exact_required_text.document_annotations,
    brief.exact_required_text.review_card.heading,
    ...brief.exact_required_text.review_card.lines,
    brief.exact_required_text.positioning,
    brief.exact_required_text.cta,
  ].join(' ');

  if (text.includes('—') || text.includes('â€”')) {
    fail(`Customer-facing copy contains an em dash or mojibake dash for ${brief.concept_id}.`);
  }

  if (/truth layer|proves correctness|guarantees accuracy|catches every hallucination/i.test(text)) {
    fail(`Customer-facing copy contains forbidden claim language for ${brief.concept_id}.`);
  }

  if (!brief.prompt.includes('Do not invent or approximate the logo')) {
    fail(`Prompt is missing official logo guardrail for ${brief.concept_id} ${brief.ratio}.`);
  }

  if (!brief.prompt.includes('Recompose') && !brief.prompt.includes('recompose')) {
    fail(`Prompt is missing recomposition instruction for ${brief.concept_id} ${brief.ratio}.`);
  }
}

function formatList(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

function formatBriefMarkdown(brief: PlacementBrief): string {
  return `## ${brief.concept_name} ${brief.ratio}

- Concept ID: ${brief.concept_id}
- Source selected asset path: \`${brief.source_selected_asset_path}\`
- Ratio: ${brief.ratio}
- Target dimensions: ${brief.target_dimensions.width}x${brief.target_dimensions.height}
- Recommended output filename: \`${brief.recommended_output_filename}\`
- Copy source note: ${brief.copy_source_note}

### Exact Required Text

- Kicker: ${brief.exact_required_text.kicker}
- Headline: ${brief.exact_required_text.headline}
- Handwritten note: ${brief.exact_required_text.handwritten_note}
- Document annotation 1: ${brief.exact_required_text.document_annotations[0] ?? ''}
- Document annotation 2: ${brief.exact_required_text.document_annotations[1] ?? ''}
- Review card heading: ${brief.exact_required_text.review_card.heading}
- Review card line 1: ${brief.exact_required_text.review_card.lines[0] ?? ''}
- Review card line 2: ${brief.exact_required_text.review_card.lines[1] ?? ''}
- Review card line 3: ${brief.exact_required_text.review_card.lines[2] ?? ''}
- Positioning: ${brief.exact_required_text.positioning}
- CTA: ${brief.exact_required_text.cta}

### Placement Strategy

${formatList(brief.placement_strategy)}

### Safe Zone Requirements

${formatList(brief.safe_zone_requirements)}

### Composition Requirements

${formatList(brief.composition_requirements)}

### Paste-Ready Image Model Prompt

${brief.prompt}

### QA Checklist

${brief.qa_checklist.map((item) => `- [ ] ${item}`).join('\n')}

### Lifecycle Gates

- Approved for generation: ${brief.lifecycle_gates.approved_for_generation}
- Generated asset path: ${brief.lifecycle_gates.generated_asset_path ?? 'null'}
- Approved for upload: ${brief.lifecycle_gates.approved_for_upload}
- Uploaded to Meta: ${brief.lifecycle_gates.uploaded_to_meta}
- Meta ad ID: ${brief.lifecycle_gates.meta_ad_id ?? 'null'}
- Human review required: ${brief.lifecycle_gates.human_review_required}
`;
}

function formatMarkdown(file: RenderBriefsFile): string {
  return `# Paid Ads Image Render Briefs

Generated at: ${file.generated_at}
Style ID: ${file.style_id}
Requested concept: ${file.requested_concept}
Requested ratios: ${file.requested_ratios.join(', ')}
Brief count: ${file.briefs.length}

## Purpose

This file creates placement-specific image-generation render briefs for the approved first-flight Verbatim paid ads.

It does not generate images, call image APIs, upload to Meta, or approve spend.

## Placement Rule

Each ratio must be recomposed for its placement. Do not crop the 1:1 selected PNGs and do not rely on Meta auto-cropping as the final asset strategy.

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

## Logo Treatment Standard

- Logo asset: ${file.first_flight_logo_standard.logo_asset}
- Base canvas: ${file.first_flight_logo_standard.base_canvas}
- Base logo width: ${file.first_flight_logo_standard.base_logo_width}
- Base logo x: ${file.first_flight_logo_standard.base_logo_x}
- Base logo y: ${file.first_flight_logo_standard.base_logo_y}
- Placement note: ${file.first_flight_logo_standard.placement_note}

## Recommendation On 1.91:1

- Include 1.91:1 now: ${file.recommendation.include_191x1}
- Reason: ${file.recommendation.reason}

## Motion Spec For Later Testing

- Status: ${file.motion_spec.status}
- Duration: ${file.motion_spec.duration_seconds}
- Principle: ${file.motion_spec.principle}

Allowed motion:

${formatList(file.motion_spec.allowed_motion)}

Forbidden motion:

${formatList(file.motion_spec.forbidden_motion)}

## Briefs

${file.briefs.map(formatBriefMarkdown).join('\n')}
`;
}

function buildFile(requestedConcept: string, ratios: Ratio[]): RenderBriefsFile {
  const concepts = conceptsFor(requestedConcept);
  const briefs = concepts.flatMap((concept) => ratios.map((ratio) => buildBrief(concept, ratio)));

  for (const brief of briefs) {
    assertBriefIsSafe(brief);
  }

  return {
    generated_at: new Date().toISOString(),
    style_id: STYLE_ID,
    requested_concept: requestedConcept,
    requested_ratios: ratios,
    source_docs_used: SOURCE_DOCS,
    brand_colors: BRAND_COLORS,
    logo_assets_to_use: LOGO_ASSETS,
    first_flight_logo_standard: {
      logo_asset: 'brand/verbatim/logo-pink.png',
      base_canvas: '1080x1080',
      base_logo_width: 276,
      base_logo_x: 41,
      base_logo_y: 997,
      placement_note: 'Scale normalized logo treatment to each placement while preserving the approved footer size, left margin, bottom margin, and transparent PNG behavior.',
    },
    briefs,
    recommendation: {
      include_191x1: false,
      reason: '1.91:1 is not necessary for the first placement-ready package. The first useful set is 1:1, 4:5, and 9:16 because they cover square feed, mobile feed, and Stories/Reels. Add landscape only if Meta placement data or manual upload requirements make it necessary.',
    },
    motion_spec: {
      duration_seconds: '6 to 8',
      principle: 'Use static editorial collage art as the source of truth. Add only restrained movement that clarifies the review-before-action idea.',
      allowed_motion: [
        'Very subtle paper-layer settle or parallax over the first second.',
        'One annotation mark draws on or fades in.',
        'Review card appears with a simple opacity or short slide reveal.',
        'CTA appears last with a quiet fade.',
      ],
      forbidden_motion: [
        'No stock footage.',
        'No aggressive animation.',
        'No fake UI animation.',
        'No auto-generated Meta video as source of truth.',
        'No spinning logos, flashing warnings, or alarmist motion.',
        'No motion that changes or rewrites approved copy.',
      ],
      status: 'planned_not_built',
    },
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const style = args.get('--style');
  const conceptId = args.get('--concept');
  const ratios = parseRatios(args.get('--ratio') ?? args.get('--ratios'));

  if (style !== STYLE_ID) {
    fail(`This generator currently supports --style ${STYLE_ID}.`);
  }

  if (!conceptId) {
    fail(`Missing required argument --concept. Supported concepts: ${FIRST_FLIGHT_CONCEPTS.join(', ')} or all-first-flight.`);
  }

  const file = buildFile(conceptId, ratios);
  const outputDir = join(process.cwd(), 'output', `run-${file.generated_at.replace(/[:.]/g, '-')}`);
  mkdirSync(outputDir, { recursive: true });

  const jsonPath = join(outputDir, 'paid-ads-image-render-briefs.json');
  const mdPath = join(outputDir, 'paid-ads-image-render-briefs.md');

  writeFileSync(jsonPath, `${JSON.stringify(file, null, 2)}\n`, 'utf8');
  writeFileSync(mdPath, formatMarkdown(file), 'utf8');

  console.log('paid_ads_image_render_briefs_json_path:', jsonPath);
  console.log('paid_ads_image_render_briefs_md_path:', mdPath);
  console.log('style_id:', file.style_id);
  console.log('requested_concept:', file.requested_concept);
  console.log('requested_ratios:', file.requested_ratios.join(','));
  console.log('brief_count:', file.briefs.length);
  console.log('concept_ids:', Array.from(new Set(file.briefs.map((brief) => brief.concept_id))).join(','));
  console.log('recommended_output_filenames:', file.briefs.map((brief) => brief.recommended_output_filename).join(','));
  console.log('include_191x1_now:', file.recommendation.include_191x1);
  console.log('motion_spec_status:', file.motion_spec.status);
  console.log('approved_for_generation:', file.briefs.every((brief) => brief.lifecycle_gates.approved_for_generation === false) ? 'false' : 'mixed');
  console.log('approved_for_upload:', file.briefs.every((brief) => brief.lifecycle_gates.approved_for_upload === false) ? 'false' : 'mixed');
  console.log('uploaded_to_meta:', file.briefs.every((brief) => brief.lifecycle_gates.uploaded_to_meta === false) ? 'false' : 'mixed');
  console.log('human_review_required:', file.briefs.every((brief) => brief.lifecycle_gates.human_review_required === true) ? 'true' : 'mixed');
}

try {
  main();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
