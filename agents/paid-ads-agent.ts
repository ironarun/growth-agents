import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { captureAdLibrarySource } from './skills/capture-ad-library-source.js';
import type {
  AgentRun,
  AgentRuntimeContext,
  AgentSkillResult,
  AgentSkillSummary,
  ParsedIntent,
  SkillStatus,
} from './types.js';

type PaidAdsAgentResult = {
  run: AgentRun | null;
  terminalResponse: string;
};

type BatchPerUrlResult = {
  url: string;
  library_id: string | null;
  source_type: string;
  capture_status: SkillStatus;
  extraction_status: string;
  browser_mode: string;
  user_confirmation_used: boolean;
  screenshot_paths: string[];
  visible_text_paths: string[];
  durable_capture_path: string | null;
  extracted_fields_count: number;
  missing_fields_count: number;
  human_review_required: true;
  artifact_paths: string[];
  error?: string;
};

type BatchCaptureSummary = {
  run_id: string;
  created_at: string;
  user_note: string;
  total_urls: number;
  successful_captures: number;
  partial_captures: number;
  failed_captures: number;
  skipped_captures: number;
  per_url_results: BatchPerUrlResult[];
  usable_evidence_count: number;
  missing_evidence_count: number;
  next_action: string;
  human_review_required: true;
};

const AGENT_NAME = 'Paid Ads Agent';

function extractUrls(instruction: string): string[] {
  const matches = instruction.match(/https?:\/\/[^\s<>"']+/g) ?? [];

  return matches.map((url) => url.replace(/[),.;\]]+$/g, ''));
}

function isMetaAdLibraryUrl(urlValue: string): boolean {
  try {
    const url = new URL(urlValue);
    return url.hostname.toLowerCase().includes('facebook.com') && url.pathname.toLowerCase().includes('/ads/library');
  } catch {
    return false;
  }
}

function metaAdLibraryUrls(urls: string[]): string[] {
  return urls.filter(isMetaAdLibraryUrl);
}

function getLibraryId(urlValue: string): string | null {
  try {
    const url = new URL(urlValue);
    return url.searchParams.get('id') ?? url.searchParams.get('ad_archive_id');
  } catch {
    return null;
  }
}

function getSourceType(urlValue: string): string {
  try {
    const url = new URL(urlValue);

    if (url.searchParams.has('id') || url.searchParams.has('ad_archive_id')) {
      return 'specific_ad_detail_url';
    }

    if (url.searchParams.has('q')) {
      return 'search_results_page';
    }
  } catch {
    return 'unknown';
  }

  return 'ad_library_unknown';
}

function parseIntent(urls: string[]): ParsedIntent {
  if (urls.length === 0) {
    return 'needs_url';
  }

  const metaUrls = metaAdLibraryUrls(urls);

  if (metaUrls.length > 1) {
    return 'batch_ad_library_research';
  }

  if (metaUrls.length === 1) {
    return 'capture_ad_library_source';
  }

  return 'unsupported_source';
}

