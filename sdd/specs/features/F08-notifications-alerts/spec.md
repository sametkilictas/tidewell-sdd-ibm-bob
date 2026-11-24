---
id: F08
title: Notifications and Alerts
status: Approved
version: 1.0.0
priority: P2
phase: 4
depends-on: [F00, F01, sdd/contracts/domain-events.md]
skills: [carbon-ui]
requirement-prefix: NOTF
contract-tags: [notifications, alert-rules]
---

# F08 — Notifications and Alerts

## 1. Summary
An in-app notification centre with real-time delivery (SSE), configurable alert rules,
and simulated email/SMS channels. Security alerts are mandatory (NFR-SEC-051).

## 2. Business rules
| ID | Rule |
|---|---|
| BR-NOTF-01 | Channels: IN_APP (always), EMAIL (Mailpit), SMS (dev outbox). |
| BR-NOTF-02 | Mandatory (cannot disable, in-app + email + SMS): new device sign-in, password changed/reset, MFA changed, contact details changed (sent to old and new contact), beneficiary added, account locked. |
| BR-NOTF-03 | Configurable rules: LOW_BALANCE (per account, threshold), LARGE_DEBIT (≥ threshold, any account), LARGE_CREDIT, CARD_INTERNATIONAL_USE, PAYMENT_STATUS (completed/failed/held), STATEMENT_READY, BILL_DUE (3 days before due date), CREDIT_CARD_DUE (5 days before). |
| BR-NOTF-04 | LOW_BALANCE triggers once when crossing below threshold, re-arms after balance rises above threshold + 10 %. |
| BR-NOTF-05 | Quiet hours (optional, 22:00–07:00 local default) suppress SMS for non-mandatory alerts; in-app still delivered. |
| BR-NOTF-06 | Notifications retained 90 days; list paginated 20 per page. |
| BR-NOTF-07 | SMS bodies ≤ 160 GSM-7 chars (en) / 70 UCS-2 chars (ar), never include full account numbers or amounts above masking rules. |

## 3. Functional requirements

#### NOTF-001 — Notification centre
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL show a header bell with unread count (99+ cap) opening a panel of the 10 latest notifications (icon, title, relative time, unread dot) and a link to the full list with filters (All, Unread, Security, Payments, Account).
- **Acceptance criteria:**
  - **NOTF-001-AC1** The bell's accessible name includes the count: "Notifications, 3 unread".

#### NOTF-002 — Read state
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN a notification is opened or "Mark all as read" is used, THE SYSTEM SHALL mark it read (optimistic UI) and update counts across tabs.
- **Acceptance criteria:**
  - **NOTF-002-AC1** Opening a notification navigates to its deep link and marks it read.

#### NOTF-003 — Real-time delivery
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN a notification is created, THE SYSTEM SHALL deliver it via SSE to all of the customer's open sessions within 2 s, show a `ToastNotification` for high-severity items, and replay missed events on reconnect (SPEC-04 §10).
- **Acceptance criteria:**
  - **NOTF-003-AC1** Killing the SSE connection and reconnecting with `Last-Event-ID` yields missed notifications without duplicates.

#### NOTF-004 — Alert preferences
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer edits alert rules (BR-NOTF-03) — enable/disable, thresholds (money input with account currency), channels, quiet hours — THE SYSTEM SHALL validate and save them with ETag concurrency; mandatory alerts SHALL appear as disabled-on toggles with explanation.
- **Acceptance criteria:**
  - **NOTF-004-AC1** Mandatory toggles are `disabled` with `aria-describedby` text "Security alerts are always on to protect you."

#### NOTF-005 — Rule evaluation
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN `accounts.balance_changed` or `accounts.transaction_posted` events occur, THE SYSTEM SHALL evaluate the customer's enabled rules and create notifications per channel, respecting BR-NOTF-04 and quiet hours.
- **Acceptance criteria:**
  - **NOTF-005-AC1** Low-balance threshold 5,000.00 on Current; a transfer leaving 4,500.00 triggers exactly one alert; another debit to 4,000.00 does not trigger again (J9).

#### NOTF-006 — Email and SMS rendering
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL render emails (responsive HTML + plain-text part, bilingual per preference, "Demo" footer, no tracking pixels) and SMS (BR-NOTF-07) from templates per notification type.
- **Acceptance criteria:**
  - **NOTF-006-AC1** Mailpit shows the "New sign-in" email with masked device info and a "This wasn't me" link to Settings › Security.

#### NOTF-007 — Mandatory security notifications
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN a mandatory event (BR-NOTF-02) occurs, THE SYSTEM SHALL send on all channels regardless of preferences and quiet hours.
- **Acceptance criteria:**
  - **NOTF-007-AC1** Changing email sends a notice to both old and new addresses.

## 4. UI specification
| Route | Screen |
|---|---|
| (header) | Bell + `HeaderPanel` |
| `/notifications` | Full list with filter `ContentSwitcher`, Mark all as read |
| `/settings/alerts` | Alert preferences (grouped: Security (locked), Balances, Payments, Cards, Documents; Quiet hours) |

## 5. API operations
`listNotifications`, `markNotificationRead`, `markAllNotificationsRead`,
`streamNotifications`, `getAlertRules`, `updateAlertRules`.

## 6. Test plan
Unit: rule evaluator with re-arm logic, SMS length/encoding. Integration: outbox → notification
pipeline idempotency, quiet hours with fake clock. E2E: J9, SSE toast, mandatory toggle a11y.
