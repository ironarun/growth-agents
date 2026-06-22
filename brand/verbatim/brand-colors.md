# Verbatim brand colors

Canonical color reference. The brand palette is small and locked.
CLAUDE.md `Branding` section (the standing architectural decision) is
authoritative for primary brand pink and its supporting shades; this
document expands that with the systematic neutrals, status colors,
and admin-dashboard tier pills that ship across `app/` and `extension/`.

Casing: all hex values in code should be **lowercase** (`#f12258`,
`#0a0a0a`). Both casings render identically in browsers, but mixed
casing makes grep harder. The codebase has some legacy uppercase usage
(`#0A0A0A` on FAQ/About/Privacy/Terms); new code uses lowercase.

Tailwind: do NOT use Tailwind's named pink palette (`pink-50`,
`pink-600`, etc.). Use arbitrary value brackets with the exact brand
hex: `bg-[#fff0f2]` / `text-[#f12258]`. Same applies to amber, blue,
green, etc. — bracket-arbitrary, not named.

---

## Primary brand pink

The single locked brand color. Used everywhere a brand accent is
needed — buttons, headings, key numbers, "V" button icon, wordmark
accent, focus rings on brand surfaces, "MOST POPULAR" pricing badge.

| Token        | Role                | HEX        | RGB             |
|--------------|---------------------|------------|-----------------|
| Brand pink   | Primary accent      | `#f12258`  | `241, 34, 88`   |

---

## Brand pink supporting shades

These are the only adjacent shades CLAUDE.md authorizes. Anything
else is drift.

| Token         | Role                                                                                    | HEX        | RGB             |
|---------------|-----------------------------------------------------------------------------------------|------------|-----------------|
| Pink surface  | Light backdrop for pink-bordered cards. Insights tab, disclaimer/info boxes, MOST POPULAR card halo, dashboard subscribed banner, BYOK onboarding card. | `#fff0f2`  | `255, 240, 242` |
| Pink hover    | Darker hover state for brand-pink buttons.                                              | `#d4154d`  | `212, 21, 77`   |

---

## Highlight tint (not strictly brand)

Used for user-selectable highlight color in the extension's locker.
Visually adjacent to brand pink but functionally separate — users pick
from a small set of tints, and this is one option. Not treated as a
brand color in design decisions.

| Token            | Role                                  | HEX        | RGB             |
|------------------|---------------------------------------|------------|-----------------|
| Highlight pink   | User-selectable highlight color tint  | `#ffb6c1`  | `255, 182, 193` |

---

## Neutrals (marketing + product surfaces)

Used systematically across all marketing pages (home, pricing, FAQ,
About, Privacy, Terms, blog) and product surfaces (dashboard, admin,
extension panel chrome).

| Token             | Role                                                                | HEX        | RGB                |
|-------------------|---------------------------------------------------------------------|------------|--------------------|
| Ink               | Body text, dark surfaces. `INK` constant in pricing/admin.          | `#0a0a0a`  | `10, 10, 10`       |
| Footer black      | Slightly darker than ink for footer backgrounds.                    | `#050505`  | `5, 5, 5`          |
| Hairline dark     | Borders on dark pages.                                              | `#1a1a1a`  | `26, 26, 26`       |
| Hairline darker   | Footer dividers.                                                    | `#111111`  | `17, 17, 17`       |
| Muted             | Secondary text (both light and dark backgrounds). `MUTED` constant. | `#555555`  | `85, 85, 85`       |
| Muted dim         | Fine-print legal copy on dark backgrounds.                          | `#333333`  | `51, 51, 51`       |
| Border light      | Card borders on white surfaces. `BORDER` constant.                  | `#e8e8e8`  | `232, 232, 232`    |
| White             | Surfaces on light pages, text on dark pages.                        | `#ffffff`  | `255, 255, 255`    |
| Off-white         | Background on the rebuilt admin dashboard.                          | `#fafafa`  | `250, 250, 250`    |
| Body bg          | Blog post body background.                                          | `#0e0e0e`  | `14, 14, 14`       |

---

## Status colors (alerts, validation, banners)

Used for system feedback — alerts, validation, success/error states.
Not interchangeable with brand pink. Pink is for brand presence;
status colors are for state communication.

### Error (red)

