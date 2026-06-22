# Paid Ads First Test Packet 2026-06-21

## Status

This is a manually uploadable first Meta paid ads test packet for Verbatim.

It is not automation. It is not a Meta API workflow. It is not bulk creative generation. It is a human-reviewable packet for a small first test.

Product-side funnel verification provided for this packet:

- Meta Pixel installed.
- `PageView` fires on `helloverbatim.com`.
- `AddToChromeClick` fires from homepage CTAs.
- Meta Events Manager receives `AddToChromeClick`.
- `helloverbatim.com` domain verified.
- Verbatim Website dataset/pixel connected to the Meta ad account named `verbatim`.

## Test Objective

Validate whether Meta traffic from consultant-oriented messaging produces Add-to-Chrome click intent.

The first question is narrow:

```text
Will independent and boutique consultants click through from a consultant-specific Meta ad to install-intent on helloverbatim.com?
```

This test should not be judged as a full activation test. It does not yet prove extension install, signup, retained use, or Debate activation.

## Measurement Plan

Primary conversion signal:

```text
AddToChromeClick
```

Secondary signal:

```text
PageView
```

Interpretation rules:

- `PageView` means Meta traffic reached the landing page.
- `AddToChromeClick` means a visitor clicked a homepage Chrome install CTA.
- `AddToChromeClick` does not prove Chrome Web Store install.
- `AddToChromeClick` does not prove signup.
- `AddToChromeClick` does not prove Debate activation.
- Do not infer product-market fit from impressions, reach, or CTR alone.
- Do not infer user quality until install, signup, or Debate behavior can be reconciled.

## Campaign URL

Base landing page:

```text
https://helloverbatim.com/
```

Required UTM pattern:

```text
https://helloverbatim.com/?utm_source=meta&utm_medium=paid_social&utm_campaign=consultants-client-facing-ai-review-v1&utm_content={utm_content}&utm_term={utm_term}
```

Fixed values:

- `utm_source=meta`
- `utm_medium=paid_social`
- `utm_campaign=consultants-client-facing-ai-review-v1`

Variable values:

- `utm_content`: ad concept or creative angle
- `utm_term`: audience or message angle

Current boundary:

- UTMs are campaign URL discipline.
- UTMs are not yet persisted across Chrome Web Store install.
- UTMs are not yet persisted into Debate runs.
- UTMs are not full attribution.

## Audience Hypothesis

Primary audience:

- Independent consultants
- Boutique consultants
- AI-forward client-service professionals
- People using AI to produce client-facing work

Why this audience:

- They are findable through Meta targeting.
- They have direct reputational exposure.
- They often use AI to draft, summarize, analyze, or prepare client work.
- They may not have another person available to challenge the work before delivery.
- Their pain is not abstract AI risk. Their pain is a client seeing the weak point first.

## Positioning Guardrails

Current positioning:

```text
Adversarial review for AI.
```

Supporting frame:

```text
AI is prone to overconfidence, hollow flattery, and hallucination. Verbatim challenges AI work before users act on it.
```

Current wedge:

```text
Client-facing AI work should be challenged before action.
```

Do not use:

```text
You don't know what you're missing. Find out before it costs you.
```

Do not claim:

- Verbatim proves truth.
- Verbatim guarantees correctness.
- Verbatim replaces professional judgment.
- A click proves install or activation.

## Static Ad Concepts

## Recommended First Flight

Recommend starting with 4 concepts, not all 8.

First flight:

- Concept 1: Confident Draft
- Concept 2: Before The Client
- Concept 4: Sounds Ready
- Concept 7: Missing Disagreement

Reason:

These are the cleanest first tests of the core positioning: confident AI output, client-facing risk, confidence versus review, and missing disagreement.

Backup concepts:

- Concept 3: Output To Action
- Concept 5: One More Pair Of Eyes
- Concept 8: Polished But Unchecked

Hold for later:

- Concept 6: Client Work Standard

Reason:

The intern framing is sharper and may be polarizing. It should not be in the first flight unless Arun explicitly approves it.

### Concept 1: Confident Draft

Audience pain:

Consultants are using AI to produce polished client-facing drafts, but polish can hide weak assumptions.

Hook:

```text
The draft is confident. What checked it?
```

Primary text:

```text
AI can make client work sound finished before anyone has challenged the reasoning. Verbatim adds adversarial review before you rely on it.
```

