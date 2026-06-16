# Flux AI — "Editorial Aurora" UI/UX Redesign

**Date:** 2026-06-16
**Status:** Draft (awaiting user review)
**Owner:** thontm
**Scope:** Visual + motion redesign of the Flux AI app (Next.js 16 + MUI + Framer Motion)

## Problem

The login page ([app/login/page.tsx](../../../app/login/page.tsx) + the `.login-*` styles in [app/globals.css](../../../app/globals.css)) is strikingly polished — editorial dark theme, animated mesh glows, grain, italic Fraunces display type, glass card. But the rest of the app (chat, generate-image, analytics, config, and the [AppShell](../../../src/components/AppShell.tsx)) uses near-default MUI surfaces with a violet/pink theme. The result is a jarring quality drop the moment a user signs in. The goal is to extend the login page's design language across the entire app and add a coherent, tasteful motion system.

## Goals

1. A single **"Editorial Aurora" design system** applied consistently to every authenticated screen.
2. **Balanced motion**: lush/slow on hero, empty, and transition moments; fast/snappy and non-distracting inside dense work areas (chat thread, forms, tables).
3. Reuse what exists — MUI components, Framer Motion, the already-loaded Inter + Fraunces fonts, the violet (`#8b5cf6`) → pink (`#ec4899`) accent — rather than a rewrite.
4. Full `prefers-reduced-motion` support: every animation degrades to an instant/opacity-only state.
5. No regressions to existing behavior (auth guards, chat streaming, conversation CRUD, image gen, analytics data).

## Non-goals

