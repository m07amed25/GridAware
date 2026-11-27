# Tasks: Authentication & Identity UI/UX Enhancement

**Input**: Design documents from `/specs/002-enhance-auth-ux/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/auth-ui-contract.md](./contracts/auth-ui-contract.md), [quickstart.md](./quickstart.md)

**Tests**: Unit tests for pure client logic modules (`passphrase-policy.mjs`, `user-agent-parser.mjs`, `auth-validation.mjs`, `session-time.mjs`) are included per `plan.md` and `quickstart.md` using Node's built-in `node --test` runner.

**Organization**: Tasks are grouped by user story (`US1`–`US6`) to enable independent implementation, verification, and incremental delivery. Before beginning UI component edits in Phase 2, read `.agents/skills/impeccable/reference/craft-floor.md` per `research.md` (`R10`).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story label (`US1`–`US6`) for story-phase tasks only
- All paths are relative to repository root (`d:\My Projects\gridware`)

---

## Phase 1: Setup (Dependencies, Brand Assets & EVARAX Token Foundation)

**Purpose**: Install `shadcn/ui` runtime dependencies, configure `components.json`, copy approved GridAware web-icon and pattern assets, and align `globals.css` tokens with `DESIGN.md`.

- [X] T001 Install `clsx`, `tailwind-merge`, `class-variance-authority`, `lucide-react`, `sonner`, and Radix UI primitives (`@radix-ui/react-slot`, `@radix-ui/react-label`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-collapsible`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-avatar`, `@radix-ui/react-progress`, `@radix-ui/react-separator`, `@radix-ui/react-tooltip`) in `client/package.json` and create `shadcn/ui` configuration in `client/components.json`
- [X] T002 [P] Create Tailwind class-merging helper `cn()` in `client/lib/utils.ts`
- [X] T003 [P] Copy approved web icons and manifest from `brand/digital/web-icons/` into `client/public/` (`favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `maskable-512.png`, `site.webmanifest`), copy `brand/system/gridaware-pattern-dark.svg` to `client/public/brand/gridaware-pattern-dark.svg`, and remove unused Next.js starter SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`) from `client/public/`
- [X] T004 [P] Update `client/app/globals.css` to keep the six immutable EVARAX HEX values exact, align derived dark neutrals (`--surface-4: #292929`, `--text-secondary: #B8BDC7`, `--text-disabled: #707680`), add `--radius-sm`/`--radius-md`/`--radius-lg`/`--radius-xl`, add reviewed `--brand-primary-hover`/`--brand-primary-active` CTA tokens (reserving `#F6FA45` strictly for focus rings), and map all `shadcn/ui` semantic CSS variables onto GridAware tokens

---

## Phase 2: Foundational (EVARAX `shadcn/ui` Primitives & Core Auth Infrastructure)

**Purpose**: Build the reusable EVARAX-tokenized `shadcn/ui` primitive library, root metadata/toast provider, pure validation/prefill helpers, rate-limit cooldown engine, and core form/error components required across all auth and profile stories.

**⚠️ CRITICAL**: Complete all tasks in Phase 2 before starting any user story phase. Read `.agents/skills/impeccable/reference/craft-floor.md` before creating UI components.

