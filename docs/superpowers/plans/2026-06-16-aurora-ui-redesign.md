# Editorial Aurora UI/UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the login page's "Editorial Aurora" aesthetic and a balanced motion system across every authenticated screen of Flux AI.

**Architecture:** A thin design-system layer on top of MUI — centralized CSS-variable tokens consumed by both `globals.css` and the MUI theme, plus four reusable primitives (`AuroraBackground`, `GlassPanel`, `DisplayHeading`, `motion.ts`). Screens are then restyled to use these primitives. No data/API/auth/business-logic changes.

**Tech Stack:** Next.js 16 (App Router), MUI 6, Framer Motion, Inter + Fraunces (already loaded via `next/font`), TypeScript strict.

**Spec:** [docs/superpowers/specs/2026-06-16-aurora-ui-redesign-design.md](../specs/2026-06-16-aurora-ui-redesign-design.md)

---

## Verification philosophy

This is visual work. Pure unit-TDD adds little to CSS, so verification is:

- **Regression guard:** the existing Vitest suite (`src/__tests__`) must stay green after every task. Run `npx vitest run` before each commit.
- **Smoke tests:** foundation primitives get a light render test (mounts, applies className, respects a `reducedMotion` prop) — real code provided below.
- **Visual check:** after each screen task, run the app (port 3008) and screenshot via Chrome/Playwright MCP at desktop (1280) + mobile (390) widths; compare to the approved mockup bar.
- **A11y check:** toggle `prefers-reduced-motion` and confirm animations degrade to opacity/instant; confirm focus rings stay visible on glass.

Run `npx tsc --noEmit` and `npx eslint .` clean before each commit.

## File structure map

| File                                              | New/Modify | Responsibility                                                                   |
| ------------------------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| `app/globals.css`                                 | Modify     | Add `:root` Aurora tokens + `.aurora-bg` styles/keyframes + reduced-motion block |
| `app/providers.tsx`                               | Modify     | Point MUI theme typography/colors at tokens; display font for headings           |
| `src/components/aurora/motion.ts`                 | Create     | Framer Motion variants + reduced-motion helper                                   |
| `src/components/aurora/AuroraBackground.tsx`      | Create     | Fixed animated mesh-glow + grain canvas                                          |
| `src/components/aurora/GlassPanel.tsx`            | Create     | Reusable frosted surface w/ optional hover-lift                                  |
| `src/components/aurora/DisplayHeading.tsx`        | Create     | Fraunces italic heading wrapper                                                  |
| `src/components/aurora/__tests__/aurora.test.tsx` | Create     | Smoke tests for primitives                                                       |
| `src/components/AppShell.tsx`                     | Modify     | Mount AuroraBackground; restyle AppBar/Drawer/brand/nav/menu/conversation list   |
| `app/chat/page.tsx`                               | Modify     | Thread, bubbles, assistant text, streaming caret, composer, empty-state hero     |
| `src/components/ThinkingPanel.tsx`                | Modify     | Glass styling + spinner aligned to tokens                                        |
| `src/components/ModelPicker.tsx`                  | Modify     | Glass dropdown, token colors                                                     |
| `app/config/page.tsx`                             | Modify     | GlassPanel form, motion reveal                                                   |
| `src/components/SettingsDialog.tsx`               | Modify     | Glass dialog, token colors                                                       |
| `app/generate-image/page.tsx`                     | Modify     | Glass result/gallery, generation loading state                                   |
| `app/analytics/page.tsx`                          | Modify     | Glass stat cards, staggered reveal                                               |

---

## Phase 1 — Foundation

### Task 1: Aurora design tokens in globals.css

**Files:**

- Modify: `app/globals.css` (prepend a shared `:root` token block + append `.aurora-bg` styles; do not touch existing `.login-*` rules)

- [ ] **Step 1: Add shared token block.** At the very top of `app/globals.css` (before the existing login `:root`), add:

