# Paid Ads First Flight Decision Log

Campaign: Verbatim First Flight - Consultants - 2026-07  
Campaign ID: 6962618508954  
Ad set: Consultants - Static Editorial - First Flight  
Ad set ID: 6962618509154  

## 2026-07-08: Campaign launched

First Verbatim consultant paid ads test launched on Meta.

Initial objective: Traffic / landing page views.

Initial purpose:
- Test whether consultant pain-point creative can produce qualified traffic.
- Validate the Meta pixel and AddToChrome custom conversion.
- Build the first human-reviewable paid ads monitoring loop.

## 2026-07-09: Tracking verified

Meta Events Manager confirmed that browser events were firing on helloverbatim.com.

Verified:
- PageView
- AddToChromeClick

Custom conversion verified:
- Name: Add to Chrome - consultants
- ID: 1314018147386966
- Rule: AddToChromeClick where URL contains consultants
- Last fired time confirmed through Meta API.

Decision:
- Treat AddToChrome reporting as valid.
- Do not treat zero paid AddToChrome events as a broken pixel unless future evidence changes.

## 2026-07-10 01:55 AM ET: Placement correction

Manual placement correction made in Meta Ads Manager.

Kept:
- Facebook Feed

Removed:
- Facebook Right Column
- Facebook Marketplace
- Facebook Search Results
- Limited spending to excluded placements

Reason:
Right Column consumed the majority of early spend while producing weak landing-page continuation and zero AddToChrome events.

Observed before correction:
- Spend: $20.61
- Impressions: 16,445
- Outbound clicks: 27
- Landing page views: 4
- AddToChrome: 0
- Right Column consumed approximately 81.7% of spend with zero AddToChrome.

Decision:
- Treat pre-change data as polluted by placement mix.
- Do not declare a creative winner yet.
- Do not change budget, audience, copy, CTA, or landing page based on pre-change data.
- Next read should focus on Feed-only traffic quality.

## Current operating rule

No automatic campaign edits.

The agent may:
- ingest Meta data
- normalize results
- flag risks
- produce human-reviewable recommendations

The agent may not:
- pause ads
- change budgets
- change placements
- edit creative
- edit URLs
- change campaign settings

## Next read

Wait for meaningful post-correction spend before evaluating.

Minimum useful post-change signal:
- $5-$10 additional spend after placement correction

Primary funnel read:
- Outbound clicks
- Landing page views
- AddToChrome events

Primary question:
Can Feed-only traffic produce better landing-page continuation and AddToChrome events?
