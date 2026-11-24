---
id: F04
title: Transfers, Beneficiaries, Standing Orders and Limits
status: Approved
version: 1.0.0
priority: P1 (international = P2)
phase: 3
depends-on: [F00, F01, F03, SPEC-03, ADR-0003, ADR-0005, ADR-0007]
skills: [domain-rules, carbon-ui, security-review]
requirement-prefix: XFER
contract-tags: [beneficiaries, transfers, fx, standing-orders, limits, reference]
---

# F04 — Transfers, Beneficiaries, Standing Orders and Limits

## 1. Summary
The money-movement heart of the prototype. Customers move money between their own
accounts (incl. FX), pay saved beneficiaries at Tidewell, other local banks and abroad, schedule
one-off and recurring payments, and see exactly what will happen — fees, rate, dates —
before confirming. Every order is idempotent, limit-checked, fraud-screened, ledger-posted
and fully traceable.

## 2. User stories
| ID | As a… | I want… | so that… |
|---|---|---|---|
| US-XFER-1 | Sara | to move AED to my USD account and see the exact rate first | I'm not surprised by FX |
| US-XFER-2 | Sara | to pay my landlord monthly automatically | rent is never late |
| US-XFER-3 | Daniel | to send EUR to my sister with known fees and arrival date | she gets what I intend |
| US-XFER-4 | Sara | a receipt with a reference | I can prove I paid |
| US-XFER-5 | any customer | protection when adding new payees | fraudsters can't drain my account |

## 3. Business rules
### 3.1 Transfer kinds
| Kind | Destination | Currency | Execution | Value date | Fee |
|---|---|---|---|---|---|
| OWN | another own account | any supported (FX if different) | instant, 24/7 | today | 0 |
| INTERNAL | Tidewell customer (saved beneficiary) | account currency of beneficiary must equal debit currency or FX applies | instant, 24/7 | today | 0 |
| DOMESTIC | other bank in `HOME_COUNTRY` (AE IBAN) | AED only | business days; cut-off **14:00** local | execution date | 0 |
| INTERNATIONAL (P2) | foreign bank (IBAN or acct + BIC) | USD, EUR, GBP, KWD, SAR, BHD, JPY | business days; cut-off **13:00** local | execution + 2 business days (GCC currencies AED/SAR/BHD: +1) | SHA 35.00 AED · OUR 70.00 AED · BEN 0 |

### 3.2 Limits (AED-equivalent at mid rate; configurable in seed `limit_profiles`)
| ID | Limit | Default |
|---|---|---|
| BR-XFER-L1 | Per-transaction max (external = INTERNAL/DOMESTIC/INTERNATIONAL) | 100,000.00 |
| BR-XFER-L2 | Daily external total (business date, all channels incl. scheduled executing today, bills) | 50,000.00 |
| BR-XFER-L3 | New beneficiary (first 24 h) daily total to that beneficiary | 5,000.00 |
| BR-XFER-L4 | Customer-chosen daily limit | between 1,000.00 and BR-XFER-L2; lowering instant; raising needs step-up `LIMITS_INCREASE` |
| BR-XFER-L5 | Own-account transfers | not limited (balance only) |
| BR-XFER-L6 | Max beneficiaries per customer | 200 |

### 3.3 Other rules
| ID | Rule |
|---|---|
| BR-XFER-01 | Step-up required per F01 §3 (≥ 10,000.00 AED-eq external, cooling-off beneficiary, any international, adding beneficiaries). |
| BR-XFER-02 | FX quote valid 30 s; margin 0.50 %; review step shows countdown and "Refresh rate" after expiry (NFR-A11Y-004). |
| BR-XFER-03 | Customer reference: ≤ 35 chars; DOMESTIC/INTERNAL allow Unicode letters incl. Arabic; INTERNATIONAL restricted to SWIFT X charset `[A-Za-z0-9/\-?:().,'+ ]` with hint to transliterate. |
| BR-XFER-04 | Scheduled date: next business day … +365 days; for OWN/INTERNAL any calendar day. |
| BR-XFER-05 | Standing orders: WEEKLY, MONTHLY (day 1–28 or "last business day"), QUARTERLY; optional end date or number of payments (1–120); execution on non-business day moves to next business day. |
| BR-XFER-06 | Cancel: SCHEDULED orders cancellable until 00:05 local on execution date; PROCESSING orders not cancellable. |
| BR-XFER-07 | Beneficiary account details are immutable after creation (nickname/favourite editable). To change details: delete and add again. |
| BR-XFER-08 | Purpose codes (international): FAMILY_SUPPORT, SALARY, EDUCATION, MEDICAL, RENT, GOODS_PURCHASE, SERVICES, INVESTMENT, LOAN_REPAYMENT, GIFT, TRAVEL, OTHER (+ free text ≤ 35). |
| BR-XFER-09 | Bank lookup: domestic bank name derived from IBAN bank code via seeded `domestic_banks`; international bank derived from BIC via seeded `bic_directory` (fictional). |

