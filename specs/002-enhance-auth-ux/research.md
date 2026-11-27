# Research & Technical Decisions: Authentication & Identity UI/UX Enhancement

**Feature**: `002-enhance-auth-ux`  
**Date**: 2026-11-27  
**Spec**: [spec.md](./spec.md)

## R1. `shadcn/ui` Integration on Next.js 16 + React 19 + Tailwind CSS v4

- **Decision**: Initialize `shadcn/ui` (`new-york` style, `rsc: true`, `tsx: true`, `iconLibrary: "lucide"`) in `client/` via `client/components.json`, installing `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `sonner`, and the minimal required React 19-compatible Radix UI primitives (`@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-collapsible`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-avatar`, `@radix-ui/react-progress`, `@radix-ui/react-separator`, `@radix-ui/react-tooltip`). Map every `shadcn/ui` CSS variable in `client/app/globals.css` directly onto GridAware's exact EVARAX and derived neutral CSS variables rather than default OKLCH grays.
- **Rationale**: `client/` already runs Next.js `16.4.6`, React `19.3.0`, and Tailwind CSS `4.3.3` via `@tailwindcss/turbopack` (`next.config.ts`). Keeping the six immutable EVARAX brand HEX values (`#F4E952`, `#F6FA45`, `#FCCE35`, `#080808`, `#E9ECF2`, `#FFFFFF`) untouched while aliasing `--background`, `--card`, `--primary`, `--ring`, `--destructive`, etc. to GridAware's semantic tokens satisfies both `DESIGN.md §0.2 #1` and `shadcn/ui`'s Tailwind v4 `@theme inline` contract with zero drift.
- **Alternatives considered**:
  - Hand-rolling accessible modals, dropdown menus, collapsibles, and tooltips from scratch: rejected due to focus-trap, Escape handling, portal layering, ARIA wiring, and screen-reader edge-case risk.
  - Using default `shadcn/ui` OKLCH neutral theme without EVARAX aliasing: rejected because it violates Constitution Principle VIII and `DESIGN.md §0.2 #1`.
  - Installing a full-framework UI library (MUI / Chakra / Ant Design): rejected due to bundle bloat, dark-mode token friction, and conflict with Tailwind CSS v4.

## R2. EVARAX Token Alignment & Primary CTA Hover Compliance

- **Decision**: Align `client/app/globals.css` derived neutrals with `DESIGN.md §3.2` (`--surface-4: #292929`, `--text-secondary: #B8BDC7`, `--text-disabled: #707680`), add `--radius-sm: 6px`, `--radius-md: 10px`, `--radius-lg: 14px`, `--radius-xl: 18px`, and introduce dedicated reviewed primary CTA interaction tokens (`--brand-primary-hover: #EAE04A` and `--brand-primary-active: #DFD43E`, both maintaining >14:1 contrast against `#080808` text) instead of reusing Neon Lime (`#F6FA45`) for button hover.
- **Rationale**: `DESIGN.md §14.2` explicitly specifies that `#F6FA45` (Neon Lime) is **not** a primary button hover fill and must remain reserved for focus rings (`:focus-visible`) and active selection highlights. The incumbent `auth-primitives.tsx` used `hover:bg-[var(--color-lime)]`, which conflicted with `DESIGN.md §14.2`.
- **Alternatives considered**:
  - Keeping `hover:bg-[var(--color-lime)]`: rejected because it violates `DESIGN.md §14.2` and blurs the visual distinction between hover and keyboard focus.
  - Using `--color-gold` (`#FCCE35`) on hover: rejected because Golden Yellow is reserved for `SIMULATED` context accents and comparison series (`DESIGN.md §3.1`).

## R3. Split-Screen Architectural Layout & Approved Brand Pattern Assets

