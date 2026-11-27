# Feature Specification: Authentication & Identity UI/UX Enhancement

**Feature Branch**: `002-enhance-auth-ux`

**Created**: 2026-11-27

**Status**: Draft

**Input**: User description: "Lets enhance the auth ui/ux as much as possiable. U can use anycomponent from shadccn also implement using /impeccable also read ui docs."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Branded Split-Screen Authentication Entry & Frictionless Sign-In (Priority: P1)

A returning facility manager, engineer, technician, organization owner, or viewer opens the sign-in screen and immediately recognizes GridAware's dark-first industrial identity—anchored by an architectural brand panel on wide screens and a focused, high-contrast sign-in workspace free of distracting background clutter behind form controls. The visitor sees clear contextual notices when arriving from email verification, password recovery, or an expired session, receives calm and actionable inline feedback for validation or rate-limit cooldowns, and signs in effortlessly with keyboard, pointer, or password manager.

**Why this priority**: Sign-in is the highest-frequency entry point for every authenticated user in GridAware. Elevating clarity, visual authority, error recovery, and speed on this journey delivers immediate trust and operational usability for the entire product.

**Independent Test**: Can be fully tested by opening the sign-in screen across desktop, tablet, and mobile viewports; verifying contextual arrival banners (verified email, session expired, password updated), password visibility and Caps Lock warnings, invalid-credential handling, live rate-limit cooldown countdown, pending-verification recovery link, and successful sign-in redirect using both pointer and keyboard-only navigation.

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor on a desktop viewport opening the sign-in screen, **When** the page renders, **Then** they see an asymmetric split-screen layout pairing GridAware's architectural brand showcase panel (approved Node G lockup, subtle modular grid backdrop, calm product statement, and truthful decision-support context) alongside a clean, uncluttered sign-in surface with high-contrast inputs and a single primary sign-in action.
2. **Given** a visitor arriving at sign-in after their session expired or after being signed out in another tab, **When** the sign-in screen loads, **Then** an informational status banner with an icon and clear text explains why re-authentication is required and preserves their intended post-sign-in destination where safe.
3. **Given** a visitor entering their passphrase with Caps Lock active, **When** they type into a passphrase input, **Then** a non-intrusive inline Caps Lock notice (icon plus text) alerts them before submission without blocking typing or interfering with password managers.
4. **Given** a visitor who triggers sign-in rate limiting, **When** the temporary cooldown response arrives, **Then** a warning notice displays a live second-by-second countdown and temporarily disables resubmission until the cooldown finishes, automatically restoring the sign-in action once elapsed.
5. **Given** a visitor attempting to sign in with an account still awaiting email verification, **When** sign-in is denied for pending verification, **Then** the screen displays clear guidance and a direct action to resend verification that pre-fills their entered email address on the verification screen.
6. **Given** a visitor submitting an unregistered email or wrong passphrase, **When** sign-in fails, **Then** the entered email address is preserved, a generic non-enumerating error message (icon plus text, never color alone) is announced cleanly, and focus management lets them correct credentials immediately.

---

### User Story 2 - Guided Account Registration with Live Passphrase Feedback (Priority: P1)

A new GridAware user creates a personal account with clear visual guidance from start to finish: persistent field labels, gentle validation that avoids scolding mid-keystroke, a live passphrase policy checklist and strength indicator aligned with GridAware's 12-to-128-character passphrase rule, a passphrase confirmation check to prevent typos, and a helpful recovery path if the email address is already registered.

**Why this priority**: First-time account creation sets the user's very first impression of GridAware's craft and reliability while preventing preventable lockout friction caused by mis-typed long passphrases or unclear requirements.

**Independent Test**: Can be fully tested by completing registration with valid inputs, testing invalid display name/email/mismatched passphrase/short passphrase states, verifying real-time character count and passphrase strength cues (with non-color text and icon indicators), and testing duplicate-email conflict recovery links that carry the user smoothly to sign-in or passphrase recovery.

**Acceptance Scenarios**:

