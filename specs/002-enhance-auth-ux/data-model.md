# Data & UI State Model: Authentication & Identity UI/UX Enhancement

**Feature**: `002-enhance-auth-ux`  
**Date**: 2026-11-27  
**Spec**: [spec.md](./spec.md)

> **Persistence Note**: This feature introduces **zero** database schema, Prisma model, or backend API payload changes. All UI models below operate purely in the `client/` presentation layer over the existing Phase 5.1 `SafeUserProfile`, `AuthSessionSummary`, `ApiEnvelope<T>`, and `ProblemDetails` contracts in `client/lib/auth/types.ts`.

---

## 1. Client-Side View Models

### 1.1 `PassphraseAssessment` (`client/lib/auth/passphrase-policy.mjs`)

Evaluates a user-entered passphrase against GridAware's 12–128 Unicode codepoint rule and computes advisory strength feedback.

| Field | Type | Constraints / Rules |
| --- | --- | --- |
| `length` | `number` | Exact Unicode codepoint count (`Array.from(value).length`) |
| `minLengthMet` | `boolean` | `length >= 12` |
| `maxLengthMet` | `boolean` | `length <= 128` |
| `isPolicyValid` | `boolean` | `minLengthMet && maxLengthMet` |
| `strengthTier` | `"empty" \| "too-short" \| "fair" \| "strong" \| "very-strong"` | Advisory only; never overrides `isPolicyValid` |
| `strengthLabel` | `string` | Human-readable non-color label (`""`, `"Too short"`, `"Fair"`, `"Strong"`, `"Very strong"`) |
| `strengthScore` | `0 \| 20 \| 50 \| 75 \| 100` | Progress bar percentage (`0` empty, `20` too short, `50` fair, `75` strong, `100` very strong) |
| `guidance` | `string` | Concise contextual tip (e.g., recommending multi-word passphrases or password managers) |

**Advisory Strength Tiers**:
- `length === 0` → `empty` (`0`)
- `length < 12` or `length > 128` → `too-short` (`20`) *(if `> 128`, guidance states maximum 128 characters)*
- `isPolicyValid` and (`length < 16` with low diversity) → `fair` (`50`)
- `isPolicyValid` and (`length >= 16` or (`length >= 12` with ≥ 3 character classes or multi-word spaces)) → `strong` (`75`)
- `isPolicyValid` and (`length >= 20` or (`length >= 16` with ≥ 3 character classes / multi-word spaces)) → `very-strong` (`100`)

### 1.2 `ParsedSessionClient` (`client/lib/auth/user-agent-parser.mjs`)

Normalizes raw `AuthSessionSummary.userAgent` (`string | null`) into scannable device/browser metadata.

| Field | Type | Description |
| --- | --- | --- |
| `browser` | `string` | Recognized browser or client (e.g., `"Chrome"`, `"Edge"`, `"Firefox"`, `"Safari"`, `"Automated client"`, `"Unknown browser"`) |
| `os` | `string \| null` | Recognized OS (`"Windows"`, `"macOS"`, `"iOS"`, `"Android"`, `"Linux"`, `"ChromeOS"`, or `null`) |
| `deviceType` | `"desktop" \| "mobile" \| "tablet" \| "unknown"` | Selects semantic device icon (`Monitor`, `Smartphone`, `Tablet`, `Globe`) |
| `summary` | `string` | Primary row headline, e.g. `"Chrome on Windows"` or fallback `"Unknown browser or client"` |
| `raw` | `string \| null` | Unmodified raw `userAgent` exposed inside an accessible `Collapsible` disclosure |

### 1.3 `SessionTimeDisplay` (`client/lib/auth/session-time.mjs`)

| Field | Type | Description |
| --- | --- | --- |
| `lastActiveRelative` | `string` | Concise recency (`"Just now"`, `"5m ago"`, `"2h ago"`, `"3d ago"`) |
| `lastActiveExact` | `string` | Locale-formatted date/time with timezone abbreviation |
| `idleExpiresExact` | `string` | Formatted sliding idle expiration timestamp |
| `absoluteExpiresExact` | `string` | Formatted hard 30-day maximum lifetime timestamp |

### 1.4 `FormErrorItem` & `FormBannerState` (`client/lib/auth/auth-validation.mjs`)

| Entity | Fields | Rules |
| --- | --- | --- |
| `FormErrorItem` | `{ fieldId: string; fieldName: string; message: string }` | Drives `<FormErrorSummary />` when ≥ 2 fields fail validation; clicking/activating focuses `#${fieldId}` |
| `FormBannerState` | `{ tone: "error" \| "warning" \| "success" \| "info"; title?: string; message: string; code?: string; requestId?: string }` | Always rendered with semantic icon + text; `requestId` displayed in monospace when present on server/network failures |

