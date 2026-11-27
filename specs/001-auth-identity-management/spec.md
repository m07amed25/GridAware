# Feature Specification: Authentication & Identity Management

**Feature Branch**: `001-auth-identity-management`

**Created**: 2026-11-26

**Status**: Draft

**Input**: User description: "GridAware — Phase 5.1: Authentication & Identity Management — foundational user registration, credential sign-in, session lifecycle and rotation, active session management, email verification, password recovery, abuse protection, and security audit logging."

## Clarifications

### Session 2026-11-26

- Q: Should newly registered users be required to verify their email address before they can sign in to the application? (FR-006) → A: Option A — Block sign-in until verified; accounts start as `Pending Verification` and cannot sign in until confirming their email link (local development uses a console mail sink).
- Q: How should an authenticated session expire as a user continues working over days or weeks? (FR-008) → A: Option A — Dual expiry: 14-day sliding inactivity timeout extended on renewal, capped by a hard 30-day absolute maximum lifetime from initial sign-in.
- Q: How should sign-in brute-force throttling be scoped to protect user accounts without letting attackers lock out legitimate staff? (FR-017) → A: Option A — Dual-key temporary throttling: enforce sliding-window rate limits per client network source and per target normalized email (temporary cooldown only, no permanent lockout).
- Q: What should happen to an earlier unexpired email-verification or password-reset link when a user requests a new one? (FR-014) → A: Option A — Invalidate prior unused links: issuing a new verification or password-reset link immediately invalidates all earlier unused links of that type for that user.
- Q: How should the platform limit the number of simultaneous active sessions a single user can hold across browsers and devices? (FR-013) → A: Option A — Bounded cap with oldest-idle eviction: allow up to a configurable limit (default 10 active sessions per user) and automatically revoke the least-recently-used session when exceeded.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Register, Sign In, and Sign Out of a Personal Account (Priority: P1)

A prospective organization owner, facility manager, engineer, technician, or viewer creates a personal GridAware identity using their display name, email address, and passphrase, confirms their email, signs in to access protected application views, inspects their own safe identity profile, and signs out when finished. Unauthenticated visitors attempting to open protected views are redirected to sign in without exposing protected content.

**Why this priority**: Every protected capability in GridAware depends on knowing who the human caller is; without account creation, sign-in, profile retrieval, and sign-out, no downstream organization or facility workflow can operate securely.

**Independent Test**: Can be tested end-to-end by registering a new account, verifying the email link, signing in with valid credentials, viewing the current user's profile summary, verifying that invalid credentials fail generically, and signing out so subsequent requests to protected views are denied.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on the registration screen, **When** they submit a valid display name, unique email address, and compliant passphrase, **Then** the platform creates a personal account in `Pending Verification` status using a normalized email identity, dispatches a verification message, and presents verification-pending guidance without exposing credential hashes or internal secrets.
2. **Given** an existing registered email address, **When** someone attempts to register again using the same email in different letter casing or with surrounding spaces, **Then** no duplicate account is created and the user receives a conflict message guiding them to sign in or recover their password without disclosing internal account status.
3. **Given** an `Active` (email-verified) user account, **When** the user submits valid sign-in credentials, **Then** an authenticated session is established and the user can retrieve their safe profile attributes (identifier, email, display name, account status, and email-verification state).
4. **Given** an unauthenticated visitor, **When** they submit an unregistered email address or an incorrect passphrase on the sign-in screen, **Then** the platform rejects the attempt with the exact same generic invalid-credentials message in both cases.
5. **Given** a signed-in user, **When** they trigger sign-out, **Then** their current session is immediately revoked, browser credentials are cleared, and navigating back to protected screens requires signing in again.

---

### User Story 2 - Maintain Seamless Access and Manage Active Sessions (Priority: P1)

An authenticated user remains signed in across normal operational shifts through automatic session renewal (extending inactivity expiry up to a hard maximum session lifetime) without repeated credential prompts, can view all browsers or devices currently signed in to their account, and can revoke any unrecognized individual session or sign out of all sessions everywhere—while any replay of an already-rotated session credential immediately invalidates the compromised session.

**Why this priority**: Facility and maintenance staff keep operational views open across shifts and devices; safe credential rotation, dual idle/absolute expiration bounds, replay detection, and self-service session revocation prevent stolen or forgotten device sessions from granting persistent unauthorized access.

