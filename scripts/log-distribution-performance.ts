import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

type DistributionPerformanceInput = {
  channel: string;
  distributionUrl: string;
  distributionTitle: string;
  distributionPublishedAt: string;
  publishedArtifactPath: string;
  distributionDraftPath: string;
  impressions: string;
  reactions: string;
  comments: string;
  reposts: string;
  clicks: string;
  notes: string;
};

type ParsedMetrics = {
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  clicks: number | null;
};

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

function isPendingValue(value: string): boolean {
  return value.trim() === '' || value.trim().toLowerCase() === 'pending';
}

function isPendingDistribution(input: DistributionPerformanceInput): boolean {
  return isPendingValue(input.distributionUrl) || isPendingValue(input.distributionPublishedAt);
}

function metricLabel(value: string): string {
  return value === '' ? 'unknown' : value;
}

function parseMetric(value: string): number | null {
  if (value === '') {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    fail(`Metric value must be a non-negative number when provided. Received: ${value}`);
  }

  return parsed;
}

function parseMetrics(input: DistributionPerformanceInput): ParsedMetrics {
  return {
    impressions: parseMetric(input.impressions),
    reactions: parseMetric(input.reactions),
    comments: parseMetric(input.comments),
    reposts: parseMetric(input.reposts),
    clicks: parseMetric(input.clicks),
  };
}

function formatMarkdown(generatedAt: string, input: DistributionPerformanceInput): string {
  const pendingDistribution = isPendingDistribution(input);
  const notesAlreadyMarkPlaceholder = input.notes.toLowerCase().includes('pre-publication placeholder');
  const notes = [
    input.notes || 'No notes provided.',
    pendingDistribution && !notesAlreadyMarkPlaceholder
      ? 'This is a pre-publication placeholder. Replace pending URL and published date after manual LinkedIn publication.'
      : '',
  ].filter(Boolean);

  return [
    '# Distribution Performance',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Channel: ${input.channel}`,
    '',
    `Distribution URL: ${input.distributionUrl}`,
    '',
    `Distribution title: ${input.distributionTitle || 'Not provided'}`,
    '',
    `Published at: ${input.distributionPublishedAt}`,
    '',
    '## Source Artifact',
    '',
    `- Published artifact path: ${input.publishedArtifactPath || 'Not provided'}`,
    `- Distribution draft path: ${input.distributionDraftPath || 'Not provided'}`,
    '',
    '## Early Metrics',
    '',
    `- Impressions: ${metricLabel(input.impressions)}`,
    `- Reactions: ${metricLabel(input.reactions)}`,
    `- Comments: ${metricLabel(input.comments)}`,
    `- Reposts: ${metricLabel(input.reposts)}`,
    `- Clicks: ${metricLabel(input.clicks)}`,
    '',
    '## Notes',
    '',
    notes.join('\n\n'),
    '',
    '## Qualitative Read',
    '',
    '- What seemed to resonate:',
    '- What did not resonate:',
    '- Comments worth responding to:',
    '- Follow-up content ideas:',
    '',
    '## Status',
    '',
    pendingDistribution ? '- [ ] Distribution published manually' : '- [x] Distribution published manually',
    '- [ ] Early performance reviewed',
    '- [ ] Follow-up action chosen',
    '',
  ].join('\n');
}

async function storeSupabaseEvent(
  input: DistributionPerformanceInput,
  metrics: ParsedMetrics,
  outputPath: string,
  generatedAt: string,
): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (supabaseUrl === undefined || supabaseUrl === '' || supabaseServiceRoleKey === undefined || supabaseServiceRoleKey === '') {
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const result = await supabase
    .from('raw_source_events')
    .insert({
      source: 'distribution_performance',
      request: {
        channel: input.channel,
        distribution_url: input.distributionUrl,
        distribution_title: input.distributionTitle,
        distribution_published_at: input.distributionPublishedAt,
        published_artifact_path: input.publishedArtifactPath,
        distribution_draft_path: input.distributionDraftPath,
        metrics_input: {
          impressions: input.impressions,
          reactions: input.reactions,
          comments: input.comments,
          reposts: input.reposts,
          clicks: input.clicks,
        },
        notes: input.notes,
      },
      response: {
        output_path: outputPath,
        generated_at: generatedAt,
        parsed_metrics: metrics,
      },
      status: 'stored',
    });

  if (result.error !== null) {
    fail(`Failed to insert raw_source_events distribution_performance row: ${result.error.message}`);
  }

  return true;
}

const input: DistributionPerformanceInput = {
  channel: requiredEnv('CHANNEL'),
  distributionUrl: requiredEnv('DISTRIBUTION_URL'),
  distributionTitle: optionalEnv('DISTRIBUTION_TITLE'),
  distributionPublishedAt: requiredEnv('DISTRIBUTION_PUBLISHED_AT'),
  publishedArtifactPath: optionalEnv('PUBLISHED_ARTIFACT_PATH'),
  distributionDraftPath: optionalEnv('DISTRIBUTION_DRAFT_PATH'),
  impressions: optionalEnv('IMPRESSIONS'),
  reactions: optionalEnv('REACTIONS'),
  comments: optionalEnv('COMMENTS'),
  reposts: optionalEnv('REPOSTS'),
  clicks: optionalEnv('CLICKS'),
  notes: optionalEnv('NOTES'),
};
const metrics = parseMetrics(input);
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(process.cwd(), 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'distribution-performance.md');
const markdown = formatMarkdown(generatedAt, input);

if (isPendingDistribution(input) && markdown.includes('- [x] Distribution published manually')) {
  fail('Pending distribution cannot be marked as manually published.');
}

if (input.publishedArtifactPath !== '' && markdown.includes('Published artifact path: Not provided')) {
  fail('Published artifact path was provided but not written.');
}

if (input.distributionDraftPath !== '' && markdown.includes('Distribution draft path: Not provided')) {
  fail('Distribution draft path was provided but not written.');
}

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, markdown, 'utf-8');

const supabaseEventStored = await storeSupabaseEvent(input, metrics, outputPath, generatedAt);

console.log(`distribution_performance_path: ${outputPath}`);
console.log(`supabase_event_stored: ${supabaseEventStored ? 'yes' : 'no'}`);
