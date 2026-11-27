# Tasks: Authentication & Identity Management

**Input**: Design documents from `/specs/001-auth-identity-management/`

**Prerequisites**: [plan.md](./plan.md) (required), [spec.md](./spec.md) (required for user stories), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: Included per the Phase 5.1 scope (`spec.md` §SC-003, `plan.md`, and `constitution.md` Risk-Based Verification mandates). Within each user story phase, write the failing tests FIRST before implementing the corresponding services/routes.

**Organization**: Tasks are grouped by user story (`US1`–`US5`) to enable independent implementation, verification, and incremental delivery.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks in the current wave)
- **[Story]**: User story label (`[US1]`–`[US5]`) required on all user-story phase tasks
- Exact repository-relative file paths and explicit `data-model.md` `Entity.field` citations are included in implementing task descriptions

## Path Conventions

- **Backend (`server/`)**: `server/prisma/`, `server/src/`, `server/test/` (NestJS 12 ESM — relative imports end in `.js`, tests run via Vitest 4)
- **Frontend (`client/`)**: `client/proxy.ts`, `client/app/`, `client/components/`, `client/lib/` (Next.js `16.4.6` App Router with `cacheComponents: true`)
- **Shared Contracts**: `docs/contracts/openapi.yaml`, `specs/001-auth-identity-management/contracts/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install Phase 5.1 dependencies, validate environment configuration, and scaffold module/route directories.

- [X] T001 Install Phase 5.1 backend packages (`jose`, `@node-rs/argon2`, `cookie-parser`, `helmet`, and `@types/cookie-parser`) in `server/package.json` and `pnpm-lock.yaml`
- [X] T002 [P] Extend server Zod environment schema, startup validation (`MAIL_PROVIDER !== 'console'` when `NODE_ENV === 'production'`), typed getters (`AUTH_ACCESS_TOKEN_SECRET`, `AUTH_ACCESS_TOKEN_TTL`, `AUTH_SESSION_IDLE_TTL_DAYS`, `AUTH_SESSION_ABSOLUTE_TTL_DAYS`, `AUTH_MAX_ACTIVE_SESSIONS`, `AUTH_ISSUER`, `AUTH_AUDIENCE`, `COOKIE_SECURE`, `COOKIE_SAME_SITE`, `COOKIE_DOMAIN`, rate-limit thresholds, `MAIL_PROVIDER`, `MAIL_FROM`, `MAIL_API_KEY`, `APP_URL`), and unit tests in `server/src/config/env.schema.ts`, `server/src/config/env.service.ts`, and `server/src/config/env.schema.spec.ts`
- [X] T003 [P] Add Phase 5.1 placeholder environment variables (no secrets) in `server/.env.example` and `client/.env.example`
- [X] T004 [P] Create module and route directory scaffolding across `server/src/users/`, `server/src/sessions/`, `server/src/audit-logs/`, `server/src/mail/`, `server/src/auth/`, `client/app/(auth)/`, `client/app/(protected)/`, `client/components/auth/`, and `client/lib/auth/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema, core cryptographic/cookie/CSRF primitives, append-only audit service, mail port, EVARAX design tokens, and Next.js 16 `proxy.ts` routing that MUST be complete before any user story begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Define canonical Phase 5.1 Prisma enums, models, constraints, and indexes in `server/prisma/schema.prisma` per `data-model.md` §2 (`UserStatus`, `SessionRevokeReason`), `data-model.md` §3.1 (`User.id`, `User.email`, `User.normalizedEmail`, `User.displayName`, `User.passwordHash`, `User.status`, `User.emailVerifiedAt`, `User.createdAt`, `User.updatedAt`), `data-model.md` §3.2 (`AuthSession.id`, `AuthSession.userId`, `AuthSession.refreshTokenHash`, `AuthSession.userAgent`, `AuthSession.ipHash`, `AuthSession.lastUsedAt`, `AuthSession.idleExpiresAt`, `AuthSession.absoluteExpiresAt`, `AuthSession.revokedAt`, `AuthSession.revokedReason`, `AuthSession.createdAt`, `AuthSession.updatedAt`), `data-model.md` §3.3 (`EmailVerificationToken.id`, `EmailVerificationToken.userId`, `EmailVerificationToken.tokenHash`, `EmailVerificationToken.expiresAt`, `EmailVerificationToken.usedAt`, `EmailVerificationToken.invalidatedAt`, `EmailVerificationToken.createdAt`), `data-model.md` §3.4 (`PasswordResetToken.id`, `PasswordResetToken.userId`, `PasswordResetToken.tokenHash`, `PasswordResetToken.expiresAt`, `PasswordResetToken.usedAt`, `PasswordResetToken.invalidatedAt`, `PasswordResetToken.createdAt`), and `data-model.md` §3.5 (`AuditLog.id`, `AuditLog.organizationId`, `AuditLog.actorUserId`, `AuditLog.action`, `AuditLog.entityType`, `AuditLog.entityId`, `AuditLog.requestId`, `AuditLog.correlationId`, `AuditLog.metadata`, `AuditLog.occurredAt`)
- [X] T006 Generate and review the Phase 5.1 PostgreSQL migration SQL and regenerate the typed Prisma client in `server/prisma/migrations/` and `server/src/generated/prisma/`
- [X] T007 [P] Extend RFC 7807 `ErrorCode`, `ERROR_CATALOG`, and `AppException` static factories with `INVALID_CREDENTIALS`, `SESSION_EXPIRED`, `ACCOUNT_NOT_ACTIVE`, `EMAIL_UNAVAILABLE`, `INVALID_TOKEN`, and `CSRF_INVALID` in `server/src/common/exceptions/error-codes.ts`, `server/src/common/exceptions/app.exception.ts`, and `server/src/common/exceptions/all-exceptions.filter.spec.ts`
- [X] T008 [P] Implement `{ data, meta: { requestId, servedAt } }` response envelope builder reading `RequestContext` in `server/src/common/envelopes/api-response.ts` and `server/src/common/envelopes/api-response.spec.ts`
- [X] T009 [P] Register `helmet()` and `cookieParser()` middleware in `server/src/main.ts`
- [X] T010 [P] Implement `PasswordHasherService` (`@node-rs/argon2` Argon2id OWASP parameters + precomputed dummy hash verification for constant-time unknown-email checks) and unit tests in `server/src/auth/password-hasher.service.ts` and `server/src/auth/password-hasher.service.spec.ts`
- [X] T011 [P] Implement `TokenCryptoService` (256-bit random token generation, `SHA-256` hex digesting, `<sessionId>.<secret>` token formatting/parsing, and `jose` `HS256` access JWT sign/verify with pinned `alg`, `iss`, `aud`) and unit tests in `server/src/auth/token-crypto.service.ts` and `server/src/auth/token-crypto.service.spec.ts`
- [X] T012 [P] Implement `CookieService` for setting and clearing `ga_access` (`HttpOnly`, `Path=/`), `ga_refresh` (`HttpOnly`, `Path=/api/v1/auth`), and `ga_csrf` (non-`HttpOnly`, `Path=/`) with symmetric clear attributes in `server/src/auth/cookie.service.ts` and `server/src/auth/cookie.service.spec.ts`
- [X] T013 [P] Implement `CsrfGuard` (`crypto.timingSafeEqual` comparing `X-CSRF-Token` against `ga_csrf` plus `Origin`/`Referer` allowlist validation), `@Public()`, and `@CurrentUser()` decorators with unit tests in `server/src/auth/guards/csrf.guard.ts`, `server/src/auth/guards/csrf.guard.spec.ts`, `server/src/auth/decorators/public.decorator.ts`, and `server/src/auth/decorators/current-user.decorator.ts`
- [X] T014 [P] Implement `AuditLogsModule` and append-only `AuditLogsService` propagating `RequestContext` IDs and stripping sensitive keys per `data-model.md` §3.5 (`AuditLog.id`, `AuditLog.organizationId`, `AuditLog.actorUserId`, `AuditLog.action`, `AuditLog.entityType`, `AuditLog.entityId`, `AuditLog.requestId`, `AuditLog.correlationId`, `AuditLog.metadata`, `AuditLog.occurredAt`) in `server/src/audit-logs/audit-logs.module.ts`, `server/src/audit-logs/audit-logs.service.ts`, and `server/src/audit-logs/audit-logs.service.spec.ts`
- [X] T015 [P] Implement `MailModule`, `MailerPort`, dev/test-only `ConsoleMailerAdapter`, and HTTPS `HttpMailerAdapter` with unit tests in `server/src/mail/mail.module.ts`, `server/src/mail/mailer.port.ts`, `server/src/mail/console-mailer.adapter.ts`, `server/src/mail/http-mailer.adapter.ts`, and `server/src/mail/mail.module.spec.ts`
- [X] T016 [P] Define exact EVARAX brand HEX variables (`#F4E952`, `#F6FA45`, `#FCCE35`, `#080808`, `#E9ECF2`, `#FFFFFF`), derived dark neutral surfaces, semantic operational status variables, `prefers-reduced-motion`, and `:focus-visible` rules in `client/app/globals.css` and `client/app/layout.tsx`
- [X] T017 [P] Implement accessible EVARAX auth UI primitives (labeled input with `aria-invalid`/`aria-describedby`, text+icon inline/alert banners, `44×44px` primary/secondary/destructive buttons, and loading states) in `client/components/auth/auth-primitives.tsx`
- [X] T018 [P] Implement shared frontend auth DTO types and Next.js 16 `proxy.ts` optimistic cookie-presence redirector with `/^\/(?!\/)/` `next`-parameter sanitization and unit tests in `client/lib/auth/types.ts`, `client/proxy.ts`, and `client/lib/auth/proxy.test.mjs`

