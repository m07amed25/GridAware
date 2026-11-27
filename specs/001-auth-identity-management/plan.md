# Implementation Plan: Authentication & Identity Management

**Branch**: `001-auth-identity-management` | **Date**: 2026-11-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-auth-identity-management/spec.md`

## Summary

Implement GridAware **Phase 5.1: Authentication & Identity Management** across the NestJS 12 backend (`server/`) and Next.js 16 frontend (`client/`) to establish global human identity, mandatory email verification (`Pending Verification → Active`), Argon2id passphrase security, short-lived `HttpOnly` JWT access cookies (`15m`) paired with rotating opaque session cookies (`14d` idle / `30d` absolute cap), zero-grace replay revocation, 10-session LRU eviction, single-use verification and password-reset workflows (invalidating prior unused links on reissue), Redis-backed dual-key (IP + normalized-email hash) sliding-window rate limiting, double-submit CSRF + `Origin` protection, secret-free append-only `AuditLog` persistence, and WCAG 2.2 AA EVARAX dark-first authentication screens—strictly decoupled from Phase 5.2/5.3 tenant `Organization` and `Membership` roles.

## Technical Context

**Language/Version**: TypeScript `6.0.2` on Node.js `>=24` ESM (`server/`); TypeScript `5.x` with React `19.3.0` (`client/`)

**Primary Dependencies**:

- `server/`: NestJS `^12.0.1` (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/swagger` `^12.1.2`, `@nestjs/observe` `^0.3.0`), Prisma `7.10.1` + `@prisma/client` `^7.10.1` + `@prisma/adapter-neon` `^7.10.1`, `zod` `4.6.7` (`StandardSchemaValidationPipe`), `ioredis` `^6.1.0`, plus new Phase 5.1 additions: `jose` (ESM HS256 JWT signing/verification), `@node-rs/argon2` (Argon2id passphrase hashing), `cookie-parser` + `@types/cookie-parser`, and `helmet`
- `client/`: Next.js `16.4.6` App Router (`cacheComponents: true`, `partialPrefetching: true`, `proxy.ts`), Tailwind CSS `4.3.3` (`@tailwindcss/turbopack`)

**Storage**: Neon PostgreSQL via Prisma ORM `7.10.1` (`users`, `auth_sessions`, `email_verification_tokens`, `password_reset_tokens`, `audit_logs`); Redis `7-alpine` via existing `RedisService` (`ioredis`) for sliding-window rate-limit counters

**Testing**: Vitest `^4.1.2` + `supertest` `^7.0.0` (`server/` unit, integration, contract, and E2E suites); Node built-in test runner `node --test` (`client/` unit tests for auth client, Web Locks refresh coordinator, `proxy.ts` redirect rules, and env helpers)

**Target Platform**: Containerized Linux / Node.js server + modern desktop and mobile browsers (developed and verified locally on Windows + Docker Compose)

**Project Type**: Multi-tenant B2B SaaS web application monorepo (`pnpm@12.18.0` workspaces: `client/`, `server/`)

**Performance Goals**: `p95 < 300 ms` on authenticated read and session endpoints (`GET /auth/me`, `GET /auth/sessions`, `POST /auth/logout`) under MVP workload (`SC-002`, `NFR-PERF-001`); Argon2id tuned to OWASP minimum (`19 MiB`, `t=2`, `p=1`) targeting `~50–120 ms` per hash/verify without starving the Node event loop

**Constraints**:

- Strict ESM in `server/` (`.js` relative import specifiers, `import.meta.dirname`, Vitest `vi.fn()`)
- Next.js 16 `proxy.ts` (never `middleware.ts`) and `<Suspense>` / DAL boundaries compatible with `cacheComponents: true`
- Zero raw credentials/tokens in `localStorage`/`sessionStorage`, API responses, Redis keys, or logs (`FR-007`, `FR-018`, `SC-004`)
- Global `User` must carry zero tenant roles (`FR-019`)
- Exact six EVARAX brand HEX colors and WCAG 2.2 Level AA compliance (`FR-020`, `SC-006`)

**Scale/Scope**: 5 Prisma models + 2 enums, 13 `/api/v1` auth/identity endpoints, 9 Next.js routes (`/` + 5 public auth pages + 3 protected onboarding/app/profile pages), and full unit/integration/contract/E2E verification

## Constitution Check

_GATE: Evaluated before Phase 0 research and re-verified after Phase 1 design against [constitution.md](../../.specify/memory/constitution.md) v1.0.0._