1. **Given** a visitor on the account creation screen typing a new passphrase, **When** characters are added or removed, **Then** a live policy readout displays the current character count in aligned tabular numerals, shows explicit met/unmet requirement cues (icon plus text for the 12–128 character range), and updates a non-color-only strength indicator encouraging passphrases and password managers.
2. **Given** a visitor entering a confirmation passphrase that does not match the primary passphrase, **When** they leave the confirmation field or submit the form, **Then** an inline mismatch error (icon plus text) identifies the discrepancy while preserving all valid form entries.
3. **Given** a visitor submitting invalid values across multiple fields, **When** validation runs on submission, **Then** inline errors appear beside each affected field and an accessible form-level summary highlights what needs attention without clearing safe inputs.
4. **Given** a visitor submitting an email address that already has an account, **When** the duplicate conflict occurs, **Then** a calm warning callout explains the conflict without revealing internal account status and provides direct actions to sign in or reset the passphrase with the email context carried forward.
5. **Given** a visitor submitting valid registration details, **When** account creation succeeds, **Then** duplicate submissions are prevented during the pending request and the user transitions cleanly to the email verification confirmation state with their email displayed.

---

### User Story 3 - Clear Email Verification Lifecycle & Resend Experience (Priority: P2)

A newly registered user or returning unverified user sees exactly where they stand in the account activation process—whether waiting to confirm an emailed link, actively verifying a clicked link, celebrating verified activation, or recovering from an expired, used, or superseded link—with clear next steps and rate-limit-aware resend controls.

**Why this priority**: Because GridAware requires email confirmation before sign-in, confusion or dead ends during verification directly block user activation and increase support burden.

**Independent Test**: Can be fully tested by visiting the verification screen in each distinct state: post-registration inbox instructions, active link confirmation loading, successful confirmation with direct sign-in transition, invalid/expired link recovery, and rate-limited resend countdown.

**Acceptance Scenarios**:

1. **Given** a user redirected to verification right after registering, **When** the verification screen loads, **Then** it presents a clear multi-step progress cue (`Account created` → `Verify email` → `Sign in`), highlights the destination email address, states the 24-hour single-use validity clearly, and offers a collapsible troubleshooting hint alongside the resend control.
2. **Given** a user opening a valid single-use verification link, **When** confirmation is in progress and then completes, **Then** the screen displays an accessible loading status followed by a distinct verified success state with a single primary action to continue to sign-in.
3. **Given** a user opening an expired, malformed, superseded, or previously consumed verification link, **When** confirmation fails, **Then** a clear error panel explains why the link cannot be used and guides them directly to request a fresh link without hiding the resend form.
4. **Given** any visitor submitting an email address to resend verification, **When** the request succeeds or is rate-limited, **Then** a privacy-preserving generic confirmation explains that prior unused links are invalidated (or shows a live cooldown timer if throttled) without disclosing whether an account exists.

---

### User Story 4 - Guided Passphrase Recovery & Security-Aware Reset Flow (Priority: P2)

A user who forgets their passphrase requests recovery through a calm, privacy-safe flow that transitions cleanly into structured inbox instructions, and when opening a reset link, immediately sees whether the link is usable, understands that changing their passphrase signs out all active sessions, benefits from the same live passphrase policy and confirmation guidance, and lands on a clean completion view.

**Why this priority**: Self-service recovery occurs when users are already blocked or under operational time pressure; preventing wasted effort on missing/expired tokens and clarifying session-revocation consequences builds confidence and reduces abandonment.

**Independent Test**: Can be fully tested by requesting a reset link (confirming transition to the post-request confirmation state and option to try another email), opening the reset screen without a token (confirming immediate invalid-link state before typing), and completing a reset with a valid token (confirming passphrase meter, match check, security notice, and clean post-reset sign-in screen).

**Acceptance Scenarios**:

1. **Given** a visitor submitting their email on the forgot-passphrase screen, **When** the request is accepted, **Then** the screen transitions from the request form to a focused confirmation view stating that if an account exists a 60-minute single-use recovery link was sent (invalidating prior unused links), with actions to return to sign-in or submit a different email address.
2. **Given** a visitor arriving at the password-reset screen with a missing recovery token, **When** the screen renders, **Then** it immediately presents a clear invalid-link state with a direct primary action to request a new recovery link instead of letting the user compose a new passphrase that is guaranteed to fail.
3. **Given** a user with a valid recovery token setting a new passphrase, **When** they interact with the reset form, **Then** they see an explicit notice that updating the passphrase signs out all active sessions, live 12–128 character policy and strength feedback, and a confirmation field before submitting.
4. **Given** a user who successfully updates their passphrase, **When** confirmation completes, **Then** the form is replaced by a clear completion state whose primary action takes them directly to sign in with an arrival confirmation cue, removing irrelevant recovery-retry links.

