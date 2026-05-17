# Brief: Verbatim Consultant Paid-Acquisition Test

## Product

Verbatim. Chrome extension. Fact-check and pressure-test AI responses via multi-model debate. Live on Chrome Web Store. Site: helloverbatim.com.

Subhead voice: **"A.I. JUST GOT A BULLSHIT METER."**

Four features under one extension:
- **Library** (Highlights): preserve valuable AI outputs across long conversations
- **Debate**: pressure-test specific AI conclusions across models (this weekend's wedge)
- **Council**: parallel multi-model panel
- **Insights**: longitudinal analytics on model performance

## ICP for this test

**Independent and boutique consultants.**

Scoring on three criteria (find, pay, pain):
- Find: HIGH. Meta targets job titles cleanly. Solo or boutique = autonomy on tools.
- Pay: HIGH. Billing $150-400/hr. A $30/month tool is trivially expensable.
- Pain: HIGH and stakes-loaded. AI hallucinations in client deliverables damage their career.

Product wedge: pressure-test AI conclusions before sending to clients. Use Insights to demonstrate "verified by multiple models" as quality differentiation on deliverables.

## Meta targeting parameters

- **Job titles**: Consultant, Management Consultant, Strategy Consultant, Independent Consultant, Principal Consultant
- **Employers**: Big 4, McKinsey, BCG, Bain, plus "consulting" employer keyword (catches boutiques)
- **Interests**: Harvard Business Review, McKinsey Insights, Bain Insights, Strategy+Business, Substack business writers
- **Behaviors**: AI tool subscribers (ChatGPT Plus, Claude Pro), business software buyers

Skip lookalike audiences for Round 1 unless any existing 6-10 users are consultants.

## Hooks

**Primary (#6):** "You don't know what you're missing. Find out before it costs you."

**Secondary (#4):** "You don't always have someone to push back. AI never does."

Six hooks were considered in the office-hours session. These two won for the consultant audience because they are stakes-loaded (consultant pain = reputational/billable risk). The other four are reserved for testing against different ICPs in future rounds:

1. "AI agrees with you. That's the problem."
2. "AI says yes. Verbatim asks why."
3. "When you doubt the AI, who do you ask?"
5. "Your AI sparring partner."

## Body copy direction

Match Verbatim's "BULLSHIT METER" edge. No softening. Examples to test:

- "Your client doesn't care if the AI was confident. They care if it was right. Verbatim makes sure it is, before you ship the deliverable."
- "Run any AI answer past three other models in one click. If they agree, ship it. If they disagree, you just dodged the email you'd rather not get from your client next week."
- "Confidence is not correctness. Verbatim is the difference, in one click, without leaving the page."

The voice is direct, adult-to-adult, slightly contrarian. Avoid "leverage," "transform," "revolutionize," "AI-powered." Avoid em dashes.

## Visual treatments to test

1. **Clean editorial**: white background, single hero quote in large type, brand pink (#F12258) accent, small Verbatim wordmark
2. **Bold all-type**: huge hook text fills the frame, no imagery, high-contrast
3. **Contrarian**: red/black/white, slightly aggressive, the BULLSHIT METER framing in your face
4. **Minimal**: lots of whitespace, small mark, sub-hook in lowercase
5. **Screenshot-mock**: looks like a real product screenshot of the Debate panel surfacing a model disagreement

5 hooks × 6 treatments = 30 variants. Curate to 5 finalists by eye.

## Brand assets

- **Primary color**: `#F12258` (Verbatim pink, used throughout app/ and extension/)
- **Light pink surface**: `#FFF0F2`
- **Logo**: pull from helloverbatim.com (favicon at minimum; full logo if available)
- **Product screenshot**: capture the Debate panel showing model disagreement; use as reference image for the screenshot-mock treatment

## Budget and schedule

- **Total**: $45/day starting Monday May 18, 2026
- **Ad set 1 (primary)**: hook #6, 3 variants, $30/day
- **Ad set 2 (secondary)**: hook #4, 2 variants, $15/day
- **Week 1 burn**: $315

## Conversion events to track

1. Landing page view (Meta Pixel default `PageView`)
2. Add-to-Chrome click (custom event: `extension_install_clicked`)
3. Extension installed (custom event: `extension_installed`; requires a post-install signal)
4. Debate run (custom event: `debate_run`, fires from the extension)
5. Waitlist signup with tier (custom event: `waitlist_signup` with a `tier` string property)

## Success criteria

At least one of these MUST be met for the consultant ICP hypothesis to validate:

- 30+ ad clicks per day across both ad sets
- 5+ extension installs in week 1
- 2+ debates run per installed user on average
- 3+ paid-intent waitlist signups with tier selection (Pro $12 or Power $29)

## What this brief is NOT

- Not a launch of the paid Pro tier (Pro is shipped 30-60 days out)
- Not a brand awareness campaign
- Not a general AI-tool ad
- Not targeting "founders" or "solopreneurs" generally

This is a narrow, audience-specific, wedge-specific test using the Debate feature for the consultant ICP. Other audiences and other wedges get their own briefs in future rounds.

## Source

Compressed from the office-hours design doc at:
`C:\Users\Arun\.gstack\projects\ironarun-ai-highlighter\Arun-main-design-consultant-paid-test-20260516-151805.md`
