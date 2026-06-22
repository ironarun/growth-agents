# Verbatim brand guide

Working reference for how Verbatim looks, sounds, and renders. Not a
50-page corporate book. Read top to bottom in ten minutes and you
should be able to write copy, build a UI component, or open a PR that
feels Verbatim without having to ask.

Companion: [brand-colors.md](./brand-colors.md) carries the palette in
full. This guide references it; it does not duplicate it.

---

## Verbatim in a sentence

Verbatim performs adversarial review on AI outputs. The Chrome extension
runs critique, alternative framing, and distillation against a competing
model inline, in the conversation, where the original context still
lives.

That sentence is the test. Anything we ship that doesn't make this
clearer (or trades on it dishonestly) is off-brand.

### Anchor lines (in order of authority)

These are public and load-bearing. Treat them as immutable unless
explicitly rewritten in this file.

- **H1:** "AI just got a bullshit meter."
- **Subhead:** "Adversarial review for AI."
- **CTA:** "Add to Chrome · Free"
- **Platform line:** "Works on ChatGPT, Claude, Gemini, Grok, Perplexity."
- **Index frame:** "Frontier AI models answer the same question, then have to defend it to each other. What survives is verified. What gets challenged is disputed."
- **Locked About/Benchmark intro:** the three-paragraph paragraph block in `app/about/page.tsx` and `app/benchmark/page.tsx`. Untouchable in copy edits. The single authorized recent change ("9 frontier models" → "frontier models") is documented in the 2026-06-07 CHANGELOG.

---

## Voice and tone

### Direct. Specific. No padding.

The reader is a knowledge worker who pays for AI subscriptions. They
have used GPT for years and are no longer impressed by adjectives.
Earn their attention in the first sentence and keep earning it in
every sentence after.

### Concession-then-commit (Graham/Thompson)

When a smart reader would object, name the strongest version of the
objection in one sentence, address it in one sentence, then commit.
Do not enumerate three counterarguments (signals fence-sitting).
Do not skip the counterargument (signals fragility).

### Calibration, not hedging

If the data is one question or one run, say so inline. That is
calibration, honest sizing of a claim. Hedging is dressing up
unwillingness to commit. The difference matters.

### Don't promote unearned confidence

Pre-flight check on any claim: would a competing AI flag this in
Critique? If yes, either tighten the claim or drop it. We are an
adversarial-review company. Our copy has to survive the same standard
we sell.

### Banned phrases (full list in `docs/skills/blog-post/SKILL.md`)

Treat the following as off-brand in all surfaces (marketing, blog,
email, in-app copy, conversational text):

- "delve" / "delves into"
- "it's worth noting", "interestingly", "what's striking is", "I would argue"
- "in conclusion", "the bottom line"
- "game-changer", "transformative", "revolutionize", "unlock"
- "harness the power of", "leveraging" / "leverage" as a verb
- "landscape" (as in "the AI landscape"), "ecosystem" (as in "the model ecosystem")
- "in fact", "it turns out", "importantly", "notably", "of note"
- "it seems", "it appears", "it would seem"
- "in today's fast-paced world"

### Em dashes

Banned in body copy across every surface. Use periods, commas,
parentheses, or the middle dot `·`. The single documented exception is
the locked About/Benchmark intro (`"fluency — qualities"`, `"fluency — stripped away"`) — preserved verbatim because the intro
is otherwise untouchable. Do not extend the exception elsewhere.

---

## Color

Full palette: [brand-colors.md](./brand-colors.md). One-line summary:

- **Brand pink `#f12258`** is the only "Verbatim color". Two authorized
  supporting shades: `#fff0f2` (light surface tint), `#d4154d` (hover).
- **Status colors** (red/amber/green) are for state communication.
  Never use brand pink to communicate an error or warning.
- **No Tailwind named palettes.** Bracket the hex: `bg-[#fff0f2]`,
  `text-[#f12258]`. Same rule applies to neutrals and status colors.

---

## Typography

Defined in `app/layout.tsx` via `next/font/google` and applied as CSS
custom properties.

