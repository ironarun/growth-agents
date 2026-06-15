import 'dotenv/config';

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

type WorkflowRun = {
  id: string;
};

type HumanReviewItem = {
  id: string;
  title: string | null;
  body: string | null;
  source_evidence: unknown;
};

type SourceEvidence = {
  source_document_id?: string;
  url?: string;
  title?: string;
  domain?: string;
  snippet?: string;
  matched_queries?: string[];
};

type SourceDocument = {
  id: string;
  raw_payload: Record<string, unknown> | null;
  summary: string | null;
};

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

type ExtractionResult = {
  firecrawlStatus: 'stored' | 'request_failed' | 'no_text_extracted';
  extractedText: string;
  rawResponse: unknown;
  storedInSupabase: boolean;
  wroteExtractedSourceFile: boolean;
  extractedSourcePath: string | null;
  reviewPath: string;
};

const firecrawlScrapeUrl = 'https://api.firecrawl.dev/v1/scrape';
const repoRoot = process.cwd();

function fail(message: string): never {
  throw new Error(message);
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    fail(`Missing required environment variable: ${name}`);
  }

  return value;
}

function asSourceEvidence(value: unknown): SourceEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const evidence: SourceEvidence = {};

      if (typeof item.source_document_id === 'string') {
        evidence.source_document_id = item.source_document_id;
      }

      if (typeof item.url === 'string') {
        evidence.url = item.url;
      }

      if (typeof item.title === 'string') {
        evidence.title = item.title;
      }

      if (typeof item.domain === 'string') {
        evidence.domain = item.domain;
      }

      if (typeof item.snippet === 'string') {
        evidence.snippet = item.snippet;
      }

      if (Array.isArray(item.matched_queries)) {
        evidence.matched_queries = item.matched_queries.filter((query): query is string => typeof query === 'string');
      }

      return evidence;
    });
}

function chooseSourceEvidence(item: HumanReviewItem): SourceEvidence {
  const evidence = asSourceEvidence(item.source_evidence)[0];

  if (evidence === undefined) {
    fail(`content_opportunity ${item.id} has no source_evidence payload.`);
  }

  if (evidence.url === undefined || evidence.url.trim() === '') {
    fail(`content_opportunity ${item.id} source_evidence has no URL.`);
  }

  return evidence;
}

function chooseExtractedText(response: FirecrawlResponse): string {
  return response.data?.markdown
    ?? response.data?.text
    ?? response.data?.content
    ?? '';
}

function repairMojibake(text: string): string {
  const replacements: Array<[string, string]> = [
    ['â€™', "'"],
    ['â€˜', "'"],
    ['â€œ', '"'],
    ['â€', '"'],
    ['â€\u009d', '"'],
    ['â€”', ' - '],
    ['â€“', ' - '],
    ['â€¦', '...'],
    ['â€¢', '-'],
    ['â€', '"'],
    ['Â\xa0', ' '],
    ['Â ', ' '],
    ['Â', ''],
    ['Ã©', 'e'],
    ['Ã¨', 'e'],
    ['Ã¡', 'a'],
    ['Ã¢', 'a'],
    ['Ã¶', 'o'],
    ['Ã¼', 'u'],
    ['Ã±', 'n'],
    ['’', "'"],
    ['‘', "'"],
    ['“', '"'],
    ['”', '"'],
    ['—', ' - '],
    ['–', ' - '],
    ['…', '...'],
  ];

  return replacements.reduce(
    (repaired, [artifact, replacement]) => repaired.replaceAll(artifact, replacement),
    text,
  );
}

function isLinkedInChromeLine(line: string): boolean {
  const normalized = line.toLowerCase();

  return normalized.includes('agree & join linkedin')
    || normalized.includes('by clicking continue to join or sign in')
    || normalized.includes('user agreement')
    || normalized.includes('privacy policy')
    || normalized.includes('cookie policy')
    || normalized.includes('skip to main content')
    || normalized === 'join linkedin'
    || normalized === 'sign in'
    || normalized === 'join now'
    || normalized === 'continue'
    || normalized.startsWith('new to linkedin?')
    || normalized.startsWith('already on linkedin?');
}

