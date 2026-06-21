import 'dotenv/config';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import * as XLSX from 'xlsx';

type MetricName =
  | 'Impressions'
  | 'Members reached'
  | 'Profile viewers from this post'
  | 'Followers gained from this post'
  | 'Social engagements'
  | 'Reactions'
  | 'Comments'
  | 'Reposts'
  | 'Saves'
  | 'Sends on LinkedIn'
  | 'Link engagements'
  | 'Premium custom button engagements';

type DemographicRow = {
  category: string;
  value: string;
  percent: string;
};

type Snapshot = {
  postUrl: string;
  postDate: string;
  postPublishTime: string;
  metrics: Record<MetricName, number | null>;
  demographics: DemographicRow[];
};

const repoRoot = process.cwd();
const outputRoot = join(repoRoot, 'output');
const sheetName = 'Post analytics';
const metricNames: MetricName[] = [
  'Impressions',
  'Members reached',
  'Profile viewers from this post',
  'Followers gained from this post',
  'Social engagements',
  'Reactions',
  'Comments',
  'Reposts',
  'Saves',
  'Sends on LinkedIn',
  'Link engagements',
  'Premium custom button engagements',
];

function fail(message: string): never {
  throw new Error(message);
}

function usage(): string {
  return [
    'Missing required environment variable: LINKEDIN_ANALYTICS_EXPORT_PATH',
    '',
    'Usage:',
    '$env:LINKEDIN_ANALYTICS_EXPORT_PATH="C:\\path\\to\\SinglePostAnalytics_Arun Mathur_7473723595211366400.xlsx"',
    'npm.cmd run consultant:ingest-linkedin-analytics',
  ].join('\n');
}

function requireExportPath(): string {
  const value = process.env.LINKEDIN_ANALYTICS_EXPORT_PATH?.trim() ?? '';

  if (value === '') {
    console.error(usage());
    process.exit(1);
  }

  const resolved = resolve(value);

  if (!existsSync(resolved)) {
    fail(`LinkedIn analytics export does not exist: ${resolved}`);
  }

  return resolved;
}

function normalizeCell(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).trim();
}

function parseNumber(value: string): number | null {
  const normalized = value.trim();

  if (normalized === '') {
    return null;
  }

  const parsed = Number(normalized.replaceAll(',', ''));

  if (!Number.isFinite(parsed)) {
    fail(`Expected numeric LinkedIn metric but received "${value}".`);
  }

  return parsed;
}

function parseRows(path: string): string[][] {
  const workbook = XLSX.read(readFileSync(path), {
    type: 'buffer',
    cellDates: true,
  });
  const worksheet = workbook.Sheets[sheetName];

  if (worksheet === undefined) {
    fail(`Expected sheet "${sheetName}" in ${path}.`);
  }

  return XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    blankrows: false,
    raw: false,
    defval: '',
  }).map((row) => row.map(normalizeCell));
}

function findValue(rows: string[][], label: string): string {
  const row = rows.find((candidate) => candidate[0]?.trim().toLowerCase() === label.toLowerCase());
  return row?.[1]?.trim() ?? '';
}

function parseMetrics(rows: string[][]): Record<MetricName, number | null> {
  return metricNames.reduce<Record<MetricName, number | null>>((accumulator, metricName) => {
    accumulator[metricName] = parseNumber(findValue(rows, metricName));
    return accumulator;
  }, {
    Impressions: null,
    'Members reached': null,
    'Profile viewers from this post': null,
    'Followers gained from this post': null,
    'Social engagements': null,
    Reactions: null,
    Comments: null,
    Reposts: null,
    Saves: null,
    'Sends on LinkedIn': null,
    'Link engagements': null,
    'Premium custom button engagements': null,
  });
}

function parseDemographics(rows: string[][]): DemographicRow[] {
  const headerIndex = rows.findIndex((row) => {
    return row[0]?.trim().toLowerCase() === 'category'
      && row[1]?.trim().toLowerCase() === 'value'
      && row[2]?.trim().toLowerCase() === '%';
  });

  if (headerIndex === -1) {
    return [];
  }

  return rows.slice(headerIndex + 1)
    .map((row) => ({
      category: row[0]?.trim() ?? '',
      value: row[1]?.trim() ?? '',
      percent: row[2]?.trim() ?? '',
    }))
    .filter((row) => row.category !== '' || row.value !== '' || row.percent !== '');
}