```css
/* =========================================================
   Flux AI — Aurora design tokens (shared: app + login)
   ========================================================= */
:root {
  --bg: #09090b;
  --surface: rgba(24, 24, 27, 0.55);
  --surface-solid: #18181b;
  --border: rgba(255, 255, 255, 0.07);
  --border-strong: rgba(255, 255, 255, 0.14);
  --text: #fafafa;
  --text-soft: #a1a1aa;
  --text-mute: #71717a;
  --accent: #a78bfa;
  --accent-2: #8b5cf6;
  --accent-pink: #ec4899;
  --gradient-brand: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
  --radius-card: 18px;
  --radius-panel: 14px;
  --radius-input: 12px;
  --shadow-card:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 30px 60px -20px rgba(0, 0, 0, 0.55), 0 8px 24px rgba(0, 0, 0, 0.35);
  --glow-accent: 0 4px 16px rgba(139, 92, 246, 0.45);
  --ease-out: cubic-bezier(0.22, 1, 0.36, 1);
  --dur-fast: 160ms;
  --dur-base: 240ms;
  --dur-slow: 600ms;
}
```

- [ ] **Step 2: Append AuroraBackground styles.** At the end of `app/globals.css`, add:

```css
/* ---- Aurora app background (shared canvas behind the app shell) ---- */
.aurora-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
  background: var(--bg);
}
.aurora-bg__mesh {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.5;
  will-change: transform;
}
.aurora-bg__mesh--violet {
  width: 720px;
  height: 720px;
  top: -260px;
  left: -180px;
  background: radial-gradient(
    circle,
    rgba(139, 92, 246, 0.5) 0%,
    rgba(139, 92, 246, 0) 65%
  );
  animation: aurora-drift 24s ease-in-out infinite;
}
.aurora-bg__mesh--pink {
  width: 640px;
  height: 640px;
  bottom: -240px;
  right: -200px;
  background: radial-gradient(
    circle,
    rgba(236, 72, 153, 0.3) 0%,
    rgba(236, 72, 153, 0) 65%
  );
  animation: aurora-drift 28s ease-in-out infinite reverse;
}
.aurora-bg__grain {
  position: absolute;
  inset: 0;
  opacity: 0.04;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.4 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}
@keyframes aurora-drift {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  50% {
    transform: translate3d(40px, -30px, 0) scale(1.06);
  }
}
.aurora-bg[data-static="true"] .aurora-bg__mesh {
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  .aurora-bg__mesh {
    animation: none !important;
  }
}
```

- [ ] **Step 3: Verify build.** Run: `npx tsc --noEmit && npx eslint app/globals.css || true` then `npx vitest run`. Expected: tsc clean, vitest green (CSS-only change, no test impact).

- [ ] **Step 4: Commit.**

```bash
git add app/globals.css
git commit -m "feat(ui): add Aurora design tokens + background styles"
```

### Task 2: Motion variants module

**Files:**

- Create: `src/components/aurora/motion.ts`

- [ ] **Step 1: Write the module.**

```ts
import type { Variants, Transition } from "framer-motion";

/** House easing — matches --ease-out in globals.css. */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export const DUR = { fast: 0.16, base: 0.24, slow: 0.6 } as const;

/** Standard entrance: fade up. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE_OUT },
  },
};

/** Container that staggers its children's entrances. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.02 } },
};

/** Snappy spring for functional micro-interactions (no overshoot in dense areas). */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 34,
};

/** Per-page mount/exit used with AnimatePresence. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: DUR.fast, ease: EASE_OUT },
  },
};

/**
 * Returns variants stripped to opacity-only when the user prefers reduced
 * motion. Pass the boolean from framer-motion's useReducedMotion().
 */
export function respectMotion(variants: Variants, reduce: boolean): Variants {
  if (!reduce) return variants;
  const flat: Variants = {};
  for (const key of Object.keys(variants)) {
    const state = variants[key];
    if (state && typeof state === "object" && !Array.isArray(state)) {
      const { opacity, transition } = state as Record<string, unknown>;
      flat[key] = {
        opacity: opacity ?? 1,
        transition: { duration: 0, ...(transition as object) },
      };
    } else {
      flat[key] = state;
    }
  }
  return flat;
}
```

