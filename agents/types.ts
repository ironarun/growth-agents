export type AgentName = 'Paid Ads Agent';

export type ParsedIntent =
  | 'capture_ad_library_source'
  | 'unsupported_source'
  | 'needs_url';

export type SkillStatus =
  | 'captured'
  | 'partial'
  | 'unsupported'
  | 'not_run';

export type AgentRun = {
  run_id: string;
  created_at: string;
  agent_name: AgentName;
  user_instruction: string;
  parsed_intent: ParsedIntent;
  urls: string[];
  selected_skill: string | null;
  skill_status: SkillStatus;
  artifact_paths: string[];
  next_action: string;
  human_review_required: true;
};

export type AgentSkillResult = {
  skillName: string;
  skillStatus: SkillStatus;
  artifactPaths: string[];
  nextAction: string;
};

export type AgentRuntimeContext = {
  runId: string;
  createdAt: string;
  runDir: string;
  repoRoot: string;
};

export type CaptureAdLibrarySourceInput = {
  sourceUrl: string;
  userNote: string;
  context: AgentRuntimeContext;
};
