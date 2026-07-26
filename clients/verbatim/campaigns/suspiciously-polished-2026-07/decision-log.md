# Decision Log: Suspiciously Polished

This file records durable human decisions. New agents may recommend changes, but they must not rewrite prior decisions or mark a recommendation as approved.

## 2026-07-08 to 2026-07-15: Pause the consultant campaign

**Decision:** Pause the consultant campaign in its current form and preserve the data.

**Reason:** About $50 in spend produced 47 outbound clicks, 14 landing-page views, and no AddToChrome events or new users.

**Interpretation:** The tested combination failed. This did not prove that Meta cannot work for Verbatim.

## 2026-07: Move to a consumer campaign

**Decision:** Test heavy daily AI users rather than a consultant-specific audience.

**Reason:** ChatGPT, Claude, Gemini, Grok, and Perplexity are consumer and prosumer tools. A recognition-based consumer message may fit Meta better than professional-risk positioning.

## 2026-07: Select Suspiciously Polished

**Decision:** Use `Suspiciously Polished` as the campaign concept.

**Reason:** The phrase names a familiar feeling. Some AI answers look too smooth, too confident, or too finished to trust.

**Emotional payload:** Vindication, not risk.

## 2026-07: Use Debate as the wedge

**Decision:** The campaign action is to have a rival model challenge the answer.

**Product constraint:** Debate starts from the Verbatim V button. Library highlighting is for saving what the user wants to keep.

## 2026-07: Run a controlled two-creative test

**Decision:** Use one broad desktop Facebook Feed ad set with the same copy, page, event, and audience for both ads.

**Tested variable:** Female image versus male image.

## 2026-07: Use Sales and AddToChromeClick

**Decision:** Configure the Meta campaign with the Sales objective, Website conversion location, Verbatim Website dataset, and existing Add to Chrome custom conversion.

**Measurement constraint:** `AddToChromeClick` is click intent, not a confirmed extension install.

## 2026-07: Approve final ad copy

**Primary text:**

```text
Stop accepting the first answer AI gives you. Verbatim has a rival model challenge it, so you can act with confidence.
```

**Headline:**

```text
Adversarial Review for ChatGPT and Claude
```

**Description:**

```text
★★★★★ "It acts as a truth layer for my prompts."
```

**Meta CTA:** `Download`

## 2026-07: Remove Free from ad creative

**Decision:** Replace `Add to Chrome · Free` with `Add to Chrome` in both approved images.

**Reason:** Verbatim requires paid access after the trial. Calling the product free creates an offer mismatch.

## 2026-07: Use the full tracked URL in Meta

**Decision:** Put the complete tracked URL in the Website URL field and leave the separate URL Parameters field blank.

**Reason:** This matches the working convention used in the consultant campaign and reduces URL ambiguity.

## 2026-07-26: Record the live landing-page mismatch

**Decision:** Treat the remaining free-product language on the production landing page as a confirmed open issue.

**Owner repo:** `ai-highlighter`

**Required action:** Correct the copy before spend is scaled.

## 2026-07-26: Set workspace campaign status conservatively

**Decision:** Record the campaign as `launch_ready_pending_delivery_confirmation`.

**Reason:** The available source material confirms build, configuration, and tracking verification, but it does not independently confirm Meta approval, first impressions, or live delivery.

## 2026-07-26: Establish source precedence

**Decision:** For current Verbatim GTM state, the Client Workspace and dated campaign records supersede consultant-era `current campaign` sections in legacy root documents.

**Reason:** `AGENTS.md`, `CLAUDE.md`, `VERBATIM-CONTEXT.md`, `SETUP.md`, `WEEKEND-PLAN.md`, `ARCHITECTURE.md`, and `CODEX.md` contain useful history but still describe earlier phases as current.

**Constraint:** Do not silently rewrite those files as part of this workspace task. Update them in a separate, reviewable repo-hygiene change.

## Current phase boundary

**Decision:** Build durable client context and campaign manifests now.

Do not build yet:

- autonomous agent runtime
- Meta uploader
- automatic budget changes
- full warehouse
- second repo

The next implementation after this workspace is Paid Ads Operator Report v0.2.
