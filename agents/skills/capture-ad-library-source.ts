import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Browser, type Page } from 'playwright';
import type { AgentSkillResult, CaptureAdLibrarySourceInput } from '../types.js';

type SourceType = 'specific_ad_detail_url' | 'search_results_page' | 'ad_library_unknown';
type CaptureStatus = 'captured' | 'not_found' | 'blocked_or_not_visible' | 'browser_unavailable' | 'failed';
type FieldExtractionStatus = 'extracted' | 'not_found' | 'needs_review';

type FieldValue<T> = {
  value: T;
  extractionStatus: FieldExtractionStatus;
};

type BrowserCaptureResult = {
  attempted: boolean;
  browserStatus: 'launched' | 'unavailable' | 'failed';
  sourceType: SourceType;
  libraryId: string | null;
  modalCaptureStatus: CaptureStatus;
  associatedAdsCaptureStatus: CaptureStatus;
  modalScreenshotPath: string | null;
  modalVisibleTextPath: string | null;
  associatedAdsScreenshotPath: string | null;
  associatedAdsVisibleTextPath: string | null;
  modalVisibleText: string;
  associatedAdsVisibleText: string;
  extractionNotes: string[];
};

type ExtractedFields = {
  advertiser: FieldValue<string>;
  activeStatus: FieldValue<string>;
  startDateIfVisible: FieldValue<string | null>;
  platform: FieldValue<string[]>;
  visibleCopy: {
    primaryText: FieldValue<string>;
    headline: FieldValue<string>;
    description: FieldValue<string>;
  };
  cta: FieldValue<string>;
  landingPage: FieldValue<string>;
  reuseSignals: FieldValue<string[]>;
};

type AdLibraryCaptureExample = {
  isPlaceholder: boolean;
  isPartialCapture: boolean;
  sourceType: SourceType;
  extractionStatus: string;
  browserCaptureAttempted: boolean;
  modalCaptureStatus: CaptureStatus;
  associatedAdsCaptureStatus: CaptureStatus;
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
  fieldExtractionStatus: {
    advertiser: FieldExtractionStatus;
    activeStatus: FieldExtractionStatus;
    startDateIfVisible: FieldExtractionStatus;
    platform: FieldExtractionStatus;
    primaryText: FieldExtractionStatus;
    headline: FieldExtractionStatus;
    description: FieldExtractionStatus;
    cta: FieldExtractionStatus;
    landingPage: FieldExtractionStatus;
    reuseSignals: FieldExtractionStatus;
  };
  reuseSignals: string[];
  screenshotPath: string | null;
  modalScreenshotPath: string | null;
  modalVisibleTextPath: string | null;
  associatedAdsScreenshotPath: string | null;
  associatedAdsVisibleTextPath: string | null;
  whyThisAdMayBeWorking: string;
  patternTags: string[];
  relevanceToVerbatim: string;
  extractionNotes: string[];
};

type AdLibraryCaptureFile = {
  captureVersion: string;
  captureStatus: 'browser_capture_attempted';
  capturedAt: string;
  researcher: string;
  source: string;
  sourceUrl: string;
  sourceType: SourceType;
  libraryId: string | null;
  notes: string[];
  examples: AdLibraryCaptureExample[];
};

function getUrl(sourceUrl: string): URL {
  return new URL(sourceUrl);
}

function getLibraryId(sourceUrl: string): string | null {
  const url = getUrl(sourceUrl);
  return url.searchParams.get('id') ?? url.searchParams.get('ad_archive_id');
}

function getSourceType(sourceUrl: string): SourceType {
  const url = getUrl(sourceUrl);

  if (url.searchParams.has('id') || url.searchParams.has('ad_archive_id')) {
    return 'specific_ad_detail_url';
  }

  if (url.searchParams.has('q')) {
    return 'search_results_page';
  }

  return 'ad_library_unknown';
}

