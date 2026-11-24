---
id: F00
title: Foundation — workspace, platform primitives, app shell, quality gates
status: Approved
version: 1.0.1
priority: P1
phase: 0
depends-on: [SPEC-00, SPEC-02, SPEC-03, SPEC-04, SPEC-05, NFR-SEC, NFR-PERF, NFR-A11Y, NFR-OBS]
skills: [domain-rules, carbon-ui, spec-traceability]
requirement-prefix: FND
---

# F00 — Foundation

## 1. Summary
Create the runnable skeleton every other feature builds on: the pnpm monorepo, toolchain,
Docker infrastructure, configuration, API platform primitives (errors, logging, CSRF,
idempotency, audit, outbox, jobs), the pure `domain` package (money, IBAN, calendar),
the web application shell (Carbon UI Shell, routing, i18n/RTL, theming, demo banner) and
all quality gates (`pnpm verify`, spec tooling, CI). **No banking features** are built here.

> F00 is the only feature shipped with a fully worked `plan.md` and `tasks.md`. They are the
> reference format Bob must follow when generating plans and tasks for F01–F11.

## 2. User stories
| ID | As a… | I want… | so that… |
|---|---|---|---|
| US-FND-1 | developer | one command to install, reset and run everything | I can demo or develop in minutes |
| US-FND-2 | Bob (agent) | strict, fast feedback (`pnpm verify`) | I know when a task is Done |
| US-FND-3 | stakeholder | a branded, accessible shell with a demo banner | the prototype looks professional from day one |
| US-FND-4 | architect | money/IBAN/calendar logic in a pure package | correctness is provable with unit/property tests |

## 3. Functional requirements