## 4. Functional requirements

### 4.1 Own-account transfers
#### XFER-001 — Transfer between own accounts
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the customer transfers between two of their own ACTIVE accounts in the same currency, THE SYSTEM SHALL validate available balance, post a balanced journal (SPEC-03 §5.5) instantly, and show a receipt.
- **Acceptance criteria:**
  - **XFER-001-AC1** Sara moves AED 2,000.00 Current → Savings; both balances update on the receipt and dashboard; status COMPLETED.
  - **XFER-001-AC2** Choosing the same account for From and To is prevented in the UI (destination list excludes source) and rejected by API `SAME_ACCOUNT`.

#### XFER-002 — Own-account FX transfer
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN source and destination currencies differ, THE SYSTEM SHALL obtain an FX quote (BR-XFER-02), let the customer enter either the amount to send or the amount to receive, show the customer rate, inverse rate and both amounts, and execute only with an unexpired quote.
- **Acceptance criteria:**
  - **XFER-002-AC1** Entering "receive USD 100.00" computes and displays the AED debit using the quote; editing the receive amount re-quotes after 400 ms debounce.
  - **XFER-002-AC2** Confirming 31 s after quoting returns `FX_QUOTE_EXPIRED`; the review step shows the refreshed amounts and requires a second confirm.
  - **XFER-002-AC3** Ledger shows four postings across two currencies, each currency balanced (LGR-INV-1).

#### XFER-003 — Credit card repayment
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the destination is the customer's credit card account, THE SYSTEM SHALL offer amount options Minimum due, Statement balance, Full owed, Other, and SHALL reject amounts above the owed balance.
- **Acceptance criteria:**
  - **XFER-003-AC1** Paying "Statement balance" reduces owed by that amount and clears the "due" attention item if fully paid.

### 4.2 Beneficiaries
#### XFER-010 — Beneficiary list
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL list saved beneficiaries with avatar initials, display name/nickname, type tag, masked account, bank name, cooling-off indicator, favourite star, and search by name/nickname/bank, favourites first then alphabetical (locale-aware collation).
- **Acceptance criteria:**
  - **XFER-010-AC1** Searching "sal" matches "Ahmad Saleh" and nickname "Salma".

#### XFER-011 — Add internal beneficiary
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the customer adds a Tidewell beneficiary by IBAN or account number, THE SYSTEM SHALL validate it exists and is ACTIVE, run name check against the entered holder name, and save after step-up `BENEFICIARY_CREATE`.
- **Acceptance criteria:**
  - **XFER-011-AC1** Entering one of the customer's own accounts shows "This is your own account — use 'Between my accounts'".

#### XFER-012 — Add domestic beneficiary
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the customer enters a `HOME_COUNTRY` IBAN of another bank, THE SYSTEM SHALL validate it (FND-010), auto-fill the bank name from the IBAN bank code, perform name check (XFER-014), and save after step-up.
- **Acceptance criteria:**
  - **XFER-012-AC1** IBAN typed with spaces/lowercase is normalised; invalid checksum shows "This IBAN doesn't look right" inline on blur.
  - **XFER-012-AC2** Unknown bank code → "We don't recognise this bank" (blocking).

#### XFER-013 — Add international beneficiary
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer adds an international beneficiary, THE SYSTEM SHALL collect country, currency, account identifier (IBAN for IBAN countries, else account number 4–34 alphanumerics), BIC (validated and looked up to show bank name/city), beneficiary full name and address (street, city, country — SWIFT charset), and save after step-up.
- **Acceptance criteria:**
  - **XFER-013-AC1** Selecting Germany requires an IBAN (22 chars); selecting United States requires account number + BIC and hides IBAN.
  - **XFER-013-AC2** A non-SWIFT character in the name shows "Use English letters, numbers and basic punctuation for international payments".

