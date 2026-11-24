---
id: F03
title: Accounts and Transaction History
status: Approved
version: 1.0.0
priority: P1
phase: 2
depends-on: [F00, F01, SPEC-03]
skills: [carbon-ui, domain-rules]
requirement-prefix: ACCT
contract-tags: [accounts, transactions]
---

# F03 — Accounts and Transaction History

## 1. Summary
Customers view each account's balances and identifiers and explore its transaction history
with fast search, filters, details, categories and exports. Product-specific panels cover
savings, credit cards, term deposits and loans (read-only).

## 2. User stories
| ID | As a… | I want… | so that… |
|---|---|---|---|
| US-ACCT-1 | Sara | to find "the Lulu groceries payment last week" in seconds | I can check the amount |
| US-ACCT-2 | Daniel | to copy my IBAN and BIC correctly | my employer can pay me |
| US-ACCT-3 | Sara | to understand why available ≠ current balance | I trust the numbers |
| US-ACCT-4 | Daniel | to export 3 months of transactions to CSV | I can do my budget |

## 3. Business rules
| ID | Rule |
|---|---|
| BR-ACCT-01 | Available = ledger − active holds + overdraft limit (SPEC-03 LGR-INV-4). Credit card: available credit = limit − owed − holds. |
| BR-ACCT-02 | Pending = active holds (card authorisations, in-flight payments). Pending items show no running balance. |
| BR-ACCT-03 | History available for 24 months; default view last 90 days. |
| BR-ACCT-04 | Search `q` matches description, merchant name, counterparty name, reference (case- and diacritic-insensitive, Arabic normalisation of alef/ya/ta-marbuta forms). |
| BR-ACCT-05 | Export: CSV (UTF-8 with BOM, RFC 4180) or PDF; max range 12 months; max 5,000 rows. |
| BR-ACCT-06 | Categories (fixed set): GROCERIES, DINING, TRANSPORT, SHOPPING, BILLS_UTILITIES, HEALTH, ENTERTAINMENT, TRAVEL, EDUCATION, TRANSFERS, CASH, INCOME, FEES, OTHER. |
| BR-ACCT-07 | Nickname: 1–40 chars, letters/digits/spaces/basic punctuation, emoji not allowed. |

## 4. Functional requirements

### 4.1 Accounts
#### ACCT-001 — Accounts list
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL list the customer's accounts grouped by type (Current & savings, Cards, Deposits & loans) with name, masked number, currency, status tag (non-active only) and primary balance, plus per-group subtotal per currency.
- **Acceptance criteria:**
  - **ACCT-001-AC1** Sara sees 5 accounts in 3 groups; CLOSED accounts are excluded unless "Show closed accounts" is toggled.

#### ACCT-002 — Balance breakdown
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL show on account detail: available balance (prominent), current (ledger) balance, pending/holds total, overdraft limit (if any), with a "What's the difference?" Toggletip explaining each.
- **Acceptance criteria:**
  - **ACCT-002-AC1** With a 150.00 card hold, available = current − 150.00 and the holds line reads "Pending: −AED 150.00 (1 item)".

#### ACCT-003 — Account identifiers
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the customer selects "Show details", THE SYSTEM SHALL reveal the full account number, IBAN (grouped in 4s, LTR-isolated) and BIC with Copy buttons and a "Copy all details" action producing a formatted text block (account holder, IBAN, BIC, bank name).
- **Acceptance criteria:**
  - **ACCT-003-AC1** Copied IBAN contains no spaces; displayed IBAN has spaces every 4 characters.
  - **ACCT-003-AC2** Identifiers are masked by default on every page load and re-masked when the customer navigates away (reveal is low-risk and not audited).

#### ACCT-004 — Nickname
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer edits an account nickname (BR-ACCT-07), THE SYSTEM SHALL save it with optimistic concurrency and show it everywhere the account appears.
- **Acceptance criteria:**
  - **ACCT-004-AC1** Clearing the nickname reverts to the product name.

#### ACCT-005 — Product panels
- **Priority:** P1 · **Type:** State-driven
- **EARS:** WHILE viewing an account, THE SYSTEM SHALL show the panel for its type: SAVINGS (interest rate p.a., interest paid YTD, last interest date); CREDIT_CARD (credit limit, owed, available credit, last statement balance, minimum due, due date, "Pay card" button); TERM_DEPOSIT (principal, rate, start, maturity date, maturity instruction, projected interest); LOAN (original amount, outstanding principal, next instalment amount/date, remaining instalments).
- **Acceptance criteria:**
  - **ACCT-005-AC1** "Pay card" opens the own-account transfer wizard (XFER-001) pre-filled with the credit card as destination and options: Minimum due / Statement balance / Other amount.

### 4.2 Transactions
#### ACCT-010 — History list
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL show a "Pending" section (holds) above posted transactions grouped by booking date, with columns: date, description/merchant (with category icon), reference (lg+), amount (signed), running balance (posted only, lg+).
- **Acceptance criteria:**
  - **ACCT-010-AC1** Running balance on the newest posted row equals the ledger balance.
  - **ACCT-010-AC2** On `sm`, rows collapse to two-line list items with amount on the trailing side.