#### FND-001 — Monorepo workspace and scripts
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL be a pnpm workspace with packages `apps/api`, `apps/web`, `packages/domain`, `packages/contracts`, `packages/config`, `e2e`, exposing root scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`, `verify`, `db:migrate`, `db:seed`, `db:reset`, `contracts:lint`, `contracts:gen`, `specs:check`, `specs:trace`, `ledger:check`, `audit:verify`, `i18n:check`, `security:deps`, `security:secrets`, `sdd:status`, `sdd:step`.
- **Acceptance criteria:**
  - **FND-001-AC1** Given a clean clone with Node LTS and Docker, when running `corepack enable && pnpm install && pnpm db:reset && pnpm dev`, then web is served at :5173 and API at :4000 within 90 s.
  - **FND-001-AC2** Each listed script exists and exits 0 on the skeleton (scripts with no subject yet print "nothing to check" and exit 0).

#### FND-002 — Pinned toolchain
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL pin Node (`.nvmrc`, `engines`), pnpm (`packageManager`), and commit `pnpm-lock.yaml`, and SHALL record resolved major/minor versions in ADR-0001 §Resolved versions.
- **Acceptance criteria:**
  - **FND-002-AC1** `pnpm install --frozen-lockfile` succeeds; ADR-0001 table is fully populated.

#### FND-003 — Local infrastructure
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide `infra/docker-compose.yml` with PostgreSQL 16+ (health-checked, named volume) and Mailpit (SMTP 1025, UI 8025), started by `pnpm infra:up` and stopped by `pnpm infra:down`.
- **Acceptance criteria:**
  - **FND-003-AC1** `pnpm infra:up` returns only after Postgres is healthy.

#### FND-004 — Configuration validation
- **Priority:** P1 · **Type:** Unwanted behaviour
- **EARS:** IF required environment variables (SPEC-02 §9) are missing or invalid, THEN THE SYSTEM SHALL refuse to start and print every invalid variable by name without printing secret values.
- **Acceptance criteria:**
  - **FND-004-AC1** Unsetting `DATABASE_URL` → exit code 1 and message listing `DATABASE_URL`.
  - **FND-004-AC2** `.env.example` documents every variable with a comment.

#### FND-005 — API platform skeleton
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL build the Fastify app via `buildApp(deps)` registering helmet (SPEC-04 §11), cookie, rate-limit, request validation from the OpenAPI contract, response validation in test mode, a global RFC 9457 error handler mapping domain errors to `sdd/contracts/error-codes.md`, and `Cache-Control: no-store` on authenticated routes.
- **Acceptance criteria:**
  - **FND-005-AC1** An unknown route returns `404` problem+json with `code: NOT_FOUND` and a `traceId`.
  - **FND-005-AC2** A thrown unexpected error returns `500 INTERNAL_ERROR` without stack trace in body.
  - **FND-005-AC3** A request with an unknown body property on a contract route returns `400 VALIDATION_FAILED`.

#### FND-006 — Structured logging and trace propagation
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL log with pino per NFR-OBS-001 using the redaction list in NFR-SEC-031 and SHALL return `traceId` in every problem response.
- **Acceptance criteria:**
  - **FND-006-AC1** Log-capture test: `Cookie` and `X-CSRF-Token` headers are `[REDACTED]`.

#### FND-007 — Health, readiness and version
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL implement `GET /health/live`, `GET /health/ready` and `GET /version` per NFR-REL-006 and the contract.
- **Acceptance criteria:**
  - **FND-007-AC1** `/version` returns git SHA, build time and `demoMode` flag.

#### FND-008 — Database baseline, migrations, seed runner
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL define the Prisma schema for platform tables (`audit_events`, `idempotency_records`, `outbox_events`, `jobs`, `job_runs`, `dev_outbox`) plus a seed framework (deterministic PRNG `seed=20261118`) that later features extend, and SHALL install DB triggers that forbid UPDATE/DELETE on `audit_events` (and later `postings`).
- **Acceptance criteria:**
  - **FND-008-AC1** `pnpm db:reset` twice yields identical row counts (NFR-REL-008).
  - **FND-008-AC2** `UPDATE audit_events …` raises an exception.

#### FND-009 — Money and currency domain
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide `packages/domain/src/money` implementing ADR-0002 (Money, Currency table from SPEC-03 §4.2, parse/format, half-even rounding, allocation) with property-based tests.
- **Acceptance criteria:**
  - **FND-009-AC1** `Money.fromDecimalString("0.1","AED")` throws `WRONG_EXPONENT`; `"1.00"` succeeds.
  - **FND-009-AC2** Property test: for random a, b, `a.add(b).subtract(b).equals(a)`.
  - **FND-009-AC3** `allocate(AED 100.00, [1,1,1])` → `[33.34, 33.33, 33.33]` (sum preserved).

#### FND-010 — Identifier validators
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide pure validators: IBAN (ISO 13616 mod-97 + per-country length table for ≥ 30 countries incl. KW=30, AE=23, SA=24, GB=22, DE=22, FR=27), BIC (ISO 9362, 8 or 11 chars), Luhn, and an IBAN builder that computes check digits for fictional bank codes.
- **Acceptance criteria:**
  - **FND-010-AC1** `buildIban('AE','990','0000001234567890')` returns the 23-char IBAN `AE919900000001234567890` that `isValidIban` accepts; altering any digit fails validation.
  - **FND-010-AC2** `formatIban` groups in blocks of 4.

#### FND-011 — Business calendar
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide a business calendar for `BUSINESS_TIMEZONE` with configurable weekend (Sat–Sun) and seeded holiday list, exposing `isBusinessDay`, `nextBusinessDay`, `addBusinessDays`, and `executionDateFor(submittedAt, cutoffLocalTime)`.
- **Acceptance criteria:**
  - **FND-011-AC1** Friday 14:05 local with cut-off 14:00 → next Monday (NFR-I18N-005-AC1).
  - **FND-011-AC2** Day before a seeded holiday at 15:00 → first business day after the holiday.

#### FND-012 — Web application shell
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL render the Carbon UI Shell per SPEC-05 §3.1 with lazy-loaded routes, a skip link, route-change focus management, a global error boundary with trace reference, a 404 page, and placeholder pages for every route in `sdd/design/screen-inventory.md`.
- **Acceptance criteria:**
  - **FND-012-AC1** Navigating via side nav moves focus to the page `<h1>`.
  - **FND-012-AC2** axe has no serious/critical violations on the shell (en/ar, light/dark).

#### FND-013 — Theming and i18n infrastructure
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL support `white`/`g100`/system themes and `en`/`ar` locales switchable at runtime without reload, setting `<html lang dir>`, loading IBM Plex Sans / Plex Sans Arabic locally, and providing `i18n:check` for catalog parity.
- **Acceptance criteria:**
  - **FND-013-AC1** Switching to Arabic sets `dir="rtl"` and the side nav moves to the right.
  - **FND-013-AC2** `pnpm i18n:check` fails if a key exists in `en.json` but not `ar.json`.

#### FND-014 — Typed API client and server-state layer
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide a typed API client generated from the contract that sends credentials, attaches `X-CSRF-Token` on unsafe methods, attaches `Idempotency-Key` when requested, parses problem+json into a typed `ApiError`, and on `401 SESSION_EXPIRED` routes to sign-in preserving the intended URL.
- **Acceptance criteria:**
  - **FND-014-AC1** Unit test: `POST` without a known CSRF token first calls `GET /auth/session` to obtain one.

#### FND-015 — Demo affordances
- **Priority:** P1 · **Type:** State-driven
- **EARS:** WHILE `DEMO_MODE=true`, THE SYSTEM SHALL show the non-dismissible demo banner (Constitution Art. X), expose `/dev/outbox` (API + web page listing OTPs/SMS/emails, newest first, auto-refresh), `/dev/jobs/run`, and `/dev/faults` toggles; WHILE `DEMO_MODE` is not true none of these exist (NFR-SEC-033).
- **Acceptance criteria:**
  - **FND-015-AC1** E2E in demo mode reads an OTP from `/dev/outbox` page.

#### FND-016 — Platform primitives: audit, idempotency, outbox
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide `audit.record()` (hash-chained, NFR-OBS-011), the `idempotent()` route wrapper (ADR-0005), and a transactional outbox with an in-process dispatcher, each usable inside a caller-provided DB transaction.
- **Acceptance criteria:**
  - **FND-016-AC1** A test route wrapped with `idempotent()` executes its handler once for 10 parallel identical requests.
  - **FND-016-AC2** `pnpm audit:verify` passes on seed and fails after tampering.

#### FND-017 — Job runner
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide a DB-backed job runner with advisory locks, schedules from SPEC-02 §8, `job_runs` history, and a `Clock` port that tests can fake (NFR-REL-007).
- **Acceptance criteria:**
  - **FND-017-AC1** Two runner instances never execute the same job concurrently (integration test).

#### FND-018 — Test infrastructure
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL configure Vitest (unit/integration with isolated test DB per worker via schema-per-worker), Playwright (Chromium, Firefox, WebKit; base URL; trace on retry), `@axe-core/playwright`, response validation against the contract, and coverage thresholds (domain ≥ 90 % lines/branches, api ≥ 80 %, web ≥ 70 %).
- **Acceptance criteria:**
  - **FND-018-AC1** `pnpm test` runs ≥ 1 example test per package; `pnpm test:e2e` runs the shell smoke + a11y test.

#### FND-019 — Quality gate and CI
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL provide `pnpm verify` running, in order: `specs:check`, `contracts:lint`, `lint`, `typecheck`, `test` (with coverage), `i18n:check`, `ledger:check`, `audit:verify`, `build`, `test:e2e`, and a GitHub Actions workflow running the same with Postgres service.
- **Acceptance criteria:**
  - **FND-019-AC1** `pnpm verify` exits 0 on the completed foundation and prints a summary table of each step's duration and result.

#### FND-020 — Spec tooling
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL wire `sdd/scripts/validate-specs.mjs` as `pnpm specs:check` (structure lint) and `pnpm specs:trace` (regenerate `sdd/traceability/matrix.md` by scanning tests for `[REQ-ID]` tags).
- **Acceptance criteria:**
  - **FND-020-AC1** A test titled `[FND-009] …` makes FND-009 show as covered in the regenerated matrix.

#### FND-021 — SDD governance wiring
- **Priority:** P1 · **Type:** Ubiquitous
- **EARS:** THE SYSTEM SHALL wire the SDD governance tooling that already ships in the pack — `pnpm sdd:status` / `sdd:step` (sdd/scripts), the Bob hooks in `.bob/settings.json`, the git `commit-msg` hook installed automatically by the root `prepare` script (`git config core.hooksPath sdd/scripts/hooks`), and the `sdd-gates` CI workflow — without modifying the governance scripts themselves.
- **Acceptance criteria:**
  - **FND-021-AC1** After `pnpm install` in a fresh clone, `git config core.hooksPath` prints `sdd/scripts/hooks`, and a commit `feat: stuff` touching `apps/` is rejected with rule G1/G2.
  - **FND-021-AC2** `pnpm sdd:status` prints the phase table; CI runs `node sdd/scripts/git-check.mjs --ci` on every push and pull request.

## 4. UI specification
| Route | Purpose | Notes |
|---|---|---|
| `/` | Redirect to `/dashboard` if session, else `/sign-in` | |
| `/sign-in` etc. | Placeholder auth pages (filled by F01) | Auth template |
| `/dashboard`, `/accounts`, `/transfers`, `/payments`, `/cards`, `/statements`, `/messages`, `/settings` | Placeholders with page title + empty state "Coming in phase N" | Shell template |
| `/dev/outbox` | Dev outbox viewer (demo only) | DataTable: time, channel, recipient (masked), subject, body |
| `*` | 404 page with link to dashboard | |

## 5. API operations
`getHealthLive`, `getHealthReady`, `getVersion`, `getAuthSession` (stub returning 401 until F01), `listDevOutbox`, `runDevJob`, `setDevFaults`, `setDevClock`.

## 6. Out of scope
Any banking feature, auth logic (F01), real styling of feature pages.

## 7. Test plan
- Unit: domain money/IBAN/BIC/Luhn/calendar (property tests with fast-check).
- Integration: error handler, config validation, idempotency wrapper, audit chain, job runner locks.
- E2E: shell renders, nav focus, locale/theme switch, demo banner, `/dev/outbox`, a11y sweep.

## 8. Clarifications log
| Date | Question | Decision | By |
|---|---|---|---|
| 2026-11-18 | Monorepo tool: Nx/Turborepo? | Plain pnpm workspaces + `pnpm -r`; add Turborepo only if `verify` > 10 min | Architect |
