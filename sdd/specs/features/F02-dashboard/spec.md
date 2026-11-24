---
id: F02
title: Dashboard
status: Approved
version: 1.0.0
priority: P1
phase: 2
depends-on: [F00, F01, F03]
skills: [carbon-ui, domain-rules]
requirement-prefix: DASH
contract-tags: [dashboard, insights]
---

# F02 — Dashboard

## 1. Summary
The landing page after sign-in. In under 5 seconds a customer sees what they have, what
changed, what's coming up, and what needs attention — and can start the most common tasks
in one click.

## 2. User stories
| ID | As a… | I want… | so that… |
|---|---|---|---|
| US-DASH-1 | Sara | to see all my balances at a glance | I know where I stand before paying rent |
| US-DASH-2 | Sara | to hide balances with one click | I can open the app in a meeting |
| US-DASH-3 | Daniel | to see upcoming scheduled transfers | I don't double-pay |
| US-DASH-4 | Omar | a calm, simple page with large figures | I'm not overwhelmed |

## 3. Layout (lg+, 16-col grid; stacks on sm)
```
┌ h1 "Good morning, Sara" ───────────────────────────── [Hide balances ◉] ┐
│ Last sign-in: Yesterday 21:14 · Chrome on macOS · Not you? Secure account │
├─────────────── Accounts (cols 1–11) ──────────────┬─ Quick actions (12–16) ┤
│ [Current AED ••4821  Available AED 34,502.50]      │ ⇄ Transfer            │
│ [Savings AED ••7710  Available AED 120,000.00]     │ 🧾 Pay a bill         │
│ [USD Current ••0932  Available USD 2,150.75]       │ 💳 Cards              │
│ [Credit card ••1234  Owed AED 3,124.00 · due 5 Dec] │ 📄 Statements         │
│ Totals: AED 154,502.50 · USD 2,150.75  (ⓘ est.)    │                       │
├──────── Recent activity (1–11) ───────────────────┼─ Needs attention ──────┤
│ Today  Coffee House      −AED 17.50  Current       │ 🔒 New sign-in (Mac)  │
│ ...5 rows · View all                               │ ⚠ Card ••1234 due 5 Dec│
├──────── Spending this month (1–8) ───┬─ Upcoming (9–16) ───────────────────┤
│ Donut by category + vs last month    │ 20 Nov Rent → Landlord AED 4,500.00  │
│ [View as table]                      │ 25 Nov Electricity (scheduled)      │
└──────────────────────────────────────┴─────────────────────────────────────┘
```

## 4. Functional requirements

#### DASH-001 — Personalised greeting and last sign-in
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL show a time-of-day greeting in the customer's time zone using their preferred name, and the previous successful sign-in time, browser/OS and approximate location with a "Not you? Secure your account" link to Settings › Security.
- **Acceptance criteria:**
  - **DASH-001-AC1** At 08:00 local the heading reads "Good morning, Sara" (en) / "صباح الخير، سارة" (ar).

#### DASH-002 — Account tiles
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL display one tile per ACTIVE/FROZEN/DORMANT account ordered Current → Savings → Credit card → Term deposit → Loan, each showing nickname or product name, masked number, and the primary figure (available balance for deposits; amount owed and due date for credit cards; outstanding principal for loans; principal and maturity for term deposits), linking to the account detail.
- **Acceptance criteria:**
  - **DASH-002-AC1** A FROZEN account tile shows a "Frozen" tag and its balance, and its quick "Transfer from" action is absent.
  - **DASH-002-AC2** Hover/focus on a tile prefetches account detail (NFR-PERF-004).

#### DASH-003 — Totals per currency
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL show total available balance of deposit accounts per currency and SHALL NOT sum different currencies, except an optional "Estimated total in AED" figure computed at current mid rates labelled as an estimate with rate timestamp.
- **Acceptance criteria:**
  - **DASH-003-AC1** Sara sees `AED 154,502.50` and `USD 2,150.75` separately; the estimate Toggletip shows "Based on mid-market rates at 09:41. For information only."
  - **DASH-003-AC2** If FX is unavailable, the estimate is hidden and other totals still show.

#### DASH-004 — Hide balances
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN the customer toggles "Hide balances", THE SYSTEM SHALL replace every monetary figure on all pages with `••••` (accessible name "Balance hidden") until toggled off, persisting the choice in preferences.
- **Acceptance criteria:**
  - **DASH-004-AC1** With balances hidden, transaction amounts in Recent activity are also hidden; the toggle state survives sign-out/sign-in.

