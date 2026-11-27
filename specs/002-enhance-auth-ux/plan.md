# Implementation Plan: Authentication & Identity UI/UX Enhancement

**Branch**: `002-enhance-auth-ux` | **Date**: 2026-11-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/002-enhance-auth-ux/spec.md`

## Summary

Upgrade GridAware's entire Authentication & Identity frontend experience in `client/`—covering public entry (`/`), sign-in (`/login`), registration (`/register`), email verification (`/verify-email`), forgot/reset passphrase (`/forgot-password`, `/reset-password`), protected shell auth controls, post-auth onboarding handoff (`/onboarding`), workspace overview (`/app`), and account profile & active sessions (`/app/profile`)—by adopting `shadcn/ui` accessible primitives aliased strictly onto GridAware's immutable EVARAX dark-first design tokens (`DESIGN.md`, `docs/design/`), implementing the approved Node G split-screen architectural layout (`gridaware-pattern-dark.svg` + brand web icons/manifest), adding pure unit-tested UX logic (Unicode passphrase policy & strength meter, Caps Lock detection, live rate-limit cooldown countdown, gentle on-blur + multi-field error summaries, client user-agent parsing, relative/exact session timestamps, and focus-trapped destructive confirmation dialogs), and verifying rendered craft across viewports via the `/impeccable` workflow—with zero breaking changes to Phase 5.1 backend APIs or security guarantees.

## Technical Context

**Language/Version**: TypeScript `5.x` + React `19.3.0` on Node.js `>= 24` (`client/`); pure client logic modules authored in `.mjs` with `.d.ts` declarations for native Node test execution

**Primary Dependencies**:
- Existing: Next.js `16.4.6` App Router (`cacheComponents: true`, `partialPrefetching: true`, `proxy.ts`), Tailwind CSS `4.3.3` (`@tailwindcss/turbopack`), Geist Sans & Geist Mono (`next/font/google`)
- New (`client/` only): `shadcn/ui` primitives (`client/components/ui/*` configured via `client/components.json`), `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `sonner`, and React 19-compatible Radix UI primitives (`@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-collapsible`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-avatar`, `@radix-ui/react-progress`, `@radix-ui/react-separator`, `@radix-ui/react-tooltip`)

**Storage**: N/A (zero database, Prisma, or Redis changes; strictly reuses existing Phase 5.1 `HttpOnly` cookie session model and REST endpoints)

**Testing**: Node built-in test runner (`node --test` via `pnpm --filter client test`) covering existing auth proxy/client/env tests plus new unit test suites (`passphrase-policy.test.mjs`, `user-agent-parser.test.mjs`, `auth-validation.test.mjs`, `session-time.test.mjs`); root/client lint (`eslint`), strict `tsc --noEmit` + `next typegen`, production `next build`, and `/impeccable` rendered visual/a11y/responsive verification across `320px`–`1440px` + `200%` zoom

**Target Platform**: Modern desktop, tablet, and mobile web browsers served by Next.js 16 standalone frontend (`client/` on `:3000` proxying `/api/*` to NestJS `server/` on `:3001`)

**Project Type**: Multi-tenant B2B SaaS web application monorepo (`pnpm@12.18.0` workspaces; frontend-scoped work inside `client/`)

**Performance Goals**: Zero perceptible input lag on live passphrase assessment (`< 5 ms` per keystroke); zero heavy dictionary bundles (no `zxcvbn`); minimal Radix/Lucide tree-shaken imports preserving fast auth route load and responsive interaction

**Constraints**:
- Preserve all six immutable EVARAX brand HEX values (`#F4E952`, `#F6FA45`, `#FCCE35`, `#080808`, `#E9ECF2`, `#FFFFFF`) and never reuse `#F6FA45` as primary CTA hover (`DESIGN.md §0.2`, `§14.2`)
- Never place background patterns behind auth form inputs (`DESIGN.md §2.11`)
- Preserve Next.js 16 `cacheComponents: true` `<Suspense>` boundaries and `proxy.ts` routing (`client/proxy.ts`)
- Zero secrets or credentials in `localStorage`, `sessionStorage`, or URL query strings (`FR-023`)
- Full WCAG 2.2 Level AA target: keyboard-only operability, unobscured `#F6FA45` focus rings, `≥ 44 × 44 px` touch targets, `16px` mobile input typography, non-color-only cues, and `prefers-reduced-motion` support
- Zero backend/API/contract modifications (`pnpm contracts:validate` remains green)

**Scale/Scope**: 15 `shadcn/ui` primitives in `client/components/ui/`, 9 domain auth/shell components in `client/components/auth/`, 4 pure tested `.mjs` utility modules + 4 test suites in `client/lib/auth/`, brand web-icons + architectural pattern assets in `client/public/`, and 9 refined Next.js App Router pages/layouts

## Constitution Check

*GATE: Evaluated before Phase 0 research and re-verified after Phase 1 design against [constitution.md](../../.specify/memory/constitution.md) v1.0.0.*

| Constitutional Gate | Pre-Research Status | Post-Design Verification |
| --- | --- | --- |
| **I. Tenant Isolation & Least-Privilege Access** | PASS | Strictly preserves global Phase 5.1 `User` / `AuthSession` boundaries; does not introduce client-trusted `organizationId` or hide backend security controls behind UI-only visibility (`FR-023`). |
| **II. Decision-Support Only — No Equipment Control** | PASS | Split-screen brand panel copy and onboarding handoff explicitly frame GridAware as a decision-support monitoring platform with zero equipment-control claims (`FR-002`, `FR-019`). |
| **III. Simulator-First Provenance & Incremental Scope** | PASS | Scoped strictly to existing Phase 5.1 authentication & identity UI/UX; displays zero fake metrics, zero premature P1/P2 features (SSO, MFA, passkeys, org-creation wizards), and honest Phase 5.2 handoff copy (`FR-002`, `FR-019`). |
| **IV. Durable, Idempotent & Truthful Telemetry** | PASS | Does not touch ingestion, MQTT, outbox, or telemetry pipelines; avoids any fabricated live health or telemetry displays on public auth surfaces. |
| **V. Modular Monolith & Explicit Service Boundaries** | PASS | Confined exclusively to `client/` presentation and pure client view-model helpers; consumes existing `/api/v1/auth/*` endpoints cleanly via `client/lib/auth/client.ts`. |
| **VI. Contract-First Interfaces & Runtime Validation** | PASS | Zero changes to OpenAPI/AsyncAPI contracts; client-side validation mirrors backend rules (12–128 Unicode codepoints, normalized email handling) and maps server `ProblemDetails` (`errors[]`, `requestId`, `Retry-After`) faithfully. |
| **VII. Progressive Intelligence & Auditability** | PASS | Preserves server-side audit correlation by surfacing `ProblemDetails.requestId` on recoverable errors (`FR-018`) and keeping all secrets redacted from URLs and UI logs (`FR-023`). |
| **VIII. EVARAX Fidelity & WCAG 2.2 AA Accessibility** | PASS | Enforces exact immutable EVARAX HEX tokens in `client/app/globals.css`, corrects primary CTA hover to a dedicated reviewed token (keeping `#F6FA45` for focus rings), integrates official Node G logo + 3×3 split backdrop + web icons, ensures non-color-only cues everywhere, targets WCAG 2.2 Level AA, and validates rendered viewports with `/impeccable`. |
| **Platform & Quality Gate Constraints** | PASS | Single `pnpm@12.18.0` workspace (`client/` only), zero `package-lock.json` or nested `.git`, strict TypeScript + ESLint + Node unit tests + production build verification. |

## Project Structure

### Documentation (this feature)

```text
specs/002-enhance-auth-ux/
├── plan.md                      # This file (/speckit-plan output)
├── spec.md                      # Validated feature specification (FR-001..FR-023, SC-001..SC-007)
├── research.md                  # Phase 0 technical & design decisions (R1..R10)
├── data-model.md                # Phase 1 client view models & UI state machines
├── quickstart.md                # Phase 1 runnable validation & /impeccable QA guide
├── checklists/
│   └── requirements.md          # Specification quality checklist (16/16 passing)
└── contracts/
    └── auth-ui-contract.md      # Phase 1 UI, route, query-param, component & a11y contract
```

### Source Code (repository root)

```text
client/
├── components.json                           # shadcn/ui configuration (Tailwind v4, RSC, Lucide)
├── package.json                              # Adds shadcn/ui Radix primitives, lucide-react, sonner, cva, clsx, tailwind-merge + updated test script
├── public/
│   ├── favicon.ico                           # Copied from brand/digital/web-icons/
│   ├── favicon.svg                           # Copied from brand/digital/web-icons/
│   ├── apple-touch-icon.png                  # Copied from brand/digital/web-icons/
│   ├── icon-192.png                          # Copied from brand/digital/web-icons/
│   ├── icon-512.png                          # Copied from brand/digital/web-icons/
│   ├── maskable-512.png                      # Copied from brand/digital/web-icons/
│   ├── site.webmanifest                      # Copied from brand/digital/web-icons/
│   └── brand/
│       ├── gridaware-horizontal-dark.svg     # Existing approved dark lockup
│       ├── gridaware-symbol-small-dark.svg   # Existing approved small symbol
│       └── gridaware-pattern-dark.svg        # Copied from brand/system/ for desktop split-screen backdrop
├── app/
│   ├── globals.css                           # Exact EVARAX tokens + aligned DESIGN.md neutrals + shadcn/ui semantic variable aliases + reduced-motion rules
│   ├── layout.tsx                            # Metadata/icons/manifest + viewport themeColor + Geist fonts + Sonner <Toaster />
│   ├── page.tsx                              # Upgraded public entry aligned with split-screen GridAware identity
│   ├── (auth)/
│   │   ├── layout.tsx                        # Asymmetric desktop split-screen (Node G + 3×3 pattern panel | clean form column) + responsive single-column mobile + skip link
│   │   ├── login/page.tsx                    # Contextual arrival banners, Caps Lock cue, gentle validation + error summary, live rate-limit countdown, prefilled recovery links
│   │   ├── register/page.tsx                 # Live passphrase policy/strength panel, confirm passphrase, multi-field error summary, duplicate-email prefilled recovery
│   │   ├── verify-email/page.tsx             # 3-step activation progress, highlighted email, collapsible troubleshooting, loading/verified/invalid states, rate-limit countdown
│   │   ├── forgot-password/page.tsx          # Transitions cleanly to privacy-preserving inbox confirmation view + try-another-email + rate-limit countdown
│   │   └── reset-password/page.tsx           # Immediate missing-token invalid view, upfront all-sessions sign-out notice, live passphrase guidance + confirm, focused completion state
│   └── (protected)/
│       ├── layout.tsx                        # Uses enhanced ProtectedHeader (skip link, active nav indicator, user DropdownMenu with Avatar & sign-out)
│       ├── onboarding/page.tsx               # Aligned active-identity handoff view with honest Phase 5.2 framing
│       └── app/
│           ├── page.tsx                      # Cohesive shadcn/ui Card/Button overview linked to profile/sessions & onboarding
│           └── profile/page.tsx              # Identity Summary Card (Avatar, Verified/Active badges, account timestamps) + ActiveSessionsPanel
├── components/
│   ├── ui/                                   # shadcn/ui EVARAX-tokenized accessible primitives
│   │   ├── alert.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── avatar.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── collapsible.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── progress.tsx
│   │   ├── separator.tsx
│   │   ├── skeleton.tsx
│   │   ├── sonner.tsx
│   │   └── tooltip.tsx
│   └── auth/                                 # Domain-specific auth & identity UI components
│       ├── auth-split-shell.tsx              # Reusable asymmetric desktop split-screen layout & brand showcase panel
│       ├── auth-field.tsx                    # Label + Input + Show/Hide passphrase + Caps Lock cue + hint + icon/text error
│       ├── form-error-summary.tsx            # Focusable multi-field validation error summary with field jump links
│       ├── passphrase-guidance.tsx           # Live tabular char counter + 12–128 policy checklist + non-color-only strength bar
│       ├── rate-limit-banner.tsx             # Live second-by-second cooldown countdown warning banner
│       ├── use-rate-limit-cooldown.ts        # Wall-clock cooldown hook synchronized with Retry-After seconds
│       ├── verification-stepper.tsx          # 3-step verification progress indicator (Account created -> Verify email -> Sign in)
│       ├── active-sessions-panel.tsx         # Quota progress, Skeleton loading, Retry error state, parsed session rows + Collapsible raw UA, AlertDialog sign-out-all
│       ├── protected-header.tsx              # Client top bar with aria-current="page" indicator + Avatar DropdownMenu + SignOut action
│       └── sign-out-button.tsx               # Shared sign-out action broadcasting SESSION_INVALIDATED(signed-out)
└── lib/
    ├── utils.ts                              # cn() helper (clsx + tailwind-merge)
    └── auth/
        ├── client.ts                         # Existing API/CSRF/refresh client (broadcasts reason metadata on invalidation)
        ├── proxy-rules.mjs                   # Existing route guard & safe ?next= sanitizer (unchanged contract)
        ├── passphrase-policy.mjs             # Pure Unicode length, 12–128 policy & advisory strength evaluator
        ├── passphrase-policy.d.ts            # TypeScript declarations
        ├── passphrase-policy.test.mjs        # Unit tests
        ├── user-agent-parser.mjs             # Pure deterministic browser/OS/device parser + safe fallback
        ├── user-agent-parser.d.ts            # TypeScript declarations
        ├── user-agent-parser.test.mjs        # Unit tests
        ├── auth-validation.mjs               # Pure field validators, multi-field summary builder & safe prefill href builders
        ├── auth-validation.d.ts              # TypeScript declarations
        ├── auth-validation.test.mjs          # Unit tests
        ├── session-time.mjs                  # Pure relative recency & locale timezone formatter
        ├── session-time.d.ts                 # TypeScript declarations
        └── session-time.test.mjs             # Unit tests
```

**Structure Decision**: Confine all implementation work to the existing `client/` workspace inside GridAware's `pnpm` monorepo. Base reusable accessible primitives live in `client/components/ui/` following standard `shadcn/ui` conventions (so future Phase 5.2+ screens inherit the exact EVARAX-tokenized component foundation immediately), domain-specific authentication and session UX components live in `client/components/auth/`, and pure deterministic client logic lives in `client/lib/auth/*.mjs` (matching the existing `proxy-rules.mjs` / `refresh-coordinator.mjs` pattern tested by `node --test`).

## Complexity Tracking

No Constitution violations or architectural exceptions are required.