#### XFER-014 — Confirmation of payee (simulated)
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN name check returns MATCH, CLOSE_MATCH, NO_MATCH or UNAVAILABLE, THE SYSTEM SHALL respectively: show a success tag; show the suggested name with "Use this name" / "Keep what I entered"; show a warning requiring an explicit "I understand the risk" checkbox; show an info notice that the name couldn't be checked.
- **Acceptance criteria:**
  - **XFER-014-AC1** Entering "Ahmed Saleh" for account held by "Ahmad Saleh" returns CLOSE_MATCH with suggestion.
  - **XFER-014-AC2** The CoP result and the customer's decision are stored on the beneficiary and shown on the transfer review step.

#### XFER-015 — Cooling-off for new beneficiaries
- **Priority:** P1 · **Type:** State-driven
- **EARS:** WHILE a beneficiary is less than 24 h old, THE SYSTEM SHALL apply BR-XFER-L3, show a "New payee" tag with the time cooling-off ends, and require step-up for any transfer to it; WHEN a beneficiary is added, THE SYSTEM SHALL send a mandatory security notification.
- **Acceptance criteria:**
  - **XFER-015-AC1** A 6,000.00 transfer to a 1-hour-old beneficiary → `LIMIT_EXCEEDED_NEW_BENEFICIARY` with remaining 5,000.00.

#### XFER-016 — Manage beneficiary
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer edits a beneficiary, THE SYSTEM SHALL allow changes to nickname and favourite only (BR-XFER-07); WHEN deleting, THE SYSTEM SHALL list any scheduled/standing orders to that beneficiary and cancel them as part of a confirmed deletion.
- **Acceptance criteria:**
  - **XFER-016-AC1** Delete modal reads "Deleting Ahmad Saleh will also cancel 1 standing order (Rent, monthly AED 4,500.00)."

#### XFER-017 — Duplicate prevention
- **Priority:** P2 · **Type:** Unwanted behaviour
- **EARS:** IF the customer adds a beneficiary whose normalised account identifier already exists in their list, THEN THE SYSTEM SHALL reject with `BENEFICIARY_DUPLICATE` naming the existing entry.
- **Acceptance criteria:**
  - **XFER-017-AC1** Same IBAN with different spacing is detected as duplicate.

### 4.3 Making a transfer
#### XFER-020 — Transfer wizard
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL guide transfers through steps **1 Who & how much** (from account with available balance; to: own account / beneficiary picker / "+ New payee"; amount with currency; quick amounts not provided), **2 When & details** (now / on a date / repeat; reference; purpose & charges for international), **3 Review**, then **Receipt**, preserving entered data when moving back.
- **Acceptance criteria:**
  - **XFER-020-AC1** Back from Review to step 1 keeps all values; changing amount invalidates the quote and any step-up token.
  - **XFER-020-AC2** Leaving the wizard with unsaved input prompts "Discard this transfer?".

#### XFER-021 — Limits enforcement
- **Priority:** P1 · **Type:** Unwanted behaviour
- **EARS:** IF an external transfer would exceed BR-XFER-L1, L2 (or the lower customer-chosen limit) or L3, THEN THE SYSTEM SHALL reject it at quote time and again at submission with the specific limit code and remaining amount.
- **Acceptance criteria:**
  - **XFER-021-AC1** With 48,000.00 already sent today, a 3,000.00 domestic transfer shows "This would exceed your daily transfer limit of AED 50,000.00. Remaining today: AED 2,000.00."
  - **XFER-021-AC2** Scheduled transfers are checked against the limit of their execution date at execution time; failure → FAILED with `LIMIT_EXCEEDED_DAILY` and notification.

#### XFER-022 — Cut-off and dates
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL compute and display execution date and value date per §3.1 and the business calendar, and SHALL show a cut-off notice when today's cut-off has passed or today is not a business day.
- **Acceptance criteria:**
  - **XFER-022-AC1** Domestic submitted Friday 20 Nov 2026 at 14:05 local → review shows "Sent on Mon 23 Nov · Arrives Mon 23 Nov" and notice "Today's cut-off (14:00) has passed."

#### XFER-023 — Future-dated transfer
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the customer chooses "On a date" (BR-XFER-04), THE SYSTEM SHALL create a SCHEDULED order without placing a hold, and on the execution date the job SHALL re-validate balance and limits then process or fail it with a notification.
- **Acceptance criteria:**
  - **XFER-023-AC1** Using `/dev/clock` to advance to execution date and `/dev/jobs/run scheduled-transfers.release`, the order becomes PROCESSING then COMPLETED.

