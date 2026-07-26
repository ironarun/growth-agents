# Verbatim Tracking Context

**State as of:** 2026-07-25

## Meta account context

```text
Meta ad account ID: 1164218856768665
Dataset: Verbatim Website
Pixel ID: 26411512478545039
```

## Verified production events

### PageView

Verified on the production Suspiciously Polished landing page.

### AddToChromeClick

Verified on the production landing page with this payload:

```json
{
  "page": "suspiciously-polished",
  "headline": "suspiciously-polished"
}
```

The current campaign optimizes to the existing Add to Chrome custom conversion based on `AddToChromeClick`.

Important semantic limit:

```text
AddToChromeClick is click intent. It is not a confirmed extension install or paid subscription.
```

## Event to ignore

```text
SubscribedButtonClick
```

Meta detects this automatically. Do not use it as the campaign conversion signal or include it as a success event in operator reports.

## URL tracking convention

Use the complete tracked URL in Meta's Website URL field.

Leave Meta's separate URL Parameters field blank.

Campaign-level values:

```text
headline=suspiciously-polished
utm_source=meta
utm_medium=paid_social
utm_campaign=suspiciously_polished_consumer_2026_07
```

Creative-level values:

```text
Female: utm_content=concept_01_female
Male:   utm_content=concept_02_male
```

## Reporting rule

Operator reports must separate:

- Meta delivery and click metrics
- landing-page views
- AddToChromeClick intent
- any future confirmed install, trial, or paid events

Do not collapse these into one conversion number.
