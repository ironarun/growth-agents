# Paid Ads First Flight Meta Upload Packet 2026-07-01

## Purpose

This is a human-reviewable manual upload packet for the four selected Verbatim first-flight Meta ads.

It is not a Meta API uploader. It does not approve launch. It keeps the selected concepts, local asset paths, copy, CTA, logo status, and lifecycle gates in one tracked place before Arun manually works in Meta Ads Manager.

## Warnings

PNG assets are local artifacts and are not committed to git.

No output files are part of this packet.

No ad is approved for upload yet.

No ad has been uploaded to Meta.

## Source Files

- Selected asset index: `data/paid-ads/selected-assets/first-flight-selected-assets-2026-06-30.json`
- Selected asset doc: `docs/PAID-ADS-FIRST-FLIGHT-SELECTED-ASSETS-2026-06-30.md`
- Logo standard: `docs/PAID-ADS-LOGO-STANDARD-2026-07-01.md`
- Consultant test brief: `briefs/verbatim-consultant-test.md`
- Upload packet JSON: `data/paid-ads/meta-upload-packets/first-flight-meta-upload-packet-2026-07-01.json`

## Campaign Settings

- Campaign: `verbatim_paid_ads_first_flight`
- Landing URL: `https://helloverbatim.com`
- CTA: `Try Verbatim`
- Manual upload required: true
- Human review required: true
- Approved for upload: false
- Uploaded to Meta: false

## Selected Ads

| Concept | Label | Asset path | Visual style | Main on-image copy | Supporting copy | CTA | Logo status | Approved for upload | Uploaded to Meta | Meta campaign ID | Meta ad set ID | Meta ad ID |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `concept-01-confident-draft` | Confident Draft | `assets/paid-ads/selected-candidates/verbatim_meta_01_confident-draft_editorial-collage_selected-candidate-04_finalized-logo_1x1_v01.png` | `editorial-collage` | The draft sounds finished. Has anyone challenged it? | challenge before action | Try Verbatim | `official_logo_overlaid` | false | false | null | null | null |
| `concept-02-before-the-client` | Before The Client | `assets/paid-ads/selected-candidates/verbatim_meta_02_before-the-client_editorial-collage_selected-candidate-03_finalized-logo_1x1_v01.png` | `editorial-collage` | Before the client sees it, who pushes back? | review before delivery | Try Verbatim | `corrected_in_image_edit` | false | false | null | null | null |
| `concept-04-sounds-ready` | Polished Is Not Pressure Tested | `assets/paid-ads/selected-candidates/verbatim_meta_04_polished-pressure-tested_editorial-collage_selected-candidate-02_official-logo_1x1_v03.png` | `editorial-collage` | Your AI work reads polished. That's the problem. | Polished is not pressure tested. | Try Verbatim | `official_logo_overlaid` | false | false | null | null | null |
| `concept-07-missing-disagreement` | Missing Disagreement | `assets/paid-ads/selected-candidates/verbatim_meta_07_missing-disagreement_editorial-collage_selected-candidate-01_official-logo_1x1_v03.png` | `editorial-collage` | What part of your AI workflow disagrees with you? | build in disagreement | Try Verbatim | `official_logo_overlaid` | false | false | null | null | null |

## Per-Ad Upload Notes

### Concept 01: Confident Draft

- Review card heading: `BEFORE CLIENT USE, VERBATIM CHECKS:`
- Review card lines: `weak claims`, `missing counterpoints`, `overconfident reasoning`
- Upload notes: Selected candidate 04. Official logo overlaid. Confirm local PNG exists before manual upload.

### Concept 02: Before The Client

- Review card heading: `BEFORE DELIVERY, VERBATIM CHECKS:`
- Review card lines: `unsupported claims`, `weak assumptions`, `client-facing risk`
- Upload notes: Selected candidate 03. Logo corrected through image editing. Confirm local PNG exists before manual upload.

### Concept 04: Polished Is Not Pressure Tested

- Review card heading: `BEFORE YOU ACT, VERBATIM CHECKS:`
- Review card lines: `confident claims`, `missing caveats`, `thin reasoning`
- Upload notes: Selected candidate 02. Official logo overlaid using approved first-flight logo standard. Confirm local PNG exists before manual upload.

### Concept 07: Missing Disagreement

- Review card heading: `VERBATIM ADDS DISAGREEMENT AROUND:`
- Review card lines: `assumptions`, `recommendations`, `reasoning gaps`
- Upload notes: Selected candidate 01. Official logo overlaid using approved first-flight logo standard. Confirm local PNG exists before manual upload.

## Manual Upload Checklist

1. Confirm final PNG exists locally.
2. Confirm logo is official and transparent.
3. Confirm copy has no em dashes.
4. Confirm landing URL.
5. Confirm Meta Pixel.
6. Confirm conversion event.
7. Upload manually to Meta.
8. Record campaign/ad set/ad IDs back into the packet later.

## Lifecycle Gates

These remain locked until final package review:

- `approved_for_upload: false`
- `uploaded_to_meta: false`
- `meta_campaign_id: null`
- `meta_ad_set_id: null`
- `meta_ad_id: null`
- `manual_upload_required: true`
- `human_review_required: true`

## Do Not Do From This Packet

- Do not build a Meta API uploader.
- Do not call Meta APIs.
- Do not change selected creative.
- Do not change image files.
- Do not add output files.
- Do not commit assets or PNGs.
- Do not mark ads approved for upload.
