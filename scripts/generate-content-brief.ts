import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

type WorkflowRun = {
  id: string;
  created_at: string;
};

type HumanReviewItem = {
  id: string;
  created_at: string;
  title: string | null;
  body: string | null;
  source_evidence: unknown;
  recommendation: string | null;
  status: string;
};

type SourceEvidence = {
  source?: string;
  source_document_id?: string;
  url?: string;
  title?: string;
  domain?: string;
  snippet?: string;
  matched_queries?: string[];
  suggested_verbatim_angle?: string;
  suggested_response_question?: string;
  why_this_source_matters?: string;
};

type ContentOpportunity = {
  reviewItem: HumanReviewItem;
  evidence: SourceEvidence | null;
};

const preferredTerms = [
  'verification gap',
  'ai output verification',
  'ai output validation',
  'review before action',
  'workflow',
  'decision',
];
const deprecatedHook = "You don't know what you're missing. Find out before it costs you.";

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

function parseBodyField(body: string | null, label: string): string | null {
  if (body === null) {
    return null;
  }

  const line = body
    .split(/\r?\n/)
    .find((candidate) => candidate.toLowerCase().startsWith(`${label.toLowerCase()}:`));

  if (line === undefined) {
    return null;
  }

  return line.slice(label.length + 1).trim();
}

function asSourceEvidence(value: unknown): SourceEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
    .map((item) => {
      const evidence: SourceEvidence = {};

      if (typeof item.source === 'string') {
        evidence.source = item.source;
      }

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

      if (typeof item.suggested_verbatim_angle === 'string') {
        evidence.suggested_verbatim_angle = item.suggested_verbatim_angle;
      }

      if (typeof item.suggested_response_question === 'string') {
        evidence.suggested_response_question = item.suggested_response_question;
      }

      if (typeof item.why_this_source_matters === 'string') {
        evidence.why_this_source_matters = item.why_this_source_matters;
      }

      return evidence;
    });
}

function firstEvidence(item: HumanReviewItem): SourceEvidence | null {
  return asSourceEvidence(item.source_evidence)[0] ?? null;
}

function chooseSourceTitle(opportunity: ContentOpportunity): string {
  return opportunity.evidence?.title
    ?? parseBodyField(opportunity.reviewItem.body, 'Source title')
    ?? opportunity.reviewItem.title
    ?? 'Untitled source';
}

function chooseSourceUrl(opportunity: ContentOpportunity): string {
  return opportunity.evidence?.url
    ?? parseBodyField(opportunity.reviewItem.body, 'Source URL')
    ?? 'No source URL stored.';
}

function chooseSourceDomain(opportunity: ContentOpportunity): string {
  return opportunity.evidence?.domain
    ?? parseBodyField(opportunity.reviewItem.body, 'Domain')
    ?? 'No domain stored.';
}

function chooseSourceSnippet(opportunity: ContentOpportunity): string {
  return opportunity.evidence?.snippet
    ?? parseBodyField(opportunity.reviewItem.body, 'Snippet')
    ?? 'No snippet stored.';
}

function chooseSuggestedAngle(opportunity: ContentOpportunity): string {
  return opportunity.evidence?.suggested_verbatim_angle
    ?? parseBodyField(opportunity.reviewItem.body, 'Suggested Verbatim angle')
    ?? 'Use this source to examine the missing review step in AI workflows.';
}

function chooseSuggestedQuestion(opportunity: ContentOpportunity): string {
  return opportunity.evidence?.suggested_response_question
    ?? parseBodyField(opportunity.reviewItem.body, 'Suggested response question')
    ?? 'What part of your AI workflow is responsible for disagreement?';
}

function chooseWhyItMatters(opportunity: ContentOpportunity): string {
  return opportunity.evidence?.why_this_source_matters
    ?? parseBodyField(opportunity.reviewItem.body, 'Why this source matters')
    ?? 'This source gives Verbatim a surface for response content about adversarial review before action.';
}

function opportunitySearchText(opportunity: ContentOpportunity): string {
  return [
    opportunity.reviewItem.title ?? '',
    opportunity.reviewItem.body ?? '',
    opportunity.reviewItem.recommendation ?? '',
    opportunity.evidence?.title ?? '',
    opportunity.evidence?.snippet ?? '',
    opportunity.evidence?.suggested_verbatim_angle ?? '',
    opportunity.evidence?.suggested_response_question ?? '',
    opportunity.evidence?.why_this_source_matters ?? '',
    ...(opportunity.evidence?.matched_queries ?? []),
  ].join(' ').toLowerCase();
}

function opportunityScore(opportunity: ContentOpportunity): number {
  const text = opportunitySearchText(opportunity);
  return preferredTerms.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
}

