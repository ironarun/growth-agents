import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import type { AgentSkillResult, CaptureAdLibrarySourceInput } from '../types.js';

type SourceType = 'specific_ad_detail_url' | 'search_results_page' | 'ad_library_unknown';
type CaptureStatus = 'captured' | 'not_found' | 'blocked_or_not_visible' | 'browser_unavailable' | 'failed' | 'skipped';
type FieldExtractionStatus = 'extracted' | 'not_found' | 'needs_review';
type SourceExtractionStatus =
  | 'needs_browser_capture'
  | 'browser_capture_blocked_or_empty'
  | 'partial_needs_review'
  | 'captured_needs_human_review';

type FieldValue<T> = {
  value: T;
  extractionStatus: FieldExtractionStatus;
};

type BrowserCaptureResult = {
  attempted: boolean;
  browserStatus: 'launched' | 'unavailable' | 'failed';
  browserMode: 'headless' | 'headful';
  userConfirmationUsed: boolean;
  sourceType: SourceType;
  libraryId: string | null;
  modalCaptureStatus: CaptureStatus;
  headfulCaptureStatus: CaptureStatus;
  associatedAdsCaptureStatus: CaptureStatus;
  headfulScreenshotPath: string | null;
  headfulVisibleTextPath: string | null;
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
  extractionStatus: SourceExtractionStatus;
  browserCaptureAttempted: boolean;
  browserMode: 'headless' | 'headful';
  userConfirmationUsed: boolean;
  modalCaptureStatus: CaptureStatus;
  headfulCaptureStatus: CaptureStatus;
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
  headfulScreenshotPath: string | null;
  headfulVisibleTextPath: string | null;
  modalScreenshotPath: string | null;
  modalVisibleTextPath: string | null;
  associatedAdsScreenshotPath: string | null;
  associatedAdsVisibleTextPath: string | null;
  whyThisAdMayBeWorking: string;
  patternTags: string[];
  relevanceToVerbatim: string;
  extractionNotes: string[];
};

type CaptureOptions = {
  headful: boolean;
  waitForUser: boolean;
  userWaitMs: number;
  profileDir: string;
};

