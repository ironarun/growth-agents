# Paid Ads First Flight Funnel Readiness 2026-07-01

## Purpose

This checklist verifies whether the Verbatim landing page and measurement path are ready before the first-flight Meta ads are manually uploaded.

This is documentation only. It does not change app code, call Meta APIs, upload ads, or approve spend.

## Source Files

- Upload packet doc: `docs/PAID-ADS-FIRST-FLIGHT-META-UPLOAD-PACKET-2026-07-01.md`
- Upload packet JSON: `data/paid-ads/meta-upload-packets/first-flight-meta-upload-packet-2026-07-01.json`
- Consultant test brief: `briefs/verbatim-consultant-test.md`
- GTM thesis: `docs/GTM-ENGINEERING-THESIS.md`
- Readiness JSON: `data/paid-ads/funnel-readiness/first-flight-funnel-readiness-2026-07-01.json`

## Current Decision

- Ready for upload: true
- Ready for spend: false
- Status: ready_for_manual_upload
- Reason: landing page, Meta Pixel Helper detection, PageView, Add-to-Chrome path, domain verification, selected local PNGs, final PNG review, final upload packet, and Arun's final upload approval are verified. Waitlist is not available and is not a blocker. The package is ready for manual upload, but not ready for spend until Meta campaign/ad set/ad IDs, launch timing, and delivery status are recorded after upload.

## Landing URL

URL:

```text
https://helloverbatim.com
```

Status: `verified`

Manual checks:

- [x] Landing page loads successfully.
- [x] Campaign URL can be constructed from the base URL.
- [x] Landing page is ready for first-flight manual upload.

## Meta Pixel

Status: `verified`

Manual checks:

- [x] Meta Pixel Helper shows an active pixel.
- [x] Meta Events Manager receives `PageView`.

Note: `PageView` was previously verified by Arun in Events Manager and was not re-tested in this update.

## Domain Verification

Status: `verified`

Manual checks:

- [x] `helloverbatim.com` is verified in Meta Business settings.
- [x] Verified domain is associated with the first-flight Meta upload path.

## Conversion Events

| Event | Status | Notes |
|---|---|---|
| `PageView` | `verified` | Previously verified by Arun in Meta Events Manager. Not re-tested in this update. |
| `extension_install_clicked` | `needs_product_verification` | Historical brief event name. Add-to-Chrome / Chrome Web Store path works, but confirm whether current production event is this name or `AddToChromeClick` before upload. |
| `extension_installed` | `needs_product_verification` | Not an upload blocker. Keep product-verification gated until install attribution exists. |
| `debate_run` | `needs_product_verification` | Not an upload blocker. Keep product-verification gated until Debate behavior is measurable. |
| `waitlist_signup` | `not_available` | `helloverbatim.com` does not currently have an email or waitlist form. |

## Add-to-Chrome Path

Status: `verified`

Manual checks:

- [x] Add-to-Chrome / Chrome Web Store path has been checked and works.

## Waitlist Capture

Status: `not_available`

`helloverbatim.com` does not currently have an email or waitlist form, so waitlist capture is not part of this first-flight readiness gate.

Manual checks:

- [x] Email submission is not available because no waitlist form exists.
- [x] Tier capture is not available because no waitlist form exists.
- [x] Supabase waitlist row verification is not available because no waitlist form exists.

## Selected PNGs

Status: `verified`

Manual checks:

- [x] Final selected PNGs exist locally.
- [x] Concept 01 logo version is approved.
- [x] Concept 02 logo version is approved.
- [x] Concept 04 v03 logo version is approved.
- [x] Concept 07 v03 logo version is approved.

## Manual Meta Upload Readiness

Status: `verified`

Manual checks:

- [x] Four selected ads exist locally.
- [x] Upload packet exists: `data/paid-ads/meta-upload-packets/first-flight-meta-upload-packet-2026-07-01.json`
- [x] Meta campaign/ad set/ad IDs are still null until upload.
- [x] Final upload approval is verified by Arun.

## Post-Upload Fields To Record Later

These fields should stay blank or null until manual upload happens:

- `meta_campaign_id`
- `meta_ad_set_id`
- `meta_ad_id`
- `launch_datetime`
- `initial_delivery_status`
- `first_check_notes`

## Lifecycle Gates

Current gate state:

- `approved_for_upload: true`
- `uploaded_to_meta: false`
- `human_review_required: true`

Spend remains blocked until upload and delivery details are recorded.

## Stop Conditions

Do not spend if:

- Meta campaign/ad set/ad IDs have not been recorded.
- Launch timing has not been recorded.
- Initial delivery status has not been recorded.
- Meta Pixel stops firing.
- Events Manager stops receiving `PageView`.
- Add-to-Chrome / Chrome Web Store path breaks.
- Any selected PNG cannot be found locally.

## Next Manual Step

Manually upload the four selected first-flight ads to Meta.

After manual upload, record campaign ID, ad set ID, ad IDs, launch datetime, delivery status, and first-check notes in the upload packet.
