import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

type HumanReviewItem = {
  id: string;
  created_at: string;
  title: string | null;
  body: string | null;
  source_evidence: unknown;
  recommendation: string | null;
};

type WorkflowRun = {
  id: string;
  created_at: string;
  workflow_name: string;
};

type SourceEvidence = {
  source?: string;
  source_document_id?: string;
  pain_point_id?: string;
  ad_angle_id?: string;
  url?: string;
  title?: string;
  domain?: string;
  evidence_quote?: string;
  audience_language?: string;
  matched_queries?: string[];
};

type AdAngle = {
  id: string;
  angle: string;
  hook: string | null;
  body_direction: string | null;
  proof_point: string | null;
  risk_note: string | null;
};

type Candidate = {
  reviewItem: HumanReviewItem;
  adAngle: AdAngle | null;
  sourceEvidence: SourceEvidence[];
};

const rejectedHook = "You don't know what you're missing. Find out before it costs you.";
const landingPageUrl = 'https://helloverbatim.com';
const consultantResearchWorkflowNames = [
  'consultant_ad_research_manual_ingest',
  'consultant_ai_pain_search',
];

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

      if (typeof item.source === 'string') {
        evidence.source = item.source;
      }

      if (typeof item.pain_point_id === 'string') {
        evidence.pain_point_id = item.pain_point_id;
      }

      if (typeof item.ad_angle_id === 'string') {
        evidence.ad_angle_id = item.ad_angle_id;
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

      if (typeof item.evidence_quote === 'string') {
        evidence.evidence_quote = item.evidence_quote;
      }

      if (typeof item.audience_language === 'string') {
        evidence.audience_language = item.audience_language;
      }

      if (Array.isArray(item.matched_queries)) {
        evidence.matched_queries = item.matched_queries.filter((query): query is string => typeof query === 'string');
      }

      return evidence;
    });
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

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function chooseHook(candidate: Candidate): string {
  return candidate.adAngle?.hook ?? parseBodyField(candidate.reviewItem.body, 'Hook') ?? candidate.reviewItem.title ?? 'Needs hook review';
}

function chooseBodyDirection(candidate: Candidate): string {
  return candidate.adAngle?.body_direction ?? parseBodyField(candidate.reviewItem.body, 'Body direction') ?? 'Needs body direction review from stored angle.';
}

function chooseProofPoint(candidate: Candidate): string {
  return candidate.adAngle?.proof_point ?? parseBodyField(candidate.reviewItem.body, 'Proof point') ?? 'No proof point stored. Review before use.';
}

function chooseRiskNote(candidate: Candidate): string {
  return candidate.adAngle?.risk_note ?? parseBodyField(candidate.reviewItem.body, 'Risk note') ?? 'No risk note stored. Review before use.';
}

function chooseVisualDirection(candidate: Candidate): string {
  const hook = chooseHook(candidate).toLowerCase();

  if (hook.includes('draft') || hook.includes('ready')) {
    return 'Static text-led concept. Show a polished AI paragraph with one highlighted unsupported claim and a small Verbatim adversarial review note.';
  }

  if (hook.includes('clean') || hook.includes('challenges')) {
    return 'Static split concept. Left side: AI makes the recommendation cleaner. Right side: Verbatim challenges the weak assumption.';
  }

  return 'Static editorial concept. Large direct hook, restrained Verbatim pink accent, evidence-led subcopy, no decorative AI imagery.';
}

function formatEvidence(sourceEvidence: SourceEvidence[]): string[] {
  if (sourceEvidence.length === 0) {
    return ['No structured source evidence stored. Do not approve without adding evidence.'];
  }

  return sourceEvidence.flatMap((evidence, index) => {
    const lines = [`Evidence ${index + 1}:`];

    if (evidence.title !== undefined) {
      lines.push(`- Title: ${evidence.title}`);
    }

    if (evidence.url !== undefined) {
      lines.push(`- URL: ${evidence.url}`);
    }

    if (evidence.evidence_quote !== undefined) {
      lines.push(`- Quote: ${evidence.evidence_quote}`);
    }

    if (evidence.audience_language !== undefined) {
      lines.push(`- Audience language: ${evidence.audience_language}`);
    }

    return lines;
  });
}

function candidateDedupeKey(candidate: Candidate): string {
  const adAngleId = candidate.sourceEvidence.find((evidence) => evidence.ad_angle_id !== undefined)?.ad_angle_id;

  if (adAngleId !== undefined) {
    return `ad_angle:${adAngleId}`;
  }

  return `review:${candidate.reviewItem.title ?? ''}:${candidate.reviewItem.body ?? ''}`;
}

