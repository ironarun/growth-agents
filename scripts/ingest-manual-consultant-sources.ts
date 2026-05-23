import 'dotenv/config';

import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

type Confidence = 'low' | 'medium' | 'high';

type ManualPainPoint = {
  audience: string;
  pain_point: string;
  audience_language: string;
  objection: string;
  emotional_trigger: string;
  evidence_quote: string;
  confidence: Confidence;
  notes: string;
  ad_angle: string;
  hook: string;
  body_direction: string;
  proof_point: string;
  risk_note: string;
};

type ManualSource = {
  source: string;
  source_type: string;
  url: string;
  title: string;
  domain: string;
  author: string;
  extracted_text: string;
  summary: string;
  pain_points: ManualPainPoint[];
};

type WorkflowRun = {
  id: string;
};

type SourceDocument = {
  id: string;
};

type PainPointRow = {
  id: string;
};

type AdAngleRow = {
  id: string;
};

const repoRoot = process.cwd();
const defaultInputPath = 'agents/paid-ads/workflows/consultant-ad-research/manual-sources.example.json';
const inputPath = resolveInputPath(process.argv[2] ?? defaultInputPath);

function fail(message: string): never {
  throw new Error(message);
}

function resolveInputPath(rawPath: string): string {
  return isAbsolute(rawPath) ? rawPath : resolve(repoRoot, rawPath);
}

function readManualSources(filePath: string): ManualSource[] {
  if (!existsSync(filePath)) {
    fail(`Manual source file does not exist: ${filePath}`);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as unknown;
  } catch (error) {
    fail(`Manual source file is not valid JSON: ${filePath}. ${String(error)}`);
  }

  if (!Array.isArray(parsed)) {
    fail(`Manual source JSON must be an array: ${filePath}`);
  }

  return parsed as ManualSource[];
}

function requireEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    fail(`Missing required environment variable: ${name}`);
  }

  return value;
}

const manualSources = readManualSources(inputPath);
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

const workflowResult = await supabase
  .from('workflow_runs')
  .insert({
    workflow_name: 'consultant_ad_research_manual_ingest',
    status: 'completed',
    input: {
      source_file_path: inputPath,
      source_count: manualSources.length,
    },
  })
  .select('id')
  .single<WorkflowRun>();

if (workflowResult.error !== null) {
  fail(`Failed to create workflow_runs row: ${workflowResult.error.message}`);
}

const workflowRunId = workflowResult.data.id;

let sourceDocumentsInserted = 0;
let painPointsInserted = 0;
let adAnglesInserted = 0;
let humanReviewItemsInserted = 0;

for (const source of manualSources) {
  const sourceDocumentResult = await supabase
    .from('source_documents')
    .insert({
      workflow_run_id: workflowRunId,
      source: source.source,
      source_type: source.source_type,
      url: source.url,
      title: source.title,
      domain: source.domain,
      author: source.author,
      extracted_text: source.extracted_text,
      summary: source.summary,
      raw_payload: source,
    })
    .select('id')
    .single<SourceDocument>();

  if (sourceDocumentResult.error !== null) {
    fail(`Failed to insert source_documents row: ${sourceDocumentResult.error.message}`);
  }

  sourceDocumentsInserted += 1;
  const sourceDocumentId = sourceDocumentResult.data.id;

  for (const painPoint of source.pain_points) {
    const painPointResult = await supabase
      .from('pain_points')
      .insert({
        workflow_run_id: workflowRunId,
        source_document_id: sourceDocumentId,
        audience: painPoint.audience,
        pain_point: painPoint.pain_point,
        audience_language: painPoint.audience_language,
        objection: painPoint.objection,
        emotional_trigger: painPoint.emotional_trigger,
        evidence_quote: painPoint.evidence_quote,
        confidence: painPoint.confidence,
        notes: painPoint.notes,
      })
      .select('id')
      .single<PainPointRow>();

    if (painPointResult.error !== null) {
      fail(`Failed to insert pain_points row: ${painPointResult.error.message}`);
    }

    painPointsInserted += 1;
    const painPointId = painPointResult.data.id;

    const adAngleResult = await supabase
      .from('ad_angles')
      .insert({
        workflow_run_id: workflowRunId,
        pain_point_id: painPointId,
        audience: painPoint.audience,
        angle: painPoint.ad_angle,
        hook: painPoint.hook,
        body_direction: painPoint.body_direction,
        proof_point: painPoint.proof_point,
        risk_note: painPoint.risk_note,
        status: 'planned',
      })
      .select('id')
      .single<AdAngleRow>();

    if (adAngleResult.error !== null) {
      fail(`Failed to insert ad_angles row: ${adAngleResult.error.message}`);
    }

    adAnglesInserted += 1;
    const adAngleId = adAngleResult.data.id;

    const reviewResult = await supabase
      .from('human_review_items')
      .insert({
        workflow_run_id: workflowRunId,
        item_type: 'ad_angle',
        title: painPoint.ad_angle,
        body: [
          `Hook: ${painPoint.hook}`,
          `Body direction: ${painPoint.body_direction}`,
          `Proof point: ${painPoint.proof_point}`,
          `Risk note: ${painPoint.risk_note}`,
        ].join('\n'),
        source_evidence: [
          {
            source_document_id: sourceDocumentId,
            pain_point_id: painPointId,
            ad_angle_id: adAngleId,
            url: source.url,
            title: source.title,
            evidence_quote: painPoint.evidence_quote,
            audience_language: painPoint.audience_language,
          },
        ],
        recommendation: 'Review this ad angle for the Verbatim consultant Meta test.',
        status: 'pending_review',
      })
      .select('id')
      .single();

    if (reviewResult.error !== null) {
      fail(`Failed to insert human_review_items row: ${reviewResult.error.message}`);
    }

    humanReviewItemsInserted += 1;
  }
}

console.log(`workflow_run id: ${workflowRunId}`);
console.log(`source_documents inserted: ${sourceDocumentsInserted}`);
console.log(`pain_points inserted: ${painPointsInserted}`);
console.log(`ad_angles inserted: ${adAnglesInserted}`);
console.log(`human_review_items inserted: ${humanReviewItemsInserted}`);