---

### User Story 5 - Readable Account Identity Profile & Safe Active Session Management (Priority: P2)

A signed-in user inspecting their profile and active sessions sees a structured, scannable identity overview and a human-readable list of every signed-in browser or device—showing device/browser identity, current-session badge, session quota usage, relative and exact activity timestamps, and explicit expiration bounds—and can safely revoke individual sessions or sign out everywhere through an accessible confirmation dialog with clear feedback and recovery on errors.

**Why this priority**: Raw browser identifier strings and unguarded inline destructive controls make security hygiene intimidating and error-prone; clear session visibility and deliberate destructive confirmations directly support operational trust across shared or shift-based devices.

**Independent Test**: Can be fully tested by signing in across multiple browsers, opening the profile and sessions page, verifying readable device/browser labels with expandable raw client details, verifying active session quota indicator, revoking a single non-current session with feedback, triggering and canceling/confirming the focus-trapped "Sign out of all sessions" dialog, and verifying loading skeletons and error retry behavior.

**Acceptance Scenarios**:

1. **Given** a signed-in user opening their account profile screen, **When** the page loads, **Then** they see a cohesive identity summary displaying their display name, initials emblem, verified email status badge (icon plus text), account status badge (icon plus text), and active session usage against the 10-session cap.
2. **Given** a user with active sessions across browsers or devices, **When** the active sessions list renders, **Then** each session displays a human-readable browser and operating-system summary with an appropriate device icon, a non-color-only `Current session` badge on the active browser, last-active time, idle expiration, and absolute session lifetime, with the full raw client identifier accessible on demand without cluttering the row.
3. **Given** a user revoking a non-current session, **When** revocation succeeds, **Then** the session is removed immediately with a clear status confirmation while the user's current session remains active and uninterrupted.
4. **Given** a user selecting `Sign out of all sessions`, **When** they activate the control, **Then** a focus-trapped confirmation dialog clearly explains that every signed-in browser—including the current one—will be signed out immediately, requires an explicit destructive confirmation action, supports dismissal via Cancel or Escape with focus restoration, and propagates sign-out cleanly upon confirmation.
5. **Given** a transient failure while loading active sessions, **When** the request fails, **Then** a clear error callout explains the issue (including a reference ID when provided) and offers an immediate `Retry` action without blanking out the rest of the page.

---

### User Story 6 - Cohesive Post-Auth Handoff, Navigation Polish & Inclusive Responsive Craft (Priority: P3)

Across every authentication screen, protected shell header auth control, and the post-auth onboarding handoff screen, users experience consistent dark-first EVARAX visual hierarchy, full keyboard operability, unobscured high-contrast focus indicators, reduced-motion respect, clean responsive reflow down to 320px viewports, and honest framing of upcoming workspace setup capabilities.

**Why this priority**: Visual, navigational, and accessibility consistency across every entry and exit point ensures that authentication feels like an integral part of an industrial operational platform rather than a disconnected scaffold.

**Independent Test**: Can be fully tested by running a complete keyboard-only pass and automated accessibility audit across all authentication screens, the post-authentication onboarding handoff screen, the account profile and active sessions screen, and protected header sign-out controls at 320px, 375px, 768px, 1024px, and 1440px viewports (plus 200% zoom and reduced-motion mode).

**Acceptance Scenarios**:

1. **Given** a keyboard-only user navigating any authentication screen or profile session screen, **When** they tab through controls, open dialogs or menus, and submit forms, **Then** every interactive control has a logical tab order, an unobscured high-contrast focus indicator, descriptive accessible labels, and zero keyboard traps.
2. **Given** a user with reduced-motion preferences enabled, **When** they navigate between auth screens, toggle disclosures, or open dialogs, **Then** decorative transitions and entrance animations are minimized immediately while state clarity remains intact.
3. **Given** a user on a 320px–767px mobile viewport, **When** they use sign-in, registration, verification, recovery, or active session management, **Then** the split-screen collapses into a clean single-column layout with zero horizontal page overflow, touch targets at least 44×44 px for primary actions, and mobile-safe input sizing that avoids unintended viewport zoom.
4. **Given** a newly signed-in user landing on the onboarding handoff screen, **When** the page displays, **Then** it matches the upgraded identity visual language, clearly shows that their personal verified identity is active, explains truthfully that organization workspace creation arrives in the next platform phase, and provides clear actions to visit the overview or manage active sessions without presenting fake or non-functional organization-creation controls.