| Token            | Role                                                    | HEX        | RGB              |
|------------------|---------------------------------------------------------|------------|------------------|
| Error bg         | Billing-leak alert, form validation errors.             | `#fee2e2`  | `254, 226, 226`  |
| Error text       | Foreground inside red alert blocks.                     | `#991b1b`  | `153, 27, 27`    |

### Warning (amber)

| Token            | Role                                                    | HEX        | RGB              |
|------------------|---------------------------------------------------------|------------|------------------|
| Warning bg       | Search-spike alert, stale-pricing alert, capacity warnings. | `#fef3c7`  | `254, 243, 199`  |
| Warning text     | Foreground inside amber alert blocks.                   | `#92400e`  | `146, 64, 14`    |

### Success (green)

| Token            | Role                                                    | HEX        | RGB              |
|------------------|---------------------------------------------------------|------------|------------------|
| Success bg       | "All systems nominal" + success states.                 | `#d1fae5`  | `209, 250, 229`  |
| Success text     | Foreground inside green success blocks.                 | `#065f46`  | `6, 95, 70`      |

---

## Admin dashboard tier pills

Categorical UI colors for tier identification in the rebuilt admin
dashboard (2026-05-27). Distinct from brand pink — these are
classification chips, not brand surfaces. Not used outside the admin
dashboard.

| Tier         | Background  | RGB              | Foreground  | RGB             |
|--------------|-------------|------------------|-------------|-----------------|
| BYOK         | `#f3e8ff`   | `243, 232, 255`  | `#6b21a8`   | `107, 33, 168`  |
| Start        | `#f3f4f6`   | `243, 244, 246`  | `#374151`   | `55, 65, 81`    |
| Pro          | `#dbeafe`   | `219, 234, 254`  | `#1e40af`   | `30, 64, 175`   |
| Power        | `#fef3c7`   | `254, 243, 199`  | `#92400e`   | `146, 64, 14`   |
| Trial        | `#d1fae5`   | `209, 250, 229`  | `#065f46`   | `6, 95, 70`     |
| Unsubscribed | `#f9fafb`   | `249, 250, 251`  | `#9ca3af`   | `156, 163, 175` |

---

## Status pills (model registry)

Color-coded pills used in the admin dashboard's model registry table
to communicate model availability state.

| Status      | Background  | RGB              | Foreground  | RGB             |
|-------------|-------------|------------------|-------------|-----------------|
| Active      | `#d1fae5`   | `209, 250, 229`  | `#065f46`   | `6, 95, 70`     |
| Hidden      | `#f3f4f6`   | `243, 244, 246`  | `#374151`   | `55, 65, 81`    |
| Removed     | `#fee2e2`   | `254, 226, 226`  | `#991b1b`   | `153, 27, 27`   |
| No pricing  | `#fef3c7`   | `254, 243, 199`  | `#92400e`   | `146, 64, 14`   |

---

## Usage rules

These restate and expand the CLAUDE.md `Branding` standing decision.

1. **Brand pink (`#f12258`) is the only "Verbatim color".** Anything
   that needs to feel branded uses this hex or one of its two
   authorized supporting shades (`#fff0f2`, `#d4154d`).
2. **No Tailwind named palette colors.** Use bracket-arbitrary values
   with the exact hex: `bg-[#fff0f2]`, `text-[#f12258]`,
   `border-[#d4154d]`. Same rule for neutrals, status colors, and
   tier pills — write the hex.
3. **Status colors are not interchangeable with brand pink.** Pink is
   for brand presence. Red/amber/green are for state communication.
   Never use brand pink to communicate an error or warning.
4. **Tier pill colors stay confined to the admin dashboard.** They're
   classification chips for an internal audience. Don't reuse them in
   marketing surfaces or user-facing product chrome.
5. **Casing is lowercase.** New code writes hex in lowercase
   (`#f12258`, not `#F12258`). Legacy uppercase usage on
   FAQ/About/Privacy/Terms is grandfathered; replace opportunistically
   when touching those files for other reasons.
6. **Highlight pink (`#ffb6c1`) is not brand.** It's one of several
   user-pickable highlight tints. Don't treat it as part of the brand
   palette in design decisions.

---

## Change log

| Date        | Change                                                  |
|-------------|---------------------------------------------------------|
| 2026-05-27  | Initial document. Captured existing palette per CLAUDE.md + audited usage across `app/`. Tier pills + status colors added with admin-dashboard rebuild (PR B). |
