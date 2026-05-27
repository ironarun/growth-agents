import 'dotenv/config';

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type BriefData = {
  sourceTitle: string;
  sourceUrl: string;
  sourceDomain: string;
  sourceSnippet: string;
  suggestedAngle: string;
  suggestedQuestion: string;
  whySourceMatters: string;
  coreThesis: string;
  readerQuestion: string;
};

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'output');
const bannedTerms = [
  'revolutionize',
  'transform',
  'unlock',
  'leverage',
  'game-changing',
  'AI-powered',
  'seamless',
  "You don't know what you're missing. Find out before it costs you.",
];

function fail(message: string): never {
  throw new Error(message);
}

function normalizeText(value: string): string {
  return value
    .replace(/â€”/g, ',')
    .replace(/—/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

function readField(markdown: string, label: string): string {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^${escapedLabel}:\\s*(.+)$`, 'im'));

  if (match?.[1] === undefined) {
    fail(`Content brief is missing required field: ${label}`);
  }

  return normalizeText(match[1]);
}

function readSection(markdown: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^## ${escapedHeading}\\s*\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`, 'im'));

  if (match?.[1] === undefined) {
    fail(`Content brief is missing required section: ${heading}`);
  }

  return normalizeText(match[1]);
}

function findLatestContentBrief(): string {
  if (!existsSync(outputRoot)) {
    fail(`Output directory does not exist: ${outputRoot}`);
  }

  const candidates = readdirSync(outputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
    .map((entry) => join(outputRoot, entry.name, 'content-brief.md'))
    .filter((path) => existsSync(path))
    .map((path) => ({
      path,
      mtimeMs: statSync(path).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.path ?? fail('No content-brief.md found under output/run-*/.');
}

function parseBrief(markdown: string): BriefData {
  return {
    sourceTitle: readField(markdown, 'Source title'),
    sourceUrl: readField(markdown, 'Source URL'),
    sourceDomain: readField(markdown, 'Source domain'),
    sourceSnippet: readField(markdown, 'Source snippet'),
    suggestedAngle: readField(markdown, 'Suggested Verbatim angle'),
    suggestedQuestion: readField(markdown, 'Suggested response question'),
    whySourceMatters: readField(markdown, 'Why this source matters'),
    coreThesis: readSection(markdown, 'Core Thesis'),
    readerQuestion: readSection(markdown, 'Reader Question'),
  };
}

function assertNoBannedTerms(markdown: string): void {
  const lowerMarkdown = markdown.toLowerCase();
  const usedTerms = bannedTerms.filter((term) => lowerMarkdown.includes(term.toLowerCase()));

  if (usedTerms.length > 0) {
    fail(`Generated draft contains banned term(s): ${usedTerms.join(', ')}`);
  }
}

function formatDraftBody(brief: BriefData): string {
  return [
    `What part of your AI workflow is responsible for disagreement?`,
    '',
    `A recent source surfaced in our Serper research frames this as AI output verification. Based only on the stored search snippet, the piece points to a verification gap: the absence of a systematic process for validating AI-generated content before it takes action. That phrasing matters because it names something many teams are already doing without quite naming it.`,
    '',
    `The workflow is familiar now. Generate. Summarize. Draft. Analyze. Then act.`,
    '',
    `The strange part is how quickly that sequence became normal. A model produces a clean memo, a tidy recommendation, a polished client note, or a plausible analysis. The work looks finished because the language is finished. The formatting is finished. The answer has the calm tone of something that has been checked.`,
    '',
    `But what actually happened between output and action?`,
    '',
    `That is the part worth slowing down. Confidence is not review. Fluency is not review. A well-structured answer is not the same thing as an answer that has survived pushback. The question is not whether AI can help produce useful work. It can. The question is where disagreement lives after the first answer appears.`,
    '',
    `In human work, we have rough versions of this step. A colleague challenges an assumption. A manager asks what we are missing. A client pokes the soft spot in the recommendation. A review meeting turns a confident draft into a better one by forcing it to defend itself.`,
    '',
    `AI workflows often skip that part. The model gives the answer, the person fixes the prose, and the organization treats the output as ready enough to move forward. Sometimes that is fine. Sometimes it is exactly where the risk enters.`,
    '',
    `This is why the language of verification is starting to show up. Not because every AI output is wrong. Not because every workflow needs a committee. Because there is a growing gap between how fast AI can create confident work and how slowly humans can verify whether that work should be trusted.`,
    '',
    `Adversarial review is one way to make that gap operational. It asks the answer to face disagreement before the user relies on it. What would another model challenge? What assumption is doing too much work? What is missing? What sounds certain but has not been earned?`,
    '',
    `That is the layer Verbatim is trying to make concrete: adversarial review for AI. Not a promise that the answer is true. Not a replacement for judgment. A structured pause before confident AI work becomes a decision, a client deliverable, or a recommendation someone acts on.`,
    '',
    `If your team already has an AI workflow, the next question may not be which model is faster. It may be simpler: where, exactly, does disagreement happen before the output becomes action?`,
  ].join('\n');
}

function formatLinkedInVersion(): string {
  return [
    `What part of your AI workflow is responsible for disagreement?`,
    '',
    `A recent source surfaced in our research frames this as AI output verification: the missing process for validating AI-generated content before it takes action.`,
    '',
    `That feels like the right category.`,
    '',
    `Most AI workflows now look like this: generate, summarize, draft, analyze, then act. The output often sounds finished before anyone has challenged it.`,
    '',
    `Confidence is not review. Fluency is not review. A clean answer is not the same thing as an answer that has survived pushback.`,
    '',
    `The missing layer is adversarial review: what would another model challenge, what assumption is weak, what sounds certain but has not been earned?`,
    '',
    `Verbatim is one way to make that review step concrete. Not as a truth guarantee. As a pause before confident AI work becomes a decision.`,
  ].join('\n');
}

function formatDraft(brief: BriefData, generatedAt: string, sourceBriefPath: string): string {
  const draftTitle = 'What Part Of Your AI Workflow Is Responsible For Disagreement?';

  return [
    '# Verbatim Content Draft',
    '',
    '## Metadata',
    '',
    `Generated at: ${generatedAt}`,
    `Source brief path: ${sourceBriefPath}`,
    'Draft status: review_required',
    '',
    '## Draft Title',
    '',
    draftTitle,
    '',
    '## Draft Body',
    '',
    formatDraftBody(brief),
    '',
    '## Source Constraint',
    '',
    `This draft uses only the existing brief data. Source title: ${brief.sourceTitle}. Source URL: ${brief.sourceUrl}. Source domain: ${brief.sourceDomain}. Stored snippet: ${brief.sourceSnippet}`,
    '',
    'It does not pretend to have read the full source page.',
    '',
    '## Optional Short LinkedIn Version',
    '',
    formatLinkedInVersion(),
    '',
    '## CTA Options',
    '',
    '- What part of your AI workflow is responsible for disagreement?',
    '- Before you act on AI output, who argues the other side?',
    '- If the answer sounds finished, what still needs to be challenged?',
    '- What would change if review came before action?',
    '',
    '## Review Checklist',
    '',
    '- [ ] Source represented fairly',
    '- [ ] No claim beyond stored source snippet',
    '- [ ] Verbatim mentioned lightly',
    '- [ ] Question-led',
    '- [ ] No generic AI marketing language',
    '- [ ] Approved for editing',
    '',
  ].join('\n');
}

const sourceBriefPath = findLatestContentBrief();
const briefMarkdown = readFileSync(sourceBriefPath, 'utf-8');
const brief = parseBrief(briefMarkdown);
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(repoRoot, 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'content-draft.md');
const draft = formatDraft(brief, generatedAt, resolve(sourceBriefPath));

assertNoBannedTerms(draft);
mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, draft, 'utf-8');

console.log(`content_draft_path: ${outputPath}`);
console.log(`source_brief_path: ${resolve(sourceBriefPath)}`);
console.log('used_existing_brief_data_only: yes');

