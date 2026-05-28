import 'dotenv/config';

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'output');
const requiredPhrases = [
  'A phrase I keep coming back to is the verification gap.',
  'AI creates confident work faster than humans can verify it.',
  'What part of your AI workflow is responsible for disagreement?',
  'Confidence is not review.',
  'adversarial review for AI',
];
const publicBodyBannedPhrases = [
  'A recent source surfaced in our research',
  'A recent source surfaced in our Serper research',
  'Serper',
  'stored search snippet',
  'This draft uses',
];

function fail(message: string): never {
  throw new Error(message);
}

function findLatestArtifact(fileName: string): string {
  if (!existsSync(outputRoot)) {
    fail(`Output directory does not exist: ${outputRoot}`);
  }

  const candidates = readdirSync(outputRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('run-'))
    .map((entry) => join(outputRoot, entry.name, fileName))
    .filter((path) => existsSync(path))
    .map((path) => ({
      path,
      mtimeMs: statSync(path).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return candidates[0]?.path ?? fail(`No ${fileName} found under output/run-*/.`);
}

function readField(markdown: string, label: string): string | null {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^${escapedLabel}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() ?? null;
}

function readSection(markdown: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^## ${escapedHeading}\\s*\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`, 'im'));
  return match?.[1]?.trim() ?? '';
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function assertRequiredPhrases(markdown: string): void {
  const missing = requiredPhrases.filter((phrase) => !markdown.includes(phrase));

  if (missing.length > 0) {
    fail(`Revised draft is missing required phrase(s): ${missing.join('; ')}`);
  }
}

function assertNoBannedPublicBodyPhrases(body: string): void {
  const lowerBody = body.toLowerCase();
  const found = publicBodyBannedPhrases.filter((phrase) => lowerBody.includes(phrase.toLowerCase()));

  if (found.length > 0) {
    fail(`Revised public body contains banned process phrase(s): ${found.join('; ')}`);
  }
}

function extractSourceNotes(draftMarkdown: string): string[] {
  const sourceConstraint = readSection(draftMarkdown, 'Source Constraint');

  if (sourceConstraint === '') {
    return ['- Source constraints were not found in the original draft. Verify source basis before publication.'];
  }

  return sourceConstraint
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `- ${line}`);
}

function buildRevisedBody(): string {
  return [
    'A phrase I keep coming back to is the verification gap.',
    '',
    'Not because it sounds like software language. Because it names the part of AI work that many teams still do not own: what happens after a model gives an answer, but before anyone acts on it?',
    '',
    'The pattern is familiar now. Generate, summarize, draft, analyze, act.',
    '',
    'That sequence is not the solution. It is the gap, especially when the next step is real action and accountability.',
    '',
    'AI can now produce a clean memo, a plausible recommendation, a client-ready paragraph, or a tidy analysis in seconds. The language arrives finished. The format arrives finished. The answer often has the calm tone of something that has already been checked.',
    '',
    'But finished is not the same as reviewed.',
    '',
    'What part of your AI workflow is responsible for disagreement?',
    '',
    'That is the question most teams skip. They ask which model is faster. They ask which prompt produces better structure. They ask whether the output is clear enough to use. Those are useful questions, but they are not the hard one.',
    '',
    'The hard question is who argues with the answer before it becomes a decision.',
    '',
    'In ordinary work, disagreement has a place. A colleague challenges an assumption. A manager asks what the recommendation depends on. A client finds the weak point. A review meeting turns a confident draft into a more defensible one by forcing it to survive pressure.',
    '',
    'AI workflows often compress that process into almost nothing. The model gives the answer. The person cleans it up. The team moves forward. Sometimes that is enough. Sometimes that is where the risk begins.',
    '',
    'Confidence is not review.',
    '',
    'Fluency is not review. Structure is not review. A model can sound calm, complete, and useful while still missing the assumption that matters. The issue is not that every AI answer is wrong. The issue is that AI creates confident work faster than humans can verify it.',
    '',
    'That makes disagreement an operational problem, not just an intellectual one.',
    '',
    'It also changes what good AI adoption means. A team can have strong prompts, clean templates, and a fast model, and still have no real answer to the review question. The work may move faster while the responsibility for challenging it stays vague. That is not a model problem alone. It is a workflow problem.',
    '',
    'If an AI answer is going into a client deliverable, a strategy memo, a hiring decision, a market analysis, or an internal recommendation, someone needs to ask what the answer did not test. What would another model challenge? What evidence is doing too much work? What sounds certain but has not been earned? What changes if the opposite is true?',
    '',
    'That is the missing layer: adversarial review for AI.',
    '',
    'Not a promise that the answer is true. Not a replacement for human judgment. A structured moment of disagreement before confident AI work becomes action.',
    '',
    'Not every AI output needs the same kind of review.',
    '',
    'Some answers just need one serious challenge before you use them. Some need several independent critiques because the stakes are higher. Some questions are complex enough that the reasoning needs a record: what was claimed, what was disputed, what survived, and where uncertainty remains.',
    '',
    'And if this problem keeps appearing across a team, the answer is probably not another prompt. It is a workflow layer that makes disagreement part of the process before AI-assisted work becomes action.',
    '',
    'Verbatim is one way to make that review step concrete. The larger point is simpler: if AI is now part of the work, disagreement has to become part of the workflow.',
    '',
    'So before the next AI output becomes a recommendation, a deliverable, or a decision, ask the question plainly: What part of your AI workflow is responsible for disagreement?',
  ].join('\n');
}

function buildLinkedInVersion(): string {
  return [
    'A phrase I keep coming back to is the verification gap.',
    '',
    'AI workflows increasingly look like this: generate, summarize, draft, analyze, act.',
    '',
    'That sequence is not the solution. It is the gap.',
    '',
    'The model gives a clean answer. The person cleans it up. The team moves forward. But where does disagreement happen before the answer becomes a decision?',
    '',
    'Confidence is not review. Fluency is not review. AI creates confident work faster than humans can verify it.',
    '',
    'The missing layer is adversarial review for AI: a structured moment where the answer has to face pushback before someone relies on it.',
    '',
    'That can mean one serious challenge before use, several independent critiques for higher-stakes work, a recorded review process for complex questions, or workflow-level review for teams.',
    '',
    'What part of your AI workflow is responsible for disagreement?',
  ].join('\n');
}

function buildRewrite(sourceDraftPath: string, sourceReviewPath: string, draftMarkdown: string, reviewMarkdown: string, generatedAt: string): string {
  const sourceBriefPath = readField(draftMarkdown, 'Source brief path') ?? 'Not found in source draft.';
  const reviewVerdict = readField(reviewMarkdown, 'Overall verdict') ?? 'Not found in source review.';
  const revisedBody = buildRevisedBody();
  const linkedInVersion = buildLinkedInVersion();

  assertRequiredPhrases(revisedBody);
  assertNoBannedPublicBodyPhrases(revisedBody);

  if (wordCount(revisedBody) < 600 || wordCount(revisedBody) > 900) {
    fail(`Revised draft body word count is outside target range: ${wordCount(revisedBody)}`);
  }

  if (wordCount(linkedInVersion) < 120 || wordCount(linkedInVersion) > 180) {
    fail(`Short LinkedIn version word count is outside target range: ${wordCount(linkedInVersion)}`);
  }

  return [
    '# Verbatim Content Rewrite',
    '',
    '## Metadata',
    '',
    `Generated at: ${generatedAt}`,
    `Source draft path: ${sourceDraftPath}`,
    `Source review path: ${sourceReviewPath}`,
    'Draft status: review_required',
    '',
    '## Revised Title',
    '',
    'The Missing Review Step In AI Work',
    '',
    '## Revised Draft Body',
    '',
    revisedBody,
    '',
    '## Short LinkedIn Version',
    '',
    linkedInVersion,
    '',
    '## CTA Options',
    '',
    '- What part of your AI workflow is responsible for disagreement?',
    '- Before you act on AI output, who argues the other side?',
    '- Where does review happen before the answer becomes a decision?',
    '- If the answer sounds finished, what still needs to be challenged?',
    '',
    '## Editor Notes',
    '',
    '### Source Constraints',
    '',
    `- Source brief path from original draft: ${sourceBriefPath}`,
    `- Editorial review verdict: ${reviewVerdict}`,
    ...extractSourceNotes(draftMarkdown),
    '',
    '### Claims Needing Verification Before Publication',
    '',
    '- Confirm the source article actually uses or supports the phrase "verification gap" beyond the stored snippet.',
    '- Confirm any mention of AI output verification against the full source before quoting or attributing it.',
    '- Verify current product names and availability before publishing references to Debate, Council, Index, or team workflow services.',
    '- Confirm whether this should be published as a blog post, LinkedIn response, or Substack note before adapting format.',
    '',
    '### Internal Product Mapping',
    '',
    '- Debate maps to one serious challenge before use.',
    '- Council maps to several independent critiques for higher-stakes work.',
    '- Index maps to a recorded review process for complex questions requiring facts and reasoning.',
    '- Team workflow services map to institutionalizing adversarial review into team workflows.',
    '',
    '### Review Checklist',
    '',
    '- [ ] Source represented fairly',
    '- [ ] Source constraints kept out of public body',
    '- [ ] No claim beyond stored source data without verification',
    '- [ ] Verbatim mentioned lightly',
    '- [ ] Product ladder is accurate',
    '- [ ] Ends with a question, not a sales pitch',
    '- [ ] Approved for editing',
    '',
  ].join('\n');
}

const sourceDraftPath = resolve(findLatestArtifact('content-draft.md'));
const sourceReviewPath = resolve(findLatestArtifact('content-edit-review.md'));
const draftMarkdown = readFileSync(sourceDraftPath, 'utf-8');
const reviewMarkdown = readFileSync(sourceReviewPath, 'utf-8');
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(repoRoot, 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'content-rewrite.md');
const rewrite = buildRewrite(sourceDraftPath, sourceReviewPath, draftMarkdown, reviewMarkdown, generatedAt);

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, rewrite, 'utf-8');

console.log(`content_rewrite_path: ${outputPath}`);
console.log(`source_draft_path: ${sourceDraftPath}`);
console.log(`source_review_path: ${sourceReviewPath}`);
