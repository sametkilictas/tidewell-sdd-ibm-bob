---
id: NFR-OBS
title: Observability, Audit and Privacy Requirements
status: Approved
version: 1.0.0
depends-on: [SPEC-00, SPEC-02, SPEC-03]
---

# NFR — Observability, Audit and Privacy

## 1. Logging & tracing

#### NFR-OBS-001 — Structured logs with correlation
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL emit JSON logs (pino) with `time`, `level`, `msg`, `traceId`, `spanId`, `userId` (pseudonymous ID only), `route`, `statusCode`, `durationMs`, and SHALL accept/propagate W3C `traceparent`.
- **Acceptance criteria:**
  - **NFR-OBS-001-AC1** A request with `traceparent` yields logs and the problem+json `traceId` with the same trace ID.
- **Verification:** integration

#### NFR-OBS-002 — Metrics endpoint
- **Priority:** P3 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL expose Prometheus metrics at `/metrics` (dev only, not under `/api`) including HTTP latency histograms by route, payment orders by status, job run durations, login outcomes.
- **Acceptance criteria:**
  - **NFR-OBS-002-AC1** `curl /metrics` contains `hb_payment_orders_total{status="COMPLETED"}`.
- **Verification:** integration

## 2. Audit

#### NFR-OBS-010 — Audit coverage
- **Priority:** P1 · **Type:** Event-driven
- **EARS:** WHEN any action listed in `sdd/contracts/domain-events.md` §Audit actions occurs (success or failure), THE SYSTEM SHALL write an AuditEvent in the same DB transaction as the change, including actor, target, outcome, IP, user agent, traceId and redacted metadata.
- **Acceptance criteria:**
  - **NFR-OBS-010-AC1** A route-table test asserts each operation with `x-audit` produces exactly one audit event with that action on success and on handled failure.
- **Verification:** integration

#### NFR-OBS-011 — Tamper evidence
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL chain audit events by SHA-256 hash (SPEC-03 §7) and provide `pnpm audit:verify` that detects any modified, deleted or reordered event.
- **Acceptance criteria:**
  - **NFR-OBS-011-AC1** Manually updating one audit row's metadata makes `audit:verify` exit non-zero naming the first broken link.
- **Verification:** integration

#### NFR-OBS-012 — Customer-visible activity
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL let customers see their own security activity (sign-ins, device changes, password/MFA changes, beneficiary changes) for the last 90 days.
- **Acceptance criteria:**
  - **NFR-OBS-012-AC1** See PROF-030.
- **Verification:** E2E

## 3. Privacy & data protection

#### NFR-PRIV-001 — Data minimisation
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL return only fields required by each screen; national ID, date of birth and full contact details SHALL be masked by default in API responses except on the dedicated profile endpoint.
- **Acceptance criteria:**
  - **NFR-PRIV-001-AC1** `GET /dashboard/summary` contains no email, phone, DOB or national ID.
- **Verification:** contract test

#### NFR-PRIV-002 — Synthetic data only
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL use only synthetic data from SPEC-91; card numbers SHALL use documented test BIN ranges and pass Luhn; IBANs SHALL use fictional bank code `990`/fictional other-bank codes.
- **Acceptance criteria:**
  - **NFR-PRIV-002-AC1** Seed validation asserts every PAN starts with a test BIN from SPEC-91 §4.
- **Verification:** seed test

#### NFR-PRIV-003 — Data export (subject access)
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN a customer requests a data export, THE SYSTEM SHALL generate a JSON archive of their profile, preferences, accounts, beneficiaries, transactions (last 24 months), messages and security activity within 60 s and notify them when ready.
- **Acceptance criteria:**
  - **NFR-PRIV-003-AC1** See PROF-050.
- **Verification:** integration

#### NFR-PRIV-004 — Retention
- **Priority:** P2 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL purge expired sessions and challenges hourly, idempotency records after 24 h, dev outbox entries after 24 h, and SHALL retain audit events indefinitely in the prototype.
- **Acceptance criteria:**
  - **NFR-PRIV-004-AC1** Purge job tests with fake clock remove only expired rows.
- **Verification:** integration

#### NFR-PRIV-005 — Consent records
- **Priority:** P3 · **Type:** Event-driven
- **EARS:** WHEN a customer changes marketing or analytics consent, THE SYSTEM SHALL store the consent type, value, timestamp, and version of the consent text.
- **Acceptance criteria:**
  - **NFR-PRIV-005-AC1** Toggling marketing consent twice yields two consent records with increasing timestamps.
- **Verification:** integration