function parseSnapshot(rows: string[][]): Snapshot {
  const snapshot = {
    postUrl: findValue(rows, 'Post URL'),
    postDate: findValue(rows, 'Post Date'),
    postPublishTime: findValue(rows, 'Post Publish Time'),
    metrics: parseMetrics(rows),
    demographics: parseDemographics(rows),
  };

  if (snapshot.postUrl === '') {
    fail('LinkedIn export is missing Post URL.');
  }

  if (snapshot.postDate === '') {
    fail('LinkedIn export is missing Post Date.');
  }

  return snapshot;
}

function metricRows(metrics: Record<MetricName, number | null>): string[] {
  return metricNames.map((metricName) => {
    const value = metrics[metricName];
    return `| ${metricName} | ${value === null ? 'not provided' : value} |`;
  });
}

function demographicRows(demographics: DemographicRow[]): string[] {
  if (demographics.length === 0) {
    return ['| Not provided | Not provided | Not provided |'];
  }

  return demographics.map((row) => `| ${row.category || 'Not provided'} | ${row.value || 'Not provided'} | ${row.percent || 'Not provided'} |`);
}

function completenessNotes(snapshot: Snapshot): string[] {
  const missingMetrics = metricNames.filter((metricName) => snapshot.metrics[metricName] === null);
  const notes = [
    'Metrics were imported from the LinkedIn Excel export only.',
    'Clicks are not inferred. LinkedIn export field "Link engagements" is preserved separately.',
    missingMetrics.length > 0 ? `Missing metric fields: ${missingMetrics.join(', ')}.` : 'All expected metric fields were present.',
    snapshot.demographics.length > 0 ? 'Demographic rows were present in the export.' : 'No demographic rows were found in the export.',
  ];

  return notes;
}

function formatMarkdown(generatedAt: string, sourcePath: string, snapshot: Snapshot): string {
  return [
    '# LinkedIn Analytics Snapshot',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Source export path: ${sourcePath}`,
    '',
    'Channel: LinkedIn',
    '',
    `Post URL: ${snapshot.postUrl}`,
    '',
    `Post date: ${snapshot.postDate}`,
    '',
    `Post publish time: ${snapshot.postPublishTime || 'not provided'}`,
    '',
    `Snapshot imported at: ${generatedAt}`,
    '',
    '## Metrics',
    '',
    '| Metric | Value |',
    '| --- | ---: |',
    ...metricRows(snapshot.metrics),
    '',
    '## Demographics',
    '',
    '| Category | Value | Percent |',
    '| --- | --- | ---: |',
    ...demographicRows(snapshot.demographics),
    '',
    '## Data Completeness Notes',
    '',
    ...completenessNotes(snapshot).map((note) => `- ${note}`),
    '',
    '## Approval',
    '',
    '- [ ] Snapshot reviewed',
    '- [ ] Metrics match LinkedIn export',
    '- [ ] Approved for distribution performance review',
    '',
  ].join('\n');
}

const exportPath = requireExportPath();
const rows = parseRows(exportPath);
const snapshot = parseSnapshot(rows);
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(outputRoot, `run-${timestamp}`);
const outputPath = join(outputDir, 'linkedin-analytics-snapshot.md');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatMarkdown(generatedAt, exportPath, snapshot), 'utf-8');

console.log(`linkedin_analytics_snapshot_path: ${outputPath}`);
console.log(`source_export_path: ${exportPath}`);
console.log(`post_url: ${snapshot.postUrl}`);
console.log(`post_date: ${snapshot.postDate}`);
console.log(`post_publish_time: ${snapshot.postPublishTime || 'not_provided'}`);
console.log(`impressions: ${snapshot.metrics.Impressions ?? 'not_provided'}`);
console.log(`members_reached: ${snapshot.metrics['Members reached'] ?? 'not_provided'}`);
console.log(`reactions: ${snapshot.metrics.Reactions ?? 'not_provided'}`);
console.log(`comments: ${snapshot.metrics.Comments ?? 'not_provided'}`);
console.log(`reposts: ${snapshot.metrics.Reposts ?? 'not_provided'}`);
console.log(`link_engagements: ${snapshot.metrics['Link engagements'] ?? 'not_provided'}`);
console.log(`demographic_rows: ${snapshot.demographics.length}`);
console.log(`source_file: ${basename(exportPath)}`);