function formatAgentRunMarkdown(run: AgentRun): string {
  const screenshotPaths = run.skill_summary?.screenshot_paths ?? [];
  const visibleTextPaths = run.skill_summary?.visible_text_paths ?? [];

  return `# Paid Ads Agent Run

Run ID: ${run.run_id}
Created at: ${run.created_at}
Agent: ${run.agent_name}
Human review required: ${run.human_review_required}

## User Instruction

${run.user_instruction}

## Parsed Intent

- Intent: ${run.parsed_intent}
- URLs: ${run.urls.length > 0 ? run.urls.join(', ') : 'none'}
- Selected skill: ${run.selected_skill ?? 'none'}
- Skill status: ${run.skill_status}
- Source type: ${run.skill_summary?.source_type ?? 'unknown'}
- Library ID: ${run.skill_summary?.library_id ?? 'not found'}
- Browser mode: ${run.skill_summary?.browser_mode ?? 'unknown'}
- User confirmation used: ${run.skill_summary?.user_confirmation_used ?? false}
- Modal capture status: ${run.skill_summary?.modal_capture_status ?? 'not attempted'}
- Extraction status: ${run.skill_summary?.extraction_status ?? 'unknown'}
- Screenshot saved: ${run.skill_summary?.screenshot_saved ?? false}
- Visible text saved: ${run.skill_summary?.visible_text_saved ?? false}
- Extracted fields count: ${run.skill_summary?.extracted_fields_count ?? 0}
- Missing fields count: ${run.skill_summary?.missing_fields_count ?? 0}

## Screenshot Paths

${screenshotPaths.length > 0 ? screenshotPaths.map((path) => `- ${path}`).join('\n') : '- None'}

## Visible Text Paths

${visibleTextPaths.length > 0 ? visibleTextPaths.map((path) => `- ${path}`).join('\n') : '- None'}

## Artifacts

${run.artifact_paths.length > 0 ? run.artifact_paths.map((path) => `- ${path}`).join('\n') : '- None'}

## Next Action

${run.next_action}
`;
}

function createUnsupportedSourceArtifact(
  runDir: string,
  sourceUrl: string,
  userInstruction: string,
): AgentSkillResult {
  const jsonPath = join(runDir, 'unsupported-source.json');
  const markdownPath = join(runDir, 'unsupported-source.md');
  const artifact = {
    source_url: sourceUrl,
    user_instruction: userInstruction,
    status: 'unsupported',
    reason: 'Paid Ads Agent v0.1 only routes Meta Ad Library URLs.',
    human_review_required: true,
  };

  writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
  writeFileSync(
    markdownPath,
    `# Unsupported Source

Source URL: ${sourceUrl}
Status: unsupported

## Reason

Paid Ads Agent v0.1 only routes Meta Ad Library URLs.

## User Instruction

${userInstruction}

## Human Review

- [ ] Decide whether this source type should become a future paid ads skill.
`,
    'utf8',
  );

  return {
    skillName: 'unsupported-source',
    skillStatus: 'unsupported',
    artifactPaths: [jsonPath, markdownPath],
    nextAction: 'Provide a Meta Ad Library URL, or define a new supported source skill.',
  };
}

function summarizeSkillResult(url: string, result: AgentSkillResult): BatchPerUrlResult {
  const summary = result.summary ?? {};

  return {
    url,
    library_id: summary.library_id ?? getLibraryId(url),
    source_type: summary.source_type ?? getSourceType(url),
    capture_status: result.skillStatus,
    extraction_status: summary.extraction_status ?? 'unknown',
    browser_mode: summary.browser_mode ?? 'unknown',
    user_confirmation_used: summary.user_confirmation_used ?? false,
    screenshot_paths: summary.screenshot_paths ?? [],
    visible_text_paths: summary.visible_text_paths ?? [],
    durable_capture_path: summary.durable_capture_path ?? null,
    extracted_fields_count: summary.extracted_fields_count ?? 0,
    missing_fields_count: summary.missing_fields_count ?? 0,
    human_review_required: true,
    artifact_paths: result.artifactPaths,
  };
}

function summarizeFailedUrl(url: string, error: unknown): BatchPerUrlResult {
  return {
    url,
    library_id: getLibraryId(url),
    source_type: getSourceType(url),
    capture_status: 'failed',
    extraction_status: 'browser_capture_blocked_or_empty',
    browser_mode: 'unknown',
    user_confirmation_used: false,
    screenshot_paths: [],
    visible_text_paths: [],
    durable_capture_path: null,
    extracted_fields_count: 0,
    missing_fields_count: 0,
    human_review_required: true,
    artifact_paths: [],
    error: error instanceof Error ? error.message : String(error),
  };
}