type UserConfirmationResult = {
  used: boolean;
  skipped: boolean;
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

function envFlag(name: string): boolean {
  return process.env[name] === '1' || process.env[name]?.toLowerCase() === 'true';
}

function captureOptions(repoRoot: string): CaptureOptions {
  const rawWaitMs = Number(process.env.PAID_ADS_CAPTURE_USER_WAIT_MS ?? '60000');

  return {
    headful: envFlag('PAID_ADS_CAPTURE_HEADFUL'),
    waitForUser: envFlag('PAID_ADS_CAPTURE_WAIT_FOR_USER'),
    userWaitMs: Number.isFinite(rawWaitMs) && rawWaitMs > 0 ? rawWaitMs : 60000,
    profileDir: join(
      repoRoot,
      process.env.PAID_ADS_CAPTURE_PROFILE_DIR ?? join('data', 'browser-profiles', 'meta-ad-library'),
    ),
  };
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

async function launchHeadfulContext(options: CaptureOptions): Promise<BrowserContext> {
  mkdirSync(options.profileDir, { recursive: true });

  try {
    return await chromium.launchPersistentContext(options.profileDir, {
      channel: 'msedge',
      headless: false,
      viewport: { width: 1440, height: 1100 },
    });
  } catch {
    return chromium.launchPersistentContext(options.profileDir, {
      headless: false,
      viewport: { width: 1440, height: 1100 },
    });
  }
}

async function waitForUserConfirmation(
  options: CaptureOptions,
  captureInput: CaptureAdLibrarySourceInput,
): Promise<UserConfirmationResult> {
  if (!options.waitForUser) {
    return { used: false, skipped: false };
  }

  if (captureInput.batchIndex !== undefined && captureInput.batchTotal !== undefined) {
    console.log(
      `URL ${captureInput.batchIndex} of ${captureInput.batchTotal} opened. Press Enter when the ad is visible, or type s to skip.`,
    );
  } else {
    console.log(
      'Browser opened. If Meta shows a login, consent screen, or the ad modal needs manual action, handle it in the browser. Press Enter here when the ad detail modal is visible.',
    );
  }

  const readline = createInterface({ input, output });
  let timer: NodeJS.Timeout | null = null;

  try {
    const answer = await Promise.race([
      readline.question('Press Enter to capture the current browser state, or type s to skip. '),
      new Promise<string>((resolve) => {
        timer = setTimeout(() => resolve(''), options.userWaitMs);
      }),
    ]);
    return { used: true, skipped: answer.trim().toLowerCase() === 's' };
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
    readline.close();
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

async function runHeadfulBrowserCapture(
  input: CaptureAdLibrarySourceInput,
  slug: string,
  options: CaptureOptions,
): Promise<BrowserCaptureResult> {
  const sourceType = getSourceType(input.sourceUrl);
  const libraryId = getLibraryId(input.sourceUrl);
  const screenshotDir = join(input.context.repoRoot, 'data', 'paid-ads', 'ad-library-screenshots');
  const visibleTextDir = join(input.context.repoRoot, 'data', 'paid-ads', 'ad-library-visible-text');
  mkdirSync(screenshotDir, { recursive: true });
  mkdirSync(visibleTextDir, { recursive: true });

  const headfulScreenshotPath = join(screenshotDir, `${slug}-headful.png`);
  const headfulVisibleTextPath = join(visibleTextDir, `${slug}-headful.txt`);
  const modalScreenshotPath = sourceType === 'specific_ad_detail_url' ? join(screenshotDir, `${slug}-modal.png`) : null;
  const modalVisibleTextPath = sourceType === 'specific_ad_detail_url' ? join(visibleTextDir, `${slug}-modal.txt`) : null;
  let context: BrowserContext | null = null;

  try {
    context = await launchHeadfulContext(options);
  } catch (error) {
    return {
      attempted: true,
      browserStatus: 'unavailable',
      browserMode: 'headful',
      userConfirmationUsed: false,
      sourceType,
      libraryId,
      modalCaptureStatus: 'browser_unavailable',
      headfulCaptureStatus: 'browser_unavailable',
      associatedAdsCaptureStatus: 'browser_unavailable',
      headfulScreenshotPath: null,
      headfulVisibleTextPath: null,
      modalScreenshotPath: null,
      modalVisibleTextPath: null,
      associatedAdsScreenshotPath: null,
      associatedAdsVisibleTextPath: null,
      modalVisibleText: '',
      associatedAdsVisibleText: '',
      extractionNotes: [`Headful browser launch failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  try {
    const page = context.pages()[0] ?? (await context.newPage());
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(input.sourceUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    const userConfirmation = await waitForUserConfirmation(options, input);

    if (userConfirmation.skipped) {
      return {
        attempted: true,
        browserStatus: 'launched',
        browserMode: 'headful',
        userConfirmationUsed: userConfirmation.used,
        sourceType,
        libraryId,
        modalCaptureStatus: 'skipped',
        headfulCaptureStatus: 'skipped',
        associatedAdsCaptureStatus: 'skipped',
        headfulScreenshotPath: null,
        headfulVisibleTextPath: null,
        modalScreenshotPath: null,
        modalVisibleTextPath: null,
        associatedAdsScreenshotPath: null,
        associatedAdsVisibleTextPath: null,
        modalVisibleText: '',
        associatedAdsVisibleText: '',
        extractionNotes: ['User skipped capture for this URL during headful batch review.'],
      };
    }

    await page.waitForTimeout(1000);

    const headfulText = await getVisibleText(page);
    let headfulCaptureStatus: CaptureStatus = headfulText ? 'captured' : 'not_found';

    if (/captcha|security check|temporarily blocked/i.test(headfulText)) {
      headfulCaptureStatus = 'blocked_or_not_visible';
    }

    if (headfulText) {
      writeFileSync(headfulVisibleTextPath, `${headfulText}\n`, 'utf8');
    }

    await page.screenshot({ path: headfulScreenshotPath, fullPage: true }).catch(async () => {
      await page.screenshot({ path: headfulScreenshotPath, fullPage: false }).catch(() => undefined);
    });

    let modalVisibleText = '';
    let modalCaptureStatus: CaptureStatus = 'not_found';
    let savedModalScreenshotPath: string | null = null;
    let savedModalVisibleTextPath: string | null = null;

    if (sourceType === 'specific_ad_detail_url') {
      const modal = await getModalVisibleText(page);
      modalVisibleText = modal.text;
      modalCaptureStatus = modal.found ? 'captured' : headfulCaptureStatus === 'captured' ? 'not_found' : headfulCaptureStatus;

      if (modal.found && modalVisibleTextPath) {
        writeFileSync(modalVisibleTextPath, `${modalVisibleText}\n`, 'utf8');
        savedModalVisibleTextPath = modalVisibleTextPath;
      }

      if (modal.found && modalScreenshotPath) {
        await screenshotModal(page, modalScreenshotPath);
        savedModalScreenshotPath = existsSync(modalScreenshotPath) ? modalScreenshotPath : null;
      }
    }

    return {
      attempted: true,
      browserStatus: 'launched',
      browserMode: 'headful',
      userConfirmationUsed: userConfirmation.used,
      sourceType,
      libraryId,
      modalCaptureStatus,
      headfulCaptureStatus,
      associatedAdsCaptureStatus: 'not_found',
      headfulScreenshotPath: existsSync(headfulScreenshotPath) ? headfulScreenshotPath : null,
      headfulVisibleTextPath: headfulText ? headfulVisibleTextPath : null,
      modalScreenshotPath: savedModalScreenshotPath,
      modalVisibleTextPath: savedModalVisibleTextPath,
      associatedAdsScreenshotPath: null,
      associatedAdsVisibleTextPath: null,
      modalVisibleText,
      associatedAdsVisibleText: headfulText,
      extractionNotes: [
        `Headful capture mode used with profile dir: ${options.profileDir}.`,
        userConfirmation.used
          ? 'User confirmation wait completed before capture.'
          : 'User confirmation wait was not enabled.',
        modalCaptureStatus === 'captured'
          ? 'Dialog-like ad detail content was captured.'
          : 'No dialog-like ad detail content was detected after user confirmation.',
      ],
    };
  } catch (error) {
    return {
      attempted: true,
      browserStatus: 'failed',
      browserMode: 'headful',
      userConfirmationUsed: options.waitForUser,
      sourceType,
      libraryId,
      modalCaptureStatus: 'failed',
      headfulCaptureStatus: 'failed',
      associatedAdsCaptureStatus: 'failed',
      headfulScreenshotPath: null,
      headfulVisibleTextPath: null,
      modalScreenshotPath: null,
      modalVisibleTextPath: null,
      associatedAdsScreenshotPath: null,
      associatedAdsVisibleTextPath: null,
      modalVisibleText: '',
      associatedAdsVisibleText: '',
      extractionNotes: [`Headful browser capture failed: ${error instanceof Error ? error.message : String(error)}`],
    };
  } finally {
    await context?.close().catch(() => undefined);
  }
}

async function runBrowserCapture(input: CaptureAdLibrarySourceInput, slug: string): Promise<BrowserCaptureResult> {
  const options = captureOptions(input.context.repoRoot);

  if (options.headful) {
    return runHeadfulBrowserCapture(input, slug, options);
  }

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
      browserMode: 'headless',
      userConfirmationUsed: false,
      sourceType,
      libraryId,
      modalCaptureStatus: 'browser_unavailable',
      headfulCaptureStatus: 'not_found',
      associatedAdsCaptureStatus: 'browser_unavailable',
      headfulScreenshotPath: null,
      headfulVisibleTextPath: null,
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
      browserMode: 'headless',
      userConfirmationUsed: false,
      sourceType,
      libraryId,
      modalCaptureStatus,
      headfulCaptureStatus: 'not_found',
      associatedAdsCaptureStatus,
      headfulScreenshotPath: null,
      headfulVisibleTextPath: null,
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
      browserMode: 'headless',
      userConfirmationUsed: false,
      sourceType,
      libraryId,
      modalCaptureStatus: 'failed',
      headfulCaptureStatus: 'failed',
      associatedAdsCaptureStatus: 'failed',
      headfulScreenshotPath: null,
      headfulVisibleTextPath: null,
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

function extractBlockForLibraryId(text: string, libraryId: string): string {
  const textLines = lines(text);
  const idIndex = textLines.findIndex((line) => line.includes(`Library ID: ${libraryId}`));

  if (idIndex < 0) {
    return '';
  }

  const startIndex = idIndex > 0 && /^Active$/i.test(textLines[idIndex - 1] ?? '') ? idIndex - 1 : idIndex;
  const nextIdRelativeIndex = textLines
    .slice(idIndex + 1)
    .findIndex((line) => /^Library ID:/i.test(line) || /^Active$/i.test(line));
  const endIndex = nextIdRelativeIndex >= 0 ? idIndex + 1 + nextIdRelativeIndex : Math.min(textLines.length, idIndex + 40);

  return textLines.slice(startIndex, endIndex).join('\n');
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
  const textLines = lines(text);
  const sponsoredIndex = textLines.findIndex((line) => /^Sponsored$/i.test(line));

  if (sponsoredIndex >= 0) {
    const afterSponsored = textLines.slice(sponsoredIndex + 1);
    const urlIndex = afterSponsored.findIndex((line) => /^https?:\/\//i.test(line) || /^[A-Z0-9.-]+\.[A-Z]{2,}/.test(line));
    const copyLines = afterSponsored.slice(0, urlIndex >= 0 ? urlIndex : 1).filter((line) => !/^0:00/.test(line));
    const headline = urlIndex >= 0 ? afterSponsored[urlIndex + 1] ?? '' : '';

    return {
      primaryText: field(copyLines.join(' '), copyLines.length > 0),
      headline: field(headline, headline !== ''),
      description: field('', false),
    };
  }

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
      : capture.sourceType === 'specific_ad_detail_url' &&
          capture.browserMode === 'headful' &&
          capture.headfulCaptureStatus === 'captured' &&
          capture.libraryId !== null &&
          capture.associatedAdsVisibleText.includes(capture.libraryId)
        ? extractBlockForLibraryId(capture.associatedAdsVisibleText, capture.libraryId)
        : capture.sourceType !== 'specific_ad_detail_url' &&
            capture.browserMode === 'headful' &&
            capture.headfulCaptureStatus === 'captured'
        ? capture.associatedAdsVisibleText
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

function fieldCounts(fields: ExtractedFields): { extracted: number; missing: number } {
  const statuses = [
    fields.advertiser.extractionStatus,
    fields.activeStatus.extractionStatus,
    fields.startDateIfVisible.extractionStatus,
    fields.platform.extractionStatus,
    fields.visibleCopy.primaryText.extractionStatus,
    fields.visibleCopy.headline.extractionStatus,
    fields.visibleCopy.description.extractionStatus,
    fields.cta.extractionStatus,
    fields.landingPage.extractionStatus,
    fields.reuseSignals.extractionStatus,
  ];

  return {
    extracted: statuses.filter((status) => status === 'extracted').length,
    missing: statuses.filter((status) => status !== 'extracted').length,
  };
}

function deriveExtractionStatus(
  capture: BrowserCaptureResult,
  counts: { extracted: number; missing: number },
): SourceExtractionStatus {
  if (!capture.attempted) {
    return 'needs_browser_capture';
  }

  const screenshotSaved = Boolean(
    capture.headfulScreenshotPath ?? capture.modalScreenshotPath ?? capture.associatedAdsScreenshotPath,
  );
  const visibleTextSaved = Boolean(
    capture.headfulVisibleTextPath ?? capture.modalVisibleTextPath ?? capture.associatedAdsVisibleTextPath,
  );

  if (!screenshotSaved && !visibleTextSaved && counts.extracted === 0) {
    return 'browser_capture_blocked_or_empty';
  }

  if (counts.extracted >= 5) {
    return 'captured_needs_human_review';
  }

  return 'partial_needs_review';
}

function buildCaptureRecord(input: CaptureAdLibrarySourceInput, capture: BrowserCaptureResult): AdLibraryCaptureFile {
  const extracted = extractFields(capture);
  const extractionStatus = deriveExtractionStatus(capture, fieldCounts(extracted));

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
        browserMode: capture.browserMode,
        userConfirmationUsed: capture.userConfirmationUsed,
        modalCaptureStatus: capture.modalCaptureStatus,
        headfulCaptureStatus: capture.headfulCaptureStatus,
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
        screenshotPath: capture.modalScreenshotPath ?? capture.headfulScreenshotPath ?? capture.associatedAdsScreenshotPath,
        headfulScreenshotPath: capture.headfulScreenshotPath,
        headfulVisibleTextPath: capture.headfulVisibleTextPath,
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
          `Browser mode: ${capture.browserMode}.`,
          `User confirmation used: ${capture.userConfirmationUsed}.`,
          `Headful capture status: ${capture.headfulCaptureStatus}.`,
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
Browser mode: ${example.browserMode}
User confirmation used: ${example.userConfirmationUsed}
Headful capture status: ${example.headfulCaptureStatus}
Modal capture status: ${example.modalCaptureStatus}
Associated ads capture status: ${example.associatedAdsCaptureStatus}
Durable capture path: ${durableCapturePath}

## User Note

${example.userNote}

## Screenshot Paths

- Headful page screenshot: ${example.headfulScreenshotPath ?? 'not captured'}
- Modal screenshot: ${example.modalScreenshotPath ?? 'not captured'}
- Associated ads screenshot: ${example.associatedAdsScreenshotPath ?? 'not captured'}

## Visible Text Paths

- Headful page visible text: ${example.headfulVisibleTextPath ?? 'not captured'}
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

  const outputBasename = input.artifactPrefix
    ? `${input.artifactPrefix}-paid-ads-source-capture`
    : 'paid-ads-source-capture';
  const outputJsonPath = join(input.context.runDir, `${outputBasename}.json`);
  const outputMarkdownPath = join(input.context.runDir, `${outputBasename}.md`);
  const durableCapturePath = join(durableDir, `${slug}.json`);

  writeFileSync(outputJsonPath, `${JSON.stringify(captureRecord, null, 2)}\n`, 'utf8');
  writeFileSync(durableCapturePath, `${JSON.stringify(captureRecord, null, 2)}\n`, 'utf8');
  writeFileSync(outputMarkdownPath, formatMarkdown(captureRecord, durableCapturePath), 'utf8');

  const screenshotPaths = [
    capture.headfulScreenshotPath,
    capture.modalScreenshotPath,
    capture.associatedAdsScreenshotPath,
  ].filter((path): path is string => Boolean(path));
  const visibleTextPaths = [
    capture.headfulVisibleTextPath,
    capture.modalVisibleTextPath,
    capture.associatedAdsVisibleTextPath,
  ].filter((path): path is string => Boolean(path));
  const counts = fieldCounts(extractFields(capture));

  return {
    skillName: 'capture-ad-library-source',
    skillStatus: capture.modalCaptureStatus === 'skipped' || capture.headfulCaptureStatus === 'skipped' ? 'skipped' : 'partial',
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
      browser_mode: capture.browserMode,
      user_confirmation_used: capture.userConfirmationUsed,
      modal_capture_status: capture.modalCaptureStatus,
      extraction_status: captureRecord.examples[0]?.extractionStatus ?? 'unknown',
      screenshot_saved: screenshotPaths.length > 0,
      visible_text_saved: visibleTextPaths.length > 0,
      extracted_fields_count: counts.extracted,
      missing_fields_count: counts.missing,
      screenshot_paths: screenshotPaths,
      visible_text_paths: visibleTextPaths,
      durable_capture_path: durableCapturePath,
    },
  };
}
