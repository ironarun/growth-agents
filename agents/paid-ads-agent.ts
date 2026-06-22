import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { captureAdLibrarySource } from './skills/capture-ad-library-source.js';
import type { AgentRun, AgentSkillResult, ParsedIntent } from './types.js';

type PaidAdsAgentResult = {
  run: AgentRun | null;
  terminalResponse: string;
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

function parseIntent(urls: string[]): ParsedIntent {
  if (urls.length === 0) {
    return 'needs_url';
  }

  if (urls.some(isMetaAdLibraryUrl)) {
    return 'capture_ad_library_source';
  }

  return 'unsupported_source';
}

function formatAgentRunMarkdown(run: AgentRun): string {
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

function formatTerminalResponse(run: AgentRun): string {
  const sourceUrl = run.urls[0] ?? 'none';
  const artifacts = run.artifact_paths.map((path) => `  - ${path}`).join('\n');

  return `Agent: ${run.agent_name}
Intent: ${run.parsed_intent}
Source URL: ${sourceUrl}
Selected skill: ${run.selected_skill ?? 'none'}
Capture status: ${run.skill_status}
Artifacts written:
${artifacts || '  - none'}
Next action: ${run.next_action}
Human review required: ${run.human_review_required}`;
}

export function runPaidAdsAgent(userInstruction: string, repoRoot = process.cwd()): PaidAdsAgentResult {
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
  const parsedIntent = parseIntent(urls);
  let skillResult: AgentSkillResult;

  if (parsedIntent === 'capture_ad_library_source') {
    const sourceUrl = urls.find(isMetaAdLibraryUrl);

    if (!sourceUrl) {
      throw new Error('Meta Ad Library URL routing failed after intent detection.');
    }

    skillResult = captureAdLibrarySource({
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
