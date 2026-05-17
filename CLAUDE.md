# growth-agents

A multi-agent marketing platform built in Claude Code with Hermes as the production runtime. First customer: Verbatim. Designed to be productized as an agency offering for other founders and agencies once Verbatim's funnel is validated.

## The thesis

The experience of building this stack IS the productizable asset. Graphed sells the same shape at $500/mo. Hermes is the runtime. We are not trying to compete with Graphed at scale; we are building enough to operate three to five products, ship our own marketing, and codify the patterns into a reusable agency offering.

Reference for the broader pattern: Cody Schneider's Claude Code Marketing Masterclass (creative-generator + agent jockey workflow) and Nick at orgo.ai's $1M Solo Agent Business playbook (Hermes agents, vertical-specific agents, $5-10K/mo offering).

## The four agents (Graphed-style)

1. **Paid Ads Agent.** Monitors spend across Meta, Google, TikTok. Flags wasted budget. Identifies winning creatives. Recommends reallocation in real time. Subskills: creative-generator, pain-point-scraper, meta-uploader, optimization-daemon, ads-performance-analyzer.
2. **SEO Agent.** Keyword research, landing-page generation, blog post drafting. Compounds organic reach.
3. **Content Strategist Agent.** Analyzes what content drives revenue, drafts briefs from real performance data, identifies funnel gaps.
4. **Outreach Agent.** Email sequences, send-time optimization, response tracking. Subskills: cold-email-funnel, podcast-outreach, linkedin-outreach.

This weekend ships Paid Ads Agent v0.1 (creative-generator + pain-point-scraper). Sequencing for the rest in ARCHITECTURE.md.

## Working style with Claude (build partner mode)

Arun works with Claude in claude.ai as the strategic build partner. Claude Code (CC) handles implementation in this repo. The pattern:

1. Arun asks Claude what to do next.
2. Claude gives step-by-step instructions and treats each step as critical to get right.
3. Arun runs CC sessions per Claude's guidance.
4. Arun pastes CC output back to Claude.
5. Claude interprets quickly and gives the next move.

Claude here has infinite patience. CC ships code. Arun drives. The goal is to be screaming fast through the obvious parts and careful through the decisive parts.

## Voice rules

- No em dashes in customer-facing copy (publications, marketing, email, social). Use periods, commas, or restructure.
- Decisive recommendations over surveys of options.
- "A.I. JUST GOT A BULLSHIT METER" is Verbatim's hold-the-edge brand voice. Match its energy in ads.
- Concrete over conceptual. Adult-to-adult tone. No hedging.

## Standing architectural decisions

- Hermes is the agent runtime (deployment target). Reference: Nick at orgo.ai.
- Composio is the tool/integration layer (one connector, many SaaS tools).
- Supabase is the data warehouse (Postgres, RLS, Auth). Same stack as Verbatim.
- Railway is the host for persistent agents (cron, long-running processes).
- Claude Code is the local-dev environment for skill authoring before Hermes deployment.
- Build vs Graphed: BUILD, because the operating know-how is the productizable asset.

## Related repos and references

- `C:\Users\Arun\ai-highlighter\` is the Verbatim repo (the first product this stack markets)
- `c:\Users\Arun\Downloads\Startup Ideas Podcast_ CC Marketing Masterclass_otter_ai_transcript.txt` is Cody Schneider's pattern
- `c:\Users\Arun\Downloads\Startup Ideas Podcast - $1M Solo Agent Business_otter_ai_transcript.txt` is Nick's pattern
- `C:\Users\Arun\.gstack\projects\ironarun-ai-highlighter\Arun-main-design-consultant-paid-test-20260516-151805.md` is the office-hours design doc for the Verbatim consultant ad test

## What this repo is NOT

- Not the place to fix Verbatim bugs (use ai-highlighter)
- Not a one-off project (this is the agency offering's foundation)
- Not a Graphed clone (we build enough for our own products, plus the patterns)
- Not a slow strategy exercise (we ship; we revisit decisions weekly)
