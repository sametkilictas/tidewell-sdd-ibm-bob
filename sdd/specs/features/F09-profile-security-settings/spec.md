---
id: F09
title: Profile, Preferences and Security Settings
status: Approved
version: 1.0.0
priority: P1 (security core) / P2 (rest)
phase: 4
depends-on: [F00, F01, F08]
skills: [carbon-ui, security-review]
requirement-prefix: PROF
contract-tags: [profile, security-settings, privacy]
---

# F09 — Profile, Preferences and Security Settings

## 1. Summary
A settings area where customers review personal details, change contact information
safely, set preferences (language, theme, default account), manage password, MFA,
devices and sessions, review security activity, manage consents and export their data.

## 2. Business rules
| ID | Rule |
|---|---|
| BR-PROF-01 | Name, date of birth, national ID and address are read-only online ("To update, send us a secure message"). National ID shown masked `•••••••••123`. |
| BR-PROF-02 | Email change: step-up `CONTACT_CHANGE` → enter new email → 6-digit code sent to new email → verify → change; notify old and new (NOTF-007). |
| BR-PROF-03 | Mobile change: same as email with SMS to new number; E.164 validation; UAE mobile numbers `+971` + 9 digits starting with 5 (e.g. `+971 55 550 4417`). |
| BR-PROF-04 | Password change: current password + new password (NFR-SEC-002, not last 5) + step-up; option "Sign out of all other sessions" (default checked). |
| BR-PROF-05 | MFA: SMS is always available as baseline; TOTP optional; removing TOTP requires step-up via SMS. |
| BR-PROF-06 | Security activity: 90 days of sign-ins (success/failure), device and credential changes. |
| BR-PROF-07 | Preferences are ETag-protected and apply immediately across tabs. |

## 3. Functional requirements

#### PROF-001 — Personal details
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL display full name, preferred name, customer number, date of birth, masked national ID, email, mobile and addresses per BR-PROF-01.
- **Acceptance criteria:**
  - **PROF-001-AC1** Read-only fields show a "How to update" link that opens a pre-categorised secure message (F10) when F10 is available, else contact info.

#### PROF-002 — Change email
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer changes their email, THE SYSTEM SHALL follow BR-PROF-02 and update all future email delivery to the new address.
- **Acceptance criteria:**
  - **PROF-002-AC1** Entering the current email again is rejected "This is already your email address."

#### PROF-003 — Change mobile number
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer changes their mobile number, THE SYSTEM SHALL follow BR-PROF-03 and use the new number for future SMS OTPs.
- **Acceptance criteria:**
  - **PROF-003-AC1** After the change, the next sign-in OTP is delivered to the new number (dev outbox).

#### PROF-010 — Preferences
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the customer changes language, theme, default "from" account or hide-balances default, THE SYSTEM SHALL save and apply immediately (BR-PROF-07).
- **Acceptance criteria:**
  - **PROF-010-AC1** Changing the default account pre-selects it in the transfer wizard.

#### PROF-020 — Change password
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the customer changes their password (BR-PROF-04), THE SYSTEM SHALL verify the current password, enforce policy, rotate the current session ID, optionally revoke other sessions, and send a mandatory notification.
- **Acceptance criteria:**
  - **PROF-020-AC1** Wrong current password → "Your current password is incorrect." (counts toward lockout).

#### PROF-021 — Authenticator app management
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer sets up or removes an authenticator app (BR-PROF-05), THE SYSTEM SHALL require step-up `MFA_CHANGE`, show QR + manual key for setup, verify the first code, and notify.
- **Acceptance criteria:**
  - **PROF-021-AC1** The TOTP secret is stored encrypted (NFR-SEC-030) and never returned after setup.

#### PROF-022 — Recovery codes
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer regenerates recovery codes, THE SYSTEM SHALL require step-up, invalidate all previous codes, and show the 10 new codes once with Copy/Download.
- **Acceptance criteria:**
  - **PROF-022-AC1** An old code fails after regeneration.

#### PROF-023 — Trusted devices
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** THE SYSTEM SHALL list trusted devices (name e.g. "Chrome on macOS", added date, last used, "This device" tag) and WHEN the customer revokes one, THE SYSTEM SHALL remove trust so the next sign-in on it requires MFA.
- **Acceptance criteria:**
  - **PROF-023-AC1** Revoking "This device" shows a warning that MFA will be needed next time.

#### PROF-024 — Sessions
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** THE SYSTEM SHALL list active sessions (device, approximate location, started, last active, "Current") and provide "Sign out of all other sessions" and "Sign out everywhere".
- **Acceptance criteria:**
  - **PROF-024-AC1** After "Sign out of all other sessions", a second browser's next API call returns `401 SESSION_EXPIRED`.

#### PROF-030 — Security activity
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL show security activity per BR-PROF-06 as a timeline with outcome icons, device, approximate location and time, with a "This wasn't me" action leading to password change and sign-out-everywhere.
- **Acceptance criteria:**
  - **PROF-030-AC1** A failed sign-in attempt appears with outcome "Failed — wrong password".

#### PROF-040 — Consents
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN the customer toggles marketing (email/SMS) consent, THE SYSTEM SHALL record it per NFR-PRIV-005.
- **Acceptance criteria:**
  - **PROF-040-AC1** Consent text version is shown under the toggle.

#### PROF-050 — Data export
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN the customer requests a data export (step-up `DATA_EXPORT`), THE SYSTEM SHALL generate it per NFR-PRIV-003, notify when ready, and offer a download link valid 7 days in the Documents centre.
- **Acceptance criteria:**
  - **PROF-050-AC1** Archive contains `profile.json`, `accounts.json`, `transactions.csv`, `beneficiaries.json`, `messages.json`, `security-activity.json`, `README.txt`.

## 4. UI specification
| Route | Screen |
|---|---|
| `/settings` | Settings overview (cards linking to sections) |
| `/settings/profile` | Personal details + contact change flows (side panel wizards) |
| `/settings/preferences` | Language, theme, default account, hide balances |
| `/settings/security` | Password, Two-step verification (SMS, Authenticator, Recovery codes), Trusted devices, Sessions, Security activity |
| `/settings/alerts` | (F08) |
| `/settings/privacy` | Consents, Data export |

## 5. API operations
`getProfile`, `updatePreferences`, `startContactChange`, `verifyContactChange`,
`changePassword`, `startTotpSetup`, `confirmTotpSetup`, `removeTotp`,
`regenerateRecoveryCodes`, `listTrustedDevices`, `revokeTrustedDevice`, `listSessions`,
`revokeSessions`, `listSecurityActivity`, `updateConsents`, `requestDataExport`.

## 6. Test plan
Integration: each AC, session revocation matrix, contact change double-notify, ETag 412 path.
E2E: J10; a11y on settings pages. Security review: account takeover paths (contact change +
password change + device trust) per the `security-review` skill and the project checklist (`sdd/specs/domain/security-checklist.md`).