function cleanExtractedText(rawText: string): string {
  const withoutMojibake = repairMojibake(rawText).replace(/\r\n?/g, '\n');
  const cleanedLines = withoutMojibake
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();

      if (/^`{3,}$/.test(trimmed)) {
        return false;
      }

      return !isLinkedInChromeLine(trimmed);
    });

  return cleanedLines
    .join('\n')
    .split('\n')
    .map((line) => repairMojibake(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
}

function excerpt(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}

function formatEvidencePayload(evidence: SourceEvidence): string {
  return JSON.stringify(evidence, null, 2);
}

function formatReview(
  generatedAt: string,
  workflowRunId: string,
  evidence: SourceEvidence,
  result: ExtractionResult,
): string {
  return [
    '# Source Extraction Review',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Selected workflow_run_id: ${workflowRunId}`,
    '',
    `Source title: ${evidence.title ?? 'No title stored'}`,
    '',
    `Source URL: ${evidence.url ?? 'No URL stored'}`,
    '',
    `Domain: ${evidence.domain ?? 'No domain stored'}`,
    '',
    `Firecrawl status: ${result.firecrawlStatus}`,
    '',
    `Extracted text stored in Supabase: ${result.storedInSupabase ? 'yes' : 'no'}`,
    '',
    `Extracted text written to output: ${result.wroteExtractedSourceFile ? 'yes' : 'no'}`,
    '',
    `Extracted text length: ${result.extractedText.length}`,
    '',
    '## Extracted Text Preview',
    '',
    excerpt(result.extractedText, 1500),
    '',
    '## Source Evidence Payload',
    '',
    '```json',
    formatEvidencePayload(evidence),
    '```',
    '',
    'Approved for stronger brief: [ ]',
    '',
  ].join('\n');
}

function hasLinkedInChrome(value: string): boolean {
  return value
    .split(/\r?\n/)
    .some((line) => isLinkedInChromeLine(line.trim()));
}

function hasMojibake(value: string): boolean {
  return repairMojibake(value) !== value;
}

function resolveInputPath(rawPath: string): string {
  return isAbsolute(rawPath) ? rawPath : resolve(repoRoot, rawPath);
}

function formatCleanupReview(
  inputPath: string,
  rawText: string,
  cleanedText: string,
): string {
  return [
    '# Source Cleanup Review',
    '',
    `Input path: ${inputPath}`,
    '',
    `Raw text length: ${rawText.length}`,
    '',
    `Cleaned text length: ${cleanedText.length}`,
    '',
    `Removed chrome: ${hasLinkedInChrome(rawText) && !hasLinkedInChrome(cleanedText) ? 'yes' : 'no'}`,
    '',
    `Mojibake repaired: ${hasMojibake(rawText) && !hasMojibake(cleanedText) ? 'yes' : 'no'}`,
    '',
    'Firecrawl skipped: yes',
    '',
    'Supabase skipped: yes',
    '',
    '## Cleaned Text Preview',
    '',
    excerpt(cleanedText, 1500),
    '',
  ].join('\n');
}

const cleanupInputPath = process.env.CLEAN_EXTRACTED_SOURCE_INPUT_PATH;

if (cleanupInputPath !== undefined && cleanupInputPath.trim() !== '') {
  const inputPath = resolveInputPath(cleanupInputPath);
  const generatedAt = new Date().toISOString();
  const timestamp = generatedAt.replace(/[:.]/g, '-');
  const outputDir = join(repoRoot, 'output', `run-${timestamp}`);
  const cleanedSourcePath = join(outputDir, 'cleaned-extracted-source.md');
  const cleanupReviewPath = join(outputDir, 'source-cleanup-review.md');
  const rawText = readFileSync(inputPath, 'utf-8');
  const cleanedText = cleanExtractedText(rawText);

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(cleanedSourcePath, cleanedText, 'utf-8');
  writeFileSync(cleanupReviewPath, formatCleanupReview(inputPath, rawText, cleanedText), 'utf-8');

  console.log(`source_cleanup_review_path: ${cleanupReviewPath}`);
  console.log(`cleaned_extracted_source_path: ${cleanedSourcePath}`);
  console.log('firecrawl_skipped: yes');
  console.log('supabase_skipped: yes');
  process.exit(0);
}

const supabase = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);
const firecrawlApiKey = requireEnv('FIRECRAWL_API_KEY');

const workflowRunResult = await supabase
  .from('workflow_runs')
  .select('id')
  .eq('workflow_name', 'consultant_ai_pain_search')
  .eq('status', 'completed')
  .order('created_at', { ascending: false })
  .limit(1)
  .returns<WorkflowRun[]>();

if (workflowRunResult.error !== null) {
  fail(`Failed to read workflow_runs: ${workflowRunResult.error.message}`);
}

const selectedWorkflowRun = workflowRunResult.data?.[0];

if (selectedWorkflowRun === undefined) {
  fail('No completed workflow_runs row found for workflow_name consultant_ai_pain_search.');
}