- [X] T005 [P] Create EVARAX-tokenized `shadcn/ui` `Button` primitive (using `--brand-primary-hover` / `--brand-primary-active`, `min-h-11` touch-safe default, Neon Lime focus ring, and loading slot support) in `client/components/ui/button.tsx`
- [X] T006 [P] Create EVARAX-tokenized `shadcn/ui` `Input` (`min-h-11`, `text-base sm:text-sm` mobile-safe sizing) in `client/components/ui/input.tsx` and `Label` in `client/components/ui/label.tsx`
- [X] T007 [P] Create EVARAX-tokenized `shadcn/ui` `Card` in `client/components/ui/card.tsx` and `Separator` in `client/components/ui/separator.tsx`
- [X] T008 [P] Create EVARAX-tokenized `shadcn/ui` `Alert` (semantic `error`/`warning`/`success`/`info` variants pairing icon + text) in `client/components/ui/alert.tsx` and `Badge` in `client/components/ui/badge.tsx`
- [X] T009 [P] Create EVARAX-tokenized `shadcn/ui` `Progress` in `client/components/ui/progress.tsx` and reduced-motion-safe `Skeleton` in `client/components/ui/skeleton.tsx`
- [X] T010 [P] Create EVARAX-tokenized `shadcn/ui` `AlertDialog` (focus-trapped with Escape dismissal and focus restoration) in `client/components/ui/alert-dialog.tsx` and `Collapsible` in `client/components/ui/collapsible.tsx`
- [X] T011 [P] Create EVARAX-tokenized `shadcn/ui` `DropdownMenu` in `client/components/ui/dropdown-menu.tsx`, `Avatar` in `client/components/ui/avatar.tsx`, and `Tooltip` in `client/components/ui/tooltip.tsx`
- [X] T012 [P] Create dark-EVARAX-themed `Sonner` toast wrapper in `client/components/ui/sonner.tsx`
- [X] T013 Update `client/app/layout.tsx` to export Next.js App Router `metadata` (`icons`, `manifest`, GridAware title/description) and `viewport` (`themeColor: "#080808"`), and mount `<TooltipProvider>` and `<Toaster />`
- [X] T014 [P] Implement pure field validators, multi-field error summary builder, and safe prefill link builders (`buildLoginHref`, `buildVerifyEmailHref`, `buildForgotPasswordHref`) in `client/lib/auth/auth-validation.mjs` and `client/lib/auth/auth-validation.d.ts`, enforcing `data-model.md` constraints for `FormErrorItem.fieldId`, `FormErrorItem.fieldName`, `FormErrorItem.message`, `FormBannerState.tone`, `FormBannerState.title`, `FormBannerState.message`, `FormBannerState.code`, and `FormBannerState.requestId`
- [X] T015 [P] Write unit tests covering display-name/email/passphrase validation, multi-field `FormErrorItem` summary ordering, and sanitized prefill URL builders in `client/lib/auth/auth-validation.test.mjs`
- [X] T016 [P] Implement wall-clock rate-limit countdown hook (`useRateLimitCooldown`) in `client/components/auth/use-rate-limit-cooldown.ts` and live countdown warning banner (`RateLimitBanner`) in `client/components/auth/rate-limit-banner.tsx`
- [X] T017 [P] Implement focusable multi-field `<FormErrorSummary />` (citing `data-model.md` `FormErrorItem.fieldId`, `FormErrorItem.fieldName`, `FormErrorItem.message`) in `client/components/auth/form-error-summary.tsx` and upgraded `<AuthField />` (persistent `Label`, `Input`, `Eye`/`EyeOff` visibility toggle with `aria-pressed`, inline Caps Lock cue, helper hint, and icon+text error bound via `aria-describedby`/`aria-invalid`) in `client/components/auth/auth-field.tsx`
- [X] T018 [P] Update `client/lib/auth/client.ts` to support optional `reason` (`"session-expired" | "signed-out"`) payload metadata on `SESSION_INVALIDATED` broadcast messages while preserving existing CSRF and Web Locks refresh coordinator behavior

**Checkpoint**: Foundation ready — EVARAX-tokenized `shadcn/ui` primitives, brand assets, metadata, validation helpers, and cooldown infrastructure are in place. User story implementation can now proceed.

---

## Phase 3: User Story 1 - Branded Split-Screen Authentication Entry & Frictionless Sign-In (Priority: P1) 🎯 MVP

**Goal**: Deliver GridAware's asymmetric desktop split-screen authentication architecture (Node G lockup + subtle 3×3 pattern strictly in the brand column, clean high-contrast form column, mobile single-column reflow) and elevate `/login` and `/` with contextual arrival banners, Caps Lock detection, live rate-limit cooldown countdown, gentle validation, and pre-filled pending-verification recovery.

**Independent Test**: Open `/` and `/login` across `320px`, `375px`, `768px`, `1024px`, and `1440px` viewports; test `?verified=1`, `?reset=1`, `?reason=session-expired`, and `?reason=signed-out` banners; verify Caps Lock inline notice, show/hide toggle, non-enumerating error with preserved email, live rate-limit countdown disabling resubmission until `0`, pending-verification link carrying `?email=`, and keyboard-only sign-in redirect to sanitized `?next=`.

