# Paid Ads First Flight Selected Assets 2026-06-30

## Purpose

This document is the tracked source of truth for the selected Verbatim paid ads assets for the first Meta test flight.

It tracks selected assets, review status, logo status, upload gate status, and next action. It does not track final campaign performance.

## Warnings

PNG assets are local artifacts and are not committed to git.

No asset is approved for upload yet.

No asset has been uploaded to Meta.

## Campaign

Campaign:

```text
verbatim_paid_ads_first_flight
```

Selected asset index:

```text
data/paid-ads/selected-assets/first-flight-selected-assets-2026-06-30.json
```

## Selected Assets

| Concept | Name | Style | Local asset path | Visual review | Text accuracy | Logo status | Approved for upload | Uploaded to Meta | Meta ad ID | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| `concept-01-confident-draft` | Confident Draft | `editorial-collage` | `assets/paid-ads/selected-candidates/verbatim_meta_01_confident-draft_editorial-collage_selected-candidate-04_finalized-logo_1x1_v01.png` | approved | approved | official_logo_overlaid | false | false | null | Selected candidate 04. Official logo overlaid. Keep upload gated until final asset package review. |
| `concept-02-before-the-client` | Before The Client | `editorial-collage` | `assets/paid-ads/selected-candidates/verbatim_meta_02_before-the-client_editorial-collage_selected-candidate-03_finalized-logo_1x1_v01.png` | approved | approved | corrected_in_image_edit | false | false | null | Selected candidate 03. Logo corrected through image editing. Keep upload gated until final asset package review. |
| `concept-04-sounds-ready` | Polished Is Not Pressure Tested | `editorial-collage` | `assets/paid-ads/selected-candidates/verbatim_meta_04_polished-pressure-tested_editorial-collage_selected-candidate-02_logo-area-reserved_1x1_v01.png` | approved | approved | pending | false | false | null | Selected candidate 02. Logo area is reserved; final official logo treatment still pending. Keep upload gated. |
| `concept-07-missing-disagreement` | Missing Disagreement | `editorial-collage` | `assets/paid-ads/selected-candidates/verbatim_meta_07_missing-disagreement_editorial-collage_selected-candidate-01_logo-area-reserved_1x1_v01.png` | approved | approved | pending | false | false | null | Selected candidate 01. Logo area is reserved; final official logo treatment still pending. Keep upload gated. |

## Concept 04 Copy Note

Concept 04 selected asset copy:

```text
Your AI work reads polished.
That’s the problem.
Polished is not pressure tested.
```

## Review Manifest References

Concept 02 review manifest:

```text
output/run-2026-06-25T21-52-13-058Z/paid-ads-generated-asset-review.json
```

This path points to an output artifact and is not itself committed.

## Lifecycle Gates

Top-level first-flight gates:

- Approved for upload: false
- Uploaded to Meta: false
- Human review required: true

Per-asset gates:

- Approved for upload: false
- Uploaded to Meta: false
- Meta ad ID: null
- Human review required: true

## Next Actions

1. Resolve final logo treatment for Concept 04 and Concept 07.
2. Perform final package review before Meta upload.
3. Create Meta upload checklist.
4. Record Meta ad IDs only after manual upload.

## Do Not Do Yet

- Do not commit PNG files.
- Do not add `output/` files.
- Do not add ad-library capture folders.
- Do not upload to Meta.
- Do not mark any asset approved for upload.
- Do not record Meta ad IDs before manual upload happens.