**Independent Test**: Can be tested independently by signing in from two separate browser sessions, verifying automatic renewal extends idle expiration without exceeding the absolute session cap, listing active sessions, revoking one session while confirming the other remains active, replaying an already-used renewal credential to confirm immediate revocation, and executing "sign out everywhere" to invalidate all remaining sessions.

**Acceptance Scenarios**:

1. **Given** a signed-in user whose short-lived access window has elapsed while neither their 14-day inactivity window nor their 30-day absolute session lifetime has elapsed, **When** they perform an authenticated action (including from multiple open tabs at once), **Then** the session renews seamlessly once with a freshly rotated credential, extends the inactivity expiry without exceeding the absolute lifetime cap, and completes the action without duplicate renewal failures or redirect loops.
2. **Given** a renewal credential that has already been rotated once, **When** any caller presents that superseded credential again, **Then** the platform rejects the request, immediately revokes the associated session, and records a security audit event.
3. **Given** a signed-in user with multiple active device sessions, **When** they open their active sessions list and revoke one specific session they own, **Then** that target session is immediately invalidated while their current session remains active.
4. **Given** two distinct users (User A and User B), **When** User A attempts to revoke User B's session identifier, **Then** the platform denies the operation without affecting User B's session or disclosing session details.
5. **Given** a signed-in user with multiple active sessions, **When** they select "sign out of all sessions", **Then** every active session belonging to that user is revoked immediately.

---

### User Story 3 - Confirm Email Ownership (Priority: P2)

A newly registered user confirms ownership of their email address via a single-use, time-limited verification message—and can request a replacement message if the original expires—transitioning their account from `Pending Verification` to `Active` status so they can sign in.

**Why this priority**: Confirming email ownership prevents typosquatting, ensures incident and recovery notifications reach the real account holder, and establishes verified identity before organization invitations are accepted in later phases.

**Independent Test**: Can be tested by registering a new user, confirming that sign-in is blocked while `Pending Verification`, requesting a resend, completing confirmation via the issued single-use link, signing in successfully once `Active`, and verifying that reusing the same link fails cleanly.

**Acceptance Scenarios**:

1. **Given** a newly registered user in `Pending Verification` status, **When** they attempt to sign in before confirming their email, **Then** the platform blocks sign-in with an account-not-active indication and displays clear verification-pending instructions with an option to resend the verification message.
2. **Given** a valid, unexpired email-verification link, **When** the user opens and confirms it, **Then** the account transitions to `Active`, records the verification timestamp, and marks the verification credential as used so any subsequent reuse is rejected.
3. **Given** any visitor submitting an email address to the verification-resend screen, **When** the request is processed within allowed rate limits, **Then** the platform displays a generic confirmation message without revealing whether an unverified or active account exists for that email.

---

### User Story 4 - Recover Account Access via Password Reset (Priority: P2)

A user who forgets their passphrase requests a password reset for their email address, receives a single-use, time-limited recovery link without exposing whether the account exists, sets a new compliant passphrase, and automatically has all prior sessions revoked.

**Why this priority**: Self-service password recovery keeps operational personnel unblocked without administrator intervention while ensuring that resetting a potentially compromised passphrase terminates all pre-existing sessions.

**Independent Test**: Can be tested by requesting a reset for both registered and unregistered emails (verifying identical public responses), completing the reset with a valid single-use link while another session is active, signing in with the new passphrase, and confirming both the old passphrase and the prior session no longer work.

**Acceptance Scenarios**:

1. **Given** a visitor on the forgot-password screen, **When** they submit either a registered or an unregistered email address, **Then** the platform returns the same generic acknowledgement and issues a single-use, expiring recovery message only if an eligible account exists.
2. **Given** a user holding a valid, unexpired password-reset link and one or more active sessions, **When** they submit a new compliant passphrase, **Then** their credential verifier is updated, the reset link becomes permanently unusable, and all pre-existing sessions for that user are revoked.
3. **Given** an expired or previously used password-reset link, **When** a user attempts to set a new passphrase with it, **Then** the platform rejects the request with clear guidance to request a fresh recovery link.

---

### User Story 5 - Enforce Account Restrictions, Abuse Throttling, and Security Auditing (Priority: P2)

