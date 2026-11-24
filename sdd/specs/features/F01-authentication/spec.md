---
id: F01
title: Authentication, Enrolment, MFA, Sessions and Step-up
status: Approved
version: 1.0.0
priority: P1
phase: 1
depends-on: [F00, NFR-SEC, NFR-A11Y, ADR-0004]
skills: [carbon-ui, security-review]
requirement-prefix: AUTH
contract-tags: [auth]
---

# F01 — Authentication, Enrolment, MFA, Sessions and Step-up

## 1. Summary
Customers enrol online, sign in with username + password + second factor (SMS OTP or
authenticator app), stay signed in safely with idle/absolute timeouts, and re-verify
(step-up) for sensitive actions. Ops users use the same sign-in with MFA always enforced.

## 2. User stories
| ID | As a… | I want… | so that… |
|---|---|---|---|
| US-AUTH-1 | new customer (Omar) | to enrol with my customer number and date of birth | I can use online banking without visiting a branch |
| US-AUTH-2 | customer (Sara) | to sign in quickly on my trusted laptop | I reach my balances in seconds |
| US-AUTH-3 | customer | a clear warning before I'm signed out | I don't lose a half-finished transfer |
| US-AUTH-4 | customer | to reset my password myself | I'm not stuck if I forget it |
| US-AUTH-5 | customer | to confirm risky actions with a code | nobody can misuse my open session |

## 3. Business rules
| ID | Rule | Value |
|---|---|---|
| BR-AUTH-01 | Username | 6–32 chars, `[a-z0-9._-]`, case-insensitive, unique, not equal to customer number |
| BR-AUTH-02 | Password policy | NFR-SEC-002 |
| BR-AUTH-03 | OTP | 6 digits, valid 5 min, max 3 verify attempts per challenge, resend after 30 s, max 5 sends/hour/user |
| BR-AUTH-04 | TOTP | RFC 6238, SHA-1, 30 s step, 6 digits, ±1 step tolerance, replay of same code in same step rejected |
| BR-AUTH-05 | Recovery codes | 10 codes, 10 chars base32 grouped `XXXXX-XXXXX`, single use, hashed |
| BR-AUTH-06 | Trusted device | 30 days; max 5 per user; skipping MFA on trusted device allowed for **customers only**, never ops |
| BR-AUTH-07 | Lockout | 5 consecutive failures → TEMP_LOCKED 15 min; 10 in 24 h → LOCKED (ops unlock) |
| BR-AUTH-08 | Session | idle 5 min, warning at 4 min, absolute 8 h (configurable) |
| BR-AUTH-09 | Step-up token | single use, 5 min, bound to session + purpose (+ payload hash where stated) |
| BR-AUTH-10 | Reset link | single-use token, 30 min, plus SMS OTP; success revokes all sessions and trusted devices |
| BR-AUTH-11 | Enrolment attempts | 5 per customer number per 24 h; responses generic |

### Step-up purposes
| Purpose | Trigger | Payload-bound |
|---|---|---|
| `BENEFICIARY_CREATE` / `BENEFICIARY_UPDATE` | add/edit payee account details | yes |
| `TRANSFER_CREATE` | external transfer ≥ 10,000.00 AED-eq, or to a beneficiary in cooling-off, or international | yes |
| `CARD_REVEAL` | show full card number/CVC | no |
| `CARD_REPORT` | report lost/stolen | yes |
| `CONTACT_CHANGE` | change email/mobile | yes |
| `PASSWORD_CHANGE` | change password while signed in | no |
| `MFA_CHANGE` | add/remove TOTP, regenerate recovery codes | no |
| `LIMITS_INCREASE` | raise customer-chosen transfer limit | yes |
| `DATA_EXPORT` | request personal data export | no |

## 4. Functional requirements

### 4.1 Sign-in
#### AUTH-001 — Password sign-in
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN a user submits a username and password, THE SYSTEM SHALL verify them and respond with `MFA_REQUIRED` (with challenge ID and available methods) or, for a customer on a trusted device, `AUTHENTICATED` with a new session.
- **Acceptance criteria:**
  - **AUTH-001-AC1** Given Sara's valid credentials on an untrusted browser, when she signs in, then she is taken to "Verify it's you" with SMS and Authenticator options and a masked phone `+971 •• ••• 4417`.
  - **AUTH-001-AC2** Given Sara's trusted device cookie (valid), when she signs in, then she lands on `/dashboard` without MFA.
  - **AUTH-001-AC3** Given wrong credentials, then the message "The username or password is incorrect." is shown and focus moves to the error summary.

