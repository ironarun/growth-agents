import 'dotenv/config';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

type PublishedArtifactInput = {
  publishedUrl: string;
  publishedTitle: string;
  publishedAt: string;
  sourceBriefPath: string;
  draftPath: string;
  replacementReviewPath: string;
  primaryReplacementUrl: string;
  notes: string;
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

function formatMarkdown(generatedAt: string, input: PublishedArtifactInput): string {
  return [
    '# Published Artifact',
    '',
    `Generated at: ${generatedAt}`,
    '',
    `Published title: ${input.publishedTitle}`,
    '',
    `Published URL: ${input.publishedUrl}`,
    '',
    `Published at: ${input.publishedAt || 'Not provided'}`,
    '',
    '## Source Pipeline',
    '',
    `- Source brief path: ${input.sourceBriefPath || 'Not provided'}`,
    `- Draft path: ${input.draftPath || 'Not provided'}`,
    `- Replacement review path: ${input.replacementReviewPath || 'Not provided'}`,
    `- Primary replacement URL: ${input.primaryReplacementUrl || 'Not provided'}`,
    '',
    '## Human Editorial Notes',
    '',
    input.notes || 'No notes provided.',
    '',
    '## Artifact Status',
    '',
    '- [x] Published manually',
    '- [ ] Distribution drafted',
    '- [ ] Distribution published',
    '- [ ] Performance reviewed',
    '',
    '## Performance Notes',
    '',
    '',
  ].join('\n');
}

async function storeSupabaseEvent(input: PublishedArtifactInput, outputPath: string, generatedAt: string): Promise<boolean> {
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
      source: 'published_artifact',
      request: {
        published_url: input.publishedUrl,
        published_title: input.publishedTitle,
        published_at: input.publishedAt,
        source_brief_path: input.sourceBriefPath,
        draft_path: input.draftPath,
        replacement_review_path: input.replacementReviewPath,
        primary_replacement_url: input.primaryReplacementUrl,
      },
      response: {
        output_path: outputPath,
        generated_at: generatedAt,
        artifact_metadata: {
          status: 'published_manually',
          distribution_drafted: false,
          distribution_published: false,
          performance_reviewed: false,
        },
      },
      status: 'stored',
    });

  if (result.error !== null) {
    fail(`Failed to insert raw_source_events published_artifact row: ${result.error.message}`);
  }

  return true;
}

const input: PublishedArtifactInput = {
  publishedUrl: requiredEnv('PUBLISHED_URL'),
  publishedTitle: requiredEnv('PUBLISHED_TITLE'),
  publishedAt: optionalEnv('PUBLISHED_AT'),
  sourceBriefPath: optionalEnv('SOURCE_BRIEF_PATH'),
  draftPath: optionalEnv('DRAFT_PATH'),
  replacementReviewPath: optionalEnv('REPLACEMENT_REVIEW_PATH'),
  primaryReplacementUrl: optionalEnv('PRIMARY_REPLACEMENT_URL'),
  notes: optionalEnv('NOTES'),
};
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(process.cwd(), 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'published-artifact.md');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatMarkdown(generatedAt, input), 'utf-8');

const supabaseEventStored = await storeSupabaseEvent(input, outputPath, generatedAt);

console.log(`published_artifact_path: ${outputPath}`);
console.log(`supabase_event_stored: ${supabaseEventStored ? 'yes' : 'no'}`);
