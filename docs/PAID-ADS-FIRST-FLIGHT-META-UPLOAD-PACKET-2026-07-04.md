# Paid Ads First Flight Meta Upload Packet 2026-07-04

## Purpose

This is a human-reviewable manual upload packet for the narrowed first Verbatim Meta ads flight.

It is not a Meta API uploader. It does not publish anything.

## Current Status

- Campaign status: draft
- Concept 01 media uploaded into Meta draft ad: true
- Concept 04 media uploaded into Meta draft ad: true
- Ads published: false
- `/consultants` landing page live: false
- Final preview required: true
- Tracking verification required: true

The ads have been manually uploaded into Meta Ads Manager as draft ads. They are not published.

## Scope

Use only two completed concepts for this first upload:

- `concept-01-confident-draft`
- `concept-04-sounds-ready`

Stop creative production for now. The goal is to run a clean first test, not to add more concepts.

## Major Constraint

Verbatim is a Chrome extension.

Chrome extensions cannot be installed through normal mobile Chrome or iOS browser flows. This first Meta test should be treated as extension-first and desktop-focused.

Mobile placement assets are documented, but desktop traffic is the cleanest test for extension adoption.

If mobile placements are used:

- report mobile and desktop separately
- do not use blended mobile plus desktop conversion rate to judge extension adoption
- do not treat mobile install conversion rate as valid for this first extension adoption test

## Campaign Setup

- Campaign: `Verbatim First Flight - Consultants - 2026-07`
- Objective: `Traffic`
- Ad set: `Consultants - Static Editorial - First Flight`
- Performance goal: `landing page views`
- Daily budget: `$20`
- Pixel: `Verbatim Website`
- Pixel ID: `26411512478545039`
- Campaign status: `draft`
- Published: false

## Placement Recommendation

Recommend a desktop-focused first upload if Meta supports it cleanly:

- prioritize desktop feeds / desktop traffic
- avoid treating mobile install conversion rate as valid for this first test
- if mobile placements are used, report them separately
- do not judge extension adoption from blended mobile and desktop conversion rate

## Landing Page

Intended final URL:

```text
https://helloverbatim.com/consultants
```

Status: `not_live`

Do not publish until this page exists.

## Tracking Structure

Shared UTM values:

- `utm_source=meta`
- `utm_medium=paid_social`
- `utm_campaign=verbatim_first_flight_consultants_2026_07`
- `utm_content` varies by concept
- `headline` varies by concept

URL pattern:

```text
https://helloverbatim.com/consultants?headline={headline_variant}&utm_source=meta&utm_medium=paid_social&utm_campaign=verbatim_first_flight_consultants_2026_07&utm_content={utm_content}
```

Tracking verification is still required before publishing.

## Shared Ad Copy

Primary text:

```text
AI work can sound finished before it has been challenged.

Verbatim pressure-tests important AI responses before you rely on them.
```

Headline:

```text
Adversarial review for AI
```

Description:

```text
Pressure-test AI work before it reaches a client.
```

CTA language for site and destination page:

```text
Add to Chrome · Free
```

If Meta does not allow the dot character or this exact CTA text in the button field, use Meta's closest built-in CTA:

```text
Learn More
```

The ad copy and destination page should still use:

```text
Add to Chrome · Free
```

## Source Placement Indexes

- `data/paid-ads/placement-assets/concept-01-placement-assets-2026-07-04.json`
- `data/paid-ads/placement-assets/concept-04-placement-assets-2026-07-04.json`

## Manual Upload Status

| Concept | Draft ad name | Media uploaded | Uploaded to Meta | Published | Meta ad ID | Final preview required | Landing page required | Tracking verification required |
|---|---|---:|---|---:|---|---:|---:|---:|
| `concept-01-confident-draft` | not recorded | true | `draft_only` | false | null | true | true | true |
| `concept-04-sounds-ready` | not recorded | true | `draft_only` | false | null | true | true | true |

## Ad Records

### Concept 01: Confident Draft

- Concept ID: `concept-01-confident-draft`
- UTM content: `concept_01_confident_draft`
- Headline variant: `challenged`
- Destination URL: `https://helloverbatim.com/consultants?headline=challenged&utm_source=meta&utm_medium=paid_social&utm_campaign=verbatim_first_flight_consultants_2026_07&utm_content=concept_01_confident_draft`
- Primary text: shared
- Headline: `Adversarial review for AI`
- Description: `Pressure-test AI work before it reaches a client.`
- CTA: `Add to Chrome · Free`
- Meta button fallback: `Learn More`
- Upload status: `draft_only`
- Published: false

