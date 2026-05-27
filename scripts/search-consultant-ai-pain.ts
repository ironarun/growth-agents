import 'dotenv/config';

import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

type Confidence = 'low' | 'medium' | 'high';

type WorkflowRun = {
  id: string;
};

type RawSourceEvent = {
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

type SerperOrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
};

type SerperResponse = {
  organic?: SerperOrganicResult[];
};

type NormalizedSearchResult = {
  query: string;
  url: string;
  title: string;
  domain: string;
  snippet: string;
  position: number | null;
  matchedQueries: string[];
  rawPayload: Record<string, unknown>;
};

type PainCandidate = {
  pain_point: string;
  audience_language: string;
  objection: string;
  emotional_trigger: string;
  evidence_quote: string;
  confidence: Confidence;
  notes: string;
};

type AdAngleCandidate = {
  angle: string;
  hook: string;
  body_direction: string;
  proof_point: string;
  risk_note: string;
};

const workflowName = 'consultant_ai_pain_search';
const queries = [
  'AI output verification before decision',
  'AI governance reviewing AI outputs',
  'consultants using AI client work risk',
  'AI generated business advice risk',
  'AI hallucination professional services report',
  'AI assisted consulting client deliverables',
];
const maxResultsPerQuery = 5;
const maxSourceDocuments = 30;
const maxPainPoints = 10;
const maxHumanReviewItems = 10;
const audience = 'Independent and boutique consultants';
const serperEndpoint = 'https://google.serper.dev/search';
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

function getDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function chooseEvidenceQuote(result: NormalizedSearchResult): string {
  return result.snippet !== '' ? result.snippet : result.title;
}

function confidenceFor(text: string): Confidence {
  const hasProfessionalContext = includesAny(text, ['client', 'consultant', 'consulting', 'deliverable', 'professional', 'professional services', 'business']);
  const hasReviewContext = includesAny(text, ['verification', 'verify', 'review', 'governance', 'decision', 'decisions', 'risk', 'output', 'outputs']);
  const hasModelFailure = includesAny(text, ['hallucination', 'hallucinate', 'overconfidence', 'confident', 'wrong', 'risk', 'unreliable']);

  if (hasProfessionalContext && hasReviewContext && hasModelFailure) {
    return 'high';
  }

  if ((hasProfessionalContext && hasReviewContext) || (hasReviewContext && hasModelFailure)) {
    return 'medium';
  }

  return 'low';
}

function extractPainCandidate(result: NormalizedSearchResult): PainCandidate | null {
  const combined = normalizeWhitespace(`${result.title} ${result.snippet}`).toLowerCase();

  const hasOutputVerification = includesAny(combined, ['output verification', 'verify ai', 'verification', 'reviewing ai outputs', 'review ai output', 'ai output', 'ai outputs']);
  const hasGovernance = includesAny(combined, ['governance', 'responsible ai', 'risk management', 'oversight', 'controls']);
  const hasDecisionRisk = includesAny(combined, ['decision', 'decisions', 'before decision', 'business advice', 'advice risk', 'act on', 'acting on']);
  const hasClientDeliverable = includesAny(combined, ['client work', 'client deliverable', 'client deliverables', 'consulting', 'consultant', 'professional services', 'report']);
  const hasHallucination = includesAny(combined, ['hallucination', 'hallucinate', 'hallucinated']);
  const hasOverconfidence = includesAny(combined, ['overconfidence', 'overconfident', 'confident but wrong', 'sounds confident but wrong']);
  const hasUnreliableOutput = includesAny(combined, ['wrong', 'mistake', 'unreliable', 'inaccurate', 'false', 'misleading']);
  const hasProfessionalRisk = includesAny(combined, ['client', 'consultant', 'consulting', 'deliverable', 'business advice', 'professional', 'professional services', 'work']);
  const hasTrustGap = hasOutputVerification || hasGovernance || hasDecisionRisk || hasClientDeliverable;

  if (!hasTrustGap && !hasProfessionalRisk) {
    return null;
  }

  if (!(hasOutputVerification || hasGovernance || hasDecisionRisk || hasClientDeliverable || hasHallucination || hasOverconfidence || hasUnreliableOutput)) {
    return null;
  }

  const evidenceQuote = chooseEvidenceQuote(result);
  const confidence = confidenceFor(combined);

  if (hasOutputVerification && hasDecisionRisk) {
    return {
      pain_point: 'Professionals are using AI outputs in decisions faster than those outputs can be independently reviewed.',
      audience_language: 'AI output verification, before decision, AI outputs, business decision risk',
      objection: 'The workflow creates output, then action, but often skips adversarial review.',
      emotional_trigger: 'Discomfort that the important step is not generation. It is knowing when the generated work is good enough to use.',
      evidence_quote: evidenceQuote,
      confidence,
      notes: `Derived conservatively from Serper title/snippet for ${result.url}.`,
    };
  }

  if (hasGovernance) {
    return {
      pain_point: 'AI governance creates a need to review outputs before they become professional or business action.',
      audience_language: 'AI governance, reviewing AI outputs, oversight, risk management',
      objection: 'Governance is hard to operationalize if the review step is separate from the moment of use.',
      emotional_trigger: 'Pressure to move quickly while still proving that risky AI work was challenged.',
      evidence_quote: evidenceQuote,
      confidence,
      notes: `Derived conservatively from Serper title/snippet for ${result.url}.`,
    };
  }

  if (hasClientDeliverable) {
    return {
      pain_point: 'Consultants need a review step between AI-assisted drafts and client-facing deliverables.',
      audience_language: 'AI-assisted consulting, client deliverables, client work risk, professional services report',
      objection: 'A client deliverable can look complete before the assumptions have been challenged.',
      emotional_trigger: 'Fear that the client sees the weak point before the consultant does.',
      evidence_quote: evidenceQuote,
      confidence,
      notes: `Derived conservatively from Serper title/snippet for ${result.url}.`,
    };
  }

  if (hasHallucination && hasProfessionalRisk) {
    return {
      pain_point: 'AI hallucinations become more dangerous when professional services teams move from output to action without review.',
      audience_language: 'AI hallucination, professional services, report, client work',
      objection: 'The risk is not only hallucination. It is hallucination inside work that already looks ready.',
      emotional_trigger: 'Worry that a client-facing report can feel finished before anyone has argued against it.',
      evidence_quote: evidenceQuote,
      confidence,
      notes: `Derived conservatively from Serper title/snippet for ${result.url}.`,
    };
  }

  if ((hasOverconfidence || hasUnreliableOutput) && (hasProfessionalRisk || hasDecisionRisk)) {
    return {
      pain_point: 'AI can produce confident business advice before anyone has challenged whether it should be acted on.',
      audience_language: 'AI-generated business advice risk, confident output, professional decision-making',
      objection: 'Confidence in the answer does not prove the answer survived review.',
      emotional_trigger: 'Concern that a polished recommendation gets treated as judgment too quickly.',
      evidence_quote: evidenceQuote,
      confidence,
      notes: `Derived conservatively from Serper title/snippet for ${result.url}.`,
    };
  }

  return null;
}

