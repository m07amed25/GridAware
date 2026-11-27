# Phase 0 Technical Research: Authentication & Identity Management

**Feature**: `001-auth-identity-management`  
**Date**: 2026-11-26  
**Spec**: [spec.md](./spec.md)

## Overview

This research document resolves all technical implementation choices for Phase 5.1 Authentication & Identity Management against the live GridAware monorepo (`server/` NestJS 12 ESM + Prisma 7.10.1 + Zod 4.6.7 + Redis + Vitest 4; `client/` Next.js 16.4.6 App Router with `cacheComponents: true` + Tailwind CSS 4.3.3), the Phase 3.2/3.3 architecture docs, and the GridAware Constitution (`v1.0.0`).

---

## R1. Browser Session & Token Transport Strategy (`OPEN AUTH-01` Resolution)

- **Decision**: Use a **short-lived signed `HS256` access JWT** (`15m` default TTL) paired with a **stateful, rotating opaque refresh credential** (`<sessionId>.<base64url-256bit-secret>`, governed by a `14d` sliding inactivity timeout and a `30d` hard absolute lifetime cap), both transported exclusively via **`HttpOnly` cookies** (`ga_access` on `Path=/` and `ga_refresh` on `Path=/api/v1/auth`). Sign and verify access JWTs with `jose` (`SignJWT` / `jwtVerify`, pinned to `algorithms: ['HS256']`, explicit `iss` and `aud`) inside a custom NestJS `AccessTokenGuard`.
- **Rationale**:
  - `HttpOnly` cookies satisfy `FR-007` and `NFR-SEC-005` by making access and refresh credentials inaccessible to client JavaScript (`XSS` exfiltration mitigation) while working seamlessly across Next.js Server Components, Route Handlers, and browser `fetch(..., { credentials: 'include' })`.
  - Formatting the refresh cookie value as `<sessionId>.<secret>` allows `O(1)` lookup by `AuthSession.id` (UUID) while persisting only `SHA-256(secret)` in `refreshTokenHash`, enabling deterministic detection of replayed pre-rotation secrets on an existing unrevoked session (`FR-009`).
  - `jose` is native ESM/WebCrypto with zero CommonJS friction in `server/` (`"type": "module"`, NestJS 12), avoiding Passport CJS wrapper overhead while keeping guard error mapping 100% aligned with `AppException`.
- **Alternatives Considered**:
  - _`localStorage` / `sessionStorage` Bearer tokens_: Rejected; explicitly prohibited by Phase 5.1 §9.1 and `FR-007` due to script-readability under XSS.
  - _Pure stateless refresh JWTs_: Rejected; cannot deterministically enforce immediate single-session revocation, password-reset mass revocation, 10-session LRU eviction, or token-replay invalidation without a backing session store.
  - _`@nestjs/passport` + `passport-jwt`_: Rejected; adds CommonJS adapter layers and implicit global Passport state without adding capability beyond a focused 50-line `AccessTokenGuard` using `jose`.

---

## R2. Cookie Topology & CSRF Defense

- **Decision**: Default to **same-origin proxy topology** in local development and standard deployments via Next.js `/api/:path*` rewrites (`SameSite=Lax`, `HttpOnly=true`, `Secure=true` in production / `false` on localhost HTTP), while supporting configurable cross-origin deployments (`COOKIE_SAME_SITE`, `COOKIE_SECURE`, `COOKIE_DOMAIN`) in `EnvService`. Enforce **Double-Submit CSRF Token + Strict `Origin`/`Referer` Verification** via `CsrfGuard` on all state-changing `/api/v1/*` requests (`POST`, `PUT`, `PATCH`, `DELETE`) when auth cookies are present or on `/api/v1/auth/*` cookie mutations.
  - A non-`HttpOnly` cookie `ga_csrf` (`SameSite=Lax` or matching `COOKIE_SAME_SITE`, `Secure` in production, `Path=/`) holds a `256-bit` random token (obtainable/refreshed via `GET /api/v1/auth/csrf` and rotated on login/refresh).
  - Clients attach `X-CSRF-Token: <ga_csrf value>` on every state-changing request; `CsrfGuard` constant-time compares the header against `ga_csrf` (`crypto.timingSafeEqual`) AND verifies `Origin` (or `Referer` fallback) against `EnvService.corsOrigin`.
