import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type MissingLayerInput = {
  sourcePostPath: string;
  relatedArticlePath: string;
  clientName: string;
  clientAngle: string;
  missingLayer: string;
  notes: string;
};

const forbiddenCommentPhrases = [
  'great post',
  "couldn't agree more",
  'excited to share',
  'revolutionize',
  'transform',
  'unlock',
  'leverage',
];

function fail(message: string): never {
  throw new Error(message);
}

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (value === undefined || value.trim() === '') {
    fail(`Missing required environment variable: ${name}`);
  }

  return value.trim();
}

function optionalEnv(name: string): string {
  return process.env[name]?.trim() ?? '';
}

function readRequiredFile(path: string, label: string): string {
  const resolvedPath = resolve(path);

  if (!existsSync(resolvedPath)) {
    fail(`${label} does not exist: ${resolvedPath}`);
  }

  return readFileSync(resolvedPath, 'utf-8');
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function summarizeSource(sourcePost: string): string[] {
  const source = sourcePost.toLowerCase();
  const bullets = [
    source.includes('cost') || source.includes('costs')
      ? 'The post frames model routing as a response to rising AI costs.'
      : 'The post identifies an operational pressure around AI workflow design.',
    source.includes('cheaper models') || source.includes('frontier models')
      ? 'It argues that simple work can go to cheaper models while complex work goes to frontier models.'
      : 'It distinguishes between routine AI work and higher-stakes AI work.',
    source.includes('cost infrastructure') || source.includes('control spend')
      ? 'It treats routing as useful infrastructure for cost control, latency, and model allocation.'
      : 'It treats routing as useful infrastructure for deciding where work should go.',
    source.includes('defensible') || source.includes('overconfident') || source.includes('wrong')
      ? 'It leaves open the question of whether the routed answer is defensible enough to use.'
      : 'It leaves open the question of what checks the answer after routing.',
  ];

  return bullets.slice(0, 4);
}

function formatDraftComment(input: MissingLayerInput, sourcePost: string, relatedArticle: string): string {
  const source = `${sourcePost}\n${relatedArticle}`.toLowerCase();
  const mentionsModelRouting = source.includes('model routing');
  const mentionsCost = source.includes('cost');
  const clientLine = input.clientName.toLowerCase() === 'verbatim'
    ? 'That is where adversarial review becomes a separate layer, not a substitute for routing.'
    : 'That is where the review layer has to stay separate from the routing layer.';

  return [
    mentionsModelRouting && mentionsCost
      ? 'Model routing is useful because not every task deserves the most expensive model.'
      : 'The routing layer is useful because not every task deserves the same path.',
    '',
    'But routing and review solve different problems.',
    '',
    normalizeWhitespace(input.missingLayer),
    '',
    'A cheaper model can give the right answer, and a frontier model can still give an answer that sounds finished before it has survived scrutiny.',
    '',
    clientLine,
    '',
    'The operational question is not only which model should answer.',
    '',
    'It is what checks the answer before the team acts on it.',
  ].join('\n');
}

function assertDraftComment(comment: string, input: MissingLayerInput): void {
  const count = wordCount(comment);

  if (count < 80 || count > 180) {
    fail(`Draft comment must be 80-180 words. Found ${count}.`);
  }

  if (comment.includes('#')) {
    fail('Draft comment contains a hashtag.');
  }

  if (comment.includes('—')) {
    fail('Draft comment contains an em dash.');
  }

  const lower = comment.toLowerCase();
  const foundForbidden = forbiddenCommentPhrases.filter((phrase) => lower.includes(phrase));

  if (foundForbidden.length > 0) {
    fail(`Draft comment contains forbidden phrase(s): ${foundForbidden.join(', ')}`);
  }

  if (comment.includes('http://') || comment.includes('https://')) {
    fail('Draft comment must not include links.');
  }

  if (input.clientName.toLowerCase() !== 'verbatim' && lower.includes('verbatim')) {
    fail('Draft comment mentions Verbatim even though CLIENT_NAME is not Verbatim.');
  }
}

function formatMarkdown(
  generatedAt: string,
  input: MissingLayerInput,
  sourcePost: string,
  relatedArticle: string,
  draftComment: string,
): string {
  const sourceSummary = summarizeSource(sourcePost);

  return [
    '# Missing Layer Comment Draft',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Client: ${input.clientName}`,
    '',
    `Source post path: ${input.sourcePostPath}`,
    '',
    `Related article path: ${input.relatedArticlePath || 'Not provided'}`,
    '',
    '## Source Summary',
    '',
    ...sourceSummary.map((bullet) => `- ${bullet}`),
    '',
    '## Missing Layer',
    '',
    `- Stated missing layer: ${input.missingLayer}`,
    `- Why it matters: ${input.clientAngle}`,
    '',
    '## Draft Comment',
    '',
    draftComment,
    '',
    '## Editorial Notes',
    '',
    '- Intended channel: LinkedIn comment',
    '- Do not publish without human review',
    '- Challenge assumption, not person',
    '- Avoid product pitch',
    '- Avoid generic agreement',
    '- Avoid dunking',
    '- Mention client only if it naturally adds value',
    input.notes ? `- Notes: ${input.notes}` : '',
    '',
    '## Approval',
    '',
    '- [ ] Approved for comment',
    '- [ ] Published manually',
    '',
  ].filter((line) => line !== '').join('\n');
}

const input: MissingLayerInput = {
  sourcePostPath: requiredEnv('SOURCE_POST_PATH'),
  relatedArticlePath: optionalEnv('RELATED_ARTICLE_PATH'),
  clientName: requiredEnv('CLIENT_NAME'),
  clientAngle: requiredEnv('CLIENT_ANGLE'),
  missingLayer: requiredEnv('MISSING_LAYER'),
  notes: optionalEnv('NOTES'),
};
const sourcePost = readRequiredFile(input.sourcePostPath, 'SOURCE_POST_PATH');
const relatedArticle = input.relatedArticlePath === ''
  ? ''
  : readRequiredFile(input.relatedArticlePath, 'RELATED_ARTICLE_PATH');
const draftComment = formatDraftComment(input, sourcePost, relatedArticle);

assertDraftComment(draftComment, input);

const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(process.cwd(), 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'missing-layer-comment.md');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatMarkdown(generatedAt, input, sourcePost, relatedArticle, draftComment), 'utf-8');

console.log(`missing_layer_comment_path: ${outputPath}`);
console.log(`word_count: ${wordCount(draftComment)}`);