Asset paths by placement:

- `1:1` feed square: `assets/paid-ads/selected-candidates/verbatim_meta_01_confident-draft_editorial-collage_selected-candidate-04_finalized-logo_1x1_v01.png`
- `4:5` mobile feed: `assets/paid-ads/selected-candidates/verbatim_meta_01_confident-draft_editorial-collage_placement-candidate-01_official-logo_4x5_v01.png`
- `9:16` Stories/Reels: `assets/paid-ads/selected-candidates/verbatim_meta_01_confident-draft_editorial-collage_placement-candidate-01_official-logo_9x16_v01.png`

Lifecycle:

- `approved_for_upload: false`
- `uploaded_to_meta: draft_only`
- `published: false`
- `meta_campaign_id: null`
- `meta_ad_set_id: null`
- `meta_ad_id: null`
- `human_review_required: true`
- `final_preview_required: true`
- `landing_page_required: true`
- `tracking_verification_required: true`

### Concept 04: Polished Is Not Pressure Tested

- Concept ID: `concept-04-sounds-ready`
- UTM content: `concept_04_sounds_ready`
- Headline variant: `polished`
- Destination URL: `https://helloverbatim.com/consultants?headline=polished&utm_source=meta&utm_medium=paid_social&utm_campaign=verbatim_first_flight_consultants_2026_07&utm_content=concept_04_sounds_ready`
- Primary text: shared
- Headline: `Adversarial review for AI`
- Description: `Pressure-test AI work before it reaches a client.`
- CTA: `Add to Chrome · Free`
- Meta button fallback: `Learn More`
- Upload status: `draft_only`
- Published: false

Asset paths by placement:

- `1:1` feed square: `assets/paid-ads/selected-candidates/verbatim_meta_04_polished-pressure-tested_editorial-collage_selected-candidate-02_official-logo_1x1_v03.png`
- `4:5` mobile feed: `assets/paid-ads/selected-candidates/verbatim_meta_04_polished-pressure-tested_editorial-collage_placement-candidate-01_official-logo_4x5_v01.png`
- `9:16` Stories/Reels: `assets/paid-ads/selected-candidates/verbatim_meta_04_polished-pressure-tested_editorial-collage_placement-candidate-01_official-logo_9x16_v01.png`

Lifecycle:

- `approved_for_upload: false`
- `uploaded_to_meta: draft_only`
- `published: false`
- `meta_campaign_id: null`
- `meta_ad_set_id: null`
- `meta_ad_id: null`
- `human_review_required: true`
- `final_preview_required: true`
- `landing_page_required: true`
- `tracking_verification_required: true`

## Human Review Gates

- [ ] Confirm `/consultants` page is live before publishing.
- [ ] Confirm final Meta ad preview before publishing.
- [ ] Confirm headline variant URLs resolve correctly.
- [ ] Confirm Pixel `Verbatim Website` with ID `26411512478545039` is selected.
- [ ] Confirm campaign objective is `Traffic`.
- [ ] Confirm performance goal is `landing page views`.
- [ ] Confirm daily budget is `$20`.
- [ ] Confirm desktop-focused placement setup if Meta supports it cleanly.
- [ ] Confirm mobile placement results are reported separately if mobile placements are used.
- [ ] Confirm tracking and landing page view delivery before publishing.
- [ ] Confirm final PNGs exist locally.
- [ ] Confirm no ad is marked published before final human approval.

## Do-Not-Publish Notes

Do not publish if:

- the consultants landing page does not exist
- final previews have not been checked
- tracking verification is incomplete
- Meta Pixel / dataset selection is unclear
- placement settings blend mobile and desktop in a way that hides the extension install constraint
- any selected PNG is missing locally
- Meta campaign, ad set, or ad IDs would need to be invented

## Lifecycle Gates

This packet remains gated:

- `approved_for_upload: false`
- `uploaded_to_meta: draft_only`
- `published: false`
- `meta_campaign_id: null`
- `meta_ad_set_id: null`
- `human_review_required: true`

## Do Not Do From This Packet

- Do not build a Meta API uploader.
- Do not call Meta APIs.
- Do not add PNG assets to git.
- Do not mark `approved_for_upload` true.
- Do not mark `published` true.
- Do not invent Meta ad IDs.
- Do not change campaign spend.
- Do not change campaign objective.
- Do not publish anything.