function normalizedHookKey(candidate: Candidate): string {
  return chooseHook(candidate).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function candidateText(candidate: Candidate): string {
  return [
    chooseHook(candidate),
    chooseBodyDirection(candidate),
    candidate.adAngle?.angle ?? '',
    candidate.reviewItem.title ?? '',
    candidate.reviewItem.body ?? '',
    ...candidate.sourceEvidence.flatMap((evidence) => [
      evidence.title ?? '',
      evidence.evidence_quote ?? '',
      evidence.audience_language ?? '',
      ...(evidence.matched_queries ?? []),
    ]),
  ].join(' ').toLowerCase();
}

function candidatePriorityScore(candidate: Candidate): number {
  const text = candidateText(candidate);
  const hook = chooseHook(candidate);
  let score = 0;

  if (hook.trim().endsWith('?')) {
    score += 3;
  }

  if (includesAny(text, ['output and action', 'before action', 'before decision', 'act on ai', 'acted on', 'good enough to use'])) {
    score += 6;
  }

  if (includesAny(text, ['verification', 'reviewing ai outputs', 'review ai output', 'adversarial review', 'review step'])) {
    score += 5;
  }

  if (includesAny(text, ['governance', 'oversight', 'risk management'])) {
    score += 4;
  }

  if (includesAny(text, ['client', 'consultant', 'consulting', 'professional services', 'deliverable', 'business advice', 'business decision'])) {
    score += 4;
  }

  if (includesAny(text, ['hallucination']) && !includesAny(text, ['client', 'professional', 'business', 'consultant', 'deliverable'])) {
    score -= 4;
  }

  if (includesAny(text, ['sycophancy', 'flattery']) && !includesAny(text, ['review', 'decision', 'client', 'business'])) {
    score -= 3;
  }

  return score;
}

function dedupeCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const seenHooks = new Set<string>();
  const deduped: Candidate[] = [];
  const ranked = [...candidates].sort((a, b) => {
    const scoreDifference = candidatePriorityScore(b) - candidatePriorityScore(a);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return b.reviewItem.created_at.localeCompare(a.reviewItem.created_at);
  });

  for (const candidate of ranked) {
    const key = candidateDedupeKey(candidate);
    const hookKey = normalizedHookKey(candidate);

    if (seen.has(key) || seenHooks.has(hookKey)) {
      continue;
    }

    seen.add(key);
    seenHooks.add(hookKey);
    deduped.push(candidate);
  }

  return deduped;
}

function hasSampleEvidence(candidates: Candidate[]): boolean {
  return candidates.some((candidate) => candidate.sourceEvidence.some((evidence) => {
    const url = evidence.url?.toLowerCase() ?? '';
    return url.includes('example.com') || url.includes('manual-sample');
  }));
}

function formatCandidate(candidate: Candidate, index: number): string {
  const hook = chooseHook(candidate);
  const bodyDirection = chooseBodyDirection(candidate);
  const proofPoint = chooseProofPoint(candidate);
  const riskNote = chooseRiskNote(candidate);
  const visualDirection = chooseVisualDirection(candidate);

  return [
    `## Candidate ${index + 1}`,
    '',
    `Hook: ${hook}`,
    '',
    `Body copy direction: ${bodyDirection}`,
    '',
    `Visual direction: ${visualDirection}`,
    '',
    `Proof point: ${proofPoint}`,
    '',
    'Source evidence:',
    '',
    ...formatEvidence(candidate.sourceEvidence),
    '',
    `Risk note: ${riskNote}`,
    '',
    `Suggested landing page: ${landingPageUrl}`,
    '',
    'Approved for design: [ ]',
    '',
  ].join('\n');
}

