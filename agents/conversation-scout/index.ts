/// <reference types="node" />

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Platform = 'LinkedIn' | 'Substack Notes' | 'X' | 'Reddit' | 'Hacker News';
type TechnicalDepth = 'low' | 'medium' | 'high';
type ProfileId = 'arun' | 'model-citizen' | 'verbatim' | 'unknown';
type RecommendedAction = 'reply' | 'restack/comment' | 'quote/comment' | 'observe-only' | 'skip';

interface SeedPost {
  id: string;
  platform: Platform;
  url: string;
  author: string;
  authorRole: string;
  postText: string;
  topic: string;
  technicalDepth: TechnicalDepth;
  suggestedProfile: ProfileId;
  observedAudience: string;
  whyItMightMatter: string;
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

interface ProfileRoute {
  profile: Profile;
  whyProfileFits: string;
}

interface ReviewItem {
  seed: SeedPost;
  route: ProfileRoute;
  scores: ScoreSummary;
  whyWorthEngaging: string;
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

function routeProfile(seed: SeedPost, profiles: Profile[]): ProfileRoute {
  const text = `${seed.topic} ${seed.postText} ${seed.whyItMightMatter}`.toLowerCase();
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
  const text = `${seed.topic} ${seed.postText} ${seed.whyItMightMatter}`.toLowerCase();

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

  if (scores.credibilityRisk >= 5 && scores.comprehensionFit <= 2) {
    return seed.platform === 'Hacker News' ? 'observe-only' : 'skip';
  }

  if (seed.platform === 'Hacker News' && !hnAngleFitsModelCitizen(seed, route)) {
    return 'observe-only';
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
  const sections = items.map((item, index) => {
    return [
      `## ${index + 1}. ${item.seed.topic}`,
      '',
      `- Platform: ${item.seed.platform}`,
      `- Author: ${item.seed.author}, ${item.seed.authorRole}`,
      `- URL: ${item.seed.url}`,
      `- Technical depth: ${item.seed.technicalDepth}`,
      `- Selected profile: ${item.route.profile.name} (${item.route.profile.profileId})`,
      `- Why this profile fits: ${item.route.whyProfileFits}`,
      `- Scores: ${formatScores(item.scores)}`,
      `- Comprehension fit: ${item.scores.comprehensionFit}/5`,
      `- Credibility risk: ${item.scores.credibilityRisk}/5`,
      `- Recommended action: ${item.recommendedAction}`,
      '',
      `Why this is worth engaging: ${item.whyWorthEngaging}`,
      '',
      `Draft reply:`,
      '',
      `> ${item.draftReply}`,
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

const reviewItems: ReviewItem[] = seedPosts.map((seed) => {
  const route = routeProfile(seed, profiles);
  const scores = scorePost(seed, route);
  const recommendedAction = recommendAction(seed, route, scores);

  return {
    seed,
    route,
    scores,
    whyWorthEngaging: explainEngagement(seed, route, scores),
    draftReply: createDraftReply(seed, route, recommendedAction),
    riskNote: createRiskNote(scores),
    recommendedAction,
    skipOrObserveReason: createSkipOrObserveReason(recommendedAction, seed, scores),
  };
});

mkdirSync(runDir, { recursive: true });
writeFileSync(outputPath, formatReviewQueue(reviewItems, generatedAt), 'utf-8');

console.log(outputPath);