---

## 2. Screen State Machines

### 2.1 Sign-In Screen (`/login`)

```text
Arrival Context (derived from sanitized searchParams):
  ?verified=1                 -> Info/Success arrival banner: Email verified
  ?reset=1                    -> Success arrival banner: Passphrase updated; all prior sessions signed out
  ?reason=session-expired     -> Info arrival banner: Session expired; sign in to continue (preserves safe ?next=)
  ?reason=signed-out          -> Info arrival banner: Signed out cleanly (or signed out in another tab)

Interaction States:
  Idle -> Validating -> Submitting
    -> Success (redirect to sanitized ?next= or /app)
    -> ValidationError (inline errors + error summary if >= 2 fields; email preserved)
    -> InvalidCredentials (generic non-enumerating error banner; email preserved)
    -> AccountNotActive (warning banner + direct "Resend verification email" link pre-filling ?email=)
    -> RateLimited (warning banner with live second countdown; submit disabled until countdown = 0)
    -> NetworkError (error banner + requestId if present; email preserved; immediate retry)
```

### 2.2 Registration Screen (`/register`)

```text
Interaction States:
  Idle (live PassphraseAssessment + Confirm Passphrase match tracking)
    -> Submitting (prevents duplicate submit)
      -> Success (redirect to /verify-email?email=<trimmed>&sent=1)
      -> ValidationError (inline field errors + summary if >= 2 fields; preserves valid entries)
      -> EmailUnavailable (calm warning banner + pre-filled links to /login?email= and /forgot-password?email=)
      -> RateLimited (live second countdown; submit disabled until 0)
      -> NetworkError (error banner + requestId; preserves displayName & email)
```

### 2.3 Email Verification Screen (`/verify-email`)

```text
Token Present (?token=...):
  Confirming (accessible loading card)
    -> Verified (step 3 complete; success card + single primary CTA -> /login?verified=1[&email=])
    -> InvalidOrExpired (critical callout + visible resend form pre-filled with ?email= if present)

No Token (Default / Post-Registration ?sent=1&email=...):
  PendingConfirmation
    - Multi-step progress indicator: [1. Account created (done)] -> [2. Verify email (current)] -> [3. Sign in (upcoming)]
    - Highlighted target email (if provided) + 24-hour single-use notice
    - Collapsible troubleshooting panel ("Didn't receive the email?")
    - Resend form -> Submitting -> ResentGenericSuccess | RateLimited (countdown) | Error
```

### 2.4 Forgot Passphrase (`/forgot-password`) & Reset Passphrase (`/reset-password`)

```text
/forgot-password:
  RequestForm (pre-fills ?email= if carried from login/register)
    -> Submitting
      -> ConfirmationView (replaces form; privacy-safe 60-min notice + "Try another email" + "Back to sign in")
      -> RateLimited (countdown on form)
      -> Error (inline/banner error; preserves email)

/reset-password:
  No Token (?token= missing/blank) -> MissingTokenState (immediate actionable state -> "Request a new reset link")
  Token Present -> ResetForm (upfront session-signout notice + PassphraseAssessment + Confirm Passphrase)
    -> Submitting
      -> CompletedState (replaces form; primary CTA -> /login?reset=1; no competing retry link)
      -> InvalidOrExpiredToken (error banner + prominent "Request a new reset link" action)
      -> RateLimited (live countdown)
```

### 2.5 Account Profile & Active Sessions (`/app/profile`)

```text
Profile Summary Card (Server Component):
  - Display name, initials Avatar, normalized email, Verified Badge (icon + text), Account Status Badge (icon + text), account dates

Active Sessions Panel (Client Component):
  Loading (geometry-matching Skeleton rows)
    -> FetchError (error alert + requestId + Retry button)
    -> Loaded (quota badge "N of 10 active sessions" + Progress bar)
       - EmptyState (no active sessions)
       - SessionList (each row: device icon, ParsedSessionClient.summary, Current badge, timestamps, Collapsible raw UA, Revoke/Sign out button)
         - RevokingRow (per-row spinner) -> RowRemoved (+ polite status + Sonner toast) | CurrentSessionRevoked (redirect /login?reason=signed-out) | StaleConflictRefresh
         - ConfirmSignOutAllDialog (AlertDialog focus-trapped)
           -> Cancel / Escape (restores focus to trigger)
           -> Confirm -> RevokingAll -> Broadcast SESSION_INVALIDATED(signed-out) -> redirect /login?reason=signed-out
```
