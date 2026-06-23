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

export type AgentSkillSummary = {
  source_type?: string;
  library_id?: string | null;
  browser_mode?: string;
  user_confirmation_used?: boolean;
  modal_capture_status?: string;
  extraction_status?: string;
  screenshot_saved?: boolean;
  visible_text_saved?: boolean;
  extracted_fields_count?: number;
  missing_fields_count?: number;
  screenshot_paths?: string[];
  visible_text_paths?: string[];
};

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
  skill_summary?: AgentSkillSummary;
};

export type AgentSkillResult = {
  skillName: string;
  skillStatus: SkillStatus;
  artifactPaths: string[];
  nextAction: string;
  summary?: AgentSkillSummary;
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
