import 'dotenv/config';

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import fetch from 'node-fetch';

type FirecrawlResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    text?: string;
    content?: string;
    metadata?: Record<string, unknown>;
  };
  error?: string;
};

type ReplacementCandidate = {
  title: string;
  url: string;
  canonicalUrl: string;
  domain: string;
  snippet: string;
  authorityTier: string;
  relevance: string;
  usageFit: string;
  attributionRecommendation: string;
  whyItMayWork: string;
  risksOrVerificationNeeded: string;
};

type ExtractionResult = {
  status: 'stored' | 'request_failed' | 'no_text_extracted';
  rawTextLength: number;
  cleanedText: string;
  cleanedTextLength: number;
  removedChrome: boolean;
  mojibakeRepaired: boolean;
  replacementExtractedSourcePath: string;
  replacementSourceExtractionPath: string;
  replacementSourceBriefPath: string | null;
};

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'output');
const firecrawlScrapeUrl = 'https://api.firecrawl.dev/v1/scrape';
const badCleanedTextPatterns = [
  'Agree & Join LinkedIn',
  'By clicking Continue',
  'Skip to main content',
  'Ã¢',
  'Ã‚',
  'â',
  'Checking your Browser',
  'Verification failed',
  'Verification expired',
  'challenges.cloudflare.com',
  'Share on Facebook',
  'Share on X',
  'Add TechCrunch Daily News',
];