| Constitutional Gate                                     | Pre-Research Status | Post-Design Verification                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Tenant Isolation & Least-Privilege Access**        | PASS                | `User` is strictly global (`FR-019`) with zero organization role columns; `AuthSession` ownership is enforced server-side on `DELETE /auth/sessions/:id` (`404` on cross-user IDs); `AuditLog.organizationId` is nullable UUID ready for Phase 5.2; `prisma7.config.ts` separates direct migration URL from pooled runtime URL. |
| **II. Decision-Support Only — No Equipment Control**    | PASS                | Identity & session boundary only; introduces zero MQTT command topics or equipment actuation paths.                                                                                                                                                                                                                             |
| **III. Simulator-First Provenance & Incremental Scope** | PASS                | Scoped strictly to Phase 5.1 identity foundation (`PRD` Gate A prerequisite), deferring organizations (`5.2`), RBAC (`5.3`), SSO, and MFA cleanly.                                                                                                                                                                              |
| **IV. Durable, Idempotent & Truthful Telemetry**        | PASS                | Does not alter existing MQTT/telemetry pipelines; user creation, token rotation, password reset, and session eviction use atomic PostgreSQL transactions so outbound mail failures never leave partial DB state.                                                                                                                |
| **V. Modular Monolith & Explicit Service Boundaries**   | PASS                | Organized into bounded NestJS modules (`auth`, `users`, `sessions`, `audit-logs`, `mail`) inside `server/src/` with thin controllers, explicit service/repository boundaries, and zero circular imports.                                                                                                                        |
| **VI. Contract-First Interfaces & Runtime Validation**  | PASS                | All `/api/v1/auth/*` and `/api/v1/me` DTOs use `.strict()` Zod 4 schemas via `StandardSchemaValidationPipe`, decoupled from Prisma models, documented in `contracts/auth-openapi.yaml` + `docs/contracts/openapi.yaml`, and verified by `pnpm contracts:validate`.                                                              |
| **VII. Progressive Intelligence & Auditability**        | PASS                | Append-only `AuditLog` service records all 13 security lifecycle actions with `requestId`/`correlationId` from `AsyncLocalStorage` `RequestContext` while stripping passwords, tokens, and cookies (`FR-018`).                                                                                                                  |
| **VIII. EVARAX Fidelity & WCAG 2.2 AA Accessibility**   | PASS                | Centralizes exact EVARAX HEX tokens (`#F4E952`, `#F6FA45`, `#FCCE35`, `#080808`, `#E9ECF2`, `#FFFFFF`) + derived dark surfaces and semantic status tokens in `client/app/globals.css`, with keyboard-complete forms, explicit `<label>`/`aria-describedby` bindings, and non-color error/status indicators.                     |
| **Platform & Quality Gate Constraints**                 | PASS                | Single `pnpm@12.18.0` lockfile, `camelCase` JSON / `UPPER_SNAKE_CASE` enums / UUID IDs / UTC ISO 8601 timestamps, startup Zod env validation (`MAIL_PROVIDER=console` blocked in `production`), and risk-based unit/integration/security/E2E tests.                                                                             |

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-identity-management/
├── plan.md                      # This implementation plan
├── spec.md                      # Clarified feature specification (FR-001..FR-020, SC-001..SC-007)
├── research.md                  # Phase 0 technical decisions (R1..R9)
├── data-model.md                # Phase 1 Prisma v7 schema, indexes, and state machines
├── quickstart.md                # Phase 1 runnable setup, test, and E2E validation guide
├── checklists/
│   └── requirements.md          # Specification quality checklist (16/16 passing)
└── contracts/
    ├── auth-openapi.yaml        # OpenAPI 3.1 contract for /api/v1/auth/* and /api/v1/me
    └── frontend-routes.md       # Next.js 16 routes, proxy.ts, CSRF/refresh client, and EVARAX UI contract
```

### Source Code (repository root)

```text
docs/
└── contracts/
    └── openapi.yaml                          # Synced with Phase 5.1 /auth/* and /me routes