#### AUTH-002 — Lockout
- **Priority:** P1 · **Type:** Unwanted behaviour
- **EARS:** IF failed sign-in attempts reach the thresholds in BR-AUTH-07, THEN THE SYSTEM SHALL lock sign-in accordingly, show the remaining lock time (temporary) or contact guidance (hard lock), and emit `identity.account_locked`.
- **Acceptance criteria:**
  - **AUTH-002-AC1** After 5 failures, the 6th attempt shows "Too many attempts. Try again in 15 minutes or reset your password." with a link to reset.
  - **AUTH-002-AC2** A password reset completed successfully clears a TEMP_LOCKED state.

#### AUTH-003 — SMS one-time passcode
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the user selects SMS, THE SYSTEM SHALL send a 6-digit OTP to the registered mobile via the SMS adapter and verify it under BR-AUTH-03.
- **Acceptance criteria:**
  - **AUTH-003-AC1** In demo mode the OTP appears in `/dev/outbox` within 1 s.
  - **AUTH-003-AC2** A 4th verification attempt on the same challenge returns `MFA_ATTEMPTS_EXCEEDED` and the UI returns to the sign-in page with an explanation.
  - **AUTH-003-AC3** The resend link is disabled with a visible countdown for 30 s.

#### AUTH-004 — Authenticator app (TOTP)
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the user has a verified TOTP factor and selects "Authenticator app", THE SYSTEM SHALL verify a TOTP code under BR-AUTH-04 without sending an SMS.
- **Acceptance criteria:**
  - **AUTH-004-AC1** Reusing a code accepted within the same 30 s step is rejected.

#### AUTH-005 — Recovery codes
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the user chooses "Use a recovery code", THE SYSTEM SHALL accept one unused recovery code, mark it used, show how many remain, and recommend regenerating when ≤ 3 remain.
- **Acceptance criteria:**
  - **AUTH-005-AC1** A used recovery code is rejected on second use.

#### AUTH-006 — Remember this device
- **Priority:** P1 · **Type:** Optional feature
- **EARS:** WHERE the user ticks "Remember this device for 30 days" during MFA, THE SYSTEM SHALL register a trusted device (BR-AUTH-06) using a separate signed, HttpOnly `__Host-hb_dev` cookie and list it in Settings › Devices.
- **Acceptance criteria:**
  - **AUTH-006-AC1** Registering a 6th device evicts the least recently used one and notifies the user.

#### AUTH-007 — Sign-in confirmation and new-device alert
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN a sign-in succeeds, THE SYSTEM SHALL show the previous successful sign-in time and approximate location ("Last sign-in: Today 09:12 · Chrome on macOS") on the dashboard and, if the device is new, send a mandatory security notification.
- **Acceptance criteria:**
  - **AUTH-007-AC1** First sign-in on a new browser creates an in-app notification and dev-outbox email "New sign-in to your account".

### 4.2 Enrolment
#### AUTH-010 — Verify identity to enrol
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN a person submits a customer number (8 digits) and date of birth, THE SYSTEM SHALL, if they match a customer without online access, send an OTP to the mobile on file; otherwise THE SYSTEM SHALL return the generic `ENROLMENT_DETAILS_MISMATCH` with identical timing.
- **Acceptance criteria:**
  - **AUTH-010-AC1** Omar's seeded details trigger an OTP; a customer who already has online access gets the generic mismatch message (no enumeration).

#### AUTH-011 — Create credentials
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the OTP is verified, THE SYSTEM SHALL let the person choose a username (BR-AUTH-01) and password (NFR-SEC-002) with live, accessible validation and a strength meter, then activate the user and sign them in.
- **Acceptance criteria:**
  - **AUTH-011-AC1** The strength meter announces changes politely and never blocks paste.
  - **AUTH-011-AC2** On success, user lands on "Secure your account" (AUTH-012) then `/dashboard`.

#### AUTH-012 — Optional authenticator setup and recovery codes
- **Priority:** P2 · **Type:** Optional feature
- **EARS:** WHERE the new user chooses to set up an authenticator app, THE SYSTEM SHALL show a QR code and manual key, verify a first code, and display 10 recovery codes once with Copy/Download actions and an "I've saved these" confirmation.
- **Acceptance criteria:**
  - **AUTH-012-AC1** Recovery codes are never retrievable again after leaving the page (only regenerable).

