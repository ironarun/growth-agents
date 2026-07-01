# Paid Ads Logo Standard 2026-07-01

## Purpose

This document records the default footer logo treatment for first-flight Verbatim editorial-collage paid ads.

It standardizes logo placement only. It does not change concepts, copy, layouts, or upload status.

## Approved Reference

Use this selected Concept 02 asset as the visual reference:

```text
assets/paid-ads/selected-candidates/verbatim_meta_02_before-the-client_editorial-collage_selected-candidate-03_finalized-logo_1x1_v01.png
```

This is the approved footer logo treatment for the first-flight editorial-collage assets.

## Default Placement Rule

The logo overlay utility uses normalized placement based on a 1080x1080 canvas:

- Logo asset: `brand/verbatim/logo-pink.png`
- Logo width: `276px`
- Logo x: `41px`
- Logo top y: `997px`
- Bottom margin guard: `28px`

For non-1080 square assets, these measurements scale proportionally to the input image size.

For the current 1254x1254 selected assets, the default treatment scales to approximately:

- Logo width: `321px`
- Logo x: `48px`
- Logo top y: `1158px`

## Required Behavior

The overlay must:

- Use the official transparent PNG logo only.
- Composite the logo directly using its alpha channel.
- Add no white box, patch, plate, fill, or background behind the logo.
- Alter no pixels except where the logo's non-transparent pixels are drawn.
- Preserve ad creative and copy.
- Keep upload gated.

## Manual Overrides

The utility still supports placement overrides:

```text
--logo-x
--logo-y
--logo-width
```

Use overrides only when a future selected asset has a materially different footer composition.

## Lifecycle Gates

Overlay output remains gated:

- `approved_for_upload: false`
- `uploaded_to_meta: false`
- `meta_ad_id: null`
- `human_review_required: true`

## Do Not Do

- Do not use the prior patch-based finalization approach.
- Do not add a background behind the logo.
- Do not make the logo smaller or larger than the approved first-flight standard without explicit review.
- Do not upload to Meta from this step.