- **Rationale**: Phase 5.1 §5.2 mandates an explicit CSRF defense rather than relying on `SameSite` alone. Double-submit + `Origin` verification requires zero extra database queries, works across multi-tab clients, and protects `/auth/refresh`, `/auth/logout`, `/auth/logout-all`, and future Phase 5.2+ mutations alike.
- **Alternatives Considered**:
  - _`SameSite=Lax` only_: Rejected; explicitly forbidden as sole defense by Phase 5.1 §5.2 and insufficient if cross-site subdomain deployments use `SameSite=None`.
  - _Server-stored per-form synchronizer tokens_: Rejected; breaks multi-tab workflows and adds unnecessary database/Redis state on read views.

---

## R3. Password Hashing, Constant-Time Anti-Enumeration & Single-Use Token Verifiers

- **Decision**:
  - **Passwords**: Use **`@node-rs/argon2`** configured to Argon2id (`Algorithm.Argon2id`, `memoryCost: 19456` KiB [19 MiB], `timeCost: 2`, `parallelism: 1`—meeting OWASP Password Storage Cheat Sheet minimums and tunable via env) encapsulated behind `PasswordHasherService`. Enforce `12..128` Unicode character length (`Array.from(password).length` or string code-unit check up to 128 chars, UTF-8 byte cap <= 512 bytes) with zero silent truncation. On `POST /auth/login` when no user matches `normalizedEmail`, execute `verify()` against a precomputed dummy Argon2id hash so unknown-email and wrong-password paths exhibit indistinguishable latency (`FR-005`).
  - **High-Entropy Tokens (Refresh, Email Verification, Password Reset)**: Generate `32` cryptographically random bytes (`crypto.randomBytes(32).toString('base64url')`, 256 bits of entropy) and store only `SHA-256` hex digests (`crypto.createHash('sha256')`) in unique indexed columns (`refreshTokenHash`, `tokenHash`).
- **Rationale**:
  - `@node-rs/argon2` ships precompiled native N-API binaries for Windows x64/ARM64 and Linux musl/glibc (`node:alpine` Docker images), avoiding `node-gyp` C++ compilation failures while delivering native Rust Argon2id performance.
  - 256-bit random tokens carry massive entropy (`2^256`), making unsalted `SHA-256` immune to offline brute-force while enabling indexed `O(1)` lookup and uniqueness constraints in PostgreSQL.
- **Alternatives Considered**:
  - _`bcrypt`_: Rejected; truncates inputs at 72 bytes (violating `FR-003` long-passphrase requirement) and lacks memory-hardness.
  - _`argon2` (node-gyp C binding)_: Viable alternative, but `@node-rs/argon2` avoids native toolchain build friction across Windows workstations and Alpine containers.

---

## R4. Atomic Refresh Rotation, Replay Detection & Multi-Tab Coordination

- **Decision**:
  - **Server-Side Atomic Rotation & Replay Detection**: Inside `SessionsService.rotateSession()` using `prisma.$transaction`:
    1. Parse `<sessionId>.<rawSecret>` from `ga_refresh`; look up `AuthSession` with owning `User`.
    2. Reject immediately if session does not exist (`SESSION_EXPIRED`), `User.status !== 'ACTIVE'` (`ACCOUNT_NOT_ACTIVE`), `revokedAt !== null` (`SESSION_EXPIRED`), or `now >= idleExpiresAt || now >= absoluteExpiresAt` (`SESSION_EXPIRED`).
    3. Compute `incomingHash = sha256(rawSecret)`. If `incomingHash !== session.refreshTokenHash`, a superseded token for an active session was replayed: atomically set `revokedAt = now`, `revokedReason = 'TOKEN_REUSE'`, commit an `AUTH_SESSION_REUSE_DETECTED` `AuditLog` entry (committed outside rollback), clear cookies, and return `401 SESSION_EXPIRED` (`FR-009`).
    4. Otherwise, perform an atomic conditional update `updateMany({ where: { id: sessionId, refreshTokenHash: incomingHash, revokedAt: null }, data: { refreshTokenHash: nextHash, lastUsedAt: now, idleExpiresAt: min(now + 14d, absoluteExpiresAt) } })`. If `count === 0` (concurrent race), treat as superseded and revoke.
  - **Browser Multi-Tab Coordination (`FR-010`)**: Wrap client-side `/api/v1/auth/refresh` calls in `navigator.locks.request('gridaware:auth:refresh', ...)` (with an in-memory singleton `Promise` fallback when Web Locks API is unavailable, e.g., Node tests) plus a `BroadcastChannel('gridaware:auth')` notification so simultaneous `401` responses across multiple open tabs trigger **one** serialized refresh request; waiting tabs then retry their original request using the newly set `ga_access` cookie.
