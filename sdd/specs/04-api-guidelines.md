---
id: SPEC-04
title: API Design Guidelines
status: Approved
version: 1.0.0
depends-on: [SPEC-00, SPEC-02, SPEC-03]
contract: sdd/contracts/openapi.yaml
adrs: [ADR-0004, ADR-0005, ADR-0008]
---

# 04 — API Design Guidelines

`sdd/contracts/openapi.yaml` (OpenAPI 3.1) is the **authoritative contract**. This document
defines the conventions every operation in it must follow. Bob must update the contract
(through the Spec Architect mode) *before* implementing any new endpoint.

## 1. Basics
| Rule | Value |
|---|---|
| Base path | `/api/v1` (major version in path; breaking changes → `/api/v2`) |
| Media type | `application/json; charset=utf-8`; errors `application/problem+json` |
| Field naming | `camelCase` JSON; enums `UPPER_SNAKE_CASE` |
| Time | RFC 3339 UTC timestamps (`2026-11-18T09:41:00Z`); business dates `YYYY-MM-DD` in `BUSINESS_TIMEZONE` |
| IDs | Opaque prefixed strings (SPEC-03 §2) |
| Money | `Money` object `{ "amount": "12505.00", "currency": "AED" }` (SPEC-03 §4.1) |
| Nullability | Absent ≠ null. Optional fields are omitted when unknown; `null` only where documented |
| Caching | `Cache-Control: no-store` on every authenticated response |
| Compression | gzip/br for JSON ≥ 1 KB |

## 2. Resource and method conventions
- Nouns, plural: `/accounts`, `/accounts/{accountId}/transactions`.
- Actions that are not CRUD use a sub-resource verb: `POST /cards/{cardId}/freeze`,
  `POST /transfers/{transferId}/cancel`.
- `GET` is safe and never changes state (mark-as-read uses `POST`).
- `PATCH` uses JSON Merge Patch semantics for partial updates and requires `If-Match`
  (ETag) on resources that customers edit concurrently (preferences, alert rules, beneficiaries).
- `201 Created` returns the resource and a `Location` header. `202 Accepted` for async jobs.

## 3. Authentication & CSRF (ADR-0004)
- Session cookie `__Host-hb_sid`: `HttpOnly; Secure; SameSite=Strict; Path=/`. (In local
  HTTP dev, `Secure` is relaxed and the name becomes `hb_sid`; never in any non-dev mode.)
- CSRF: the session holds a random token returned by `GET /auth/session` and on login;
  every unsafe request (`POST/PUT/PATCH/DELETE`) must send `X-CSRF-Token`. Missing/mismatch → `403 CSRF_TOKEN_INVALID`.
- Unauthenticated → `401 UNAUTHENTICATED`; session idle/absolute expiry → `401 SESSION_EXPIRED`.
- Authenticated but forbidden (wrong role) → `403 FORBIDDEN`.
- **Other customers' resources return `404 NOT_FOUND`** (never 403) to avoid enumeration.

## 4. Step-up authentication
- Endpoints flagged `x-step-up: <PURPOSE>` in the contract require header
  `X-Step-Up-Token`. The token is single-use, valid **5 minutes**, bound to user, session,
  purpose and (where stated) the SHA-256 hash of the canonical request payload.
- Missing/invalid → `403 STEP_UP_REQUIRED` with `stepUp: { purpose, methods }` in the problem body.

## 5. Idempotency (ADR-0005)
- Header `Idempotency-Key: <UUID v4>` is **required** on operations flagged
  `x-idempotent: required` (all money movement, card replacement, beneficiary creation).
- Server stores `(userId, key) → requestHash, status, response` for 24 h.
- Same key + same payload while in progress → `409 IDEMPOTENCY_IN_PROGRESS`; after
  completion → replay original status and body with header `Idempotent-Replayed: true`.
- Same key + different payload → `422 IDEMPOTENCY_KEY_REUSED`.
- The web client generates the key when the **review screen** is shown and reuses it for
  retries of that confirmation (so double-clicks and network retries are safe).

