# UI & Route Interface Contract: Authentication & Identity UI/UX Enhancement

**Feature**: `002-enhance-auth-ux`  
**Date**: 2026-11-27  
**Backend Contract Dependency**: Phase 5.1 OpenAPI contract (`specs/001-auth-identity-management/contracts/auth-openapi.yaml`, unchanged).

---

## 1. Backend API Consumption (Read-Only Reuse, Zero Breaking Changes)

All endpoints continue to be called exclusively via `client/lib/auth/client.ts` (`apiRequest`, double-submit CSRF `X-CSRF-Token`, `credentials: "include"`, Web Locks refresh coordination):

| UI Action | Endpoint | Key Response / Error Codes Handled |
| --- | --- | --- |
| Sign in | `POST /api/v1/auth/login` | `200 { user }`; `401 INVALID_CREDENTIALS`; `403 ACCOUNT_NOT_ACTIVE`; `429 RATE_LIMITED` (`Retry-After`); `400 VALIDATION_ERROR` |
| Register | `POST /api/v1/auth/register` | `201 { user }`; `409 EMAIL_UNAVAILABLE`; `429 RATE_LIMITED` (`Retry-After`); `400 VALIDATION_ERROR` (`errors[]`) |
| Confirm email | `POST /api/v1/auth/email-verification/confirm` | `200 { verified: true }`; `400/410 INVALID_TOKEN` |
| Resend verification | `POST /api/v1/auth/email-verification/resend` | `200 { accepted: true }`; `429 RATE_LIMITED` (`Retry-After`) |
| Request password reset | `POST /api/v1/auth/password-reset/request` | `200 { accepted: true }`; `429 RATE_LIMITED` (`Retry-After`) |
| Confirm password reset | `POST /api/v1/auth/password-reset/confirm` | `200 { reset: true }`; `400/410 INVALID_TOKEN`; `429 RATE_LIMITED` |
| Current profile (SSR) | `GET /api/v1/auth/me` (via `getServerCurrentUser`) | `200 { user }`; `401` → redirect `/login?reason=session-expired` |
| List sessions | `GET /api/v1/auth/sessions` | `200 { sessions: AuthSessionSummary[] }`; `401` → redirect `/login?reason=session-expired` |
| Revoke one session | `DELETE /api/v1/auth/sessions/:id` | `200 { revoked: true }`; `404` → refresh list & inform user |
| Sign out current | `POST /api/v1/auth/logout` | `200 { revoked: true }` + broadcast `{ type: "SESSION_INVALIDATED", reason: "signed-out" }` |
| Sign out all sessions | `POST /api/v1/auth/logout-all` | `200 { revokedCount }` + broadcast `{ type: "SESSION_INVALIDATED", reason: "signed-out" }` |

---

## 2. Route & Query-Parameter Contract

| Route | Allowed Query Parameters | Security & Sanitization Rules |
| --- | --- | --- |
| `/` | None | Redirects authenticated users to `/app`; renders aligned GridAware split-screen entry for unauthenticated visitors. |
| `/login` | `next`, `reason` (`session-expired` \| `signed-out`), `verified` (`1`), `reset` (`1`), `email` | `next` MUST pass `sanitizeNextPath()`; `email` only pre-fills input value (never echoed unsafely); NEVER accept password/token query params. |
| `/register` | `email`, `next` | `email` optional prefill; `next` preserved only via `sanitizeNextPath()`. |
| `/verify-email` | `token`, `email`, `sent` (`1`) | `token` auto-triggers single confirmation call; never logged or exposed in error banners. |
| `/forgot-password` | `email` | Optional email prefill from `/login` or `/register` duplicate-email notice. |
| `/reset-password` | `token` | Missing/blank `token` immediately renders invalid-link recovery view before showing password inputs. |
| `/onboarding` | None | Protected; displays active verified identity handoff card and honest Phase 5.2 notice without fake org-creation controls. |
| `/app` | None | Protected; cohesive overview cards aligned with EVARAX tokens and `shadcn/ui` primitives. |
| `/app/profile` | None | Protected; displays Identity Summary Card (`SafeUserProfile`) + Active Sessions Panel (`AuthSessionSummary[]`). |

---

## 3. Shared `shadcn/ui` & Auth Component Contracts

### 3.1 Base `shadcn/ui` Primitives (`client/components/ui/`)

Every primitive consumes GridAware's semantic EVARAX tokens from `client/app/globals.css` (zero raw HEX codes inside component files):

