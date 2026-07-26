# Tracking and Launch Checklist

**Campaign:** `suspiciously-polished-2026-07`

## Production instrumentation

- [x] Production landing page deployed.
- [x] Pixel `26411512478545039` active.
- [x] `PageView` processed.
- [x] `AddToChromeClick` processed.
- [x] Event payload includes `page = suspiciously-polished`.
- [x] Event payload includes `headline = suspiciously-polished`.
- [x] Existing Add to Chrome custom conversion selected.
- [x] `SubscribedButtonClick` excluded from reporting and optimization.

## Meta configuration

- [x] Objective set to Sales.
- [x] Conversion location set to Website.
- [x] Dataset set to Verbatim Website.
- [x] Ad set named `Consumer - Broad - Desktop - AddToChromeClick`.
- [x] Broad United States audience selected.
- [x] Desktop-only device constraint selected.
- [x] Facebook Feed placement selected.
- [x] CTA set to Download.
- [x] Full tracked URL placed in Website URL field.
- [x] Separate URL Parameters field left blank.

## Creative QA

- [x] Female creative approved.
- [x] Male creative approved.
- [x] Question mark present after `suspiciously polished?`.
- [x] Official Verbatim logo used.
- [x] Image CTA says `Add to Chrome`.
- [x] Image CTA does not say `Free`.
- [ ] Copy approved creative binaries into the campaign `assets/` directory.

## Confirmed blocker before scaling

- [ ] Remove `Free` claims from the production landing page in `ai-highlighter`.

Confirmed present on 2026-07-26:

```text
Add to Chrome · Free
Verbatim is a free Chrome extension.
Free Chrome extension. Requires desktop Chrome.
```

## Delivery confirmation

- [ ] Confirm both ads pass Meta review.
- [ ] Confirm first impressions begin.
- [ ] Confirm destination URLs resolve from live ads.
- [ ] Confirm PageView continues after paid clicks.
- [ ] Confirm AddToChromeClick continues after paid traffic.
- [ ] Confirm delivery remains Facebook Feed on desktop.
- [ ] Confirm no Advantage+ placement expansion leakage.
- [ ] Record campaign, ad set, and ad IDs when available.

## First operator report

Record:

- [ ] spend
- [ ] impressions
- [ ] CPM
- [ ] link CTR
- [ ] outbound clicks
- [ ] landing-page views
- [ ] AddToChromeClick
- [ ] cost per AddToChromeClick
- [ ] female delivery and performance
- [ ] male delivery and performance
- [ ] placement delivery
- [ ] Meta review comments or policy notices

## Decision constraint

Do not change budgets, pause ads, or generate a replacement creative automatically.

The report may recommend only:

```text
hold
investigate
pause
iterate
```

Arun decides the action.
