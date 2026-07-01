# Paid Ads First Flight Logo Treatment Plan 2026-06-30

## Purpose

This plan defines the remaining logo-treatment work required before the first-flight Verbatim paid ad assets can move toward manual Meta upload.

It is documentation only. It does not create image files, modify renderers, upload to Meta, or approve any asset for upload.

## Source Of Truth

Selected asset index:

```text
data/paid-ads/selected-assets/first-flight-selected-assets-2026-06-30.json
```

PNG assets are local artifacts and are not committed to git.

## Current Status

| Concept | Name | Selected asset path | Visual review | Text accuracy | Logo status | Upload status |
|---|---|---|---|---|---|---|
| `concept-01-confident-draft` | Confident Draft | `assets/paid-ads/selected-candidates/verbatim_meta_01_confident-draft_editorial-collage_selected-candidate-04_finalized-logo_1x1_v01.png` | approved | approved | `official_logo_overlaid` | gated |
| `concept-02-before-the-client` | Before The Client | `assets/paid-ads/selected-candidates/verbatim_meta_02_before-the-client_editorial-collage_selected-candidate-03_finalized-logo_1x1_v01.png` | approved | approved | `corrected_in_image_edit` | gated |
| `concept-04-sounds-ready` | Polished Is Not Pressure Tested | `assets/paid-ads/selected-candidates/verbatim_meta_04_polished-pressure-tested_editorial-collage_selected-candidate-02_logo-area-reserved_1x1_v01.png` | approved | approved | `pending` | gated |
| `concept-07-missing-disagreement` | Missing Disagreement | `assets/paid-ads/selected-candidates/verbatim_meta_07_missing-disagreement_editorial-collage_selected-candidate-01_logo-area-reserved_1x1_v01.png` | approved | approved | `pending` | gated |

Only Concept 01 and Concept 02 currently have completed logo treatment.

Concept 04 and Concept 07 still require final logo treatment before the first-flight asset package can be reviewed for upload.

## Warning About Prior Overlay Script

A prior local finalization overlay script produced an unacceptable logo result by placing a background behind the transparent PNG logo.

That script was not committed and should not be restored.

Do not reuse a local overlay approach unless it preserves logo transparency and does not patch behind transparent pixels.

## Recommended Options

### Option A: Image Editing

Use image editing to place the official logo cleanly, as done for Concept 02.

Use this when the generated asset needs a visually integrated footer treatment and simple compositing is likely to leave artifacts.

### Option B: Manual Design Tool

Use a design tool manually to place:

```text
brand/verbatim/logo-pink.png
```

over the reserved footer area.

Use this when the asset already has a clean logo-safe area and only needs precise placement.

### Option C: Future Overlay Utility

Rebuild an overlay utility later only if it:

- Preserves transparent pixels in the official logo asset.
- Does not place an opaque patch behind transparent logo pixels.
- Does not create visible rectangular background artifacts.
- Does not modify customer-facing copy.
- Keeps output review-gated.

This is not the recommended immediate path.

## Recommended Immediate Path

Use manual or image-edit logo treatment for Concept 04 and Concept 07.

After the corrected local assets exist:

1. Update or create review manifests for Concept 04 and Concept 07.
2. Update `data/paid-ads/selected-assets/first-flight-selected-assets-2026-06-30.json`.
3. Keep both assets gated until final package review.
4. Do not upload to Meta until Arun explicitly approves the final asset package.

## Lifecycle Gates

All four assets remain gated:

- `approved_for_upload: false`
- `uploaded_to_meta: false`
- `meta_ad_id: null`
- `human_review_required: true`

## Do Not Do Yet

- Do not commit PNG files.
- Do not commit output folders.
- Do not restore the prior overlay script.
- Do not create a new overlay script in this step.
- Do not modify the renderer.
- Do not change creative copy.
- Do not upload to Meta.