- No change to data models, API routes, auth logic, or business logic.
- No migration away from MUI (we theme + layer on top, not replace).
- No new heavy animation dependency (no Lottie/GSAP). Framer Motion + CSS only.
- Not redesigning the login page itself (it's the reference, already done) — only aligning shared tokens so it reads from the same source.
- No light theme (dark-only, as today).

## Design direction: Editorial Aurora

Selected from a 3-way visual comparison (Aurora vs Minimal-Mono vs Neo-glass). Chosen: **Aurora**, synthesized with **Mono's discipline in dense areas**.

**Principle — lush frame, calm workspace:** decorative motion and glass live in the _frame_ (background, sidebar, top bar, hero/empty states). The _workspace_ where users read and type (chat thread, forms) stays calm: flat text, crisp 1px borders, only fast functional micro-interactions. This is what keeps the app beautiful _and_ usable for long sessions.

### Design tokens

Centralized so login and app share one source of truth. Introduced as CSS custom properties on `:root` in [app/globals.css](../../../app/globals.css) and mirrored into the MUI theme in [app/providers.tsx](../../../app/providers.tsx).

| Token                                       | Value                                                                              | Use                     |
| ------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------- |
| `--bg`                                      | `#09090b`                                                                          | app canvas              |
| `--surface`                                 | `rgba(24,24,27,0.55)`                                                              | glass panels            |
| `--surface-solid`                           | `#18181b`                                                                          | menus, dialogs          |
| `--border`                                  | `rgba(255,255,255,0.07)`                                                           | hairlines               |
| `--border-strong`                           | `rgba(255,255,255,0.14)`                                                           | focus/hover hairlines   |
| `--text` / `--text-soft` / `--text-mute`    | `#fafafa` / `#a1a1aa` / `#71717a`                                                  | type ramp               |
| `--accent` / `--accent-2` / `--accent-pink` | `#a78bfa` / `#8b5cf6` / `#ec4899`                                                  | accent ramp             |
| `--gradient-brand`                          | `linear-gradient(135deg,#8b5cf6,#ec4899)`                                          | logo, primary CTA, send |
| `--font-display`                            | `var(--font-fraunces)` (italic)                                                    | h1–h3, wordmark, hero   |
| `--font-sans`                               | `var(--font-inter)`                                                                | body, UI                |
| `--radius-card/-panel/-input`               | `18 / 14 / 12px`                                                                   | corners                 |
| `--shadow-card`                             | layered soft shadow (from login)                                                   | elevated glass          |
| `--glow-accent`                             | `0 4px 16px rgba(139,92,246,.45)`                                                  | gradient buttons        |
| Motion: `--ease-out`                        | `cubic-bezier(.22,1,.36,1)`                                                        | the house easing        |
| Motion durations                            | `--dur-fast 160ms`, `--dur-base 240ms`, `--dur-slow 600ms`, `--dur-ambient 14–28s` | snappy → ambient        |

## Architecture

A thin **design-system layer** added on top of MUI, then applied screen-by-screen. New units, each with one clear purpose:

| Unit               | Type          | Path (new unless noted)                                                                                          | Responsibility                                                                                                                                                                      |
| ------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Design tokens      | CSS + theme   | `app/globals.css` (extend), `app/providers.tsx` (edit)                                                           | single source of color/type/motion vars; MUI theme reads them                                                                                                                       |
| `AuroraBackground` | component     | `src/components/aurora/AuroraBackground.tsx`                                                                     | fixed, behind-everything animated mesh-glow + grain canvas; reduced-motion aware; renders once at shell level                                                                       |
| `GlassPanel`       | component     | `src/components/aurora/GlassPanel.tsx`                                                                           | reusable frosted surface (blur, border, radius, shadow) with optional hover-lift                                                                                                    |
| `motion.ts`        | tokens module | `src/components/aurora/motion.ts`                                                                                | exported Framer Motion variants (fadeUp, stagger, springSnappy, pageTransition) + a `useReducedMotionVariants` helper                                                               |
| `DisplayHeading`   | component     | `src/components/aurora/DisplayHeading.tsx`                                                                       | Fraunces italic heading wrapper for consistent hero/section titles                                                                                                                  |
| AppShell           | edit          | `src/components/AppShell.tsx`                                                                                    | mount AuroraBackground; restyle AppBar (glass), Drawer (glass), brand wordmark (Fraunces), nav active states, conversation list polish; animated drawer + route-aware active states |
| Chat               | edit          | `app/chat/page.tsx`                                                                                              | message thread polish (bubbles, assistant editorial text, streaming cursor), animated composer, empty state hero, message enter animations                                          |
| Other screens      | edit          | `app/config`, `app/generate-image`, `app/analytics`, `src/components/{ModelPicker,SettingsDialog,ThinkingPanel}` | apply GlassPanel + tokens + motion variants                                                                                                                                         |

**Data flow:** purely presentational. AuroraBackground and GlassPanel take no app state. `motion.ts` exports static config. No new context, no new fetches. Existing hooks (`useChat`, `useAuth`, `useModels`) and APIs are untouched.

### Motion language (Balanced)

- **Ambient** (`--dur-ambient`, infinite, ease-in-out): aurora blob drift, brand glow pulse. Frame only.
- **Entrance** (`--dur-base`, `--ease-out`): page mount fade-up; staggered list/card reveals (sidebar conversations, analytics cards, config sections). Stagger ~40ms/item, capped.
- **Functional** (`--dur-fast`): hover lifts, button press, input focus ring, model-pill open. Snappy, no spring overshoot in dense areas.
- **Hero** (`--dur-slow`, spring): empty-state and login-card reveals only.
- **Streaming**: assistant text uses a blinking caret; new message rows fade-up + slight y. No layout-thrash on token append.
- **Reduced motion**: `motion.ts` swaps all variants to `{opacity}` only; AuroraBackground renders static gradients (no `animation`); durations → 0. Driven by `useReducedMotion()` + a CSS `@media (prefers-reduced-motion: reduce)` block.

## Error handling / edge cases

- AuroraBackground is `position:fixed; z-index:-1; pointer-events:none` — can never intercept clicks or break layout; if it fails to mount, the app still works on the flat `--bg`.
- Glass blur is expensive; cap the number of simultaneously-blurred surfaces and use `will-change` only on ambient layers. Provide a no-blur fallback via `@supports not (backdrop-filter: blur(1px))`.
- Streaming performance: message append must not re-trigger entrance animations (animate on mount only, keyed by message id).
- Long conversation lists: stagger animation capped (e.g. first 12 items) to avoid jank.

## Testing / verification

- **Visual**: run the dev app (port 3008), drive with Playwright/Chrome MCP, screenshot each redesigned screen at desktop + mobile widths; compare against the approved mockup bar.
- **Behavior (no regressions)**: existing Vitest suite (`src/__tests__`) must still pass; manually verify auth redirect, send/stream a message, create/delete conversation, save config, generate image, load analytics.
- **Accessibility**: toggle OS reduced-motion and confirm animations degrade; check focus rings remain visible on glass; check color contrast of `--text-soft` on glass surfaces meets AA for body text.
- **Type-check + lint**: `npm run type-check` (if present) / `tsc`, ESLint clean.

## Implementation phases

1. **Foundation** — tokens in globals.css + providers.tsx; `AuroraBackground`, `GlassPanel`, `DisplayHeading`, `motion.ts`. Mount AuroraBackground in AppShell. (Unblocks everything.)
2. **App shell** — AppBar, Drawer, brand, nav, conversation list, user menu.
3. **Chat** — thread, bubbles, assistant text, ThinkingPanel, streaming caret, composer, empty-state hero, ModelPicker.
4. **Config + SettingsDialog** — GlassPanel forms, motion.
5. **Generate-image** — gallery/result polish, generation loading state.
6. **Analytics** — glass stat cards, staggered reveal, chart theming.
7. **Verification pass** — screenshots, reduced-motion, regression checks.

Each phase is independently reviewable and leaves the app in a working state.

## Open questions

None blocking. Defaults chosen: dark-only, no new deps, keep MUI, respect reduced-motion.