- **Rationale**: Satisfies both strict zero-grace replay revocation (`FR-009`) and seamless multi-tab operation (`FR-010`) without weakening replay detection with a multi-second reuse grace window.
- **Alternatives Considered**:
  - _Grace-period reuse window (e.g., 10s)_: Rejected; weakens `FR-009` ("Given a renewal credential that has already been rotated once, When any caller presents that superseded credential again, Then the platform rejects the request, immediately revokes the associated session") when Web Locks already prevents legitimate tab races.

---

## R5. Concurrent Session Cap (LRU Eviction) & Token Reissue Invalidation

- **Decision**:
  - **10-Session Cap with LRU Eviction (`FR-013`)**: During login session creation inside `prisma.$transaction`, query active sessions (`userId`, `revokedAt: null`, `idleExpiresAt > now`, `absoluteExpiresAt > now`) ordered by `lastUsedAt ASC, createdAt ASC`. If active count `>= env.authMaxActiveSessions` (default `10`), revoke the oldest `(count - max + 1)` session(s) (`revokedAt = now`, `revokedReason = 'MAX_SESSIONS_EVICTED'`) and append `AUTH_SESSION_EVICTED` audit record(s) before inserting the new `AuthSession`.
  - **Prior Link Invalidation on Reissue (`FR-014`, `FR-016`)**: When issuing a new `EmailVerificationToken` or `PasswordResetToken` inside `prisma.$transaction`, execute `updateMany({ where: { userId, usedAt: null, invalidatedAt: null }, data: { invalidatedAt: now } })` before inserting the new token row so at most one active token per type per user exists at any instant.
- **Rationale**: Directly implements Session 2026-11-26 clarifications Q4 and Q5 atomically inside PostgreSQL transactions with full audit visibility.
- **Alternatives Considered**:
  - _Deleting superseded token rows_: Rejected; setting `invalidatedAt` preserves forensic/audit clarity distinguishing expired, consumed (`usedAt`), and superseded (`invalidatedAt`) links.

---

## R6. Dual-Key Sliding-Window Rate Limiting via `RedisService`

- **Decision**: Build `AuthRateLimitService` + `@AuthRateLimit(policy)` guard in `server/src/auth/guards/auth-rate-limit.guard.ts` backed by the existing `RedisService` (`ioredis` atomic Lua sliding-window counter using sorted sets `ZREMRANGEBYSCORE` + `ZCARD` + `ZADD` + `PEXPIRE`).
  - Policies (all environment-configurable):
    - `register`: `5` req / `15m` per IP + `3` req / `15m` per normalized email hash.
    - `login`: `10` req / `15m` per IP + `5` req / `15m` per normalized email hash.
    - `verifyResend`: `5` req / `15m` per IP + `3` req / `15m` per normalized email hash.
    - `passwordResetRequest`: `5` req / `15m` per IP + `3` req / `15m` per normalized email hash.
    - `refresh`: `30` req / `5m` per IP.
  - Hash normalized emails with `SHA-256` in Redis keys (`rl:auth:login:acct:<sha256>`) so PII (raw email addresses) is never stored as plain-text Redis keys. Emit `Retry-After` seconds header and throw `AppException.rateLimited()` (`429 RATE_LIMITED`). Never alter `User.status` on rate-limit hits (temporary cooldown only per Clarification Q3).
- **Rationale**: Reuses the already-configured `RedisModule` / `RedisService` without adding redundant Redis connections, enforces dual IP + normalized-email throttling, and avoids storing raw email PII in Redis keyspaces.
- **Alternatives Considered**:
  - _`@nestjs/throttler` in-memory store_: Rejected; per-process memory resets on restart, fails across multiple API replicas, and requires custom storage wiring anyway to support dual IP + body-email keys.

---

## R7. Validation, Error Codes & API Contract Alignment

- **Decision**:
  - **Validation**: Use `zod` (`4.6.7`, `.strict()` on all command schemas to reject unknown fields per `ARC-API-STD-001`) with the existing `StandardSchemaValidationPipe` (`server/src/common/exceptions/validation.pipe.ts`), paired with explicit `@nestjs/swagger` DTO classes for OpenAPI generation.
  - **Error Codes**: Extend `ErrorCode` & `ERROR_CATALOG` in `server/src/common/exceptions/error-codes.ts` with Phase 5.1 machine-readable codes (`INVALID_CREDENTIALS` 401, `SESSION_EXPIRED` 401, `ACCOUNT_NOT_ACTIVE` 403, `EMAIL_UNAVAILABLE` 409, `INVALID_TOKEN` 400, `CSRF_INVALID` 403) while keeping `UNAUTHENTICATED` (401) for missing/invalid access credentials on protected endpoints.
  - **Success Envelope & `/me` Alias**: Return `{ data, meta: { requestId, servedAt } }` across all `200`/`201`/`202` JSON responses (`204 No Content` on `POST /auth/logout` when empty body is appropriate, or `{ data: { revoked: true }, meta }` — align consistently in OpenAPI contract: `200` JSON envelope on action confirmations and `204` or `200` as documented in `contracts/auth-openapi.yaml`). Expose `GET /api/v1/auth/me` as the canonical Phase 5.1 current-user endpoint AND register `GET /api/v1/me` as a forward-compatible alias returning `{ ...user, memberships: [] }` so `docs/contracts/openapi.yaml` (`GET /me`) stays 100% valid until Phase 5.2 populates `memberships`.
