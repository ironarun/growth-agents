import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type UtmValues = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
};

type CreativeRenderManifest = {
  generated_at: string;
  source_docs: string[];
  campaign: {
    campaign_id: string;
    landing_page: string;
    landing_url: string;
    primary_measurement_event: string;
    secondary_measurement_event: string;
  };
  creative_job: {
    job_id: string;
    concept_id: string;
    concept_name: string;
    status: string;
    renderer: string;
    ratio: string;
    canvas: {
      width: number;
      height: number;
      label: string;
    };
    output_filename: string;
  };
  ad_copy: {
    hook: string;
    primary_text: string;
    headline: string;
  };
  utm_values: UtmValues;
  image_prompt: {
    prompt: string;
    negative_prompt: string[];
  };
  qa_checklist: string[];
  lifecycle: {
    rendered_asset_path: string | null;
    approved_for_upload: boolean;
    uploaded_to_meta: boolean;
    meta_ad_id: string | null;
    notes: string[];
  };
};

const SOURCE_DOCS = [
  'docs/PAID-ADS-FIRST-TEST-PACKET-2026-06-21.md',
  'docs/PAID-ADS-FIRST-FLIGHT-ASSET-SPECS-2026-06-21.md',
  'docs/PAID-ADS-READINESS-AUDIT-2026-06-21.md',
];

const REJECTED_HOOK = "You don't know what you're missing. Find out before it costs you.";

function fail(message: string): never {
  throw new Error(message);
}

function buildLandingUrl(landingPage: string, utmValues: UtmValues): string {
  const url = new URL(landingPage);

  for (const [key, value] of Object.entries(utmValues)) {
    url.searchParams.set(key, value);
  }

  return url.toString();
}

function assertCustomerFacingCopyIsSafe(copy: CreativeRenderManifest['ad_copy']): void {
  const copyFields = [copy.hook, copy.primary_text, copy.headline];

  if (copyFields.some((field) => field.includes('—'))) {
    fail('Customer-facing ad copy contains an em dash.');
  }

  if (copyFields.some((field) => field.includes(REJECTED_HOOK))) {
    fail('Customer-facing ad copy contains the rejected hook.');
  }

  if (copyFields.some((field) => /proves truth|guarantees correctness/i.test(field))) {
    fail('Customer-facing ad copy includes an unsupported truth or correctness claim.');
  }
}

function formatChecklist(items: string[]): string {
  return items.map((item) => `- [ ] ${item}`).join('\n');
}

function formatMarkdown(manifest: CreativeRenderManifest, manifestPath: string): string {
  const { campaign, creative_job: creativeJob, ad_copy: adCopy, image_prompt: imagePrompt } = manifest;

  return `# Paid Ads Creative Render Job

Generated at: ${manifest.generated_at}
Manifest path: ${manifestPath}

## Render Handoff

This is a render handoff, not an upload instruction. Do not upload to Meta from this document.

## Concept Summary

- Concept ID: ${creativeJob.concept_id}
- Concept name: ${creativeJob.concept_name}
- Status: ${creativeJob.status}
- Renderer: ${creativeJob.renderer}
- Ratio: ${creativeJob.ratio}
- Canvas: ${creativeJob.canvas.label}
- Output filename: ${creativeJob.output_filename}

## Exact Image Generation Prompt

${imagePrompt.prompt}

## Negative Prompt And Avoid List

${imagePrompt.negative_prompt.map((item) => `- ${item}`).join('\n')}

## Exact Landing URL

${campaign.landing_url}

## Copy Fields For Meta Upload

- Hook: ${adCopy.hook}
- Primary text: ${adCopy.primary_text}
- Headline: ${adCopy.headline}

## Campaign Measurement

- Campaign ID: ${campaign.campaign_id}
- Primary measurement event: ${campaign.primary_measurement_event}
- Secondary measurement event: ${campaign.secondary_measurement_event}

## QA Checklist

${formatChecklist(manifest.qa_checklist)}

## Lifecycle

- Rendered asset path: ${manifest.lifecycle.rendered_asset_path ?? 'null'}
- Approved for upload: ${manifest.lifecycle.approved_for_upload}
- Uploaded to Meta: ${manifest.lifecycle.uploaded_to_meta}
- Meta ad ID: ${manifest.lifecycle.meta_ad_id ?? 'null'}

## Human Approval

- [ ] Arun approved render prompt
- [ ] Arun approved final rendered image
- [ ] Ready for manual Meta upload packet
`;
}