Platform operators and security reviewers rely on automatic rate limiting across public authentication actions, immediate access denial for suspended or deactivated accounts, protection against forged cross-site requests, and an append-only security audit trail free of sensitive secrets.

**Why this priority**: Publicly reachable authentication flows are primary targets for credential stuffing, enumeration, and session hijacking; built-in abuse controls and secret-free audit logs satisfy non-negotiable SaaS security governance.

**Independent Test**: Can be tested by exceeding configured request thresholds on public auth actions, suspending an active user to verify immediate sign-in and renewal denial, submitting a forged cross-site state-changing request, and inspecting recorded audit events to confirm correlation traceability and zero secret leakage.

**Acceptance Scenarios**:

1. **Given** an account marked `Suspended` or `Deactivated`, **When** the user attempts to sign in or renew an existing session, **Then** the platform denies authentication and prevents access to protected resources.
2. **Given** repeated registration, sign-in, verification-resend, or password-reset attempts exceeding allowed sliding-window thresholds—measured either per client network source or per target normalized email address—**When** additional attempts arrive within the temporary cooldown window, **Then** the platform throttles the requests with a clear rate-limit indication without permanently locking the user account.
3. **Given** any security-sensitive identity action (registration, sign-in success or failure, session creation/renewal/revocation, email verification, password reset, or account status change), **When** the operation completes, **Then** an immutable audit event is recorded with timestamp, correlation identifier, actor/target reference, and outcome, containing zero passphrases, tokens, or credential secrets.

### Edge Cases

