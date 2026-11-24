---
id: SPEC-01
title: Product Vision, Personas and Scope
status: Approved
version: 1.0.0
depends-on: [SPEC-00]
---

# 01 — Product Vision, Personas and Scope

## 1. Vision statement
*For* retail customers of Tidewell Bank *who* want to manage everyday money safely from a
browser, *the* Tidewell Online Banking prototype *is* a secure, accessible, bilingual
web application *that* lets them see every account, move money with confidence, control
their cards and get help — *unlike* legacy portals that feel slow, confusing and
untrustworthy, *our prototype* demonstrates bank-grade UX, security and correctness
end-to-end.

## 2. Goals and success metrics (for the prototype)
| Goal | Metric | Target |
|---|---|---|
| Stakeholders can demo every core journey without hand-waving | Scripted demo (`sdd/design/user-flows.md` §Demo script) completes | 100 % of steps |
| Correctness of money movement | Ledger invariant checks (`pnpm verify`) | 0 violations |
| Professional UX | Heuristic review score (Nielsen 10) by 2 reviewers | ≥ 4/5 average |
| Accessibility | axe-core serious/critical violations on all routes | 0 |
| Performance | p95 API latency on seed data; LCP on dashboard | < 300 ms; < 2.5 s |
| Security posture | Open High/Critical findings in `sdd/reports/security/` | 0 at final gate |

## 3. Personas

### P1 — Sara Haddad, "the busy professional" (primary)
- 34, product manager, banks digitally, uses laptop at work and phone at home.
- Holds AED current, AED savings, USD current account, a credit card and a debit card.
- Jobs-to-be-done: check balances in 5 seconds; pay rent and bills on time; send money to
  family; find a transaction quickly; freeze a card the moment she misplaces it.
- Pain points: hidden fees, unclear transfer status, sessions that log her out mid-task
  without warning.

### P2 — Daniel Reyes, "the expat sending money home" (secondary)
- 41, engineer working abroad; sends monthly international transfers in USD/EUR.
- Jobs: know the exact FX rate, fee and arrival date *before* confirming; reuse saved
  beneficiaries; download receipts as proof of payment.
- Prefers English; occasionally shares screen with family who read Arabic.

### P3 — Omar Nasser, "the new-to-digital customer" (secondary)
- 62, retired teacher, prefers Arabic, uses larger text and a screen magnifier.
- Jobs: enrol online for the first time; check pension credit; pay electricity bill.
- Needs: plain language, generous touch/click targets, RTL that "feels native", no time
  pressure surprises (clear session-timeout warnings).

### P4 — Mina Patel, "operations analyst" (internal)
- Works in the bank's digital operations team using the **Operations Console** (F11).
- Jobs: unlock locked customers, review payments held by fraud rules (maker), answer
  secure messages; supervisors (checker) approve/reject held payments.
- Needs: least-privilege access, every view of customer data justified and audited.

## 4. Scope

### 4.1 Feature map and priorities
| ID | Feature | Priority | Personas |
|---|---|---|---|
| F00 | Foundation (monorepo, app shell, API skeleton, DB, CI, design tokens) | P1 | all |
| F01 | Authentication, enrolment, MFA, sessions, step-up | P1 | all |
| F02 | Dashboard | P1 | P1 P2 P3 |
| F03 | Accounts and transaction history | P1 | P1 P2 P3 |
| F04 | Transfers and beneficiaries (own, internal, domestic; international = P2) | P1/P2 | P1 P2 |
| F05 | Bill payments | P2 | P1 P3 |
| F06 | Card management | P2 | P1 |
| F07 | Statements and documents | P2 | P2 P3 |
| F08 | Notifications and alerts | P2 | all |
| F09 | Profile, preferences and security settings | P1/P2 | all |
| F10 | Secure messaging and disputes | P3 | P1 P3 |
| F11 | Operations console (maker-checker, unlock, audit) | P3 | P4 |

**Priority meanings:** P1 = MVP, required for first demo gate. P2 = required for full
prototype. P3 = stretch, build only after all P1/P2 phase gates pass.

### 4.2 Explicitly out of scope (non-goals)
- Real payment rails, real card processing, real KYC/AML screening, real credit decisions.
- Account opening / loan origination journeys (accounts are pre-provisioned by seed data).
- Native mobile apps (the web app must be responsive down to 360 px width).
- Investments, trading, insurance, crypto, open-banking third-party consent management.
- Production deployment, HA, disaster recovery, HSM key management (documented as future
  work in SPEC-02 §9).
- Chatbots / generative-AI assistants inside the banking app.

## 5. Core user journeys (golden paths)
| # | Journey | Features | Priority |
|---|---|---|---|
| J1 | Enrol online → set password → set up MFA → land on dashboard | F01 F02 | P1 |
| J2 | Sign in with MFA → view balances → open account → find a transaction by search | F01 F02 F03 | P1 |
| J3 | Move money between own accounts in different currencies (with FX quote) | F04 | P1 |
| J4 | Add a domestic beneficiary (step-up) → pay them → download receipt | F04 | P1 |
| J5 | International transfer with fee option, purpose code, cut-off/value-date preview | F04 | P2 |
| J6 | Freeze a card, change online-purchase control, report card stolen and order replacement | F06 | P2 |
| J7 | Pay an electricity bill using inquiry amount; schedule a recurring bill | F05 | P2 |
| J8 | Download last month's e-statement; generate balance certificate | F07 | P2 |
| J9 | Receive a real-time low-balance alert; adjust alert thresholds | F08 | P2 |
| J10 | Change password, review devices, revoke a device, sign out everywhere | F09 | P1/P2 |
| J11 | Dispute a card transaction via secure message with attachment | F10 | P3 |
| J12 | Ops: transfer held by fraud rule → analyst recommends → supervisor approves | F11 | P3 |

## 6. Glossary
| Term | Definition |
|---|---|
| Available balance | Ledger balance − active holds + unused overdraft limit. What the customer can spend. |
| Ledger (current) balance | Sum of posted entries on the account. |
| Hold | A reservation of funds for an in-flight payment or card authorisation. |
| Beneficiary | A saved payee (internal, domestic, international). |
| Step-up | Re-authentication (OTP/TOTP) bound to a single sensitive action. |
| Cooling-off period | 24 h after adding a beneficiary during which reduced limits apply. |
| Cut-off time | Latest local time a payment can be submitted to be processed same business day. |
| Value date | Date funds are expected to reach the beneficiary. |
| Minor units | Integer representation of money (AED 1.00 = 100 fils). |
| Maker-checker | Four-eyes control: one person proposes, a different person approves. |
| Idempotency key | Client-generated UUID making a POST safe to retry. |
| PAN | Primary Account Number (card number). Never stored or logged in clear text. |
| CoP | Confirmation of Payee — name-check of beneficiary account holder (simulated). |
| EARS | Easy Approach to Requirements Syntax used in all feature specs. |
| Demo mode | Configuration that enables banner, dev outbox and magic test values (SPEC-91 §6). |
