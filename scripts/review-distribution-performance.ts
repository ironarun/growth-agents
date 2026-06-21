import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

type Metrics = {
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  clicks: number | null;
};

type DistributionPerformance = {
  path: string;
  channel: string;
  distributionUrl: string;
  distributionTitle: string;
  publishedAt: string;
  publishedArtifactPath: string;
  distributionDraftPath: string;
  metrics: Metrics;
  rawMetricLabels: Record<keyof Metrics, string>;
  notes: string;
  qualitativeRead: string[];
  statusLines: string[];
};

type Review = {
  distributionStatus: string;
  sufficientData: boolean;
  conclusions: string[];
  cannotConclude: string[];
  recommendedNextAction: string;
};

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'output');

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

function readBullets(section: string): string[] {
  return section
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function isPendingValue(value: string): boolean {
  return value.trim() === '' || value.trim().toLowerCase() === 'pending';
}

function parseMetric(value: string): number | null {
  const normalized = value.trim().toLowerCase();

  if (normalized === '' || normalized === 'unknown' || normalized === 'pending') {
    return null;
  }

  const parsed = Number(normalized.replaceAll(',', ''));

  if (!Number.isFinite(parsed) || parsed < 0) {
    fail(`Metric value must be unknown, pending, or a non-negative number. Received: ${value}`);
  }

  return parsed;
}

function formatMetric(value: number | null, rawLabel: string): string {
  return value === null ? rawLabel || 'unknown' : String(value);
}

function parseDistributionPerformance(path: string, markdown: string): DistributionPerformance {
  const sourceArtifact = readSection(markdown, 'Source Artifact');
  const earlyMetrics = readSection(markdown, 'Early Metrics');
  const statusLines = readBullets(readSection(markdown, 'Status'));
  const rawMetricLabels = {
    impressions: readField(earlyMetrics, '- Impressions') || 'unknown',
    reactions: readField(earlyMetrics, '- Reactions') || 'unknown',
    comments: readField(earlyMetrics, '- Comments') || 'unknown',
    reposts: readField(earlyMetrics, '- Reposts') || 'unknown',
    clicks: readField(earlyMetrics, '- Clicks') || 'unknown',
  };

  return {
    path,
    channel: readField(markdown, 'Channel'),
    distributionUrl: readField(markdown, 'Distribution URL'),
    distributionTitle: readField(markdown, 'Distribution title'),
    publishedAt: readField(markdown, 'Published at'),
    publishedArtifactPath: readField(sourceArtifact, '- Published artifact path'),
    distributionDraftPath: readField(sourceArtifact, '- Distribution draft path'),
    metrics: {
      impressions: parseMetric(rawMetricLabels.impressions),
      reactions: parseMetric(rawMetricLabels.reactions),
      comments: parseMetric(rawMetricLabels.comments),
      reposts: parseMetric(rawMetricLabels.reposts),
      clicks: parseMetric(rawMetricLabels.clicks),
    },
    rawMetricLabels,
    notes: readSection(markdown, 'Notes'),
    qualitativeRead: readBullets(readSection(markdown, 'Qualitative Read')),
    statusLines,
  };
}

function metricValues(metrics: Metrics): Array<number | null> {
  return [metrics.impressions, metrics.reactions, metrics.comments, metrics.reposts, metrics.clicks];
}

function hasAnyKnownMetric(metrics: Metrics): boolean {
  return metricValues(metrics).some((value) => value !== null);
}

function hasAnyPositiveMetric(metrics: Metrics): boolean {
  return metricValues(metrics).some((value) => value !== null && value > 0);
}

function hasQualitativeNotes(performance: DistributionPerformance): boolean {
  const notes = performance.notes.trim().toLowerCase();
  const meaningfulQualitativeRead = performance.qualitativeRead.some((item) => {
    const normalized = item.toLowerCase();
    return !normalized.endsWith(':') && normalized.trim() !== '';
  });

  return notes !== ''
    && notes !== 'no notes provided.'
    && !notes.includes('pre-publication placeholder')
    || meaningfulQualitativeRead;
}

function reviewPerformance(performance: DistributionPerformance): Review {
  const pendingDistribution = isPendingValue(performance.distributionUrl) || isPendingValue(performance.publishedAt);
  const allMetricsMissing = !hasAnyKnownMetric(performance.metrics);
  const allKnownMetricsZero = hasAnyKnownMetric(performance.metrics) && !hasAnyPositiveMetric(performance.metrics);

  if (pendingDistribution) {
    return {
      distributionStatus: 'not published or not logged',
      sufficientData: false,
      conclusions: [
        'The distribution log still has a pending URL or pending published date.',
        hasQualitativeNotes(performance)
          ? 'Qualitative notes are present, but they cannot substitute for a real distribution URL and publication timestamp.'
          : 'No usable qualitative performance signal is logged yet.',
      ],
      cannotConclude: [
        'No engagement, reach, click, or comment performance can be analyzed.',
        'No follow-up content recommendation can be chosen from placeholder data.',
      ],
      recommendedNextAction: 'Publish the LinkedIn post manually if it has not been published, then rerun consultant:log-distribution-performance with the real URL, published date, and any available early metrics.',
    };
  }

  if (allMetricsMissing || allKnownMetricsZero) {
    return {
      distributionStatus: 'published manually, performance data insufficient',
      sufficientData: false,
      conclusions: hasQualitativeNotes(performance)
        ? ['Qualitative notes are logged and should be treated as directional, not performance proof.']
        : ['The post appears to have a real URL/date, but no meaningful metrics are logged yet.'],
      cannotConclude: [
        'No reliable signal can be drawn about hook strength, audience resonance, click intent, or comment quality.',
        'No next content/action recommendation should be chosen from missing or zero early metrics alone.',
      ],
      recommendedNextAction: 'Wait for early metrics or add the first real metrics and qualitative notes to distribution-performance.md, then rerun this review.',
    };
  }

  const comments = performance.metrics.comments ?? 0;
  const reactions = performance.metrics.reactions ?? 0;
  const reposts = performance.metrics.reposts ?? 0;
  const clicks = performance.metrics.clicks ?? 0;
  const impressions = performance.metrics.impressions ?? 0;
  const engagementCount = comments + reactions + reposts + clicks;
  const hasCommentSignal = comments > 0;
  const hasStrongSignal = engagementCount >= 10 || comments >= 2 || clicks >= 3;

  if (hasStrongSignal) {
    return {
      distributionStatus: 'published manually, performance signal present',
      sufficientData: true,
      conclusions: [
        `Logged metrics show ${engagementCount} combined reactions, comments, reposts, and clicks${impressions > 0 ? ` on ${impressions} impressions` : ''}.`,
        hasCommentSignal
          ? 'Comments are present and should be reviewed for possible content opportunities or reply opportunities.'
          : 'The strongest signal is non-comment engagement, so next action should stay lightweight until comment quality is known.',
      ],
      cannotConclude: [
        'The log does not prove why the post worked.',
        'The log does not identify which audience segment engaged unless notes include that detail.',
      ],
      recommendedNextAction: hasCommentSignal
        ? 'Review comments manually and turn the best one into a content opportunity or missing-layer comment candidate.'
        : 'Draft one follow-up post or missing-layer comment around the same process-failure angle, then log the result after publication.',
    };
  }

  return {
    distributionStatus: 'published manually, weak early signal',
    sufficientData: true,
    conclusions: [
      `Some real metrics are logged, but the early signal is weak: ${engagementCount} combined reactions, comments, reposts, and clicks.`,
      hasQualitativeNotes(performance)
        ? 'Qualitative notes may explain whether the weak signal is expected, timing-related, or angle-related.'
        : 'No qualitative explanation is logged.',
    ],
    cannotConclude: [
      'The log is not enough to judge the article itself.',
      'The log is not enough to decide whether the distribution angle or timing caused weak performance.',
    ],
    recommendedNextAction: 'Wait for more data or test a sharper distribution angle that opens with the concrete KPMG incident and the process-failure frame.',
  };
}

function formatMarkdown(
  generatedAt: string,
  publishedArtifactPath: string,
  distributionDraftPath: string,
  performance: DistributionPerformance,
  review: Review,
): string {
  return [
    '# Distribution Performance Review',
    '',
    `Generated at: ${generatedAt}`,
    '',
    '## Source Paths Used',
    '',
    `- Published artifact path: ${publishedArtifactPath}`,
    `- LinkedIn distribution draft path: ${distributionDraftPath}`,
    `- Distribution performance path: ${performance.path}`,
    '',
    '## Distribution Status',
    '',
    `- Channel: ${performance.channel || 'Not provided'}`,
    `- Distribution URL: ${performance.distributionUrl || 'Not provided'}`,
    `- Distribution title: ${performance.distributionTitle || 'Not provided'}`,
    `- Published at: ${performance.publishedAt || 'Not provided'}`,
    `- Review status: ${review.distributionStatus}`,
    '',
    '## Metrics Read From Performance Log',
    '',
    `- Impressions: ${formatMetric(performance.metrics.impressions, performance.rawMetricLabels.impressions)}`,
    `- Reactions: ${formatMetric(performance.metrics.reactions, performance.rawMetricLabels.reactions)}`,
    `- Comments: ${formatMetric(performance.metrics.comments, performance.rawMetricLabels.comments)}`,
    `- Reposts: ${formatMetric(performance.metrics.reposts, performance.rawMetricLabels.reposts)}`,
    `- Clicks: ${formatMetric(performance.metrics.clicks, performance.rawMetricLabels.clicks)}`,
    '',
    '## Qualitative Notes Read From Performance Log',
    '',
    performance.notes.trim() !== '' ? performance.notes.trim() : 'No qualitative notes logged.',
    '',
    'Qualitative read fields:',
    ...(performance.qualitativeRead.length > 0 ? performance.qualitativeRead.map((item) => `- ${item}`) : ['- Not provided.']),
    '',
    '## What Can Be Concluded',
    '',
    ...review.conclusions.map((item) => `- ${item}`),
    '',
    '## What Cannot Be Concluded',
    '',
    ...review.cannotConclude.map((item) => `- ${item}`),
    '',
    '## Data Sufficiency',
    '',
    `- Sufficient for next content/action recommendation: ${review.sufficientData ? 'yes' : 'no'}`,
    '',
    '## Recommended Next Action',
    '',
    review.recommendedNextAction,
    '',
    '## Approval',
    '',
    '- [ ] Review accepted',
    '- [ ] Metrics updated if needed',
    '- [ ] Next action approved',
    '- [ ] Follow-up action completed manually',
    '',
  ].join('\n');
}

const publishedArtifactPath = resolve(findLatestFile('published-artifact.md'));
const distributionDraftPath = resolve(findLatestFile('linkedin-distribution-draft.md'));
const distributionPerformancePath = resolve(findLatestFile('distribution-performance.md'));
const performanceMarkdown = readFileSync(distributionPerformancePath, 'utf-8');
const performance = parseDistributionPerformance(distributionPerformancePath, performanceMarkdown);
const review = reviewPerformance(performance);
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(repoRoot, 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'distribution-performance-review.md');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatMarkdown(generatedAt, publishedArtifactPath, distributionDraftPath, performance, review), 'utf-8');

console.log(`distribution_performance_review_path: ${outputPath}`);
console.log(`distribution_performance_path: ${distributionPerformancePath}`);
console.log(`sufficient_data: ${review.sufficientData ? 'yes' : 'no'}`);
console.log(`recommended_next_action: ${review.recommendedNextAction}`);
