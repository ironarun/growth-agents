/// <reference types="node" />

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Platform = 'LinkedIn' | 'Substack Notes' | 'X' | 'Reddit' | 'Hacker News';
type TechnicalDepth = 'low' | 'medium' | 'high';
type ProfileId = 'arun' | 'model-citizen' | 'verbatim' | 'unknown';
type RecommendedAction = 'reply' | 'restack/comment' | 'quote/comment' | 'observe-only' | 'skip';
type CollectionMethod = 'manual';
type SourceType = 'post' | 'comment' | 'note' | 'thread';
type UserIntent = 'reply' | 'quote' | 'observe' | 'research';

interface SeedPost {
  id: string;
  platform: Platform;
  url: string;
  author: string;
  authorRole: string;
  postText: string;
  fullContext: string;
  quotedText: string;
  threadContext: string;
  topic: string;
  observedAudience: string;
  whyItMightMatter: string;
  technicalDepth: TechnicalDepth;
  suggestedProfile: ProfileId;
  collectedAt: string;
  collectionMethod: CollectionMethod;
  sourceType: SourceType;
  userIntent: UserIntent;
}

interface Profile {
  profileId: Exclude<ProfileId, 'unknown'>;
  name: string;
  role: string;
  platforms: Platform[];
  topics: string[];
  voice: string;
  toneRules: string[];
  avoidRules: string[];
  replyPosture: string;
  ctaRules: string[];
  riskTolerance: 'low' | 'low-medium' | 'medium' | 'medium-high' | 'high';
}

interface ScoreSummary {
  relevance: number;
  replyPotential: number;
  founderFit: number;
  comprehensionFit: number;
  credibilityRisk: number;
}

interface PainMemoryEntry {
  id: string;
  sourcePostId: string;
  platform: Platform;
  topic: string;
  selectedProfile: Profile['profileId'];
  audience: string;
  painPoint: string;
  audienceLanguage: string;
  objection: string;
  emotionalTrigger: string;
  creativeAngle: string;
  suggestedTemplateUse: string;
  confidence: 'low' | 'medium' | 'high';
  notes: string;
}

interface ProfileRoute {
  profile: Profile;
  whyProfileFits: string;
}