- [X] T019 [P] [US1] Build reusable asymmetric desktop split-screen shell `<AuthSplitShell />` (left architectural brand panel with Node G horizontal lockup respecting `1×N` clear space, `gridaware-pattern-dark.svg` backdrop isolated from form inputs, concise decision-support principles, zero fabricated KPIs; right clean form column with skip-to-main-content link, responsive mobile header, and footer) in `client/components/auth/auth-split-shell.tsx`
- [X] T020 [US1] Update `client/app/(auth)/layout.tsx` to wrap all public auth pages in `<AuthSplitShell />`
- [X] T021 [P] [US1] Upgrade unauthenticated root entry in `client/app/page.tsx` to render inside `<AuthSplitShell />` using EVARAX `shadcn/ui` `Button` and `Badge` components while preserving server-side authenticated redirect to `/app`
- [X] T022 [US1] Upgrade sign-in screen in `client/app/(auth)/login/page.tsx` with `FormBannerState` (`data-model.md` `FormBannerState.tone`, `FormBannerState.title`, `FormBannerState.message`, `FormBannerState.code`, `FormBannerState.requestId`) arrival banners (`?verified=1`, `?reset=1`, `?reason=session-expired`, `?reason=signed-out`), optional `?email=` prefill, gentle on-blur + submit validation with `<FormErrorSummary />`, inline Caps Lock cue via `<AuthField />`, live `<RateLimitBanner />` cooldown blocking button and Enter-key resubmission until `0`, generic non-enumerating invalid-credentials message preserving entered email, and `ACCOUNT_NOT_ACTIVE` resend link carrying `?email=`

**Checkpoint**: User Story 1 (MVP) is independently functional and testable across `/` and `/login`.

---

## Phase 4: User Story 2 - Guided Account Registration with Live Passphrase Feedback (Priority: P1)

**Goal**: Provide a confident, low-friction registration experience with real-time 12–128 Unicode character policy checklist, non-color-only advisory strength meter, confirm-passphrase matching, multi-field error summary, rate-limit countdown, and duplicate-email conflict recovery carrying email context forward.

**Independent Test**: Open `/register`, type passphrases from `0` to `128+` characters (including spaces and Unicode) to confirm live tabular counter, policy icons/text, and strength bar; test mismatched confirm passphrase on blur/submit and multi-field error summary; submit an existing email to confirm calm non-enumerating warning with pre-filled `/login?email=` and `/forgot-password?email=` links; submit valid details to verify single-submit lock and transition to `/verify-email?email=...&sent=1`.

- [X] T023 [P] [US2] Implement pure Unicode passphrase policy and advisory strength evaluator in `client/lib/auth/passphrase-policy.mjs` and `client/lib/auth/passphrase-policy.d.ts`, implementing `data-model.md` rules for `PassphraseAssessment.length`, `PassphraseAssessment.minLengthMet`, `PassphraseAssessment.maxLengthMet`, `PassphraseAssessment.isPolicyValid`, `PassphraseAssessment.strengthTier`, `PassphraseAssessment.strengthLabel`, `PassphraseAssessment.strengthScore`, and `PassphraseAssessment.guidance`
- [X] T024 [P] [US2] Write unit tests covering Unicode surrogate pairs, 12–128 character boundaries, advisory strength tiers, and confirmation match checks in `client/lib/auth/passphrase-policy.test.mjs`
- [X] T025 [US2] Build `<PassphraseGuidance />` component displaying tabular monospace character count (`font-mono tabular-nums`), met/unmet policy check icons + text, and non-color-only `Progress` strength meter + tier label in `client/components/auth/passphrase-guidance.tsx`
- [X] T026 [US2] Upgrade registration screen in `client/app/(auth)/register/page.tsx` integrating `<PassphraseGuidance />`, confirm-passphrase matching `<AuthField />`, gentle on-blur + submit validation with `<FormErrorSummary />`, live `<RateLimitBanner />` cooldown, server `ProblemDetails.errors[]` and `requestId` mapping, and calm non-enumerating `EMAIL_UNAVAILABLE` callout with pre-filled `Sign in` and `Reset passphrase` links

**Checkpoint**: User Stories 1 and 2 are both independently functional and testable.

---

## Phase 5: User Story 3 - Clear Email Verification Lifecycle & Resend Experience (Priority: P2)

**Goal**: Replace the minimal verification page with purpose-built lifecycle views: post-registration 3-step progress indicator with highlighted target email and collapsible inbox troubleshooting, accessible confirming state, clear verified success state, invalid/expired link recovery paired directly with resend, and live rate-limit cooldown countdown.

