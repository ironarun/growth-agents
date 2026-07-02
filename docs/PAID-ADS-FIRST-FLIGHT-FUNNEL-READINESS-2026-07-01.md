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
- Status: not_started
- Reason: landing page, Pixel, domain verification, conversion events, and waitlist capture still need manual verification.

## Landing URL

URL:

```text
https://helloverbatim.com
```

Status: `needs_manual_verification`

Manual checks:

- [ ] Landing page opens correctly.
- [ ] Campaign URL can be constructed from the base URL.
- [ ] Page loads without obvious console or tracking errors.

## Meta Pixel

Status: `needs_manual_verification`

Manual checks:

- [ ] Meta Pixel Helper shows an active pixel.
- [ ] Meta Events Manager receives `PageView`.

## Domain Verification

Status: `needs_manual_verification`

Manual checks:

- [ ] `helloverbatim.com` is verified in Meta Business settings.
- [ ] Verified domain is associated with the correct business and ad account.

## Conversion Events

| Event | Status | Notes |
|---|---|---|
| `PageView` | `needs_manual_verification` | Verify in Pixel Helper and Events Manager. |
| `extension_install_clicked` | `needs_manual_verification` | Historical brief event name. Confirm whether current production event is this name or `AddToChromeClick` before upload. |
| `extension_installed` | `needs_manual_verification` | Use if available. If not available, mark unavailable before upload. |
| `debate_run` | `needs_manual_verification` | Use if available. If not available, mark unavailable before upload. |
| `waitlist_signup` | `needs_manual_verification` | Use if available. Confirm tier property if the form supports it. |

## Waitlist Capture

Status: `needs_manual_verification`

Manual checks:

- [ ] Email submission works.
- [ ] Tier is captured if the form supports it.
- [ ] Row lands in Supabase.

## Manual Meta Upload Readiness

Status: `not_started`

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

- Landing URL is not verified.
- Meta Pixel does not fire.
- Events Manager does not receive `PageView`.
- Domain verification cannot be confirmed.
- The intended conversion event is unclear.
- Waitlist or install-intent path cannot be verified.
- Any selected PNG cannot be found locally.
- Arun has not approved the final upload package.

## Next Manual Step

Run through the checklist in browser, Meta Pixel Helper, Meta Events Manager, Meta Business settings, and Supabase.

After verification, update the readiness JSON and upload packet rather than relying on memory.