- **Rationale**: Zero duplicate validation libraries (avoids mixing `class-validator` with `zod`), full backward compatibility with `server/src/contracts/contracts-validation.spec.ts`, and strict RFC 7807 error formatting.
- **Alternatives Considered**:
  - _Adding `class-validator` + `class-transformer`_: Rejected; `server/AGENTS.md` and `validation.pipe.ts` already standardized the codebase on `zod` + `StandardSchemaValidationPipe`.

---

## R8. Next.js 16 (`cacheComponents: true`) Frontend Architecture & EVARAX Design System

- **Decision**:
  - **Proxy (`client/proxy.ts`)**: Use Next.js 16's `proxy.ts` file convention (which replaces `middleware.ts`) to perform fast, optimistic cookie-presence routing: redirect unauthenticated requests to `/app/:path*` or `/onboarding/:path*` (when neither `ga_access` nor `ga_refresh` cookie is present) to `/login?next=<encodedPath>`, and redirect authenticated users (`ga_access` present) visiting `/login` or `/register` to `/app`.
  - **Cache Components Compatibility**: Because `cacheComponents: true` is enabled in `client/next.config.ts`, never call `cookies()` at layout root or inside plain `'use cache'`. Place session-aware server reads inside `<Suspense>` boundaries via a Data Access Layer (`client/lib/auth/server.ts`), and perform interactive mutations/auto-refresh through a typed client helper (`client/lib/auth/client.ts`) backed by Web Locks refresh serialization.
  - **Routes & EVARAX UI**: Implement `/login`, `/register`, `/verify-email` (handles both pending/resend state and `?token=...` confirmation), `/forgot-password`, `/reset-password` (`?token=...`), `/onboarding` (minimal Phase 5.1 signed-in handoff shell awaiting Phase 5.2 org creation), and `/app` + `/app/profile/security` (current user profile, active sessions table with per-session revoke + "Sign out all sessions", and sign-out button) styled with the exact EVARAX dark-first CSS tokens in `client/app/globals.css` and WCAG 2.2 Level AA semantics.
- **Rationale**: Adheres strictly to `client/AGENTS.md` Next.js 16 breaking-change rules (`proxy.ts` and `cacheComponents` `<Suspense>` discipline), `docs/design/sitemap.md`, `docs/design/design-system.md`, and `docs/design/accessibility-specification.md`.
- **Alternatives Considered**:
  - _Legacy `middleware.ts` or top-level layout `await cookies()`_: Rejected; deprecated/incompatible with Next.js 16 `cacheComponents: true` build validation.

---

## R9. Mail Delivery Port & Transactional Outbound Boundary

- **Decision**: Define an injectable `MailerPort` token/interface in `server/src/mail/mailer.port.ts` with two implementations selected via `MAIL_PROVIDER`:
  1. `ConsoleMailerAdapter` (`MAIL_PROVIDER=console`): Allowed **only** when `NODE_ENV !== 'production'` (enforced by `serverEnvSchema` startup validation). Emits a structured developer-only notice with the target email and local verification/reset URL so local development and E2E tests (via an injectable test sink) work offline without leaking tokens into `AuditLog` or production logs.
  2. `ResendHttpMailerAdapter` (or generic `WebhookHttpMailerAdapter` via native `fetch`, `MAIL_PROVIDER=resend`): Sends transactional verification and password-reset emails over HTTPS using `MAIL_API_KEY` and `MAIL_FROM` with a bounded timeout (`5000ms`), zero extra third-party SDK bloat, and non-fatal error capture after the Prisma transaction commits.
- **Rationale**: Keeps user/token database transactions fast and atomic, guarantees `MAIL_PROVIDER=console` cannot accidentally ship to production (Phase 5.1 §10), and avoids heavy SMTP/SDK dependencies.
- **Alternatives Considered**:
  - _`nodemailer` SMTP in Phase 5.1_: Rejected as unnecessary dependency weight when native `fetch` to a transactional HTTP mail API + `ConsoleMailerAdapter` covers both deployed and local/test environments cleanly behind `MailerPort`.