Headline:

```text
Adversarial review for AI
```

Visual direction:

Static editorial layout. White background, oversized black hook, small Verbatim pink rule, simple Chrome extension cue. No fake dashboard metrics.

UTM content value:

```text
static-confident-draft
```

UTM term value:

```text
boutique-consultants
```

Risk note:

Do not imply Verbatim certifies correctness. Frame it as challenge before reliance.

### Concept 2: Before The Client

Audience pain:

The client-facing moment is where an AI mistake becomes reputational risk.

Hook:

```text
Before the client sees it, who pushes back?
```

Primary text:

```text
AI helps consultants move faster. Verbatim helps challenge the answer before it becomes the client version.
```

Headline:

```text
Challenge AI work before delivery
```

Visual direction:

Split text layout. Left: `AI draft`. Right: `Client deliverable`. Center line: `review before action`. Use restrained pink accent.

UTM content value:

```text
static-before-client
```

UTM term value:

```text
client-deliverable-risk
```

Risk note:

Avoid fear-only framing. The ad should respect consultants as capable professionals who need a better review step.

### Concept 3: Output To Action

Audience pain:

AI workflows often jump from generated output to business action without a clear review step.

Hook:

```text
What happens between AI output and action?
```

Primary text:

```text
Generate, summarize, draft, analyze, then act. That is the pattern. Verbatim adds the missing disagreement step.
```

Headline:

```text
Add the review step
```

Visual direction:

Simple workflow diagram in text: `Generate -> Draft -> Review -> Act`. Make `Review` the Verbatim pink step. Keep it static and readable.

UTM content value:

```text
static-output-to-action
```

UTM term value:

```text
ai-workflow-review
```

Risk note:

Do not make this look like enterprise governance software. Keep it practical and consultant-level.

### Concept 4: Sounds Ready

Audience pain:

AI output can sound ready before it has survived disagreement.

Hook:

```text
Your AI sounds ready. Is it?
```

Primary text:

```text
A confident answer is not the same thing as a reviewed answer. Verbatim pressure-tests AI work before you act on it.
```

Headline:

```text
Confidence is not review
```

Visual direction:

Bold all-type. Pink background, white hook, black footer line with Verbatim wordmark. No icons except a small Chrome cue if needed.

UTM content value:

```text
static-sounds-ready
```

UTM term value:

```text
confidence-vs-review
```

Risk note:

Avoid implying all AI output is bad. The point is that important output needs challenge.

### Concept 5: One More Pair Of Eyes

Audience pain:

Solo and boutique consultants often lack a colleague who can challenge assumptions before delivery.

Hook:

```text
No second review step? Add one.
```

Primary text:

```text
When AI helps write the work, someone still has to argue the other side. Verbatim gives you that adversarial pass in the browser.
```

Headline:

```text
Review AI work before you send it
```

Visual direction:

Minimal white layout with a small checklist: `assumption`, `claim`, `recommendation`, `risk`. One item is marked `challenged`.

UTM content value:

```text
static-second-reviewer
```

UTM term value:

```text
solo-consultants
```

Risk note:

Do not imply Verbatim replaces peer review, legal review, or expert review. It is an adversarial pass, not institutional assurance.

### Concept 6: Client Work Standard

Audience pain:

Consultants may accept a lower review standard for AI-assisted work than they would for human-generated work.

Hook:

```text
Would this pass your usual review standard?
```

Primary text:

```text
AI can draft quickly. Client work still deserves scrutiny. Verbatim challenges the answer before it leaves your workflow.
```

Headline:

```text
Hold AI work to a review standard
```

Visual direction:

Clean editorial type. White background, black hook, small pink underline under `review standard`. Avoid any image of a person.

UTM content value:

```text
static-review-standard
```

UTM term value:

```text
consultant-quality-control
```

Risk note:

This is sharper and may be polarizing. Review carefully before upload.

### Concept 7: Missing Disagreement

Audience pain:

AI tends to cooperate with the user's direction, which can make weak framing feel validated.

Hook:

```text
What part of your AI workflow disagrees with you?
```

Primary text:

```text
AI is useful because it helps you move. It is risky when nothing in the workflow pushes back. Verbatim adds adversarial review.
```

Headline:

```text
Build disagreement into AI work
```

Visual direction:

Contrarian all-type. Black background, white hook, Verbatim pink highlight on `disagrees`. No meme tone.

