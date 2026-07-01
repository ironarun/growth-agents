# Paid Ads Logo Overlay Utility 2026-06-30

## Purpose

This utility overlays the official transparent Verbatim logo onto selected paid ad PNG assets that already have a clean logo-safe footer area.

It is intended for Concept 04 and Concept 07 first-flight assets.

## Safety Rule

Do not create a background patch behind the logo.

Do not flatten the logo onto white, ivory, pink, or any other background.

The utility composites only the transparent PNG logo over the input image using the logo alpha channel.

## Official Logo

```text
brand/verbatim/logo-pink.png
```

## Commands

Concept 04:

```powershell
npm.cmd run consultant:paid-ads-overlay-logo -- --input .\assets\paid-ads\selected-candidates\verbatim_meta_04_polished-pressure-tested_editorial-collage_selected-candidate-02_logo-area-reserved_1x1_v01.png --concept concept-04-sounds-ready --style editorial-collage --output-name verbatim_meta_04_polished-pressure-tested_editorial-collage_selected-candidate-02_official-logo_1x1_v01.png
```

Concept 07:

```powershell
npm.cmd run consultant:paid-ads-overlay-logo -- --input .\assets\paid-ads\selected-candidates\verbatim_meta_07_missing-disagreement_editorial-collage_selected-candidate-01_logo-area-reserved_1x1_v01.png --concept concept-07-missing-disagreement --style editorial-collage --output-name verbatim_meta_07_missing-disagreement_editorial-collage_selected-candidate-01_official-logo_1x1_v01.png
```

## Optional Arguments

```text
--logo
--logo-x
--logo-y
--logo-width
--output-name
```

Defaults are scaled from a 1080x1080 canvas:

- Logo width: `276px`
- Logo x: `41px`
- Logo y: `997px`, adjusted only if needed so the logo remains inside the image bounds

Coordinates scale proportionally for larger square assets.

These defaults match the approved Concept 02 footer logo treatment documented in:

```text
docs/PAID-ADS-LOGO-STANDARD-2026-07-01.md
```

## Output

Each run writes to:

```text
output/run-{timestamp}/
```

Files:

- Output PNG
- `paid-ads-logo-overlay.json`
- `paid-ads-logo-overlay.md`

## Manifest Guarantees

The manifest records:

- `logo_status: official_logo_overlaid`
- `patch_applied: false`
- `background_added: false`
- `approved_for_upload: false`
- `uploaded_to_meta: false`
- `meta_ad_id: null`
- `human_review_required: true`

## Do Not Do

- Do not commit generated PNG files.
- Do not commit output folders.
- Do not upload to Meta.
- Do not modify creative copy.
- Do not add a logo background.
- Do not restore the prior patch-based finalization script.