### 4.3 Password reset
#### AUTH-020 — Request reset
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN a user requests a password reset with a username, THE SYSTEM SHALL always respond "If the details match, we've sent instructions" and, if the user exists and is not hard-locked, email a single-use reset link (BR-AUTH-10).
- **Acceptance criteria:**
  - **AUTH-020-AC1** Requests for unknown usernames produce the same response and timing.

#### AUTH-021 — Complete reset
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN a valid reset link is opened and the SMS OTP verified, THE SYSTEM SHALL accept a new password (NFR-SEC-002, not one of the last 5), revoke all sessions and trusted devices, clear TEMP_LOCKED, send a mandatory notification, and redirect to sign-in with a success message.
- **Acceptance criteria:**
  - **AUTH-021-AC1** Reusing the link after success shows "This link has expired or was already used."

### 4.4 Sessions
#### AUTH-030 — Session establishment
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN authentication completes, THE SYSTEM SHALL create a session per NFR-SEC-004, return the CSRF token and session expiry times, and audit `LOGIN` success.
- **Acceptance criteria:**
  - **AUTH-030-AC1** `GET /auth/session` returns `idleExpiresAt` and `absoluteExpiresAt`.

#### AUTH-031 — Idle timeout warning
- **Priority:** P1 · **Type:** State-driven
- **EARS:** WHILE a session is within 60 s of idle expiry, THE SYSTEM SHALL display a modal with a live countdown, "Stay signed in" (refreshes session) and "Sign out"; WHEN the countdown ends, THE SYSTEM SHALL sign out, clear cached data, and show `/signed-out?reason=idle`.
- **Acceptance criteria:**
  - **AUTH-031-AC1** With fake timers, the modal appears at 4:00 idle; pressing Enter on "Stay signed in" closes it and the server's `idleExpiresAt` moves forward.
  - **AUTH-031-AC2** User activity is defined as navigation, form input, or button press — not background polling/SSE.

#### AUTH-032 — Absolute timeout
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the absolute session lifetime is reached, THE SYSTEM SHALL end the session regardless of activity, preserving no form data, and show `/signed-out?reason=absolute`.
- **Acceptance criteria:**
  - **AUTH-032-AC1** 5 minutes before absolute expiry a non-modal `InlineNotification` warns "You'll be signed out at 17:41 for security."

#### AUTH-033 — Sign out and cross-tab sync
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the user signs out in any tab, THE SYSTEM SHALL invalidate the server session, clear the query cache, and propagate sign-out to all open tabs within 2 s via `BroadcastChannel`.
- **Acceptance criteria:**
  - **AUTH-033-AC1** Playwright with two pages: sign out in page A → page B shows signed-out screen.

#### AUTH-034 — Return to intended destination
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN an unauthenticated user opens a protected deep link, THE SYSTEM SHALL redirect to sign-in and, after authentication, return to the original path if it is an internal route.
- **Acceptance criteria:**
  - **AUTH-034-AC1** `?returnTo=https://evil.example` is ignored (open-redirect protection).

### 4.5 Step-up
#### AUTH-040 — Step-up challenge
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN a protected operation (§3 purposes) is attempted without a valid step-up token, THE SYSTEM SHALL respond `403 STEP_UP_REQUIRED` and the web app SHALL open the reusable **Verify it's you** dialog, obtain a challenge (SMS or TOTP), verify it, and transparently retry the original request with `X-Step-Up-Token`.
- **Acceptance criteria:**
  - **AUTH-040-AC1** Adding a beneficiary prompts for a code once; after verification the beneficiary is created without re-entering form data.
  - **AUTH-040-AC2** Cancelling the dialog leaves the form intact with an info notification "Verification cancelled. Nothing was changed."

#### AUTH-041 — Token binding
- **Priority:** P1 · **Type:** Unwanted behaviour
- **EARS:** IF a step-up token is reused, expired, used by another session, used for another purpose, or (for payload-bound purposes) presented with a different payload, THEN THE SYSTEM SHALL reject with `403 STEP_UP_TOKEN_INVALID`.
- **Acceptance criteria:**
  - **AUTH-041-AC1** Changing the transfer amount after step-up requires a new verification.

