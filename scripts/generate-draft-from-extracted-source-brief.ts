import 'dotenv/config';

import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type BriefData = {
  sourceUrl: string;
  sourceTitle: string;
  sourceSummary: string[];
  sourceClaims: string[];
  sourceAuthorityTier: string;
  recommendedAttributionStrategy: string;
  attributionValue: string;
  independentReplacementNeeded: string;
};

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'output');
const draftTitle = 'What Part Of Your AI Workflow Is Responsible For Disagreement?';
const requiredLines = [
  'AI creates confident work faster than humans can verify it.',
  'Confidence is not review.',
  'What part of your AI workflow is responsible for disagreement?',
  'Verbatim creates the adversarial review layer for moments where trust matters.',
];
const forbiddenPatterns = [
  'truth layer as Verbatim',
  'Verbatim is a truth layer',
  'Verbatim creates a truth layer',
  'Debate is',
  'Council is',
  'Index is',
  'There is a product ladder',
  'AI will',
  'revolutionize',
  'game-changer',
  '—',
];

function fail(message: string): never {
  throw new Error(message);
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
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^${escapedLabel}:\\s*(.+)$`, 'im'));
  return match?.[1]?.trim() ?? '';
}

function readSection(markdown: string, heading: string): string {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = markdown.match(new RegExp(`^## ${escapedHeading}\\s*\\r?\\n\\r?\\n([\\s\\S]*?)(?=\\r?\\n## |$)`, 'im'));
  return match?.[1]?.trim() ?? '';
}

