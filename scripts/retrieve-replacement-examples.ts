import 'dotenv/config';

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

type AuthorityTier = 'major outlet' | 'institution' | 'company statement' | 'official record' | 'trade publication' | 'low authority' | 'unknown';
type Relevance = 'high' | 'medium' | 'low';
type UsageFit = 'strong concrete example' | 'possible concrete example' | 'background only' | 'avoid';
type AttributionRecommendation = 'name directly' | 'mention generally' | 'do not use';
type PageType = 'article' | 'author page' | 'tag page' | 'sponsor page' | 'snippet page' | 'category page' | 'homepage' | 'search page' | 'unknown';

type SerperOrganicResult = {
  title?: string;
  link?: string;
  snippet?: string;
  position?: number;
};

type SerperResponse = {
  organic?: SerperOrganicResult[];
};

type BriefData = {
  path: string;
  workflowRunId: string;
  originalSourceUrl: string;
  sourceAuthorityTier: string;
  attributionStrategy: string;
  replacementNeeded: string;
  replacementReason: string;
  whatNeedsReplacing: string[];
  replacementSourceRequirements: string;
  suggestedQueries: string[];
};

type Candidate = {
  title: string;
  url: string;
  canonicalUrl: string;
  domain: string;
  pageType: PageType;
  snippet: string;
  query: string;
  authorityTier: AuthorityTier;
  relevance: Relevance;
  usageFit: UsageFit;
  attributionRecommendation: AttributionRecommendation;
  whyItMayWork: string;
  risksOrVerificationNeeded: string;
  score: number;
};

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'output');
const serperEndpoint = 'https://google.serper.dev/search';
const maxResultsPerQuery = 5;
const maxCandidates = 8;
const incidentFocusedQueries = [
  'site:techcrunch.com KPMG pulls report AI hallucinations',
  'KPMG pulls report AI usage hallucinations',
  'AI hallucination report withdrawn',
  'AI generated report withdrawn',
  'AI hallucination consulting report',
  'AI error client deliverable professional services',
  'AI generated citation error business report',
  'professional services AI hallucination client report',
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

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function getDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function canonicalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    parsed.search = '';
    parsed.hash = '';
    parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

function includesAny(value: string, terms: string[]): boolean {
  const lower = value.toLowerCase();
  return terms.some((term) => lower.includes(term));
}

function findLatestBrief(): string {
  if (!existsSync(outputRoot)) {
    fail(`Output directory does not exist: ${outputRoot}`);
  }

  const candidates = readdirSync(outputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
    .map((entry) => join(outputRoot, entry.name, 'content-brief-from-source.md'))
    .filter((path) => existsSync(path))
    .map((path) => ({
      path,
      mtimeMs: statSync(path).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.path ?? fail('No content-brief-from-source.md found under output/run-*/.');
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

function readSection(markdown: string, heading: string): string {
  const lines = markdown.split(/\r?\n/);
  const headingLine = `## ${heading}`.toLowerCase();
  const startIndex = lines.findIndex((line) => line.trim().toLowerCase() === headingLine);

  if (startIndex === -1) {
    return '';
  }

  const sectionLines: string[] = [];

  for (const line of lines.slice(startIndex + 1)) {
    if (line.trim().startsWith('## ')) {
      break;
    }

    sectionLines.push(line);
  }

  return sectionLines.join('\n').trim();
}

function readListAfterLabel(markdown: string, label: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const startIndex = lines.findIndex((line) => line.trim().toLowerCase() === `${label.toLowerCase()}:`);

  if (startIndex === -1) {
    return [];
  }

  const values: string[] = [];

  for (const line of lines.slice(startIndex + 1)) {
    const trimmed = line.trim();

    if (trimmed === '') {
      continue;
    }

    if (!trimmed.startsWith('- ')) {
      break;
    }

    values.push(trimmed.slice(2).trim());
  }

  return values.filter(Boolean);
}

function parseSuggestedQueries(markdown: string): string[] {
  return readListAfterLabel(markdown, 'Suggested retrieval queries')
    .map((query) => query.replace(/^"|"$/g, ''));
}

function parseBrief(path: string, markdown: string): BriefData {
  const replacementSection = readSection(markdown, 'Replacement Example Need');
  const replacementReason = readField(markdown, 'Reason');

  return {
    path,
    workflowRunId: readField(markdown, 'Selected workflow_run_id'),
    originalSourceUrl: readField(markdown, 'Source URL'),
    sourceAuthorityTier: readField(markdown, 'Source authority tier'),
    attributionStrategy: readField(markdown, 'Recommended attribution strategy'),
    replacementNeeded: readField(markdown, 'Replacement needed'),
    replacementReason,
    whatNeedsReplacing: readListAfterLabel(replacementSection, 'What needs replacing'),
    replacementSourceRequirements: readField(markdown, 'Replacement source requirements'),
    suggestedQueries: parseSuggestedQueries(markdown),
  };
}

function pageTypeFor(url: string): PageType {
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase().replace(/\/+$/, '') || '/';

    if (path === '/') {
      return 'homepage';
    }

    if (path.includes('/search') || parsed.searchParams.has('s')) {
      return 'search page';
    }

    if (path.startsWith('/sponsor/')) {
      return 'sponsor page';
    }

    if (path.startsWith('/author/')) {
      return 'author page';
    }

    if (path.startsWith('/tag/')) {
      return 'tag page';
    }

    if (path.startsWith('/snippet/')) {
      return 'snippet page';
    }

    if (path.startsWith('/category/') || path.startsWith('/topic/') || path.startsWith('/topics/')) {
      return 'category page';
    }

    if (/\/20\d{2}\/\d{2}\/\d{2}\//.test(path) || path.split('/').filter(Boolean).length >= 2) {
      return 'article';
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function isNavigationalPage(pageType: PageType): boolean {
  return ['author page', 'tag page', 'sponsor page', 'snippet page', 'category page', 'homepage', 'search page'].includes(pageType);
}

function hasIncidentTermInTitleOrCanonicalUrl(title: string, canonicalUrl: string): boolean {
  const titleLower = title.toLowerCase();
  const path = (() => {
    try {
      return new URL(canonicalUrl).pathname.toLowerCase();
    } catch {
      return canonicalUrl.toLowerCase();
    }
  })();

  return includesAny(titleLower, ['kpmg', 'pulls report', 'report withdrawn', 'withdrawn report', 'hallucination', 'hallucinations', 'fake citations', 'disputed claims', 'report error', 'ai usage'])
    || includesAny(path, ['kpmg', 'pulls-report', 'report-withdrawn', 'withdrawn-report', 'hallucination', 'hallucinations', 'fake-citations', 'disputed-claims', 'report-error', 'ai-usage']);
}

function isGoldKpmgTechCrunchCandidate(domain: string, title: string, canonicalUrl: string, pageType: PageType): boolean {
  const titleAndUrlIdentifyIncident = hasIncidentTermInTitleOrCanonicalUrl(title, canonicalUrl);

  return domain === 'techcrunch.com'
    && pageType === 'article'
    && titleAndUrlIdentifyIncident;
}

function hasConcreteIncidentSignal(title: string, snippet: string): boolean {
  const combined = `${title} ${snippet}`.toLowerCase();

  return includesAny(combined, [
    'report withdrawn',
    'withdrawn report',
    'pulls report',
    'pulled report',
    'report corrected',
    'corrected report',
    'hallucinated citations',
    'fake citations',
    'client deliverable error',
    'legal filing error',
    'business report error',
    'professional services error',
    'public correction',
    'regulatory consequence',
    'court consequence',
    'disputing ai-generated claims',
    'disputed claims',
    'apparent hallucinations',
  ]);
}

function titleOrCanonicalUrlHasConcreteIncidentSignal(title: string, canonicalUrl: string): boolean {
  return hasIncidentTermInTitleOrCanonicalUrl(title, canonicalUrl);
}

function isBackgroundExplainer(title: string, snippet: string): boolean {
  const combined = `${title} ${snippet}`.toLowerCase();

  return includesAny(combined, [
    'what is ai governance',
    'ai governance guide',
    'best practices',
    'framework',
    'how to reduce risk',
    'policy guide',
    'guide to ai governance',
    'governance framework',
  ]);
}

function authorityTierFor(domain: string, title: string, snippet: string): AuthorityTier {
  const combined = `${domain} ${title} ${snippet}`.toLowerCase();
  const institutionDomains = [
    'nist.gov',
    'ftc.gov',
    'sec.gov',
    'justice.gov',
    'gao.gov',
    'oecd.org',
    'weforum.org',
    'harvard.edu',
    'stanford.edu',
    'mit.edu',
    'mckinsey.com',
    'bcg.com',
    'bain.com',
    'hbr.org',
  ];
  const majorOutletDomains = [
    'nytimes.com',
    'wsj.com',
    'ft.com',
    'economist.com',
    'theatlantic.com',
    'technologyreview.com',
    'wired.com',
    'reuters.com',
    'apnews.com',
    'bbc.com',
    'techcrunch.com',
  ];
  const tradeDomains = [
    'cio.com',
    'csoonline.com',
    'darkreading.com',
    'venturebeat.com',
    'zdnet.com',
    'computerworld.com',
    'informationweek.com',
  ];

  if (institutionDomains.some((recognizedDomain) => domain.endsWith(recognizedDomain))) {
    return domain.endsWith('.gov') || includesAny(combined, ['court', 'regulator', 'regulatory', 'filing']) ? 'official record' : 'institution';
  }

  if (majorOutletDomains.some((recognizedDomain) => domain.endsWith(recognizedDomain))) {
    return 'major outlet';
  }

  if (tradeDomains.some((recognizedDomain) => domain.endsWith(recognizedDomain))) {
    return 'trade publication';
  }

  if (includesAny(domain, ['openai.com', 'anthropic.com', 'microsoft.com', 'google.com', 'ibm.com', 'salesforce.com'])) {
    return 'company statement';
  }

  if (includesAny(domain, ['linkedin.com', 'medium.com', 'substack.com', 'reddit.com', 'quora.com'])) {
    return 'low authority';
  }

  return 'unknown';
}

function relevanceFor(title: string, snippet: string): Relevance {
  const combined = `${title} ${snippet}`.toLowerCase();
  const hasAiRisk = includesAny(combined, ['ai', 'chatgpt', 'genai', 'generative ai']);
  const hasVerification = includesAny(combined, ['verification', 'validate', 'validation', 'review', 'governance', 'risk', 'hallucination', 'liability']);
  const hasBusinessContext = includesAny(combined, ['business', 'professional', 'client', 'consulting', 'report', 'decision', 'enterprise']);

  if (hasConcreteIncidentSignal(title, snippet) || (hasAiRisk && hasVerification && hasBusinessContext)) {
    return 'high';
  }

  if (hasAiRisk && (hasVerification || hasBusinessContext)) {
    return 'medium';
  }

  return 'low';
}

function usageFitFor(authorityTier: AuthorityTier, relevance: Relevance, domain: string, title: string, snippet: string, canonicalUrl: string, pageType: PageType): UsageFit {
  if (isNavigationalPage(pageType)) {
    return isBackgroundExplainer(title, snippet) ? 'background only' : 'avoid';
  }

  if (isGoldKpmgTechCrunchCandidate(domain, title, canonicalUrl, pageType)) {
    return 'strong concrete example';
  }

  if (authorityTier === 'low authority' || includesAny(domain, ['reddit.com', 'quora.com'])) {
    return 'avoid';
  }

  if (isBackgroundExplainer(title, snippet)) {
    return authorityTier === 'unknown' ? 'avoid' : 'background only';
  }

  if (pageType === 'article' && titleOrCanonicalUrlHasConcreteIncidentSignal(title, canonicalUrl)) {
    if (['major outlet', 'institution', 'company statement', 'official record', 'trade publication'].includes(authorityTier)) {
      return 'strong concrete example';
    }

    return 'possible concrete example';
  }

  if (pageType === 'article' && hasConcreteIncidentSignal(title, snippet) && relevance === 'high') {
    return 'possible concrete example';
  }

  if (relevance === 'medium' && authorityTier !== 'unknown') {
    return 'background only';
  }

  return 'avoid';
}

function attributionRecommendationFor(usageFit: UsageFit, authorityTier: AuthorityTier): AttributionRecommendation {
  if (usageFit === 'strong concrete example') {
    return 'name directly';
  }

  if ((usageFit === 'possible concrete example' || usageFit === 'background only') && authorityTier !== 'low authority') {
    return 'mention generally';
  }

  return 'do not use';
}

function scoreCandidate(authorityTier: AuthorityTier, relevance: Relevance, usageFit: UsageFit): number {
  const authorityScore: Record<AuthorityTier, number> = {
    'official record': 6,
    institution: 5,
    'major outlet': 5,
    'company statement': 4,
    'trade publication': 3,
    unknown: 1,
    'low authority': -4,
  };
  const relevanceScore: Record<Relevance, number> = {
    high: 4,
    medium: 2,
    low: 0,
  };
  const usageScore: Record<UsageFit, number> = {
    'strong concrete example': 6,
    'possible concrete example': 3,
    'background only': 1,
    avoid: -5,
  };

  return authorityScore[authorityTier] + relevanceScore[relevance] + usageScore[usageFit];
}

function createCandidate(result: SerperOrganicResult, query: string): Candidate | null {
  if (typeof result.link !== 'string' || result.link.trim() === '') {
    return null;
  }

  const url = result.link.trim();
  const canonicalUrl = canonicalizeUrl(url);
  const domain = getDomain(url);
  const pageType = pageTypeFor(canonicalUrl);
  const title = normalizeWhitespace(result.title ?? 'Untitled result');
  const snippet = normalizeWhitespace(result.snippet ?? '');
  const authorityTier = authorityTierFor(domain, title, snippet);
  const goldCandidate = isGoldKpmgTechCrunchCandidate(domain, title, canonicalUrl, pageType);
  const relevance = goldCandidate ? 'high' : relevanceFor(title, snippet);
  const usageFit = usageFitFor(authorityTier, relevance, domain, title, snippet, canonicalUrl, pageType);
  const attributionRecommendation = attributionRecommendationFor(usageFit, authorityTier);

  return {
    title,
    url,
    canonicalUrl,
    domain,
    pageType,
    snippet,
    query,
    authorityTier,
    relevance,
    usageFit,
    attributionRecommendation,
    whyItMayWork: whyItMayWork(authorityTier, relevance, title, snippet),
    risksOrVerificationNeeded: risksOrVerificationNeeded(authorityTier, usageFit),
    score: scoreCandidate(authorityTier, relevance, usageFit),
  };
}

function whyItMayWork(authorityTier: AuthorityTier, relevance: Relevance, title: string, snippet: string): string {
  if (hasConcreteIncidentSignal(title, snippet) && relevance === 'high' && authorityTier !== 'low authority') {
    return 'It appears to describe a concrete AI-related incident, correction, withdrawal, disputed claim, or professional work failure from a higher-authority source surface.';
  }

  if (relevance === 'high' && authorityTier !== 'low authority') {
    return 'It appears relevant to AI verification in business or professional contexts, but may still need a more concrete incident angle.';
  }

  if (relevance === 'medium') {
    return 'It may provide background context for the verification gap, but the snippet is not enough to make it a strong example yet.';
  }

  return `The snippet is weak for this draft angle. Review manually before using. Title: ${title || snippet}`;
}

function risksOrVerificationNeeded(authorityTier: AuthorityTier, usageFit: UsageFit): string {
  if (usageFit === 'avoid') {
    return 'Do not use without manual review. The source appears low-authority, off-angle, or insufficient from snippet evidence.';
  }

  if (usageFit === 'background only') {
    return 'Use only for background context. Do not use as the replacement example because it is not a concrete incident.';
  }

  if (authorityTier === 'official record') {
    return 'Verify the record context directly before publication. Snippets alone are not enough for legal or regulatory claims.';
  }

  return 'Verify the full page before publication. Snippet evidence only identifies a candidate example, not a confirmed fact pattern.';
}

function dedupeCandidates(candidates: Candidate[]): Candidate[] {
  const seen = new Set<string>();
  const deduped: Candidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.canonicalUrl.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(candidate);
  }

  return deduped;
}

function candidatesByUsage(candidates: Candidate[], usageFit: UsageFit): Candidate[] {
  return candidates.filter((candidate) => candidate.usageFit === usageFit);
}

function formatCandidate(candidate: Candidate, index: number): string[] {
  return [
    `### Candidate ${index + 1}`,
    '',
    `- Title: ${candidate.title}`,
    `- URL: ${candidate.url}`,
    `- Canonical URL: ${candidate.canonicalUrl}`,
    `- Domain: ${candidate.domain}`,
    `- Page type: ${candidate.pageType}`,
    `- Snippet: ${candidate.snippet || 'No snippet returned.'}`,
    `- Authority tier: ${candidate.authorityTier}`,
    `- Relevance: ${candidate.relevance}`,
    `- Usage fit: ${candidate.usageFit}`,
    `- Attribution recommendation: ${candidate.attributionRecommendation}`,
    `- Why it may work: ${candidate.whyItMayWork}`,
    `- Risks or verification needed: ${candidate.risksOrVerificationNeeded}`,
    '',
  ];
}

function formatCandidateGroup(title: string, candidates: Candidate[]): string[] {
  return [
    `## ${title}`,
    '',
    ...(candidates.length > 0
      ? candidates.flatMap((candidate, index) => formatCandidate(candidate, index))
      : ['No candidates in this category.', '']),
  ];
}

function choosePreferredCandidate(candidates: Candidate[]): Candidate | undefined {
  return candidates.find((candidate) => candidate.usageFit === 'strong concrete example')
    ?? candidates.find((candidate) => candidate.usageFit === 'possible concrete example');
}

function assertGuardrails(briefMarkdown: string, brief: BriefData, candidates: Candidate[], preferred: Candidate | undefined): void {
  const hasReplacementSection = readSection(briefMarkdown, 'Replacement Example Need') !== '';

  if (hasReplacementSection && brief.replacementReason.trim() === '') {
    fail('Replacement Example Need section is present, but Reason was not parsed.');
  }

  if (hasReplacementSection && brief.whatNeedsReplacing.length === 0) {
    fail('Replacement Example Need section contains a What needs replacing list, but it was not parsed.');
  }

  if (preferred?.usageFit === 'background only') {
    fail('Preferred candidate is background only. Refusing to write review.');
  }

  const strongNavigationalCandidate = candidates.find((candidate) => {
    return candidate.usageFit === 'strong concrete example' && isNavigationalPage(candidate.pageType);
  });

  if (strongNavigationalCandidate !== undefined) {
    fail(`Navigational URL was classified as strong concrete example: ${strongNavigationalCandidate.url}`);
  }

  const seenCanonicalUrls = new Set<string>();
  const duplicateCanonicalCandidate = candidates.find((candidate) => {
    const key = candidate.canonicalUrl.toLowerCase();

    if (seenCanonicalUrls.has(key)) {
      return true;
    }

    seenCanonicalUrls.add(key);
    return false;
  });

  if (duplicateCanonicalCandidate !== undefined) {
    fail(`Duplicate canonical URL appeared in candidate output: ${duplicateCanonicalCandidate.canonicalUrl}`);
  }

  const misclassifiedGoldCandidate = candidates.find((candidate) => {
    return candidate.domain === 'techcrunch.com'
      && candidate.pageType === 'article'
      && hasIncidentTermInTitleOrCanonicalUrl(candidate.title, candidate.canonicalUrl)
      && candidate.usageFit !== 'strong concrete example';
  });

  if (misclassifiedGoldCandidate !== undefined) {
    fail(`TechCrunch/KPMG candidate appeared but was not classified as strong concrete example: ${misclassifiedGoldCandidate.title}`);
  }
}

function formatReview(generatedAt: string, brief: BriefData, queries: string[], candidates: Candidate[]): string {
  const strongCandidates = candidatesByUsage(candidates, 'strong concrete example');
  const possibleCandidates = candidatesByUsage(candidates, 'possible concrete example');
  const backgroundSources = candidatesByUsage(candidates, 'background only');
  const avoidCandidates = candidatesByUsage(candidates, 'avoid');
  const preferred = choosePreferredCandidate(candidates);

  return [
    '# Replacement Example Review',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Source brief path: ${brief.path}`,
    '',
    `Original source URL: ${brief.originalSourceUrl || 'Not available'}`,
    '',
    `Replacement needed: ${brief.replacementNeeded}`,
    '',
    `Reason: ${brief.replacementReason}`,
    '',
    'What needs replacing:',
    ...(brief.whatNeedsReplacing.length > 0 ? brief.whatNeedsReplacing.map((item) => `- ${item}`) : ['- Not specified.']),
    '',
    `Replacement source requirements: ${brief.replacementSourceRequirements || 'Not specified.'}`,
    '',
    '## Retrieval Queries',
    '',
    ...queries.map((query) => `- ${query}`),
    '',
    ...formatCandidateGroup('Strong Concrete Candidates', strongCandidates),
    ...formatCandidateGroup('Possible Candidates', possibleCandidates),
    ...formatCandidateGroup('Background Sources', backgroundSources),
    ...formatCandidateGroup('Avoid', avoidCandidates),
    '## Recommendation',
    '',
    `- Preferred candidate: ${preferred?.title ?? 'none'}`,
    `- Reason: ${preferred?.whyItMayWork ?? 'Retrieval found background sources but no concrete replacement example.'}`,
    `- How to use in draft: ${preferred !== undefined ? 'Use as a candidate independent example only after manually verifying the full source. Do not rely on the snippet as proof.' : 'Do not insert a replacement example yet.'}`,
    `- What must be done next: ${preferred !== undefined ? 'Verify the full article before publication.' : 'Run a more targeted retrieval or provide a human-sourced example.'}`,
    '- What must be verified before publication: Confirm the full source, factual claim, date, context, and whether the example actually supports the draft argument.',
    '',
    '## Human Approval',
    '',
    '- [ ] Approved replacement example',
    '- [ ] Approved for draft rewrite',
    '',
  ].join('\n');
}

const serperApiKey = requireEnv('SERPER_API_KEY');
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

const sourceBriefPath = resolve(findLatestBrief());
const briefMarkdown = readFileSync(sourceBriefPath, 'utf-8');
const brief = parseBrief(sourceBriefPath, briefMarkdown);

if (brief.replacementNeeded.toLowerCase() !== 'yes') {
  fail(`No replacement-example retrieval needed. Replacement needed is "${brief.replacementNeeded || 'not specified'}".`);
}

if (brief.workflowRunId.trim() === '') {
  fail('Brief is missing Selected workflow_run_id.');
}

if (brief.suggestedQueries.length === 0) {
  fail('Brief has Replacement Example Need but no Suggested retrieval queries.');
}

const queries = [...new Set([...brief.suggestedQueries, ...incidentFocusedQueries])];
const candidates: Candidate[] = [];
let rawSourceEventsInserted = 0;

for (const query of queries) {
  const request = {
    q: query,
    num: maxResultsPerQuery,
  };

  const response = await fetch(serperEndpoint, {
    method: 'POST',
    headers: {
      'X-API-KEY': serperApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  let responseJson: unknown;

  try {
    responseJson = await response.json();
  } catch {
    responseJson = { non_json_response: await response.text() };
  }

  const rawSourceResult = await supabase
    .from('raw_source_events')
    .insert({
      workflow_run_id: brief.workflowRunId,
      source: 'serper_replacement_example',
      request,
      response: responseJson,
      status: response.ok ? 'stored' : 'request_failed',
    })
    .select('id')
    .single();

  if (rawSourceResult.error !== null) {
    fail(`Failed to insert raw_source_events row for replacement example query "${query}": ${rawSourceResult.error.message}`);
  }

  rawSourceEventsInserted += 1;

  if (!response.ok) {
    fail(`Serper replacement example request failed for query "${query}" with HTTP ${response.status}. Raw event was stored.`);
  }

  const organicResults = ((responseJson as SerperResponse).organic ?? []).slice(0, maxResultsPerQuery);

  for (const result of organicResults) {
    const candidate = createCandidate(result, query);

    if (candidate !== null) {
      candidates.push(candidate);
    }
  }
}

const allCandidates = dedupeCandidates(candidates)
  .sort((a, b) => b.score - a.score);
const selectedCandidates = allCandidates.slice(0, maxCandidates);
const preferredCandidate = choosePreferredCandidate(selectedCandidates);
const strongConcreteCandidateCount = selectedCandidates.filter((candidate) => candidate.usageFit === 'strong concrete example').length;
const possibleCandidateCount = selectedCandidates.filter((candidate) => candidate.usageFit === 'possible concrete example').length;
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(repoRoot, 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'replacement-example-review.md');

mkdirSync(outputDir, { recursive: true });
assertGuardrails(briefMarkdown, brief, allCandidates, preferredCandidate);
writeFileSync(outputPath, formatReview(generatedAt, brief, queries, selectedCandidates), 'utf-8');

console.log(`replacement_example_review_path: ${outputPath}`);
console.log(`source_brief_path: ${sourceBriefPath}`);
console.log(`queries_used: ${queries.join(' | ')}`);
console.log(`candidate_count: ${selectedCandidates.length}`);
console.log(`strong_concrete_candidate_count: ${strongConcreteCandidateCount}`);
console.log(`possible_candidate_count: ${possibleCandidateCount}`);
console.log(`preferred_candidate: ${preferredCandidate?.title ?? 'none'}`);
console.log(`raw_source_events_inserted: ${rawSourceEventsInserted}`);