function formatReview(
  candidates: Candidate[],
  generatedAt: string,
  selectedWorkflowRunId: string,
  candidatesBeforeDedupe: number,
  sampleEvidenceWarning: boolean,
): string {
  const candidateSections = candidates.map((candidate, index) => formatCandidate(candidate, index));
  const candidateCount = candidates.length;
  const countNote = candidateCount >= 5
    ? 'Included 5 candidate ad concepts.'
    : `Included ${candidateCount} available candidate ad concept${candidateCount === 1 ? '' : 's'}.`;

  const sampleWarning = sampleEvidenceWarning
    ? [
      '## Warning',
      '',
      'Warning: this review includes sample source evidence and is not ready for Meta upload.',
      '',
    ].join('\n')
    : '';

  const needMoreEvidence = candidateCount < 5
    ? [
      '## Need More Source Evidence',
      '',
      `Only ${candidateCount} deduped candidate ad concept${candidateCount === 1 ? ' is' : 's are'} available from the selected workflow run.`,
      '',
      `Candidates before dedupe: ${candidatesBeforeDedupe}.`,
      `Candidates after dedupe: ${candidateCount}.`,
      '',
      'Add more stored source documents, pain points, ad angles, and human review items before choosing a final Meta concept set.',
      '',
    ].join('\n')
    : '';

  return [
    '# Verbatim Consultant Ad Review',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Selected workflow_run_id: ${selectedWorkflowRunId}`,
    '',
    'Positioning: Verbatim is adversarial review for AI.',
    '',
    'Problem: AI is prone to overconfidence, hollow flattery, and hallucination. Verbatim challenges AI work before the user acts on it.',
    '',
    countNote,
    '',
    sampleWarning,
    ...candidateSections,
    needMoreEvidence,
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
  .select('id, created_at, workflow_name')
  .in('workflow_name', consultantResearchWorkflowNames)
  .eq('status', 'completed')
  .order('created_at', { ascending: false })
  .limit(1)
  .returns<WorkflowRun[]>();

if (workflowRunResult.error !== null) {
  fail(`Failed to read workflow_runs: ${workflowRunResult.error.message}`);
}

const selectedWorkflowRun = workflowRunResult.data?.[0];

if (selectedWorkflowRun === undefined) {
  fail(`No completed workflow_runs row found for workflow_name in ${consultantResearchWorkflowNames.join(', ')}.`);
}

const reviewResult = await supabase
  .from('human_review_items')
  .select('id, created_at, title, body, source_evidence, recommendation')
  .eq('item_type', 'ad_angle')
  .eq('status', 'pending_review')
  .eq('workflow_run_id', selectedWorkflowRun.id)
  .order('created_at', { ascending: false })
  .limit(25)
  .returns<HumanReviewItem[]>();

if (reviewResult.error !== null) {
  fail(`Failed to read human_review_items: ${reviewResult.error.message}`);
}

const reviewItems = reviewResult.data ?? [];
const evidenceByReviewItemId = new Map<string, SourceEvidence[]>(
  reviewItems.map((item) => [item.id, asSourceEvidence(item.source_evidence)]),
);
const adAngleIds = unique(
  [...evidenceByReviewItemId.values()]
    .flat()
    .map((evidence) => evidence.ad_angle_id ?? ''),
);

let adAnglesById = new Map<string, AdAngle>();

if (adAngleIds.length > 0) {
  const adAnglesResult = await supabase
    .from('ad_angles')
    .select('id, angle, hook, body_direction, proof_point, risk_note')
    .in('id', adAngleIds)
    .returns<AdAngle[]>();

  if (adAnglesResult.error !== null) {
    fail(`Failed to read ad_angles: ${adAnglesResult.error.message}`);
  }

  adAnglesById = new Map((adAnglesResult.data ?? []).map((angle) => [angle.id, angle]));
}

const candidatesBeforeDedupe = reviewItems
  .map((item): Candidate => {
    const sourceEvidence = evidenceByReviewItemId.get(item.id) ?? [];
    const adAngleId = sourceEvidence.find((evidence) => evidence.ad_angle_id !== undefined)?.ad_angle_id;

    return {
      reviewItem: item,
      sourceEvidence,
      adAngle: adAngleId === undefined ? null : adAnglesById.get(adAngleId) ?? null,
    };
  })
  .filter((candidate) => chooseHook(candidate) !== rejectedHook);

const candidates = dedupeCandidates(candidatesBeforeDedupe)
  .slice(0, 5);

const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(process.cwd(), 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'consultant-ad-review.md');

mkdirSync(outputDir, { recursive: true });
writeFileSync(
  outputPath,
  formatReview(
    candidates,
    generatedAt,
    selectedWorkflowRun.id,
    candidatesBeforeDedupe.length,
    hasSampleEvidence(candidates),
  ),
  'utf-8',
);

console.log(`consultant_ad_review_path: ${outputPath}`);
console.log(`selected_workflow_run_id: ${selectedWorkflowRun.id}`);
console.log(`candidate_count_before_dedupe: ${candidatesBeforeDedupe.length}`);
console.log(`candidate_count: ${candidates.length}`);
console.log(`sample_evidence_warning: ${hasSampleEvidence(candidates) ? 'yes' : 'no'}`);
