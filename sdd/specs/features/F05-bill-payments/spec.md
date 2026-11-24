---
id: F05
title: Bill Payments and Top-ups
status: Approved
version: 1.0.0
priority: P2
phase: 5
depends-on: [F00, F01, F03, F04]
skills: [domain-rules, carbon-ui]
requirement-prefix: BILL
contract-tags: [billers, bill-payments]
---

# F05 — Bill Payments and Top-ups

## 1. Summary
Customers pay utility, telecom, internet, education and government-fee bills from a
catalogue of (fictional) billers, look up the amount due, pay now or schedule, and top up
prepaid mobile lines. Bill payments are PaymentOrders of kind `BILL`, reuse the transfer
review/receipt patterns and count toward the daily external limit.

## 2. Business rules
### 2.1 Seeded billers (fictional)
| Biller | Category | Reference label & pattern | Inquiry | Payment rule |
|---|---|---|---|---|
| AquaGrid Utilities | ELECTRICITY_WATER | Meter account `^\d{12}$` (e.g. `100200300400`) | yes | partial allowed (min 10.00), overpay up to 500.00 credit |
| Coastline Mobile — Postpaid | TELECOM | Mobile number `^5\d{8}$` | yes | full or partial (min 10.00) |
| Coastline Mobile — Prepaid | TELECOM | Mobile number `^5\d{8}$` | no | fixed denominations 20.00 · 50.00 · 100.00 · 200.00 |
| FiberLink Home | INTERNET | Account `^FL-\d{7}$` | yes | exact amount due only |
| Northstar Academy | EDUCATION | Student ID `^\d{6}$` | yes | exact amount due only |
| Civic Services Portal | GOVERNMENT | Payment ref `^\d{10}$` | yes | exact amount due only |

All biller payments are in AED from AED current accounts.

### 2.2 Other rules
| ID | Rule |
|---|---|
| BR-BILL-01 | Max 50 saved billers per customer. Nickname ≤ 30 chars. Same biller + reference is a duplicate. |
| BR-BILL-02 | Inquiry result cached 10 min per saved biller; "Refresh" re-queries. |
| BR-BILL-03 | Bill payments complete synchronously via the biller simulator (2 s delay) unless biller unavailable → FAILED with hold released. |
| BR-BILL-04 | Auto-pay (recurring): monthly on a chosen day (1–28) paying either "amount due at that time" (requires inquiry-capable biller; capped by a customer-set maximum) or a fixed amount. |
| BR-BILL-05 | Demo: reference ending `999` → `BILLER_REFERENCE_NOT_FOUND`; fault toggle `billers: down`. |

## 3. Functional requirements

#### BILL-001 — Browse and search billers
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL present billers grouped by category with icons and a search by name (en/ar), showing each biller's reference label and an example.
- **Acceptance criteria:**
  - **BILL-001-AC1** Typing "fiber" shows FiberLink Home; Arabic name search works.

#### BILL-002 — Save a biller
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer saves a biller with a reference and optional nickname, THE SYSTEM SHALL validate the reference against the biller pattern, run an inquiry when supported to confirm the account exists, and save it (no step-up — funds can only go to the biller).
- **Acceptance criteria:**
  - **BILL-002-AC1** Invalid format shows "Check the meter account format: 12 digits, e.g. 100200300400".
  - **BILL-002-AC2** Reference ending `999` (demo) shows "AquaGrid Utilities couldn't find this reference."

#### BILL-003 — Amount due inquiry
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer opens a saved inquiry-capable biller, THE SYSTEM SHALL show amount due, due date, bill period, masked account-holder name and "last updated" time, with Refresh.
- **Acceptance criteria:**
  - **BILL-003-AC1** Overdue bills show an "Overdue" warning tag.

#### BILL-004 — Pay a bill now
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer pays a bill, THE SYSTEM SHALL pre-fill the amount due, enforce the biller's payment rule (§2.1), check balance and daily limit, and execute via review → confirm → receipt with idempotency.
- **Acceptance criteria:**
  - **BILL-004-AC1** Editing the amount for FiberLink is not possible (read-only amount with explanation).
  - **BILL-004-AC2** The receipt shows biller confirmation number from the simulator.

#### BILL-005 — Prepaid top-up
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer tops up a prepaid line, THE SYSTEM SHALL offer only the fixed denominations as a `RadioTile` group and complete the payment as in BILL-004.
- **Acceptance criteria:**
  - **BILL-005-AC1** Mobile number can be entered ad hoc without saving, and "Save for next time" is offered on the receipt.

#### BILL-006 — Schedule and auto-pay
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer schedules a bill payment or sets up auto-pay (BR-BILL-04), THE SYSTEM SHALL create a scheduled order or standing order of kind BILL, show it in Upcoming payments, and on execution apply the same validations, notifying on success or failure.
- **Acceptance criteria:**
  - **BILL-006-AC1** Auto-pay "amount due" with a maximum of 400.00 and a bill of 523.00 → that execution is FAILED with `BILL_AMOUNT_NOT_ALLOWED`, reason "Amount due exceeds your auto-pay maximum", and the customer is notified; the auto-pay itself stays active.

#### BILL-007 — Bill payment history
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL list bill payments with biller, reference (masked), amount, date, status and confirmation number, filterable by biller and date.
- **Acceptance criteria:**
  - **BILL-007-AC1** Each row links to its receipt (PDF available).

#### BILL-008 — Biller unavailable
- **Priority:** P2 · **Type:** Unwanted behaviour
- **EARS:** IF the biller network is unavailable, THEN THE SYSTEM SHALL show `BILLER_UNAVAILABLE` messaging for inquiry and payment while leaving the rest of the app usable, and SHALL NOT debit the customer.
- **Acceptance criteria:**
  - **BILL-008-AC1** With fault toggle on, pay attempt yields no hold/posting and a friendly error with retry.

#### BILL-009 — Remove saved biller
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer removes a saved biller, THE SYSTEM SHALL confirm and cancel any scheduled payments and auto-pay for it.
- **Acceptance criteria:**
  - **BILL-009-AC1** Upcoming payments no longer lists the cancelled auto-pay.

## 4. UI specification
| Route | Screen |
|---|---|
| `/payments` | Payments hub: Saved billers (cards with amount due), Pay a new bill, Top up, tabs History · Scheduled |
| `/payments/billers` | Biller catalogue (search + categories) |
| `/payments/billers/:billerId/save` | Save biller form |
| `/payments/saved/:savedBillerId` | Saved biller detail with inquiry + Pay / Schedule / Auto-pay / Remove |
| `/payments/pay?savedBillerId=` | Pay wizard (amount → when → review → receipt) |
| `/payments/top-up` | Top-up wizard |

## 5. API operations
`listBillers`, `getBiller`, `listSavedBillers`, `createSavedBiller`, `deleteSavedBiller`,
`inquireSavedBiller`, `createBillPayment`, `listBillPayments`, `getBillPayment`.

## 6. Test plan
Unit: per-biller payment rules; Integration: inquiry cache, demo markers, limits sharing
with transfers; E2E: J7 (inquiry → pay → schedule auto-pay).