function buildManifest(generatedAt: string): CreativeRenderManifest {
  const utmValues: UtmValues = {
    utm_source: 'meta',
    utm_medium: 'paid_social',
    utm_campaign: 'consultants-client-facing-ai-review-v1',
    utm_content: 'static-confident-draft',
    utm_term: 'boutique-consultants',
  };

  const adCopy = {
    hook: 'The draft is confident. What checked it?',
    primary_text:
      'AI can make client work sound finished before anyone has challenged the reasoning. Verbatim adds adversarial review before you rely on it.',
    headline: 'Adversarial review for AI',
  };

  const manifest: CreativeRenderManifest = {
    generated_at: generatedAt,
    source_docs: SOURCE_DOCS,
    campaign: {
      campaign_id: 'consultants-client-facing-ai-review-v1',
      landing_page: 'https://helloverbatim.com/',
      landing_url: buildLandingUrl('https://helloverbatim.com/', utmValues),
      primary_measurement_event: 'AddToChromeClick',
      secondary_measurement_event: 'PageView',
    },
    creative_job: {
      job_id: `render-concept-01-confident-draft-1x1-${generatedAt.replace(/[:.]/g, '-')}`,
      concept_id: 'concept-01-confident-draft',
      concept_name: 'Confident Draft',
      status: 'ready_for_human_review',
      renderer: 'manual_image_renderer',
      ratio: '1:1',
      canvas: {
        width: 1080,
        height: 1080,
        label: '1080x1080',
      },
      output_filename: 'verbatim_meta_01_static-confident-draft_1x1_v01.png',
    },
    ad_copy: adCopy,
    utm_values: utmValues,
    image_prompt: {
      prompt:
        'Create a static Meta ad image in a flat editorial business publication style for a Chrome extension called Verbatim. White background, large black typographic headline reading "The draft is confident. What checked it?", a thin Verbatim pink accent line in #F12258, small "Verbatim" wordmark in the lower left, restrained layout, high contrast, mobile-readable type, sophisticated consultant audience. No people, no robots, no fake UI, no fake metrics, no fake logos, no tiny unreadable text, no enterprise compliance look.',
      negative_prompt: [
        'No fake dashboard.',
        'No fake client report.',
        'No fake document text.',
        'No robots.',
        'No abstract blue AI glow.',
        'No legal or compliance imagery.',
        'No tiny text.',
        'No fake UI.',
        'No fake metrics.',
        'No fake logos.',
        'No enterprise compliance look.',
      ],
    },
    qa_checklist: [
      'Text readable on mobile',
      'Hook rendered exactly',
      'No fake UI',
      'No fake metrics',
      'No robots',
      'No claims that Verbatim proves truth',
      'No claims that Verbatim guarantees correctness',
      'No em dashes',
      'Filename matches manifest',
      'Arun approval required',
    ],
    lifecycle: {
      rendered_asset_path: null,
      approved_for_upload: false,
      uploaded_to_meta: false,
      meta_ad_id: null,
      notes: [],
    },
  };

  assertCustomerFacingCopyIsSafe(manifest.ad_copy);

  return manifest;
}

function main(): void {
  const generatedAt = new Date().toISOString();
  const timestamp = generatedAt.replace(/[:.]/g, '-');
  const outputDir = join(process.cwd(), 'output', `run-${timestamp}`);
  mkdirSync(outputDir, { recursive: true });

  const manifest = buildManifest(generatedAt);
  const manifestPath = join(outputDir, 'paid-ads-creative-render-manifest.json');
  const jobPath = join(outputDir, 'paid-ads-creative-render-job.md');

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  writeFileSync(jobPath, formatMarkdown(manifest, manifestPath), 'utf8');

  console.log('paid_ads_creative_render_manifest_path:', manifestPath);
  console.log('paid_ads_creative_render_job_path:', jobPath);
  console.log('concept_id:', manifest.creative_job.concept_id);
  console.log('ratio:', manifest.creative_job.ratio);
  console.log('status:', manifest.creative_job.status);
}

main();