function readBullets(markdown: string, heading: string): string[] {
  return readSection(markdown, heading)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

function parseBrief(markdown: string): BriefData {
  return {
    sourceUrl: readField(markdown, 'Source URL'),
    sourceTitle: readField(markdown, 'Source title'),
    sourceSummary: readBullets(markdown, 'Source Summary'),
    sourceClaims: readBullets(markdown, 'Source Claims To Use Carefully'),
    sourceAuthorityTier: readField(markdown, 'Source authority tier'),
    recommendedAttributionStrategy: readField(markdown, 'Recommended attribution strategy'),
    attributionValue: readField(markdown, 'Attribution value'),
    independentReplacementNeeded: readField(markdown, 'Independent replacement needed'),
  };
}

function formatDraftBody(brief: BriefData): string {
  if (brief.recommendedAttributionStrategy === 'do not attribute') {
    return [
      'A phrase I keep coming back to is the verification gap.',
      '',
      'It names something many AI workflows still do not own: the space between a model producing an answer and a person acting on it.',
      '',
      'Most teams now have the first half of the workflow. Generate. Summarize. Draft. Analyze. The work arrives quickly, and often it arrives in a form that looks finished. The memo is clean. The recommendation is structured. The analysis sounds calm. The paragraph has the texture of something that has already been reviewed.',
      '',
      'Then comes the quiet jump: someone uses it.',
      '',
      'That jump is where the real question lives. What happens between output and action?',
      '',
      'AI creates confident work faster than humans can verify it.',
      '',
      'That is not a complaint about AI. It is a workflow problem. The model can produce a plausible answer in seconds, but the organization still has to decide whether the answer has been challenged enough to matter. A faster draft does not automatically create a better review process. A fluent recommendation does not automatically expose its weak assumptions.',
      '',
      'Confidence is not review.',
      '',
      'A confident answer has not necessarily faced a serious challenge. A polished paragraph has not necessarily survived a second point of view. A plausible analysis has not necessarily shown what evidence is doing too much work. If the output is going to shape a client recommendation, an internal decision, a market claim, or a strategic memo, the useful question is not only "does this sound right?" It is "what tried to prove this wrong?"',
      '',
      'That question matters because not every AI output needs the same kind of review. A quick internal summary does not need the same process as a client-facing recommendation. A brainstorm does not need the same scrutiny as a board memo. A market scan used to start a discussion does not need the same review as an analysis someone will use to allocate budget.',
      '',
      'The mistake is treating review as a yes-or-no question. Either the AI output is safe, or it is dangerous. Either it can be used, or it cannot. Real work is messier than that. The better question is what kind of review the output needs before it becomes action.',
      '',
      'That is especially true for consultants, operators, and small teams. They do not usually have a formal AI governance committee waiting in the hallway. They have client work, deadlines, judgment calls, and a growing pile of AI-assisted drafts that look good enough to move forward. The review step has to fit the work instead of pretending every decision belongs inside a heavyweight compliance ritual.',
      '',
      'So the practical question is not whether to trust AI in the abstract. It is where to put friction. Where should the workflow slow down? Which outputs deserve a second model, a second person, or a recorded challenge? Which claims need evidence attached before they leave the building? Which recommendations should be argued against before they become client advice?',
      '',
      'For practical work, there are a few plain categories. Some answers just need one serious challenge before use. Some need several independent critiques because the stakes are higher. Some need recorded review for complex questions where facts and reasoning need to stay connected. Some teams need workflow-level review so disagreement is not left to individual memory or personal discipline.',
      '',
      'Those categories are useful because they move the conversation away from vague trust. They make review operational. Who owns the moment when the answer gets challenged? Who is allowed to slow down a polished draft? Who records what changed after review? Who decides whether a confident answer is good enough to use?',
      '',
      'What part of your AI workflow is responsible for disagreement?',
      '',
      'That is the question I would rather ask than whether a team is using the newest model. The newest model may produce faster work. It may produce cleaner work. It may reduce some errors and introduce others. But the workflow still needs a place where the answer is forced to meet resistance before it becomes a decision.',
      '',
      'Verbatim creates the adversarial review layer for moments where trust matters. Not as a guarantee of truth. Not as a substitute for judgment. As a structured way to make disagreement happen before confident AI work becomes something a person, team, or client relies on.',
      '',
      'The useful shift is small but important. Do not ask only what AI can produce. Ask what your workflow does after AI produces it.',
      '',
      'Before the next answer becomes a recommendation, a deliverable, or a decision, who is responsible for disagreeing with it?',
    ].join('\n');
  }

  if (brief.recommendedAttributionStrategy === 'mention generally') {
    return [
      'A phrase I keep coming back to is the verification gap.',
      '',
      'One useful way to name the problem is AI output verification: the missing step between a model producing an answer and a person acting on it.',
      '',
      'Most AI workflows now have a familiar shape. Generate. Summarize. Draft. Analyze. Then act.',
      '',
      'The sequence feels efficient. It also hides the most important missing step. What happens between output and action?',
      '',
      'AI creates confident work faster than humans can verify it.',
      '',
      'That is the pressure. The model can produce a clean recommendation in seconds. The answer can sound complete, structured, and calm. It can look like work that has been reviewed because it has the form of reviewed work. But form is not the same as scrutiny.',
      '',
      'Confidence is not review.',
      '',
      'A confident answer has not necessarily faced a serious challenge. A polished paragraph has not necessarily survived a second point of view. A plausible analysis has not necessarily exposed its assumptions. If the output is going to shape a client recommendation, an internal decision, a hiring discussion, a market claim, or a strategic memo, the useful question is not only "does this sound right?" It is "what tried to prove this wrong?"',
      '',
      'For practical work, there are a few plain categories. Some answers just need one serious challenge before use. Some need several independent critiques because the stakes are higher. Some need recorded review for complex questions where facts and reasoning need to stay connected. Some teams need workflow-level review so disagreement is not left to individual memory or personal discipline.',
      '',
      'Those categories matter because AI adoption often starts with tools and prompts, but the risk shows up in workflow. Who owns the moment when the answer gets challenged? Who records what changed after review? Who decides whether a confident answer is good enough to use?',
      '',
      'What part of your AI workflow is responsible for disagreement?',
      '',
      'Verbatim creates the adversarial review layer for moments where trust matters. Not as a guarantee of truth. Not as a substitute for judgment. As a structured way to make disagreement happen before confident AI work becomes something a person, team, or client relies on.',
      '',
      'Before the next answer becomes a recommendation, a deliverable, or a decision, who is responsible for disagreeing with it?',
    ].join('\n');
  }

  return [
    'A phrase I keep coming back to is the verification gap.',
    '',
    'A recent piece on AI output verification uses that phrase to name a problem that is getting easier to feel and harder to ignore. AI output is moving into business workflows before many teams have decided who is responsible for checking it. Not checking the grammar. Not polishing the language. Checking whether the answer should be trusted before someone acts on it.',
    '',
    'That distinction matters because most AI workflows now have a familiar shape. Generate. Summarize. Draft. Analyze. Then act.',
    '',
    'The sequence feels efficient. It also hides the most important missing step. What happens between output and action?',
    '',
    'The source frames this as a verification problem. It argues that hallucination becomes more than a technical annoyance when AI-generated work reaches customers, contracts, compliance decisions, or internal decisions. That legal-liability framing belongs to the source and should be treated carefully. But the underlying operational point is useful even if you are not running an enterprise compliance program.',
    '',
    'AI creates confident work faster than humans can verify it.',
    '',
    'That is the pressure. The model can produce a clean recommendation in seconds. The answer can sound complete, structured, and calm. It can look like work that has been reviewed because it has the form of reviewed work. But form is not the same as scrutiny.',
    '',
    'Confidence is not review.',
    '',
    'A confident answer has not necessarily faced a serious challenge. A polished paragraph has not necessarily survived a second point of view. A plausible analysis has not necessarily exposed its assumptions. If the output is going to shape a client recommendation, an internal decision, a hiring discussion, a market claim, or a strategic memo, the useful question is not only "does this sound right?" It is "what tried to prove this wrong?"',
    '',
    'That is where the source is helpful. It does not just say AI can hallucinate. It points toward a review function. It suggests that review should depend on consequence level. Some outputs are low stakes and need only a light check. Some are higher stakes and deserve more scrutiny. Some questions are complex enough that the reasoning needs a record: what was claimed, what was disputed, what survived, and where uncertainty remains.',
    '',
    'That is a better way to talk about AI reliability than treating every output as either safe or dangerous. The real issue is fit. What kind of review does this output need before it becomes action?',
    '',
    'A quick summary for an internal Slack message does not need the same process as a client-facing recommendation. A brainstorm does not need the same review as a board memo. A market scan used to start a conversation does not need the same scrutiny as an analysis someone will use to allocate budget. The category mistake is pretending the output quality is obvious from the way the answer sounds.',
    '',
    'For practical work, there are a few plain categories. Some answers just need one serious challenge before use. Some need several independent critiques because the stakes are higher. Some need recorded review for complex questions where facts and reasoning need to stay connected. Some teams need workflow-level review so disagreement is not left to individual memory or personal discipline.',
    '',
    'Those categories matter because AI adoption often starts with tools and prompts, but the risk shows up in workflow. Who owns the moment when the answer gets challenged? Who is allowed to slow down a polished draft? Who records what changed after review? Who decides whether a confident answer is good enough to use?',
    '',
    'What part of your AI workflow is responsible for disagreement?',
    '',
    'That is the question I would rather ask than whether a team is using the newest model. The newest model may produce better work. It may produce faster work. It may reduce some errors and introduce others. But the workflow still needs a place where the answer is forced to meet resistance before it becomes a decision.',
    '',
    'Verbatim creates the adversarial review layer for moments where trust matters. Not as a guarantee of truth. Not as a substitute for judgment. As a structured way to make disagreement happen before confident AI work becomes something a person, team, or client relies on.',
    '',
    'The useful shift is small but important. Do not ask only what AI can produce. Ask what your workflow does after AI produces it.',
    '',
    'Before the next answer becomes a recommendation, a deliverable, or a decision, who is responsible for disagreeing with it?',
  ].join('\n');
}

function assertGuardrails(draftBody: string, brief: BriefData): void {
  const missingLines = requiredLines.filter((line) => !draftBody.includes(line));

  if (missingLines.length > 0) {
    fail(`Draft is missing required line(s): ${missingLines.join('; ')}`);
  }

  const foundForbidden = forbiddenPatterns.filter((pattern) => draftBody.includes(pattern));

  if (foundForbidden.length > 0) {
    fail(`Draft contains forbidden pattern(s): ${foundForbidden.join('; ')}`);
  }

  const count = wordCount(draftBody);

  if (count < 700 || count > 1000) {
    fail(`Draft word count must be 700-1000 words. Found ${count}.`);
  }

  if (brief.recommendedAttributionStrategy === 'do not attribute') {
    const forbiddenAttributionLeaks = [
      'a recent piece',
      'the source',
      'LinkedIn',
      brief.sourceUrl,
      brief.sourceTitle,
      'truth layer as Verbatim',
      'Verbatim is a truth layer',
      'Verbatim creates a truth layer',
    ].filter(Boolean);
    const foundLeaks = forbiddenAttributionLeaks.filter((pattern) => draftBody.includes(pattern));

    if (foundLeaks.length > 0) {
      fail(`Draft attribution strategy is do not attribute, but body contains forbidden attribution leak(s): ${foundLeaks.join('; ')}`);
    }
  }
}

function formatEditorialNotes(brief: BriefData): string[] {
  const commonNotes = [
    '- Product-name leakage check: Main body uses practical review categories before product names and does not introduce Debate, Council, or Index.',
    `- Source authority tier: ${brief.sourceAuthorityTier || 'not specified'}`,
    `- Attribution strategy: ${brief.recommendedAttributionStrategy || 'not specified'}`,
    `- Independent replacement example needed: ${brief.independentReplacementNeeded || 'not specified'}`,
    '- Replacement example status: not retrieved',
  ];

  if (brief.recommendedAttributionStrategy === 'do not attribute') {
    return [
      '- Source constraints: The public draft is written as a standalone argument because the source was treated as an idea trigger, not an attribution source.',
      '- Claims needing verification: Attribution was intentionally dropped because the source was treated as an idea trigger. Any legal, regulatory, or high-stakes examples need independent sourcing before publication.',
      ...commonNotes,
      '- Attribution note: Attribution was dropped because the source was treated as an idea trigger.',
      '- Approved for editorial review: [ ]',
    ];
  }

  return [
    '- Source constraints: Uses the extracted-source brief as a springboard. The full source should still be checked before publication if quoting or attributing specific claims.',
    '- Claims needing verification: Legal-liability framing, regulated-use examples, and any claim about consequences should be attributed to the source or separately verified.',
    ...commonNotes,
    '- Attribution note: Attribution may be used only according to the source authority gate.',
    '- Approved for editorial review: [ ]',
  ];
}

function formatDraft(generatedAt: string, sourceBriefPath: string, brief: BriefData, draftBody: string): string {
  return [
    '# Content Draft From Extracted Source Brief',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Source brief path: ${sourceBriefPath}`,
    '',
    `Selected source URL if available: ${brief.sourceUrl || 'Not available'}`,
    '',
    '## Draft',
    '',
    `# ${draftTitle}`,
    '',
    draftBody,
    '',
    '## Editorial Notes',
    '',
    ...formatEditorialNotes(brief),
    '',
  ].join('\n');
}

const sourceBriefPath = resolve(findLatestBrief());
const briefMarkdown = readFileSync(sourceBriefPath, 'utf-8');
const brief = parseBrief(briefMarkdown);
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(repoRoot, 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'content-draft-from-source.md');
const draftBody = formatDraftBody(brief);

assertGuardrails(draftBody, brief);
mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatDraft(generatedAt, sourceBriefPath, brief, draftBody), 'utf-8');

console.log(`content_draft_from_source_path: ${outputPath}`);
console.log(`source_brief_path: ${sourceBriefPath}`);
console.log(`selected_source_url: ${brief.sourceUrl || 'Not available'}`);
console.log(`word_count: ${wordCount(draftBody)}`);
console.log('guardrails_passed: yes');
