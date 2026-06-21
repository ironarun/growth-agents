import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

type Severity = 'blocker' | 'important' | 'nice-to-have';
type VerificationGroup =
  | 'growth-agents'
  | 'ai-highlighter'
  | 'meta'
  | 'browser';

type VerificationItem = {
  title: string;
  group: VerificationGroup;
  whereToCheck: string;
  evidenceToCapture: string;
  ownerManualAction: string;
  severity: Severity;
  notes: string;
};

const repoRoot = process.cwd();

const verificationItems: VerificationItem[] = [
  {
    title: 'Meta Pixel presence',
    group: 'ai-highlighter',
    whereToCheck: 'C:\\Users\\Arun\\ai-highlighter source code. Search app and site code for Meta Pixel setup and the expected Pixel ID.',
    evidenceToCapture: 'File path, code snippet location, Pixel ID, and whether it is deployed to the live site.',
    ownerManualAction: 'Arun verifies in ai-highlighter. Do not inspect from this growth-agents script.',
    severity: 'blocker',
    notes: 'Unknown from growth-agents. Required before paid traffic.',
  },
  {
    title: 'Meta Pixel firing on helloverbatim.com',
    group: 'browser',
    whereToCheck: 'Chrome with Meta Pixel Helper on https://helloverbatim.com and Meta Events Manager live event view.',
    evidenceToCapture: 'Pixel Helper screenshot or note showing PageView firing, plus Events Manager live event confirmation.',
    ownerManualAction: 'Open the live site in browser and confirm the Pixel fires.',
    severity: 'blocker',
    notes: 'Code presence is not enough. Live firing must be verified.',
  },
  {
    title: 'Meta domain verification',
    group: 'meta',
    whereToCheck: 'Meta Business settings for helloverbatim.com domain verification.',
    evidenceToCapture: 'Meta Business screenshot or note showing verified domain status.',
    ownerManualAction: 'Check Meta Business manually.',
    severity: 'blocker',
    notes: 'Unknown from growth-agents.',
  },
  {
    title: 'Waitlist capture exists',
    group: 'ai-highlighter',
    whereToCheck: 'Live Verbatim landing page and ai-highlighter page/component code.',
    evidenceToCapture: 'Landing page URL, UI screenshot, component path, and route path if applicable.',
    ownerManualAction: 'Confirm the current landing page has the intended waitlist or signup capture.',
    severity: 'blocker',
    notes: 'Required if paid traffic is expected to measure intent before install or purchase.',
  },
  {
    title: 'Waitlist captures email',
    group: 'browser',
    whereToCheck: 'Live waitlist form on helloverbatim.com.',
    evidenceToCapture: 'Successful test submission and resulting stored email field.',
    ownerManualAction: 'Submit a test email and verify it is accepted.',
    severity: 'blocker',
    notes: 'Do not use real user data for testing.',
  },
  {
    title: 'Waitlist captures tier',
    group: 'browser',
    whereToCheck: 'Live waitlist form and Supabase row for the test submission.',
    evidenceToCapture: 'Tier value captured in the database or equivalent analytics event.',
    ownerManualAction: 'Submit a test with tier selection and verify the tier is stored.',
    severity: 'blocker',
    notes: 'Paid-intent signal depends on tier capture.',
  },
  {
    title: 'Waitlist writes to Supabase',
    group: 'ai-highlighter',
    whereToCheck: 'ai-highlighter Supabase project and waitlist table or current equivalent.',
    evidenceToCapture: 'Table name, row ID or timestamp for a test row, email redacted, and tier value.',
    ownerManualAction: 'Verify the test submission writes to Supabase.',
    severity: 'blocker',
    notes: 'This belongs to the product repo and product Supabase project, not the growth-agents warehouse.',
  },
  {
    title: 'Add-to-Chrome click tracking',
    group: 'ai-highlighter',
    whereToCheck: 'ai-highlighter landing page code, analytics event wiring, browser devtools, and Meta Events Manager if Pixel event is used.',
    evidenceToCapture: 'Event name, trigger path, and test event confirmation.',
    ownerManualAction: 'Click the Add-to-Chrome CTA and confirm tracking fires.',
    severity: 'blocker',
    notes: 'Recommended event name from older brief: extension_install_clicked.',
  },
  {
    title: 'Extension install signal',
    group: 'ai-highlighter',
    whereToCheck: 'Chrome Web Store flow, extension post-install behavior, product analytics, or manual reconciliation plan.',
    evidenceToCapture: 'Defined install signal, event name if automated, or manual reconciliation method.',
    ownerManualAction: 'Verify whether installs are measurable. If not, define a manual install count process before spend.',
    severity: 'blocker',
    notes: 'Install signal may require extension or Chrome Web Store instrumentation.',
  },
  {
    title: 'Debate run tracking',
    group: 'ai-highlighter',
    whereToCheck: 'Extension/app analytics, Supabase product tables, event logs, or manual inspection path.',
    evidenceToCapture: 'Event name, table name, query, screenshot, or manual inspection instructions.',
    ownerManualAction: 'Run a Debate test and verify that usage can be measured or inspected.',
    severity: 'blocker',
    notes: 'Paid acquisition should eventually measure whether users reach the Debate behavior.',
  },
  {
    title: 'Landing page URL plan',
    group: 'growth-agents',
    whereToCheck: 'briefs/verbatim-consultant-test.md and current funnel plan.',
    evidenceToCapture: 'Final landing URL approved for the consultant test.',
    ownerManualAction: 'Confirm whether the campaign sends traffic to home page, benchmark page, Chrome Web Store, or a dedicated landing page.',
    severity: 'blocker',
    notes: 'Current docs point to helloverbatim.com, but final URL should be explicitly approved.',
  },
  {
    title: 'Campaign URL / UTM plan',
    group: 'growth-agents',
    whereToCheck: 'Campaign planning docs and final Meta upload notes.',
    evidenceToCapture: 'UTM source, medium, campaign, content naming scheme, and final sample URL.',
    ownerManualAction: 'Choose naming before upload so performance can be interpreted later.',
    severity: 'important',
    notes: 'Do not rely on memory when reading performance later.',
  },
  {
    title: 'Manual Meta upload readiness',
    group: 'meta',
    whereToCheck: 'Meta Ads Manager access, ad account, payment method, campaign objective, audience, placements, and draft workflow.',
    evidenceToCapture: 'Ad account ID, campaign objective, budget cap, audience notes, and confirmation that ads can be saved as drafts.',
    ownerManualAction: 'Confirm Meta Ads Manager is ready for manual upload. Do not build API upload.',
    severity: 'important',
    notes: 'Manual upload is intentional for Phase 1.',
  },
  {
    title: 'Ad creative manifest readiness',
    group: 'growth-agents',
    whereToCheck: 'agents/paid-ads/skills/creative-generator/index.ts and latest manifest output if generated.',
    evidenceToCapture: 'Manifest path, variant count, template IDs, and note that deprecated hooks are not present.',
    ownerManualAction: 'Do not generate new variants until funnel blockers are green and brief inputs are cleaned.',
    severity: 'important',
    notes: 'Manifest support exists. PNG rendering does not exist yet.',
  },
  {
    title: 'Paid performance logging path',
    group: 'growth-agents',
    whereToCheck: 'Current scripts and planned paid ads workflow.',
    evidenceToCapture: 'Chosen path for first performance log: manual Meta export, markdown log, or later Supabase ingestion.',
    ownerManualAction: 'Choose the minimal first performance logging method before launch.',
    severity: 'important',
    notes: 'Content performance logging exists. Paid ad performance logging is not built.',
  },
  {
    title: 'Next-test recommendation path',
    group: 'growth-agents',
    whereToCheck: 'Planned paid ad review workflow after first performance data.',
    evidenceToCapture: 'Definition of what data is required before recommending pause, iterate, or next creative test.',
    ownerManualAction: 'Define a conservative first review threshold. Do not automate optimization.',
    severity: 'nice-to-have',
    notes: 'Needed after first spend, but not before readiness verification.',
  },
];

