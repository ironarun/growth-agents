import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

type WorkflowRun = {
  id: string;
};

type HumanReviewItem = {
  id: string;
  source_evidence: unknown;
};

type SourceEvidence = {
  source_document_id?: string;
  url?: string;
  title?: string;
  domain?: string;
  snippet?: string;
};

type SourceDocument = {
  id: string;
  url: string | null;
  title: string | null;
  domain: string | null;
  summary: string | null;
  extracted_text: string | null;
};

type SourceAuthorityStrategy = {
  sourceAuthorityTier: 'major outlet' | 'institution' | 'established expert' | 'low-authority individual' | 'unknown';
  basisForTier: string;
  attributionValue: 'borrow credibility' | 'borrow distribution' | 'idea trigger only' | 'avoid naming';
  recommendedAttributionStrategy: 'name directly' | 'mention generally' | 'do not attribute';
  derivativeRisk: 'low' | 'medium' | 'high';
  loadBearingBorrowedElements: string[];
  independentReplacementNeeded: 'yes' | 'no';
  notesForHumanReviewer: string;
};

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

      return evidence;
    });
}

function chooseSourceEvidence(item: HumanReviewItem): SourceEvidence {
  const evidence = asSourceEvidence(item.source_evidence)[0];

  if (evidence === undefined) {
    fail(`content_opportunity ${item.id} has no source_evidence payload.`);
  }

  if (evidence.source_document_id === undefined || evidence.source_document_id.trim() === '') {
    fail(`content_opportunity ${item.id} has no source_document_id. Run npm.cmd run consultant:extract-source after selecting a source.`);
  }

  return evidence;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function removeMarkdownLinks(text: string): string {
  return text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

function cleanSourceForBrief(text: string): string {
  return removeMarkdownLinks(text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => {
      if (line === '') {
        return true;
      }

      if (line.startsWith('![')) {
        return false;
      }

      if (/^`{3,}$/.test(line)) {
        return false;
      }

      if (/^(\* ?){3,}$/.test(line)) {
        return false;
      }

      return !line.includes('media.licdn.com');
    })
    .map((line) => line
      .replace(/^#{1,6}\s+/g, '')
      .replace(/\s+\#{1,6}\s+/g, '. ')
      .replace(/\* \* \*/g, '')
      .replace(/^-+\s*-\s+/g, '- ')
      .replace(/^-\s+-\s+/g, '- ')
      .replace(/`{2,}/g, '')
      .replace(/\s+\d+\.\s*$/g, '')
      .trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function paragraphsFrom(text: string): string[] {
  return cleanSourceForBrief(text)
    .split(/\n{2,}/)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter((paragraph) => paragraph.length > 60)
    .filter((paragraph) => !paragraph.startsWith('http'))
    .filter((paragraph) => !paragraph.includes('media.licdn.com'));
}

function sentencesFrom(text: string): string[] {
  return paragraphsFrom(text)
    .join(' ')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40)
    .map((sentence) => sentence
      .replace(/^[-*]\s+/g, '')
      .replace(/\s+\d+\.\s*$/g, '')
      .trim())
    .filter((sentence) => !sentence.startsWith('!['))
    .filter((sentence) => !sentence.includes('media.licdn.com'));
}

function includesAny(value: string, terms: string[]): boolean {
  const lower = value.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function pickParagraphs(text: string, terms: string[], limit: number): string[] {
  const matched = paragraphsFrom(text).filter((paragraph) => includesAny(paragraph, terms));
  return unique(matched).slice(0, limit);
}

function pickSentences(text: string, terms: string[], limit: number): string[] {
  const matched = sentencesFrom(text).filter((sentence) => includesAny(sentence, terms));
  return unique(matched).slice(0, limit);
}

function fallbackSentences(text: string, limit: number): string[] {
  return unique(sentencesFrom(text)).slice(0, limit);
}

function bulletize(lines: string[]): string[] {
  if (lines.length === 0) {
    return ['- No strong extracted lines found. Review the source manually before drafting.'];
  }

  return lines.map((line) => `- ${line}`);
}

function sourceSummary(extractedText: string): string[] {
  const source = cleanSourceForBrief(extractedText);
  const hasVerificationGap = includesAny(source, ['verification gap', 'validating ai-generated content', 'verification function']);
  const hasHallucinationRisk = includesAny(source, ['hallucination', 'liabilities', 'operational risk']);
  const hasRiskTiers = includesAny(source, ['low risk', 'medium risk', 'high risk', 'critical risk', 'risk tiering']);
  const hasOwnership = includesAny(source, ['review', 'process', 'validating', 'workflow']);

  return bulletize([
    hasVerificationGap
      ? 'The source argues that AI outputs are moving into business workflows faster than organizations have built verification processes around them.'
      : 'The source argues that AI adoption is creating a gap between output generation and reliable review.',
    hasHallucinationRisk
      ? 'It frames hallucination as an operational risk when AI-generated content reaches customers, contracts, compliance decisions, or internal decisions.'
      : 'It treats AI reliability as an operational issue, not just a model-quality issue.',
    hasRiskTiers
      ? 'It argues that review depth should depend on consequence severity, not on whether the output feels polished or plausible.'
      : 'It suggests that different AI outputs need different levels of review depending on how they will be used.',
    hasOwnership
      ? 'It treats verification as an accountability problem: who owns the review step before AI-assisted work becomes action?'
      : 'It raises the practical question of who is responsible for challenging AI output before it is used.',
    'It creates a useful opening for Verbatim\'s argument that confidence is not review and AI workflows need disagreement before action.',
  ]);
}

function cautiousClaims(extractedText: string): string[] {
  const source = cleanSourceForBrief(extractedText);
  const mentionsLegalRisk = includesAny(source, ['lawsuit', 'liability', 'legal']);
  const mentionsTruthLayer = includesAny(source, ['truth layer']);
  const mentionsRiskTiers = includesAny(source, ['low risk', 'medium risk', 'high risk', 'critical risk', 'risk tiering']);
  const enterpriseOriented = includesAny(source, ['enterprise', 'organizations']);
  const mentionsLightweight = includesAny(source, ['lightweight', 'checklist', 'one-page']);

  return bulletize([
    mentionsLegalRisk
      ? 'The source\'s legal-liability framing should be attributed to the source rather than stated as an independent fact.'
      : 'Any legal-risk framing should be kept cautious unless separately verified.',
    mentionsTruthLayer
      ? 'The phrase "truth layer" belongs to the source and should not become Verbatim\'s positioning.'
      : 'Do not borrow the source\'s positioning language as Verbatim positioning.',
    mentionsRiskTiers
      ? 'The source proposes matching verification rigor to the consequence level of the AI output.'
      : 'The source\'s risk categories should be simplified into practical review levels.',
    enterpriseOriented
      ? 'The article is enterprise-oriented, so the final Verbatim piece should translate the idea for consultants, operators, and smaller teams.'
      : 'Translate the source into practical language for readers outside enterprise governance roles.',
    mentionsLightweight
      ? 'The source argues that verification can be lightweight, but the article should not imply that all AI risk can be solved with a checklist.'
      : 'Avoid implying that process alone solves every AI reliability problem.',
    'The strongest reusable idea is the verification gap: AI output is entering workflows without a clear owner for challenge, review, or disagreement.',
  ]);
}

function normalizeBulletForDedupe(bullet: string): string {
  return bullet.toLowerCase().replace(/^- /, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function dedupeBullets(bullets: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const bullet of bullets) {
    const key = normalizeBulletForDedupe(bullet);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(bullet);
  }

  return deduped;
}

function assertBulletQuality(sectionName: string, bullets: string[], expectedCount: number, maxLength: number): void {
  const forbiddenPatterns = [
    '[Like]',
    'media.licdn.com',
    'Low risk: Internal',
    'Medium risk:',
    'High risk:',
    'Critical risk:',
    'Create a one-page',
    '* * *',
    '###',
    '- -',
  ];

  if (bullets.length !== expectedCount) {
    fail(`${sectionName} must contain exactly ${expectedCount} bullets. Found ${bullets.length}.`);
  }

  const deduped = dedupeBullets(bullets);

  if (deduped.length !== bullets.length) {
    fail(`${sectionName} contains duplicate bullets.`);
  }

  const tooLong = bullets.find((bullet) => bullet.replace(/^- /, '').length > maxLength);

  if (tooLong !== undefined) {
    fail(`${sectionName} contains a bullet over ${maxLength} characters: ${tooLong}`);
  }

  const joined = bullets.join('\n');
  const foundForbidden = forbiddenPatterns.filter((pattern) => joined.includes(pattern));

  if (foundForbidden.length > 0) {
    fail(`${sectionName} contains forbidden pattern(s): ${foundForbidden.join(', ')}`);
  }
}

function sourceAuthorityStrategy(sourceDocument: SourceDocument, evidence: SourceEvidence, extractedText: string): SourceAuthorityStrategy {
  const domain = (sourceDocument.domain ?? evidence.domain ?? '').toLowerCase();
  const title = (sourceDocument.title ?? evidence.title ?? '').toLowerCase();
  const source = cleanSourceForBrief(extractedText);
  const hasRecognizedInstitution = [
    'mckinsey.com',
    'bcg.com',
    'bain.com',
    'hbr.org',
    'harvard.edu',
    'stanford.edu',
    'mit.edu',
    'nist.gov',
    'oecd.org',
    'weforum.org',
  ].some((recognizedDomain) => domain.endsWith(recognizedDomain));
  const isMajorOutlet = [
    'nytimes.com',
    'wsj.com',
    'ft.com',
    'economist.com',
    'theatlantic.com',
    'technologyreview.com',
    'wired.com',
  ].some((recognizedDomain) => domain.endsWith(recognizedDomain));
  const isLinkedIn = domain.includes('linkedin.com');
  const hasBorrowedConcreteFrame = includesAny(source, ['truth layer', 'risk tier', 'low risk', 'medium risk', 'high risk', 'critical risk', 'lawsuit', 'liability']);

  if (hasRecognizedInstitution) {
    return {
      sourceAuthorityTier: 'institution',
      basisForTier: `Domain ${domain} appears to be an institutional or research source.`,
      attributionValue: 'borrow credibility',
      recommendedAttributionStrategy: 'name directly',
      derivativeRisk: hasBorrowedConcreteFrame ? 'medium' : 'low',
      loadBearingBorrowedElements: loadBearingElements(source),
      independentReplacementNeeded: hasBorrowedConcreteFrame ? 'yes' : 'no',
      notesForHumanReviewer: 'Naming is likely acceptable, but concrete examples and phrases should still be attributed or independently replaced.',
    };
  }

  if (isMajorOutlet) {
    return {
      sourceAuthorityTier: 'major outlet',
      basisForTier: `Domain ${domain} appears to be a major media source.`,
      attributionValue: 'borrow credibility',
      recommendedAttributionStrategy: 'name directly',
      derivativeRisk: hasBorrowedConcreteFrame ? 'medium' : 'low',
      loadBearingBorrowedElements: loadBearingElements(source),
      independentReplacementNeeded: hasBorrowedConcreteFrame ? 'yes' : 'no',
      notesForHumanReviewer: 'Naming is likely useful if the final article relies on the reporting or framing.',
    };
  }

  if (isLinkedIn) {
    return {
      sourceAuthorityTier: 'low-authority individual',
      basisForTier: `Domain ${domain} is a LinkedIn post. No recognized institution, publication, or author authority signal is available in the warehouse record.`,
      attributionValue: 'idea trigger only',
      recommendedAttributionStrategy: 'do not attribute',
      derivativeRisk: hasBorrowedConcreteFrame ? 'medium' : 'low',
      loadBearingBorrowedElements: loadBearingElements(source),
      independentReplacementNeeded: hasBorrowedConcreteFrame ? 'yes' : 'no',
      notesForHumanReviewer: 'Use the source to trigger the idea, but avoid naming it in the public draft unless directly replying to the post.',
    };
  }

  if (title.includes('by ') || domain !== '') {
    return {
      sourceAuthorityTier: 'unknown',
      basisForTier: `Domain ${domain || 'unknown'} does not provide enough authority signal in the current warehouse record.`,
      attributionValue: 'idea trigger only',
      recommendedAttributionStrategy: 'mention generally',
      derivativeRisk: hasBorrowedConcreteFrame ? 'medium' : 'low',
      loadBearingBorrowedElements: loadBearingElements(source),
      independentReplacementNeeded: hasBorrowedConcreteFrame ? 'yes' : 'no',
      notesForHumanReviewer: 'Mention the idea generally unless a human confirms the source is worth naming.',
    };
  }

  return {
    sourceAuthorityTier: 'unknown',
    basisForTier: 'No reliable source authority signal is available in the current warehouse record.',
    attributionValue: 'avoid naming',
    recommendedAttributionStrategy: 'do not attribute',
    derivativeRisk: hasBorrowedConcreteFrame ? 'medium' : 'low',
    loadBearingBorrowedElements: loadBearingElements(source),
    independentReplacementNeeded: hasBorrowedConcreteFrame ? 'yes' : 'no',
    notesForHumanReviewer: 'Treat as background signal only until authority can be verified.',
  };
}

function loadBearingElements(source: string): string[] {
  const elements: string[] = [];

  if (includesAny(source, ['verification gap'])) {
    elements.push('The phrase "verification gap" appears in the source. It can be used as a general concept, but the draft should not imply the source coined it unless verified.');
  }

  if (includesAny(source, ['truth layer'])) {
    elements.push('The phrase "truth layer" appears to come from the source and should not become Verbatim positioning.');
  }

  if (includesAny(source, ['low risk', 'medium risk', 'high risk', 'critical risk', 'risk tier'])) {
    elements.push('The risk-tier framing appears to come from the source and should be simplified or replaced with independent examples.');
  }

  if (includesAny(source, ['lawsuit', 'liability'])) {
    elements.push('Legal-liability examples appear to come from the source and require attribution or independent verification.');
  }

  return elements.length > 0 ? elements : ['No specific borrowed phrase or example appears load-bearing from the current extracted text.'];
}

function formatAuthorityStrategy(strategy: SourceAuthorityStrategy): string[] {
  return [
    '## Source Authority And Attribution Strategy',
    '',
    `Source authority tier: ${strategy.sourceAuthorityTier}`,
    '',
    `Basis for tier: ${strategy.basisForTier}`,
    '',
    `Attribution value: ${strategy.attributionValue}`,
    '',
    `Recommended attribution strategy: ${strategy.recommendedAttributionStrategy}`,
    '',
    `Derivative risk: ${strategy.derivativeRisk}`,
    '',
    'Load-bearing borrowed elements:',
    ...strategy.loadBearingBorrowedElements.map((element) => `- ${element}`),
    '',
    `Independent replacement needed: ${strategy.independentReplacementNeeded}`,
    '',
    `Notes for human reviewer: ${strategy.notesForHumanReviewer}`,
    '',
  ];
}

function formatReplacementExampleNeed(strategy: SourceAuthorityStrategy): string[] {
  if (strategy.independentReplacementNeeded !== 'yes') {
    return [];
  }

  const elementsToReplace = strategy.loadBearingBorrowedElements.filter((element) => !element.includes('"verification gap"'));

  return [
    '## Replacement Example Need',
    '',
    'Replacement needed: yes',
    '',
    'Reason: borrowed example or framing would be derivative if attribution is dropped.',
    '',
    'What needs replacing:',
    ...(elementsToReplace.length > 0 ? elementsToReplace.map((element) => `- ${element}`) : ['- Source-specific examples or framing that would require attribution if used directly.']),
    '',
    'Replacement source requirements: major outlet, institutional report, official filing, court/regulatory record, company statement, or other higher-authority source.',
    '',
    'Suggested retrieval queries:',
    '- "AI output verification legal risk business"',
    '- "AI governance review AI outputs before decision"',
    '- "AI hallucination professional services client deliverable"',
    '- "AI generated business advice risk verification"',
    '- "AI output validation enterprise workflow"',
    '',
    'Human reviewer note: do not publish until an independent example is selected or the example is removed.',
    '',
  ];
}

function formatBrief(
  generatedAt: string,
  workflowRunId: string,
  sourceDocument: SourceDocument,
  evidence: SourceEvidence,
): string {
  const extractedText = cleanSourceForBrief(sourceDocument.extracted_text ?? '');
  const sourceTitle = sourceDocument.title ?? evidence.title ?? 'Untitled source';
  const sourceUrl = sourceDocument.url ?? evidence.url ?? 'No source URL stored';
  const domain = sourceDocument.domain ?? evidence.domain ?? 'No domain stored';
  const summaryBullets = dedupeBullets(sourceSummary(extractedText));
  const cautiousClaimBullets = dedupeBullets(cautiousClaims(extractedText));
  const authorityStrategy = sourceAuthorityStrategy(sourceDocument, evidence, extractedText);

  assertBulletQuality('Source Summary', summaryBullets, 5, 220);
  assertBulletQuality('Source Claims To Use Carefully', cautiousClaimBullets, 6, 260);

  return [
    '# Content Brief From Extracted Source',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Selected workflow_run_id: ${workflowRunId}`,
    '',
    `Source title: ${sourceTitle}`,
    '',
    `Source URL: ${sourceUrl}`,
    '',
    `Domain: ${domain}`,
    '',
    `Extracted text length: ${extractedText.length}`,
    '',
    '## Source Summary',
    '',
    ...summaryBullets,
    '',
    '## Source Claims To Use Carefully',
    '',
    ...cautiousClaimBullets,
    '',
    ...formatAuthorityStrategy(authorityStrategy),
    ...formatReplacementExampleNeed(authorityStrategy),
    '## Verbatim Angle',
    '',
    'AI creates confident work faster than humans can verify it. Verbatim creates the adversarial review layer for moments where trust matters.',
    '',
    'The useful connection is not to call Verbatim a truth layer. The useful connection is that the source names the operational need for verification, while Verbatim can talk about the missing disagreement step before AI-assisted work becomes action.',
    '',
    'Key question: What part of your AI workflow is responsible for disagreement?',
    '',
    '## Reader Problem',
    '',
    'The reader may already use AI to draft, summarize, analyze, or prepare client-facing work. The practical problem is that confident output can move into action before anyone has challenged the assumptions, checked the reasoning, or created a record of what survived review.',
    '',
    '## Draft Thesis',
    '',
    'The AI workflow is not missing more generation. It is missing a review layer that forces confident AI output to face disagreement before people rely on it.',
    '',
    '## Outline',
    '',
    '1. Open with the verification gap as a useful phrase, not as a product category.',
    '2. Explain the current pattern: generate, summarize, draft, analyze, then act.',
    '3. Name the missing step between output and action.',
    '4. Use the source to show why verification is becoming an operational concern.',
    '5. Distinguish confidence from review.',
    '6. Introduce adversarial review as a practical workflow layer.',
    '7. Explain review categories in plain language before naming any product.',
    '8. End with the disagreement question.',
    '',
    '## Lines Worth Preserving',
    '',
    '- AI creates confident work faster than humans can verify it.',
    '- Confidence is not review.',
    '- What part of your AI workflow is responsible for disagreement?',
    '',
    '## What To Avoid',
    '',
    '- Do not say "truth layer" as Verbatim\'s positioning.',
    '- Do not overclaim legal risk unless directly attributed to the source.',
    '- Do not introduce Debate, Council, or Index in the main body before explaining the practical review categories.',
    '- Do not publish without human review.',
    '',
    '## Suggested CTA',
    '',
    'Before the next AI answer becomes a decision, who is responsible for disagreeing with it?',
    '',
    '## Approval',
    '',
    '- [ ] Approved for draft generation',
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
  .select('id, source_evidence')
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
const sourceDocumentResult = await supabase
  .from('source_documents')
  .select('id, url, title, domain, summary, extracted_text')
  .eq('id', sourceEvidence.source_document_id)
  .single<SourceDocument>();

if (sourceDocumentResult.error !== null) {
  fail(`Failed to read source_documents row ${sourceEvidence.source_document_id}: ${sourceDocumentResult.error.message}`);
}

const sourceDocument = sourceDocumentResult.data;

if (sourceDocument.extracted_text === null || sourceDocument.extracted_text.trim() === '') {
  fail(`No extracted_text found for source_document ${sourceDocument.id}. Run: npm.cmd run consultant:extract-source`);
}

const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(process.cwd(), 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'content-brief-from-source.md');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatBrief(generatedAt, selectedWorkflowRun.id, sourceDocument, sourceEvidence), 'utf-8');

console.log(`content_brief_from_source_path: ${outputPath}`);
console.log(`selected_workflow_run_id: ${selectedWorkflowRun.id}`);
console.log(`selected_source_url: ${sourceDocument.url ?? sourceEvidence.url ?? 'unknown'}`);
console.log(`extracted_text_length: ${sourceDocument.extracted_text.length}`);