function hashText(value: string): number {
  return [...value].reduce((hash, character) => hash + character.charCodeAt(0), 0);
}

function chooseQuestionHook(options: string[], seed: string): string {
  return options[hashText(seed) % options.length] ?? options[0] ?? 'What checked it?';
}

function createAdAngle(painPoint: PainCandidate): AdAngleCandidate {
  const audienceLanguage = painPoint.audience_language.toLowerCase();
  const riskNote = 'Verbatim does not guarantee correctness. Frame it as structured challenge and adversarial review before action.';
  const hookSeed = `${painPoint.audience_language} ${painPoint.evidence_quote}`;

  if (audienceLanguage.includes('output verification') || audienceLanguage.includes('before decision')) {
    return {
      angle: 'Name the missing review step between AI output and action.',
      hook: chooseQuestionHook([
        'What happens between AI output and action?',
        'When does AI work become good enough to use?',
        'Before you act on AI, what checked it?',
      ], hookSeed),
      body_direction: 'Lead with the missing workflow step. People generate, summarize, draft, and analyze with AI, then act. Verbatim adds adversarial review before the work becomes a decision.',
      proof_point: painPoint.evidence_quote,
      risk_note: riskNote,
    };
  }

  if (audienceLanguage.includes('governance') || audienceLanguage.includes('oversight')) {
    return {
      angle: 'Turn AI governance into a practical review moment.',
      hook: chooseQuestionHook([
        'Before you act on AI, who argues the other side?',
        'Your AI sounds ready. Is it?',
        'The draft is confident. What checked it?',
      ], hookSeed),
      body_direction: 'Frame Verbatim as the practical adversarial review layer for teams that need more than policy language before acting on AI output.',
      proof_point: painPoint.evidence_quote,
      risk_note: riskNote,
    };
  }

  if (audienceLanguage.includes('client deliverable') || audienceLanguage.includes('consulting')) {
    return {
      angle: 'Protect the client-facing moment with review before delivery.',
      hook: chooseQuestionHook([
        'Who challenges the answer before it reaches the client?',
        'What reviewed the work before the client did?',
        'Before the client sees it, who pushes back?',
      ], hookSeed),
      body_direction: 'Show the consultant workflow honestly: AI helps draft the work, but the client-facing version needs adversarial review before it leaves the page.',
      proof_point: painPoint.evidence_quote,
      risk_note: riskNote,
    };
  }

  if (audienceLanguage.includes('business advice') || audienceLanguage.includes('professional decision')) {
    return {
      angle: 'Challenge confident AI advice before it becomes a decision.',
      hook: chooseQuestionHook([
        'When does AI work become good enough to use?',
        'What turns AI output into a decision?',
        'The answer sounds useful. Should you act on it?',
      ], hookSeed),
      body_direction: 'Ask the trust question instead of selling fear. Verbatim is the adversarial review step before confident AI work turns into a business decision.',
      proof_point: painPoint.evidence_quote,
      risk_note: riskNote,
    };
  }

  if (audienceLanguage.includes('hallucination')) {
    return {
      angle: 'Move beyond hallucination scare copy into review discipline.',
      hook: chooseQuestionHook([
        'The draft is confident. What checked it?',
        'What did the AI miss before it sounded done?',
        'Is the answer right, or just finished?',
      ], hookSeed),
      body_direction: 'Avoid generic hallucination panic. Focus on the review gap between a confident draft and the moment someone relies on it.',
      proof_point: painPoint.evidence_quote,
      risk_note: riskNote,
    };
  }

  return {
    angle: 'Add adversarial review to the AI workflow.',
    hook: chooseQuestionHook([
      'Your AI sounds ready. Is it?',
      'What checked the answer before you used it?',
      'Where is the review step in your AI workflow?',
    ], hookSeed),
    body_direction: 'Keep the copy spare. Verbatim creates a review layer for moments where trust matters.',
    proof_point: painPoint.evidence_quote,
    risk_note: riskNote,
  };
}

