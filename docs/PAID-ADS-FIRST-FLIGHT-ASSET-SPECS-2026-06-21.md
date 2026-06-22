# Paid Ads First Flight Asset Specs 2026-06-21

## Purpose

This document turns the first four Verbatim paid ad concepts into static image production specs and image-generation prompts.

It does not generate PNGs. It does not build rendering code. It does not upload to Meta. It is a human-reviewable production handoff before static ad images are created.

## Source Packet

Source:

```text
docs/PAID-ADS-FIRST-TEST-PACKET-2026-06-21.md
```

First-flight concepts:

1. Confident Draft
2. Before The Client
3. Sounds Ready
4. Missing Disagreement

Current positioning:

```text
Adversarial review for AI.
```

Current measurement proxy:

```text
AddToChromeClick
```

## Recommended First Production Order

1. Confident Draft
2. Sounds Ready
3. Before The Client
4. Missing Disagreement

Reason:

- Confident Draft is the cleanest expression of the core pain.
- Sounds Ready is the simplest confidence-versus-review test.
- Before The Client adds the consultant-specific client-facing wedge.
- Missing Disagreement is the sharpest conceptual frame and should run after the cleaner concepts are approved.

## General Visual System

Use one restrained visual system across the first flight so performance is not muddied by radically different brand treatments.

Core style:

- Flat editorial layout.
- Business publication feel.
- Direct typography.
- White, black, and Verbatim pink.
- Minimal visual decoration.
- One clear idea per image.

Brand elements:

- Verbatim wordmark or text lockup.
- Primary pink: `#F12258`.
- Optional light pink surface: `#FFF0F2`.
- Optional small Chrome cue only if it stays unobtrusive.

Typography:

- Large hook text should carry the image.
- Supporting text should be short enough to read on mobile.
- Avoid tiny footnotes, faux UI labels, or dense paragraph screenshots.

Common avoid list:

- No robots.
- No glowing AI brains.
- No fake metrics.
- No fake dashboards.
- No fake client logos.
- No hallucinated logos.
- No enterprise compliance software look.
- No stock handshake imagery.
- No tiny unreadable text.
- No claims that Verbatim proves truth.
- No claims that Verbatim guarantees correctness.
- No deprecated hook.
- No em dashes in customer-facing copy.

## Aspect Ratio Guidance

Produce each concept in three static layouts:

### 1:1 Square

Use for feed placements.

- Canvas: 1080 x 1080.
- Keep main hook within central safe area.
- Leave margin around text for Meta cropping.
- Best for bold type and clean editorial layouts.

### 4:5 Feed

Use for feed placements where vertical space helps readability.

- Canvas: 1080 x 1350.
- Hook can sit upper third.
- Supporting text can sit lower third.
- Leave brand mark in footer.

### 9:16 Story And Reel Safe Layout

Use only if manually selected.

- Canvas: 1080 x 1920.
- Keep key text inside central safe zone.
- Avoid top and bottom UI collision zones.
- Use large type, fewer words, and more whitespace.

## Concept 1: Confident Draft

### Ad Copy

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

### UTM Values

```text
utm_content=static-confident-draft
utm_term=boutique-consultants
```

### Static Image Spec

Text hierarchy:

1. Main hook: `The draft is confident. What checked it?`
2. Small footer: `Verbatim`
3. Optional support line: `Adversarial review for AI`

Brand elements:

- Small Verbatim wordmark or plain `Verbatim` text in lower left.
- Thin Verbatim pink rule under the main hook.
- White or near-white background.

Background direction:

- Clean white editorial page.
- Optional subtle document shape in light gray, but no readable fake document.
- No product UI unless a real approved screenshot is available.

Required visible text:

```text
The draft is confident. What checked it?
```

Optional supporting text:

```text
Adversarial review for AI
```

Negative prompt / avoid list:

- No fake dashboard.
- No fake client report.
- No fake document text.
- No robots.
- No abstract blue AI glow.
- No legal or compliance imagery.
- No tiny text.

### Image Generation Prompt

Create a static Meta ad image in a flat editorial business publication style for a Chrome extension called Verbatim. White background, large black typographic headline reading "The draft is confident. What checked it?", a thin Verbatim pink accent line in #F12258, small "Verbatim" wordmark in the lower left, restrained layout, high contrast, mobile-readable type, sophisticated consultant audience. No people, no robots, no fake UI, no fake metrics, no fake logos, no tiny unreadable text, no enterprise compliance look.

### Production Notes

- Recommended first image to produce.
- Bake the hook into the image.
- Keep primary text and headline in Meta ad fields, not inside the image.
- Check readability at mobile thumbnail size.
- Verify that the image does not imply Verbatim certifies correctness.

## Concept 2: Before The Client

### Ad Copy

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

### UTM Values

```text
utm_content=static-before-client
utm_term=client-deliverable-risk
```

### Static Image Spec

Text hierarchy:

1. Main hook: `Before the client sees it, who pushes back?`
2. Small bridge text: `AI draft -> review -> client deliverable`
3. Small footer: `Verbatim`

Brand elements:

- Verbatim pink used only on the `review` step or center divider.
- Small wordmark at bottom.
- Black text on white background.

Background direction:

- Split editorial layout.
- Left label: `AI draft`
- Center label: `review`
- Right label: `client deliverable`
- Use text labels only, not fake document content.

Required visible text:

```text
Before the client sees it, who pushes back?
```

Optional supporting text:

```text
AI draft -> review -> client deliverable
```

Negative prompt / avoid list:

- No client logos.
- No consultant headshots.
- No handshake imagery.
- No office stock photo.
- No fear-based red warning badge.
- No fake legal document.
- No tiny process text.

### Image Generation Prompt