interface ReviewItem {
  seed: SeedPost;
  route: ProfileRoute;
  scores: ScoreSummary;
  whyWorthEngaging: string;
  painMemory: PainMemoryEntry;
  draftReply: string;
  riskNote: string;
  recommendedAction: RecommendedAction;
  skipOrObserveReason: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const seedPostsPath = join(here, 'seed-posts.json');
const profilesDir = join(here, 'profiles');
const repoRoot = resolve(here, '..', '..');

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

function clampScore(score: number): number {
  return Math.max(1, Math.min(5, score));
}

function includesAny(text: string, signals: string[]): boolean {
  return signals.some((signal) => text.includes(signal));
}

function countSignals(text: string, signals: string[]): number {
  return signals.filter((signal) => text.includes(signal)).length;
}

function loadProfiles(): Profile[] {
  return [
    readJson<Profile>(join(profilesDir, 'arun.json')),
    readJson<Profile>(join(profilesDir, 'model-citizen.json')),
    readJson<Profile>(join(profilesDir, 'verbatim.json')),
  ];
}

function topicMatchesProfile(seed: SeedPost, profile: Profile): boolean {
  const topic = seed.topic.toLowerCase();
  return profile.topics.some((profileTopic) => topic.includes(profileTopic.toLowerCase()));
}

function seedContext(seed: SeedPost): string {
  return [
    seed.topic,
    seed.postText,
    seed.fullContext,
    seed.quotedText,
    seed.threadContext,
    seed.whyItMightMatter,
  ].join(' ');
}

function sourceEvidence(seed: SeedPost): string {
  return [
    seed.postText,
    seed.quotedText === '' ? '' : `Quoted text: ${seed.quotedText}`,
    seed.fullContext === '' ? '' : `Full context: ${seed.fullContext}`,
    seed.threadContext === '' ? '' : `Thread context: ${seed.threadContext}`,
  ].filter(Boolean).join(' ');
}

function routeProfile(seed: SeedPost, profiles: Profile[]): ProfileRoute {
  const text = seedContext(seed).toLowerCase();
  const suggested = profiles.find((profile) => profile.profileId === seed.suggestedProfile);

  if (suggested !== undefined) {
    return {
      profile: suggested,
      whyProfileFits: `${suggested.name} was suggested by the seed and fits the platform/topic well enough for review.`,
    };
  }

  const verbatim = profiles.find((profile) => profile.profileId === 'verbatim');
  if (
    verbatim !== undefined &&
    includesAny(text, ['client', 'consultant', 'deliverable', 'hallucination', 'correctness'])
  ) {
    return {
      profile: verbatim,
      whyProfileFits: 'Verbatim fits because the post is about client-facing AI risk and pressure-testing conclusions.',
    };
  }

  const modelCitizen = profiles.find((profile) => profile.profileId === 'model-citizen');
  if (
    modelCitizen !== undefined &&
    (seed.platform === 'Substack Notes' ||
      includesAny(text, ['absurd', 'hype', 'broadcast', 'human', 'notes']))
  ) {
    return {
      profile: modelCitizen,
      whyProfileFits: 'The Model Citizen fits because the post has a distribution or tech-culture angle where dry observation can add value.',
    };
  }

  const arun = profiles.find((profile) => profile.profileId === 'arun');
  if (arun === undefined) {
    throw new Error('Missing required arun profile.');
  }

  return {
    profile: arun,
    whyProfileFits: topicMatchesProfile(seed, arun)
      ? 'Arun fits because the post maps to founder workflow, agent context, or GTM infrastructure.'
      : 'Arun is the fallback profile for founder-workflow review.',
  };
}

function scorePost(seed: SeedPost, route: ProfileRoute): ScoreSummary {
  const text = seedContext(seed).toLowerCase();

  const relevanceSignals = [
    'claude',
    'codex',
    'coding agent',
    'ai coding',
    'agent memory',
    'repo',
    'founder',
    'substack',
    'notes',
    'client',
    'consultant',
  ];
  const replySignals = ['tested', 'workflow', 'memory', 'context', 'distribution', 'specific', 'client'];
  const founderSignals = ['founder', 'cto', 'solo', 'repo', 'testing', 'workflow', 'client'];
  const technicalSignals = ['ast', 'sandboxing', 'context window', 'graph traversal', 'deterministic', 'diff repair'];
  const riskSignals = ['replace engineers', 'leaderboard', 'frontier', ...technicalSignals];

  let relevance = 2 + countSignals(text, relevanceSignals);
  let replyPotential = 2 + countSignals(text, replySignals);
  let founderFit = 2 + countSignals(text, founderSignals);
  let comprehensionFit = 5;
  let credibilityRisk = 1 + countSignals(text, riskSignals);

  if (seed.technicalDepth === 'medium') {
    comprehensionFit -= 1;
    credibilityRisk += 1;
  }

  if (seed.technicalDepth === 'high') {
    comprehensionFit -= 3;
    credibilityRisk += 3;
    replyPotential -= 1;
  }

  if (seed.technicalDepth === 'high' && route.profile.profileId === 'arun') {
    const founderFramed = includesAny(text, ['founder', 'workflow', 'product', 'repo', 'client']);
    if (!founderFramed) {
      founderFit -= 2;
      replyPotential -= 1;
      credibilityRisk += 1;
    }
  }

  if (seed.platform === 'Hacker News') {
    replyPotential -= 1;
    credibilityRisk += 1;
  }

  if (route.profile.profileId === 'verbatim' && includesAny(text, ['client', 'consultant', 'deliverable'])) {
    relevance += 1;
    founderFit += 1;
  }

  if (route.profile.profileId === 'model-citizen' && includesAny(text, ['broadcast', 'hype', 'human', 'notes'])) {
    replyPotential += 1;
  }

  return {
    relevance: clampScore(relevance),
    replyPotential: clampScore(replyPotential),
    founderFit: clampScore(founderFit),
    comprehensionFit: clampScore(comprehensionFit),
    credibilityRisk: clampScore(credibilityRisk),
  };
}

function hnAngleFitsModelCitizen(seed: SeedPost, route: ProfileRoute): boolean {
  const text = `${seed.topic} ${seed.postText}`.toLowerCase();
  return (
    seed.platform === 'Hacker News' &&
    route.profile.profileId === 'model-citizen' &&
    includesAny(text, ['absurd', 'human', 'hype', 'culture'])
  );
}

function recommendAction(seed: SeedPost, route: ProfileRoute, scores: ScoreSummary): RecommendedAction {
  const positiveScore = scores.relevance + scores.replyPotential + scores.founderFit + scores.comprehensionFit;
  const quoteSupported = seed.platform === 'Substack Notes' || seed.platform === 'X';
  const profileFitStrong = scores.relevance >= 4 && scores.comprehensionFit >= 4 && scores.credibilityRisk <= 3;

  if (scores.credibilityRisk >= 5 && scores.comprehensionFit <= 2) {
    return seed.platform === 'Hacker News' ? 'observe-only' : 'skip';
  }

  if (seed.platform === 'Hacker News' && !hnAngleFitsModelCitizen(seed, route)) {
    return 'observe-only';
  }

  if (seed.userIntent === 'observe') {
    return profileFitStrong && scores.replyPotential >= 5 ? 'reply' : 'observe-only';
  }

  if (seed.userIntent === 'research') {
    return profileFitStrong && route.profile.profileId === 'model-citizen' ? 'quote/comment' : 'observe-only';
  }

  if (seed.userIntent === 'quote') {
    if (!quoteSupported) {
      return profileFitStrong ? 'reply' : 'observe-only';
    }

    return profileFitStrong ? 'quote/comment' : 'observe-only';
  }

  if (positiveScore < 11) {
    return 'skip';
  }

  if (seed.platform === 'Substack Notes') {
    return route.profile.profileId === 'model-citizen' ? 'quote/comment' : 'restack/comment';
  }

  if (seed.platform === 'X') {
    return 'quote/comment';
  }

  return 'reply';
}

function createDraftReply(seed: SeedPost, route: ProfileRoute, action: RecommendedAction): string {
  if (action === 'observe-only') {
    return 'No public reply recommended. Watch for a less technical angle that exposes the human workflow underneath the tooling argument.';
  }

  if (action === 'skip') {
    return 'No public reply recommended.';
  }

  const topic = seed.topic.toLowerCase();
  const profileId = route.profile.profileId;

  if (profileId === 'verbatim') {
    return 'The scary part is not that the AI can be wrong. It is that it can be wrong in a voice that sounds billable. The useful habit is pressure-testing the conclusion before it becomes client-facing.';
  }

  if (profileId === 'model-citizen') {
    if (topic.includes('substack') || topic.includes('notes')) {
      return 'Notes rewards conversation, not another little broadcast wearing a fake mustache. The trick is catching the thread before everyone starts agreeing at each other.';
    }

    return 'The machine did the work, except for the part where a human quietly made the context usable, cleaned up the edge cases, and called it automation.';
  }

  if (topic.includes('claude') || topic.includes('codex')) {
    return 'This is where the benchmark conversation gets a little fake. The question is not which model is smarter. It is which workflow leaves less wreckage in the repo after the first confident pass.';
  }

  if (topic.includes('memory') || topic.includes('context')) {
    return 'The missing question is who owns the memory. If it lives in the chat, it dies in the chat. The repo has to carry the decisions, including the boring little tombstones that say "do not build this."';
  }

  if (topic.includes('founders')) {
    return 'The least interesting version is "AI replaces the team." The useful version is "the founder stops waiting three days to test the obvious fix." Still needs judgment, annoyingly.';
  }

  return 'The useful question is what breaks when this leaves the screenshot and hits a real workflow. That is usually where the product starts telling the truth.';
}

function confidenceFromScores(scores: ScoreSummary): PainMemoryEntry['confidence'] {
  const signalScore = scores.relevance + scores.comprehensionFit - scores.credibilityRisk;

  if (signalScore >= 7) {
    return 'high';
  }

  if (signalScore >= 4) {
    return 'medium';
  }

  return 'low';
}

function extractPainMemory(seed: SeedPost, route: ProfileRoute, scores: ScoreSummary): PainMemoryEntry {
  const evidence = sourceEvidence(seed);
  const text = seedContext(seed).toLowerCase();
  const topic = seed.topic.toLowerCase();
  const base = {
    id: `pain-${seed.id}`,
    sourcePostId: seed.id,
    platform: seed.platform,
    topic: seed.topic,
    selectedProfile: route.profile.profileId,
    audience: seed.observedAudience,
    confidence: confidenceFromScores(scores),
  };

  if (seed.technicalDepth === 'high' || seed.platform === 'Hacker News') {
    return {
      ...base,
      painPoint: 'Technical audiences distrust AI agent claims when benchmarks ignore real engineering constraints.',
      audienceLanguage: 'repo graph traversal, AST-level edit locality, context window eviction, deterministic tool sandboxing',
      objection: 'This is prompt luck dressed up as agency unless the evaluation controls for real repo behavior.',
      emotionalTrigger: 'Skepticism toward inflated agent demos and benchmark theater.',
      creativeAngle: 'Do not sell autonomy to technical audiences before proving the workflow survives real repo constraints.',
      suggestedTemplateUse: 'Technical objection memory, product risk notes, observe-only HN research.',
      notes: `Source evidence: ${evidence}`,
    };
  }

  if (route.profile.profileId === 'verbatim') {
    return {
      ...base,
      painPoint: 'AI output can sound client-ready while hiding a missing assumption.',
      audienceLanguage: 'confident paragraph, sounds right, client catches the missing assumption',
      objection: 'I already review AI work myself, but I may miss the confident wrong paragraph.',
      emotionalTrigger: 'Reputational risk in front of a client.',
      creativeAngle: 'Confidence is not correctness. Pressure-test the conclusion before it reaches the client.',
      suggestedTemplateUse: 'Verbatim consultant risk ad, client-facing deliverable hook, Debate feature proof.',
      notes: `Source evidence: ${evidence}`,
    };
  }

  if (includesAny(topic, ['memory', 'context'])) {
    return {
      ...base,
      painPoint: 'Agents lose usefulness when project memory lives in chat instead of durable repo context.',
      audienceLanguage: 'project memory, repo context, what not to build, decisions already made',
      objection: 'The model can remember enough if the prompt is good.',
      emotionalTrigger: 'Fear of confident rework and repeated context loss.',
      creativeAngle: 'Repo memory beats chat memory because it preserves decisions and constraints.',
      suggestedTemplateUse: 'Founder workflow post, build-partner rubric content, agent memory explainer.',
      notes: `Source evidence: ${evidence}`,
    };
  }

  if (includesAny(text, ['benchmark', 'claude', 'codex', 'coding agent'])) {
    return {
      ...base,
      painPoint: 'Model comparisons get noisy when they ignore workflow quality and cleanup cost.',
      audienceLanguage: 'same repo, raw coding ability, small-step discipline, benchmark',
      objection: 'The smartest model should win regardless of process.',
      emotionalTrigger: 'Frustration with fake certainty from model leaderboards.',
      creativeAngle: 'The useful benchmark is which workflow leaves less wreckage after the first pass.',
      suggestedTemplateUse: 'Arun founder post, comparison thread reply, GTM engine build log.',
      notes: `Source evidence: ${evidence}`,
    };
  }

  if (includesAny(text, ['project memory', 'repo memory', 'chat memory'])) {
    return {
      ...base,
      painPoint: 'Agents lose usefulness when project memory lives in chat instead of durable repo context.',
      audienceLanguage: 'project memory, repo context, what not to build, decisions already made',
      objection: 'The model can remember enough if the prompt is good.',
      emotionalTrigger: 'Fear of confident rework and repeated context loss.',
      creativeAngle: 'Repo memory beats chat memory because it preserves decisions and constraints.',
      suggestedTemplateUse: 'Founder workflow post, build-partner rubric content, agent memory explainer.',
      notes: `Source evidence: ${evidence}`,
    };
  }

  if (includesAny(text, ['substack', 'notes', 'distribution', 'broadcast'])) {
    return {
      ...base,
      painPoint: 'Distribution fails when founders broadcast instead of joining specific conversations early.',
      audienceLanguage: 'specific conversations, before everyone piles in, not generic threads',
      objection: 'Posting more should be enough to create reach.',
      emotionalTrigger: 'Anxiety about shouting into the feed and getting nothing back.',
      creativeAngle: 'Conversation is not broadcasting. Find the thread before it turns generic.',
      suggestedTemplateUse: 'Conversation Scout positioning, Substack Notes post, Model Citizen distribution bit.',
      notes: `Source evidence: ${evidence}`,
    };
  }

  if (includesAny(text, ['founder', 'workflow', 'replace engineers'])) {
    return {
      ...base,
      painPoint: 'Founders want AI tools to reduce delay between noticing a problem and testing a fix.',
      audienceLanguage: 'reduce the delay, testing a fix, workflow matters more than the leaderboard',
      objection: 'AI workflows are mainly about replacing people.',
      emotionalTrigger: 'Impatience with slow execution loops.',
      creativeAngle: 'The win is not replacement. It is a shorter loop from problem to tested fix.',
      suggestedTemplateUse: 'Founder workflow essay, Arun reply template, GTM engine thesis content.',
      notes: `Source evidence: ${evidence}`,
    };
  }

  return {
    ...base,
    painPoint: 'The post may contain useful audience language, but the pain point needs human review.',
    audienceLanguage: seed.topic,
    objection: 'Unclear from the seed post.',
    emotionalTrigger: 'Unclear.',
    creativeAngle: 'Hold for manual review before using in creative inputs.',
    suggestedTemplateUse: 'Manual review only.',
    notes: `Source evidence: ${evidence}`,
  };
}

function explainEngagement(seed: SeedPost, route: ProfileRoute, scores: ScoreSummary): string {
  if (scores.comprehensionFit <= 2) {
    return 'Useful to monitor, but the post is too technical for a confident public reply without a narrower founder, product, or workflow angle.';
  }

  if (route.profile.profileId === 'verbatim') {
    return 'This maps directly to the Verbatim wedge: pressure-test AI conclusions before client-facing work.';
  }

  if (route.profile.profileId === 'model-citizen') {
    return 'This can build an audience touchpoint through a dry, memorable distinction rather than a generic reply.';
  }

  return 'This is worth reviewing because it overlaps with agent workflows, repo memory, and practical founder use of AI tools.';
}

function createRiskNote(scores: ScoreSummary): string {
  if (scores.credibilityRisk >= 5) {
    return 'High credibility risk. Do not reply unless the angle is reframed away from technical claims and toward product, workflow, or human behavior.';
  }

  if (scores.credibilityRisk >= 3) {
    return 'Moderate credibility risk. Keep the reply narrow and avoid pretending to arbitrate the technical details.';
  }

  return 'Low credibility risk. Keep it short and specific.';
}

function createSkipOrObserveReason(action: RecommendedAction, seed: SeedPost, scores: ScoreSummary): string {
  if (action === 'observe-only') {
    if (seed.userIntent === 'observe' || seed.userIntent === 'research') {
      return `Observe only because userIntent is ${seed.userIntent} and the item is better used as audience signal than as a public reply.`;
    }

    return `Observe only because ${seed.platform} plus ${seed.technicalDepth} technical depth creates a low-comprehension, high-credibility-risk reply surface.`;
  }

  if (action === 'skip') {
    return `Skip because the combined relevance and reply surface is not strong enough for a useful audience touchpoint.`;
  }

  if (scores.credibilityRisk >= 4) {
    return 'Proceed only with a narrow, non-technical reply.';
  }

  return 'No skip or observe reason. Human review still required before posting.';
}

function formatScores(scores: ScoreSummary): string {
  return [
    `relevance ${scores.relevance}/5`,
    `replyPotential ${scores.replyPotential}/5`,
    `founderFit ${scores.founderFit}/5`,
    `comprehensionFit ${scores.comprehensionFit}/5`,
    `credibilityRisk ${scores.credibilityRisk}/5`,
  ].join(', ');
}

function formatReviewQueue(items: ReviewItem[], generatedAt: string): string {
  const painMemorySummary = items.map((item) => {
    return [
      `- ${item.painMemory.sourcePostId}: ${item.painMemory.painPoint}`,
      `  - Language: ${item.painMemory.audienceLanguage}`,
      `  - Creative angle: ${item.painMemory.creativeAngle}`,
      `  - Confidence: ${item.painMemory.confidence}`,
    ].join('\n');
  });

  const sections = items.map((item, index) => {
    return [
      `## ${index + 1}. ${item.seed.topic}`,
      '',
      `- Platform: ${item.seed.platform}`,
      `- Author: ${item.seed.author}, ${item.seed.authorRole}`,
      `- Source URL: ${item.seed.url}`,
      `- Source type: ${item.seed.sourceType}`,
      `- User intent: ${item.seed.userIntent}`,
      `- Collection: ${item.seed.collectionMethod} at ${item.seed.collectedAt}`,
      `- Technical depth: ${item.seed.technicalDepth}`,
      `- Selected profile: ${item.route.profile.name} (${item.route.profile.profileId})`,
      `- Why this profile fits: ${item.route.whyProfileFits}`,
      `- Scores: ${formatScores(item.scores)}`,
      `- Comprehension fit: ${item.scores.comprehensionFit}/5`,
      `- Credibility risk: ${item.scores.credibilityRisk}/5`,
      `- Recommended action: ${item.recommendedAction}`,
      '',
      `Full context:`,
      '',
      item.seed.fullContext === '' ? '_No full context provided._' : item.seed.fullContext,
      '',
      `Quoted text:`,
      '',
      item.seed.quotedText === '' ? '_No quoted text provided._' : `> ${item.seed.quotedText}`,
      '',
      `Thread context:`,
      '',
      item.seed.threadContext === '' ? '_No thread context provided._' : item.seed.threadContext,
      '',
      `Why this is worth engaging: ${item.whyWorthEngaging}`,
      '',
      `Extracted audience signal:`,
      '',
      `- Pain point: ${item.painMemory.painPoint}`,
      `- Objection: ${item.painMemory.objection}`,
      `- Emotional trigger: ${item.painMemory.emotionalTrigger}`,
      `- Creative angle: ${item.painMemory.creativeAngle}`,
      '',
      `Draft reply:`,
      '',
      `> ${item.draftReply}`,
      '',
      'Edit before posting: [ ]',
      '',
      `Risk note: ${item.riskNote}`,
      '',
      `Reason to skip or observe: ${item.skipOrObserveReason}`,
    ].join('\n');
  });

  return [
    '# Conversation Scout Review Queue',
    '',
    `Generated at: ${generatedAt}`,
    '',
    'Manual-input distribution review queue. No scraping, posting, platform calls, or external APIs were used.',
    '',
    '## Pain Memory Summary',
    '',
    ...painMemorySummary,
    '',
    ...sections,
    '',
  ].join('\n');
}

const seedPosts = readJson<SeedPost[]>(seedPostsPath);
const profiles = loadProfiles();
const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const runDir = join(repoRoot, 'output', `run-${timestamp}`);
const outputPath = join(runDir, 'conversation-scout-review.md');
const painMemoryPath = join(runDir, 'pain-point-memory.json');

const reviewItems: ReviewItem[] = seedPosts.map((seed) => {
  const route = routeProfile(seed, profiles);
  const scores = scorePost(seed, route);
  const recommendedAction = recommendAction(seed, route, scores);
  const painMemory = extractPainMemory(seed, route, scores);

  return {
    seed,
    route,
    scores,
    whyWorthEngaging: explainEngagement(seed, route, scores),
    painMemory,
    draftReply: createDraftReply(seed, route, recommendedAction),
    riskNote: createRiskNote(scores),
    recommendedAction,
    skipOrObserveReason: createSkipOrObserveReason(recommendedAction, seed, scores),
  };
});

mkdirSync(runDir, { recursive: true });
writeFileSync(outputPath, formatReviewQueue(reviewItems, generatedAt), 'utf-8');
writeFileSync(
  painMemoryPath,
  `${JSON.stringify(reviewItems.map((item) => item.painMemory), null, 2)}\n`,
  'utf-8',
);

console.log(outputPath);
console.log(painMemoryPath);
