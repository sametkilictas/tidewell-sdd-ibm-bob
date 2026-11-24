---
feature: F00
title: Tasks — Foundation
status: Approved
version: 1.0.0
plan: ./plan.md
legend: "[P] = can run in parallel with other [P] tasks in the same group · Req = requirement IDs satisfied · DoD = task-level done check"
---

# Tasks — F00 Foundation

> Bob: execute in order; tick `[x]` only when the task's DoD passes. Commit after each task
> with message `feat(F00): T0NN <title> [FND-xxx]` (Conventional Commits). Never mark a task
> done with failing or skipped tests.

## Group A — Workspace
- [ ] **T001** Initialise workspace — root `package.json` (`packageManager`, `engines`), `pnpm-workspace.yaml`, `.nvmrc`, `.gitignore`, `.editorconfig`, `README` dev section.
  Req: FND-001, FND-002 · Files: `/package.json`, `/pnpm-workspace.yaml`, `/.nvmrc` · DoD: `pnpm install` succeeds.
- [ ] **T002** `packages/config` — tsconfig base, ESLint flat config (typescript-eslint, jsx-a11y, security, formatjs, import boundaries, physical-CSS-property ban, money float ban per ADR-0002), Prettier, Vitest preset.
  Req: FND-001, NFR-SEC-041 · DoD: `pnpm lint` passes on empty packages.
- [ ] **T003** Create empty packages `apps/api`, `apps/web`, `packages/domain`, `packages/contracts`, `e2e` with `package.json`, `tsconfig.json`, `src/index.ts`, and root scripts listed in FND-001 (stubs print "nothing to check").
  Req: FND-001 · DoD: every root script exits 0.

## Group B — Domain (TDD) [P]
- [ ] **T004** [P] `Currency` table + `Money` (fromDecimalString/toDecimalString/add/subtract/compare/negate/isZero) with unit + property tests.
  Req: FND-009 · DoD: tests tagged `[FND-009]`; coverage ≥ 95 %.
- [ ] **T005** [P] `Money.multiplyRate` (decimal.js, HALF_EVEN) and `allocate` with residue rules.
  Req: FND-009 · DoD: allocation example from FND-009-AC3 passes.
- [ ] **T006** [P] IBAN: country length table, `isValidIban`, `buildIban`, `formatIban`, `maskIban`; BIC validator; Luhn.
  Req: FND-010 · DoD: FND-010-AC1/AC2 tests pass.
- [ ] **T007** [P] Business calendar with injected holidays and time zone (`Intl`/`Temporal` polyfill-free approach using `date-fns-tz` if needed — justify in commit).
  Req: FND-011 · DoD: FND-011-AC1/AC2 pass.
- [ ] **T008** [P] Reference generator (`HB` + YYMMDD + 6 base32) and prefixed ULID helper.
  Req: FND-016 (support), SPEC-03 §2 · DoD: unit tests for format and uniqueness (10k samples).

## Group C — Infra & configuration
- [ ] **T009** `infra/docker-compose.yml` (postgres:16-alpine with healthcheck, mailpit), scripts `infra:up` (waits for health) / `infra:down`.
  Req: FND-003 · DoD: FND-003-AC1.
- [ ] **T010** `.env.example`; `apps/api/src/config/index.ts` Zod loader with fail-fast and production secret guards.
  Req: FND-004, NFR-SEC-032 · DoD: FND-004-AC1, NFR-SEC-032-AC1 tests.

## Group D — API platform
- [ ] **T011** `buildApp()` + `main.ts`; plugins: request context (traceId from `traceparent` or new), pino logger with redaction, helmet/CSP, cookie, rate-limit, sensible.
  Req: FND-005, FND-006, NFR-SEC-022 · DoD: FND-006-AC1 log-capture test.
- [ ] **T012** Contract loading: bundle `sdd/contracts/openapi.yaml`, register request schemas; response validation hook enabled when `NODE_ENV=test`.
  Req: FND-005, ADR-0008 · DoD: FND-005-AC3.
- [ ] **T013** Error model: `DomainError(code, status, params)`, problem+json mapper, 404 handler, 500 sanitizer, `ErrorCode` enum generated from contract.
  Req: FND-005 · DoD: FND-005-AC1/AC2.
- [ ] **T014** Prisma schema baseline + migration (platform tables, immutability trigger, advisory lock helper) + seed framework (`registerSeeder`, deterministic PRNG).
  Req: FND-008 · DoD: FND-008-AC1/AC2.
- [ ] **T015** Platform primitives: `audit.record` (hash chain), `idempotent()` wrapper, outbox + dispatcher, `Clock` port.
  Req: FND-016 · DoD: FND-016-AC1/AC2; `pnpm audit:verify` implemented.
- [ ] **T016** Job runner with advisory locks, `job_runs`, registration API; `/dev/jobs/run` (demo only).
  Req: FND-017, FND-015 · DoD: FND-017-AC1.
- [ ] **T017** Health/ready/version routes.
  Req: FND-007, NFR-REL-006 · DoD: FND-007-AC1, NFR-REL-006-AC1.