- `button.tsx`: Variants `default` (EVARAX `#F4E952` fill, `#080808` text, `--brand-primary-hover` hover), `secondary`, `outline`, `ghost`, `destructive`, `link`; default touch-safe height `min-h-11` (`44px`) for auth/primary actions; `focus-visible` Neon Lime ring (`2px` + `2px` offset).
- `input.tsx`: `min-h-11`, `text-base sm:text-sm` (`16px` mobile prevents iOS auto-zoom), `bg-surface-2`, `border-border-default`, invalid state `aria-invalid:border-status-critical`.
- `label.tsx`: Radix Label, `text-[13px] font-medium text-text-primary`.
- `card.tsx`: `bg-surface-1`, `border-border-subtle`, `rounded-[var(--radius-lg)]`.
- `alert.tsx`: Variants `error` (`status-critical`), `warning` (`status-warning`), `success` (`status-success`), `info` (`status-info`), always pairing icon + text (`role="alert"` for errors, `role="status"` for non-error notices).
- `badge.tsx`: Variants `default`, `secondary`, `success`, `warning`, `critical`, `info`, `simulated`, always containing text + optional icon.
- `alert-dialog.tsx`: Radix AlertDialog with dark scrim, focus trap, Escape handling, focus restoration, and verb-based action slots.
- `collapsible.tsx`: Radix Collapsible for inbox troubleshooting and raw user-agent inspection.
- `dropdown-menu.tsx`: Radix DropdownMenu for top-bar user identity menu (`Profile & Sessions`, `Onboarding`, `Sign out`).
- `avatar.tsx`: Radix Avatar with high-contrast initials fallback on dark surface.
- `progress.tsx`: Radix Progress with accessible `aria-label` / `aria-valuetext`.
- `separator.tsx`: Subtle `border-subtle` horizontal/vertical divider.
- `skeleton.tsx`: Neutral surface pulse/shimmer disabled cleanly under `prefers-reduced-motion`.
- `tooltip.tsx`: Radix Tooltip for supplemental metadata only (never sole carrier of critical info).
- `sonner.tsx`: Dark EVARAX toast wrapper.

### 3.2 Domain Auth Components (`client/components/auth/`)

- `auth-split-shell.tsx`: Asymmetric desktop split-screen (`lg:grid-cols-[minmax(420px,46%)_1fr]`) with Node G lockup, `gridaware-pattern-dark.svg` backdrop strictly isolated to the brand column, calm operational proof points, and skip-to-main-content link.
- `auth-field.tsx`: Composes `Label`, `Input`, optional `labelAction` (e.g. `Forgot passphrase?`), passphrase visibility toggle (`Eye` / `EyeOff`), inline `CapsLockNotice`, helper text, and icon+text field error bound via `aria-describedby` + `aria-invalid`.
- `form-error-summary.tsx`: Focusable (`tabIndex={-1}`) alert box displayed when ≥ 2 fields fail validation, listing clickable field links that focus the target input.
- `passphrase-guidance.tsx`: Real-time character count (`font-mono tabular-nums`), 12–128 policy check icons + text, and advisory `Progress` strength bar with text tier label.
- `use-rate-limit-cooldown.ts` + `rate-limit-banner.tsx`: Wall-clock countdown hook (`endsAtMs`) and live warning banner with seconds remaining.
- `verification-stepper.tsx`: Compact 3-step visual progress indicator (`Account created` → `Verify email` → `Sign in`) with text + icon state cues.
- `active-sessions-panel.tsx`: Quota header (`N of 10`), `Skeleton` loading state, `Alert` + `Retry` error state (with `requestId`), parsed human-readable session rows with `Collapsible` raw user-agent, per-row revoke with `sonner` confirmation + polite status update, and `AlertDialog` confirmation for `Sign out of all sessions`.
- `protected-header.tsx`: Client navigation & `DropdownMenu` user menu in `(protected)/layout.tsx` marking active route with `aria-current="page"`, bold weight, and EVARAX yellow indicator bar.

---

## 4. Accessibility & Responsive Guarantees

- **Contrast**: Verified against `DESIGN.md §3.4` (`≥ 4.5:1` normal text, `≥ 3:1` UI boundaries/large text); zero yellow/lime text on white/cool-white surfaces.
- **Touch Targets**: All primary buttons, inputs, visibility toggles, and navigation triggers ≥ `44 × 44 px`.
- **Keyboard**: Complete Tab/Shift+Tab/Enter/Space/Escape flow across all forms, dropdowns, collapsibles, and dialogs; zero clickable `<div>` elements; unobscured `2px` `#F6FA45` focus ring with `2px` offset.
- **Reduced Motion**: Global `@media (prefers-reduced-motion: reduce)` eliminates transitions/animations; zero continuous pulsing or neon glow.
- **Viewports**: Verified overflow-free at `320px`, `375px`, `430px`, `768px`, `1024px`, `1280px`, `1440px`, and `200%` zoom.
