---
id: SPEC-91
title: Seed and Demo Data
status: Approved
version: 1.0.0
depends-on: [SPEC-00, SPEC-03, NFR-PRIV-002]
---

# 91 — Seed and Demo Data

All data is **synthetic** and generated deterministically (`PRNG seed = 20261118`,
"today" anchored to the real current date at seed time; history generated backwards).
`pnpm db:reset` must reproduce identical data (NFR-REL-008).

## 1. Personas and credentials (demo only — printed by `pnpm db:seed` and shown in README)
| Persona | Username | Password | Customer no. | DOB | Mobile | Locale | Notes |
|---|---|---|---|---|---|---|---|
| Sara Haddad | `sara.haddad` | `Tidewell-Demo-2026!` | 10000001 | 1992-03-14 | +971 55 5504 417 | en | Primary demo; trusted device none |
| Daniel Reyes | `daniel.reyes` | `Tidewell-Demo-2026!` | 10000002 | 1985-07-02 | +971 56 6602 290 | en | International transfers; has TOTP (secret printed by seed) |
| Omar Nasser | — (not enrolled) | — | 10000003 | 1964-11-20 | +971 58 9903 105 | ar | Use for J1 enrolment |
| Layla Karim | `layla.karim` | `Tidewell-Demo-2026!` | 10000004 | 1998-01-09 | +971 55 5517 788 | ar | Arabic-first customer, RTL demos |
| Locked Lou | `locked.lou` | `Tidewell-Demo-2026!` | 10000005 | 1979-05-30 | +971 55 5520 001 | en | Seeded LOCKED for OPS-004 |
| Mina Patel | `mina.ops` | `Tidewell-Ops-2026!` | — | — | +971 55 5531 000 | en | OPS_AGENT |
| Yusuf Adel | `yusuf.sup` | `Tidewell-Ops-2026!` | — | — | +971 55 5532 000 | en | OPS_SUPERVISOR |
| Grace Lim | `grace.sup` | `Tidewell-Ops-2026!` | — | — | +971 55 5533 000 | en | OPS_SUPERVISOR (second checker) |
| 17 background customers | `cust.NN` | random (not printed) | 100000NN | random | random | mixed | Volume for search/perf; some are beneficiaries of others |

Demo OTP `000000` works for seeded users in demo mode only (AUTH-050).

## 2. Accounts (balances at seed "today")
| Owner | Product | Type | Ccy | Balance | Extras |
|---|---|---|---|---|---|
| Sara | Everyday Current | CURRENT | AED | 34,502.50 | overdraft 0; nickname "Main" |
| Sara | Smart Saver | SAVINGS | AED | 120,000.00 | 2.75 % p.a. (275 bps) |
| Sara | Global Current | CURRENT | USD | 2,150.75 | |
| Sara | Platinum Credit Card | CREDIT_CARD | AED | owed 3,124.00 | limit 20,000.00; statement 2,899.00; min due 289.90; due in 17 days |
| Sara | Fixed Deposit 12M | TERM_DEPOSIT | AED | 50,000.00 | 4.10 %; matures in 7 months |
| Daniel | Everyday Current | CURRENT | AED | 18,205.00 | |
| Daniel | Global Current | CURRENT | EUR | 640.00 | |
| Daniel | Global Current | CURRENT | USD | 3,905.10 | |
| Daniel | Home Loan | LOAN | AED | outstanding 384,000.00 | instalment 4,200.00 monthly |
| Omar | Pension Current | CURRENT | AED | 7,426.00 | monthly pension credit on 25th |
| Layla | Everyday Current | CURRENT | AED | 2,650.40 | near low-balance threshold for J9 |
| Layla | Smart Saver | SAVINGS | AED | 9,800.00 | |
| Locked Lou | Everyday Current | CURRENT | AED | 1,500.00 | |
| Background | 1–4 accounts each | mixed | mixed | random | 1 FROZEN, 1 DORMANT, 1 CLOSED among them |

IBANs: `buildIban('AE','990', <16-digit account number>)` — checksum-valid, fictional. Account numbers
are the last 12 digits of the BBAN.

## 3. Transaction history
- 24 months for Sara, Daniel, Layla; 12 months for Omar; 6 months for background customers.
- Generators per persona: salary/pension credits (monthly, 25th or last business day),
  rent (Sara, standing order 4,500.00 to "Ahmad Saleh" on the 1st), groceries (2–4/week),
  dining, transport, utilities (via F05 billers), subscriptions, ATM cash, card FX purchases
  (USD/EUR on travel weeks), interest credits (savings, monthly), fees.
- Merchants (fictional, en/ar aliases): Lulu Hypermarket / لولو هايبرماركت, Coffee House / مقهى البيت,
  Metro Taxi, Book Corner, City Cinema, FitLife Gym, Cloud Music, Pharmacy Plus, AirGulf Travel,
  StreamBox, Corner Bakery — categories mapped per BR-ACCT-06.