UTM content value:

```text
static-missing-disagreement
```

UTM term value:

```text
ai-forward-consultants
```

Risk note:

Do not overstate AI sycophancy. Keep the claim about workflow disagreement, not model psychology.

### Concept 8: Polished But Unchecked

Audience pain:

AI can make incomplete work look polished enough to pass a quick read.

Hook:

```text
Polished is not checked.
```

Primary text:

```text
The problem is not that AI writes badly. The problem is that it can write well before the reasoning has been challenged.
```

Headline:

```text
Pressure-test AI before action
```

Visual direction:

Minimal product-inspired mock. A polished paragraph with one highlighted assumption and a small note: `Needs challenge before use.`

UTM content value:

```text
static-polished-unchecked
```

UTM term value:

```text
client-facing-ai-work
```

Risk note:

If using a product mock, label it clearly as illustrative unless it is a real approved screenshot.

## Manual Meta Upload Checklist

- [ ] Ad account: `verbatim`
- [ ] Pixel/dataset: `Verbatim Website`
- [ ] Event to optimize or observe: `AddToChromeClick`
- [ ] Secondary observed event: `PageView`
- [ ] Landing page: `https://helloverbatim.com/` with required UTMs
- [ ] Campaign name: `consultants-client-facing-ai-review-v1`
- [ ] Campaign objective selected and reviewed manually
- [ ] Budget cap placeholder filled before publishing
- [ ] Placements placeholder filled before publishing
- [ ] Audience targeting reviewed manually
- [ ] Ad copy reviewed for no deprecated hooks
- [ ] Ad copy reviewed for no em dashes
- [ ] Ad copy reviewed for no truth-guarantee claims
- [ ] URL preview tested before publishing
- [ ] Pixel Helper or Events Manager test event confirmed before publishing
- [ ] Arun reviews before publishing

Budget cap placeholder:

```text
TBD by Arun before upload.
```

Placements placeholder:

```text
TBD by Arun before upload.
```

Recommended upload mode:

```text
Manual draft in Meta Ads Manager. Do not publish until checklist is complete.
```

## Stop Conditions

Stop immediately if:

- Meta Pixel is not firing.
- `AddToChromeClick` is not received in Events Manager.
- The landing URL is wrong.
- The wrong ad account is selected.
- The wrong dataset/pixel is selected.
- Any ad uses the deprecated hook.
- Any ad claims Verbatim proves truth or guarantees correctness.
- Any ad contains an em dash in customer-facing copy.
- Spend begins before human review.

## Performance Review Plan

Do not evaluate from impressions alone.

Capture:

- Spend
- Impressions
- Reach if available
- Link clicks
- Landing page views if available
- `PageView`
- `AddToChromeClick`
- CTR
- Cost per link click
- Cost per `AddToChromeClick`
- Notes on rejected ads, disapprovals, or delivery issues

Do not infer:

- Extension install
- Signup
- Waitlist intent
- Debate activation
- Paid conversion
- Consultant product-market fit

Early read rule:

```text
If traffic reaches the landing page but AddToChromeClick is weak, review message-to-page fit before generating more creative.
```

Review cadence:

- First check: after enough spend for meaningful delivery, not after a few impressions.
- First decision: continue, pause, or revise only after `AddToChromeClick` data exists.
- Next packet: should be based on observed CTR, landing page view quality, and cost per `AddToChromeClick`, not on subjective ad preference alone.

## Human Review Checklist

- [ ] Product-side funnel verification still valid at upload time.
- [ ] Domain verification still valid.
- [ ] Dataset/pixel still connected to `verbatim` ad account.
- [ ] Campaign URL opens correctly.
- [ ] UTM values approved.
- [ ] Audience approved.
- [ ] Budget cap approved.
- [ ] Placements approved.
- [ ] All ad concepts reviewed.
- [ ] Final selected concepts chosen manually.
- [ ] No automation added.
- [ ] No spend until Arun approves.

## Assumptions

- The first measurable conversion proxy is `AddToChromeClick`.
- The landing page for this test is `https://helloverbatim.com/`.
- The current product-side event name is `AddToChromeClick`, not the older `extension_install_clicked` name in the historical brief.
- Chrome Web Store install, signup, and Debate activation are not yet connected to this paid test packet.
- Static visual assets will be created or assembled manually after concept approval. This packet does not generate PNGs.