function chooseOpportunity(opportunities: ContentOpportunity[]): ContentOpportunity {
  const preferred = opportunities
    .map((opportunity) => ({ opportunity, score: opportunityScore(opportunity) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.opportunity.reviewItem.created_at.localeCompare(b.opportunity.reviewItem.created_at))[0];

  return preferred?.opportunity ?? opportunities[0] ?? fail('No content_opportunity human_review_items found for the latest consultant_ai_pain_search workflow.');
}

function formatEvidence(opportunity: ContentOpportunity): string[] {
  const evidence = opportunity.evidence;

  if (evidence === null) {
    return ['- No structured source evidence stored.'];
  }

  const lines = [
    `- Source: ${evidence.source ?? 'unknown'}`,
    `- Source document id: ${evidence.source_document_id ?? 'not stored'}`,
  ];

  if (evidence.matched_queries !== undefined && evidence.matched_queries.length > 0) {
    lines.push(`- Matched queries: ${evidence.matched_queries.join('; ')}`);
  }

  return lines;
}

function formatBrief(opportunity: ContentOpportunity, generatedAt: string, workflowRunId: string): string {
  const sourceTitle = chooseSourceTitle(opportunity);
  const sourceUrl = chooseSourceUrl(opportunity);
  const sourceDomain = chooseSourceDomain(opportunity);
  const sourceSnippet = chooseSourceSnippet(opportunity);
  const suggestedAngle = chooseSuggestedAngle(opportunity);
  const suggestedQuestion = chooseSuggestedQuestion(opportunity);
  const whyItMatters = chooseWhyItMatters(opportunity);

  return [
    '# Verbatim Content Brief',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Selected workflow_run_id: ${workflowRunId}`,
    '',
    `Source title: ${sourceTitle}`,
    '',
    `Source URL: ${sourceUrl}`,
    '',
    `Source domain: ${sourceDomain}`,
    '',
    `Source snippet: ${sourceSnippet}`,
    '',
    `Suggested Verbatim angle: ${suggestedAngle}`,
    '',
    `Suggested response question: ${suggestedQuestion}`,
    '',
    `Why this source matters: ${whyItMatters}`,
    '',
    '## Working Title Options',
    '',
    '- What Part Of Your AI Workflow Is Responsible For Disagreement?',
    '- The Missing Review Step In AI Work',
    '- When Does AI Output Become Safe To Use?',
    '- Who Challenges The Answer Before You Act?',
    '- AI Work Needs A Disagreement Layer',
    '',
    '## Core Thesis',
    '',
    'AI creates confident work faster than humans can verify it. The missing step is not more generation. It is adversarial review before the output becomes a decision, a client deliverable, or a recommendation someone acts on.',
    '',
    '## Reader Question',
    '',
    'What part of your AI workflow is responsible for disagreement?',
    '',
    '## Outline',
    '',
    '1. Open with the source as a signal, not as a takedown.',
    '2. Name the workflow pattern: generate, summarize, draft, analyze, act.',
    '3. Ask what happens between output and action.',
    '4. Explain why confidence is not the same as review.',
    '5. Position adversarial review as a missing operational layer.',
    '6. Mention Verbatim only as one way to make that review step concrete.',
    '7. End with a question readers can answer from their own workflow.',
    '',
    '## What To Avoid',
    '',
    '- Do not write a full article from this brief.',
    '- Do not hard-sell Verbatim.',
    '- Do not claim Verbatim guarantees truth.',
    '- Do not use generic AI marketing language.',
    '- Do not use: revolutionize, transform, unlock, leverage.',
    `- Do not use the deprecated hook: ${deprecatedHook}`,
    '- Do not overstate what the source proves. Use only the stored title, URL, domain, and snippet until full-page extraction is approved.',
    '',
    '## Internal Verbatim Links To Consider',
    '',
    '- https://helloverbatim.com/',
    '- https://helloverbatim.com/benchmark',
    '- https://helloverbatim.com/benchmark/methodology',
    '- https://helloverbatim.com/about',
    '',
    '## CTA Options',
    '',
    '- Where does disagreement happen in your AI workflow?',
    '- Before you act on AI output, who argues the other side?',
    '- If the answer sounds finished, what still needs to be challenged?',
    '- What would change if review came before action?',
    '',
    '## Source Evidence',
    '',
    ...formatEvidence(opportunity),
    '',
    'Approved for draft: [ ]',
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

const workflowRunResult = await supabase
  .from('workflow_runs')
  .select('id, created_at')
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

const reviewResult = await supabase
  .from('human_review_items')
  .select('id, created_at, title, body, source_evidence, recommendation, status')
  .eq('workflow_run_id', selectedWorkflowRun.id)
  .eq('item_type', 'content_opportunity')
  .in('status', ['pending_review', 'approved'])
  .order('created_at', { ascending: true })
  .returns<HumanReviewItem[]>();

if (reviewResult.error !== null) {
  fail(`Failed to read content_opportunity human_review_items: ${reviewResult.error.message}`);
}

const opportunities = (reviewResult.data ?? []).map((reviewItem): ContentOpportunity => ({
  reviewItem,
  evidence: firstEvidence(reviewItem),
}));
const selectedOpportunity = chooseOpportunity(opportunities);
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(process.cwd(), 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'content-brief.md');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatBrief(selectedOpportunity, generatedAt, selectedWorkflowRun.id), 'utf-8');

console.log(`content_brief_path: ${outputPath}`);
console.log(`selected_workflow_run_id: ${selectedWorkflowRun.id}`);
console.log(`selected_source_title: ${chooseSourceTitle(selectedOpportunity)}`);
console.log(`selected_source_url: ${chooseSourceUrl(selectedOpportunity)}`);
console.log(`source_data: ${selectedOpportunity.evidence?.source ?? 'unknown'}`);

