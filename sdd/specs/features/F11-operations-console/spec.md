---
id: F11
title: Operations Console (maker-checker, unlock, messaging, audit)
status: Approved
version: 1.0.0
priority: P3
phase: 6
depends-on: [F00, F01, F04, F10, NFR-SEC-011, NFR-OBS-010]
skills: [carbon-ui, security-review]
requirement-prefix: OPS
contract-tags: [ops]
---

# F11 — Operations Console

## 1. Summary
A separate, visually distinct console at `/ops` for bank staff (seeded ops users) to unlock
customers, review payments held by fraud rules under four-eyes control, answer secure
messages and search the audit log — demonstrating least privilege, justified access and
complete auditability.

## 2. Roles and permissions
| Capability | OPS_AGENT | OPS_SUPERVISOR |
|---|---|---|
| Search customers (masked results) | ✔ | ✔ |
| View customer 360 (requires access reason) | ✔ | ✔ |
| Unlock customer (LOCKED → ACTIVE) | ✔ | ✔ |
| Recommend decision on held payment (maker) | ✔ | ✔ |
| Approve / reject held payment (checker) | — | ✔ (not for payments they recommended) |
| Reply to secure messages, close threads | ✔ | ✔ |
| Search audit log | — | ✔ |

## 3. Business rules
| ID | Rule |
|---|---|
| BR-OPS-01 | Ops users always complete MFA (no trusted-device bypass) and have a 15-minute idle timeout. |
| BR-OPS-02 | Opening a customer 360 requires selecting a reason (CUSTOMER_CALL, SECURE_MESSAGE, HELD_PAYMENT_REVIEW, FRAUD_INVESTIGATION, OTHER + text ≥ 10 chars); valid for 30 min for that customer; audited `OPS_CUSTOMER_VIEWED`. |
| BR-OPS-03 | Customer search: by customer number (exact), name (prefix, ≥ 3 chars), masked mobile last 4; max 20 results; results show masked data only. |
| BR-OPS-04 | Held payments: maker recommends APPROVE/REJECT with note (≥ 10 chars); a different supervisor approves/rejects; orders held > 72 h auto-reject with customer notification. |
| BR-OPS-05 | Ops replies are signed with the staff member's first name; staff cannot see customer passwords, OTPs, full PAN or full national ID — ever. |

## 4. Functional requirements

#### OPS-001 — Ops sign-in and shell
- **Priority:** P3 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide an ops shell under `/ops` with distinct header colour (SPEC-05 §2), role-based navigation, "Operations console — staff only" label, and BR-OPS-01 session policy.
- **Acceptance criteria:**
  - **OPS-001-AC1** A customer user navigating to `/ops` sees a 403 page; API `/ops/**` returns 403.

#### OPS-002 — Customer search
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN an ops user searches customers (BR-OPS-03), THE SYSTEM SHALL return masked results with status tags (Active, Temp locked, Locked).
- **Acceptance criteria:**
  - **OPS-002-AC1** Search "Sar" returns Sara Haddad with masked mobile `+971 •• ••• 4417`.

#### OPS-003 — Customer 360 with justification
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN an ops user opens a customer, THE SYSTEM SHALL require an access reason (BR-OPS-02) and then show profile (masked), user status, accounts with balances, recent payments, held payments, open threads, and recent security activity — read-only.
- **Acceptance criteria:**
  - **OPS-003-AC1** Missing reason → `400 ACCESS_REASON_REQUIRED`; reason recorded in audit metadata.

#### OPS-004 — Unlock customer
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN an ops user unlocks a LOCKED or TEMP_LOCKED customer with a note, THE SYSTEM SHALL reset failure counters, set ACTIVE, notify the customer and audit `OPS_USER_UNLOCKED`.
- **Acceptance criteria:**
  - **OPS-004-AC1** The customer can sign in immediately after unlock.

#### OPS-005 — Held payments queue (maker)
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** THE SYSTEM SHALL list HELD_FOR_REVIEW orders oldest first with rule IDs, amount, customer (masked), beneficiary age, SLA countdown to 72 h, and WHEN an agent records a recommendation (BR-OPS-04), THE SYSTEM SHALL store it and route to supervisors.
- **Acceptance criteria:**
  - **OPS-005-AC1** The `DEMO-REVIEW` payment from XFER-033 appears with rule `FR-4`.

#### OPS-006 — Approve / reject (checker)
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN a supervisor approves or rejects a recommended held payment, THE SYSTEM SHALL enforce that the supervisor is not the maker (`MAKER_CHECKER_VIOLATION`), transition the order (PROCESSING or REJECTED with hold release), notify the customer and audit.
- **Acceptance criteria:**
  - **OPS-006-AC1** Supervisor who recommended cannot approve the same payment (J12).
  - **OPS-006-AC2** Customer's transfer detail updates live from "Under review" to "Processing".

#### OPS-007 — Messaging queue
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** THE SYSTEM SHALL list open customer threads by waiting time with category filters and allow ops to reply (with attachments) and close threads; replies notify the customer.
- **Acceptance criteria:**
  - **OPS-007-AC1** Replying sets thread status AWAITING_CUSTOMER and the customer receives an in-app notification.

#### OPS-008 — Audit search
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN a supervisor searches the audit log by actor, customer, action, outcome and time range (≤ 31 days), THE SYSTEM SHALL return paginated events with redacted metadata and a hash-chain verification status badge; the search itself is audited.
- **Acceptance criteria:**
  - **OPS-008-AC1** Filtering action `CARD_DETAILS_REVEALED` shows Sara's reveal events with timestamps and IP.

## 5. UI specification
| Route | Screen |
|---|---|
| `/ops` | Ops home: queues summary tiles (Held payments, Unanswered messages, Locked users today) |
| `/ops/customers` | Search |
| `/ops/customers/:customerId` | Access reason modal → Customer 360 |
| `/ops/payments/held` | Held payments queue + detail side panel with Recommend / Approve / Reject |
| `/ops/messages` | Messaging queue and conversation |
| `/ops/audit` | Audit search (supervisor) |

## 6. API operations
`opsSearchCustomers`, `opsGetCustomer`, `opsUnlockUser`, `opsListHeldPayments`,
`opsRecommendHeldPayment`, `opsDecideHeldPayment`, `opsListThreads`, `opsPostMessage`,
`opsCloseThread`, `opsSearchAudit`.

## 7. Test plan
Integration: role matrix for every ops route, maker-checker violations, 72 h auto-reject job,
access-reason expiry. E2E: J12 with two ops browser contexts (agent + supervisor).