- **Case and whitespace variations in email input**: Submissions such as `"  Alex.Morgan@Example.COM  "` MUST normalize identically across registration, sign-in, verification resend, and password reset so users cannot create shadow accounts or lock themselves out via capitalization differences.
- **Simultaneous multi-tab session renewal**: When a user has multiple browser tabs open and their short-lived access expires at the same moment, coordinated renewal MUST prevent competing requests from triggering false replay-detection lockouts or infinite sign-in loops.
- **Session reaching absolute lifetime cap despite recent activity**: Even when a user actively renews their session within the 14-day inactivity window, renewal MUST be denied once the 30-day absolute session lifetime from initial sign-in is reached, prompting a clean sign-in.
- **Exceeding concurrent active session cap**: When a user signs in while already at the configured maximum active-session limit (default 10), the platform MUST allow the new sign-in, automatically revoke that user's least-recently-used active session, and record a session-revocation audit event.
- **Replay of a superseded renewal credential**: If a previously rotated renewal credential is submitted again (indicating potential credential interception or cloning), the entire affected session MUST be revoked immediately rather than merely failing that single request.
- **Account status changed mid-session**: If an `Active` account transitions to `Suspended` or `Deactivated` while a session exists, subsequent authenticated requests or session renewals MUST reject access rather than honoring stale session state.
- **Expired, malformed, superseded, or already-used verification and reset links**: Issuing a new verification or password-reset link MUST immediately invalidate all prior unused links of that type for that user; submitting an expired, tampered, superseded, or previously consumed link MUST leave account credentials unchanged and provide a safe path to request a new link.
- **Email delivery outage during registration or recovery**: Account creation commits cleanly before outbound email dispatch; if email delivery temporarily fails, no partial/corrupt user state is left behind and the user can safely trigger a rate-limited resend.
- **Cross-user session manipulation**: Guessing or substituting another user's session identifier on revocation requests MUST fail without altering the other user's session or confirming whether the identifier exists.
- **Very long passphrases and special characters**: Passphrases containing spaces, Unicode characters, or lengths from 12 up to the 128-character maximum MUST be verified accurately without silent truncation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST allow unauthenticated users to register a global personal identity using a display name, email address, and passphrase, initializing the account in `Pending Verification` status.
- **FR-002**: System MUST normalize all email addresses consistently (trimming leading/trailing whitespace and folding case consistently) before uniqueness validation, storage lookups, sign-in, verification, and password recovery.
- **FR-003**: System MUST enforce a passphrase policy requiring 12 to 128 characters without silent truncation or arbitrary character-composition rules, storing passphrases exclusively as salted, irreversible cryptographic hashes.
- **FR-004**: System MUST prevent duplicate accounts for the same normalized email address and return a conflict response on registration that directs the user to sign in or recover access without exposing existing account status or profile details.
- **FR-005**: System MUST authenticate users by normalized email and passphrase, returning an identical generic invalid-credentials failure whether the email is unregistered or the passphrase is wrong.
- **FR-006**: System MUST enforce explicit account lifecycle states (`Pending Verification`, `Active`, `Suspended`, `Deactivated`) and block sign-in and session renewal for any account not in `Active` status—requiring newly registered `Pending Verification` accounts to confirm their email link before signing in.
- **FR-007**: System MUST deliver browser authentication credentials exclusively through non-script-accessible, transport-protected browser mechanisms (never persisting raw access or renewal secrets in script-readable browser storage) and enforce cross-site request forgery protection on all state-changing authenticated actions.
- **FR-008**: System MUST separate short-lived access authorization (default 15 minutes) from renewable sessions governed by both a sliding inactivity timeout (default 14 days, extended on each renewal up to the absolute cap) and a hard absolute maximum session lifetime (default 30 days from initial sign-in), atomically rotating the session renewal credential on each renewal and persisting only one-way cryptographic hashes of renewal, verification, and recovery credentials.
- **FR-009**: System MUST detect reuse of an already-rotated session renewal credential, immediately revoke the affected session, require fresh credential authentication, and record a security audit event.
- **FR-010**: System MUST coordinate concurrent session-renewal attempts from the same browser client and handle expired or revoked sessions deterministically without causing infinite retry loops.
- **FR-011**: System MUST provide a current-user identity capability that returns only safe, approved profile fields (`id`, `email`, `displayName`, `status`, `emailVerified`) and never exposes credential hashes, session verifiers, recovery secrets, or internal security metadata.
- **FR-012**: Users MUST be able to sign out of their current session (revoking the session server-side and clearing browser credentials) and sign out of all active sessions belonging to their account at once.
- **FR-013**: System MUST cap concurrent active sessions per user to a configurable limit (default 10), automatically revoking the least-recently-used active session when a new sign-in exceeds the cap; users MUST be able to view a list of their own active sessions (showing client/device context, creation time, last-used time, expiration, and current-session marker) and revoke any individual session they own, while the system strictly rejects attempts to inspect or revoke another user's session.
- **FR-014**: System MUST issue single-use, expiring email-verification credentials upon registration and verification resend (delivered via an external mail provider in deployed environments and a safe local console sink in local development), immediately invalidating any prior unused verification credentials for that user, transitioning the account to `Active` and recording the verification timestamp upon confirmation, and rejecting expired, superseded, or previously consumed credentials.
- **FR-015**: System MUST support rate-limited verification-resend and password-reset request flows that return generic, non-enumerating responses regardless of whether the submitted email address corresponds to an account.
- **FR-016**: System MUST support single-use, expiring password-reset credentials that immediately invalidate any prior unused password-reset credentials for that user upon issuance, update the user's passphrase verifier upon confirmation, mark the recovery credential as consumed, and automatically revoke all existing sessions for that user.
- **FR-017**: System MUST enforce configurable sliding-window rate limits across public registration, sign-in, session renewal, email-verification resend, and password-reset endpoints—scoping sign-in and account-targeted public flows both per client network source and per target normalized email address using temporary cooldowns only (never permanent account lockout).
- **FR-018**: System MUST record immutable, append-only security audit events for registration, sign-in success and failure, session creation/renewal/revocation, email verification, password reset request and completion, and account status transitions—including correlation identifier, timestamp, actor/target reference, and outcome while redacting all passphrases, tokens, verification/recovery secrets, and credential headers.
- **FR-019**: System MUST keep the global `User` identity free of organization-specific roles or tenant permissions, exposing a clean, minimal authenticated identity and session context for downstream organization membership and role-based authorization capabilities.
- **FR-020**: System MUST provide dedicated user-facing screens and states for registration, sign-in, email verification status/confirmation, forgot password, password reset, session-expired recovery, and loading/error feedback conforming to GridAware's dark-first visual tokens and WCAG 2.2 Level AA accessibility standards (full keyboard navigation, visible focus indicators, persistent field labels, and non-color-only error/status cues).

### Key Entities _(include if feature involves data)_