function itemStatus(item: VerificationItem): string {
  if (item.group === 'growth-agents' && item.title === 'Ad creative manifest readiness') {
    return 'partial';
  }

  return 'unknown';
}

function checkboxLine(label: string): string {
  return `- [ ] ${label}`;
}

function formatItem(item: VerificationItem, index: number): string[] {
  return [
    `### ${index + 1}. ${item.title}`,
    '',
    `Status: ${itemStatus(item)}`,
    '',
    checkboxLine('Verified'),
    '',
    `Blocking severity: ${item.severity}`,
    '',
    `Where to check: ${item.whereToCheck}`,
    '',
    `Evidence to capture: ${item.evidenceToCapture}`,
    '',
    `Owner/manual action: ${item.ownerManualAction}`,
    '',
    `Notes: ${item.notes}`,
    '',
  ];
}

function groupItems(group: VerificationGroup): VerificationItem[] {
  return verificationItems.filter((item) => item.group === group);
}

function formatGroupSection(title: string, group: VerificationGroup): string[] {
  const items = groupItems(group);

  return [
    `## ${title}`,
    '',
    ...items.flatMap((item, index) => formatItem(item, index)),
  ];
}

function blockerList(): VerificationItem[] {
  return verificationItems.filter((item) => item.severity === 'blocker');
}

