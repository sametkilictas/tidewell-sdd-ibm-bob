# ADR-0005 — Idempotency keys on all money movement

- **Status:** Accepted · **Date:** 2026-11-18

## Context
Double-clicks, retries after timeouts and flaky networks must never move money twice.

## Decision
- Clients send `Idempotency-Key` (UUID v4) on operations marked `x-idempotent: required`.
- Table `idempotency_records(user_id, key, request_hash, status IN_PROGRESS|COMPLETED,
  response_status, response_body, created_at)`, unique `(user_id, key)`.
- Flow: insert IN_PROGRESS (unique violation → inspect existing) → execute use case in the
  same DB transaction as the business writes → store response → commit.
- Semantics in SPEC-04 §5. Retention 24 h.
- Web client creates the key when entering the Review step and reuses it until the user
  edits the payment details.

## Consequences
- ✅ Safe retries; deterministic E2E tests of double submit.
- ⚠️ Response bodies stored (redacted of secrets — none in these responses by design).
