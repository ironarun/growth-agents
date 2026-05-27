import 'dotenv/config';

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type ReviewIssue = {
  title: string;
  severity: 'high' | 'medium' | 'low';
  detail: string;
  instruction: string;
};

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'output');
const internalProcessPhrases = [
  'A recent source surfaced in our research',
  'A recent source surfaced in our Serper research',
  'Based only on the stored search snippet',
  'This draft uses',
  'Source Constraint',
];
const genericMarketingTerms = [
  'revolutionize',
  'transform',
  'unlock',
  'leverage',
  'game-changing',
  'AI-powered',
  'seamless',
];

function fail(message: string): never {
  throw new Error(message);
}

function findLatestContentDraft(): string {
  if (!existsSync(outputRoot)) {
    fail(`Output directory does not exist: ${outputRoot}`);
  }

  const candidates = readdirSync(outputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
    .map((entry) => join(outputRoot, entry.name, 'content-draft.md'))
    .filter((path) => existsSync(path))
    .map((path) => ({
      path,
      mtimeMs: statSync(path).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.path ?? fail('No content-draft.md found under output/run-*/.');
}

function readSection(markdown: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^## ${escapedHeading}\\s*\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`, 'im'));
  return match?.[1]?.trim() ?? '';
}

function firstNonEmptyLine(value: string): string {
  return value.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? '';
}

function includesAny(haystack: string, needles: string[]): boolean {
  const lowerHaystack = haystack.toLowerCase();
  return needles.some((needle) => lowerHaystack.includes(needle.toLowerCase()));
}

function findPresentPhrases(markdown: string, phrases: string[]): string[] {
  const lowerMarkdown = markdown.toLowerCase();
  return phrases.filter((phrase) => lowerMarkdown.includes(phrase.toLowerCase()));
}

function buildIssues(markdown: string): ReviewIssue[] {
  const issues: ReviewIssue[] = [];
  const draftBody = readSection(markdown, 'Draft Body');
  const opening = firstNonEmptyLine(draftBody);
  const internalPhrases = findPresentPhrases(draftBody, internalProcessPhrases);
  const marketingTerms = findPresentPhrases(markdown, genericMarketingTerms);

  if (opening.toLowerCase().startsWith('what part of your ai workflow')) {
    issues.push({
      title: 'Opening starts with the thesis question instead of an idea.',
      severity: 'medium',
      detail: 'The question is strong, but opening with it makes the piece feel like a prompt rather than an essay. The preferred opening gives the reader a phrase to think with.',
      instruction: 'Open with: "A phrase I keep coming back to is the verification gap." Then move into the reader question after the concept is established.',
    });
  }

  if (internalPhrases.length > 0) {
    issues.push({
      title: 'Internal research/process language appears in the public draft body.',
      severity: 'high',
      detail: `Remove these public-facing process phrases: ${internalPhrases.join('; ')}.`,
      instruction: 'Keep source constraints in metadata or editor notes only. The public article should say what the source frames, not how the system found it.',
    });
  }

  if (!draftBody.includes('AI creates confident work faster than humans can verify')) {
    issues.push({
      title: 'Core strategic frame is implied but not preserved verbatim.',
      severity: 'medium',
      detail: 'The piece gestures at the frame, but the exact line is useful and should survive the rewrite.',
      instruction: 'Include: "AI creates confident work faster than humans can verify it."',
    });
  }

  if (!draftBody.includes('What part of your AI workflow is responsible for disagreement?')) {
    issues.push({
      title: 'Key question is missing from the article body.',
      severity: 'high',
      detail: 'The key question is the conceptual spine of the piece.',
      instruction: 'Preserve the exact question in either the opening third or the ending.',
    });
  }

  if (!draftBody.includes('adversarial review for AI')) {
    issues.push({
      title: 'Verbatim positioning is not explicit enough.',
      severity: 'medium',
      detail: 'The draft should make the positioning clear without hard-selling.',
      instruction: 'Use "adversarial review for AI" once, and keep it attached to the missing workflow layer.',
    });
  }

  if (!includesAny(draftBody, ['Debate', 'Council', 'Index', 'Systems', 'workflow help'])) {
    issues.push({
      title: 'Product ladder is missing.',
      severity: 'medium',
      detail: 'The piece currently points to Verbatim generally, but does not show the natural next options.',
      instruction: 'Add one compact paragraph near the end: Debate for one adversarial pass, Council for parallel panel review, Index for complex questions requiring facts and reasoning, and systems/workflow help for teams institutionalizing adversarial review.',
    });
  }

  if (marketingTerms.length > 0) {
    issues.push({
      title: 'Generic AI marketing language appears somewhere in the artifact.',
      severity: 'high',
      detail: `Found: ${marketingTerms.join('; ')}.`,
      instruction: 'Remove these terms from public body and supporting sections.',
    });
  }

  if (issues.length < 5) {
    issues.push({
      title: 'The generate, summarize, draft, analyze, act sequence needs sharper framing.',
      severity: 'low',
      detail: 'The sequence is useful as diagnosis, but it should not read like the proposed solution.',
      instruction: 'Make clear that the sequence is the current workflow gap. The solution is the disagreement/review layer inserted before action.',
    });
  }

  return issues.slice(0, 5);
}

function chooseVerdict(issues: ReviewIssue[]): 'publishable' | 'needs revision' | 'reject' {
  if (issues.some((issue) => issue.severity === 'high')) {
    return 'needs revision';
  }

  if (issues.length > 0) {
    return 'needs revision';
  }

  return 'publishable';
}

function formatIssues(issues: ReviewIssue[]): string[] {
  return issues.flatMap((issue, index) => [
    `${index + 1}. ${issue.title}`,
    `   Severity: ${issue.severity}`,
    `   Detail: ${issue.detail}`,
    `   Rewrite instruction: ${issue.instruction}`,
  ]);
}

function formatReview(sourceDraftPath: string, draftMarkdown: string, generatedAt: string): string {
  const issues = buildIssues(draftMarkdown);
  const verdict = chooseVerdict(issues);

  return [
    '# Verbatim Content Edit Review',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Source draft path: ${sourceDraftPath}`,
    '',
    `Overall verdict: ${verdict}`,
    '',
    '## Top 5 Issues',
    '',
    ...formatIssues(issues),
    '',
    '## Specific Rewrite Instructions',
    '',
    '- Move all source limitations and stored-snippet caveats out of the article body and into editor notes.',
    '- Replace process-heavy phrasing with public-facing argument.',
    '- Preserve the verification gap as the central idea.',
    '- Clarify that generate, summarize, draft, analyze, act is the current pattern, not the solution.',
    '- Add the product ladder lightly: Debate, Council, Index, and systems/workflow help.',
    '',
    '## Recommended Opening',
    '',
    'A phrase I keep coming back to is the verification gap.',
    '',
    'Not because it sounds like software language. Because it names the part of AI work that many teams still do not own: what happens after the model gives an answer, but before anyone acts on it?',
    '',
    '## Recommended Ending / CTA Structure',
    '',
    'End with a question, not a pitch. Suggested structure:',
    '',
    '1. Restate that AI creates confident work faster than humans can verify it.',
    '2. Name adversarial review as the missing layer.',
    '3. Mention Verbatim lightly as one way to make the layer concrete.',
    '4. Close with: "What part of your AI workflow is responsible for disagreement?"',
    '',
    '## Lines To Remove',
    '',
    '- "A recent source surfaced in our Serper research..."',
    '- "Based only on the stored search snippet..."',
    '- "This draft uses only the existing brief data..."',
    '- Any "Source Constraint" section from the public article body.',
    '',
    '## Lines To Preserve',
    '',
    '- "What part of your AI workflow is responsible for disagreement?"',
    '- "Confidence is not review."',
    '- "AI creates confident work faster than humans can verify it."',
    '- "adversarial review for AI"',
    '',
    '## Product Ladder To Add Carefully',
    '',
    '- Debate: one adversarial pass.',
    '- Council: parallel panel review.',
    '- Index: complex questions requiring facts and reasoning.',
    '- Systems/workflow help: institutionalizing adversarial review into team workflows.',
    '',
    'Approved for rewrite: [ ]',
    '',
  ].join('\n');
}

const sourceDraftPath = findLatestContentDraft();
const draftMarkdown = readFileSync(sourceDraftPath, 'utf-8');
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(repoRoot, 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'content-edit-review.md');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatReview(resolve(sourceDraftPath), draftMarkdown, generatedAt), 'utf-8');

console.log(`content_edit_review_path: ${outputPath}`);
console.log(`source_draft_path: ${resolve(sourceDraftPath)}`);

