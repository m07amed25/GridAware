# Quickstart & Validation Guide: Authentication & Identity UI/UX Enhancement

**Feature**: `002-enhance-auth-ux`  
**Plan**: [plan.md](./plan.md) | **Contracts**: [auth-ui-contract.md](./contracts/auth-ui-contract.md) | **State Model**: [data-model.md](./data-model.md)

---

## 1. Prerequisites

1. Node.js `>= 24` and `pnpm@12.18.0` installed (`corepack enable`).
2. Local dependencies installed at repository root:
   ```bash
   pnpm install
   ```
3. For live end-to-end browser verification against real Phase 5.1 auth endpoints:
   - Local infrastructure running (`pnpm docker:infra` for Redis, configured Neon/PostgreSQL `DATABASE_URL` in `server/.env`, and `MAIL_PROVIDER=console` in local dev).
   - Both apps running via `pnpm dev` (`client` on `http://localhost:3000`, `server` on `http://localhost:3001`).

---

## 2. Automated Verification Commands

Run all static, unit, contract, and build checks from repository root:

```bash
pnpm --filter client test
pnpm --filter client lint
pnpm --filter client typecheck
pnpm --filter client build
pnpm contracts:validate
```

**Expected outcomes**:
- `client test`: Existing auth proxy/client/env tests **plus** new unit tests for `passphrase-policy.mjs`, `user-agent-parser.mjs`, `auth-validation.mjs`, and `session-time.mjs` all pass.
- `client lint`, `client typecheck`, `client build`: Exit `0` with zero warnings/errors.
- `contracts:validate`: Exit `0` (confirming zero backend contract drift).

---

## 3. End-to-End Functional & UX Walkthrough

Verify each user story on `http://localhost:3000`:

1. **US1 — Split-Screen Entry & Sign-In (`/`, `/login`)**:
   - At `1440px` and `1024px`: confirm asymmetric split-screen with Node G lockup, calm 3×3 pattern strictly in the brand column, zero pattern behind form inputs, and crisp EVARAX primary CTA (`#F4E952` fill / `#080808` text, non-lime hover, `#F6FA45` `:focus-visible` ring).
   - Visit `/login?verified=1`, `/login?reset=1`, `/login?reason=session-expired`, and `/login?reason=signed-out` to verify distinct semantic arrival banners (icon + text).
   - Toggle passphrase visibility (`Show passphrase` / `Hide passphrase`), test Caps Lock inline cue while typing, submit wrong credentials to confirm generic error + preserved email, and submit rapid invalid logins to verify live second-by-second rate-limit cooldown countdown & automatic re-enable.
   - Sign in with an unverified account to confirm pending-verification banner and pre-filled link to `/verify-email?email=...`.

2. **US2 — Guided Registration (`/register`)**:
   - Type a short passphrase (`< 12` chars) and confirm live tabular character count (`font-mono tabular-nums`), unmet policy icon+text, and advisory strength meter; expand to `12+` and `20+` chars (including spaces/Unicode) to observe policy check and strength progression.
   - Enter mismatched confirm passphrase and blur to confirm gentle inline validation; submit with multiple invalid fields to verify focusable multi-field `<FormErrorSummary />` with input jump links.
   - Submit an already-registered email to confirm calm non-enumerating conflict banner with pre-filled `Sign in` and `Reset passphrase` links.
   - Submit valid details to confirm single-submit lock and transition to `/verify-email?email=...&sent=1`.

3. **US3 — Email Verification Lifecycle (`/verify-email`)**:
   - Confirm 3-step indicator (`Account created` → `Verify email` → `Sign in`), highlighted target email, 24h validity copy, and expandable inbox troubleshooting disclosure.
   - Open an invalid/expired token (`/verify-email?token=invalid`) to confirm error banner paired directly with the resend form.
   - Open the real single-use verification link logged by the server's console mailer to verify loading state → verified success card → `Continue to sign in` (`/login?verified=1`).

4. **US4 — Passphrase Recovery & Reset (`/forgot-password`, `/reset-password`)**:
   - Submit an email on `/forgot-password` and confirm transition from form to privacy-preserving confirmation view (60-min link notice, `Try another email`, `Back to sign in`).
   - Open `/reset-password` with **no** `?token=` parameter and confirm immediate invalid-link recovery view (no submittable password form).
   - Open the real reset link from the server console log, verify upfront all-sessions sign-out notice, live passphrase policy + confirmation field, and clean post-reset completion screen routing to `/login?reset=1`.

5. **US5 — Identity Profile & Active Sessions (`/app/profile`)**:
   - Verify Identity Summary Card (initials avatar, display name, verified badge, status badge, active session quota `N of 10` + progress bar).
   - Verify human-readable browser/OS/device rows with device icons, `Current session` badge, relative + exact timestamps with timezone, idle + absolute expiry, and expandable `Client details` revealing the raw user-agent string.
   - Revoke a secondary session and confirm per-row spinner, immediate list update, polite status announcement, and confirmation toast.
   - Click `Sign out of all sessions` to verify focus-trapped `AlertDialog`, Escape/Cancel focus restoration, and full sign-out + cross-tab redirect (`?reason=signed-out`) on confirmation.
   - Simulate an API failure (e.g., offline network) on session fetch to verify error banner with reference ID (when available) and working `Retry` control.

6. **US6 — Shell, Onboarding & Accessibility (`/onboarding`, `/app`, all routes)**:
   - Verify active navigation `aria-current="page"` + visual indicator, accessible user dropdown menu, and honest `/onboarding` handoff copy (zero fake Phase 5.2 controls).
   - Verify favicon/manifest/title in browser tab and DevTools Application tab.

---

## 4. `/impeccable` Visual, Responsive & Accessibility Verification

1. Capture rendered screenshots across viewports (`320px`, `375px`, `768px`, `1024px`, `1440px`) on `/login`, `/register`, `/verify-email`, `/forgot-password`, `/reset-password`, `/app/profile`, and `/onboarding` (e.g., via `.agents/skills/impeccable/scripts/impeccable.cmd shot <url>` or browser inspection).
2. Confirm:
   - Zero horizontal overflow at `320px` and `200%` browser zoom.
   - All primary buttons, inputs, toggles, and triggers meet `≥ 44 × 44 px` touch targets; mobile inputs use `16px` font size.
   - Complete keyboard-only pass (`Tab`, `Shift+Tab`, `Enter`, `Space`, `Escape`) with unobscured `#F6FA45` focus rings.
   - Reduced-motion emulation (`prefers-reduced-motion: reduce`) disables transitions/skeleton animations cleanly.
   - Zero raw starter assets (`next.svg`, `vercel.svg`) or EVARAX contrast violations (`DESIGN.md §3.4`).