function ensureNotDeprecatedHook(hook: string): string {
  if (hook === deprecatedHook) {
    fail('Generated deprecated hook. Refusing to continue.');
  }

  return hook;
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
const serperApiKey = requireEnv('SERPER_API_KEY');

let workflowRunId: string | null = null;
let rawSourceEventsInserted = 0;
let sourceDocumentsInserted = 0;
let painPointsInserted = 0;
let adAnglesInserted = 0;
let humanReviewItemsInserted = 0;
let weakEvidenceWarnings = 0;

async function updateWorkflowFailure(error: unknown): Promise<void> {
  if (workflowRunId === null) {
    return;
  }

  await supabase
    .from('workflow_runs')
    .update({
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    })
    .eq('id', workflowRunId);
}

try {
  const workflowResult = await supabase
    .from('workflow_runs')
    .insert({
      workflow_name: workflowName,
      status: 'running',
      input: {
        queries,
        max_results_per_query: maxResultsPerQuery,
        version: 'consultant_ai_pain_search_v0',
        limits: {
          max_queries: queries.length,
          max_source_documents: maxSourceDocuments,
          max_pain_points: maxPainPoints,
          max_human_review_items: maxHumanReviewItems,
          full_page_scraping: false,
        },
      },
    })
    .select('id')
    .single<WorkflowRun>();

  if (workflowResult.error !== null) {
    fail(`Failed to create workflow_runs row: ${workflowResult.error.message}`);
  }

  workflowRunId = workflowResult.data.id;
  const resultsByUrl = new Map<string, NormalizedSearchResult>();

  for (const query of queries) {
    const request = {
      q: query,
      num: maxResultsPerQuery,
    };

    let responseJson: unknown;
    let status = 'stored';

    const response = await fetch(serperEndpoint, {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    try {
      responseJson = await response.json();
    } catch {
      responseJson = { non_json_response: await response.text() };
    }

    if (!response.ok) {
      status = 'request_failed';
    }

    const rawEventResult = await supabase
      .from('raw_source_events')
      .insert({
        workflow_run_id: workflowRunId,
        source: 'serper',
        request,
        response: responseJson,
        status,
      })
      .select('id')
      .single<RawSourceEvent>();

    if (rawEventResult.error !== null) {
      fail(`Failed to insert raw_source_events row: ${rawEventResult.error.message}`);
    }

    rawSourceEventsInserted += 1;

    if (!response.ok) {
      fail(`Serper request failed for query "${query}" with HTTP ${response.status}. Raw event was stored.`);
    }

    const serperResponse = responseJson as SerperResponse;
    const organicResults = (serperResponse.organic ?? []).slice(0, maxResultsPerQuery);

    for (const result of organicResults) {
      if (typeof result.link !== 'string' || result.link.trim() === '') {
        continue;
      }

      const url = result.link.trim();
      const existing = resultsByUrl.get(url);

      if (existing !== undefined) {
        existing.matchedQueries.push(query);
        continue;
      }

      const normalized: NormalizedSearchResult = {
        query,
        url,
        title: normalizeWhitespace(result.title ?? 'Untitled search result'),
        domain: getDomain(url),
        snippet: normalizeWhitespace(result.snippet ?? ''),
        position: typeof result.position === 'number' ? result.position : null,
        matchedQueries: [query],
        rawPayload: {
          ...result,
          first_matched_query: query,
          matched_queries: [query],
        },
      };

      resultsByUrl.set(url, normalized);
    }
  }

  const normalizedResults = [...resultsByUrl.values()].slice(0, maxSourceDocuments);

  for (const result of normalizedResults) {
    result.rawPayload.matched_queries = result.matchedQueries;

    const sourceDocumentResult = await supabase
      .from('source_documents')
      .insert({
        workflow_run_id: workflowRunId,
        source: 'serper',
        source_type: 'search_result',
        url: result.url,
        title: result.title,
        domain: result.domain,
        summary: result.snippet,
        raw_payload: result.rawPayload,
      })
      .select('id')
      .single<SourceDocument>();

    if (sourceDocumentResult.error !== null) {
      fail(`Failed to insert source_documents row: ${sourceDocumentResult.error.message}`);
    }

    sourceDocumentsInserted += 1;
    const sourceDocumentId = sourceDocumentResult.data.id;
    const painCandidate = extractPainCandidate(result);

    if (painCandidate === null || painPointsInserted >= maxPainPoints) {
      if (painCandidate === null) {
        weakEvidenceWarnings += 1;
      }

      continue;
    }

    const painPointResult = await supabase
      .from('pain_points')
      .insert({
        workflow_run_id: workflowRunId,
        source_document_id: sourceDocumentId,
        audience,
        pain_point: painCandidate.pain_point,
        audience_language: painCandidate.audience_language,
        objection: painCandidate.objection,
        emotional_trigger: painCandidate.emotional_trigger,
        evidence_quote: painCandidate.evidence_quote,
        confidence: painCandidate.confidence,
        notes: painCandidate.notes,
      })
      .select('id')
      .single<PainPointRow>();

    if (painPointResult.error !== null) {
      fail(`Failed to insert pain_points row: ${painPointResult.error.message}`);
    }

    painPointsInserted += 1;
    const painPointId = painPointResult.data.id;

    if (humanReviewItemsInserted >= maxHumanReviewItems) {
      continue;
    }

    const adAngle = createAdAngle(painCandidate);

    const adAngleResult = await supabase
      .from('ad_angles')
      .insert({
        workflow_run_id: workflowRunId,
        pain_point_id: painPointId,
        audience,
        angle: adAngle.angle,
        hook: ensureNotDeprecatedHook(adAngle.hook),
        body_direction: adAngle.body_direction,
        proof_point: adAngle.proof_point,
        risk_note: adAngle.risk_note,
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
        title: adAngle.angle,
        body: [
          `Hook: ${adAngle.hook}`,
          `Body direction: ${adAngle.body_direction}`,
          `Proof point: ${adAngle.proof_point}`,
          `Risk note: ${adAngle.risk_note}`,
        ].join('\n'),
        source_evidence: [
          {
            source: 'serper',
            source_document_id: sourceDocumentId,
            pain_point_id: painPointId,
            ad_angle_id: adAngleId,
            url: result.url,
            title: result.title,
            domain: result.domain,
            evidence_quote: painCandidate.evidence_quote,
            audience_language: painCandidate.audience_language,
            matched_queries: result.matchedQueries,
          },
        ],
        recommendation: 'Review this Serper-sourced ad angle for the Verbatim consultant Meta test.',
        status: 'pending_review',
      })
      .select('id')
      .single();

    if (reviewResult.error !== null) {
      fail(`Failed to insert human_review_items row: ${reviewResult.error.message}`);
    }

    humanReviewItemsInserted += 1;
  }

  const output = {
    raw_source_events_inserted: rawSourceEventsInserted,
    source_documents_inserted: sourceDocumentsInserted,
    pain_points_inserted: painPointsInserted,
    ad_angles_inserted: adAnglesInserted,
    human_review_items_inserted: humanReviewItemsInserted,
    weak_evidence_warnings: weakEvidenceWarnings,
    evidence_source: 'serper',
  };

  const completedResult = await supabase
    .from('workflow_runs')
    .update({
      status: 'completed',
      output,
    })
    .eq('id', workflowRunId);

  if (completedResult.error !== null) {
    fail(`Failed to update workflow_runs row: ${completedResult.error.message}`);
  }

  console.log(`workflow_run id: ${workflowRunId}`);
  console.log(`raw_source_events inserted: ${rawSourceEventsInserted}`);
  console.log(`source_documents inserted: ${sourceDocumentsInserted}`);
  console.log(`pain_points inserted: ${painPointsInserted}`);
  console.log(`ad_angles inserted: ${adAnglesInserted}`);
  console.log(`human_review_items inserted: ${humanReviewItemsInserted}`);
  console.log(`weak_evidence_warnings: ${weakEvidenceWarnings}`);
  console.log('evidence_source: serper');
} catch (error) {
  await updateWorkflowFailure(error);
  throw error;
}
