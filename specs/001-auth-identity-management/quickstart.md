# Quickstart & Validation Guide: Authentication & Identity Management

**Feature**: `001-auth-identity-management`  
**References**: [spec.md](./spec.md) · [data-model.md](./data-model.md) · [contracts/auth-openapi.yaml](./contracts/auth-openapi.yaml) · [contracts/frontend-routes.md](./contracts/frontend-routes.md)

---

## 1. Prerequisites

- **Node.js**: `>= 24.x` and **`pnpm`**: `12.18.0` (managed at workspace root).
- **Neon PostgreSQL**: Development database branch with both pooled (`DATABASE_URL`) and direct/unpooled (`DATABASE_URL_UNPOOLED`) connection strings configured in `server/.env`.
- **Docker Desktop / Compose**: Local Redis (`redis:7-alpine`) and Mosquitto (`eclipse-mosquitto:2`) running via `pnpm docker:infra`.

---

## 2. Environment & Database Setup

1. **Start local infrastructure (Redis + Mosquitto)**:
   ```powershell
   pnpm docker:infra
   ```
2. **Configure environment variables**:
   - Copy `server/.env.example` to `server/.env` and populate `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `REDIS_URL`, `MQTT_URL`, and the Phase 5.1 auth variables (`AUTH_ACCESS_TOKEN_SECRET` >= 32 random bytes, `AUTH_ACCESS_TOKEN_TTL=15m`, `AUTH_SESSION_IDLE_TTL_DAYS=14`, `AUTH_SESSION_ABSOLUTE_TTL_DAYS=30`, `AUTH_MAX_ACTIVE_SESSIONS=10`, `AUTH_ISSUER=http://localhost:3001`, `AUTH_AUDIENCE=gridaware-web`, `COOKIE_SECURE=false`, `COOKIE_SAME_SITE=lax`, `MAIL_PROVIDER=console`, `MAIL_FROM=no-reply@gridaware.local`).
   - Copy `client/.env.example` to `client/.env.local` (`API_INTERNAL_URL=http://localhost:3001`, `NEXT_PUBLIC_API_URL=/api/v1`).
3. **Apply Prisma migrations & generate client** (see [data-model.md](./data-model.md)):
   ```powershell
   pnpm --filter server prisma:migrate
   pnpm --filter server prisma:generate
   ```
4. **Start both Next.js (`:3000`) and NestJS (`:3001`)**:
   ```powershell
   pnpm dev
   ```
5. **Verify readiness**:
   - `GET http://localhost:3000/api/v1/health/ready` returns `200 OK` with `postgres`, `redis`, and `mqtt` all `up`.

---

## 3. Automated Test & Contract Validation Commands

Run from repository root:

```powershell
# Typecheck, lint, unit/integration tests, OpenAPI/JSON Schema validation, E2E tests, and production builds
pnpm lint
pnpm typecheck
pnpm contracts:validate
pnpm test
pnpm test:e2e
pnpm build
```

Expected outcomes:

- `pnpm contracts:validate` compiles and validates both `docs/contracts/openapi.yaml` and `specs/001-auth-identity-management/contracts/auth-openapi.yaml` with zero unresolved `$ref` or schema errors.
- `pnpm --filter server test` passes unit and repository/service integration suites covering email normalization, Argon2id hashing, constant-time login failure timing, atomic refresh rotation, replay revocation, 10-session LRU eviction, superseded verification/reset link invalidation, and dual-key Redis rate limiting.
- `pnpm --filter server test:e2e` passes all 12 HTTP/cookie end-to-end flows and security negative tests against the NestJS app.

---

## 4. End-to-End Runnable Validation Scenarios

Refer to [contracts/auth-openapi.yaml](./contracts/auth-openapi.yaml) for exact payload and cookie definitions.

### Scenario A — Registration, Mandatory Email Verification & Sign-In (`US1`, `US3`)

