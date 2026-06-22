import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentSkillResult, CaptureAdLibrarySourceInput } from '../types.js';

type AdLibraryCaptureExample = {
  isPlaceholder: boolean;
  isPartialCapture: boolean;
  extractionStatus: 'needs_browser_capture';
  sourceUrl: string;
  userNote: string;
  libraryId: string | null;
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
  visibleCopy: {
    primaryText: string;
    headline: string;
    description: string;
  };
  screenshotPath: string | null;
  whyThisAdMayBeWorking: string;
  patternTags: string[];
  relevanceToVerbatim: string;
  extractionNotes: string[];
};

type AdLibraryCaptureFile = {
  captureVersion: string;
  captureStatus: 'partial_needs_browser_capture';
  capturedAt: string;
  researcher: string;
  source: string;
  sourceUrl: string;
  notes: string[];
  examples: AdLibraryCaptureExample[];
};

function slugifyUrl(sourceUrl: string, fallbackTimestamp: string): string {
  const url = new URL(sourceUrl);
  const libraryId = url.searchParams.get('id') ?? url.searchParams.get('ad_archive_id');
  const base = libraryId ? `meta-ad-library-${libraryId}` : `meta-ad-library-${fallbackTimestamp}`;

  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractLibraryId(sourceUrl: string): string | null {
  const url = new URL(sourceUrl);
  return url.searchParams.get('id') ?? url.searchParams.get('ad_archive_id');
}

function buildCaptureRecord(input: CaptureAdLibrarySourceInput): AdLibraryCaptureFile {
  const libraryId = extractLibraryId(input.sourceUrl);

  return {
    captureVersion: '2026-06-22-agent-v0.1',
    captureStatus: 'partial_needs_browser_capture',
    capturedAt: input.context.createdAt,
    researcher: 'paid-ads-agent',
    source: 'agent_paid_ads_ad_library_source_capture',
    sourceUrl: input.sourceUrl,
    notes: [
      'This is a partial source capture created from a user-provided Meta Ad Library URL.',
      'Browser capture was not performed in this v0.1 pass.',
      'Do not use this record for creative pattern conclusions until visible ad fields are reviewed and completed.',
      'Longevity is a proxy, not proof of profitability.',
    ],
    examples: [
      {
        isPlaceholder: true,
        isPartialCapture: true,
        extractionStatus: 'needs_browser_capture',
        sourceUrl: input.sourceUrl,
        userNote: input.userNote,
        libraryId,
        advertiser: 'unknown',
        adLibraryUrl: input.sourceUrl,
        platform: [],
        activeStatus: 'unknown',
        startDateIfVisible: null,
        longevitySignal: 'unknown_needs_browser_capture',
        visualFormat: 'unknown_needs_browser_capture',
        hookType: 'unknown_needs_browser_capture',
        offerType: 'unknown_needs_browser_capture',
        cta: 'unknown_needs_browser_capture',
        landingPage: 'unknown_needs_browser_capture',
        visibleCopy: {
          primaryText: '',
          headline: '',
          description: '',
        },
        screenshotPath: null,
        whyThisAdMayBeWorking:
          'Not assessed. The user flagged this source as interesting, but visible ad evidence still needs browser capture and human review.',
        patternTags: ['meta-ad-library', 'needs-browser-capture', 'user-sourced'],
        relevanceToVerbatim: input.userNote,
        extractionNotes: [
          libraryId === null
            ? 'No ad library id was found in the URL query string.'
            : `Ad library id found in URL query string: ${libraryId}.`,
          'Visible advertiser, copy, platform labels, CTA, destination URL, and start date were not captured.',
          'A future browser-assisted skill may capture one page only without crawling or bypassing platform controls.',
        ],
      },
    ],
  };
}

function formatMarkdown(capture: AdLibraryCaptureFile, durableCapturePath: string): string {
  const example = capture.examples[0];

  if (!example) {
    throw new Error('Capture record has no examples to format.');
  }

  return `# Paid Ads Source Capture

Captured at: ${capture.capturedAt}
Source URL: ${capture.sourceUrl}
Capture status: ${capture.captureStatus}
Extraction status: ${example.extractionStatus}
Durable capture path: ${durableCapturePath}

## User Note

${example.userNote}

## Captured URL Evidence

- Ad Library URL: ${example.adLibraryUrl}
- Library ID: ${example.libraryId ?? 'not found'}
- Advertiser: ${example.advertiser}
- Active status: ${example.activeStatus}
- Started running: ${example.startDateIfVisible ?? 'unknown'}
- Platform labels: ${example.platform.length > 0 ? example.platform.join(', ') : 'unknown'}
- CTA: ${example.cta}
- Landing page: ${example.landingPage}
- Screenshot path: ${example.screenshotPath ?? 'not captured'}

## Visible Copy

- Primary text: ${example.visibleCopy.primaryText || 'not captured'}
- Headline: ${example.visibleCopy.headline || 'not captured'}
- Description: ${example.visibleCopy.description || 'not captured'}

## Extraction Notes

${example.extractionNotes.map((note) => `- ${note}`).join('\n')}

## Human Review Required

- [ ] Open the source URL manually or with an approved browser capture step.
- [ ] Capture screenshot if visible.
- [ ] Fill advertiser, active status, start date, platform labels, visible copy, CTA, destination URL, visual format, hook type, offer type, and relevance.
- [ ] Do not infer profitability from longevity.
- [ ] Only run pattern analysis after enough real examples exist.
`;
}

export function captureAdLibrarySource(input: CaptureAdLibrarySourceInput): AgentSkillResult {
  const capture = buildCaptureRecord(input);
  const slug = slugifyUrl(input.sourceUrl, input.context.createdAt.replace(/[:.]/g, '-'));
  const durableDir = join(input.context.repoRoot, 'data', 'paid-ads', 'ad-library-captures');
  mkdirSync(durableDir, { recursive: true });

  const outputJsonPath = join(input.context.runDir, 'paid-ads-source-capture.json');
  const outputMarkdownPath = join(input.context.runDir, 'paid-ads-source-capture.md');
  const durableCapturePath = join(durableDir, `${slug}.json`);

  writeFileSync(outputJsonPath, `${JSON.stringify(capture, null, 2)}\n`, 'utf8');
  writeFileSync(durableCapturePath, `${JSON.stringify(capture, null, 2)}\n`, 'utf8');
  writeFileSync(outputMarkdownPath, formatMarkdown(capture, durableCapturePath), 'utf8');

  return {
    skillName: 'capture-ad-library-source',
    skillStatus: 'partial',
    artifactPaths: [outputJsonPath, outputMarkdownPath, durableCapturePath],
    nextAction: 'Review the partial capture, add visible ad evidence, then run the creative pattern analyzer after enough examples exist.',
  };
}