- [ ] **Step 2: Verify.** Run: `npx tsc --noEmit`. Expected: clean. (Tested via Task 5.)

- [ ] **Step 3: Commit.**

```bash
git add src/components/aurora/motion.ts
git commit -m "feat(ui): add Aurora motion variants"
```

### Task 3: AuroraBackground component

**Files:**

- Create: `src/components/aurora/AuroraBackground.tsx`

- [ ] **Step 1: Write the component.**

```tsx
"use client";

import { useReducedMotion } from "framer-motion";

/**
 * Fixed, behind-everything animated mesh-glow canvas. Renders once at the
 * shell level. Never intercepts pointer events (z-index:-1, pointer-events:none
 * via .aurora-bg). Degrades to static gradients under reduced-motion.
 */
export default function AuroraBackground() {
  const reduce = useReducedMotion();
  return (
    <div
      className="aurora-bg"
      data-static={reduce ? "true" : undefined}
      aria-hidden
    >
      <div className="aurora-bg__mesh aurora-bg__mesh--violet" />
      <div className="aurora-bg__mesh aurora-bg__mesh--pink" />
      <div className="aurora-bg__grain" />
    </div>
  );
}
```

- [ ] **Step 2: Verify.** Run: `npx tsc --noEmit`. Expected: clean. (Tested via Task 5.)

- [ ] **Step 3: Commit.**

```bash
git add src/components/aurora/AuroraBackground.tsx
git commit -m "feat(ui): add AuroraBackground component"
```

### Task 4: GlassPanel + DisplayHeading components

**Files:**

- Create: `src/components/aurora/GlassPanel.tsx`
- Create: `src/components/aurora/DisplayHeading.tsx`

- [ ] **Step 1: Write GlassPanel.**

```tsx
"use client";

import { Box, type BoxProps } from "@mui/material";

interface GlassPanelProps extends BoxProps {
  /** Adds a hover lift + border brighten. Use on clickable cards only. */
  hover?: boolean;
}

/** Reusable frosted surface aligned to Aurora tokens. */
export default function GlassPanel({ hover, sx, ...rest }: GlassPanelProps) {
  return (
    <Box
      {...rest}
      sx={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-panel)",
        backdropFilter: "blur(14px)",
        boxShadow: "var(--shadow-card)",
        transition:
          "transform var(--dur-base) var(--ease-out), border-color var(--dur-fast) var(--ease-out)",
        ...(hover && {
          cursor: "pointer",
          "&:hover": {
            transform: "translateY(-3px)",
            borderColor: "var(--border-strong)",
          },
        }),
        "@supports not (backdrop-filter: blur(1px))": {
          background: "var(--surface-solid)",
        },
        ...sx,
      }}
    />
  );
}
```

- [ ] **Step 2: Write DisplayHeading.**

```tsx
import { Typography, type TypographyProps } from "@mui/material";

/** Fraunces italic display heading for hero/section titles. */
export default function DisplayHeading({ sx, ...rest }: TypographyProps) {
  return (
    <Typography
      {...rest}
      sx={{
        fontFamily: "var(--font-fraunces), Georgia, serif",
        fontStyle: "italic",
        fontWeight: 600,
        letterSpacing: "-0.01em",
        ...sx,
      }}
    />
  );
}
```

- [ ] **Step 3: Verify.** Run: `npx tsc --noEmit`. Expected: clean.

- [ ] **Step 4: Commit.**

```bash
git add src/components/aurora/GlassPanel.tsx src/components/aurora/DisplayHeading.tsx
git commit -m "feat(ui): add GlassPanel + DisplayHeading primitives"
```

### Task 5: Smoke tests for primitives

**Files:**

- Create: `src/components/aurora/__tests__/aurora.test.tsx`

- [ ] **Step 1: Inspect the test setup.** Read `src/__tests__/setup.ts` and `vitest.config.ts` to confirm the test environment (jsdom) and any render helpers. If `@testing-library/react` is not a dependency, add it: `npm i -D @testing-library/react`.

- [ ] **Step 2: Write the failing test.**

