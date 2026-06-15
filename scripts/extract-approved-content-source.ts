import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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
const extractedText = chooseExtractedText(typedFirecrawlResponse).trim();

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

