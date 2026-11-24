# ADR-0007 — Simulated external systems behind ports/adapters

- **Status:** Accepted · **Date:** 2026-11-18

## Context
No real rails, processors or gateways may be used, yet journeys must show realistic
asynchrony, failures and delays.

## Decision
Each external dependency is a **port** (TypeScript interface) owned by the consuming module,
with a **simulated adapter** in `apps/api/src/adapters/sim/*`:

| Port | Simulated behaviour |
|---|---|
| `PaymentRail` (domestic) | Accepts, settles after 5 s; customer reference containing `DEMO-REJECT` → reject `BENEFICIARY_ACCOUNT_CLOSED`; `DEMO-RETURN` → completes, then is returned 10 s later (RETURNED) |
| `PaymentRail` (SWIFT) | Settles after 30 s; reference containing `DEMO-REJECT` → reject `INTERMEDIARY_BANK_REJECTED`; `DEMO-RETURN` → RETURNED after completion |
| `NameCheck` (CoP) | Exact name → MATCH; Levenshtein ≤ 2 → CLOSE_MATCH (suggest); else NO_MATCH; IBAN ending `0000` → UNAVAILABLE |
| `FxRates` | Seeded mid rates with jitter; fault toggle `fx: down` |
| `BillerNetwork` | Inquiry returns due amount per seeded bill; reference ending `999` → `BILLER_REFERENCE_NOT_FOUND` |
| `CardProcessor` | Applies status/controls; fault toggle |
| `SmsGateway` / `EmailGateway` | Writes to `dev_outbox` / Mailpit |
| `MalwareScanner` | Detects EICAR string |

Demo markers are case-insensitive, currency-independent and stripped from the reference sent to the beneficiary. Magic values and fault toggles exist **only** when `DEMO_MODE=true` (NFR-SEC-033).

## Consequences
- ✅ Deterministic tests; realistic demos; production integration is an adapter swap.