function formatBatchSummaryMarkdown(summary: BatchCaptureSummary): string {
  const rows = summary.per_url_results
    .map(
      (result, index) => `## URL ${index + 1}

- URL: ${result.url}
- Library ID: ${result.library_id ?? 'not found'}
- Source type: ${result.source_type}
- Capture status: ${result.capture_status}
- Extraction status: ${result.extraction_status}
- Browser mode: ${result.browser_mode}
- User confirmation used: ${result.user_confirmation_used}
- Extracted fields count: ${result.extracted_fields_count}
- Missing fields count: ${result.missing_fields_count}
- Durable capture path: ${result.durable_capture_path ?? 'not written'}
- Error: ${result.error ?? 'none'}

### Screenshot Paths

${result.screenshot_paths.length > 0 ? result.screenshot_paths.map((path) => `- ${path}`).join('\n') : '- None'}

### Visible Text Paths

${result.visible_text_paths.length > 0 ? result.visible_text_paths.map((path) => `- ${path}`).join('\n') : '- None'}

### Artifacts

${result.artifact_paths.length > 0 ? result.artifact_paths.map((path) => `- ${path}`).join('\n') : '- None'}`,
    )
    .join('\n\n');

  return `# Paid Ads Batch Source Capture

Run ID: ${summary.run_id}
Created at: ${summary.created_at}
Human review required: ${summary.human_review_required}

## User Note

${summary.user_note}

## Summary

- Total URLs: ${summary.total_urls}
- Successful captures: ${summary.successful_captures}
- Partial captures: ${summary.partial_captures}
- Failed captures: ${summary.failed_captures}
- Skipped captures: ${summary.skipped_captures}
- Usable evidence count: ${summary.usable_evidence_count}
- Missing evidence count: ${summary.missing_evidence_count}

## Per URL Results

${rows}

## Next Action

${summary.next_action}

## Human Review

- [ ] Review each per-URL capture before pattern analysis.
- [ ] Complete missing visible-copy and creative-pattern fields.
- [ ] Do not infer profitability from ad longevity.
- [ ] Run creative pattern analysis only after enough reviewed captures exist.
`;
}

