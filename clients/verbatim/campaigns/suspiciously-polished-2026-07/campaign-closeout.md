# Campaign Closeout: Suspiciously Polished

**Campaign:** `Verbatim First Flight - Suspiciously Polished - Consumer - 2026-07`
**Status:** ended
**Business result:** failed
**Infrastructure result:** useful reporting loop produced

## Final Metrics

| Metric | Result |
| --- | ---: |
| Spend | $128.99 |
| Impressions | 9,537 |
| Outbound clicks | 100 |
| Landing page views | 118 |
| AddToChromeClick | 11 |
| Cost per AddToChromeClick | $11.73 |

## Creative Split

| Creative | Spend | Outbound clicks | Landing page views | AddToChromeClick |
| --- | ---: | ---: | ---: | ---: |
| Female: `SPC - Female - 1x1 - v01` | $91.89 | 78 | 90 | 8 |
| Male: `SPC - Male - 1x1 - v01` | $37.10 | 22 | 28 | 3 |

## Diagnosis

The campaign failed commercially. It produced AddToChromeClick intent, but it did not produce active usage or customers.

The consultant campaign failed before AddToChrome intent. Suspiciously Polished moved the failure point later in the funnel: it generated landing-page engagement and AddToChromeClick intent, then failed after install or download intent.

**Primary failure point:** install/download to activation.

## Interpretation

The result does not prove that Meta cannot work for Verbatim. It does show that paid traffic should not continue until the post-click and post-install path is measurable and usable.

The reporting infrastructure improved materially. The campaign now has a read-only monitoring path, normalized Meta summaries, ad-level splits, placement delivery, operator reports, and comparative reporting against the consultant campaign.

## Hold Rule

Do not run another paid campaign until Chrome install onboarding and activation tracking improve.

## Next Required Instrumentation

- Confirmed install
- Extension opened
- V button clicked
- Debate started
- Debate completed
- Retained usage
- Customer/subscription signal

## Guardrails

- Do not change Meta from this closeout.
- Do not generate new creative from this closeout.
- Do not treat AddToChromeClick as confirmed install.
- Do not scale spend until activation is understood.
