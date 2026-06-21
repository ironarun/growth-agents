import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type ReplacementBrief = {
  sourceTitle: string;
  sourceUrl: string;
  domain: string;
  confirmedFacts: string[];
  attributedFacts: string[];
  factsToVerify: string[];
  attributionGuidance: string[];
};

type RewriteInputs = {
  contentDraftPath: string;
  replacementExampleReviewPath: string;
  replacementSourceBriefPath: string;
  replacementBrief: ReplacementBrief;
};

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'output');
const forbiddenDraftBodyPatterns = [
  'linkedin.com',
  'truth layer',
  'a recent piece',
  'source surfaced',
  'low-authority',
  'revolutionize',
  'transform',
  'leverage',
  'AI-powered',
  '—',
];

function fail(message: string): never {
  throw new Error(message);
}

function findLatestFile(fileName: string): string {
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
  const target = `## ${heading}`.toLowerCase();
  const startIndex = lines.findIndex((line) => line.trim().toLowerCase() === target);

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

function parseReplacementBrief(markdown: string): ReplacementBrief {
  return {
    sourceTitle: readField(markdown, 'Source title'),
    sourceUrl: readField(markdown, 'Source URL'),
    domain: readField(markdown, 'Domain'),
    confirmedFacts: readBullets(markdown, 'Facts Confirmed In Extracted TechCrunch Article'),
    attributedFacts: readBullets(markdown, 'Facts TechCrunch Attributes To Other Sources'),
    factsToVerify: readBullets(markdown, 'Facts Still To Verify Before Public Use'),
    attributionGuidance: readBullets(markdown, 'Attribution Guidance'),
  };
}

function formatDraftBody(brief: ReplacementBrief): string {
  const sourceName = brief.domain === 'techcrunch.com' ? 'TechCrunch' : brief.domain || 'the replacement source';

  return [
    '# What Part Of Your AI Workflow Is Responsible For Disagreement?',
    '',
    'A phrase I keep coming back to is the verification gap.',
    '',
    'It is the space between a model producing work and a person, team, or client acting on it.',
    '',
    'That gap can sound abstract until it shows up in public. TechCrunch reported that KPMG pulled a report about AI usage after apparent hallucinations were found in it. TechCrunch also reported that organizations challenged claims made about their AI usage, and that KPMG removed the report while conducting its own investigation.',
    '',
    'That is a useful example because it is not a cartoon version of AI failure.',
    '',
    'This is not a story about a careless team pushing a sloppy draft out the door. It is a story about serious professionals working in a high-scrutiny environment where the output looked finished enough to publish. That is the uncomfortable part. The failure was not only about whether AI can hallucinate. It was about whether the workflow had a strong enough review step before the work became public.',
    '',
    'AI creates confident work faster than humans can verify it.',
    '',
    'That sentence is easy to nod at and hard to operationalize. Most teams already have the first half of the AI workflow. Generate. Summarize. Draft. Analyze. The work arrives quickly, and often it arrives looking more complete than it really is. The memo is structured. The recommendation is calm. The analysis has citations, caveats, and a tone that suggests someone has checked it.',
    '',
    'Then someone uses it.',
    '',
    'That is where the important question lives. What happens between output and action?',
    '',
    'Confidence is not review.',
    '',
    'A confident answer has not necessarily faced a serious challenge. A polished paragraph has not necessarily survived a second point of view. A plausible analysis has not necessarily shown which claims are doing too much work. If the output is going to shape a client recommendation, a public report, an internal decision, or a strategic memo, the useful question is not only "does this sound right?" It is "what tried to prove this wrong?"',
    '',
    'The KPMG example matters because it turns that question from a preference into a workflow problem. The issue is not whether a person likes skepticism. The issue is whether the system has a defined place where skepticism happens before AI-assisted work becomes action.',
    '',
    'That distinction matters for consultants, operators, and small teams. They do not usually have a formal AI governance committee waiting to inspect every draft. They have client work, deadlines, judgment calls, and a growing pile of AI-assisted output that looks good enough to move forward. The review step has to fit the work.',
    '',
    'Not every AI output needs the same kind of review.',
    '',
    'Some answers just need one serious challenge before use. Some need several independent critiques because the stakes are higher. Some need recorded review for complex questions where facts and reasoning need to stay connected. Some teams need workflow-level review so disagreement is not left to individual memory or personal discipline.',
    '',
    'Those categories are more useful than vague trust language. They ask who owns the moment when the answer gets challenged. They ask which claims need evidence attached before they leave the building. They ask which recommendations should be argued against before they become advice, analysis, or publication.',
    '',
    'What part of your AI workflow is responsible for disagreement?',
    '',
    'That is the question I would rather ask than whether a team is using the newest model. The newest model may produce faster work. It may produce cleaner work. It may reduce some errors and introduce others. But the workflow still needs a place where the answer is forced to meet resistance before it becomes a decision.',
    '',
    'Verbatim creates the adversarial review layer for moments where trust matters. Not as a guarantee of truth. Not as a substitute for judgment. As a structured way to make disagreement happen before confident AI work becomes something a person, team, or client relies on.',
    '',
    'The useful shift is small but important. Do not ask only what AI can produce. Ask what your workflow does after AI produces it.',
    '',
    `If ${sourceName} can report a public example this concrete, the question is not whether AI mistakes are possible. The question is whether your process has a place to catch them before the work is used.`,
  ].join('\n');
}

function factsUsed(brief: ReplacementBrief): string[] {
  return [
    ...brief.confirmedFacts.filter((fact) => !fact.toLowerCase().includes('identifies the report as')),
    'TechCrunch is named as the replacement source because the replacement brief marks it as a major outlet with a name-directly attribution recommendation.',
  ];
}

function factsAvoided(brief: ReplacementBrief): string[] {
  return [
    ...brief.factsToVerify,
    ...brief.attributedFacts.map((fact) => `${fact} This was not used as a direct public claim without verification.`),
  ];
}

function assertGuardrails(draftBody: string, inputs: RewriteInputs): void {
  const foundForbidden = forbiddenDraftBodyPatterns.filter((pattern) => draftBody.toLowerCase().includes(pattern.toLowerCase()));

  if (foundForbidden.length > 0) {
    fail(`Draft body contains forbidden pattern(s): ${foundForbidden.join('; ')}`);
  }

  if (draftBody.includes('—')) {
    fail('Draft body contains an em dash.');
  }

  if (!draftBody.includes('TechCrunch reported that KPMG pulled a report about AI usage')) {
    fail('Draft body does not use the approved replacement source example.');
  }

  if (!draftBody.includes('What part of your AI workflow is responsible for disagreement?')) {
    fail('Draft body is missing the core question.');
  }

  if (!draftBody.includes('Confidence is not review.')) {
    fail('Draft body is missing required Verbatim line: Confidence is not review.');
  }

  if (inputs.replacementBrief.factsToVerify.some((fact) => fact.includes('Verify the EY comparison')) && draftBody.includes('EY')) {
    fail('Draft body uses EY even though the replacement brief marks it as needing verification.');
  }

  if (inputs.replacementBrief.factsToVerify.some((fact) => fact.includes('Verify the original KPMG report title')) && draftBody.includes('Redefining excellence')) {
    fail('Draft body uses the report title even though the replacement brief marks it as needing verification.');
  }

  if (wordCount(draftBody) < 650 || wordCount(draftBody) > 1000) {
    fail(`Draft body should be 650-1000 words. Found ${wordCount(draftBody)}.`);
  }
}

function formatMarkdown(generatedAt: string, inputs: RewriteInputs, draftBody: string): string {
  return [
    '# Content Draft With Approved Replacement',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Content draft path: ${inputs.contentDraftPath}`,
    '',
    `Replacement example review path: ${inputs.replacementExampleReviewPath}`,
    '',
    `Replacement source brief path: ${inputs.replacementSourceBriefPath}`,
    '',
    `Replacement source used: ${inputs.replacementBrief.sourceTitle || 'Not provided'}`,
    '',
    `Replacement source URL: ${inputs.replacementBrief.sourceUrl || 'Not provided'}`,
    '',
    `Replacement source domain: ${inputs.replacementBrief.domain || 'Not provided'}`,
    '',
    '## Rewrite Notes',
    '',
    '- Rewrote the existing draft around the approved TechCrunch/KPMG replacement example.',
    '- Removed low-authority source attribution from the public draft body.',
    '- Used only replacement-source brief facts as public claims.',
    '- Treated facts listed under "Facts Still To Verify Before Public Use" as blocked unless explicitly framed as requiring verification.',
    '- Preserved human review before publication.',
    '',
    '## Rewritten Draft',
    '',
    draftBody,
    '',
    '## Facts Used From Replacement Source',
    '',
    ...factsUsed(inputs.replacementBrief).map((fact) => `- ${fact}`),
    '',
    '## Facts Intentionally Avoided',
    '',
    ...factsAvoided(inputs.replacementBrief).map((fact) => `- ${fact}`),
    '',
    '## Approval',
    '',
    '- [ ] Replacement source facts reviewed',
    '- [ ] Attributed facts verified or removed',
    '- [ ] No low-authority source leakage',
    '- [ ] No unsupported details introduced',
    '- [ ] Approved for editorial review',
    '- [ ] Approved for publication',
    '',
  ].join('\n');
}

const contentDraftPath = resolve(findLatestFile('content-draft-from-source.md'));
const replacementExampleReviewPath = resolve(findLatestFile('replacement-example-review.md'));
const replacementSourceBriefPath = resolve(findLatestFile('replacement-source-brief.md'));
const replacementSourceBriefMarkdown = readFileSync(replacementSourceBriefPath, 'utf-8');
const replacementBrief = parseReplacementBrief(replacementSourceBriefMarkdown);

if (replacementBrief.sourceUrl.trim() === '') {
  fail('Replacement source brief is missing Source URL.');
}

if (replacementBrief.confirmedFacts.length === 0) {
  fail('Replacement source brief has no confirmed facts to use.');
}

const inputs: RewriteInputs = {
  contentDraftPath,
  replacementExampleReviewPath,
  replacementSourceBriefPath,
  replacementBrief,
};
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(repoRoot, 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'content-draft-with-replacement.md');
const draftBody = formatDraftBody(replacementBrief);

assertGuardrails(draftBody, inputs);
mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatMarkdown(generatedAt, inputs, draftBody), 'utf-8');

console.log(`content_draft_with_replacement_path: ${outputPath}`);
console.log(`content_draft_path: ${contentDraftPath}`);
console.log(`replacement_example_review_path: ${replacementExampleReviewPath}`);
console.log(`replacement_source_brief_path: ${replacementSourceBriefPath}`);
console.log(`replacement_source_url: ${replacementBrief.sourceUrl}`);
console.log(`word_count: ${wordCount(draftBody)}`);
console.log('guardrails_passed: yes');
