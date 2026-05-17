# WEEKEND-PLAN

Saturday May 16 (4:30pm onward) through Monday May 18, 2026.

The weekend ships Paid Ads Agent v0.1: foundation + creative-generator + minimal pain-point-scraper, plus the Verbatim funnel verification that makes the Monday launch measurable.

---

## Saturday (today, 4:30pm onward)

**Goal by tonight:** repo foundation + Verbatim funnel verified + first generated ad variant rendered.

### 4:30-6:00pm — Repo setup

Run SETUP.md Steps 0-4. By 6pm you should have:

- `growth-agents` repo with .gitignore committed
- `package.json` with `"type": "module"`, dependencies installed
- `.env` filled with the keys you have today
- Folder structure verified (agents/, lib/, briefs/, output/)

### 6:00-8:00pm — Verbatim funnel verification

This is the critical path. Skip and the Monday ads are blind.

Run SETUP.md Steps 5-6:

1. **Meta Pixel verified live** on helloverbatim.com via Pixel Helper + Events Manager
2. **Waitlist email capture deployed** with `email` and `tier` capture, writing to Supabase

If you have to hand the waitlist capture work to a separate CC session in the ai-highlighter repo, do it now. While that's running, continue to Step 7 in this repo.

### 8:00-10:00pm — First creative-generator variant

Run SETUP.md Steps 7-8:

1. Stub `agents/paid-ads/skills/creative-generator/index.ts`
2. Open a CC session in growth-agents
3. Paste the handoff brief from SETUP.md Step 8
4. CC builds the React + html2canvas rendering pipeline
5. Generate ONE test variant from the Verbatim consultant brief
6. Screenshot the output and paste to Claude in claude.ai for interpretation

If the test variant looks right, you have permission to sleep.

---

## Sunday

**Goal:** 30 ad variants generated, 5 finalists curated, all uploaded to Meta as drafts, audience configured.

### 8:00-10:00am — Bulk generation

In CC, ask it to generate 30 variants using briefs/verbatim-consultant-test.md:

- Hook #6 (primary): "You don't know what you're missing. Find out before it costs you." — 20 variants
- Hook #4 (secondary): "You don't always have someone to push back. AI never does." — 10 variants
- 5 visual treatments per hook (clean editorial, bold all-type, contrarian, minimal, screenshot-mock)

CC writes the PNGs to `output/run-{timestamp}/`.

### 10:00-11:00am — Curate to 5 finalists

Review the 30 PNGs. Pick:
- 3 from hook #6
- 2 from hook #4

Decision criteria: stops scroll, voice matches Verbatim's "BULLSHIT METER" edge, hook is legible at thumbnail size.

### 11:00am-1:00pm — Meta upload + targeting

In Meta Ads Manager (manual upload, the auto-uploader is Round 2):

1. Create new campaign: objective "Traffic" or "Leads"
2. Create Ad Set 1: $30/day, 3 ads (hook #6 variants)
3. Create Ad Set 2: $15/day, 2 ads (hook #4 variants)
4. Configure audience per briefs/verbatim-consultant-test.md (consultant job titles, employer keywords, AI tool behaviors)
5. Set landing URL to helloverbatim.com
6. Set conversion event to extension_install + waitlist_signup

### 1:00-3:00pm — Final QA

- Pixel firing on the landing page (Pixel Helper green check)
- Waitlist submit writes to Supabase (test submission)
- Ad URLs all resolve to helloverbatim.com
- Conversion events tracked in Events Manager
- Budget caps confirmed ($30 + $15 = $45/day)
- Ads in "draft" status, scheduled to start Monday morning

### Rest of Sunday

Sleep. Tomorrow you push live.

---

## Monday morning

1. Move ads from Draft to Active in Meta Ads Manager
2. Watch first 2 hours: impressions starting, no obvious targeting errors, no policy rejections
3. Document the baseline: starting CPM, audience size, ad delivery status
4. Open Claude in claude.ai for first interpretation: what's the early signal saying?

Set Meta UI to "Ads Delivery" view. Check at noon, then end of day.

---

## Success criteria (week 1)

At least one of these MUST be met for the consultant ICP hypothesis to validate:

- 30+ ad clicks per day across both ad sets
- 5+ extension installs in week 1
- 2+ debates run per installed user, on average
- 3+ paid-intent waitlist signups with tier selection (Pro or Power)

If zero are met after 4 days of running, pause the consultant audience and test a different ICP (next candidates from the office-hours doc: independent researchers, vibe-coder founders).

---

## What we are NOT building this weekend

- Meta Marketing API auto-uploader (Round 2)
- Optimization daemon for auto-pausing losers (Round 2)
- Funnel analytics dashboard (Round 2)
- The other three agents: Outreach, SEO, Content Strategist
- Hermes deployment (Round 2+; weekend runs the skill locally via CC)
- The data warehouse schema beyond `waitlist` (Round 2)

This weekend is foundation + first agent's first subskill + Verbatim funnel verification. Discipline matters more than ambition.

---

## If anything goes wrong

Paste the error and the step number to Claude in claude.ai. Don't loop on the same issue more than 15 minutes without checking in. The build partnership exists to keep you unblocked.
