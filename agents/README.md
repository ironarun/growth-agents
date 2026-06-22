# Growth Agents Runtime

This folder contains local agent runtimes and shared agent types for `growth-agents`.

The first runtime is the Paid Ads Agent. It is intentionally narrow:

- accepts a natural-language instruction from the terminal
- extracts source URLs
- routes known source types to skills
- writes structured artifacts
- preserves human review gates

The runtime is not a replacement for human approval. It does not publish, upload ads, spend money, scrape platforms, or fabricate missing research fields.

## Current Runtime

Run:

```text
npm.cmd run agent:paid-ads -- "I like this Meta ad. Here's the URL: https://www.facebook.com/ads/library/..."
```

Current skill routing:

- Meta Ad Library URL -> `capture-ad-library-source`
- unsupported URL -> `unsupported_source` artifact
- no URL -> clear terminal instruction

## Boundary

The agent runtime coordinates existing workflows. It should not turn every task into a new standalone script. New paid ads capabilities should be exposed through agent skills when the user interaction is naturally agentic.