function formatMarkdown(generatedAt: string): string {
  return [
    '# Paid Ads Funnel Readiness Checklist',
    '',
    `Generated at: ${generatedAt}`,
    '',
    '## Purpose',
    '',
    'Confirm whether Verbatim can measure paid traffic before any new ad generation or Meta spend.',
    '',
    'This checklist does not inspect ai-highlighter, call Meta, call Supabase, generate ads, or build tracking. It is a human-reviewable verification artifact.',
    '',
    'Current default decision: not ready. All product and Meta instrumentation starts as unknown until Arun verifies it.',
    '',
    '## Required Verification Sections',
    '',
    ...verificationItems.map((item) => `- ${item.title}`),
    '',
    ...formatGroupSection('Can Verify From growth-agents', 'growth-agents'),
    ...formatGroupSection('Must Verify In ai-highlighter', 'ai-highlighter'),
    ...formatGroupSection('Must Verify In Meta Business / Events Manager', 'meta'),
    ...formatGroupSection('Must Verify Manually In Browser', 'browser'),
    '## Do Not Proceed Until These Are Green',
    '',
    ...blockerList().map((item) => checkboxLine(`${item.title} (${item.group})`)),
    '',
    'If any blocker remains unchecked, do not generate ad variants, do not upload to Meta, and do not spend.',
    '',
    '## Stop / Go Decision',
    '',
    '- Ready for paid traffic: no',
    '- Ready for creative generation: no',
    '- Ready for Meta upload: no',
    '- Ready for spend: no',
    '',
    'Reason: funnel measurement is not verified from growth-agents. Product and Meta checks must be completed first.',
    '',
    '## Do Not Build Yet',
    '',
    '- No Meta API uploader.',
    '- No autonomous optimization.',
    '- No bulk creative generation.',
    '- No spend recommendation.',
    '- No warehouse expansion.',
    '- No fake metrics.',
    '',
    '## Human Approval',
    '',
    '- [ ] All blocker checks verified',
    '- [ ] Evidence captured for each blocker',
    '- [ ] ai-highlighter checks completed separately',
    '- [ ] Meta Business and Events Manager checks completed manually',
    '- [ ] Browser verification completed manually',
    '- [ ] Arun approves moving to ad creative generation',
    '',
  ].join('\n');
}

const generatedAt = new Date().toISOString();
const timestamp = generatedAt.replace(/[:.]/g, '-');
const outputDir = join(repoRoot, 'output', `run-${timestamp}`);
const outputPath = join(outputDir, 'paid-ads-funnel-readiness-checklist.md');

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, formatMarkdown(generatedAt), 'utf-8');

console.log(`paid_ads_funnel_readiness_checklist_path: ${outputPath}`);
console.log(`blockers_identified: ${blockerList().length}`);
console.log('ready_for_paid_traffic: no');
console.log('ready_for_creative_generation: no');
console.log('ready_for_meta_upload: no');
console.log('ready_for_spend: no');
