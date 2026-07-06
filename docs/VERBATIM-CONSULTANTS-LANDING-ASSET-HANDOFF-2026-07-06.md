# Verbatim Consultants Landing Asset Handoff 2026-07-06

## Purpose

Package the final available paid-ads PNG assets for Claude Code to use on the Verbatim `/consultants` landing page.

Claude Code is working in the separate product repo:

```text
C:\Users\Arun\ai-highlighter
```

Do not modify `ai-highlighter` from this repo.

## Handoff Directory

Copied assets are in:

```text
output/consultants-landing-assets-2026-07-06/
```

These PNGs are local handoff artifacts. Do not commit them to `growth-agents` unless explicitly requested.

## Selected Assets

No distinct receipt/proof-style PNG was found in `assets/paid-ads/selected-candidates`.

The two square first-flight ads are the best available landing-page assets:

1. Concept 01 for the hero visual.
2. Concept 04 for the checklist/review-card visual.

## Asset Map

| Page section | Source PNG | Copied output path | Intended ai-highlighter destination | Recommended public URL | Dimensions | Aspect ratio |
|---|---|---|---|---|---:|---|
| Hero visual | `assets/paid-ads/selected-candidates/verbatim_meta_01_confident-draft_editorial-collage_selected-candidate-04_finalized-logo_1x1_v01.png` | `output/consultants-landing-assets-2026-07-06/verbatim-consultants-hero.png` | `C:\Users\Arun\ai-highlighter\public\consultants\verbatim-consultants-hero.png` | `/consultants/verbatim-consultants-hero.png` | `1080x1080` | `1:1` |
| Checklist / review-card visual | `assets/paid-ads/selected-candidates/verbatim_meta_04_polished-pressure-tested_editorial-collage_selected-candidate-02_official-logo_1x1_v03.png` | `output/consultants-landing-assets-2026-07-06/verbatim-consultants-checklist.png` | `C:\Users\Arun\ai-highlighter\public\consultants\verbatim-consultants-checklist.png` | `/consultants/verbatim-consultants-checklist.png` | `1254x1254` | `1:1` |

## Receipt / Proof Visual

Status: not available.

There is no separate final receipt/proof-style PNG in the current selected-candidates folder. If the `/consultants` page needs a proof or receipt-style section, use the Concept 04 checklist image for now or design that section natively in the product repo.

Do not generate a new proof image from this handoff.

## Font Finding

Documented Verbatim brand fonts in `brand/verbatim/brand-guide.md`:

- DM Sans: body, navigation, UI controls, blog post body, FAQ, dashboard, Surface cards.
- Bebas Neue: hero H1 on the main homepage.
- Playfair Display: reserved for editorial moments.
- Courier Prime: mono, code, and receipt-style copy.
- Arial Black: selected heavy display headlines.
- Georgia: one homepage italic intro quote.

Exact font used inside the final selected paid-ad PNGs: unknown.

The deterministic SVG renderer in `scripts/render-paid-ads-template.ts` used system fallbacks such as `Georgia, 'Times New Roman', serif` for editorial serif text and `Arial, Helvetica, sans-serif` for supporting text, but the final selected square PNGs were generated/finalized assets and no exact ad-image font file is documented in `growth-agents`.

## Notes For Claude Code

- Use these assets as real page visuals rather than placeholders.
- Copy the PNGs from the handoff directory into `ai-highlighter/public/consultants/`.
- Keep image usage responsive and do not stretch the square assets out of aspect ratio.
- If a section needs a different crop, use CSS object-fit or layout framing rather than editing the original PNGs.
- The assets already include the official Verbatim logo treatment.
- The first-flight campaign is desktop/extension-focused, so landing page copy should not imply mobile Chrome installation.

## Do Not Do

- Do not modify `ai-highlighter` from `growth-agents`.
- Do not generate new images from this handoff.
- Do not edit these PNGs in `growth-agents`.
- Do not add PNGs to git unless explicitly requested.
- Do not change Meta packet status from this handoff.