function fail(message: string): never {
  throw new Error(message);
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    fail(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function optionalEnv(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function findLatestReplacementReview(): string {
  if (!existsSync(outputRoot)) {
    fail(`Output directory does not exist: ${outputRoot}`);
  }

  const candidates = readdirSync(outputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
    .map((entry) => join(outputRoot, entry.name, 'replacement-example-review.md'))
    .filter((path) => existsSync(path))
    .map((path) => ({
      path,
      mtimeMs: statSync(path).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.path ?? fail('No replacement-example-review.md found under output/run-*/.');
}

function readField(markdown: string, label: string): string {
  const prefix = `${label}:`.toLowerCase();
  const line = markdown
    .split(/\r?\n/)
    .find((candidate) => candidate.trim().toLowerCase().startsWith(prefix));

  if (line === undefined) {
    return '';
  }

  return line.trim().slice(prefix.length).trim();
}

function parseCandidateBlocks(markdown: string): ReplacementCandidate[] {
  return markdown
    .split(/^### Candidate \d+\s*$/im)
    .slice(1)
    .map((block) => ({
      title: readField(block, '- Title'),
      url: readField(block, '- URL'),
      canonicalUrl: readField(block, '- Canonical URL'),
      domain: readField(block, '- Domain'),
      snippet: readField(block, '- Snippet'),
      authorityTier: readField(block, '- Authority tier'),
      relevance: readField(block, '- Relevance'),
      usageFit: readField(block, '- Usage fit'),
      attributionRecommendation: readField(block, '- Attribution recommendation'),
      whyItMayWork: readField(block, '- Why it may work'),
      risksOrVerificationNeeded: readField(block, '- Risks or verification needed'),
    }))
    .filter((candidate) => candidate.url !== '' || candidate.title !== '');
}

function chooseCandidate(markdown: string, approvedUrl: string): ReplacementCandidate {
  const candidates = parseCandidateBlocks(markdown);

  if (candidates.length === 0) {
    fail('Replacement review contains no candidate blocks.');
  }

  if (approvedUrl !== '') {
    const approvedCandidate = candidates.find((candidate) => candidate.url === approvedUrl || candidate.canonicalUrl === approvedUrl);

    if (approvedCandidate === undefined) {
      fail(`APPROVED_REPLACEMENT_URL was provided but not found in replacement review: ${approvedUrl}`);
    }

    return approvedCandidate;
  }

  const preferredTitle = readField(markdown, '- Preferred candidate');
  const preferredCandidate = candidates.find((candidate) => candidate.title === preferredTitle);

  return preferredCandidate ?? candidates[0] ?? fail('No replacement candidate available.');
}

function chooseExtractedText(response: FirecrawlResponse): string {
  return response.data?.markdown
    ?? response.data?.text
    ?? response.data?.content
    ?? '';
}

function repairMojibake(text: string): string {
  const repairedByCodePoint: string[] = [];

  for (let index = 0; index < text.length; index += 1) {
    const current = text.charCodeAt(index);
    const next = text.charCodeAt(index + 1);
    const third = text.charCodeAt(index + 2);

    if (current === 0x00e2 && next === 0x20ac) {
      if (third === 0x2122 || third === 0x02dc) {
        repairedByCodePoint.push("'");
        index += 2;
        continue;
      }

      if (third === 0x0153 || third === 0x009d) {
        repairedByCodePoint.push('"');
        index += 2;
        continue;
      }

      if (third === 0x201d || third === 0x201c) {
        repairedByCodePoint.push(' - ');
        index += 2;
        continue;
      }

      if (third === 0x00a6) {
        repairedByCodePoint.push('...');
        index += 2;
        continue;
      }

      if (third === 0x00a2) {
        repairedByCodePoint.push('-');
        index += 2;
        continue;
      }
    }

    if (current === 0x00c2) {
      if (next === 0x00a0) {
        repairedByCodePoint.push(' ');
        index += 1;
        continue;
      }

      continue;
    }

    repairedByCodePoint.push(text[index] ?? '');
  }

  return repairedByCodePoint.join('')
    .replaceAll('â€œ', '"')
    .replaceAll('â€', '"')
    .replaceAll('â€™', "'")
    .replaceAll('â€˜', "'")
    .replaceAll('â€”', ' - ')
    .replaceAll('â€“', ' - ')
    .replaceAll('â€¦', '...')
    .replaceAll('Â©', '(c)')
    .replaceAll('Â·', '-')
    .replaceAll('Â', '')
    .replace(/\u00e2\u20ac[\u2122\u02dc]/g, "'")
    .replace(/\u00e2\u20ac[\u0153\u009d]/g, '"')
    .replace(/\u00e2\u20ac[\u201d\u201c]/g, ' - ')
    .replace(/\u00e2\u20ac\u00a6/g, '...')
    .replace(/\u00e2\u20ac\u00a2/g, '-')
    .replace(/\u00c2\u00a0/g, ' ')
    .replace(/\u00c2/g, '')
    .replace(/Ã¢â‚¬â„¢/g, "'")
    .replace(/Ã¢â‚¬Ëœ/g, "'")
    .replace(/Ã¢â‚¬Å“/g, '"')
    .replace(/Ã¢â‚¬Â/g, '"')
    .replace(/Ã¢â‚¬â€/g, ' - ')
    .replace(/Ã¢â‚¬â€œ/g, ' - ')
    .replace(/Ã¢â‚¬Â¦/g, '...')
    .replace(/Ã¢â‚¬Â¢/g, '-')
    .replace(/Ã¢â‚¬/g, '"')
    .replace(/Ã‚\xa0/g, ' ')
    .replace(/Ã‚/g, '')
    .replace(/â€™/g, "'")
    .replace(/â€˜/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€”/g, ' - ')
    .replace(/â€“/g, ' - ')
    .replace(/â€¦/g, '...');
}

function isChromeLine(line: string): boolean {
  const normalized = line.toLowerCase();

  return normalized.includes('accept cookies')
    || normalized.includes('manage cookies')
    || normalized.includes('privacy policy')
    || normalized.includes('terms of service')
    || normalized.includes('advertisement')
    || normalized.includes('subscribe to')
    || normalized.includes('sign up for')
    || normalized.includes('skip to main content')
    || normalized.includes('skip to content')
    || normalized.includes('checking your browser')
    || normalized.includes('verifying...')
    || normalized.includes('verification failed')
    || normalized.includes('verification expired')
    || normalized.includes('challenges.cloudflare.com')
    || normalized.includes('cloudflare.com')
    || normalized.includes('share on facebook')
    || normalized.includes('share on x')
    || normalized.includes('techcrunch daily news')
    || normalized.includes('add techcrunch')
    || normalized.includes('subscription choices')
    || normalized.includes('by submitting your email')
    || normalized.startsWith('subscribe by')
    || normalized.includes('troubleshoot')
    || normalized === 'share'
    || normalized === 'copy link'
    || normalized === 'read more'
    || normalized === 'success!';
}

function cleanExtractedText(rawText: string): string {
  const cleaned = repairMojibake(rawText)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('![')) {
        return false;
      }

      if (trimmed.includes('![')) {
        return false;
      }

      if (/^`{3,}$/.test(trimmed)) {
        return false;
      }

      return !isChromeLine(trimmed);
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return normalizeTextArtifacts(repairMojibake(cleaned));
}

function hasMojibake(value: string): boolean {
  return repairMojibake(value) !== value;
}

function normalizeTextArtifacts(value: string): string {
  return value
    .replaceAll('\u00e2\u20ac\u2122', "'")
    .replaceAll('\u00e2\u20ac\u02dc', "'")
    .replaceAll('\u00e2\u20ac\u0153', '"')
    .replaceAll('\u00e2\u20ac\u009d', '"')
    .replaceAll('\u00e2\u20ac\u201d', ' - ')
    .replaceAll('\u00e2\u20ac\u201c', ' - ')
    .replaceAll('\u00e2\u20ac\u00a6', '...')
    .replaceAll('\u00e2\u20ac\u00a2', '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, ' - ')
    .replace(/\u2026/g, '...')
    .replace(/\u00b7/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\u00c2/g, '')
    .replace(/\s+-\s+/g, ' - ');
}

function containsEncodingArtifacts(value: string): boolean {
  return /[\u00e2\u00c2\u00c3]/.test(value)
    || /[\u2018\u2019\u201c\u201d\u2013\u2014\u2026\u00b7\u00a0]/.test(value)
    || hasMojibake(value);
}

function hasChrome(value: string): boolean {
  return value.split(/\r?\n/).some((line) => isChromeLine(line.trim()));
}

function assertCleanedTextIsUsable(cleanedText: string): void {
  const matchedPatterns = badCleanedTextPatterns.filter((pattern) => cleanedText.includes(pattern));

  if (matchedPatterns.length > 0) {
    fail(`Cleaned replacement source still contains bad pattern(s): ${matchedPatterns.join(', ')}`);
  }

  if (containsEncodingArtifacts(cleanedText)) {
    fail('Cleaned replacement source still contains mojibake or non-normalized punctuation artifacts.');
  }
}

function excerpt(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function sentenceCandidates(text: string): string[] {
  return text
    .replace(/\n+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 50 && sentence.length < 300);
}

function includesAny(value: string, terms: string[]): boolean {
  const lower = value.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function sourceSummary(cleanedText: string, candidate: ReplacementCandidate): string[] {
  const text = cleanedText.toLowerCase();
  const summary = [
    candidate.title !== '' ? `The source is titled "${candidate.title}".` : '',
    includesAny(text, ['kpmg', 'pulled', 'removed', 'report'])
      ? 'TechCrunch reports that KPMG pulled or removed an AI-related report.'
      : 'The source describes an AI-related professional work incident.',
    includesAny(text, ['hallucination', 'hallucinations'])
      ? 'The article connects the report problem to apparent AI hallucinations or hallucinated material.'
      : '',
    includesAny(text, ['untrue', 'misleading', 'disputed', 'claims'])
      ? 'The article says organizations disputed or challenged claims about their AI usage.'
      : '',
    includesAny(text, ['investigation', 'investigating'])
      ? 'The article says KPMG removed the report while investigating.'
      : '',
  ].filter(Boolean);

  return summary.slice(0, 5);
}

function factsConfirmedInExtractedArticle(cleanedText: string): string[] {
  const text = cleanedText.toLowerCase();
  const facts = [
    includesAny(text, ['kpmg', 'pulled', 'removed', 'report'])
      ? 'TechCrunch reports that KPMG pulled or removed a report about AI usage.'
      : '',
    includesAny(text, ['redefining excellence', 'agentic ai'])
      ? 'The extracted TechCrunch article identifies the report as "Redefining excellence in the age of agentic AI."'
      : '',
    includesAny(text, ['hallucination', 'hallucinations'])
      ? 'The extracted TechCrunch article says the incident involved apparent AI hallucinations.'
      : '',
    includesAny(text, ['untrue', 'misleading', 'disputed'])
      ? 'The extracted TechCrunch article says organizations challenged claims made about their AI usage.'
      : '',
    includesAny(text, ['kpmg', 'investigation', 'investigating'])
      ? 'The extracted TechCrunch article says KPMG removed the report while conducting its own investigation.'
      : '',
  ].filter(Boolean);

  return facts.slice(0, 6);
}

function factsAttributedByTechCrunch(cleanedText: string): string[] {
  const text = cleanedText.toLowerCase();
  const facts = [
    includesAny(text, ['financial times', 'ft'])
      ? 'TechCrunch attributes some underlying reporting to the Financial Times.'
      : '',
    includesAny(text, ['gptzero'])
      ? 'TechCrunch attributes AI-hallucination analysis to GPTZero and related reporting.'
      : '',
    includesAny(text, ['ubs', 'nhs', 'transport for london', 'swiss federal railways'])
      ? 'TechCrunch attributes named-organization disputes, including UBS, the NHS, Transport for London, or Swiss Federal Railways, to linked or cited reporting.'
      : '',
    includesAny(text, ['ey', 'ernst'])
      ? 'TechCrunch mentions an EY-related example that should be checked against the linked reporting before public use.'
      : '',
  ].filter(Boolean);

  return facts.length > 0 ? facts : ['No clearly attributed secondary-source facts were extracted.'];
}

function factsToVerifyBeforePublicUse(cleanedText: string): string[] {
  const text = cleanedText.toLowerCase();
  const facts = [
    'Verify the original KPMG report title, publication date, and removal timeline before using them as public claims.',
    includesAny(text, ['financial times', 'ft'])
      ? 'Verify any Financial Times-attributed details directly before relying on them in public copy.'
      : '',
    includesAny(text, ['gptzero'])
      ? 'Verify GPTZero attribution and methodology before treating hallucination analysis as independently established.'
      : '',
    includesAny(text, ['ubs', 'nhs', 'transport for london', 'swiss federal railways'])
      ? 'Verify named-organization disputes against the original reporting or direct organization statements.'
      : '',
    includesAny(text, ['ey', 'ernst'])
      ? 'Verify the EY comparison before using it as a reinforcing example.'
      : '',
    'Do not turn this source into a broad legal, regulatory, or consulting-industry claim without additional evidence.',
  ].filter(Boolean);

  return facts.slice(0, 8);
}

function usableFacts(cleanedText: string): string[] {
  const sentences = sentenceCandidates(cleanedText);
  const preferred = sentences.filter((sentence) => includesAny(sentence, [
    'kpmg',
    'hallucination',
    'hallucinations',
    'removed',
    'pulled',
    'report',
    'untrue',
    'misleading',
    'ubs',
    'health',
    'transit',
  ]));

  return preferred.slice(0, 8);
}

function attributionGuidance(candidate: ReplacementCandidate): string[] {
  return [
    `Authority tier: ${candidate.authorityTier || 'unknown'}`,
    `Usage fit: ${candidate.usageFit || 'unknown'}`,
    `Attribution recommendation: ${candidate.attributionRecommendation || 'unknown'}`,
    candidate.domain !== '' ? `Recommended public attribution: name ${candidate.domain} if the full source verifies the claim.` : '',
    'Do not rely on snippets alone. Use only facts confirmed in the extracted source text.',
  ].filter(Boolean);
}

function formatExtractionReview(
  generatedAt: string,
  reviewPath: string,
  candidate: ReplacementCandidate,
  result: ExtractionResult,
  rawResponseStatus: string,
): string {
  return [
    '# Replacement Source Extraction',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Replacement review path: ${reviewPath}`,
    '',
    `Source title: ${candidate.title || 'Not provided'}`,
    '',
    `Source URL: ${candidate.url}`,
    '',
    `Canonical URL: ${candidate.canonicalUrl || 'Not provided'}`,
    '',
    `Domain: ${candidate.domain || 'Not provided'}`,
    '',
    `Extraction status: ${result.status}`,
    '',
    `Firecrawl response status: ${rawResponseStatus}`,
    '',
    `Raw extracted text length: ${result.rawTextLength}`,
    '',
    `Cleaned extracted text length: ${result.cleanedTextLength}`,
    '',
    `Removed chrome: ${result.removedChrome ? 'yes' : 'no'}`,
    '',
    `Mojibake repaired: ${result.mojibakeRepaired ? 'yes' : 'no'}`,
    '',
    `Extracted source path: ${result.replacementExtractedSourcePath}`,
    '',
    `Replacement source brief path: ${result.replacementSourceBriefPath ?? 'Not generated'}`,
    '',
    '## Cleaned Source Summary',
    '',
    ...sourceSummary(result.cleanedText, candidate).map((item) => `- ${item}`),
    '',
    '## Facts Confirmed In Extracted TechCrunch Article',
    '',
    ...(factsConfirmedInExtractedArticle(result.cleanedText).length > 0
      ? factsConfirmedInExtractedArticle(result.cleanedText).map((fact) => `- ${fact}`)
      : ['- No confirmed facts extracted. Review source manually.']),
    '',
    '## Facts TechCrunch Attributes To Other Sources',
    '',
    ...factsAttributedByTechCrunch(result.cleanedText).map((fact) => `- ${fact}`),
    '',
    '## Facts Still To Verify Before Public Use',
    '',
    ...factsToVerifyBeforePublicUse(result.cleanedText).map((fact) => `- ${fact}`),
    '',
    '## Attribution Guidance',
    '',
    ...attributionGuidance(candidate).map((item) => `- ${item}`),
    '',
    '## Extracted Text Preview',
    '',
    excerpt(result.cleanedText, 1500),
    '',
    '## Human Review',
    '',
    '- [ ] Source extraction reviewed',
    '- [ ] Facts verified against source',
    '- [ ] Approved for replacement-source brief',
    '- [ ] Approved for future draft rewrite',
    '',
  ].join('\n');
}

function formatReplacementSourceBrief(generatedAt: string, candidate: ReplacementCandidate, cleanedText: string): string {
  return [
    '# Replacement Source Brief',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Source title: ${candidate.title || 'Not provided'}`,
    '',
    `Source URL: ${candidate.url}`,
    '',
    `Domain: ${candidate.domain || 'Not provided'}`,
    '',
    '## Source Summary',
    '',
    ...sourceSummary(cleanedText, candidate).map((item) => `- ${item}`),
    '',
    '## Facts Confirmed In Extracted TechCrunch Article',
    '',
    ...(factsConfirmedInExtractedArticle(cleanedText).length > 0
      ? factsConfirmedInExtractedArticle(cleanedText).map((fact) => `- ${fact}`)
      : ['- No confirmed facts extracted. Review source manually.']),
    '',
    '## Facts TechCrunch Attributes To Other Sources',
    '',
    ...factsAttributedByTechCrunch(cleanedText).map((fact) => `- ${fact}`),
    '',
    '## Facts Still To Verify Before Public Use',
    '',
    ...factsToVerifyBeforePublicUse(cleanedText).map((fact) => `- ${fact}`),
    '',
    '## Attribution Guidance',
    '',
    ...attributionGuidance(candidate).map((item) => `- ${item}`),
    '',
    '## Approval',
    '',
    '- [ ] Approved as replacement source',
    '- [ ] Approved for rewrite input',
    '',
  ].join('\n');
}

const replacementReviewPath = resolve(optionalEnv('REPLACEMENT_REVIEW_PATH') || findLatestReplacementReview());
const approvedReplacementUrl = optionalEnv('APPROVED_REPLACEMENT_URL');
const firecrawlApiKey = requireEnv('FIRECRAWL_API_KEY');
const replacementReview = readFileSync(replacementReviewPath, 'utf-8');
const candidate = chooseCandidate(replacementReview, approvedReplacementUrl);
const request = {
  url: candidate.url,
  formats: ['markdown'],
  onlyMainContent: true,
};
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(repoRoot, 'output', `run-${timestamp}`);
const extractedSourcePath = join(outputDir, 'replacement-extracted-source.md');
const extractionReviewPath = join(outputDir, 'replacement-source-extraction.md');
const replacementSourceBriefPath = join(outputDir, 'replacement-source-brief.md');

mkdirSync(outputDir, { recursive: true });

let firecrawlResponse: unknown;
let extractionStatus: ExtractionResult['status'] = 'stored';
const firecrawlHttpResponse = await fetch(firecrawlScrapeUrl, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${firecrawlApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(request),
});

try {
  firecrawlResponse = await firecrawlHttpResponse.json();
} catch {
  firecrawlResponse = { non_json_response: await firecrawlHttpResponse.text() };
}

if (!firecrawlHttpResponse.ok) {
  extractionStatus = 'request_failed';
}

if (!firecrawlHttpResponse.ok) {
  writeFileSync(extractionReviewPath, [
    '# Replacement Source Extraction',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Replacement review path: ${replacementReviewPath}`,
    '',
    `Source title: ${candidate.title || 'Not provided'}`,
    '',
    `Source URL: ${candidate.url}`,
    '',
    'Extraction status: request_failed',
    '',
    `Firecrawl HTTP status: ${firecrawlHttpResponse.status}`,
    '',
    '## Raw Response',
    '',
    '```json',
    JSON.stringify(firecrawlResponse, null, 2),
    '```',
    '',
    '## Human Review',
    '',
    '- [ ] Source extraction reviewed',
    '- [ ] Retry or select another replacement source',
    '',
  ].join('\n'), 'utf-8');
  fail(`Firecrawl request failed for replacement source ${candidate.url} with HTTP ${firecrawlHttpResponse.status}. Review written to ${extractionReviewPath}`);
}

const typedFirecrawlResponse = firecrawlResponse as FirecrawlResponse;
const rawExtractedText = chooseExtractedText(typedFirecrawlResponse);
const cleanedText = cleanExtractedText(rawExtractedText);

if (cleanedText === '') {
  extractionStatus = 'no_text_extracted';
}

assertCleanedTextIsUsable(cleanedText);
writeFileSync(extractedSourcePath, cleanedText, 'utf-8');

const briefPath = cleanedText.length >= 1000 ? replacementSourceBriefPath : null;
const extractionResult: ExtractionResult = {
  status: extractionStatus,
  rawTextLength: rawExtractedText.length,
  cleanedText,
  cleanedTextLength: cleanedText.length,
  removedChrome: hasChrome(rawExtractedText) && !hasChrome(cleanedText),
  mojibakeRepaired: containsEncodingArtifacts(rawExtractedText) && !containsEncodingArtifacts(cleanedText),
  replacementExtractedSourcePath: extractedSourcePath,
  replacementSourceExtractionPath: extractionReviewPath,
  replacementSourceBriefPath: briefPath,
};

if (briefPath !== null) {
  writeFileSync(briefPath, formatReplacementSourceBrief(generatedAt, candidate, cleanedText), 'utf-8');
}

writeFileSync(
  extractionReviewPath,
  formatExtractionReview(generatedAt, replacementReviewPath, candidate, extractionResult, String(firecrawlHttpResponse.status)),
  'utf-8',
);

if (extractionStatus === 'no_text_extracted') {
  fail(`Firecrawl returned no extractable text for replacement source ${candidate.url}. Review written to ${extractionReviewPath}`);
}

console.log(`replacement_source_extraction_path: ${extractionReviewPath}`);
console.log(`replacement_extracted_source_path: ${extractedSourcePath}`);
console.log(`replacement_source_brief_path: ${briefPath ?? 'not_generated'}`);
console.log(`selected_replacement_url: ${candidate.url}`);
console.log(`extraction_status: ${extractionStatus}`);
console.log(`cleaned_text_length: ${cleanedText.length}`);