async function runBatchAdLibraryCapture(
  urls: string[],
  userInstruction: string,
  context: AgentRuntimeContext,
): Promise<AgentSkillResult> {
  const perUrlResults: BatchPerUrlResult[] = [];
  const artifactPaths: string[] = [];

  for (const [index, url] of urls.entries()) {
    try {
      const result = await captureAdLibrarySource({
        sourceUrl: url,
        userNote: userInstruction,
        context,
        artifactPrefix: `url-${String(index + 1).padStart(3, '0')}`,
        batchIndex: index + 1,
        batchTotal: urls.length,
      });
      perUrlResults.push(summarizeSkillResult(url, result));
      artifactPaths.push(...result.artifactPaths);
    } catch (error) {
      perUrlResults.push(summarizeFailedUrl(url, error));
    }
  }

  const successfulCaptures = perUrlResults.filter(
    (result) => result.extraction_status === 'captured_needs_human_review',
  ).length;
  const skippedCaptures = perUrlResults.filter((result) => result.capture_status === 'skipped').length;
  const failedCaptures = perUrlResults.filter((result) => result.capture_status === 'failed').length;
  const partialCaptures = perUrlResults.filter(
    (result) =>
      result.capture_status !== 'failed' &&
      result.capture_status !== 'skipped' &&
      result.extraction_status !== 'captured_needs_human_review',
  ).length;
  const usableEvidenceCount = perUrlResults.filter(
    (result) => result.extracted_fields_count > 0 || result.screenshot_paths.length > 0 || result.visible_text_paths.length > 0,
  ).length;
  const missingEvidenceCount = perUrlResults.length - usableEvidenceCount;
  const batchSummary: BatchCaptureSummary = {
    run_id: context.runId,
    created_at: context.createdAt,
    user_note: userInstruction,
    total_urls: urls.length,
    successful_captures: successfulCaptures,
    partial_captures: partialCaptures,
    failed_captures: failedCaptures,
    skipped_captures: skippedCaptures,
    per_url_results: perUrlResults,
    usable_evidence_count: usableEvidenceCount,
    missing_evidence_count: missingEvidenceCount,
    next_action:
      usableEvidenceCount > 0
        ? 'Review per-URL captures, complete missing fields, then run creative pattern analysis after enough examples exist.'
        : 'No usable evidence was captured. Retry with headful user-assisted capture or provide accessible Meta Ad Library URLs.',
    human_review_required: true,
  };
  const batchJsonPath = join(context.runDir, 'paid-ads-batch-source-capture.json');
  const batchMarkdownPath = join(context.runDir, 'paid-ads-batch-source-capture.md');

  writeFileSync(batchJsonPath, `${JSON.stringify(batchSummary, null, 2)}\n`, 'utf8');
  writeFileSync(batchMarkdownPath, formatBatchSummaryMarkdown(batchSummary), 'utf8');
  artifactPaths.push(batchJsonPath, batchMarkdownPath);

  const aggregateSummary: AgentSkillSummary = {
    source_type: 'batch_ad_library_research',
    browser_mode: 'mixed_or_per_url',
    user_confirmation_used: perUrlResults.some((result) => result.user_confirmation_used),
    extraction_status:
      successfulCaptures > 0
        ? 'captured_needs_human_review'
        : usableEvidenceCount > 0
          ? 'partial_needs_review'
          : 'browser_capture_blocked_or_empty',
    screenshot_saved: perUrlResults.some((result) => result.screenshot_paths.length > 0),
    visible_text_saved: perUrlResults.some((result) => result.visible_text_paths.length > 0),
    extracted_fields_count: perUrlResults.reduce((total, result) => total + result.extracted_fields_count, 0),
    missing_fields_count: perUrlResults.reduce((total, result) => total + result.missing_fields_count, 0),
    screenshot_paths: perUrlResults.flatMap((result) => result.screenshot_paths),
    visible_text_paths: perUrlResults.flatMap((result) => result.visible_text_paths),
  };

  return {
    skillName: 'batch-capture-ad-library-source',
    skillStatus:
      successfulCaptures > 0
        ? 'captured'
        : usableEvidenceCount > 0
          ? 'partial'
          : skippedCaptures === urls.length
            ? 'skipped'
            : 'failed',
    artifactPaths,
    nextAction: batchSummary.next_action,
    summary: aggregateSummary,
  };
}

function formatTerminalResponse(run: AgentRun): string {
  const sourceUrl = run.urls[0] ?? 'none';
  const sourceUrlLine =
    run.parsed_intent === 'batch_ad_library_research'
      ? `Source URLs: ${run.urls.length}`
      : `Source URL: ${sourceUrl}`;
  const artifacts = run.artifact_paths.map((path) => `  - ${path}`).join('\n');
  const screenshotPaths = run.skill_summary?.screenshot_paths ?? [];
  const visibleTextPaths = run.skill_summary?.visible_text_paths ?? [];

  return `Agent: ${run.agent_name}
Intent: ${run.parsed_intent}
${sourceUrlLine}
Source type: ${run.skill_summary?.source_type ?? 'unknown'}
Library ID: ${run.skill_summary?.library_id ?? 'not found'}
Browser mode: ${run.skill_summary?.browser_mode ?? 'unknown'}
User confirmation used: ${run.skill_summary?.user_confirmation_used ?? false}
Selected skill: ${run.selected_skill ?? 'none'}
Capture status: ${run.skill_status}
Modal capture status: ${run.skill_summary?.modal_capture_status ?? 'not attempted'}
Extraction status: ${run.skill_summary?.extraction_status ?? 'unknown'}
Screenshot saved: ${run.skill_summary?.screenshot_saved ?? false}
Visible text saved: ${run.skill_summary?.visible_text_saved ?? false}
Extracted fields count: ${run.skill_summary?.extracted_fields_count ?? 0}
Missing fields count: ${run.skill_summary?.missing_fields_count ?? 0}
Screenshot paths:
${screenshotPaths.length > 0 ? screenshotPaths.map((path) => `  - ${path}`).join('\n') : '  - none'}
Visible text paths:
${visibleTextPaths.length > 0 ? visibleTextPaths.map((path) => `  - ${path}`).join('\n') : '  - none'}
Artifacts written:
${artifacts || '  - none'}
Next action: ${run.next_action}
Human review required: ${run.human_review_required}`;
}