```tsx
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import AuroraBackground from "../AuroraBackground";
import GlassPanel from "../GlassPanel";
import DisplayHeading from "../DisplayHeading";
import { respectMotion, fadeUp } from "../motion";

describe("aurora primitives", () => {
  it("AuroraBackground renders the mesh layers and is aria-hidden", () => {
    const { container } = render(<AuroraBackground />);
    expect(container.querySelector(".aurora-bg")).not.toBeNull();
    expect(container.querySelectorAll(".aurora-bg__mesh").length).toBe(2);
    expect(
      container.querySelector(".aurora-bg")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("GlassPanel renders children and forwards className", () => {
    const { getByText, container } = render(
      <GlassPanel className="probe">hi</GlassPanel>,
    );
    expect(getByText("hi")).toBeTruthy();
    expect(container.querySelector(".probe")).not.toBeNull();
  });

  it("DisplayHeading renders its text", () => {
    const { getByText } = render(<DisplayHeading>Title</DisplayHeading>);
    expect(getByText("Title")).toBeTruthy();
  });

  it("respectMotion strips transforms to opacity-only when reduced", () => {
    const reduced = respectMotion(fadeUp, true);
    expect((reduced.hidden as Record<string, unknown>).y).toBeUndefined();
    expect((reduced.show as Record<string, unknown>).opacity).toBe(1);
  });
});
```

- [ ] **Step 3: Run to verify it fails (then passes).** Run: `npx vitest run src/components/aurora`. Expected: passes once components from Tasks 2–4 exist; if `@testing-library/react` missing, install per Step 1 and re-run.

- [ ] **Step 4: Commit.**

```bash
git add src/components/aurora/__tests__/aurora.test.tsx package.json package-lock.json
git commit -m "test(ui): smoke tests for Aurora primitives"
```

### Task 6: Wire tokens into the MUI theme

**Files:**

- Modify: `app/providers.tsx` (the `createTheme` call)

- [ ] **Step 1: Point typography display font + ensure radius/colors match tokens.** In `app/providers.tsx`, update the `typography` block so display headings use Fraunces, and confirm palette hexes equal the tokens (they already do). Replace the `typography` object's `h1`–`h3` entries:

```ts
    h1: { fontFamily: "var(--font-fraunces), Georgia, serif", fontStyle: "italic", fontWeight: 600, letterSpacing: "-0.02em" },
    h2: { fontFamily: "var(--font-fraunces), Georgia, serif", fontStyle: "italic", fontWeight: 600, letterSpacing: "-0.02em" },
    h3: { fontFamily: "var(--font-fraunces), Georgia, serif", fontStyle: "italic", fontWeight: 600, letterSpacing: "-0.01em" },
```

- [ ] **Step 2: Add a glass default for Menu/Dialog Paper** (so MUI surfaces inherit Aurora). Add to the `components` object:

```ts
    MuiMenu: {
      styleOverrides: {
        paper: {
          background: "var(--surface-solid)",
          border: "1px solid var(--border)",
          backdropFilter: "blur(20px)",
        },
      },
    },
```

- [ ] **Step 3: Verify.** Run: `npx tsc --noEmit && npx vitest run`. Expected: clean + green. Then `npm run dev` is already running on 3008 — confirm no console errors on `/login` (headings now Fraunces italic).

- [ ] **Step 4: Commit.**

```bash
git add app/providers.tsx
git commit -m "feat(ui): drive MUI theme from Aurora tokens"
```

---

## Phase 2 — App shell

### Task 7: Mount AuroraBackground + restyle the shell frame

**Files:**

- Modify: `src/components/AppShell.tsx`

- [ ] **Step 1: Mount the background.** Import at top: `import AuroraBackground from "./aurora/AuroraBackground";` and `import DisplayHeading from "./aurora/DisplayHeading";`. Render `<AuroraBackground />` as the first child inside the outermost `<Box>` of the authenticated return (line ~109), and make that Box's background `transparent` so the fixed canvas shows through.