**Independent Test**: Test `/verify-email?email=alex@facility.example&sent=1` (3-step indicator, email badge, collapsible troubleshooting), `/verify-email?token=invalid` (error panel + visible resend form), real console-mailer token confirmation (loading → verified success → `Continue to sign in`), and repeated resend requests (non-enumerating confirmation + live rate-limit countdown).

- [X] T027 [P] [US3] Build non-color-only 3-step activation progress indicator `<VerificationStepper />` (`Account created` → `Verify email` → `Sign in`) with explicit step icons and text states in `client/components/auth/verification-stepper.tsx`
- [X] T028 [US3] Upgrade email verification screen in `client/app/(auth)/verify-email/page.tsx` with `<VerificationStepper />`, highlighted monospace destination email, 24-hour single-use link notice, `Collapsible` inbox troubleshooting disclosure, accessible confirming `Skeleton`/status view, verified success card with single primary CTA to `/login?verified=1`, invalid/expired/superseded link `Alert` paired directly with the resend form, and `<RateLimitBanner />` cooldown handling

**Checkpoint**: User Story 3 is independently functional and testable across all four verification lifecycle states.

---

## Phase 6: User Story 4 - Guided Passphrase Recovery & Security-Aware Reset Flow (Priority: P2)

**Goal**: Deliver a calm, privacy-safe forgot-passphrase confirmation transition and a security-aware reset-passphrase flow that catches missing tokens immediately on load, communicates all-session sign-out upfront, reuses live passphrase guidance + confirm matching, and ends on a clean completion state.

**Independent Test**: Submit an email on `/forgot-password` to verify transition to confirmation state + `Try another email`; open `/reset-password` with no `?token=` to verify immediate invalid-link view without submittable password inputs; open a valid console-mailer reset link to verify upfront all-sessions notice, `<PassphraseGuidance />`, confirm-passphrase validation, and focused post-reset completion routing to `/login?reset=1`.

- [X] T029 [P] [US4] Upgrade forgot-passphrase screen in `client/app/(auth)/forgot-password/page.tsx` to accept optional `?email=` prefill, run gentle email validation, display live `<RateLimitBanner />` cooldown, and transition on acceptance from the request form to a structured non-enumerating confirmation view (60-minute single-use validity, prior links invalidated, `Try another email` action, and `Back to sign in`)
- [X] T030 [US4] Upgrade reset-passphrase screen in `client/app/(auth)/reset-password/page.tsx` to render an immediate invalid-link recovery view when `?token=` is missing or blank, display an upfront security notice explaining that all active sessions will be signed out, integrate `<PassphraseGuidance />` + confirm-passphrase `<AuthField />` + `<FormErrorSummary />` + `<RateLimitBanner />`, and replace the form upon completion with a focused success state routing directly to `/login?reset=1` without competing recovery links

**Checkpoint**: User Story 4 is independently functional and testable across both `/forgot-password` and `/reset-password`.

---

## Phase 7: User Story 5 - Readable Account Identity Profile & Safe Active Session Management (Priority: P2)

**Goal**: Transform `/app/profile` into a scannable identity summary and human-readable active sessions security workspace featuring parsed browser/OS/device rows, on-demand raw client details, `N of 10` session quota visibility, loading skeletons, fetch error retry with reference ID, and an accessible focus-trapped confirmation dialog for `Sign out of all sessions`.

**Independent Test**: Sign in across two browsers and open `/app/profile`; verify initials avatar, verified/status badges, `N of 10` quota bar, human-readable browser/OS labels with device icons, relative + exact timezone timestamps, expandable `Client details` raw UA, single-session revoke feedback (toast + polite announcement + list removal), focus-trapped `AlertDialog` for `Sign out of all sessions` (Escape/Cancel restores focus; Confirm signs out all tabs with `?reason=signed-out`), and simulated fetch error with `Retry`.