#### XFER-024 — Standing orders
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer chooses "Repeat", THE SYSTEM SHALL create a standing order (BR-XFER-05), show the next 3 execution dates on review, and list it under Transfers › Standing orders with next date, frequency, amount and remaining payments.
- **Acceptance criteria:**
  - **XFER-024-AC1** Monthly on the 30th is not offered; "Last business day" option is.
  - **XFER-024-AC2** Each execution creates a normal PaymentOrder linked by `standingOrderId`.

#### XFER-025 — Review step
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL show on review: from (name, masked, available after transfer), to (name, masked, bank, CoP result), amount sent, FX rate with live expiry countdown (if any), fees and who pays them, total debited, amount beneficiary receives (or "may be reduced by intermediary charges" for SHA/BEN), execution and value dates, frequency, reference, purpose; plus a "Confirm and send" primary button whose label includes the total ("Send AED 2,035.00").
- **Acceptance criteria:**
  - **XFER-025-AC1** Values on review equal the server quote exactly (no client-side money math other than formatting).

#### XFER-026 — Submission
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the customer confirms, THE SYSTEM SHALL submit with the review's `Idempotency-Key` (ADR-0005), perform step-up if required (AUTH-040), re-run validations, fraud rules (NFR-SEC-050), place holds, and return the created order; the confirm button SHALL be disabled with an inline loading state until a response arrives.
- **Acceptance criteria:**
  - **XFER-026-AC1** Double-clicking confirm creates exactly one order (E2E + NFR-REL-003).
  - **XFER-026-AC2** A network error after submit shows "We're checking whether your transfer went through…" and retries with the same key, then shows the true result.