- [ ] **Step 2: Replace the brand wordmark.** Swap the `<Typography variant="h6">Flux AI</Typography>` (line ~149) for `<DisplayHeading sx={{ fontSize: 20, display: { xs: "none", sm: "block" } }}>Flux AI</DisplayHeading>`.

- [ ] **Step 3: Glass AppBar + Drawer already use blur — align to tokens.** Replace hardcoded `rgba(...)` in the AppBar `sx` (line ~114) and Drawer `PaperProps` (line ~268) backgrounds with `var(--surface)` / `var(--surface-solid)` and borders with `var(--border)`. Keep `backdropFilter`.

- [ ] **Step 4: Animate nav active state.** Wrap nav `ListItemButton` active background in a `motion.div` layout indicator OR add `transition: "background var(--dur-fast) var(--ease-out)"` to the `sx`. Keep the existing conversation-list AnimatePresence (already good).

- [ ] **Step 5: Verify (visual + regression).** Run: `npx tsc --noEmit && npx vitest run`. Then screenshot `http://localhost:3008/chat` (after logging in) at 1280px and 390px via Chrome/Playwright MCP. Confirm: aurora drifts behind, glass top bar + drawer, Fraunces wordmark, no pointer-event blockage (links clickable). Toggle reduced-motion → aurora static.

- [ ] **Step 6: Commit.**

```bash
git add src/components/AppShell.tsx
git commit -m "feat(ui): Aurora app shell — background, glass frame, display wordmark"
```

---

## Phase 3 — Chat

### Task 8: Message thread + bubbles + streaming

**Files:**

- Modify: `app/chat/page.tsx`
- Modify: `src/components/ThinkingPanel.tsx`

- [ ] **Step 1: Read the current chat page.** Read `app/chat/page.tsx` in full to locate the message-render map, the composer, and the empty state. Identify the user/assistant row components.

- [ ] **Step 2: Style user bubbles.** User messages: gradient glass bubble, right-aligned, asymmetric corner. Apply via `sx`:

```ts
{
  alignSelf: "flex-end",
  background: "var(--gradient-brand)",
  color: "#fff",
  px: 1.9, py: 1.4,
  borderRadius: "15px 15px 4px 15px",
  boxShadow: "0 6px 18px rgba(124,58,237,0.3)",
  fontSize: 14, lineHeight: 1.6, maxWidth: "80%",
}
```

- [ ] **Step 3: Style assistant text as open editorial text** (no bubble): `color: "var(--text)"`, `fontSize: 14.5`, `lineHeight: 1.7`, with a small gradient avatar to the left (reuse the 28px gradient square from the mockup).

- [ ] **Step 4: Add the streaming caret.** While a message is streaming, append a blinking caret span. Add a keyframe to globals.css if not present:

```css
@keyframes aurora-blink {
  0%,
  50% {
    opacity: 1;
  }
  51%,
  100% {
    opacity: 0;
  }
}
.aurora-caret {
  display: inline-block;
  width: 7px;
  height: 15px;
  background: var(--accent);
  margin-left: 2px;
  vertical-align: -2px;
  border-radius: 1px;
  animation: aurora-blink 1s steps(1) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .aurora-caret {
    animation: none;
  }
}
```

Render `<span className="aurora-caret" />` after the streaming message's text.

- [ ] **Step 5: Animate message entrance.** Wrap each message row in `motion.div` with `variants={respectMotion(fadeUp, reduce)}` keyed by message id, animate on mount only (`initial="hidden" animate="show"`), so token-append during streaming does NOT re-trigger it.

- [ ] **Step 6: Restyle ThinkingPanel.** In `src/components/ThinkingPanel.tsx`, set the container to glass tokens (`background: var(--surface)`, `border: 1px solid rgba(139,92,246,0.18)`, accent text) and the spinner to `--accent`.

- [ ] **Step 7: Verify.** `npx tsc --noEmit && npx vitest run`. Send a real message on `/chat`, watch it stream. Screenshot. Confirm: user gradient bubbles, editorial assistant text, caret blinks while streaming and stops after, thinking panel glassy, no animation re-trigger on token append.

- [ ] **Step 8: Commit.**

