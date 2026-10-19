# NIM Dark UI — design spec

Date: 2026-07-04
Branch: feat/aurora-ui-redesign

## Goal

Reskin the existing Aurora dark theme to match the NVIDIA NIM aesthetic
(build.nvidia.com): near-black green-tinted canvas, NVIDIA green `#76b900`
accents, solid green CTAs with black text, bold sans typography, and a live
animated particle background behind the whole app.

## Non-goals

- No layout/IA changes. Pages, routing, and component structure stay as-is.
- No light mode. The app is dark-only, matching the reference.
- No new dependencies. The particle field is a plain `<canvas>` + rAF.

## Palette mapping (Aurora → NIM)

| Token              | Aurora (old)         | NIM (new)                                           |
| ------------------ | -------------------- | --------------------------------------------------- |
| `--bg`             | `#09090b`            | `#0b0f0a`                                           |
| `--surface`        | `rgba(24,24,27,.55)` | `rgba(21,27,17,.6)`                                 |
| `--surface-solid`  | `#18181b`            | `#151a11`                                           |
| `--accent`         | `#a78bfa` violet     | `#76b900` NVIDIA green                              |
| `--accent-2`       | `#8b5cf6`            | `#a3e635` lime                                      |
| `--accent-pink`    | `#ec4899`            | `#00b37a` emerald (renamed role: cool counterpoint) |
| `--gradient-brand` | violet→pink          | `#76b900` → `#00b37a`                               |
| MUI `primary`      | `#8b5cf6`            | `#76b900`, contrastText near-black                  |
| MUI `secondary`    | `#ec4899`            | `#00b37a`                                           |

Buttons: solid `#76b900` with near-black text (`#0c1006`) — the NVIDIA
signature. Text on any green gradient surface (user chat bubble, avatars) is
also near-black for contrast.

## Typography

Fraunces italic serif is removed entirely (layout font import, MUI h1–h3,
`DisplayHeading`, login display font). Everything uses Inter with bold weights
and tight letter-spacing, matching NIM's technical sans look.

## Animated background

`AuroraBackground` keeps its name/class contract (tests assert `.aurora-bg`
with exactly two `.aurora-bg__mesh` layers) but is rebuilt as:

- two CSS radial glows: green top-left, emerald bottom-right (retinted meshes)
- a `<canvas class="aurora-bg__particles">` particle field: ~1 particle per
  18k px² (capped at 140), mix of 1–2.5px dots and small "+" sparkles in green
  hues, twinkling via per-particle sine phase, drifting slowly upward and
  wrapping at edges
- grain overlay retained

Behavior: DPR-aware (capped ×2), re-inits on resize, pauses the rAF loop when
the tab is hidden, and under `prefers-reduced-motion` renders a single static
frame (no loop) while CSS mesh drift is also disabled. `pointer-events: none`,
`z-index: -1`, `aria-hidden` as before. jsdom safety: bail out when
`canvas.getContext` returns null.

## Sweep of hardcoded colors

Nine files carry violet/pink hexes; each occurrence is retinted to the green
palette (where a gradient was hardcoded and `--gradient-brand` fits, the token
replaces the literal): `providers.tsx`, `AppShell.tsx`, `chat/page.tsx`,
`config/page.tsx`, `generate-image/page.tsx`, `analytics/page.tsx`
(chart gradient stops lime→green), `ModelPicker.tsx`, `ThinkingPanel.tsx`,
`SettingsDialog.tsx`. The login page is CSS-token-driven, so only
`globals.css` login tokens/meshes/submit button change.

## Testing

- Existing vitest suite must stay green (class contract preserved).
- `pnpm lint` clean.
- Visual check via dev server on the login page (public route).
