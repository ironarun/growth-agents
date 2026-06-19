import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type PublishedArtifact = {
  path: string;
  publishedTitle: string;
  publishedUrl: string;
  publishedAt: string;
  draftPath: string;
  replacementReviewPath: string;
  primaryReplacementUrl: string;
  humanEditorialNotes: string;
  artifactStatus: string[];
};

type ReplacementCandidate = {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  whyItMayWork: string;
};

type DistributionContext = {
  artifact: PublishedArtifact;
  replacementCandidate: ReplacementCandidate | null;
  replacementReviewText: string;
  sourceDraftText: string;
  factualDetailsUsed: string[];
  factualDetailsOmitted: string[];
};

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'output');
const bannedPhrases = [
  'excited to share',
  'I wrote a thing',
  "in today's fast-paced world",
  'revolutionize',
  'transform',
  'unlock',
  'leverage',
  'AI-powered',
];
const forbiddenPublicPostPhrases = [
  'available reporting',
  'snippet',
  'snippets',
  'replacement review',
  'artifact text',
  'source text',
  'candidate',
  'evidence constraints',
  'wearing a suit',
  'standing at the podium',
  'Verbatim is the adversarial review layer',
];

function fail(message: string): never {
  throw new Error(message);
}

function findLatestPublishedArtifact(): string {
  if (!existsSync(outputRoot)) {
    fail(`Output directory does not exist: ${outputRoot}`);
  }

  const candidates = readdirSync(outputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
    .map((entry) => join(outputRoot, entry.name, 'published-artifact.md'))
    .filter((path) => existsSync(path))
    .map((path) => ({
      path,
      mtimeMs: statSync(path).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.path ?? fail('No published-artifact.md found under output/run-*/.');
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

function parseArtifact(path: string, markdown: string): PublishedArtifact {
  const sourcePipeline = readSection(markdown, 'Source Pipeline');
  const artifactStatus = readSection(markdown, 'Artifact Status')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return {
    path,
    publishedTitle: readField(markdown, 'Published title'),
    publishedUrl: readField(markdown, 'Published URL'),
    publishedAt: readField(markdown, 'Published at'),
    draftPath: readField(sourcePipeline, '- Draft path'),
    replacementReviewPath: readField(sourcePipeline, '- Replacement review path'),
    primaryReplacementUrl: readField(sourcePipeline, '- Primary replacement URL'),
    humanEditorialNotes: readSection(markdown, 'Human Editorial Notes'),
    artifactStatus,
  };
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function sentenceCount(paragraph: string): number {
  const matches = paragraph.match(/[.!?](?=\s|$)/g);
  return matches?.length ?? 0;
}

function readIfAvailable(path: string): string {
  if (path === '' || !existsSync(path)) {
    return '';
  }

  return readFileSync(path, 'utf-8');
}

function parseCandidateBlocks(markdown: string): ReplacementCandidate[] {
  return markdown
    .split(/^### Candidate \d+\s*$/im)
    .slice(1)
    .map((block) => ({
      title: readField(block, '- Title'),
      url: readField(block, '- URL'),
      domain: readField(block, '- Domain'),
      snippet: readField(block, '- Snippet'),
      whyItMayWork: readField(block, '- Why it may work'),
    }))
    .filter((candidate) => candidate.title !== '' || candidate.url !== '');
}

function parseReplacementCandidate(markdown: string, primaryReplacementUrl: string): ReplacementCandidate | null {
  if (markdown === '') {
    return null;
  }

  const preferredTitle = readField(markdown, '- Preferred candidate');
  const candidates = parseCandidateBlocks(markdown);
  const byPrimaryUrl = candidates.find((candidate) => primaryReplacementUrl !== '' && candidate.url === primaryReplacementUrl);

  if (byPrimaryUrl !== undefined) {
    return byPrimaryUrl;
  }

  const byPreferredTitle = candidates.find((candidate) => candidate.title === preferredTitle);

  return byPreferredTitle ?? candidates[0] ?? null;
}

function buildDistributionContext(artifact: PublishedArtifact): DistributionContext {
  const replacementReviewText = readIfAvailable(artifact.replacementReviewPath);
  const sourceDraftText = readIfAvailable(artifact.draftPath);
  const replacementCandidate = parseReplacementCandidate(replacementReviewText, artifact.primaryReplacementUrl);
  const availableText = `${replacementReviewText}\n${sourceDraftText}`;
  const factualDetailsUsed = [
    'KPMG pulled a published report about AI usage.',
    replacementCandidate?.title.toLowerCase().includes('apparent hallucinations') === true || availableText.toLowerCase().includes('apparent hallucinations')
      ? 'The available replacement review describes apparent hallucinations.'
      : '',
    availableText.includes('UBS') ? 'UBS is named in the available replacement review.' : '',
    availableText.toLowerCase().includes('health and transit systems') ? 'Health and transit systems are named in the available replacement review.' : '',
    availableText.toLowerCase().includes('claims about their ai usage were untrue') ? 'Available snippets say claims about AI usage were untrue.' : '',
  ].filter(Boolean);
  const factualDetailsOmitted = [
    availableText.includes('NHS') ? '' : 'NHS was omitted because it was not present in the available artifact text.',
    availableText.includes('Transport for London') ? '' : 'Transport for London was omitted because it was not present in the available artifact text.',
    availableText.toLowerCase().includes('researchers traced') ? '' : 'Researcher attribution was omitted because the available snippets did not support that exact claim.',
  ].filter(Boolean);

  return {
    artifact,
    replacementCandidate,
    replacementReviewText,
    sourceDraftText,
    factualDetailsUsed,
    factualDetailsOmitted,
  };
}

function formatDraftPost(context: DistributionContext): string {
  const availableText = `${context.replacementReviewText}\n${context.sourceDraftText}`;
  const hasUbs = availableText.includes('UBS');
  const hasHealthTransit = availableText.toLowerCase().includes('health and transit systems');
  const hasUntrueClaims = availableText.toLowerCase().includes('claims about their ai usage were untrue');
  const detailLine = hasUbs && hasHealthTransit
    ? 'The report included case studies about UBS and health and transit systems, with apparent hallucinations around AI use cases.'
    : 'The report included apparent hallucinations around AI use cases.';
  const claimLine = hasUntrueClaims
    ? 'Organizations named in the report disputed claims about their AI usage.'
    : 'The important point is that the issue surfaced after the work already looked publishable.';

  return [
    "KPMG just pulled a published report about AI usage after apparent hallucinations showed up in it.",
    '',
    detailLine,
    '',
    claimLine,
    '',
    "This is not a story about KPMG being careless.",
    '',
    "These are serious professionals doing high-stakes work in public, which is why the more uncomfortable conclusion is that the failure was not competence.",
    '',
    "It was process.",
    '',
    'AI now produces confident, finished-looking work faster than most review systems were built to catch.',
    '',
    "The error doesn't always surface when the text is generated.",
    '',
    "It surfaces when the work is used, by which point it's already a published report.",
    '',
    'What part of your AI workflow is responsible for disagreement?',
    '',
    'I wrote about where that missing step should live, and why one person staring at one confident draft is poorly equipped to provide it.',
    '',
    'Link in comments',
  ].join('\n');
}

function assertDraft(post: string): void {
  const count = wordCount(post);

  if (count < 120 || count > 220) {
    fail(`LinkedIn draft must be 120-220 words. Found ${count}.`);
  }

  if (post.includes('—')) {
    fail('LinkedIn draft contains an em dash.');
  }

  if (post.includes('#')) {
    fail('LinkedIn draft contains a hashtag.');
  }

  const lower = post.toLowerCase();
  const foundBanned = bannedPhrases.filter((phrase) => lower.includes(phrase.toLowerCase()));

  if (foundBanned.length > 0) {
    fail(`LinkedIn draft contains banned phrase(s): ${foundBanned.join(', ')}`);
  }

  const foundForbiddenPublicPhrases = forbiddenPublicPostPhrases.filter((phrase) => lower.includes(phrase.toLowerCase()));

  if (foundForbiddenPublicPhrases.length > 0) {
    fail(`LinkedIn draft contains forbidden public-post phrase(s): ${foundForbiddenPublicPhrases.join(', ')}`);
  }

  const paragraphs = post.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
  const multiSentenceParagraph = paragraphs.find((paragraph) => sentenceCount(paragraph) > 1);

  if (multiSentenceParagraph !== undefined) {
    fail(`LinkedIn draft paragraph has more than one sentence: ${multiSentenceParagraph}`);
  }

  if (!post.includes('What part of your AI workflow is responsible for disagreement?')) {
    fail('LinkedIn draft is missing the core question.');
  }

  if (!post.includes('KPMG')) {
    fail('LinkedIn draft must mention KPMG as the concrete example.');
  }

  if (post.includes('Verbatim is the adversarial review layer')) {
    fail('LinkedIn draft contains direct product positioning in the main post.');
  }
}

function formatOutput(generatedAt: string, context: DistributionContext, draftPost: string): string {
  const artifact = context.artifact;

  return [
    '# LinkedIn Distribution Draft',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Published artifact path: ${artifact.path}`,
    '',
    `Published title: ${artifact.publishedTitle}`,
    '',
    `Published URL: ${artifact.publishedUrl}`,
    '',
    '## Draft Post',
    '',
    draftPost,
    '',
    '## Editorial Notes',
    '',
    '- Intended channel: LinkedIn',
    '- Purpose: distribute published Verbatim article',
    '- Pattern used: concrete incident -> anti-dunk framing -> process failure -> article bridge',
    '- Do not publish without human review',
    '- Link placement: comments or end of post',
    `- Source example: ${context.replacementCandidate?.title ?? 'KPMG/TechCrunch'}`,
    '- Factual details used:',
    ...context.factualDetailsUsed.map((detail) => `  - ${detail}`),
    '- Factual details intentionally omitted:',
    ...context.factualDetailsOmitted.map((detail) => `  - ${detail}`),
    '',
    '## Approval',
    '',
    '- [ ] Approved for LinkedIn',
    '- [ ] Published manually',
    '',
  ].join('\n');
}

const publishedArtifactPath = resolve(findLatestPublishedArtifact());
const artifactMarkdown = readFileSync(publishedArtifactPath, 'utf-8');
const artifact = parseArtifact(publishedArtifactPath, artifactMarkdown);

if (artifact.publishedTitle === '') {
  fail(`Published artifact is missing Published title: ${publishedArtifactPath}`);
}

if (artifact.publishedUrl === '') {
  fail(`Published artifact is missing Published URL: ${publishedArtifactPath}`);
}

const context = buildDistributionContext(artifact);
const draftPost = formatDraftPost(context);
assertDraft(draftPost);

const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(repoRoot, 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'linkedin-distribution-draft.md');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatOutput(generatedAt, context, draftPost), 'utf-8');

console.log(`linkedin_distribution_draft_path: ${outputPath}`);
console.log(`published_artifact_path: ${publishedArtifactPath}`);
console.log(`word_count: ${wordCount(draftPost)}`);
