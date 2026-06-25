# Paid Ads Generated Asset Review

## Purpose

This step records human review status for selected generated paid ad assets while keeping Meta upload gated.

It does not generate images. It does not call OpenAI. It does not upload to Meta. It does not modify the selected asset.

## Current Selected Asset

```text
assets/paid-ads/selected-candidates/verbatim_meta_02_before-the-client_editorial-collage_selected-candidate-03_finalized-logo_1x1_v01.png
```

For this asset, the logo was corrected through image editing rather than the local overlay script.

Source brief:

```text
output/run-2026-06-25T19-42-10-826Z/paid-ads-image-render-briefs.md
```

## Command

```powershell
npm.cmd run consultant:paid-ads-review-generated-asset -- --asset .\assets\paid-ads\selected-candidates\verbatim_meta_02_before-the-client_editorial-collage_selected-candidate-03_finalized-logo_1x1_v01.png --concept concept-02-before-the-client --style editorial-collage --visual-status approved --text-status approved --logo-status corrected_in_image_edit
```

## Manifest Fields

The review manifest records:

- `asset_id`
- `concept_id`
- `style_id`
- `asset_path`
- `source_generated_candidate_path`
- `source_brief_path`
- `finalization_manifest_path`
- `visual_review_status`
- `text_accuracy_status`
- `logo_status`
- `selected_for_iteration`
- `approved_for_upload`
- `uploaded_to_meta`
- `meta_ad_id`
- `human_review_required`
- `human_notes`

## Supported Statuses

Visual and text statuses:

- `approved`
- `pending`
- `needs_revision`
- `rejected`

Logo statuses:

- `official_logo_overlaid`
- `corrected_in_image_edit`
- `pending`
- `needs_revision`
- `rejected`

## Default Human Notes

```text
Selected Concept 02 candidate 03 for continued first-flight preparation. Visual direction approved. Text appears acceptable. Logo was corrected through image editing. Not yet approved for Meta upload.
```

## Lifecycle Gates

The review script must keep:

- `approved_for_upload: false`
- `uploaded_to_meta: false`
- `meta_ad_id: null`
- `human_review_required: true`

## Safety Rules

- Do not generate images.
- Do not call OpenAI.
- Do not upload to Meta.
- Do not commit generated PNG files.
- Do not modify the selected asset.

## Next Gate

Manual Meta upload requires a separate explicit approval step after:

- Final landing URL and UTM values are verified.
- Meta Pixel and `AddToChromeClick` are verified.
- Budget cap is reviewed.
- Arun approves the selected asset for upload.