- **Decision**: Copy `brand/system/gridaware-pattern-dark.svg` into `client/public/brand/gridaware-pattern-dark.svg` and upgrade `client/app/(auth)/layout.tsx` into a responsive two-column asymmetric split-screen layout at desktop widths (`lg:` ≥ 1024px):
  - **Left Architectural Brand Panel** (~46–48% width on desktop, hidden below `lg:` where a clean top brand header takes over): Near Black (`#080808`) canvas layered with the approved 3×3 modular `gridaware-pattern-dark.svg` backdrop (controlled subtle opacity so ≤ 2 active yellow nodes appear cleanly per viewport), the approved `gridaware-horizontal-dark.svg` lockup respecting `1×N` clear space, GridAware's exact brand essence (*"Vigilant clarity across the grid."*), and three concise, truthful identity/operational principles (multi-tenant isolation, decision-support monitoring—never equipment actuation, auditable session control). Zero fabricated live metrics or charts.
  - **Right Focused Auth Panel** (~52–54% width on desktop, full-width single column on tablet/mobile): Calm neutral dark surface (`#080808` / `#101010` elevated form container with subtle border, zero background pattern behind inputs), skip-to-main-content link, top utility link for route clarity, form content (`max-w-[440px]`), and restrained footer.
  - Align `client/app/page.tsx` (unauthenticated root entry) with the same split-screen brand grammar so navigating between `/`, `/login`, `/register`, `/verify-email`, `/forgot-password`, and `/reset-password` feels seamless.
- **Rationale**: Directly implements `brand-identity-guidelines.md §7.1` and `DESIGN.md §2.11` (*"Where to use: auth/onboarding split-screen backdrops (`SC-01`, `SC-02`)... Never behind auth form fields if it reduces readability"*) and `screen-inventory.md SC-01`.
- **Alternatives considered**:
  - Keeping the bare centered card on `#080808`: rejected because it underutilizes GridAware's approved brand identity system and feels like a generic scaffold.
  - Placing the grid pattern full-bleed behind the form inputs: rejected because `DESIGN.md §2.11` explicitly prohibits placing patterns behind auth form fields where legibility may degrade.

## R4. Brand Web Icons, Manifest & Next.js Metadata Cleanup

- **Decision**: Copy approved web icon files from `brand/digital/web-icons/` (`favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-512.png`, `site.webmanifest`) into `client/public/`, remove unused starter Next.js boilerplate SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) if unreferenced, and wire Next.js App Router `metadata` (`icons`, `manifest`) and `viewport` (`themeColor: "#080808"`) exports in `client/app/layout.tsx`.
- **Rationale**: Directly fulfills `FR-003` and `DESIGN.md §2.12` (*"copy into `client/public/`... In Next.js App Router, prefer the `metadata` export over raw tags"*).
- **Alternatives considered**:
  - Leaving default `client/app/favicon.ico` and starter SVGs: rejected as incomplete brand polish and a direct violation of `FR-003`.

## R5. Passphrase Policy Guidance, Strength Meter, Caps Lock & Confirm Field

- **Decision**: Create pure ES module `client/lib/auth/passphrase-policy.mjs` (with TypeScript declarations in `client/lib/auth/passphrase-policy.d.ts`) computing:
  - Exact Unicode codepoint length via `Array.from(value).length` (matching backend `FR-003` without UTF-16 surrogate pair miscounts).
  - Requirement checklist items aligned strictly to GridAware's policy: `minLength` (`>= 12`), `maxLength` (`<= 128`).
  - Advisory non-blocking strength tier (`empty` | `too-short` | `fair` | `strong` | `very-strong`) scored from length (primary driver, rewarding 16+ and 20+ character passphrases), multi-word spacing, and character-class diversity—never rejecting valid 12–128 char passphrases.
  - Confirmation match evaluation (`empty` | `matching` | `mismatch`).
  - Build a reusable `<PassphraseGuidance />` component pairing a `shadcn/ui` `Progress` bar with explicit text labels and `lucide-react` icons (check/circle/alert) so strength and policy are never color-only, plus a `useCapsLock` listener attached to passphrase inputs (`event.getModifierState("CapsLock")` on keydown/keyup).