---

### Edge Cases

- **Very long display names, email addresses, or client descriptions**: Long unbroken strings (e.g., 80-character corporate emails or verbose browser identifiers) MUST wrap or truncate gracefully with an accessible reveal so cards and session rows never trigger horizontal page overflow at 320px or 200% zoom.
- **Unrecognized or empty session client metadata**: When a session has a missing or non-standard client description, the interface MUST render a clear fallback label (`Unknown browser or client`) and neutral icon rather than blank space or broken parsing.
- **Password manager autofill and paste**: Pasting long passphrases (up to 128 Unicode characters with spaces) or autofilling credentials MUST trigger accurate character counts, strength feedback, and validation without blocking paste or truncating characters.
- **Cross-screen context prefill safety**: Carrying entered email addresses across authentication screens (e.g., from registration to verification, or from a duplicate-email notice to sign-in) and preserving post-sign-in return destinations MUST continue enforcing safe same-origin destination validation and never expose passphrases or secrets in page addresses.
- **Simultaneous rate-limit cooldown across rapid retries**: While a cooldown timer is counting down, pressing Enter in a form field MUST NOT fire duplicate requests until the countdown reaches zero.
- **Network outage or backend unavailability**: When authentication services cannot be reached, forms MUST preserve safe non-secret inputs (such as display name and email), display a clear recoverable error with any returned support reference ID, and provide immediate retry capability.
- **Revoking the current session from the session list**: Selecting `Sign out` on the row marked `Current session` MUST sign the user out cleanly and redirect to sign-in without leaving stale authenticated UI visible; attempting to revoke a session already expired/revoked MUST recover cleanly by refreshing the list and explaining the state.
- **Cross-tab sign-out or session expiration**: When a user signs out or executes "Sign out of all sessions" in one tab, open protected tabs MUST transition cleanly to sign-in with an informative reason banner rather than failing silently on subsequent clicks.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: All public authentication screens (sign-in, create account, verify email, forgot passphrase, and reset passphrase) MUST present a cohesive, dark-first split-screen layout on desktop viewports pairing a GridAware architectural brand panel (displaying the approved Node G horizontal lockup with required clear space, the approved modular 3×3 architectural backdrop pattern with restrained accent highlights, and concise decision-support identity messaging) with a clean, clutter-free authentication form region—reflowing cleanly to a single-column layout on tablet and mobile viewports.
- **FR-002**: The authentication brand panel MUST NOT display distracting imagery behind form inputs, MUST NOT include fabricated live equipment metrics, unbuilt platform claims, or equipment-control language, and MUST preserve the exact immutable EVARAX brand palette and Node G logo integrity rules (never recolored, stretched, shadowed, glowing, or mirrored).
- **FR-003**: Browser tab titles, page descriptions, bookmarks, and home-screen icons MUST reflect GridAware's approved brand identity assets (product title, description, icons, and dark theme appearance) rather than default starter placeholders.
- **FR-004**: Every authentication form MUST render persistent visible labels above fields, clear required/optional indicators, helpful pre-submission format guidance, accessible passphrase visibility toggles (`Show passphrase` / `Hide passphrase` with toggled state), and full compatibility with password managers and clipboard paste.
- **FR-005**: Form validation across sign-in, registration, verification resend, and password recovery MUST validate on submission and gently on blur for straightforward format checks (avoiding aggressive error states while the user is still typing a field for the first time), preserve safe entered values on failure, display field-level errors paired with icons and descriptive correction text, and present an accessible error summary when multiple fields require correction.
- **FR-006**: Passphrase entry inputs MUST detect and display a calm, non-blocking inline Caps Lock indicator (icon plus text) when Caps Lock is active while typing.
- **FR-007**: Account registration and password reset forms MUST provide a real-time passphrase guidance panel displaying the live character count in aligned tabular numerals, explicit requirement status for the 12-to-128-character policy (icon plus text), a non-color-only strength label and visual meter encouraging passphrases and password managers, and a confirmation passphrase field that verifies exact match before submission.
- **FR-008**: Every authentication form submission MUST disable duplicate submissions while in flight, show clear in-progress visual and assistive-technology busy status with a descriptive verb label, and restore interactive state cleanly upon completion or error.
- **FR-009**: Whenever an authentication action receives a temporary rate-limit response with a retry duration, the screen MUST display a warning banner featuring a live second-by-second countdown timer and prevent resubmission until the cooldown finishes, automatically re-enabling the action when the timer reaches zero.
- **FR-010**: The sign-in screen MUST surface clear, distinct contextual banners (icon plus text) for verified-email arrival, password-reset completion, session expiration, cross-tab sign-out, pending-verification blocks (with a direct link carrying the entered email to the verification screen), and generic invalid-credential failures—strictly preserving non-enumeration guarantees so unregistered emails and incorrect passphrases produce identical error messaging.
- **FR-011**: The registration screen's duplicate-email conflict state MUST preserve non-enumeration safety while presenting clear direct navigation to sign in or reset the passphrase, carrying the entered email context smoothly to reduce re-typing.
- **FR-012**: The email verification screen MUST provide distinct, purpose-built states for (a) post-registration pending confirmation (including a clear activation step indicator, highlighted target email, 24-hour single-use validity notice, and collapsible inbox troubleshooting guidance), (b) active link confirmation loading, (c) confirmed verification success with a single primary action to sign in, and (d) expired, invalid, or superseded link failure paired directly with the resend form.
- **FR-013**: The forgot-passphrase screen MUST transition cleanly from the email submission form to a structured, privacy-preserving confirmation state after submission—explaining the 60-minute link lifetime and invalidation of prior unused links, offering a way to try a different email address, and never revealing whether an account exists.
- **FR-014**: The reset-passphrase screen MUST detect a missing recovery token immediately on load and display an actionable invalid-link state with a primary button to request a new link (rather than rendering a submittable form that cannot succeed), MUST state upfront that updating the passphrase signs out all active sessions, and MUST replace the form with a focused completion state leading directly to sign-in once updated.
- **FR-015**: The account profile screen MUST display a well-structured identity summary presenting display name, user initials badge, normalized email address with explicit verification status badge (icon plus text), account status badge (icon plus text), account creation/verification timestamps where available, and active session quota usage against the 10-session cap.
- **FR-016**: The active sessions panel MUST summarize raw session client descriptions into human-readable browser, operating-system, and device-category labels paired with a fitting icon, clearly identify the active browser with a non-color-only `Current session` badge, display last-active recency alongside formatted idle-expiration and absolute-lifetime timestamps in tabular numerals, and expose the full raw client identifier via an accessible on-demand reveal.
- **FR-017**: Revoking all sessions (`Sign out of all sessions`) MUST require confirmation inside an accessible, focus-trapped confirmation dialog that states the exact security impact (signing out every active session including the current browser), uses explicit verb-based actions (`Sign out all sessions` and `Cancel`), supports Escape dismissal, and restores keyboard focus to the trigger control when canceled.
- **FR-018**: Individual session revocation MUST show per-row loading feedback, update the visible session list immediately on success with a clear status confirmation (or sign out and redirect if the current session is revoked), and display an actionable error with recovery guidance if revocation fails; initial session loading MUST render geometry-matching skeletons and fetch failures MUST include a direct `Retry` action and any returned support reference ID.
- **FR-019**: Protected header authentication controls (navigation active state, user identity menu/display, and sign-out action) and the post-auth onboarding handoff screen MUST align visually and interactively with the enhanced identity experience, clearly marking the current navigation destination with non-color cues (assistive-technology current-page indication plus a distinct visual indicator and typographic weight) and presenting honest next-step guidance without implying unbuilt workspace features are active.
- **FR-020**: Every authentication, profile, and session screen MUST target WCAG 2.2 Level AA accessibility: verified contrast across all interactive and status states, zero color-only cues for errors/status/strength/navigation, logical heading hierarchy with one primary heading per page, landmark regions with a skip-to-main-content control, restrained live-region announcements, minimum 44×44 px touch targets for primary actions, and full keyboard operability.
- **FR-021**: All visual motion and transitions across authentication surfaces MUST remain subtle and purposeful, MUST never use continuous flashing, pulsing, or neon glow, and MUST honor user reduced-motion system preferences by eliminating decorative animations immediately.
- **FR-022**: All authentication, profile, session, and onboarding screens MUST reflow cleanly without horizontal page overflow across small mobile (320px), mobile (375px–767px), tablet (768px–1023px), desktop (1024px–1439px), and wide desktop (1440px+) viewports, including at 200% browser zoom, using logical spacing and alignment ready for future right-to-left localization without mirroring the brand mark.
- **FR-023**: All experience enhancements MUST preserve 100% of existing Phase 5.1 authentication security, privacy, session-lifecycle, cross-site request protection, non-enumeration, and multi-tab synchronization guarantees without requiring breaking changes to existing authentication services.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: First-time users can complete registration, understand their email-verification instructions, and reach sign-in with zero dead-end states in under 60 seconds, with at least 95% succeeding on their first submission attempt without passphrase-policy errors.
- **SC-002**: Returning users can complete sign-in (or initiate passphrase recovery) in under 15 seconds using keyboard-only navigation, pointer input, or a browser password manager.
- **SC-003**: 100% of authentication journeys (sign-in, registration, verification, forgot passphrase, reset passphrase, active session inspection/revocation, sign out, and sign out everywhere) pass automated WCAG 2.2 Level AA accessibility checks and manual keyboard-only verification with zero critical or serious contrast, focus, or labeling defects.
- **SC-004**: 100% of authentication, profile, and onboarding screens render with zero horizontal page overflow across all target test widths (320px, 375px, 430px, 768px, 1024px, 1280px, 1440px) and at 200% zoom, with every primary control meeting the 44×44 px touch-target guideline.
- **SC-005**: 100% of required interface states—default, validation error, multi-field error summary, invalid credentials, duplicate email, pending verification, rate-limit countdown, missing/expired/invalid link, loading skeleton, network error with retry, and destructive confirmation—are demonstrably reachable and provide a clear next action without losing safe user input.
- **SC-006**: 100% of active session rows display a human-readable browser/device summary alongside explicit recency and expiration bounds, enabling users to identify their current session and distinguish unfamiliar devices in under 5 seconds.
- **SC-007**: 0% of authentication experience enhancements introduce regressions in existing authentication security invariants (identical invalid-credential errors, non-enumerating recovery/resend responses, zero secret exposure in page addresses or displays, and immediate cross-tab session invalidation).