export async function runPaidAdsAgent(userInstruction: string, repoRoot = process.cwd()): Promise<PaidAdsAgentResult> {
  const trimmedInstruction = userInstruction.trim();

  if (trimmedInstruction === '') {
    return {
      run: null,
      terminalResponse:
        'Agent: Paid Ads Agent\nIntent: needs_url\nPlease provide an instruction with a source URL, for example: npm.cmd run agent:paid-ads -- "I like this Meta ad: https://www.facebook.com/ads/library/..."',
    };
  }

  const createdAt = new Date().toISOString();
  const runId = `run-${createdAt.replace(/[:.]/g, '-')}`;
  const runDir = join(repoRoot, 'output', runId);
  mkdirSync(runDir, { recursive: true });

  const urls = extractUrls(trimmedInstruction);
  const metaUrls = metaAdLibraryUrls(urls);
  const parsedIntent = parseIntent(urls);
  let skillResult: AgentSkillResult;

  if (parsedIntent === 'batch_ad_library_research') {
    skillResult = await runBatchAdLibraryCapture(metaUrls, trimmedInstruction, {
      runId,
      createdAt,
      runDir,
      repoRoot,
    });
  } else if (parsedIntent === 'capture_ad_library_source') {
    const sourceUrl = metaUrls[0];

    if (!sourceUrl) {
      throw new Error('Meta Ad Library URL routing failed after intent detection.');
    }

    skillResult = await captureAdLibrarySource({
      sourceUrl,
      userNote: trimmedInstruction,
      context: {
        runId,
        createdAt,
        runDir,
        repoRoot,
      },
    });
  } else if (parsedIntent === 'unsupported_source') {
    const sourceUrl = urls[0];

    if (!sourceUrl) {
      throw new Error('Unsupported source routing failed without URL.');
    }

    skillResult = createUnsupportedSourceArtifact(runDir, sourceUrl, trimmedInstruction);
  } else {
    skillResult = {
      skillName: 'none',
      skillStatus: 'not_run',
      artifactPaths: [],
      nextAction: 'Provide a Meta Ad Library URL to capture.',
    };
  }

  const run: AgentRun = {
    run_id: runId,
    created_at: createdAt,
    agent_name: AGENT_NAME,
    user_instruction: trimmedInstruction,
    parsed_intent: parsedIntent,
    urls,
    selected_skill: skillResult.skillName,
    skill_status: skillResult.skillStatus,
    artifact_paths: [],
    next_action: skillResult.nextAction,
    human_review_required: true,
    ...(skillResult.summary ? { skill_summary: skillResult.summary } : {}),
  };

  const agentRunJsonPath = join(runDir, 'agent-run.json');
  const agentRunMarkdownPath = join(runDir, 'agent-run.md');
  run.artifact_paths = [...skillResult.artifactPaths, agentRunJsonPath, agentRunMarkdownPath];

  writeFileSync(agentRunJsonPath, `${JSON.stringify(run, null, 2)}\n`, 'utf8');
  writeFileSync(agentRunMarkdownPath, formatAgentRunMarkdown(run), 'utf8');

  return {
    run,
    terminalResponse: formatTerminalResponse(run),
  };
}