1. Fetch a CSRF token via `GET http://localhost:3000/api/v1/auth/csrf` (sets `ga_csrf`).
2. Submit `POST /api/v1/auth/register` with `{"email":"  Alex@Example.COM ","password":"correct-horse-battery-staple","displayName":"Alex Morgan"}` and `X-CSRF-Token`.
   - **Expected**: `201 Created` with `status: "PENDING_VERIFICATION"`, `email: "alex@example.com"`, and zero `passwordHash`/token fields; `ConsoleMailerAdapter` prints the local `/verify-email?token=...` URL.
3. Attempt `POST /api/v1/auth/login` before verifying.
   - **Expected**: `403 ACCOUNT_NOT_ACTIVE`.
4. Confirm verification via `POST /api/v1/auth/email-verification/confirm` with the single-use token, then replay the same token a second time.
   - **Expected**: First call returns `200 OK` (`User.status -> ACTIVE`); second call returns `400 INVALID_TOKEN`.
5. Sign in via `POST /api/v1/auth/login` and call `GET /api/v1/auth/me` (and `GET /api/v1/me`).
   - **Expected**: `200 OK` setting `HttpOnly` `ga_access` (`Path=/`) and `ga_refresh` (`Path=/api/v1/auth`) cookies; `/auth/me` returns safe profile fields only.

### Scenario B — Refresh Rotation, Replay Detection & Session Management (`US2`)

1. Capture the initial `ga_refresh` cookie (`R1`), call `POST /api/v1/auth/refresh` with `X-CSRF-Token`, and capture the rotated `ga_refresh` cookie (`R2`).
   - **Expected**: `200 OK`; `idleExpiresAt` advances without exceeding `absoluteExpiresAt`.
2. Replay superseded cookie `R1` against `POST /api/v1/auth/refresh`.
   - **Expected**: `401 SESSION_EXPIRED`; calling `POST /api/v1/auth/refresh` with `R2` now also returns `401 SESSION_EXPIRED` because replay immediately revoked the session (`revokedReason = TOKEN_REUSE`), and an `AUTH_SESSION_REUSE_DETECTED` row exists in `audit_logs`.
3. Sign in from 11 distinct client sessions for the same user and call `GET /api/v1/auth/sessions`.
   - **Expected**: At most `10` active sessions remain; the least-recently-used session was automatically revoked (`MAX_SESSIONS_EVICTED`).
4. Sign in as User B and call `DELETE /api/v1/auth/sessions/{userASessionId}`.
   - **Expected**: `404 RESOURCE_NOT_FOUND`; User A's session remains untouched.

### Scenario C — Password Reset Link Invalidation & Mass Session Revocation (`US4`)

1. Request two password-reset emails in succession via `POST /api/v1/auth/password-reset/request` (`T1`, then `T2`), and also test an unregistered email.
   - **Expected**: Identical `202 Accepted` body for registered and unregistered emails; attempting `POST /api/v1/auth/password-reset/confirm` with superseded token `T1` fails (`400 INVALID_TOKEN`).
2. Confirm password reset using `T2` while holding active sessions.
   - **Expected**: `200 OK`; all pre-existing sessions for that user have `revokedAt` set (`PASSWORD_RESET`) and can no longer refresh.

### Scenario D — Dual-Key Rate Limiting, CSRF Enforcement & Browser UX (`US5`, `SC-006`)

1. Submit repeated failed `POST /api/v1/auth/login` calls exceeding the per-email or per-IP threshold.
   - **Expected**: `429 RATE_LIMITED` with `Retry-After` header; once the window elapses, valid credentials succeed without manual admin unlock.
2. Submit `POST /api/v1/auth/logout` with a missing or mismatched `X-CSRF-Token` header or a disallowed `Origin`.
   - **Expected**: `403 CSRF_INVALID`.
3. Complete `/register` → `/verify-email` → `/login` → `/app/profile` (session revoke + sign out) in the browser using keyboard navigation only (`Tab`, `Shift+Tab`, `Enter`, `Space`).
   - **Expected**: Visible EVARAX focus outlines on every control, zero `localStorage`/`sessionStorage` auth entries in DevTools, and text + icon status/error messages throughout.