| Family | CSS var | Use |
|---|---|---|
| **DM Sans** (300, 400, 500, 600) | `--font-dm-sans` | Body, nav, UI controls, blog post body, FAQ, dashboard, Surface 1 + 2 cards. The default for everything that isn't a hero or display. |
| **Bebas Neue** (400) | `--font-heading` | The hero H1 ("AI just got a bullshit meter."). Applied through the `h()` helper in `app/HomeClient.tsx`. Don't use elsewhere without a reason. |
| **Playfair Display** (regular + italic) | `--font-playfair` | Reserved for editorial moments. Use sparingly. |
| **Courier Prime** (400, 700) | `--font-courier-prime` | Mono / code / receipt-style copy (credits pill, model IDs in the dashboard, etc.). |
| **Arial Black** (system font, NOT Google) | inline `fontFamily: "'Arial Black', system-ui, sans-serif"` | Feature headlines on the homepage (`feature-headline` class), Insights H2, "FOR ORGANIZATIONS" + "START QUESTIONING EVERYTHING" CTAs. Heavy display weight; goes with `fontWeight: 900` + `textTransform: uppercase`. |
| **Georgia** (system serif) | inline `fontFamily: "Georgia, 'Times New Roman', serif"` | The italic intro quote between the hero and the features ("AI is prone to overconfidence…"). Used nowhere else; that paragraph is a deliberate visual departure to set up the rest of the page. |

### Hero subhead spec

`clamp(28px, 4vw, 36px)`, weight 300, line-height 1.3, max-width 640px,
opacity 0.82 on the dark hero video. Anchored to the H1 ceiling
(110px) so the ratio holds across viewports.

### Size scale (the patterns the codebase actually uses)

- Hero H1: `clamp(52px, 10vw, 110px)`
- Page H2 (Arial Black uppercase headlines): `clamp(20px, 3vw, 28px)`
  for marketing sections; `clamp(24px, 4vw, 36px)` for the closing CTA.
- Surface 1 / Surface 2 strip titles: `clamp(28px, 4vw, 42px)`,
  DM Sans weight 600.
- Surface 1 / Surface 2 card titles: 18px, DM Sans weight 600.
- Body: 14-16px depending on surface, DM Sans weight 300-400.
- Eyebrows: 10-11px, weight 700, uppercase, letter-spacing 0.18-0.3em.

---

## Logo and wordmark

Two locked variants. Stored in `/public`. No SVG variants today.

| File | Use | Notes |
|---|---|---|
| `/logo-pink.png` | On light backgrounds (SiteNav, /faq footer, /about, /privacy, /terms) | This is the primary wordmark. |
| `/logo-white.png` | On dark backgrounds (dashboard login screen, blog footer, email digest headers) | Reversed-out. Same wordmark, white fill. |
| `/logo.png`, `/logo4-white-bkgd.png` | Legacy. Do not use in new code. | Kept for backward compatibility with older surfaces. |

### Sizing

In the SiteNav: width 120, height 28 (height-locked, width auto via
`object-fit: contain`). On the dashboard login: width 140, height 46.
Aim for a consistent visual weight rather than a fixed pixel size; the
wordmark reads as the same brand mark across surfaces, scaled to fit.

### Clear space + minimum size

Allow at least `1ch` of clear space around the wordmark on any side.
Below ~80px wide, the wordmark loses legibility — switch to a "V"
mark (the brand pink V button glyph used in the extension) if a
smaller mark is needed.

---

## Iconography

Inline SVGs in the Tabler outline style. We do not import the Tabler
CSS bundle (not worth a new asset dependency for the icon counts we
have). The icon registry lives in `app/components/Surface1.tsx`'s
`IconFor` switch and `app/components/Surface2.tsx`'s `ArticleIcon`.

### Spec for new icons

- 24x24 viewBox, rendered at 28x28 in card contexts.
- `fill: none`, `stroke: ICON_COLOR` (`#444`), `strokeWidth: 1.6`,
  round caps and joins.
- Use Tabler-style outline paths where available; hand-author only
  when no Tabler icon fits (see `council-panel` in Surface 1 for an
  example of the latter).
- The data layer references icons by string name (e.g.
  `iconClass: "ti-book-2"`); the component resolves the name to an
  SVG. Keep that pattern — names in data, SVG in component.

### Existing icon set

| Name | Surface | Style |
|---|---|---|
| `ti-message-circle-2` | Surface 1 (Debate) | Tabler outline |
| `council-panel` | Surface 1 (Council) | Hand-authored 3-figure custom SVG |
| `ti-book-2` | Surface 1 (Index) | Tabler outline |
| `ti-article` (inline in `Surface2.tsx`) | Surface 2 (BLOG eyebrow) | 11x11px, color tracks the tag foreground |

---

## Components

The patterns that show up across surfaces and define how Verbatim feels.

### Cards (Surface 1, Surface 2, FAQ, future)

```
background:    #fff
border:        0.5px solid #e8e8e8
border-radius: 10px
padding:       32px
min-height:    240px (Surface 2; Surface 1 cards size to content)
gap:           14px between elements
text:          DM Sans, body 14-15px weight 300, title 18px weight 600
```

**Card-as-link.** When a card is clickable, the whole card is the link
(no inner button, no "Learn more →" affordance). Wrap in `<Link>` for
internal hrefs, `<a target="_blank" rel="noopener noreferrer">` for
external. Set `textDecoration: "none"` and `color: "inherit"` on the
link so the default browser styling doesn't leak through.