- 3 pending card authorisations for Sara (one USD), 1 expired hold in history.
- Postings for ALL seeded transactions go through `ledger.post` with seed equity journals
  so `pnpm ledger:check` passes after seed.

## 4. Cards (test PANs only)
| Owner | Card | Kind/Network | PAN (test range) | Status |
|---|---|---|---|---|
| Sara | Debit ••1111 | DEBIT / VISA | `4000 0000 0000 1111`-style generated from test BIN `400000` (Luhn-valid) | ACTIVE |
| Sara | Credit ••1234 | CREDIT / MASTERCARD | test BIN `555555` | ACTIVE |
| Daniel | Debit ••2222 | DEBIT / VISA | test BIN `400000` | FROZEN |
| Layla | Debit ••3333 | DEBIT / VISA | test BIN `400000` | PENDING_ACTIVATION (replacement) |

Only BINs `400000` and `555555` are permitted (NFR-PRIV-002). CVCs random 3 digits, encrypted.

## 5. Reference data
- **Domestic banks** (invented names and codes; any resemblance to real institutions is
  coincidental): IBAN bank code 990 Tidewell Bank, 991 Northbay Lantern Bank, 992 Gulf Lantern Bank,
  993 Crescent Lantern Savings, 994 Pearl Lantern Commercial Bank.
- **BIC directory** — all fictional BICs are **ISO 9362 test BICs** (second character of the
  location code is `0`), so they can never collide with a live institution:
  `TDWLAEA0` (Tidewell Bank), `NBKXAEA0` (Northbay Lantern Bank), `KSTRDEF0` (Kestrel Demo Bank, Frankfurt),
  `THMSGB20` (Thames Harbour Demo Bank, London), `HDSNUS30` (Hudson Lantern Demo Bank, New York),
  `DSRTKWK0` (Desert Rose Demo Bank, Kuwait City), `OASSSAR0` (Oasis Crest Demo Bank, Riyadh),
  `CHRYJPJ0` (Cherry Blossom Demo Trust, Tokyo).
- **FX mid rates (illustrative, AED per unit)**: USD 3.6725 · EUR 3.9840 · GBP 4.6540 ·
  KWD 11.9620 · SAR 0.9793 · BHD 9.7410 · JPY 0.02405.
- **Holidays**: 6 fictional/generic public holidays in the next 12 months + any in the past
  24 months used by history; editable in `prisma/seed/reference/holidays.json`.
- **Billers**: per F05 §2.1; each saved biller for Sara has a current bill (AquaGrid 374.50 due in 9 days; Coastline postpaid 180.00; FiberLink 225.00 overdue).
- **Purpose codes**: per BR-XFER-08.

## 6. Pre-seeded scenario states (so every journey is demoable immediately)
| Scenario | Data |
|---|---|
| Beneficiaries for Sara | Ahmad Saleh (DOMESTIC, NBKX, landlord, 400 days old), Mum — Huda Haddad (INTERNAL, favourite), Salma Nour (DOMESTIC, created 3 h ago → cooling-off), Lena Reyes (INTERNATIONAL, Germany, EUR) |
| Beneficiaries for Daniel | Maria Reyes (INTERNATIONAL, US, USD, account+BIC), Carlos Reyes (INTERNATIONAL, DE IBAN, EUR) |
| Scheduled | Sara: one-off 750.00 to Mum in 6 days; standing order rent monthly 1st |
| Held for review | 1 Daniel transfer `HELD_FOR_REVIEW` (FR-1) aged 5 h, no recommendation |
| Notifications | Sara: 3 unread (new device sign-in, statement ready, payment completed) |
| Messages | Sara: 1 open thread "Card replacement timing" awaiting customer; 1 closed |
| Statements | 12 monthly statements per deposit/credit account for Sara & Daniel |
| Alerts | Layla: LOW_BALANCE threshold 2,500.00 on Everyday Current |
| Locked user | Locked Lou status LOCKED (10 failed attempts yesterday) |

## 7. Demo markers and toggles (demo mode only)
| Marker | Effect |
|---|---|
| Reference contains `DEMO-REJECT` | Rail rejects (domestic `BENEFICIARY_ACCOUNT_CLOSED`, SWIFT `INTERMEDIARY_BANK_REJECTED`) |
| Reference contains `DEMO-RETURN` | Completes then RETURNED 10 s later |
| Reference contains `DEMO-REVIEW` | Fraud rule FR-4 → HELD_FOR_REVIEW |
| IBAN ending `0000` | Name check UNAVAILABLE |
| Biller reference ending `999` | `BILLER_REFERENCE_NOT_FOUND` |
| `PUT /dev/faults` | fx / billers / cardProcessor / notifications / insights down |
| `PUT /dev/clock` | Advance server clock (timeouts, scheduled transfers, statements) |
| `POST /dev/jobs/run` | Run any job now |