- [ ] **T018** Dev module: `dev_outbox` writer port + `GET /dev/outbox`, `POST /dev/faults`; fenced by `DEMO_MODE`.
  Req: FND-015, NFR-SEC-033 · DoD: NFR-SEC-033-AC1 (both modes).

## Group E — Contracts & web shell
- [ ] **T019** `packages/contracts`: `contracts:gen` (openapi-typescript), `contracts:lint` (Redocly config with custom rules from ADR-0008).
  Req: FND-014, ADR-0008 · DoD: generated types compile; lint passes.
- [ ] **T020** Vite + React app bootstrap; providers; `routes.ts` from screen inventory; lazy placeholders; 404; ErrorBoundary with traceId.
  Req: FND-012 · DoD: FND-012-AC1 component test.
- [ ] **T021** Carbon theme (`theme.scss` token overrides per SPEC-05 §2), Plex fonts self-hosted, theme switcher (white/g100/system).
  Req: FND-013 · DoD: contrast unit test on token pairs (≥ 4.5:1).
- [ ] **T022** i18n: react-intl setup, `en.json`/`ar.json`, locale switcher setting `lang`/`dir`, `i18n:check` script.
  Req: FND-013, NFR-I18N-001 · DoD: FND-013-AC1/AC2.
- [ ] **T023** AppShell (Header, SideNav, skip link, focus-on-navigate), DemoBanner, shared components: `MoneyAmount`, `StatusTag`, `EmptyState`, `IbanText`, `PageHeader`, skeleton wrappers.
  Req: FND-012, FND-015, SPEC-05 §4–6 · DoD: component tests incl. `MoneyAmount` aria-label.
- [ ] **T024** `lib/api` client (openapi-fetch) with CSRF bootstrap, idempotency option, `ApiError`, session-expiry redirect; TanStack Query client defaults (retry rules: never retry 4xx; retry 503 ×2 with backoff).
  Req: FND-014 · DoD: FND-014-AC1.

## Group F — Quality gates
- [ ] **T025** Vitest workspace config, schema-per-worker DB setup, coverage thresholds.
  Req: FND-018 · DoD: `pnpm test` green with thresholds enforced.
- [ ] **T026** Playwright config (3 browsers, trace on first retry), `e2e/shell.spec.ts`, `e2e/a11y.spec.ts` (route list from inventory), `/dev/outbox` E2E.
  Req: FND-018, FND-015, NFR-A11Y-001 · DoD: FND-015-AC1, FND-012-AC2.
- [ ] **T027** `scripts/verify.mjs` + `pnpm verify`; `.github/workflows/ci.yml`.
  Req: FND-019 · DoD: FND-019-AC1.
- [ ] **T028** Wire `sdd/scripts/validate-specs.mjs` to `specs:check` / `specs:trace`; regenerate `sdd/traceability/matrix.md`.
  Req: FND-020 · DoD: FND-020-AC1.

- [ ] **T029** Wire SDD governance: root scripts `sdd:status` → `node sdd/scripts/state.mjs`, `sdd:step` → `node sdd/scripts/step.mjs`, `prepare` → `git config core.hooksPath sdd/scripts/hooks`; add `node sdd/scripts/git-check.mjs --ci` and `node sdd/scripts/validate-specs.mjs` to CI (already in `.github/workflows/sdd-gates.yml` — keep it). Do **not** edit `sdd/scripts/`, `sdd/scripts/hooks/`, `.bob/` or `sdd/state/` (governance-protected).
  Req: FND-021 · DoD: FND-021-AC1/AC2.

- [ ] **T031** Wire the external security scan (Article XI): root script `security:scan` → `node sdd/scripts/scan.mjs`; make `pnpm test` (Vitest workspace) write one merged `coverage/lcov.info` (read by `sonar-project.properties`); add `tools/governance` to the Vitest workspace with `scan-gate.test.ts` and `scan-integrity.test.ts` that import `sdd/scripts/lib.mjs` and `git-check.mjs` and prove the listed ACs on temporary fixtures. Keep `sdd-gates / sonarqube` and `promote-to-test` as they are; do **not** edit them, `sonar-project.properties`, `.bob/` or `sdd/scripts/` (governance-protected). A human sets up SonarQube with `sdd/docs/SONARQUBE.md`.
  Req: NFR-SEC-042, NFR-SEC-046 · DoD: tests tagged `[NFR-SEC-042]`/`[NFR-SEC-046]` green (NFR-SEC-042-AC1/AC2, NFR-SEC-046-AC1/AC2/AC3/AC5); `node sdd/scripts/scan.mjs F00 --dry-run` reports a non-zero production file count.

## Group G — Close-out
- [ ] **T030** Fill ADR-0001 resolved versions; confirm `pnpm verify` is green on a clean clone. Ticking T030 ends implementation; the feature then moves through the loop steps (not tasks): 📡 `/sdd-scan F00` (must PASS; findings come back as `T0NN-fix` tasks) → 🔍 `/sdd-verify F00` (writes `sdd/reports/verification/F00.md`) → 🛡️ `/sdd-secure F00` → human Phase 0 gate.
  Req: FND-002, all · DoD: ADR-0001 resolved-versions table complete; `pnpm verify` exits 0 on a clean clone. (The Phase 0 gate checklist is ticked later by a human.)