```bash
git add app/chat/page.tsx src/components/ThinkingPanel.tsx app/globals.css
git commit -m "feat(ui): Aurora chat thread, bubbles, streaming caret"
```

### Task 9: Composer + empty-state hero + ModelPicker

**Files:**

- Modify: `app/chat/page.tsx`
- Modify: `src/components/ModelPicker.tsx`

- [ ] **Step 1: Restyle the composer.** Glass input row: `background: var(--surface)`, `border: 1px solid var(--border)`, `borderRadius: 16`, `backdropFilter: blur(10px)`, focus-within → `borderColor: var(--accent)`. Gradient send button (34px, `var(--gradient-brand)`, `boxShadow: var(--glow-accent)`) with a `whileTap={{ scale: 0.92 }}` motion wrapper.

- [ ] **Step 2: Build the empty-state hero.** When there are no messages, render a centered hero: `<DisplayHeading sx={{ fontSize: 40 }}>What shall we explore?</DisplayHeading>` + a row of 3 suggestion `GlassPanel hover` chips. Animate in with `staggerContainer` + `fadeUp` children (hero motion = the lush moment, `DUR.slow` spring acceptable here).

- [ ] **Step 3: Restyle ModelPicker.** In `src/components/ModelPicker.tsx`, give the trigger the `.chip` look (pill, glass) and the dropdown the glass Menu styling (inherited from theme Task 6; add token colors for list items + active state `rgba(139,92,246,0.14)`).

- [ ] **Step 4: Verify.** `npx tsc --noEmit && npx vitest run`. On `/chat`: start a new chat → hero with staggered chips; click a chip → fills composer; open model picker → glass dropdown. Screenshot empty + active states, desktop + mobile. Reduced-motion check.

- [ ] **Step 5: Commit.**

```bash
git add app/chat/page.tsx src/components/ModelPicker.tsx
git commit -m "feat(ui): Aurora composer, empty-state hero, model picker"
```

---

## Phase 4 — Config + Settings

### Task 10: Config page + SettingsDialog

**Files:**

- Modify: `app/config/page.tsx`
- Modify: `src/components/SettingsDialog.tsx`

- [ ] **Step 1: Read both files** to locate the form fields and layout.

- [ ] **Step 2: Wrap config form in GlassPanel.** Replace the outer card container with `<GlassPanel sx={{ p: 4, maxWidth: 520, mx: "auto" }}>`. Title via `<DisplayHeading>`. Animate the panel in with `fadeUp` (mount).

- [ ] **Step 3: Stagger the fields.** Wrap the field stack in `motion.div` with `staggerContainer`; wrap each field in `motion.div` with `fadeUp` child. Respect reduced motion.

- [ ] **Step 4: Restyle SettingsDialog.** Dialog Paper → glass tokens (`var(--surface-solid)`, blur, `var(--border)`); title via DisplayHeading; primary action uses gradient button (already themed). Keep all existing form logic/handlers untouched.

- [ ] **Step 5: Verify.** `npx tsc --noEmit && npx vitest run`. Visit `/config`; open Settings from the shell menu. Confirm glass panels, staggered fields, save still works (submit and confirm the existing success path). Screenshot. Reduced-motion check.

- [ ] **Step 6: Commit.**

```bash
git add app/config/page.tsx src/components/SettingsDialog.tsx
git commit -m "feat(ui): Aurora config page + settings dialog"
```

---

## Phase 5 — Generate Image

### Task 11: Generate-image screen

**Files:**

- Modify: `app/generate-image/page.tsx`

- [ ] **Step 1: Read the file** to locate the prompt form, the result/gallery area, and the loading state.

- [ ] **Step 2: Glass-ify the prompt panel and result cards.** Prompt input panel → `GlassPanel`; each generated image → `GlassPanel hover` with rounded image, subtle zoom on hover (`img { transition: transform var(--dur-base); } &:hover img { transform: scale(1.03); }`).