**Checkpoint**: Foundation ready — user story phases can now proceed.

---

## Phase 3: User Story 1 - Register, Sign In, and Sign Out of a Personal Account (Priority: P1) 🎯 MVP

**Goal**: Enable unauthenticated visitors to register a personal account (`PENDING_VERIFICATION`), enable `ACTIVE` users to sign in with constant-time anti-enumeration error behavior, retrieve their safe profile via `/auth/me` and `/me`, access protected routes, and sign out cleanly.

**Independent Test**: Register a new account (`201`, normalized email, `PENDING_VERIFICATION`, `409 EMAIL_UNAVAILABLE` on case-varied duplicate), verify unverified login is blocked (`403 ACCOUNT_NOT_ACTIVE`), sign in as an `ACTIVE` user (`200` + `HttpOnly` cookies), inspect `/api/v1/auth/me` and `/api/v1/me` (confirming zero secret fields), verify unknown email and wrong password return identical `401 INVALID_CREDENTIALS`, and sign out (`POST /api/v1/auth/logout`) confirming subsequent `/auth/me` calls return `401 UNAUTHENTICATED`.

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST and confirm they FAIL before implementing `T020`–`T028`.**

- [X] T019 [P] [US1] Write unit and integration tests for email normalization, registration (`PENDING_VERIFICATION`), duplicate conflict (`EMAIL_UNAVAILABLE`), constant-time generic login failure (`INVALID_CREDENTIALS`), non-active sign-in denial (`ACCOUNT_NOT_ACTIVE`), single-session logout, and safe `/auth/me` + `/me` profile serialization in `server/src/auth/auth-us1.spec.ts`

