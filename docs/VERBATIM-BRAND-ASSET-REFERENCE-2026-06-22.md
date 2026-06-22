# Verbatim Brand Asset Reference 2026-06-22

## Purpose

This document records the Verbatim brand assets imported into `growth-agents` for paid ad rendering.

The paid ads renderer should use these repo-visible assets instead of guessing from prompts, old briefs, or manually pasted visual descriptions.

## Source Of Truth

Canonical source repo:

```text
C:\Users\Arun\ai-highlighter
```

Canonical files copied into this repo:

| Source | Destination |
|---|---|
| `C:\Users\Arun\ai-highlighter\docs\design\brand-guide.md` | `brand/verbatim/brand-guide.md` |
| `C:\Users\Arun\ai-highlighter\docs\design\brand-colors.md` | `brand/verbatim/brand-colors.md` |
| `C:\Users\Arun\ai-highlighter\public\logo-pink.png` | `brand/verbatim/logo-pink.png` |
| `C:\Users\Arun\ai-highlighter\public\logo-white.png` | `brand/verbatim/logo-white.png` |

Legacy logo files such as `logo.png` and `logo4-white-bkgd.png` were not imported because canonical `logo-pink.png` and `logo-white.png` were available.

## Canonical Brand Pink

Use:

```text
#f12258
```

This is the only primary Verbatim brand color.

## Authorized Supporting Colors

Authorized pink support shades:

```text
#fff0f2
#d4154d
```

Useful neutrals for static ad rendering:

```text
#0a0a0a
#050505
#111111
#1a1a1a
#333333
#555555
#e8e8e8
#fafafa
#ffffff
```

Do not invent additional pinks. Do not use Tailwind named palettes as brand colors.

## Logo Usage Rules

Use:

- `brand/verbatim/logo-pink.png` on light backgrounds.
- `brand/verbatim/logo-white.png` on dark backgrounds.

Do not use:

- legacy `logo.png`
- legacy `logo4-white-bkgd.png`
- generated logo approximations
- hallucinated marks
- fake partner or customer logos

Sizing guidance from the brand guide:

- SiteNav uses approximately width `120`, height `28`.
- Dashboard login uses approximately width `140`, height `46`.
- Preserve visual weight rather than forcing one size everywhere.
- Keep at least `1ch` of clear space around the wordmark.
- Below roughly `80px` wide, the wordmark loses legibility. Use a separate approved compact mark only if one exists.

No compact mark has been imported into `growth-agents` yet.

## Typography Notes For Static Ad Rendering

Primary product typography in the source app:

- DM Sans: body, nav, UI, cards, most product and marketing copy.
- Bebas Neue: reserved for the homepage hero H1.
- Playfair Display: reserved for occasional editorial moments.
- Courier Prime: mono, code, receipt-style copy.
- Arial Black: selected heavy display headlines in specific homepage sections.
- Georgia: one specific italic intro quote on the homepage.

Renderer implication:

- Default to DM Sans or a close local substitute only when the actual font is unavailable.
- Do not use Bebas Neue everywhere just because it is distinctive.
- Do not invent a new type system for paid ads.
- If the renderer cannot load the approved font files, the render result should disclose the fallback.

## Voice And Copy Rules

Current positioning:

```text
Adversarial review for AI.
```

Current wedge:

```text
Client-facing AI work should be challenged before action.
```

Brand energy:

```text
AI just got a bullshit meter.
```

Customer-facing copy rules:

- No em dashes.
- No generic SaaS language.
- No "leverage."
- No "transform."
- No "revolutionize."
- No "AI-powered."
- No "seamless."
- No "unlock."
- No fabricated specifics.
- No claims that Verbatim proves truth.
- No claims that Verbatim guarantees correctness.

Deprecated hook, do not use:

```text
You don't know what you're missing. Find out before it costs you.
```

## Banned Visual Patterns

Do not use:

- robots
- glowing AI brains
- fake dashboards
- fake UI
- fake client reports
- fake metrics
- fake logos
- stock handshake imagery
- generic enterprise compliance software styling
- warning triangles as the primary idea
- decorative tech grids
- tiny unreadable text
- invented product screenshots

## What The Renderer Must Use

Paid ads rendering should use:

- `brand/verbatim/logo-pink.png` for light-background ads.
- `brand/verbatim/logo-white.png` for dark-background ads.
- `#f12258` as the primary accent.
- `#fff0f2` only as an authorized light pink surface.
- `#d4154d` only as a darker pink state or accent when justified.
- typography choices aligned to the brand guide.
- explicit disclosure when a font fallback is used.
- human review before any Meta upload.

## What The Renderer Must Not Invent

The renderer must not invent:

- logo variants
- compact icons
- screenshots
- product UI states
- customer logos
- performance metrics
- claims of correctness
- extra brand colors
- new positioning
- new public hooks without review

## Current Asset Boundary

Available in `growth-agents` now:

- brand guide
- color guide
- pink wordmark PNG
- white wordmark PNG

Still not available in `growth-agents`:

- approved compact icon for very small placements
- approved paid-ad-specific font files
- approved Debate product screenshots
- approved screenshot treatment for ads

Those should be imported or explicitly referenced before building screenshot-led or product-led render templates.