- **Rationale**: Satisfies `FR-006`, `FR-007`, `SC-001`, and `DESIGN.md §15.3` while remaining 100% unit-testable via `client`'s existing `node --test` runner.
- **Alternatives considered**:
  - Adding `zxcvbn` (~800 KB dictionary bundle): rejected due to massive client bundle size on public auth routes when deterministic length/passphrase/diversity guidance is fast, transparent, and aligned with NIST SP 800-63B / GridAware's passphrase policy.
  - Enforcing mandatory uppercase/symbol/number rules: rejected because it contradicts `001-auth-identity-management` `FR-003` (*"without arbitrary character-composition rules"*).

## R6. Live Rate-Limit Cooldown Timer

- **Decision**: Implement a reusable React hook `useRateLimitCooldown()` (`client/components/auth/use-rate-limit-cooldown.ts`) driven by a wall-clock target timestamp (`endsAtMs = Date.now() + seconds * 1000`) ticked at 1-second intervals (or immediate completion when elapsed), paired with a shared `<RateLimitBanner />` component. When `ApiClientError.code === "RATE_LIMITED"`, pass `err.retryAfterSeconds ?? 60` into the cooldown hook, disable the form's submit button and ignore Enter-key submissions until `remainingSeconds === 0`, then auto-clear the lock and announce readiness politely.
- **Rationale**: Using a target `endsAtMs` timestamp prevents timer drift when browser tabs throttle `setInterval` in the background. Satisfies `FR-009` and Edge Case "Simultaneous rate-limit cooldown across rapid retries".
- **Alternatives considered**:
  - Decrementing a counter in `setInterval`: rejected because backgrounded tabs throttle intervals and leave users stuck with stale countdowns.

## R7. Client-Side User-Agent Summarization & Relative/Exact Timestamps

- **Decision**: Create two pure, zero-dependency `.mjs` modules with `.d.ts` declarations tested by `node --test`:
  - `client/lib/auth/user-agent-parser.mjs`: Deterministically identifies browser (`Edge`, `Opera`, `Chrome`, `Firefox`, `Safari`, `Mobile Safari`, `Brave`, `CLI / Automated client`, or fallback `Unknown browser or client`), operating system (`Windows`, `macOS`, `iOS`, `Android`, `Linux`, `ChromeOS`), and device category (`desktop` | `mobile` | `tablet` | `unknown`), returning `{ browser, os, deviceType, summary, raw }`. Order of checks handles UA quirks (e.g., `Edg/` before `Chrome/`, `Chrome/` before `Safari/`, `iPad`/`Android` tablet detection).
  - `client/lib/auth/session-time.mjs`: Formats relative recency (`Just now`, `4m ago`, `2h ago`, `3d ago`) given an injectable `now` timestamp, alongside concise locale-aware date/time with explicit timezone abbreviation (`Intl.DateTimeFormat` with `timeZoneName: "short"`).
  - Render each session row with a fitting `lucide-react` device icon (`Monitor`, `Smartphone`, `Tablet`, `Globe`), human-readable summary, non-color-only `Current session` badge, tabular monospace timestamps (last active, idle expiry, absolute expiry), and a `shadcn/ui` `Collapsible` trigger (`Client details`) revealing the full raw user-agent string cleanly on demand.
- **Rationale**: Delivers instant visual scanability (`SC-006`, `FR-016`) without adding third-party UA parser dependencies or losing technical diagnostic fidelity.
- **Alternatives considered**:
  - Adding `ua-parser-js`: rejected because a focused 90-line tested parser covers all standard desktop/mobile browsers and CLI clients with zero dependency weight and predictable fallback behavior.

## R8. Accessible Destructive Confirmations, Feedback Toasts & Cross-Tab Sign-Out Reason