#### DASH-005 — Recent activity
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL show the 5 most recent transactions across all accounts (pending first, then posted by booking time) with date, merchant/description, amount, account label and a "View all" link to the most relevant account's history.
- **Acceptance criteria:**
  - **DASH-005-AC1** Selecting a row opens the transaction detail panel (F03 ACCT-012) in place.

#### DASH-006 — Upcoming payments
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL list scheduled transfers, standing-order executions, scheduled bill payments and credit-card due dates in the next 30 days, sorted by date, with amount, payee and a link to manage each.
- **Acceptance criteria:**
  - **DASH-006-AC1** A monthly standing order shows only its next occurrence within the window.
  - **DASH-006-AC2** Empty state: "Nothing scheduled in the next 30 days." with "Schedule a transfer" link.

#### DASH-007 — Quick actions
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide quick actions Transfer, Pay a bill, Cards, Statements, each navigating to the start of its journey; actions for features not yet delivered SHALL be hidden (feature flags).
- **Acceptance criteria:**
  - **DASH-007-AC1** Quick actions are buttons with icon + text; order mirrors in RTL.

#### DASH-008 — Spending insights
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL show this calendar month's card and transfer debits from current accounts grouped by category (top 6 + "Other") as a donut chart with the comparison to the same period last month, plus a data-table alternative.
- **Acceptance criteria:**
  - **DASH-008-AC1** Changing a transaction's category (ACCT-013) updates the chart on next load.
  - **DASH-008-AC2** Transfers between own accounts are excluded.

#### DASH-009 — Needs attention
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL show up to 3 prioritised items: unread security notifications, credit-card payment due within 7 days, payments held for review or failed in the last 7 days, cards pending activation, beneficiaries in cooling-off.
- **Acceptance criteria:**
  - **DASH-009-AC1** A failed transfer appears with "Transfer to Ahmad Saleh failed — View details".

#### DASH-010 — Independent widget states
- **Priority:** P1 · **Type:** Unwanted behaviour
- **EARS:** IF any dashboard widget's data fails to load, THEN THE SYSTEM SHALL show an inline error with Retry within that widget while other widgets render normally.
- **Acceptance criteria:**
  - **DASH-010-AC1** With insights endpoint returning 503 (fault toggle), account tiles still render and the insights widget shows "We couldn't load this right now. Retry".

#### DASH-011 — Live updates
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN a `balance.changed` or `payment.status_changed` SSE event arrives, THE SYSTEM SHALL refresh the affected tiles and lists without a page reload and announce significant changes politely ("Balance updated").
- **Acceptance criteria:**
  - **DASH-011-AC1** Completing a transfer in another tab updates the dashboard balance within 3 s.

#### DASH-012 — New-customer state
- **Priority:** P1 · **Type:** State-driven
- **EARS:** WHILE a customer has fewer than 3 posted transactions, THE SYSTEM SHALL show a friendly getting-started panel (set up alerts, add a payee, download app-less statements) instead of insights.
- **Acceptance criteria:**
  - **DASH-012-AC1** Omar's seeded profile shows the panel.

#### DASH-013 — Global search
- **Priority:** P2 · **Type:** Event-driven
- **EARS:** WHEN the customer presses ⌘K / Ctrl+K or activates the header search, THE SYSTEM SHALL open a search dialog returning accounts, beneficiaries, transactions (by description or reference, last 12 months) and settings pages, keyboard-navigable, with results grouped by type.
- **Acceptance criteria:**
  - **DASH-013-AC1** Typing a transfer reference `HB261118-7KQ2MX` returns that transaction as the first result.

## 5. API operations
`getDashboardSummary` (accounts, totals, recent, upcoming, attention, lastLogin — single
round trip, each section with its own `status: OK|UNAVAILABLE`), `getSpendingInsights`,
`search` (P2).

## 6. Edge cases
- Customer with only a credit card → totals section hidden; tile shows owed amount.
- Dormant account → tile with "Dormant — contact us to reactivate" Toggletip.
- Very long nicknames (40 chars) ellipsize with tooltip.

## 7. Test plan
Component tests per widget state (loading/empty/error/data); E2E J2 dashboard assertions;
SSE update test; hide-balances persistence test; a11y on dashboard in both locales.