#### ACCT-011 — Search, filter and sort
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the customer applies search text (BR-ACCT-04), date range (presets: 7 d, 30 d, 90 d, This month, Last month, Custom ≤ 24 months), direction (money in/out), amount range, categories or status, THE SYSTEM SHALL return matching transactions sorted by date (default, newest first) or amount, show active filters as dismissible tags with a "Clear all" action, and reflect state in the URL query string.
- **Acceptance criteria:**
  - **ACCT-011-AC1** Searching "lulu" returns "LULU HYPERMARKET" rows; Arabic "لولو" also matches merchant aliases where seeded.
  - **ACCT-011-AC2** Reloading the URL restores identical filters and results.
  - **ACCT-011-AC3** No results → "No transactions match these filters." with "Clear filters".

#### ACCT-012 — Transaction detail
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN a transaction is selected, THE SYSTEM SHALL open a side panel (full page on `sm`) showing: amount, status, description, merchant/counterparty, category (editable), booking and value dates with time, reference, channel (Card/Transfer/Bill/Fee/Interest), card last 4 (card txns), original amount and FX rate (foreign txns), fees, and actions: Copy reference, Download receipt (payments), Repeat transfer (outgoing transfers), Report a problem.
- **Acceptance criteria:**
  - **ACCT-012-AC1** A USD card purchase on a AED account shows "Original amount USD 45.00 · Rate 1 USD = 3.6909 AED · Fee AED 2.50".
  - **ACCT-012-AC2** Panel is a focus-trapped `aria-modal` dialog on `sm` and a non-modal region on `lg+`; Esc closes and focus returns to the row.

#### ACCT-013 — Re-categorise
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer changes a transaction's category, THE SYSTEM SHALL save it for that transaction only and reflect it in insights (DASH-008).
- **Acceptance criteria:**
  - **ACCT-013-AC1** The change is audited `TRANSACTION_CATEGORY_CHANGED` and visible after reload.

#### ACCT-014 — Pagination
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL load 25 transactions per page with a "Load more" button (not infinite scroll, for keyboard and screen-reader users) and announce "25 more transactions loaded".
- **Acceptance criteria:**
  - **ACCT-014-AC1** Cursor pagination returns no duplicates or gaps when a new transaction posts between page loads.

#### ACCT-015 — Export
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer exports with current filters, THE SYSTEM SHALL generate CSV or PDF per BR-ACCT-05 with header rows (account, IBAN masked, period, generated at, opening/closing balance for unfiltered exports).
- **Acceptance criteria:**
  - **ACCT-015-AC1** CSV columns: `booking_date,value_date,description,reference,category,debit,credit,currency,running_balance`; amounts use `.` decimal with exact exponent; opens correctly in Excel (BOM).
  - **ACCT-015-AC2** Range > 12 months → `422 STATEMENT_RANGE_INVALID` mapped to inline error before request where possible.

#### ACCT-016 — Report a problem
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN the customer selects "Report a problem" on a transaction, THE SYSTEM SHALL start a secure message (F10) of category "Dispute a transaction" pre-filled with the transaction reference, date and amount.
- **Acceptance criteria:**
  - **ACCT-016-AC1** See MSG-005.

## 5. UI specification
| Route | Screen |
|---|---|
| `/accounts` | Accounts list (List template) |
| `/accounts/:accountId` | Account detail: header (name, masked no., balances, actions: Transfer, Statements, Show details), Tabs: **Transactions** (default) · **Details** · **Statements** (links F07) |
| `/accounts/:accountId?txn=:transactionId` | Opens transaction panel (deep-linkable) |

Toolbar: Search (debounced 300 ms, min 2 chars), Filters button opening a `Popover`
(lg) / full-screen `Modal` (sm), Sort `Dropdown`, Export `OverflowMenu` (CSV, PDF).

## 6. API operations
`listAccounts`, `getAccount`, `updateAccount`, `listTransactions`, `getTransaction`,
`updateTransaction`, `exportTransactions`.

## 7. Data
Read model `transactions_view` (materialised by ledger on posting): id, accountId,
journalId, bookedAt, valueDate, direction, amountMinor, currency, description, merchantName,
merchantCategoryCode, category, counterpartyName, reference, channel, cardLast4, original
amount/currency, fxRate, feeMinor, status (PENDING/POSTED), runningBalanceMinor, search
vector (`tsvector` simple config + `pg_trgm`).

## 8. Edge cases
- Holds that expire disappear from Pending without a posted counterpart (card auth expired).
- A posted card transaction that settles at a different amount than its hold → hold released,
  posting at final amount, detail shows "Final amount differs from authorised amount".
- Transactions at exactly midnight local appear under the local business date.

## 9. Test plan
Integration: filter combinations matrix, cursor stability, Arabic normalisation, export
formats, IDOR matrix. E2E: J2 search flow, export download assertion, panel keyboard flow.
Perf: NFR-PERF-002.