**Hover state.** Shared `.vb-surface-card:hover`:

```css
box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.06);
transform: translateY(-1px);
transition: box-shadow 150ms ease, transform 150ms ease;
```

Border stays at rest. No background change. The shadow is the
affordance.

### SiteNav

Sticky white bar, 12-20px padding, `0.5px solid #e5e7eb` bottom border,
DM Sans. Wordmark left, nav items right (About · Benchmark · Blog ·
FAQ · Sign in). Benchmark gets a subtle medium-weight emphasis
(600 vs 500 on the others); no badge, no color change. Mobile collapses
to a hamburger at 720px. **No Add to Chrome button in the nav** — that
CTA lives in the homepage hero only.

### Pricing tier pills (admin only)

See [brand-colors.md](./brand-colors.md). They are classification chips
for an internal audience. Do not reuse on marketing surfaces.

### Eyebrows

Small uppercase letter-spaced caps that sit above titles. Two flavors:

- **Brand eyebrow** (`#f12258`, letter-spacing 0.3em, weight 700):
  Marks a section as Verbatim-branded ("INSIGHTS", "FROM THE VERBATIM
  INDEX", "THREE WAYS TO RUN ADVERSARIAL REVIEW").
- **Muted eyebrow** (`#999`, letter-spacing 0.2em, weight 700):
  Marks a sub-element inside a Verbatim section (the "THE DEBATE",
  "THE COUNCIL", "THE INDEX" cards in Surface 1).

---

## Naming conventions

### Product tiers (in copy + UI)

`Free` (when the user hasn't started the trial yet), `Start` (post-trial
without subscription), `Pro`, `Power`, `BYOK`, `Admin` (internal).
Capitalize. Do not pluralize ("Pro users", not "Pros").

### Surfaces (in copy + internal docs)

`The Debate`, `The Council`, `The Index`. Capitalize. "Debate mode" and
"Council mode" are acceptable in product UI; "the Verbatim Index" or
"the Index" in marketing copy.

### Model IDs

When mentioning a specific model in copy, use the official id with
proper casing: `Claude Opus 4.7`, `GPT-5.5`, `Gemini 3.1 Pro`,
`Grok 4.3`, `Sonar Pro`. Do not abbreviate ("Sonnet" is acceptable for
`Claude Sonnet 4.6` when context is clear). Internal placeholders like
"the leading model" are off-brand; we are specific.

When Verbatim picks a model on the user's behalf (Council synthesis,
critique routing), surface the role and provider rather than the
internal id: "Native Grok" or "Council synthesizer" beats "Grok 4.1
Fast" next to the user's own "Grok 4.20" pick. See feedback memory
`hide_internal_model_ids` for the reasoning.

---

## What NOT to do

- No em dashes. Anywhere. (Documented exception: the locked
  About/Benchmark intro.)
- No Tailwind named palettes (`pink-500`, `gray-100`, etc.). Bracket
  the hex.
- No additional pink shades beyond `#f12258`, `#fff0f2`, `#d4154d`.
- No reuse of admin tier-pill colors on marketing surfaces.
- No "Add to Chrome" button in the SiteNav. The CTA lives in the
  homepage hero.
- No pre-flight "this debate will use N credits" UI. Insufficient
  credits is the only block we show.
- No banned phrases (see Voice section above).
- No fabricated specifics. If we cite a number, a paper, a study, a
  pricing figure, it has to be verifiable. Treat copy like blog data:
  the source must exist.
- No promoting unearned confidence. We are an adversarial-review
  company; our copy is the first place that standard applies.

---

## Related docs

- [`docs/design/brand-colors.md`](./brand-colors.md) — full color palette
- [`docs/skills/blog-post/SKILL.md`](../skills/blog-post/SKILL.md) — blog
  post structure, length, banned phrases, hard rules
- [`docs/skills/synthesis/SKILL.md`](../skills/synthesis/SKILL.md) — long-form
  Verbatim Index essay structure
- [`docs/skills/benchmark-card/SKILL.md`](../skills/benchmark-card/SKILL.md) —
  benchmark card headline_finding copy rules
- `CLAUDE.md` (repo root) — the standing architectural decisions
  (brand colors, no em dashes, etc.) that this guide consolidates and
  expands

---

## Change log

| Date | Change |
|---|---|
| 2026-06-07 | Initial document. Audited typography, logo files, iconography conventions, component patterns (card, SiteNav, eyebrow), voice rules, and naming conventions across `app/` and the existing skill docs. Companion to the 2026-05-27 `brand-colors.md`. |