- **User**: Global human identity on the platform, independent of any customer organization. Key attributes: unique non-sequential identifier, display name, email address, normalized email address (unique), irreversible password hash, lifecycle status (`Pending Verification`, `Active`, `Suspended`, `Deactivated`), optional email-verified timestamp, and creation/update timestamps.
- **Authenticated Session**: A single signed-in browser or device session belonging to exactly one User. Key attributes: unique session identifier, owning User reference, unique one-way renewal credential verifier, optional client/device description, last-used timestamp, idle-expiration timestamp, absolute-expiration timestamp, optional revocation timestamp, and creation/update timestamps.
- **Email Verification Credential**: A single-use, time-bounded proof artifact issued to confirm ownership of a User's email address. Key attributes: unique identifier, owning User reference, unique one-way credential verifier, expiration timestamp, optional consumption timestamp, and creation timestamp.
- **Password Reset Credential**: A single-use, time-bounded recovery artifact allowing a User to set a new passphrase. Key attributes: unique identifier, owning User reference, unique one-way credential verifier, expiration timestamp, optional consumption timestamp, and creation timestamp.
- **Security Audit Event**: An immutable, append-only record of a security-relevant authentication or account lifecycle event. Key attributes: unique event identifier, optional actor User reference, action code, target type and target identifier, request/correlation identifier, safe outcome metadata, and occurrence timestamp.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new user can complete registration and reach clear email-verification instructions—and sign in immediately after confirming their verification link—in under 90 seconds on first attempt.
- **SC-002**: At least 95% of sign-in, current-profile, session-list, and sign-out interactions complete within 300 milliseconds under standard MVP evaluation workloads.
- **SC-003**: 100% of unauthorized access scenarios—wrong passphrases, unverified accounts, idle-expired or absolute-expired sessions, revoked sessions, replayed renewal credentials, suspended/deactivated accounts, cross-user session revocations, and forged cross-site state-changing requests—are rejected in automated security verification suites.
- **SC-004**: 0% of responses or recorded log/audit entries across all authentication and recovery journeys expose plaintext passphrases, active or historical session/verification/reset secrets, or account-existence differences on sign-in and recovery requests.
- **SC-005**: 100% of pre-existing active sessions for a user are invalidated immediately upon completing a password reset or triggering "sign out of all sessions".
- **SC-006**: 100% of core identity user flows (registration, sign-in, session management, email verification, password reset, and sign-out) are completable using keyboard navigation alone with zero color-only status or validation cues, passing WCAG 2.2 Level AA verification checks.
- **SC-007**: 100% of security-sensitive identity actions produce a queryable security audit record linked to the originating request correlation identifier.

## Assumptions

- **Out-of-Scope Platform Capabilities**: Organization creation and switching, membership invitations, organization-scoped role permissions (`Owner`, `Facility Manager`, `Engineer`, `Technician`, `Viewer`), sites/buildings/assets/sensors, simulator/device authentication, single sign-on (SSO/OAuth/SAML), multi-factor authentication (MFA), and subscription billing are outside Phase 5.1 scope and are deferred to Phases 5.2, 5.3, and later releases.
- **Session & Credential Lifetimes**: Short-lived access authorization defaults to 15 minutes, renewable user sessions enforce a 14-day sliding inactivity timeout capped by a hard 30-day absolute maximum lifetime from initial sign-in, concurrent active sessions default to a cap of 10 per user (evicting the least-recently-used session on overflow), and all four parameters remain configurable per deployment environment without modifying application logic.
- **Verification & Recovery Defaults**: Newly registered accounts start as `Pending Verification` and must confirm their email before signing in; verification links expire after 24 hours and password-reset links expire after 60 minutes. Deployed environments dispatch messages via a configured outbound email provider, while local development routes verification and recovery messages to a local developer console sink.
- **Credential Replay Policy**: Replaying an already-rotated session renewal credential is treated as a suspected session-compromise event and immediately revokes that session, requiring the user to sign in again with their primary credentials.
- **Canonical Domain Alignment**: The `User` and `Security Audit Event` entities align with GridAware's Phase 3 domain catalog (non-sequential unique identifiers, UTC timestamps, and zero tenant roles on the global `User` record) so Phase 5.2 `Organization` and `Membership` capabilities integrate without breaking identity contracts.
- **Startup Configuration Safety**: Deployment environments validate all required security secrets, allowed web origins, and session lifetime settings at startup and fail fast if mandatory configuration is missing or unsafe.