- [X] T031 [P] [US5] Implement pure deterministic user-agent summarizer in `client/lib/auth/user-agent-parser.mjs` and `client/lib/auth/user-agent-parser.d.ts`, producing `data-model.md` fields `ParsedSessionClient.browser`, `ParsedSessionClient.os`, `ParsedSessionClient.deviceType`, `ParsedSessionClient.summary`, and `ParsedSessionClient.raw`
- [X] T032 [P] [US5] Write unit tests covering Chrome, Edge, Firefox, Safari, mobile/tablet UA strings, CLI clients, and null/empty/malformed fallback behavior in `client/lib/auth/user-agent-parser.test.mjs`
- [X] T033 [P] [US5] Implement pure relative recency and timezone-aware timestamp formatter in `client/lib/auth/session-time.mjs` and `client/lib/auth/session-time.d.ts`, producing `data-model.md` fields `SessionTimeDisplay.lastActiveRelative`, `SessionTimeDisplay.lastActiveExact`, `SessionTimeDisplay.idleExpiresExact`, and `SessionTimeDisplay.absoluteExpiresExact`
- [X] T034 [P] [US5] Write deterministic unit tests with injected `now` timestamps for relative recency buckets and formatted timezone outputs in `client/lib/auth/session-time.test.mjs`
- [X] T035 [US5] Upgrade `client/components/auth/active-sessions-panel.tsx` with session quota badge & `Progress` bar (`N of 10`), geometry-matching `Skeleton` rows during load, error `Alert` surfacing `requestId` + working `Retry` button, human-readable `ParsedSessionClient` rows with device icons, non-color-only `Current session` `Badge`, `SessionTimeDisplay` tabular timestamps, `Collapsible` `Client details` raw UA reveal, per-row revoke spinner + polite status + `sonner` toast confirmation (with `404` stale-list refresh), focus-trapped `AlertDialog` for `Sign out of all sessions`, and cross-tab `BroadcastChannel` handling for `session-expired` vs `signed-out`
- [X] T036 [US5] Upgrade `client/app/(protected)/app/profile/page.tsx` with a cohesive Identity Summary `Card` showing user initials `Avatar`, display name, normalized monospace email, non-color-only `Verified` and account status `Badge` elements (icon + text), formatted account creation/verification timestamps, and `<ActiveSessionsPanel />`

**Checkpoint**: User Story 5 is independently functional and testable on `/app/profile`.

---

## Phase 8: User Story 6 - Cohesive Post-Auth Handoff, Navigation Polish & Inclusive Responsive Craft (Priority: P3)

**Goal**: Unify protected shell navigation active states, accessible user menu, sign-out cross-tab synchronization, `/onboarding` handoff screen, and `/app` overview so every authenticated entry and exit point matches GridAware's EVARAX craft without presenting premature Phase 5.2 controls.

**Independent Test**: Sign in and navigate across `/app`, `/app/profile`, and `/onboarding` at desktop, tablet, and `320px` mobile viewports using keyboard only; verify skip-to-main-content link, `aria-current="page"` + visual active indicator on header links, accessible user `DropdownMenu` with sign-out propagating `?reason=signed-out` to open tabs, and honest `/onboarding` handoff state.

- [X] T037 [P] [US6] Update `client/components/auth/sign-out-button.tsx` to use EVARAX `shadcn/ui` `Button`, show clear pending feedback, broadcast `{ type: "SESSION_INVALIDATED", reason: "signed-out" }`, and redirect cleanly to `/login?reason=signed-out`
- [X] T038 [US6] Build client protected top bar `<ProtectedHeader />` (skip-to-main-content link, approved Node G logo, primary nav links with `aria-current="page"` + bold weight + EVARAX yellow indicator bar, and accessible user `DropdownMenu` with `Avatar`, display name, email, `Profile & Sessions`, `Onboarding status`, and `Sign out`) in `client/components/auth/protected-header.tsx` and wire it into `client/app/(protected)/layout.tsx`
- [X] T039 [P] [US6] Refine `client/app/(protected)/onboarding/page.tsx` and `client/app/(protected)/app/page.tsx` with cohesive `shadcn/ui` `Card`, `Badge`, and `Button` hierarchy showing verified personal identity status and honest Phase 5.2 organization-provisioning framing (zero fake interactive org-creation controls)

**Checkpoint**: All six user stories (US1–US6) are independently implemented and integrated cleanly.

---

## Phase 9: Polish, Cleanup & Cross-Cutting Verification

**Purpose**: Wire all new unit tests into `client/package.json`, remove retired legacy primitives, verify full monorepo static/test/build/contract checks, and run the `/impeccable` rendered visual, responsive, and WCAG 2.2 AA polish pass.

