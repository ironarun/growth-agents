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

- Ready for upload: false
- Ready for spend: false
- Status: needs_manual_verification
- Reason: landing page, Meta Pixel Helper detection, PageView, and Add-to-Chrome path are verified. Waitlist is not available and is not a blocker. Domain verification, selected local PNG verification, final upload approval, and post-upload Meta IDs remain gated.

## Landing URL

URL:

```text
https://helloverbatim.com
```

Status: `verified`

Manual checks:

- [x] Landing page loads successfully.
- [x] Campaign URL can be constructed from the base URL.
- [ ] Page loads without obvious console or tracking errors.

## Meta Pixel

Status: `verified`

Manual checks:

- [x] Meta Pixel Helper shows an active pixel.
- [x] Meta Events Manager receives `PageView`.

Note: `PageView` was previously verified by Arun in Events Manager and was not re-tested in this update.

## Domain Verification

Status: `needs_manual_verification`

Manual checks:

- [ ] `helloverbatim.com` is verified in Meta Business settings.
- [ ] Verified domain is associated with the correct business and ad account.

## Conversion Events

| Event | Status | Notes |
|---|---|---|
| `PageView` | `verified` | Previously verified by Arun in Meta Events Manager. Not re-tested in this update. |
| `extension_install_clicked` | `needs_product_verification` | Historical brief event name. Add-to-Chrome / Chrome Web Store path works, but confirm whether current production event is this name or `AddToChromeClick` before upload. |
| `extension_installed` | `needs_product_verification` | No current evidence in this checklist. Keep unavailable or product-verification gated until install attribution exists. |
| `debate_run` | `needs_product_verification` | No current evidence in this checklist. Keep product-verification gated until Debate behavior is measurable. |
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

## Manual Meta Upload Readiness

Status: `needs_manual_verification`

Manual checks:

- [ ] Four selected ads exist locally.
- [x] Upload packet exists: `data/paid-ads/meta-upload-packets/first-flight-meta-upload-packet-2026-07-01.json`
- [x] Meta campaign/ad set/ad IDs are still null until upload.
- [x] `approved_for_upload` remains false until Arun manually approves.

## Post-Upload Fields To Record Later

These fields should stay blank or null until manual upload happens:

- `meta_campaign_id`
- `meta_ad_set_id`
- `meta_ad_id`
- `launch_datetime`
- `initial_delivery_status`
- `first_check_notes`

## Lifecycle Gates

Keep everything gated:

- `approved_for_upload: false`
- `uploaded_to_meta: false`
- `human_review_required: true`

## Stop Conditions

Do not manually upload or spend if:

- Landing URL stops loading correctly.
- Meta Pixel does not fire.
- Events Manager does not receive `PageView`.
- Domain verification cannot be confirmed.
- Add-to-Chrome / Chrome Web Store path breaks.
- The intended conversion event is unclear.
- Any selected PNG cannot be found locally.
- Arun has not approved the final upload package.

## Next Manual Step

Confirm domain verification in Meta Business settings and verify the four selected PNGs exist locally.

After manual upload, record campaign ID, ad set ID, ad IDs, launch datetime, delivery status, and first-check notes in the upload packet.
