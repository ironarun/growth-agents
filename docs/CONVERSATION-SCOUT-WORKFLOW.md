# Conversation Scout Workflow

Conversation Scout is the front-end distribution and listening layer of the `growth-agents` GTM engine.

It is not a generic comment generator. The goal is to find useful conversations across platforms, route each opportunity to the right profile voice, produce a human-reviewable reply queue, and feed what we learn back into creative generation and GTM planning.

Verbatim is the first product pushed through this engine. The engine is the asset.

## What It Is

Conversation Scout helps with:

- Cross-platform conversation discovery from manual or future ingested sources.
- Profile routing across Arun, The Model Citizen, Verbatim, and future client/product profiles.
- Credibility and comprehension checks before drafting public replies.
- Human-reviewable reply queues, currently written as markdown.
- Pain point extraction from posts, replies, objections, and recurring audience language.
- Creative and research feedback loops for paid ads, organic posts, and template candidates.

The useful output is not just a reply. The useful output is a structured judgment:

- Is this conversation worth joining?
- Which profile should join it?
- Can that profile credibly engage?
- What audience pain or language should be remembered?
- Should this shape a future creative test?

## What It Is Not

Conversation Scout is not:

- An auto-posting tool.
- A LinkedIn engagement bot.
- A fake expertise machine.
- A scraper that blindly collects everything.
- A tool for making Arun comment on highly technical threads he cannot credibly engage with.
- A substitute for human review.
- A growth-hack loop that optimizes for replies while damaging trust.

If the right action is to observe, the system should say observe. If the right action is to skip, it should say skip.

## Profiles

Profiles are the voice, risk, and platform layer. The same conversation may be useful, but not for every profile.

Each profile should define:

- Voice.
- Audience.
- Platform fit.
- Topics.
- Avoid rules.
- CTA rules.
- Risk tolerance.

### Arun

Arun is the founder/operator voice.

Best fit:

- Founder workflow conversations.
- AI coding agents.
- Claude Code vs Codex.
- Repo memory and agent context.
- GTM engineering.
- Practical product-building loops.

Voice:

- Intellectual.
- Sharp.
- Dry.
- Founder-to-founder.
- Skeptical but useful.

Avoid:

- Guru voice.
- Model fanboy framing.
- Generic AI hype.
- Commenting beyond credible comprehension.

CTA posture:

- Ask one useful question.
- Invite a serious reply.
- Do not pitch.

### The Model Citizen

The Model Citizen is the dry satirical news desk about AI, tech, and the strange business of being human.

Best fit:

- AI culture.
- Platform behavior.
- Distribution absurdities.
- Agent hype.
- Substack Notes and X commentary.

Voice:

- Dry.
- Observant.
- Newsroom-like.
- Slightly dark.
- Funny because it is true.

Avoid:

- Goofy meme-page tone.
- Lazy dunking.
- Generic snark.
- Forced jokes.

CTA posture:

- Usually no direct CTA.
- The observation itself should invite response.

### Verbatim

Verbatim is the product voice.

Best fit:

- Consultants using AI.
- Client-facing AI work.
- Hallucination risk.
- Model disagreement.
- Pressure-testing AI conclusions.

Voice:

- Direct.
- Skeptical.
- Adult-to-adult.
- Useful before clever.

Avoid:

- Generic SaaS language.
- Hard selling.
- Fearmongering.
- Claims that imply guaranteed correctness.

CTA posture:

- Prefer a useful distinction over a link.
- Mention Verbatim only when the conversation directly maps to pressure-testing AI work.

### Future Profiles

Future product or client profiles should follow the same structure:

- Who is speaking?
- Where can they credibly speak?
- What topics belong to them?
- What should they never sound like?
- What level of risk can the profile carry?

## Scoring Dimensions

Conversation Scout should score each opportunity across these dimensions:

- `relevance`: How closely the post maps to current GTM themes, products, or strategic learning goals.
- `replyPotential`: Whether a reply can add a useful distinction, question, or observation.
- `founderFit`: Whether the conversation maps to founder/operator concerns rather than abstract commentary.
- `comprehensionFit`: Whether the selected profile can credibly understand and engage the substance.
- `credibilityRisk`: The risk of sounding uninformed, opportunistic, too promotional, or out of depth.
- `platformFit`: Whether the platform rewards this kind of participation from this profile.
- `profileFit`: Whether the selected profile has the right voice, topic authority, and audience match.

High relevance does not automatically mean reply. A high-technical-depth Hacker News thread may be valuable to observe but wrong to join.

## Platform Strategy

### LinkedIn

Use LinkedIn for founder, workflow, product, and business-operator conversations.

Good fit:

- Arun on AI workflows and build loops.
- Verbatim on consultants, client-facing work, and AI reliability.

Bad fit:

- Generic thought-leader replies.
- Engagement bait.
- Over-polished advice threads.

### X

Use X for fast-moving distribution, tech culture commentary, and sharp observations.

Good fit:

- The Model Citizen.
- Arun when the point is short and operational.
- Verbatim when the pain is explicit and the reply can be useful without selling.

### Substack Notes

Use Substack Notes as conversation-first distribution, not broadcast-first distribution.

Good fit:

- Joining specific threads early.
- Adding one memorable distinction.
- Testing which topics create response from serious readers.

Bad fit:

- Spraying generic takes.
- Turning every Note into a promo.

### Hacker News

Use Hacker News selectively.

Good fit:

- Testing founder essays.
- The Model Citizen when the angle is tech culture or human absurdity.
- Observing technical objections that should shape product or content.

Bad fit:

- Daily engagement in deep developer threads.
- Arun making claims outside credible technical depth.
- Product promotion.

### Reddit

Use Reddit later for pain-point listening and community-specific research.

Good fit:

- Reading objections.
- Understanding language patterns.
- Finding recurring problems.

Bad fit:

- Drive-by posting.
- Thinly veiled promotion.
- Ignoring subreddit norms.

## Engine Loop

The Conversation Scout loop:

```text
conversation discovery
-> profile-routed review queue
-> human-approved replies/posts
-> audience touchpoints
-> pain point memory
-> creative research inputs
-> template candidates
-> organic/paid tests
-> performance feedback
-> next action recommendation
```

The point is not to win one comment thread. The point is to build memory about what people care about, what language they use, what objections repeat, and which profiles can credibly enter which conversations.

That memory should feed:

- Creative briefs.
- Paid ad hooks.
- Organic post topics.
- Landing page copy.
- Product positioning.
- Future conversation targeting.

## Current V0 Boundary

Current version:

```text
manual seed posts
-> scored opportunities
-> profile-routed draft replies
-> markdown review queue
```

Current output:

- `output/run-{timestamp}/conversation-scout-review.md`

Current constraints:

- No scraping.
- No posting.
- No platform APIs.
- No scheduler.
- No CRM.
- No analytics warehouse.
- No auto-DMs.
- No auto-comments.

This boundary is intentional. The system should first prove that it can make good routing and judgment calls from manual inputs.

## Next Implementation Steps

Likely next steps:

1. Clean profile schema and make it reusable across agents.
2. Make the seed input path configurable.
3. Add pain point extraction fields to review items.
4. Add platform-specific review queues.
5. Add source links from real manually collected posts.
6. Add explicit `platformFit` and `profileFit` scoring.
7. Add structured memory output for recurring objections and audience language.
8. Later, add ingestion from X, LinkedIn, and Substack.

Do not add scraping or posting until the manual review loop is consistently useful.