function slugifySource(sourceUrl: string, fallbackTimestamp: string): string {
  const libraryId = getLibraryId(sourceUrl);
  const url = getUrl(sourceUrl);
  const query = url.searchParams.get('q');
  const base = libraryId
    ? `meta-ad-library-${libraryId}`
    : query
      ? `meta-ad-library-search-${query}`
      : `meta-ad-library-${fallbackTimestamp}`;

  return base.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function compactText(text: string): string {
  return text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

function looksLikePlatformChromeOnly(text: string): boolean {
  const normalized = text.toLowerCase();
  const hasChrome = normalized.includes('ad library report') && normalized.includes('ad library api');
  const hasAdDetailSignal = /library id|ad id|active|started running|sponsored|this ad|platforms|call to action/i.test(text);

  return hasChrome && !hasAdDetailSignal;
}

function looksLikeAdDetailText(text: string): boolean {
  return /library id|ad id|active|started running|sponsored|this ad|platforms|call to action|paid for by/i.test(text);
}

async function launchBrowser(): Promise<Browser> {
  try {
    return await chromium.launch({ channel: 'msedge', headless: true });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function getVisibleText(page: Page): Promise<string> {
  const text = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
  return compactText(text);
}

async function getModalVisibleText(page: Page): Promise<{ text: string; found: boolean }> {
  const dialog = page.locator('[role="dialog"]').first();
  const dialogVisible = await dialog.isVisible({ timeout: 10000 }).catch(() => false);

  if (dialogVisible) {
    const text = await dialog.innerText({ timeout: 5000 }).catch(() => '');
    const cleanedText = compactText(text);
    return { text: cleanedText, found: looksLikeAdDetailText(cleanedText) && !looksLikePlatformChromeOnly(cleanedText) };
  }

  const pageText = await getVisibleText(page);
  const mayContainSpecificAd = looksLikeAdDetailText(pageText) && !looksLikePlatformChromeOnly(pageText);
  return { text: mayContainSpecificAd ? pageText : '', found: mayContainSpecificAd };
}

async function screenshotModal(page: Page, screenshotPath: string): Promise<boolean> {
  const dialog = page.locator('[role="dialog"]').first();
  const dialogVisible = await dialog.isVisible({ timeout: 1000 }).catch(() => false);

  if (dialogVisible) {
    await dialog.screenshot({ path: screenshotPath }).catch(async () => {
      await page.screenshot({ path: screenshotPath, fullPage: false });
    });
    return true;
  }

  await page.screenshot({ path: screenshotPath, fullPage: false });
  return existsSync(screenshotPath);
}

async function closeModalIfPossible(page: Page): Promise<boolean> {
  const closeButton = page
    .locator('[aria-label="Close"], [aria-label="Close dialog"], div[role="button"][aria-label="Close"]')
    .first();
  const visible = await closeButton.isVisible({ timeout: 1000 }).catch(() => false);

  if (!visible) {
    return false;
  }

  await closeButton.click({ timeout: 2000 }).catch(() => undefined);
  await page.waitForTimeout(1200);
  return true;
}

async function runBrowserCapture(input: CaptureAdLibrarySourceInput, slug: string): Promise<BrowserCaptureResult> {
  const sourceType = getSourceType(input.sourceUrl);
  const libraryId = getLibraryId(input.sourceUrl);
  const screenshotDir = join(input.context.repoRoot, 'data', 'paid-ads', 'ad-library-screenshots');
  const visibleTextDir = join(input.context.repoRoot, 'data', 'paid-ads', 'ad-library-visible-text');
  mkdirSync(screenshotDir, { recursive: true });
  mkdirSync(visibleTextDir, { recursive: true });

  const modalScreenshotPath = sourceType === 'specific_ad_detail_url' ? join(screenshotDir, `${slug}-modal.png`) : null;
  const modalVisibleTextPath = sourceType === 'specific_ad_detail_url' ? join(visibleTextDir, `${slug}-modal.txt`) : null;
  const associatedAdsScreenshotPath =
    sourceType === 'specific_ad_detail_url'
      ? join(screenshotDir, `${slug}-associated-ads.png`)
      : join(screenshotDir, `${slug}-search-results.png`);
  const associatedAdsVisibleTextPath =
    sourceType === 'specific_ad_detail_url'
      ? join(visibleTextDir, `${slug}-associated-ads.txt`)
      : join(visibleTextDir, `${slug}-search-results.txt`);

  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
  } catch (error) {
    return {
      attempted: true,
      browserStatus: 'unavailable',
      sourceType,
      libraryId,
      modalCaptureStatus: 'browser_unavailable',
      associatedAdsCaptureStatus: 'browser_unavailable',
      modalScreenshotPath: null,
      modalVisibleTextPath: null,
      associatedAdsScreenshotPath: null,
      associatedAdsVisibleTextPath: null,
      modalVisibleText: '',
      associatedAdsVisibleText: '',
      extractionNotes: [`Browser launch failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.goto(input.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(4500);

    let modalVisibleText = '';
    let modalCaptureStatus: CaptureStatus = 'not_found';
    let savedModalScreenshotPath: string | null = null;
    let savedModalVisibleTextPath: string | null = null;
    const extractionNotes: string[] = [];

    if (sourceType === 'specific_ad_detail_url') {
      const modal = await getModalVisibleText(page);
      modalVisibleText = modal.text;
      modalCaptureStatus = modal.found ? 'captured' : 'not_found';

      if (modal.found && modalVisibleTextPath) {
        writeFileSync(modalVisibleTextPath, `${modalVisibleText}\n`, 'utf8');
        savedModalVisibleTextPath = modalVisibleTextPath;
      }

      if (modal.found && modalScreenshotPath) {
        await screenshotModal(page, modalScreenshotPath);
        savedModalScreenshotPath = existsSync(modalScreenshotPath) ? modalScreenshotPath : null;
      }

      if (!modal.found) {
        const pageText = await getVisibleText(page);
        if (/log in|captcha|security check|temporarily blocked/i.test(pageText)) {
          modalCaptureStatus = 'blocked_or_not_visible';
          extractionNotes.push('Meta page appears blocked, login-gated, or did not expose an ad detail modal.');
        } else {
          extractionNotes.push('Specific ad detail modal was not detected.');
        }
      }

      const closedModal = await closeModalIfPossible(page);
      extractionNotes.push(
        closedModal
          ? 'Modal was closed after modal capture to collect associated ads page context.'
          : 'Modal close button was not detected or modal was not open.',
      );
    }

    const associatedText = await getVisibleText(page);
    let associatedAdsCaptureStatus: CaptureStatus = associatedText ? 'captured' : 'not_found';

    if (/log in|captcha|security check|temporarily blocked/i.test(associatedText)) {
      associatedAdsCaptureStatus = 'blocked_or_not_visible';
    }

    if (associatedText) {
      writeFileSync(associatedAdsVisibleTextPath, `${associatedText}\n`, 'utf8');
    }

    await page.screenshot({ path: associatedAdsScreenshotPath, fullPage: false }).catch(() => undefined);

    return {
      attempted: true,
      browserStatus: 'launched',
      sourceType,
      libraryId,
      modalCaptureStatus,
      associatedAdsCaptureStatus,
      modalScreenshotPath: savedModalScreenshotPath,
      modalVisibleTextPath: savedModalVisibleTextPath,
      associatedAdsScreenshotPath: existsSync(associatedAdsScreenshotPath) ? associatedAdsScreenshotPath : null,
      associatedAdsVisibleTextPath: associatedText ? associatedAdsVisibleTextPath : null,
      modalVisibleText,
      associatedAdsVisibleText: associatedText,
      extractionNotes,
    };
  } catch (error) {
    return {
      attempted: true,
      browserStatus: 'failed',
      sourceType,
      libraryId,
      modalCaptureStatus: 'failed',
      associatedAdsCaptureStatus: 'failed',
      modalScreenshotPath: null,
      modalVisibleTextPath: null,
      associatedAdsScreenshotPath: null,
      associatedAdsVisibleTextPath: null,
      modalVisibleText: '',
      associatedAdsVisibleText: '',
      extractionNotes: [`Browser capture failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  } finally {
    await browser.close().catch(() => undefined);
  }
}

function lines(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

function field<T>(value: T, extracted: boolean): FieldValue<T> {
  return {
    value,
    extractionStatus: extracted ? 'extracted' : 'not_found',
  };
}

function extractStartedRunning(text: string): FieldValue<string | null> {
  const match =
    text.match(/Started running(?: on)?\s+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i) ??
    text.match(/Started running(?: on)?\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);

  return field(match?.[1] ?? null, Boolean(match?.[1]));
}

function extractActiveStatus(text: string): FieldValue<string> {
  if (/\bActive\b/i.test(text)) {
    return field('active', true);
  }

  if (/\bInactive\b/i.test(text)) {
    return field('inactive', true);
  }

  return field('unknown', false);
}

function extractPlatforms(text: string): FieldValue<string[]> {
  const platformMap = new Map<string, RegExp>([
    ['facebook', /\bFacebook\b/i],
    ['instagram', /\bInstagram\b/i],
    ['messenger', /\bMessenger\b/i],
    ['audience_network', /Audience Network/i],
  ]);
  const platforms = [...platformMap.entries()]
    .filter(([, pattern]) => pattern.test(text))
    .map(([platform]) => platform);

  return field(platforms, platforms.length > 0);
}

function extractCta(text: string): FieldValue<string> {
  const knownCtas = [
    'Learn more',
    'Sign up',
    'Download',
    'Get offer',
    'Shop now',
    'Contact us',
    'Apply now',
    'Subscribe',
    'Install now',
    'Get quote',
  ];
  const found = knownCtas.find((cta) => new RegExp(`\\b${cta}\\b`, 'i').test(text));
  return field(found ?? 'unknown', Boolean(found));
}

function extractLandingPage(text: string): FieldValue<string> {
  const match = text.match(/https?:\/\/[^\s<>"')]+/i);
  return field(match?.[0] ?? 'unknown', Boolean(match?.[0]));
}

function extractAdvertiser(text: string): FieldValue<string> {
  const textLines = lines(text);
  const pageTransparencyIndex = textLines.findIndex((line) => /Page transparency/i.test(line));

  if (pageTransparencyIndex > 0) {
    return field(textLines[pageTransparencyIndex - 1] ?? 'unknown', true);
  }

  const sponsoredIndex = textLines.findIndex((line) => /^Sponsored$/i.test(line));

  if (sponsoredIndex > 0) {
    return field(textLines[sponsoredIndex - 1] ?? 'unknown', true);
  }

  return field('unknown', false);
}

function extractReuseSignals(text: string): FieldValue<string[]> {
  const signals = [
    /multiple versions/i.test(text) ? 'multiple_versions_mentioned' : '',
    /This ad has multiple versions/i.test(text) ? 'ad_has_multiple_versions' : '',
    /Ads using this creative and text/i.test(text) ? 'reuse_or_variation_context_present' : '',
  ].filter(Boolean);

  return field(signals, signals.length > 0);
}

function extractVisibleCopy(text: string): ExtractedFields['visibleCopy'] {
  return {
    primaryText: field('', false),
    headline: field('', false),
    description: field('', false),
  };
}

function extractFields(capture: BrowserCaptureResult): ExtractedFields {
  const sourceText =
    capture.sourceType === 'specific_ad_detail_url' && capture.modalCaptureStatus === 'captured'
      ? capture.modalVisibleText
      : capture.sourceType === 'search_results_page' && capture.associatedAdsCaptureStatus === 'captured'
        ? capture.associatedAdsVisibleText
        : '';

  return {
    advertiser: extractAdvertiser(sourceText),
    activeStatus: extractActiveStatus(sourceText),
    startDateIfVisible: extractStartedRunning(sourceText),
    platform: extractPlatforms(sourceText),
    visibleCopy: extractVisibleCopy(sourceText),
    cta: extractCta(sourceText),
    landingPage: extractLandingPage(sourceText),
    reuseSignals: extractReuseSignals(sourceText),
  };
}

function buildCaptureRecord(input: CaptureAdLibrarySourceInput, capture: BrowserCaptureResult): AdLibraryCaptureFile {
  const extracted = extractFields(capture);
  const extractionStatus =
    capture.modalCaptureStatus === 'captured' || capture.associatedAdsCaptureStatus === 'captured'
      ? 'browser_capture_partial_needs_review'
      : 'needs_browser_capture';

  return {
    captureVersion: '2026-06-23-agent-browser-capture-v0.1',
    captureStatus: 'browser_capture_attempted',
    capturedAt: input.context.createdAt,
    researcher: 'paid-ads-agent',
    source: 'agent_paid_ads_ad_library_source_capture',
    sourceUrl: input.sourceUrl,
    sourceType: capture.sourceType,
    libraryId: capture.libraryId,
    notes: [
      'This capture was created from a user-provided Meta Ad Library URL.',
      'Browser capture is bounded to the provided URL only.',
      'Associated ads are stored only as context or candidates, not completed captures.',
      'Do not use incomplete fields for creative pattern conclusions until human review completes the record.',
      'Longevity is a proxy, not proof of profitability.',
    ],
    examples: [
      {
        isPlaceholder: true,
        isPartialCapture: true,
        sourceType: capture.sourceType,
        extractionStatus,
        browserCaptureAttempted: capture.attempted,
        modalCaptureStatus: capture.modalCaptureStatus,
        associatedAdsCaptureStatus: capture.associatedAdsCaptureStatus,
        sourceUrl: input.sourceUrl,
        userNote: input.userNote,
        libraryId: capture.libraryId,
        advertiser: extracted.advertiser.value,
        adLibraryUrl: input.sourceUrl,
        platform: extracted.platform.value,
        activeStatus: extracted.activeStatus.value,
        startDateIfVisible: extracted.startDateIfVisible.value,
        longevitySignal:
          extracted.startDateIfVisible.extractionStatus === 'extracted'
            ? `started_running_${extracted.startDateIfVisible.value}`
            : 'unknown_needs_review',
        visualFormat: 'unknown_needs_human_review',
        hookType: 'unknown_needs_human_review',
        offerType: 'unknown_needs_human_review',
        cta: extracted.cta.value,
        landingPage: extracted.landingPage.value,
        visibleCopy: {
          primaryText: extracted.visibleCopy.primaryText.value,
          headline: extracted.visibleCopy.headline.value,
          description: extracted.visibleCopy.description.value,
        },
        fieldExtractionStatus: {
          advertiser: extracted.advertiser.extractionStatus,
          activeStatus: extracted.activeStatus.extractionStatus,
          startDateIfVisible: extracted.startDateIfVisible.extractionStatus,
          platform: extracted.platform.extractionStatus,
          primaryText: extracted.visibleCopy.primaryText.extractionStatus,
          headline: extracted.visibleCopy.headline.extractionStatus,
          description: extracted.visibleCopy.description.extractionStatus,
          cta: extracted.cta.extractionStatus,
          landingPage: extracted.landingPage.extractionStatus,
          reuseSignals: extracted.reuseSignals.extractionStatus,
        },
        reuseSignals: extracted.reuseSignals.value,
        screenshotPath: capture.modalScreenshotPath ?? capture.associatedAdsScreenshotPath,
        modalScreenshotPath: capture.modalScreenshotPath,
        modalVisibleTextPath: capture.modalVisibleTextPath,
        associatedAdsScreenshotPath: capture.associatedAdsScreenshotPath,
        associatedAdsVisibleTextPath: capture.associatedAdsVisibleTextPath,
        whyThisAdMayBeWorking:
          'Not assessed. The source was captured for review, but creative judgment requires visible field review and pattern analysis.',
        patternTags: ['meta-ad-library', capture.sourceType, 'user-sourced', 'needs-human-review'],
        relevanceToVerbatim: input.userNote,
        extractionNotes: [
          capture.libraryId === null
            ? 'No ad library id was found in the URL query string.'
            : `Ad library id found in URL query string: ${capture.libraryId}.`,
          `Browser status: ${capture.browserStatus}.`,
          `Modal capture status: ${capture.modalCaptureStatus}.`,
          `Associated ads context capture status: ${capture.associatedAdsCaptureStatus}.`,
          ...capture.extractionNotes,
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
Source type: ${capture.sourceType}
Library ID: ${capture.libraryId ?? 'not found'}
Capture status: ${capture.captureStatus}
Extraction status: ${example.extractionStatus}
Modal capture status: ${example.modalCaptureStatus}
Associated ads capture status: ${example.associatedAdsCaptureStatus}
Durable capture path: ${durableCapturePath}

## User Note

${example.userNote}

## Screenshot Paths

- Modal screenshot: ${example.modalScreenshotPath ?? 'not captured'}
- Associated ads screenshot: ${example.associatedAdsScreenshotPath ?? 'not captured'}

## Visible Text Paths

- Modal visible text: ${example.modalVisibleTextPath ?? 'not captured'}
- Associated ads visible text: ${example.associatedAdsVisibleTextPath ?? 'not captured'}

## Extracted Fields

- Advertiser: ${example.advertiser} (${example.fieldExtractionStatus.advertiser})
- Active status: ${example.activeStatus} (${example.fieldExtractionStatus.activeStatus})
- Started running: ${example.startDateIfVisible ?? 'unknown'} (${example.fieldExtractionStatus.startDateIfVisible})
- Platform labels: ${example.platform.length > 0 ? example.platform.join(', ') : 'unknown'} (${example.fieldExtractionStatus.platform})
- CTA: ${example.cta} (${example.fieldExtractionStatus.cta})
- Landing page: ${example.landingPage} (${example.fieldExtractionStatus.landingPage})
- Reuse signals: ${example.reuseSignals.length > 0 ? example.reuseSignals.join(', ') : 'unknown'} (${example.fieldExtractionStatus.reuseSignals})

## Visible Copy

- Primary text: ${example.visibleCopy.primaryText || 'not captured'} (${example.fieldExtractionStatus.primaryText})
- Headline: ${example.visibleCopy.headline || 'not captured'} (${example.fieldExtractionStatus.headline})
- Description: ${example.visibleCopy.description || 'not captured'} (${example.fieldExtractionStatus.description})

## Extraction Notes

${example.extractionNotes.map((note) => `- ${note}`).join('\n')}

## Human Review Required

- [ ] Review modal screenshot and visible text if captured.
- [ ] Review associated ads context only as context or candidates.
- [ ] Do not click through or complete associated ads unless explicitly assigned later.
- [ ] Fill missing advertiser, active status, start date, platform labels, visible copy, CTA, destination URL, visual format, hook type, offer type, and relevance.
- [ ] Do not infer profitability from longevity.
- [ ] Only run pattern analysis after enough real completed examples exist.
`;
}

export async function captureAdLibrarySource(input: CaptureAdLibrarySourceInput): Promise<AgentSkillResult> {
  const slug = slugifySource(input.sourceUrl, input.context.createdAt.replace(/[:.]/g, '-'));
  const capture = await runBrowserCapture(input, slug);
  const captureRecord = buildCaptureRecord(input, capture);
  const durableDir = join(input.context.repoRoot, 'data', 'paid-ads', 'ad-library-captures');
  mkdirSync(durableDir, { recursive: true });

  const outputJsonPath = join(input.context.runDir, 'paid-ads-source-capture.json');
  const outputMarkdownPath = join(input.context.runDir, 'paid-ads-source-capture.md');
  const durableCapturePath = join(durableDir, `${slug}.json`);

  writeFileSync(outputJsonPath, `${JSON.stringify(captureRecord, null, 2)}\n`, 'utf8');
  writeFileSync(durableCapturePath, `${JSON.stringify(captureRecord, null, 2)}\n`, 'utf8');
  writeFileSync(outputMarkdownPath, formatMarkdown(captureRecord, durableCapturePath), 'utf8');

  const screenshotPaths = [
    capture.modalScreenshotPath,
    capture.associatedAdsScreenshotPath,
  ].filter((path): path is string => Boolean(path));
  const visibleTextPaths = [
    capture.modalVisibleTextPath,
    capture.associatedAdsVisibleTextPath,
  ].filter((path): path is string => Boolean(path));

  return {
    skillName: 'capture-ad-library-source',
    skillStatus: capture.modalCaptureStatus === 'captured' || capture.associatedAdsCaptureStatus === 'captured' ? 'partial' : 'partial',
    artifactPaths: [
      outputJsonPath,
      outputMarkdownPath,
      durableCapturePath,
      ...screenshotPaths,
      ...visibleTextPaths,
    ],
    nextAction:
      'Review captured screenshots and visible text, complete missing fields, then run the creative pattern analyzer after enough examples exist.',
    summary: {
      source_type: capture.sourceType,
      library_id: capture.libraryId,
      modal_capture_status: capture.modalCaptureStatus,
      extraction_status: captureRecord.examples[0]?.extractionStatus ?? 'unknown',
      screenshot_paths: screenshotPaths,
      visible_text_paths: visibleTextPaths,
    },
  };
}