- **Decision**:
  - Replace the inline button swap in `ActiveSessionsPanel` with a `shadcn/ui` `AlertDialog` (`Confirm sign out of all sessions`) providing focus trapping, Escape cancellation, focus restoration to the trigger button, clear explanation of impact (all browsers including this one), and explicit verb buttons (`Sign out all sessions` / `Cancel`).
  - Mount a dark-EVARAX-themed `sonner` `<Toaster />` in `client/app/layout.tsx` (positioned bottom-right on desktop, top-center on mobile, respecting `prefers-reduced-motion`, never covering dialogs) for non-blocking confirmation feedback (e.g., `"Session revoked."`) paired with immediate visible list state updates and an accessible `aria-live="polite"` status message.
  - Enhance cross-tab `BroadcastChannel("gridaware:auth")` handling so signing out in one tab broadcasts `{ type: "SESSION_INVALIDATED", reason: "signed-out" }` while automatic session expiry uses `reason: "session-expired"`, allowing `/login` to display a tailored informational banner (`?reason=signed-out` vs `?reason=session-expired`).
- **Rationale**: Satisfies `FR-010`, `FR-017`, `FR-018`, `DESIGN.md §14.2` (`Dialog` & `Toast`), and `DESIGN.md §15.11` (*"Toast never sole evidence of critical change"*).
- **Alternatives considered**:
  - Keeping inline button swap for "Sign out of all sessions": rejected because it lacks modal focus framing, easy Escape semantics, and clear destructive impact copy required by `FR-017` and `DESIGN.md §14.2`.

## R9. Form Validation Lifecycle, Multi-Field Error Summary & Safe Prefill Routing

- **Decision**: Create pure validation & routing helpers in `client/lib/auth/auth-validation.mjs` (+ `.d.ts`):
  - Per-field validators for `displayName`, `email`, `password` (login non-empty vs register/reset 12–128 codepoints), and `confirmPassword` (exact match).
  - Track `touched` fields per form so validation runs **on blur** once touched (and clears errors smoothly as soon as a previously invalid field becomes valid) plus **on submit** across all fields, never yelling at users mid-first-keystroke (`FR-005`, `DESIGN.md §15.3`).
  - When ≥ 2 fields fail on submit, render an accessible `<FormErrorSummary />` (with `tabIndex={-1}`, `role="alert"`, programmatic focus on submit failure, and jump links to each invalid input ID).
  - Provide safe link builders (`buildLoginHref`, `buildVerifyEmailHref`, `buildForgotPasswordHref`) reusing `sanitizeNextPath` from `proxy-rules.mjs` so email context and safe `next` return destinations flow smoothly across screens without ever placing secrets in query strings.
- **Rationale**: Satisfies `FR-005`, `FR-010`, `FR-011`, `DESIGN.md §15.3`, and `accessibility-specification.md §6`.
- **Alternatives considered**:
  - Adding `react-hook-form`: unnecessary overhead for 1–4 field auth forms where explicit React state + pure tested `.mjs` validators yield simpler code, zero extra runtime bundle, and instant integration with server `ProblemDetails.errors[]` field mapping.

## R10. `/impeccable` Visual Craft & Rendered Verification Gate

- **Decision**: Follow the `/impeccable` workflow during implementation:
  1. Read `.agents/skills/impeccable/reference/craft-floor.md` immediately before beginning UI edits.
  2. Treat this enhancement as a high-craft **Operate + Brand Entry** surface refinement anchored strictly in `DESIGN.md` (EVARAX dark-first palette, Geist Sans/Mono, 4px/8px spacing rhythm, restrained motion, crisp optical hierarchy, zero decorative bloat or neon glow).
  3. After implementing and passing static checks (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`), verify rendered output live across `320px`, `375px`, `768px`, `1024px`, and `1440px` viewports (using `.agents/skills/impeccable/scripts/impeccable.cmd shot` or browser inspection) and fix any visual spacing, contrast, alignment, or overflow issues in a batched polish pass.
- **Rationale**: Explicitly requested by the user (*"also implement using /impeccable also read ui docs"*) and directly validates `SC-003`, `SC-004`, and `SC-005`.
- **Alternatives considered**:
  - Relying solely on `pnpm build` and unit tests without rendered viewport verification: rejected because visual hierarchy, contrast, split-screen balance, and 320px/200% zoom reflow can only be confirmed by inspecting the rendered UI.