#### XFER-027 — Receipt
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN an order is created, THE SYSTEM SHALL show a receipt page (status, reference with copy, all review details, created timestamp with zone) with actions Download PDF (in the customer's preferred language), Make another transfer, Go to dashboard.
- **Acceptance criteria:**
  - **XFER-027-AC1** PDF contains bank name "Tidewell Bank (demo)", reference, masked accounts, amounts, fees, FX, dates, and a "This is a demo document" watermark.

#### XFER-028 — Status tracking
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN an order changes status, THE SYSTEM SHALL update the receipt/detail views live (SSE), add an event to the order timeline (created, held, processing, completed/failed with reason) and notify the customer for COMPLETED (external only), FAILED, RETURNED, HELD_FOR_REVIEW and REJECTED.
- **Acceptance criteria:**
  - **XFER-028-AC1** Domestic receipt shows Processing then changes to Completed within ~6 s without reload.

#### XFER-029 — Transfer history
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL list the customer's transfers (all kinds) with filters (status, kind, date range, beneficiary) and tabs **History** · **Scheduled** · **Standing orders**, each row opening the transfer detail with timeline.
- **Acceptance criteria:**
  - **XFER-029-AC1** Scheduled tab shows only SCHEDULED one-offs ordered by execution date.

#### XFER-030 — Cancel
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the customer cancels a scheduled order or a standing order (BR-XFER-06), THE SYSTEM SHALL confirm in a danger modal, cancel it, audit, and remove it from upcoming payments.
- **Acceptance criteria:**
  - **XFER-030-AC1** Cancelling a PROCESSING order is not offered; API returns `409 CONFLICT_STATE` if attempted.

#### XFER-031 — Repeat transfer
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer selects "Repeat" on a past transfer, THE SYSTEM SHALL open the wizard pre-filled (from, to, amount, reference) at step 1, with a new idempotency key and fresh quote.
- **Acceptance criteria:**
  - **XFER-031-AC1** Repeating a transfer to a deleted beneficiary shows "This payee is no longer saved".

#### XFER-032 — International transfer specifics
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN sending internationally, THE SYSTEM SHALL require purpose (BR-XFER-08), charge bearer choice (SHA default, explained in plain language), apply FX when debit currency ≠ transfer currency, post fee to `GL-FEE-INCOME-AED` (converted if debit account is not AED), and settle via the SWIFT simulator.
- **Acceptance criteria:**
  - **XFER-032-AC1** Choosing OUR shows fee AED 70.00 and "Your beneficiary receives the full amount".
  - **XFER-032-AC2** In demo mode, a customer reference containing `DEMO-REJECT` makes the SWIFT simulator reject the order (`INTERMEDIARY_BANK_REJECTED`, ADR-0007) → FAILED, hold released, notification sent.

#### XFER-033 — Held for review
- **Priority:** P2 · **Type:** State-driven
- **EARS:** WHILE an order is HELD_FOR_REVIEW, THE SYSTEM SHALL show "Under review — we're checking this payment to keep you safe. We'll update you within 1 business day." keep the hold in place, and reflect the ops decision (F11) when made.
- **Acceptance criteria:**
  - **XFER-033-AC1** A demo reference containing `DEMO-REVIEW` is held (FR-4) and appears in the ops queue.

#### XFER-034 — Failure and return handling
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the rail rejects an order, THE SYSTEM SHALL mark it FAILED with a customer-readable reason, release the hold, and notify; WHEN completed funds are returned, THE SYSTEM SHALL post a reversing journal, mark RETURNED and notify.
- **Acceptance criteria:**
  - **XFER-034-AC1** Domestic transfer with reference containing `DEMO-REJECT` → FAILED "The beneficiary's account is closed."; available balance restored.

#### XFER-035 — Limits management
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer views Transfers › Limits, THE SYSTEM SHALL show each limit, today's usage and remaining amount, and allow setting the customer-chosen daily limit (BR-XFER-L4).
- **Acceptance criteria:**
  - **XFER-035-AC1** Raising from 10,000.00 to 30,000.00 triggers step-up; lowering does not.

## 5. UI specification
| Route | Screen |
|---|---|
| `/transfers` | Hub: primary actions (Between my accounts, Pay someone, Send abroad), tabs History · Scheduled · Standing orders, link Limits |
| `/transfers/new?type=own\|beneficiary\|international&to=:id&from=:id` | Wizard (Wizard template) |
| `/transfers/:transferId` | Detail + timeline + actions (Download receipt, Repeat, Cancel) |
| `/transfers/:transferId/receipt` | Receipt |
| `/transfers/limits` | Limits |
| `/payees` | Beneficiaries list (shared with F05 saved billers under "Payments" nav) |
| `/payees/new?type=internal\|domestic\|international` | Add beneficiary wizard: details → name check → review → step-up → done |
| `/payees/:beneficiaryId` | Beneficiary detail (recent payments to them, Pay, Edit nickname, Delete) |

Amount input: Carbon `TextInput` with `inputmode="decimal"`, currency prefix, exponent-aware
validation, no spinner arrows; paste of "1,250.5" normalises to "12505.00" for AED.

## 6. API operations
`listBeneficiaries`, `createBeneficiary`, `getBeneficiary`, `updateBeneficiary`,
`deleteBeneficiary`, `checkBeneficiaryName`, `createFxQuote`, `quoteTransfer`,
`createTransfer`, `listTransfers`, `getTransfer`, `cancelTransfer`, `getTransferReceipt`,
`listStandingOrders`, `cancelStandingOrder`, `getLimits`, `updateLimits`,
`listPurposeCodes`, `lookupBank`, `listCurrencies`, `getBusinessCalendar`.

## 7. Data
`beneficiaries`, `payment_orders`, `payment_order_events`, `standing_orders`, `fx_quotes`,
`limit_profiles`, `limit_usage (customer_id, business_date, used_minor)`, `domestic_banks`,
`bic_directory`, `fraud_rule_hits`, `holds`, `journal_entries`, `postings`.

## 8. Edge cases
- Insufficient funds at scheduled execution → FAILED `INSUFFICIENT_FUNDS`, no retry, notify.
- Account becomes FROZEN between quote and submit → `ACCOUNT_NOT_ELIGIBLE`.
- Beneficiary deleted while wizard open → submission `NOT_FOUND` → friendly message + restart.
- FX feed down → FX transfers show "Currency exchange is temporarily unavailable"; same-currency transfers unaffected (NFR-REL-005).
- Holiday inserted in calendar after scheduling → execution moves to next business day; customer notified.
- Daylight-saving: none in Asia/Dubai, but calendar code must not assume this (tests with `Europe/Berlin` config).

## 9. Test plan
- Unit: limits engine, fee calculator, value-date calculator, SWIFT charset validator, quote math (property tests).
- Integration: each AC; concurrency (NFR-REL-002); idempotency (NFR-REL-003); ledger recipes; fraud rules; job-driven state transitions with fake clock.
- E2E: J3 (FX own transfer), J4 (add domestic payee + pay + receipt PDF), J5 (international, P2), double-submit, step-up cancel path, keyboard-only J3.
- Security: IDOR on beneficiaries/transfers; step-up token binding matrix.