Create a static Meta ad image for Verbatim in a clean editorial business style. Use a white background with a restrained split layout. Large black headline reads "Before the client sees it, who pushes back?" Below it, show a simple text workflow: "AI draft -> review -> client deliverable", with the word "review" highlighted in Verbatim pink #F12258. Add a small "Verbatim" wordmark near the bottom. Professional, skeptical, adult-to-adult. No people, no office photo, no logos, no fake metrics, no fake UI, no tiny text, no compliance-software look.

### Production Notes

- Bake the hook into the image.
- Optional workflow line can be baked in if readable.
- Keep primary text and headline in Meta ad fields.
- Review the tone to ensure it respects consultants and does not imply incompetence.
- Avoid making the ad feel like a scare tactic.

## Concept 4: Sounds Ready

### Ad Copy

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

### UTM Values

```text
utm_content=static-sounds-ready
utm_term=confidence-vs-review
```

### Static Image Spec

Text hierarchy:

1. Main hook: `Your AI sounds ready. Is it?`
2. Secondary line: `Confidence is not review`
3. Footer: `Verbatim`

Brand elements:

- Full Verbatim pink background or black background with pink accent.
- White hook text.
- Small black or white wordmark depending on background.

Background direction:

- Bold all-type.
- No imagery required.
- Use high contrast and generous margins.

Required visible text:

```text
Your AI sounds ready. Is it?
```

Optional supporting text:

```text
Confidence is not review
```

Negative prompt / avoid list:

- No warning triangle.
- No robot face.
- No skull or alarmist imagery.
- No fake chat bubbles.
- No decorative tech grid.
- No tiny text.

### Image Generation Prompt

Create a bold static Meta ad image for Verbatim using a flat all-type editorial layout. Verbatim pink #F12258 background, large white headline reading "Your AI sounds ready. Is it?", smaller black or white supporting line reading "Confidence is not review", small "Verbatim" wordmark near the bottom. High contrast, clean typography, mobile-readable, skeptical but not alarmist. No robots, no fake UI, no fake metrics, no warning icon, no tiny unreadable text, no enterprise compliance design.

### Production Notes

- Produce after Confident Draft.
- Bake both the hook and the short supporting line into the image if legible.
- Keep primary text in Meta ad field.
- This is the clearest test of the confidence-versus-review idea.
- Ensure the design does not imply all AI output is untrustworthy.

## Concept 7: Missing Disagreement

### Ad Copy

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

### UTM Values

```text
utm_content=static-missing-disagreement
utm_term=ai-forward-consultants
```

### Static Image Spec

Text hierarchy:

1. Main hook: `What part of your AI workflow disagrees with you?`
2. Optional support line: `Build disagreement into AI work`
3. Footer: `Verbatim`

Brand elements:

- Black background or white background with aggressive pink highlight.
- Highlight `disagrees` or `disagreement` in Verbatim pink.
- Small wordmark, no extra icons.

Background direction:

- Contrarian editorial type.
- Use lots of negative space.
- Make the question feel sharp, not comedic.

Required visible text:

```text
What part of your AI workflow disagrees with you?
```

Optional supporting text:

```text
Build disagreement into AI work
```

Negative prompt / avoid list:

- No meme style.
- No argument bubbles.
- No angry faces.
- No robots debating.
- No fake model names.
- No fake model ratings.
- No tiny text.

### Image Generation Prompt

Create a static Meta ad image for Verbatim in a sharp editorial style. Black background with large white headline reading "What part of your AI workflow disagrees with you?", with the word "disagrees" highlighted in Verbatim pink #F12258. Small "Verbatim" wordmark near the bottom. Minimal, skeptical, adult-to-adult, business publication feel. No people, no robots, no chat bubbles, no fake model names, no fake metrics, no meme tone, no tiny unreadable text.

### Production Notes

- Produce after the cleaner first two assets are approved.
- Bake the hook into the image.
- Optional support line may be too much for 1:1 and 9:16, so test without it first.
- This is sharper than the other concepts. Review carefully for tone.
- Do not overstate AI sycophancy or imply the model has intentions.

## File Naming Convention

Use stable lowercase filenames.

Pattern:

```text
verbatim_meta_{concept-number}_{utm-content}_{ratio}_v01.png
```

Examples:

```text
verbatim_meta_01_static-confident-draft_1x1_v01.png
verbatim_meta_01_static-confident-draft_4x5_v01.png
verbatim_meta_01_static-confident-draft_9x16_v01.png
verbatim_meta_04_static-sounds-ready_1x1_v01.png
```

If edited after review:

```text
verbatim_meta_01_static-confident-draft_1x1_v02.png
```

## Manual QA Checklist

Before upload:

- [ ] Correct concept name.
- [ ] Correct hook.
- [ ] Correct headline in Meta copy.
- [ ] Correct primary text in Meta copy.
- [ ] Correct `utm_content`.
- [ ] Correct `utm_term`.
- [ ] Landing URL opens.
- [ ] Image has no em dash in customer-facing copy.
- [ ] Image has no rejected hook.
- [ ] Image does not claim Verbatim proves truth.
- [ ] Image does not claim Verbatim guarantees correctness.
- [ ] Image does not look like enterprise compliance software.
- [ ] Image has no fake UI claim.
- [ ] Image has no fake metric.
- [ ] Image has no fake logo.
- [ ] Text is readable on mobile.
- [ ] Safe zones checked for 9:16.
- [ ] `AddToChromeClick` is still verified before spend.
- [ ] Arun approves before publishing.

## Out Of Scope

- PNG rendering.
- Image generation execution.
- Meta API upload.
- Bulk ad creation.
- Automated optimization.
- Supabase schema changes.
- Chrome Web Store install attribution.
- Debate activation attribution.

This document is the final review step before manually producing the first static image assets.