- [X] T040 Update the `test` script in `client/package.json` to execute `lib/auth/passphrase-policy.test.mjs`, `lib/auth/user-agent-parser.test.mjs`, `lib/auth/auth-validation.test.mjs`, and `lib/auth/session-time.test.mjs` alongside existing tests, and delete retired `client/components/auth/auth-primitives.tsx` after confirming zero remaining imports
- [X] T041 Run automated verification suite (`pnpm --filter client test`, `pnpm --filter client lint`, `pnpm --filter client typecheck`, `pnpm --filter client build`, `pnpm contracts:validate`) and resolve any lint, type, build, or test issues
- [X] T042 Execute `/impeccable` rendered craft verification across `320px`, `375px`, `768px`, `1024px`, and `1440px` viewports (plus `200%` zoom, keyboard-only pass, contrast check, and `prefers-reduced-motion` emulation) per `specs/002-enhance-auth-ux/quickstart.md`, and apply any batched visual/accessibility refinements across affected `client/` components

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — starts immediately (`T001` first for package install; `T002`, `T003`, `T004` run in parallel).
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS** all user story phases. Inside Phase 2, `T005–T012`, `T014–T018` can be authored in parallel batches once `T001`/`T002`/`T004` finish; `T013` depends on `T003`, `T011`, `T012`.
- **Phase 3 (US1 — P1 MVP)** through **Phase 8 (US6 — P3)**: Depend on Phase 2 completion.
  - **US1** (`T019–T022`) delivers `<AuthSplitShell />` and `(auth)/layout.tsx`, which visually frames `US2`, `US3`, and `US4` routes (`T019–T020` should complete before final visual check of `US2–US4`, though page-level code in `US2`, `US3`, `US4`, `US5`, and `US6` operates on independent files).
  - **US4** (`T030`) reuses `<PassphraseGuidance />` from **US2** (`T025`), so `T023–T025` precede `T030`.
  - **US3** (`T027–T028`), **US5** (`T031–T036`), and **US6** (`T037–T039`) are independent of each other after Phase 2.
- **Phase 9 (Polish & Verification)**: Depends on completion of Phases 3–8 (`T040` → `T041` → `T042`).

### Parallel Execution Examples

```text
# Phase 2 parallel batch A (shadcn/ui primitives):
T005 button.tsx | T006 input.tsx + label.tsx | T007 card.tsx + separator.tsx | T008 alert.tsx + badge.tsx
T009 progress.tsx + skeleton.tsx | T010 alert-dialog.tsx + collapsible.tsx | T011 dropdown-menu.tsx + avatar.tsx + tooltip.tsx | T012 sonner.tsx

# Phase 2 parallel batch B (pure helpers + shared auth components):
T014 auth-validation.mjs | T015 auth-validation.test.mjs | T016 use-rate-limit-cooldown + rate-limit-banner | T017 form-error-summary + auth-field | T018 client.ts broadcast reason

# Phase 4 (US2) parallel helper + test batch:
T023 passphrase-policy.mjs | T024 passphrase-policy.test.mjs

# Phase 7 (US5) parallel parser/time + test batch:
T031 user-agent-parser.mjs | T032 user-agent-parser.test.mjs | T033 session-time.mjs | T034 session-time.test.mjs
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete **Phase 1 (Setup)** and **Phase 2 (Foundational)**.
2. Complete **Phase 3 (US1)** — delivers the approved GridAware split-screen auth identity across `(auth)/layout.tsx`, `/`, and `/login` with full arrival banners, Caps Lock cue, live rate-limit cooldown, and accessible error summary.
3. Validate US1 independently before layering subsequent stories.

### Incremental Delivery

1. **Setup + Foundational** → EVARAX `shadcn/ui` component library + tested validation/cooldown base.
2. **US1 (P1)** → Split-screen identity shell, `/` entry, and elevated `/login`.
3. **US2 (P1)** → Guided `/register` with live Unicode passphrase policy, strength meter, and conflict recovery.
4. **US3 (P2)** → Complete `/verify-email` lifecycle with 3-step progression and collapsible troubleshooting.
5. **US4 (P2)** → Privacy-safe `/forgot-password` confirmation view and immediate missing-token detection on `/reset-password`.
6. **US5 (P2)** → Human-readable `/app/profile` identity card and safe `AlertDialog`-confirmed Active Sessions management.
7. **US6 (P3)** → Cohesive protected header navigation, user menu, sign-out sync, `/onboarding`, and `/app`.
8. **Polish** → Full static/unit/build/contract checks + `/impeccable` rendered viewport & accessibility pass.