- [ ] **Step 3: Aurora generation loading state.** Replace the plain spinner during generation with a shimmer placeholder card: a `GlassPanel` with an animated gradient sweep (add `@keyframes aurora-shimmer` to globals.css — `background-position` sweep; respect reduced-motion by freezing).

- [ ] **Step 4: Stagger gallery reveal.** Wrap the results grid in `staggerContainer`, each card a `fadeUp` child.

- [ ] **Step 5: Verify.** `npx tsc --noEmit && npx vitest run`. Visit `/generate-image`; generate an image (or mock); confirm shimmer while loading, staggered card reveal, hover zoom. Screenshot. Reduced-motion check.

- [ ] **Step 6: Commit.**

```bash
git add app/generate-image/page.tsx app/globals.css
git commit -m "feat(ui): Aurora generate-image screen"
```

---

## Phase 6 — Analytics

### Task 12: Analytics dashboard

**Files:**

- Modify: `app/analytics/page.tsx`

- [ ] **Step 1: Read the file** to locate the stat cards and any charts.

- [ ] **Step 2: Glass stat cards + staggered reveal.** Replace stat card containers with `GlassPanel`; numbers in `DisplayHeading` (Fraunces); wrap the grid in `staggerContainer`, cards as `fadeUp` children.

- [ ] **Step 3: Theme charts to tokens.** If charts use a color array, set series to `["#8b5cf6", "#ec4899", "#a78bfa"]`, grid lines to `var(--border)`, text to `var(--text-soft)`. Ensure tooltips use `--surface-solid`.

- [ ] **Step 4: Verify.** `npx tsc --noEmit && npx vitest run`. Visit `/analytics`; confirm glass cards stagger in, Fraunces numbers, charts on-brand. Screenshot desktop + mobile. Reduced-motion check.

- [ ] **Step 5: Commit.**

```bash
git add app/analytics/page.tsx
git commit -m "feat(ui): Aurora analytics dashboard"
```

---

## Phase 7 — Verification pass

### Task 13: Cross-screen verification + polish

**Files:** none (verification) — or small fixes surfaced here.

- [ ] **Step 1: Full regression.** Run `npx tsc --noEmit && npx eslint . && npx vitest run`. All clean/green.

- [ ] **Step 2: Behavior regression checklist (manual on port 3008).** Confirm each still works: login redirect, send + stream a chat message, create + delete a conversation, save config, open settings + save, generate an image, load analytics. Note any breakage and fix in this task.

- [ ] **Step 3: Visual sweep.** Screenshot all five screens at 1280px and 390px. Compare against the approved chat mockup bar for consistency (glass, aurora, Fraunces headings, gradient accents). Fix inconsistencies.

- [ ] **Step 4: Reduced-motion sweep.** Enable OS reduced-motion; reload each screen; confirm aurora static, no entrance transforms, caret/shimmer frozen, app fully usable.

- [ ] **Step 5: A11y spot-check.** Tab through chat + config; confirm focus rings visible on glass; confirm `--text-soft` body text on glass meets AA contrast.

- [ ] **Step 6: Commit any fixes.**

```bash
git add -A
git commit -m "fix(ui): Aurora verification-pass polish"
```

---

## Self-review notes

- **Spec coverage:** tokens (T1,T6), AuroraBackground (T3,T7), GlassPanel (T4), DisplayHeading (T4), motion.ts (T2), shell (T7), chat (T8,T9), config+settings (T10), generate-image (T11), analytics (T12), reduced-motion (every task + T13.4), regression/verification (T13). All spec sections mapped.
- **No placeholders:** foundation tasks carry full code; screen tasks carry exact files, exact token/variant usage, and concrete `sx` snippets. Screen JSX specifics are applied against the live files (read-first step in each), which is the honest approach for visual restyling — the design contract (tokens, variants, primitives) is fully specified.
- **Type consistency:** `respectMotion(variants, reduce)`, `fadeUp`, `staggerContainer`, `pageTransition`, `springSnappy`, `EASE_OUT`, `DUR` are defined in T2 and used with those exact names/signatures in T7–T12. `GlassPanel` prop `hover`, `DisplayHeading` as a `Typography` wrapper — consistent throughout.