const reviewItemResult = await supabase
  .from('human_review_items')
  .select('id, title, body, source_evidence')
  .eq('workflow_run_id', selectedWorkflowRun.id)
  .eq('item_type', 'content_opportunity')
  .order('created_at', { ascending: true })
  .limit(1)
  .returns<HumanReviewItem[]>();

if (reviewItemResult.error !== null) {
  fail(`Failed to read content_opportunity human_review_items: ${reviewItemResult.error.message}`);
}

const selectedReviewItem = reviewItemResult.data?.[0];

if (selectedReviewItem === undefined) {
  fail(`No content_opportunity human_review_items found for workflow_run_id ${selectedWorkflowRun.id}.`);
}

const sourceEvidence = chooseSourceEvidence(selectedReviewItem);
const selectedUrl = sourceEvidence.url ?? fail('Selected source evidence had no URL.');
const request = {
  url: selectedUrl,
  formats: ['markdown'],
  onlyMainContent: true,
};
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(process.cwd(), 'output', `run-${timestamp}`);
const extractedSourcePath = join(outputDir, 'extracted-source.md');
const reviewPath = join(outputDir, 'source-extraction-review.md');

mkdirSync(outputDir, { recursive: true });

let firecrawlResponse: unknown;
let firecrawlStatus: ExtractionResult['firecrawlStatus'] = 'stored';
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
  firecrawlStatus = 'request_failed';
}

const rawEventResult = await supabase
  .from('raw_source_events')
  .insert({
    workflow_run_id: selectedWorkflowRun.id,
    source: 'firecrawl',
    request,
    response: firecrawlResponse,
    status: firecrawlStatus,
  })
  .select('id')
  .single();

if (rawEventResult.error !== null) {
  fail(`Failed to insert Firecrawl raw_source_events row: ${rawEventResult.error.message}`);
}

if (!firecrawlHttpResponse.ok) {
  const linkedinNote = selectedUrl.includes('linkedin.com') ? ' LinkedIn may be blocking extraction.' : '';
  fail(`Firecrawl request failed for ${selectedUrl} with HTTP ${firecrawlHttpResponse.status}.${linkedinNote}`);
}

const typedFirecrawlResponse = firecrawlResponse as FirecrawlResponse;
const extractedText = cleanExtractedText(chooseExtractedText(typedFirecrawlResponse));

if (extractedText === '') {
  firecrawlStatus = 'no_text_extracted';
}

writeFileSync(extractedSourcePath, extractedText, 'utf-8');

let storedInSupabase = false;
const sourceDocumentId = sourceEvidence.source_document_id;

if (sourceDocumentId !== undefined) {
  const sourceDocumentResult = await supabase
    .from('source_documents')
    .select('id, raw_payload, summary')
    .eq('id', sourceDocumentId)
    .single<SourceDocument>();

  if (sourceDocumentResult.error === null) {
    const existingPayload = sourceDocumentResult.data.raw_payload ?? {};
    const summary = sourceDocumentResult.data.summary;
    const updateResult = await supabase
      .from('source_documents')
      .update({
        extracted_text: extractedText,
        summary: summary !== null && summary.trim() !== ''
          ? summary
          : excerpt(extractedText, 500),
        raw_payload: {
          ...existingPayload,
          firecrawl: {
            extracted_at: generatedAt,
            request,
            status: firecrawlStatus,
            metadata: typedFirecrawlResponse.data?.metadata ?? null,
            raw_source_event_id: rawEventResult.data.id,
          },
        },
      })
      .eq('id', sourceDocumentId);

    if (updateResult.error === null) {
      storedInSupabase = true;
    }
  }
}

const extractionResult: ExtractionResult = {
  firecrawlStatus,
  extractedText,
  rawResponse: firecrawlResponse,
  storedInSupabase,
  wroteExtractedSourceFile: true,
  extractedSourcePath,
  reviewPath,
};

writeFileSync(reviewPath, formatReview(generatedAt, selectedWorkflowRun.id, sourceEvidence, extractionResult), 'utf-8');

if (firecrawlStatus === 'no_text_extracted') {
  const linkedinNote = selectedUrl.includes('linkedin.com') ? ' LinkedIn may be blocking extraction.' : '';
  fail(`Firecrawl returned no extractable text for ${selectedUrl}.${linkedinNote}`);
}

console.log(`source_extraction_review_path: ${reviewPath}`);
console.log(`extracted_source_path: ${extractedSourcePath}`);
console.log(`selected_workflow_run_id: ${selectedWorkflowRun.id}`);
console.log(`selected_source_url: ${selectedUrl}`);
console.log(`firecrawl_status: ${firecrawlStatus}`);
console.log(`stored_in_supabase: ${storedInSupabase ? 'yes' : 'no'}`);
console.log('wrote_extracted_source_file: yes');

