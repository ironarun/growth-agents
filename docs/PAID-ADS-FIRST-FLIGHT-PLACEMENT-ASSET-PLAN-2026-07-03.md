# Paid Ads First Flight Placement Asset Plan 2026-07-03

## Purpose

Make the approved Verbatim first-flight paid ads placement-ready without creating new concepts.

The approved 1:1 concepts remain the source direction. New placement assets must be recomposed for each aspect ratio, not cropped from the square PNGs and not left to Meta auto-cropping.

## Source Concepts

| Concept | Name | Style | Current source asset |
|---|---|---|---|
| `concept-01-confident-draft` | Confident Draft | `editorial-collage` | `assets/paid-ads/selected-candidates/verbatim_meta_01_confident-draft_editorial-collage_selected-candidate-04_finalized-logo_1x1_v01.png` |
| `concept-02-before-the-client` | Before The Client | `editorial-collage` | `assets/paid-ads/selected-candidates/verbatim_meta_02_before-the-client_editorial-collage_selected-candidate-03_finalized-logo_1x1_v01.png` |
| `concept-04-sounds-ready` | Polished Is Not Pressure Tested | `editorial-collage` | `assets/paid-ads/selected-candidates/verbatim_meta_04_polished-pressure-tested_editorial-collage_selected-candidate-02_official-logo_1x1_v03.png` |
| `concept-07-missing-disagreement` | Missing Disagreement | `editorial-collage` | `assets/paid-ads/selected-candidates/verbatim_meta_07_missing-disagreement_editorial-collage_selected-candidate-01_official-logo_1x1_v03.png` |

## Ratios To Produce

### 1:1

- Canvas: `1080x1080`
- Use for square feed inventory.
- Preserve the approved square direction and copy.
- Still treat this as a placement asset with QA, not a loose source image.

### 4:5

- Canvas: `1080x1350`
- Optimize for mobile feed.
- Recompose the layout with more vertical breathing room.
- Use the added height for a stronger headline and cleaner review card.
- Keep the official Verbatim footer logo treatment standard.

### 9:16

- Canvas: `1080x1920`
- Purpose-built for Stories/Reels.
- Keep essential copy out of top and bottom UI collision zones.
- Use fewer visible annotations than square if needed.
- Keep headline, review card, CTA, and logo mobile-readable.

## Optional 1.91:1 Recommendation

Do not produce 1.91:1 yet.

Reason: the first placement-ready package should cover square feed, mobile feed, and Stories/Reels. A landscape asset can be added later if Meta placement requirements or early delivery data justify it.

## Copy Preservation

Do not change approved concept copy.

### Concept 01

- Headline: `The draft sounds finished. Has anyone challenged it?`
- Handwritten note: `challenge before action`
- Review heading: `BEFORE CLIENT USE, VERBATIM CHECKS:`
- Review lines: `weak claims`, `missing counterpoints`, `overconfident reasoning`

### Concept 02

- Headline: `Before the client sees it, who pushes back?`
- Handwritten note: `review before delivery`
- Review heading: `BEFORE DELIVERY, VERBATIM CHECKS:`
- Review lines: `unsupported claims`, `weak assumptions`, `client-facing risk`

### Concept 04

- Headline: `Your AI work reads polished. That's the problem.`
- Handwritten note: `Polished is not pressure tested.`
- Document annotations: `sounds finished`, `not checked`
- Review heading: `BEFORE YOU ACT, VERBATIM CHECKS:`
- Review lines: `confident claims`, `missing caveats`, `thin reasoning`

### Concept 07

- Headline: `What part of your AI workflow disagrees with you?`
- Handwritten note: `build in disagreement`
- Review heading: `VERBATIM ADDS DISAGREEMENT AROUND:`
- Review lines: `assumptions`, `recommendations`, `reasoning gaps`

## Generation Workflow

The image render brief generator now supports placement-specific briefs.

Generate all required first-flight placement briefs:

```powershell
npm.cmd run consultant:paid-ads-image-render-briefs -- --style editorial-collage --concept all-first-flight --ratios 1:1,4:5,9:16
```

Generate a single concept and ratio:

```powershell
npm.cmd run consultant:paid-ads-image-render-briefs -- --style editorial-collage --concept concept-04-sounds-ready --ratio 9:16
```

The generator writes:

- `output/run-{timestamp}/paid-ads-image-render-briefs.json`
- `output/run-{timestamp}/paid-ads-image-render-briefs.md`

## Logo Treatment

Use the official Verbatim logo treatment standard from:

```text
docs/PAID-ADS-LOGO-STANDARD-2026-07-01.md
```

For image-generation briefs, the prompt must either:

- use the official Verbatim logo asset through the production process, or
- leave a clean bottom-left footer area for official logo overlay later.

Do not ask an image model to invent or approximate the Verbatim logo.

## Quality Gates

Before an asset is accepted for manual Meta upload:

- [ ] Ratio matches the intended placement.
- [ ] Layout is recomposed, not cropped from square.
- [ ] Approved headline and supporting copy are unchanged.
- [ ] Official logo treatment is correct.
- [ ] 9:16 safe zones are checked manually.
- [ ] No fake UI, fake metrics, fake customer names, fake approval stamps, robots, or stock people.
- [ ] No truth layer language or correctness guarantees.
- [ ] No em dashes in customer-facing copy.
- [ ] `approved_for_upload` remains false until final placement package review.

## Motion Spec For Later Testing

Status: planned, not built.

Duration: 6 to 8 seconds.

Principle: use the static editorial collage as the source of truth. Motion should clarify review before action, not become the creative idea.

Allowed motion:

- Static background with a very subtle paper-layer settle or parallax.
- One annotation mark draws on or fades in.
- Review card appears with a quiet fade or short slide.
- CTA appears last with a restrained fade.

Forbidden motion:

- No stock footage.
- No aggressive animation.
- No fake UI animation.
- No auto-generated Meta video as source of truth.
- No flashing warning treatment.
- No spinning logo.
- No motion that changes approved copy.

## Current Next Step

Generate the placement render briefs, create or edit the actual 4:5 and 9:16 assets from those briefs, then run the same logo, text, and package review gates before upload.