## Assumptions

- **Existing Authentication Capabilities Reused**: All experience enhancements operate directly on top of the Phase 5.1 authentication and session management capabilities (registration, sign-in, sign-out, sign-out-everywhere, active session listing, single-session revocation, email verification confirmation/resend, and password reset request/confirmation) with no new backend capabilities or data model changes required.
- **Dark-First EVARAX Baseline**: Per GridAware's established design governance, the MVP authentication experience is dark-first (dark appearance only), strictly preserving the six immutable EVARAX brand colors, derived dark neutral surfaces, distinct semantic operational status colors, GridAware's approved sans-serif and tabular monospace typography system, and approved Node G logo and 3×3 architectural pattern assets.
- **No Premature Future-Phase Auth Features**: Single sign-on, social logins, passkeys, multi-factor authentication, organization creation wizards, and organization invitation acceptance screens remain outside this feature's scope and MUST NOT appear as disabled placeholders or non-functional controls on authentication screens.
- **Passphrase Policy Alignment**: Live passphrase strength feedback is strictly advisory and complements—never contradicts—GridAware's 12-to-128-character passphrase policy (no mandatory symbol or uppercase rejection rules are introduced).
- **Client-Side Session Description Summarization**: Human-readable browser, operating-system, and device labels in the active sessions list are derived safely from the existing session client description metadata returned by the active-sessions service, always retaining a safe fallback and an accessible way to inspect the full text.
- **Downstream Design & Component Execution**: Reusable accessible interface primitives and detailed design-craft execution passes will be planned and executed in subsequent planning and implementation phases in full alignment with GridAware's design documentation and Constitution.