### Implementation for User Story 1

- [X] T020 [P] [US1] Implement `UsersModule`, `UsersRepository`, and `UsersService` (email normalization, unique lookup, user creation, and `SafeUserProfile` mapping) per `data-model.md` §2 (`UserStatus`) and `data-model.md` §3.1 (`User.id`, `User.email`, `User.normalizedEmail`, `User.displayName`, `User.passwordHash`, `User.status`, `User.emailVerifiedAt`, `User.createdAt`, `User.updatedAt`) in `server/src/users/users.module.ts`, `server/src/users/users.repository.ts`, and `server/src/users/users.service.ts`
- [X] T021 [P] [US1] Implement core `SessionsModule`, `SessionsRepository`, and `SessionsService` session creation, active lookup, and current-session revocation (`USER_LOGOUT`) per `data-model.md` §2 (`SessionRevokeReason`) and `data-model.md` §3.2 (`AuthSession.id`, `AuthSession.userId`, `AuthSession.refreshTokenHash`, `AuthSession.userAgent`, `AuthSession.ipHash`, `AuthSession.lastUsedAt`, `AuthSession.idleExpiresAt`, `AuthSession.absoluteExpiresAt`, `AuthSession.revokedAt`, `AuthSession.revokedReason`, `AuthSession.createdAt`, `AuthSession.updatedAt`) in `server/src/sessions/sessions.module.ts`, `server/src/sessions/sessions.repository.ts`, and `server/src/sessions/sessions.service.ts`
- [X] T022 [US1] Implement `AccessTokenGuard` validating `ga_access` JWT signature/claims and verifying `User.status === 'ACTIVE'` plus unrevoked, unexpired `AuthSession` state in `server/src/auth/guards/access-token.guard.ts` and `server/src/auth/guards/access-token.guard.spec.ts`
- [X] T023 [P] [US1] Define `.strict()` Zod 4 schemas (`RegisterRequest` enforcing `12..128` char `password`, `LoginRequest`) and `@nestjs/swagger` DTO classes for `GET /auth/csrf`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, and `GET /me` per `contracts/auth-openapi.yaml` in `server/src/auth/dto/auth.schemas.ts` and `server/src/auth/dto/auth-swagger.dto.ts`
- [X] T024 [US1] Implement initial `EmailVerificationRepository.issueForUser()` (invalidating prior unused rows and inserting the verification token per `data-model.md` §3.3 (`EmailVerificationToken.id`, `EmailVerificationToken.userId`, `EmailVerificationToken.tokenHash`, `EmailVerificationToken.expiresAt`, `EmailVerificationToken.usedAt`, `EmailVerificationToken.invalidatedAt`, `EmailVerificationToken.createdAt`)) and `AuthService` registration (transactional `User` + `EmailVerificationRepository.issueForUser()` and post-commit `MailerPort` dispatch), login, current-session logout, and current-user profile queries in `server/src/auth/email-verification.repository.ts` and `server/src/auth/auth.service.ts`
- [X] T025 [US1] Implement `AuthController` (`GET /auth/csrf`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`), `MeController` (`GET /me` forward-compatible alias), and wire `AuthModule` into `AppModule` in `server/src/auth/auth.controller.ts`, `server/src/auth/me.controller.ts`, `server/src/auth/auth.module.ts`, and `server/src/app.module.ts`
- [X] T026 [P] [US1] Implement credentialed browser API client (`credentials: 'include'`, `ga_csrf` bootstrap + `X-CSRF-Token` header attachment, zero `localStorage`/`sessionStorage` secrets) and `<Suspense>`-compatible Server Component DAL in `client/lib/auth/client.ts` and `client/lib/auth/server.ts`
- [X] T027 [P] [US1] Implement EVARAX `(auth)` layout, `/register` page (handling `EMAIL_UNAVAILABLE` with sign-in/recovery links), and `/login` page (handling `INVALID_CREDENTIALS`, `ACCOUNT_NOT_ACTIVE`, `?verified=1`, and `?reason=session-expired`) in `client/app/(auth)/layout.tsx`, `client/app/(auth)/register/page.tsx`, and `client/app/(auth)/login/page.tsx`
- [X] T028 [US1] Implement public root redirect, `<Suspense>`-wrapped `(protected)` app shell with sign-out control, `/onboarding` Phase 5.1 handoff view, and `/app` protected landing page in `client/app/page.tsx`, `client/app/(protected)/layout.tsx`, `client/app/(protected)/onboarding/page.tsx`, and `client/app/(protected)/app/page.tsx`

**Checkpoint**: User Story 1 is independently functional and testable end-to-end.

---

## Phase 4: User Story 2 - Maintain Seamless Access and Manage Active Sessions (Priority: P1)

**Goal**: Keep active users seamlessly signed in via atomic refresh rotation (`14d` sliding idle / `30d` hard absolute cap) coordinated across browser tabs, immediately revoke any session whose superseded token is replayed, cap concurrent active sessions at `10` (LRU eviction), and allow users to view and revoke individual sessions or all sessions.

**Independent Test**: Sign in across multiple sessions, rotate via `POST /api/v1/auth/refresh` (verifying `idleExpiresAt` advances `<= absoluteExpiresAt`), replay the old `ga_refresh` cookie and confirm immediate `TOKEN_REUSE` session revocation, open 11 sessions and verify the oldest-idle session is evicted (`MAX_SESSIONS_EVICTED`), confirm User A cannot delete User B's session (`404`), and confirm `POST /api/v1/auth/logout-all` revokes all remaining sessions.

### Tests for User Story 2 ⚠️

- [X] T029 [P] [US2] Write backend unit and integration tests for transactional refresh rotation, `14d` idle / `30d` absolute cap cutoff, zero-grace replay revocation (`TOKEN_REUSE`), 10-session LRU eviction (`MAX_SESSIONS_EVICTED`), cross-user session delete isolation (`404`), and `logout-all` in `server/src/sessions/sessions-rotation.spec.ts`
- [X] T030 [P] [US2] Write frontend unit tests for `navigator.locks` / singleton-promise refresh serialization, `BroadcastChannel` tab sync, and non-recursive `401` handling in `client/lib/auth/client.test.mjs`

### Implementation for User Story 2

- [X] T031 [US2] Extend `SessionsRepository` and `SessionsService` with atomic conditional refresh rotation, superseded-token replay detection/revocation, 10-session LRU eviction on login, owned-session listing, owned-session revocation (`USER_SESSION_REVOKE`), and `revokeAllForUser` (`USER_LOGOUT_ALL`) per `data-model.md` §2 (`SessionRevokeReason`) and `data-model.md` §3.2 (`AuthSession.id`, `AuthSession.userId`, `AuthSession.refreshTokenHash`, `AuthSession.userAgent`, `AuthSession.lastUsedAt`, `AuthSession.idleExpiresAt`, `AuthSession.absoluteExpiresAt`, `AuthSession.revokedAt`, `AuthSession.revokedReason`, `AuthSession.createdAt`, `AuthSession.updatedAt`) in `server/src/sessions/sessions.repository.ts` and `server/src/sessions/sessions.service.ts`
- [X] T032 [P] [US2] Add `.strict()` Zod 4 `sessionId` param schema and `@nestjs/swagger` DTOs for `POST /auth/refresh`, `POST /auth/logout-all`, `GET /auth/sessions`, and `DELETE /auth/sessions/:sessionId` per `contracts/auth-openapi.yaml` in `server/src/auth/dto/auth.schemas.ts` and `server/src/auth/dto/auth-swagger.dto.ts`
- [X] T033 [US2] Implement `POST /auth/refresh`, `POST /auth/logout-all`, `GET /auth/sessions`, and `DELETE /auth/sessions/:sessionId` in `server/src/auth/auth.service.ts` and `server/src/auth/auth.controller.ts`
- [X] T034 [US2] Add Web Locks (`navigator.locks.request('gridaware:auth:refresh', ...)`) + fallback in-memory mutex refresh serialization and `BroadcastChannel('gridaware:auth')` cross-tab session sync in `client/lib/auth/client.ts`
- [X] T035 [US2] Implement `/app/profile` page displaying safe user profile details and the accessible Active Sessions panel (`Current session` badge, per-session `Revoke` action, and `Sign out of all sessions` confirmation) in `client/components/auth/active-sessions-panel.tsx` and `client/app/(protected)/app/profile/page.tsx`

**Checkpoint**: User Stories 1 and 2 are both independently functional and testable.

---

## Phase 5: User Story 3 - Confirm Email Ownership (Priority: P2)

**Goal**: Enable `PENDING_VERIFICATION` users to confirm email ownership via a single-use, 24-hour verification link (transitioning `User.status` to `ACTIVE`) and request non-enumerating resends that immediately invalidate prior unused verification links.

**Independent Test**: Register a user, request a verification resend (`202` generic response; verify the initial link is now marked superseded and rejected with `400 INVALID_TOKEN`), confirm with the newest link (`200`, `User.status === 'ACTIVE'`, `emailVerifiedAt` populated), verify re-submitting the used link returns `400 INVALID_TOKEN`, and sign in successfully.

### Tests for User Story 3 ⚠️

- [X] T036 [P] [US3] Write unit and integration tests for single-use verification confirmation, `PENDING_VERIFICATION → ACTIVE` state transition, prior-unused-link invalidation on resend, expired/used/superseded token rejection, and non-enumerating resend responses in `server/src/auth/email-verification.spec.ts`

### Implementation for User Story 3

- [X] T037 [US3] Extend `EmailVerificationRepository` (`consumeValidToken`) and `AuthService` with non-enumerating verification resend and single-use confirmation transactions per `data-model.md` §3.3 (`EmailVerificationToken.id`, `EmailVerificationToken.userId`, `EmailVerificationToken.tokenHash`, `EmailVerificationToken.expiresAt`, `EmailVerificationToken.usedAt`, `EmailVerificationToken.invalidatedAt`, `EmailVerificationToken.createdAt`) and `data-model.md` §3.1 (`User.status`, `User.emailVerifiedAt`, `User.updatedAt`) in `server/src/auth/email-verification.repository.ts` and `server/src/auth/auth.service.ts`
- [X] T038 [US3] Add `.strict()` Zod 4 schemas (`EmailOnlyRequest`, `TokenConfirmRequest`), `@nestjs/swagger` DTOs, and controller routes for `POST /auth/email-verification/resend` and `POST /auth/email-verification/confirm` in `server/src/auth/dto/auth.schemas.ts`, `server/src/auth/dto/auth-swagger.dto.ts`, and `server/src/auth/auth.controller.ts`
- [X] T039 [US3] Implement dual-mode `/verify-email` screen (confirming `?token=...` links and rendering post-registration pending instructions + rate-limited resend form) and wire unverified-login resend navigation in `client/app/(auth)/verify-email/page.tsx` and `client/app/(auth)/login/page.tsx`

**Checkpoint**: Full self-service registration → email verification → sign-in flow works end-to-end.

---

## Phase 6: User Story 4 - Recover Account Access via Password Reset (Priority: P2)

**Goal**: Enable users who forgot their passphrase to request a non-enumerating, single-use, 60-minute recovery link (invalidating prior unused reset links), set a new Argon2id-hashed passphrase, and automatically revoke all pre-existing sessions.

**Independent Test**: Request password resets for both unregistered and registered emails (verifying identical `202` responses), issue a second reset link and verify the first is rejected (`400 INVALID_TOKEN`), complete reset with the newest link while holding active sessions (`200`), verify all pre-existing sessions are revoked (`PASSWORD_RESET`), and sign in with the new passphrase.

### Tests for User Story 4 ⚠️

- [X] T040 [P] [US4] Write unit and integration tests for non-enumerating reset requests, prior-unused-reset-token invalidation on reissue, single-use confirmation, Argon2id passphrase update, and atomic revocation of all existing `AuthSession` rows in `server/src/auth/password-reset.spec.ts`

### Implementation for User Story 4

- [X] T041 [US4] Implement `PasswordResetRepository` and `AuthService` transactional reset issuance, prior-unused-link invalidation, passphrase update, and mass session revocation (`PASSWORD_RESET`) per `data-model.md` §3.4 (`PasswordResetToken.id`, `PasswordResetToken.userId`, `PasswordResetToken.tokenHash`, `PasswordResetToken.expiresAt`, `PasswordResetToken.usedAt`, `PasswordResetToken.invalidatedAt`, `PasswordResetToken.createdAt`), `data-model.md` §3.1 (`User.passwordHash`, `User.updatedAt`), and `data-model.md` §3.2 (`AuthSession.revokedAt`, `AuthSession.revokedReason`) in `server/src/auth/password-reset.repository.ts` and `server/src/auth/auth.service.ts`
- [X] T042 [US4] Add `.strict()` Zod 4 schema (`ResetPasswordConfirmRequest` enforcing `12..128` char `newPassword`), `@nestjs/swagger` DTOs, and controller routes for `POST /auth/password-reset/request` and `POST /auth/password-reset/confirm` (clearing client auth cookies on confirm) in `server/src/auth/dto/auth.schemas.ts`, `server/src/auth/dto/auth-swagger.dto.ts`, and `server/src/auth/auth.controller.ts`
- [X] T043 [P] [US4] Implement `/forgot-password` non-enumerating request page and `/reset-password` single-use passphrase reset page in `client/app/(auth)/forgot-password/page.tsx` and `client/app/(auth)/reset-password/page.tsx`

**Checkpoint**: Self-service password recovery and automatic session invalidation work independently.

---

## Phase 7: User Story 5 - Enforce Account Restrictions, Abuse Throttling, and Security Auditing (Priority: P2)

**Goal**: Enforce Redis-backed dual-key (client IP + `SHA-256` normalized email) sliding-window rate limits with temporary cooldowns, block `SUSPENDED` and `DEACTIVATED` accounts across login, refresh, and active guards, enforce CSRF checks across all cookie-authenticated mutations, and guarantee append-only secret-free `AuditLog` coverage across every security action.

**Independent Test**: Exceed per-IP and per-email thresholds on public auth routes (`429 RATE_LIMITED` + `Retry-After` header, confirming temporary cooldown without permanent lockout), transition an `ACTIVE` user to `SUSPENDED` and confirm immediate `403 ACCOUNT_NOT_ACTIVE` on `/auth/me` and `/auth/refresh`, send state-changing requests with missing/invalid `X-CSRF-Token` (`403 CSRF_INVALID`), and query `audit_logs` to confirm correlation IDs and zero credential/token leakage.

### Tests for User Story 5 ⚠️

- [X] T044 [P] [US5] Write unit and integration tests for Redis dual-key sliding-window rate limiting (`Retry-After`, no permanent lockout), mid-session `SUSPENDED`/`DEACTIVATED` revocation and denial, `CsrfGuard` enforcement on state-changing routes, and secret-free `AuditLog` event completeness in `server/src/auth/auth-security-controls.spec.ts`

### Implementation for User Story 5

- [X] T045 [P] [US5] Implement `AuthRateLimitService` (atomic `ioredis` Lua sliding-window counter keyed by client IP and `SHA-256(normalizedEmail)`), `@AuthRateLimit()` decorator, and `AuthRateLimitGuard` setting `Retry-After` headers in `server/src/auth/auth-rate-limit.service.ts`, `server/src/auth/decorators/auth-rate-limit.decorator.ts`, and `server/src/auth/guards/auth-rate-limit.guard.ts`
- [X] T046 [US5] Apply `@AuthRateLimit()` policies and `CsrfGuard` across `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/logout-all`, `DELETE /auth/sessions/:sessionId`, `POST /auth/email-verification/resend`, `POST /auth/email-verification/confirm`, `POST /auth/password-reset/request`, and `POST /auth/password-reset/confirm` in `server/src/auth/auth.controller.ts` and `server/src/auth/auth.module.ts`
- [X] T047 [US5] Implement administrative `UsersService.updateAccountStatus()` (`SUSPENDED`/`DEACTIVATED` revoking active sessions with `ACCOUNT_STATE_CHANGE`) and audit-verify complete `AuditLogsService` emission across all 13 security actions per `data-model.md` §3.5 (`AuditLog.action`, `AuditLog.entityType`, `AuditLog.entityId`, `AuditLog.requestId`, `AuditLog.correlationId`, `AuditLog.metadata`) in `server/src/users/users.service.ts` and `server/src/auth/auth.service.ts`

**Checkpoint**: All 5 user stories and security controls are implemented and independently verified.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Synchronize public OpenAPI specs, run full HTTP/cookie E2E + security suites, verify WCAG 2.2 AA & EVARAX compliance, and execute workspace validation gates.

- [X] T048 [P] Synchronize Phase 5.1 `/auth/*` and `/me` contract definitions, cookie/CSRF security schemes, and automated Ajv2020 contract validation across `docs/contracts/openapi.yaml`, `server/src/swagger/setup-swagger.ts`, and `server/src/contracts/contracts-validation.spec.ts`
- [X] T049 [P] Implement full HTTP/cookie E2E, negative security, and warm-request `p95 < 300 ms` latency (`SC-002` across `GET /auth/me`, `GET /auth/sessions`, and `POST /auth/logout`) test suite covering all 12 Phase 5.1 E2E scenarios plus cross-user session isolation, token replay, CSRF, CORS, and zero-secret log assertions in `server/test/auth.e2e-spec.ts`
- [X] T050 [P] Review and refine EVARAX contrast ratios, keyboard-only tab/focus navigation, `prefers-reduced-motion` handling, and `429` cooldown UI feedback across `client/app/(auth)/`, `client/app/(protected)/`, and `client/components/auth/`
- [X] T051 Run full workspace verification (`pnpm lint`, `pnpm typecheck`, `pnpm contracts:validate`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`) against `specs/001-auth-identity-management/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately (`T001` first, then `T002`–`T004` in parallel).
- **Phase 2 (Foundational)**: Depends on Phase 1 completion (`T005` → `T006` sequentially for Prisma schema & client generation; `T007`–`T018` run in parallel) — **BLOCKS all user stories**.
- **Phase 3 (`US1` — P1 MVP)**: Depends on Phase 2 completion. Establishes `UsersModule`, core `SessionsModule`, `AccessTokenGuard`, `AuthController`, `MeController`, and `/login` + `/register` + `/app` UI.
- **Phase 4 (`US2` — P1)**: Depends on `US1` (`T021`, `T025`, `T026`) — extends `SessionsService`, `AuthController`, and `client/lib/auth/client.ts` with rotation, replay revocation, LRU cap, and `/app/profile` session management.
- **Phase 5 (`US3` — P2)**: Depends on `US1` (`T024`, `T025`) — can execute **in parallel** with `US2` and `US4` (separate `email-verification.repository.ts` and `/verify-email` route, coordinating controller/service merges).
- **Phase 6 (`US4` — P2)**: Depends on `US1` (`T020`, `T021`, `T025`) — can execute **in parallel** with `US2` and `US3` (separate `password-reset.repository.ts` and `/forgot-password` + `/reset-password` routes).
- **Phase 7 (`US5` — P2)**: `T044` and `T045` (`AuthRateLimitService` + `AuthRateLimitGuard`) can start immediately after Phase 2 in parallel with `US1`–`US4`; `T046`–`T047` wire policies across completed `AuthController`/`AuthService` routes.
- **Phase 8 (Polish)**: Depends on Phases 3–7 completion.

### Within Each User Story

1. Write failing story tests FIRST (`T019`, `T029`–`T030`, `T036`, `T040`, `T044`).
2. Implement repositories and domain services (`Users`, `Sessions`, `EmailVerification`, `PasswordReset`, `AuthRateLimit`).
3. Implement Zod 4 / Swagger DTOs and NestJS controller endpoints.
4. Implement Next.js 16 client helpers and EVARAX accessible screens.
5. Pass story tests at the phase checkpoint before closing the story.

---

## Parallel Execution Examples

### Foundational Wave (after `T006` Prisma generation)

```text
Task T007: Extend ErrorCode & AppException in server/src/common/exceptions/error-codes.ts
Task T010: Implement PasswordHasherService in server/src/auth/password-hasher.service.ts
Task T011: Implement TokenCryptoService in server/src/auth/token-crypto.service.ts
Task T013: Implement CsrfGuard & decorators in server/src/auth/guards/csrf.guard.ts
Task T014: Implement AuditLogsService in server/src/audit-logs/audit-logs.service.ts
Task T015: Implement MailModule & adapters in server/src/mail/mail.module.ts
Task T016: Configure EVARAX tokens in client/app/globals.css
Task T018: Implement Next.js 16 proxy.ts in client/proxy.ts
```

### User Story 1 Wave (`US1` MVP)

```text
# Parallel repository/DTO/frontend tasks once T019 failing spec is written:
Task T020: Implement UsersModule & UsersService in server/src/users/users.service.ts
Task T021: Implement core SessionsModule & SessionsService in server/src/sessions/sessions.service.ts
Task T023: Define US1 Zod 4 & Swagger DTOs in server/src/auth/dto/auth.schemas.ts
Task T026: Implement browser auth client & DAL in client/lib/auth/client.ts
Task T027: Implement /register & /login pages in client/app/(auth)/login/page.tsx
```

### User Story 2 Wave (`US2`)

```text
# Parallel test & contract wave:
Task T029: Backend rotation/replay/LRU tests in server/src/sessions/sessions-rotation.spec.ts
Task T030: Frontend Web Locks refresh tests in client/lib/auth/client.test.mjs
Task T032: US2 Zod 4 & Swagger DTOs in server/src/auth/dto/auth.schemas.ts
```

---

## Implementation Strategy

### MVP First (`US1` + `US3` Self-Service Loop, or `US1` Standalone)

1. Complete **Phase 1: Setup** (`T001`–`T004`) and **Phase 2: Foundational** (`T005`–`T018`).
2. Complete **Phase 3: User Story 1** (`T019`–`T028`) and **STOP to validate** registration, constant-time sign-in, `/auth/me`, protected routes, and sign-out independently.
3. Add **Phase 4: User Story 2** (`T029`–`T035`) for seamless token rotation, replay revocation, 10-session LRU cap, and `/app/profile` session management, plus **Phase 5: User Story 3** (`T036`–`T039`) to complete self-service email confirmation.
4. Layer **Phase 6: User Story 4** (`T040`–`T043` password reset) and **Phase 7: User Story 5** (`T044`–`T047` dual-key Redis rate limiting & complete audit hardening).
5. Execute **Phase 8: Polish** (`T048`–`T051`) to lock OpenAPI contracts, full E2E security tests, WCAG 2.2 AA review, and green CI build.
