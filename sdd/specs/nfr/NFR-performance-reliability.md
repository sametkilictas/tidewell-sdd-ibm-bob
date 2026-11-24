---
id: NFR-PERF
title: Performance, Reliability and Correctness Requirements
status: Approved
version: 1.0.0
depends-on: [SPEC-00, SPEC-02, SPEC-03]
---

# NFR — Performance, Reliability and Correctness

Reference environment for all numbers: developer laptop (8 vCPU, 16 GB), Docker Postgres,
seed data per SPEC-91 (≈ 25 customers, 120 accounts, 60,000 transactions).

## 1. Performance

#### NFR-PERF-001 — API latency
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL serve authenticated read endpoints with p95 latency < 300 ms and money-movement writes with p95 < 600 ms under 20 concurrent virtual users on the reference environment.
- **Acceptance criteria:**
  - **NFR-PERF-001-AC1** `pnpm perf:api` (autocannon/k6 script in `perf/`) reports p95 within targets for: `GET /dashboard/summary`, `GET /accounts/{id}/transactions`, `POST /transfers` (own account).
- **Verification:** perf script (phase 7 gate)

#### NFR-PERF-002 — Transaction history at scale
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL return any page (limit 25) of an account's transaction history, with any documented filter combination, in < 150 ms p95 for accounts with up to 10,000 transactions.
- **Acceptance criteria:**
  - **NFR-PERF-002-AC1** Composite indexes exist on `(account_id, booked_at DESC, id DESC)` and trigram index for `q` search; `EXPLAIN` in test shows index usage, no seq scan.
- **Verification:** integration (EXPLAIN assertion) + perf script

#### NFR-PERF-003 — Front-end performance budgets
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL meet, on a production build served locally with Lighthouse mobile emulation: LCP < 2.5 s, INP < 200 ms, CLS < 0.1 on Sign-in and Dashboard; initial JS ≤ 250 KB gzip; each lazy route chunk ≤ 150 KB gzip.
- **Acceptance criteria:**
  - **NFR-PERF-003-AC1** `pnpm perf:web` (Lighthouse CI config) passes budgets; bundle analyzer report saved to `sdd/reports/verification/bundle.html`.
- **Verification:** Lighthouse CI

#### NFR-PERF-004 — Perceived performance
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL render skeletons within 100 ms of navigation for any data view and SHALL prefetch the account detail and transactions queries on hover/focus of an account tile.
- **Acceptance criteria:**
  - **NFR-PERF-004-AC1** Component tests assert skeleton presence while queries are pending.
- **Verification:** component tests

## 2. Reliability & correctness

#### NFR-REL-001 — Ledger invariants hold
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL satisfy invariants LGR-INV-1…8 (SPEC-03 §5.3) at all times, verified by `pnpm ledger:check` after seed, after every integration test file, and at every phase gate.
- **Acceptance criteria:**
  - **NFR-REL-001-AC1** `pnpm ledger:check` exits 0 and prints per-currency trial balance = 0.
- **Verification:** script + integration hook

#### NFR-REL-002 — Concurrency safety
- **Priority:** P1 · **Type:** Unwanted behaviour
- **EARS:** IF concurrent debit requests would together exceed an account's available balance, THEN THE SYSTEM SHALL accept only those that fit and reject the rest with `INSUFFICIENT_FUNDS`, never producing a negative available balance.
- **Acceptance criteria:**
  - **NFR-REL-002-AC1** The 50-concurrent-transfers test in SPEC-03 §5.4 passes 20 consecutive runs.
- **Verification:** integration (stress)

#### NFR-REL-003 — Idempotent money movement
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN a money-moving request is retried with the same `Idempotency-Key` and payload, THE SYSTEM SHALL return the original result without creating additional orders, holds or postings.
- **Acceptance criteria:**
  - **NFR-REL-003-AC1** 10 parallel identical `POST /transfers` with one key → exactly 1 order; 9 responses are replays or `409 IDEMPOTENCY_IN_PROGRESS`.
- **Verification:** integration

#### NFR-REL-004 — Atomicity
- **Priority:** P1 · **Type:** Unwanted behaviour
- **EARS:** IF any step of a money-moving use case fails (DB error, validation, adapter exception), THEN THE SYSTEM SHALL roll back all of its writes including holds, postings, audit and outbox rows written in that transaction.
- **Acceptance criteria:**
  - **NFR-REL-004-AC1** Fault-injection test throws inside `ledger.post` → no rows persisted for that order.
- **Verification:** integration (fault injection)

#### NFR-REL-005 — Graceful degradation
- **Priority:** P2 · **Type:** Unwanted behaviour
- **EARS:** IF a simulated dependency (FX feed, biller network, card processor, notification gateway) is unavailable, THEN THE SYSTEM SHALL fail only the dependent feature with a specific error code (`FX_UNAVAILABLE`, `BILLER_UNAVAILABLE`, …) and keep all other features functional; dashboard widgets fail independently.
- **Acceptance criteria:**
  - **NFR-REL-005-AC1** With `POST /dev/faults {"fx":"down"}`, own-account same-currency transfers still succeed and the dashboard renders with an FX widget error state.
- **Verification:** E2E (demo fault toggles)

#### NFR-REL-006 — Health and readiness
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL expose `/api/v1/health/live` (process up) and `/api/v1/health/ready` (DB reachable, migrations applied, job runner alive) returning 200/503 JSON within 100 ms.
- **Acceptance criteria:**
  - **NFR-REL-006-AC1** With Postgres stopped, `/health/ready` returns 503 with `{"checks":{"db":"down"}}`.
- **Verification:** integration

#### NFR-REL-007 — Job safety
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL run each background job under a Postgres advisory lock, make each job execution idempotent, and record `job_runs` with status, duration and error.
- **Acceptance criteria:**
  - **NFR-REL-007-AC1** Starting two API processes, a standing order due today produces exactly one payment order.
- **Verification:** integration

#### NFR-REL-008 — Deterministic reset
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide `pnpm db:reset` that drops, migrates and seeds the database deterministically (fixed PRNG seed) in < 60 s.
- **Acceptance criteria:**
  - **NFR-REL-008-AC1** Two consecutive resets produce identical row counts and identical balance totals per currency.
- **Verification:** script