server/
├── prisma/
│   ├── schema.prisma                         # User, AuthSession, EmailVerificationToken, PasswordResetToken, AuditLog
│   └── migrations/
│       └── <timestamp>_init_auth_identity/   # Versioned SQL migration
├── src/
│   ├── main.ts                               # Adds helmet() + cookieParser() before routes
│   ├── app.module.ts                         # Imports AuthModule, UsersModule, SessionsModule, AuditLogsModule, MailModule
│   ├── config/
│   │   ├── env.schema.ts                     # Auth JWT/session/cookie/CSRF/rate-limit/mail Zod rules
│   │   └── env.service.ts                    # Typed getters for auth, cookie, mail, and rate-limit settings
│   ├── common/
│   │   ├── envelopes/
│   │   │   └── api-response.ts               # { data, meta: { requestId, servedAt } } builder
│   │   └── exceptions/
│   │       ├── error-codes.ts                # Adds INVALID_CREDENTIALS, SESSION_EXPIRED, ACCOUNT_NOT_ACTIVE, EMAIL_UNAVAILABLE, INVALID_TOKEN, CSRF_INVALID
│   │       └── app.exception.ts              # Static factories for new auth error codes
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.repository.ts               # Prisma User queries + email normalization helper
│   │   └── users.service.ts                  # Safe profile mapping, status checks, password hash updates
│   ├── sessions/
│   │   ├── sessions.module.ts
│   │   ├── sessions.repository.ts            # Transactional session CRUD, LRU eviction, atomic rotation
│   │   └── sessions.service.ts               # <sessionId>.<secret> generation, SHA-256 verification, replay revocation
│   ├── audit-logs/
│   │   ├── audit-logs.module.ts
│   │   └── audit-logs.service.ts             # Append-only AuditLog writer wired to RequestContext + secret redaction
│   ├── mail/
│   │   ├── mail.module.ts
│   │   ├── mailer.port.ts                    # MailerPort symbol & transactional email templates
│   │   ├── console-mailer.adapter.ts         # Dev/test sink (blocked in production)
│   │   └── http-mailer.adapter.ts            # Production HTTPS transactional mail adapter
│   └── auth/
│       ├── auth.module.ts
│       ├── auth.controller.ts                # /api/v1/auth/* endpoints
│       ├── me.controller.ts                  # /api/v1/me forward-compatible alias
│       ├── auth.service.ts                   # Register, login, refresh, logout, verify-email, password-reset orchestration
│       ├── email-verification.repository.ts  # Transactional EmailVerificationToken issuance, invalidation, and consumption
│       ├── password-reset.repository.ts      # Transactional PasswordResetToken issuance, invalidation, and consumption
│       ├── password-hasher.service.ts        # @node-rs/argon2 Argon2id + constant-time dummy hash verification
│       ├── token-crypto.service.ts           # 256-bit random token generator, SHA-256 hashing, jose HS256 JWT service
│       ├── cookie.service.ts                 # Environment-aware ga_access, ga_refresh, ga_csrf cookie set/clear
│       ├── auth-rate-limit.service.ts        # Redis Lua sliding-window limiter (IP + SHA-256 normalizedEmail)
│       ├── guards/
│       │   ├── access-token.guard.ts         # Verifies ga_access JWT + active user/session state
│       │   ├── csrf.guard.ts                 # Double-submit timingSafeEqual + Origin/Referer verification
│       │   └── auth-rate-limit.guard.ts      # Declarative per-route rate-limit enforcement
│       ├── decorators/
│       │   ├── current-user.decorator.ts     # Extracts AuthenticatedActor { userId, sessionId, email, status }
│       │   ├── public.decorator.ts           # Marks public routes when guard is scoped
│       │   └── auth-rate-limit.decorator.ts  # Binds rate-limit policy metadata
│       └── dto/
│           ├── auth.schemas.ts               # Strict Zod 4 request/param schemas
│           └── auth-swagger.dto.ts           # @nestjs/swagger OpenAPI 3.1 schema classes
└── test/
    └── auth.e2e-spec.ts                      # 12 E2E flows + CSRF, replay, enumeration, and cross-user security tests

client/
├── proxy.ts                                  # Next.js 16 optimistic auth/guest route redirector + safe ?next= sanitizer
├── app/
│   ├── globals.css                           # EVARAX brand palette, dark surface scale, semantic status tokens, focus styles
│   ├── layout.tsx                            # Dark-first root shell (Geist Sans / Geist Mono)
│   ├── page.tsx                              # Public entry / authenticated redirect
│   ├── (auth)/
│   │   ├── layout.tsx                        # Centered accessible EVARAX auth card layout
│   │   ├── login/page.tsx                    # Sign-in form + expired/verified/unverified contextual banners
│   │   ├── register/page.tsx                 # Registration form + duplicate-email recovery guidance
│   │   ├── verify-email/page.tsx             # Token confirmation + rate-limited resend flow
│   │   ├── forgot-password/page.tsx          # Non-enumerating reset request flow
│   │   └── reset-password/page.tsx           # Single-use passphrase reset confirmation flow
│   └── (protected)/
│       ├── layout.tsx                        # <Suspense>-wrapped authenticated app chrome + sign-out control
│       ├── onboarding/page.tsx               # Phase 5.1 -> 5.2 authenticated onboarding handoff view
│       └── app/
│           ├── page.tsx                      # Protected home summary
│           └── profile/page.tsx              # Safe profile card + Active Sessions management (revoke one / revoke all)
├── components/
│   └── auth/                                 # Reusable accessible form fields, inline error banners, session table, buttons
└── lib/
    └── auth/
        ├── types.ts                          # Shared frontend DTO types
        ├── client.ts                         # Credentialed fetch wrapper + ga_csrf header + Web Locks /auth/refresh coordinator
        ├── server.ts                         # Server Component DAL reading forwarded cookies inside <Suspense>
        ├── client.test.mjs                   # Unit tests for CSRF injection and refresh serialization
        └── proxy.test.mjs                    # Unit tests for Next.js 16 proxy.ts redirects and ?next= sanitization
```

**Structure Decision**: Retain the established root `pnpm` workspace layout (`server/` for the NestJS 12 modular monolith and `client/` for the Next.js 16 App Router frontend—note the Phase 5.1 brief's illustrative `apps/api/` path maps directly to `server/` in this repository per [2026-11-26-monorepo-arch-design.md](../../docs/superpowers/specs/2026-11-26-monorepo-arch-design.md) and the Constitution). Add bounded `users`, `sessions`, `audit-logs`, `mail`, and `auth` domain modules in `server/src/`, and route-grouped `(auth)` and `(protected)` App Router segments plus `proxy.ts` in `client/`.

## Complexity Tracking

No Constitution Check violations exist; all architectural choices align directly with the ratified GridAware Constitution (`v1.0.0`).