## 6. Pagination, filtering, sorting
- Cursor pagination: `?limit=25&cursor=<opaque>`; `limit` default 25, max 100.
- Response envelope:
```json
{ "items": [ ... ], "page": { "nextCursor": "eyJ...", "limit": 25, "hasMore": true } }
```
- Filters are explicit query params (`from`, `to`, `type`, `status`, `minAmount`,
  `maxAmount`, `category`, `q`). Unknown params → `400 VALIDATION_FAILED`.
- Sorting: `?sort=-bookedAt` (prefix `-` for descending). Only documented sort keys allowed.
- Date range filters are inclusive business dates; max span documented per endpoint.

## 7. Errors (RFC 9457)
```json
{
  "type": "https://errors.tidewell.example/insufficient-funds",
  "title": "Insufficient funds",
  "status": 422,
  "detail": "The available balance is lower than the amount plus fees.",
  "instance": "/api/v1/transfers",
  "code": "INSUFFICIENT_FUNDS",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "errors": [ { "field": "amount.amount", "code": "TOO_LARGE", "message": "…" } ]
}
```
- `code` is stable and machine-readable; the full catalog lives in
  `sdd/contracts/error-codes.md`. The web app maps `code` → localized message; it never shows
  `detail` verbatim to customers.
- 5xx responses never include stack traces, SQL or internal hostnames.

## 8. Rate limiting
- Headers on every response: `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.
- Exceeded → `429 RATE_LIMITED` with `Retry-After`.
- Named buckets (referenced by `x-rate-limit` in the contract; defaults):
  | Bucket | Limit |
  |---|---|
  | `auth` | login/enrol/reset: 10/min per IP **and** 5/min per username/customer number |
  | `otp` | step-up start/verify: 5/min per user; OTP verify also 5/min per challenge |
  | `export` | exports & custom statements: 10/hour per user |
  | `reveal` | card reveal: 5/day per card (BR-CARD-02) |
  | `default` | any other authenticated route: 300/min per user |

## 9. Concurrency
- Editable resources expose `ETag` (weak, from `version` column). `PATCH`/`PUT` without
  `If-Match` → `428 PRECONDITION_REQUIRED`; stale → `412 PRECONDITION_FAILED`.

## 10. Server-Sent Events
- `GET /api/v1/notifications/stream` (`text/event-stream`), authenticated by cookie.
- Event names: `notification.created`, `payment.status_changed`, `session.expiring`,
  `balance.changed`. `data` is JSON matching the contract schema. Heartbeat comment every 20 s.
- Client reconnects with `Last-Event-ID`; server replays up to 100 missed events.

## 11. Security headers (all responses)
`Content-Security-Policy` (strict, nonce-based for web), `Strict-Transport-Security`
(non-dev), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`,
`Permissions-Policy` (camera, mic, geolocation disabled), `Cross-Origin-Opener-Policy: same-origin`,
`X-Frame-Options: DENY` (and CSP `frame-ancestors 'none'`).

## 12. Contract workflow
1. Architect edits `sdd/contracts/openapi.yaml` + `sdd/contracts/error-codes.md`.
2. `pnpm contracts:lint` (Redocly/Spectral ruleset in `packages/config`) must pass.
3. `pnpm contracts:gen` regenerates `packages/contracts/src/generated.ts`.
4. Builder implements route; contract test validates real responses against the schema.
5. Any drift between implementation and contract is a failing test, not a doc bug.

## 13. Vendor extensions used in the contract
| Extension | Meaning |
|---|---|
| `x-requirements: [XFER-010, …]` | Requirement IDs the operation satisfies (traceability) |
| `x-step-up: TRANSFER_CREATE` | Step-up purpose required |
| `x-idempotent: required` | Idempotency-Key header required |
| `x-audit: TRANSFER_CREATED` | Audit action written on success/failure |
| `x-rate-limit: auth` | Named rate-limit bucket |
| `x-demo-only: true` | Route registered only when `DEMO_MODE=true` |
| `x-roles: [OPS_AGENT]` | Required roles (ops endpoints) |