### 4.6 Demo affordances
#### AUTH-050 — Demo OTP bypass
- **Priority:** P1 · **Type:** State-driven
- **EARS:** WHILE `DEMO_MODE=true`, THE SYSTEM SHALL also accept `000000` as a valid SMS OTP for seeded demo users only, and the MFA screen SHALL show a dev hint "Demo: use 000000 or open Dev outbox".
- **Acceptance criteria:**
  - **AUTH-050-AC1** With `DEMO_MODE=false`, `000000` is rejected (NFR-SEC-033).

## 5. UI specification
| Route | Screen | Key elements | States |
|---|---|---|---|
| `/sign-in` | Sign in | Username (`autocomplete=username`), Password (`current-password`, show/hide toggle), "Remember username" checkbox (stores username only in `localStorage`), Sign in (primary), links: Forgot password, Enrol, Language switch, Security tips Toggletip | default, submitting (`InlineLoading`), error summary, temp-locked, locked |
| `/sign-in/verify` | Verify it's you | Method `RadioButtonGroup` (SMS to masked phone / Authenticator / Recovery code), OTP input, resend with countdown, "Remember this device for 30 days" checkbox, Verify | sending, wrong code (attempts left), expired, exceeded |
| `/enrol` | Enrol (wizard, 4 steps) | 1 Verify details (customer no., DOB `DatePicker` single), 2 Enter code, 3 Create credentials (username, password + strength meter + requirements list), 4 Secure your account (TOTP optional, recovery codes) | mismatch, rate-limited |
| `/forgot-password` | Request reset | Username, Submit → confirmation panel | |
| `/reset-password?token=` | Reset | OTP step → new password + confirm | invalid/expired link |
| `/signed-out` | Signed out | Reason-specific message (manual, idle, absolute, reset), Sign in again | |
| (dialog) | Step-up dialog | Purpose-specific title ("Confirm new payee"), method choice, OTP, Verify / Cancel | |
| (modal) | Session timeout | Countdown, Stay signed in / Sign out | |

Copy keys live under `auth.*` in i18n catalogs. Brand panel on `lg+` shows security tips
carousel (static, 3 tips, pauses on hover/focus, reduced-motion aware).

## 6. API operations
`login`, `verifyMfa`, `resendMfa`, `logout`, `getAuthSession`, `refreshSession`,
`startEnrolment`, `verifyEnrolment`, `completeEnrolment`, `requestPasswordReset`,
`verifyPasswordReset`, `completePasswordReset`, `startStepUp`, `verifyStepUp`.

## 7. Data
Tables: `users`, `credentials_history` (last 5 hashes), `sessions`, `trusted_devices`,
`mfa_factors`, `challenges`, `recovery_codes`, `password_reset_tokens`, `breached_passwords`
(seeded from bundled list), `login_attempts`.

## 8. Edge cases
- Concurrent MFA verify requests → only first succeeds; challenge marked consumed atomically.
- User changes language mid-flow → state preserved.
- Clock skew on TOTP beyond ±1 step → rejected with hint "Check your phone's time is set automatically."
- Session cookie present but session deleted (sign out everywhere) → `401 SESSION_EXPIRED`.
- Browser back after sign-out must not show cached account data (`no-store` + cache clear).

## 9. Audit & notifications
Audit: LOGIN, LOGIN_MFA, LOGOUT, ENROLMENT_*, PASSWORD_RESET_*, STEP_UP_*, DEVICE_TRUSTED.
Notifications (mandatory): new device sign-in, password reset/changed, account locked.

## 10. Test plan
- Integration: every AC above, lockout thresholds with fake clock, timing-equality test, token binding matrix.
- E2E: J1 (enrol), J2 sign-in with MFA via dev outbox, timeout modal (fake clock via `/dev/clock`), cross-tab sign-out, step-up dialog reuse (with F04 beneficiary once available — stub purpose `TEST_PURPOSE` behind demo flag before then).
- Security: run the `security-review` checklist §A Authentication and the project checklist (`sdd/specs/domain/security-checklist.md`).

## 11. Clarifications log
| Date | Question | Decision | By |
|---|---|---|---|
| 2026-11-18 | WebAuthn/passkeys? | Out of scope for prototype; noted as future enhancement in SPEC-02 §10 | PO |
