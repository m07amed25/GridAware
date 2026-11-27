# Frontend Route, Proxy & UI State Contract

**Feature**: `001-auth-identity-management`  
**Frontend Runtime**: Next.js `16.4.6` App Router (`cacheComponents: true`, `partialPrefetching: true`) · React `19.3.0` · Tailwind CSS `4.3.3`  
**References**: [`docs/design/sitemap.md`](../../../docs/design/sitemap.md) · [`docs/design/design-system.md`](../../../docs/design/design-system.md) · [`docs/design/accessibility-specification.md`](../../../docs/design/accessibility-specification.md)

---

## 1. Route Inventory (`client/app/`)

| Route              | Route Group / File                     | Access Policy                                                                      | Primary Responsibility & Required UI States                                                                                                                                                                                                                                                                                                                        |
| ------------------ | -------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`                | `app/page.tsx`                         | Public entry                                                                       | Redirects authenticated users to `/app`; presents minimal EVARAX entry actions (`Sign in`, `Create account`) to unauthenticated visitors.                                                                                                                                                                                                                          |
| `/register`        | `app/(auth)/register/page.tsx`         | Guest-only (redirects signed-in users to `/app`)                                   | Registration form (`displayName`, `email`, `password`). States: idle, client/server field validation errors, `409 EMAIL_UNAVAILABLE` conflict banner with direct `/login` and `/forgot-password` links, `429` cooldown notice, pending disabled submit, transition to `/verify-email?email=<encoded>&sent=1`.                                                      |
| `/login`           | `app/(auth)/login/page.tsx`            | Guest-only (redirects signed-in users to `/app` or validated internal `next` path) | Sign-in form (`email`, `password`). Supports `?reason=session-expired` and `?verified=1` banners. States: idle, generic `INVALID_CREDENTIALS` banner, `ACCOUNT_NOT_ACTIVE` (`PENDING_VERIFICATION` prompt with one-click link to `/verify-email` resend vs. `SUSPENDED`/`DEACTIVATED` notice), `429` cooldown notice, pending disabled submit.                     |
| `/verify-email`    | `app/(auth)/verify-email/page.tsx`     | Public                                                                             | Dual-mode verification page: (1) when `?token=...` is present, confirms via `POST /api/v1/auth/email-verification/confirm` and displays verified CTA to `/login?verified=1` or expired/used error with resend form; (2) when opened post-registration, displays pending instructions and rate-limited resend form (`POST /api/v1/auth/email-verification/resend`). |
| `/forgot-password` | `app/(auth)/forgot-password/page.tsx`  | Public                                                                             | Password recovery request form (`email`). Always renders generic non-enumerating confirmation state upon `202` response (`POST /api/v1/auth/password-reset/request`).                                                                                                                                                                                              |
| `/reset-password`  | `app/(auth)/reset-password/page.tsx`   | Public                                                                             | Reads `?token=...`, validates new passphrase (`12..128` chars), submits `POST /api/v1/auth/password-reset/confirm`, and shows confirmation CTA to `/login` or invalid/expired token state with link back to `/forgot-password`.                                                                                                                                    |
| `/onboarding`      | `app/(protected)/onboarding/page.tsx`  | Authenticated (`ACTIVE`)                                                           | Minimal Phase 5.1 authenticated handoff screen displaying verified user identity and Phase 5.2 organization-setup readiness state.                                                                                                                                                                                                                                 |
| `/app`             | `app/(protected)/app/page.tsx`         | Authenticated (`ACTIVE`)                                                           | Protected shell entry displaying authenticated user summary, navigation to `/app/profile`, and sign-out control.                                                                                                                                                                                                                                                   |
| `/app/profile`     | `app/(protected)/app/profile/page.tsx` | Authenticated (`ACTIVE`)                                                           | Safe user profile card (`displayName`, `email`, `status`, `emailVerified`) + **Active Sessions** table (`GET /api/v1/auth/sessions`) with `Current session` badge, per-session `Revoke` action (`DELETE /api/v1/auth/sessions/:sessionId`), and `Sign out of all sessions` confirmation action (`POST /api/v1/auth/logout-all`).                                   |

---

## 2. Next.js 16 `client/proxy.ts` Optimistic Routing Contract

Per Next.js 16 conventions (`client/AGENTS.md`), `client/proxy.ts` replaces `middleware.ts` and performs fast cookie-presence checks only (authoritative verification always executes in NestJS guards and the Server Component DAL):

1. **Protected Prefixes (`/app/:path*`, `/onboarding/:path*`)**:
   - If neither `ga_access` nor `ga_refresh` cookie exists on the incoming request, redirect (`307`) to `/login?next=<sanitizedRelativePath>`.
   - Sanitize `next` strictly to internal relative paths matching `/^\/(?!\/)/` to prevent open-redirect vulnerabilities.
2. **Guest-Only Auth Pages (`/login`, `/register`)**:
   - If a `ga_access` cookie is present (and `?reason=session-expired` is not set), redirect (`307`) to `/app`.
3. **Pass-Through**:
   - `/api/:path*` continues through `next.config.ts` rewrites directly to `${API_INTERNAL_URL}/api/:path*` preserving `Cookie`, `Set-Cookie`, `X-CSRF-Token`, `X-Request-Id`, and `Origin` headers.

---

## 3. Client Auth Transport, CSRF & Multi-Tab Refresh Contract (`client/lib/auth/`)

1. **Zero Script-Readable Secret Storage (`FR-007`)**:
   - Neither `ga_access` nor `ga_refresh` is ever read from or written to `localStorage`, `sessionStorage`, `IndexedDB`, or URL query strings.
2. **CSRF Attachment**:
   - Before any `POST`, `PUT`, `PATCH`, or `DELETE` call to `/api/v1/*`, read `ga_csrf` from `document.cookie` (if absent, bootstrap via `GET /api/v1/auth/csrf` once) and attach `X-CSRF-Token`.
3. **Serialized Multi-Tab Refresh (`FR-010`)**:
   - When an authenticated request returns `401 UNAUTHENTICATED`:
     - Acquire `navigator.locks.request('gridaware:auth:refresh', ...)` (falling back to an in-process shared `Promise` lock when `navigator.locks` is undefined).
     - Execute `POST /api/v1/auth/refresh` at most once per expiration window; never trigger recursive refresh on `/auth/login`, `/auth/register`, or `/auth/refresh` itself.
     - If refresh succeeds (`200`), replay the original request once and broadcast `{ type: 'SESSION_REFRESHED' }` over `BroadcastChannel('gridaware:auth')`.
     - If refresh fails (`401 SESSION_EXPIRED` or `403 ACCOUNT_NOT_ACTIVE`), broadcast `{ type: 'SESSION_INVALIDATED' }` and navigate cleanly to `/login?reason=session-expired`.
4. **Next.js 16 `cacheComponents: true` Server Boundaries**:
   - Never call `cookies()` at the root of `app/layout.tsx` or inside plain `'use cache'`.
   - Wrap authenticated server trees inside `<Suspense fallback={<AuthShellSkeleton />}>` so static shells prerender cleanly without Next.js 16 build errors.

---

## 4. EVARAX & WCAG 2.2 AA UI Contract (`FR-020`, `SC-006`)

- **Immutable EVARAX Tokens (`client/app/globals.css`)**:
  - `--color-yellow: #f4e952`, `--color-lime: #f6fa45`, `--color-gold: #fcce35`, `--color-black: #080808`, `--color-off-white: #e9ecf2`, `--color-white: #ffffff`.
  - Derived dark neutral surfaces (`--surface-canvas: #080808`, `--surface-1: #101010`, `--surface-2: #171717`, `--surface-3: #202020`, `--border-subtle: #2a2a2a`, `--border-default: #363636`) and distinct semantic status tokens (`--status-success`, `--status-warning`, `--status-critical`, `--status-info`, `--status-offline`, `--status-unknown`).
- **Accessibility**:
  - Primary CTA button uses `--color-yellow` (`#F4E952`) fill with `--color-black` (`#080808`) text (`> 16:1` contrast ratio); never render yellow/lime text on light backgrounds.
  - Every input has an explicit visible `<label htmlFor>`, `aria-invalid`, and `aria-describedby` pointing to inline text + icon error messages (never red border alone).
  - Forms support password managers (`autoComplete="email"`, `autoComplete="new-password"`, `autoComplete="current-password"`) and paste (`accessibility-specification.md` §10).
  - Full keyboard tab order, visible `--color-lime` / high-contrast `:focus-visible` outlines, minimum `44×44px` interactive targets, and `@media (prefers-reduced-motion: reduce)` compliance.
