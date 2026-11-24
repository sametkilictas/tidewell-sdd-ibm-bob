---
feature: F00
title: Implementation Plan — Foundation
status: Ready for approval   # approval is recorded by a human in sdd/state/approvals.json (hash-bound)
version: 1.0.0
spec: ./spec.md
author: Spec Architect (reference example)
---

# Plan — F00 Foundation

> Reference example of the plan format (`sdd/specs/templates/plan.template.md`). Bob generates
> plans for F01–F11 in this shape with `/sdd-plan <feature>`.

## 1. Constitution check (gate — all must be ✅ before tasks are generated)
| Article | Check | Status |
|---|---|---|
| I Specs are truth | Every task below references ≥ 1 FND requirement | ✅ |
| II Contract first | Health/version/dev endpoints added to `sdd/contracts/openapi.yaml` before code | ✅ |
| III Money | Money type uses `bigint`; float lint rules configured in this phase | ✅ |
| IV Security | Helmet/CSP, redaction, config fail-fast, demo fencing included | ✅ |
| V Accessibility | Shell a11y sweep in E2E from day one | ✅ |
| VI UX | Carbon shell + skeleton/empty/error primitives | ✅ |
| VII Test-first | Tests written with REQ tags; coverage thresholds configured | ✅ |
| VIII Simplicity | No extra build orchestrator; deps justified below | ✅ |
| IX Human gates | Phase 0 gate in `sdd/specs/92-delivery-plan.md` | ✅ |
| X Honesty | Demo banner + synthetic seed framework | ✅ |
| XI External scan | T031 wires `security:scan`, root coverage report and governance tests; `/sdd-scan F00` must PASS before `/sdd-verify F00` | ✅ |

## 2. Technical approach
1. **Workspace first** — root `package.json`, `pnpm-workspace.yaml`, `packages/config`
   (tsconfig base with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`;
   ESLint flat config; Prettier; Vitest preset).
2. **Domain package** — implemented TDD-style: tests first for Money, Currency, IBAN, BIC,
   Luhn, BusinessCalendar. No runtime deps except `decimal.js` (rates) — justified by ADR-0002.
3. **Infra & config** — docker-compose, `.env.example`, Zod config loader in `apps/api/src/config`.
4. **API platform** — `buildApp()` with plugins in order: requestContext (traceId) → logger →
   helmet → cookie → rateLimit → contract validation → routes → error handler. Platform
   modules: `errors/`, `audit/`, `idempotency/`, `outbox/`, `jobs/`, `clock/`, `dev/`.
5. **Prisma baseline** — platform tables + raw SQL migration for immutability triggers and
   advisory-lock helper; seed framework `prisma/seed/index.ts` with module seeders registry.
6. **Contracts** — add operations to `sdd/contracts/openapi.yaml` (already present for health,
   version, dev); `packages/contracts` generation script.
7. **Web shell** — Vite + React + Carbon; providers (QueryClient, IntlProvider, Theme,
   Session placeholder); router with lazy routes from a single `routes.ts` (mirrors
   `sdd/design/screen-inventory.md`); `AppShell`, `DemoBanner`, `ErrorBoundary`, `NotFound`,
   `PagePlaceholder`; `lib/api` client (openapi-fetch) with CSRF + idempotency middleware.
8. **Quality gates** — `scripts/verify.mjs` orchestrating steps with timing table;
   `.github/workflows/ci.yml`; Playwright config + `e2e/shell.spec.ts`, `e2e/a11y.spec.ts`.
9. **SDD governance wiring** — root scripts and `prepare` hook installation for the governance
   tooling that ships with the pack (`sdd/scripts`, `sdd/scripts/hooks`, `.bob/settings.json`,
   `.github/workflows/sdd-gates.yml`); these files themselves stay human-owned.

## 3. Dependency justification (new runtime deps)
| Package | Where | Why |
|---|---|---|
| fastify + @fastify/{helmet,cookie,rate-limit,sensible} | api | ADR-0001 |
| prisma, @prisma/client | api | ADR-0001 |
| pino | api | NFR-OBS-001 |
| zod | api, web, contracts | config + form validation |
| decimal.js | domain | FX rate math only (ADR-0002) |
| @carbon/react, @carbon/icons-react, @carbon/pictograms-react | web | ADR-0006 |
| react-router, @tanstack/react-query, react-intl, openapi-fetch | web | SPEC-02 §4 |
| fast-check (dev) | domain | property tests |
| @playwright/test, @axe-core/playwright (dev) | e2e | FND-018 |

## 4. Data model changes
`audit_events`, `idempotency_records`, `outbox_events`, `jobs`, `job_runs`, `dev_outbox`,
`dev_faults` (demo only). Triggers: `audit_events_immutable`. Indexes on
`audit_events(occurred_at)`, `idempotency_records(user_id, key) UNIQUE`,
`outbox_events(dispatched_at NULLS FIRST, id)`.

## 5. Sequencing and parallelism
```
T001 ─▶ T002 ─▶ T003 ─┬─▶ T004..T008 (domain, [P])
                      ├─▶ T009..T010 (infra/config)
                      │        └─▶ T011..T018 (api platform)
                      └─▶ T019..T024 (web shell)  ── needs T016 contract client
T011..T024 ─▶ T025..T029, T031 (tests/e2e/CI/spec, SDD governance + external scan wiring) ─▶ T030 (close-out)
           ─▶ /sdd-scan F00 (🔐, must PASS) ─▶ /sdd-verify F00 ─▶ /sdd-secure F00 ─▶ Phase 0 gate
```

## 6. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Carbon + Vite SCSS config friction | Use `@carbon/react` precompiled CSS for shell first; theme overrides via Sass module in T021 |
| Contract-driven validation complexity | Bundle OpenAPI once at startup (`@redocly/openapi-core` bundle) and register schemas with Fastify AJV |
| Flaky DB tests under parallel workers | Schema-per-worker strategy in Vitest global setup |
| RTL regressions | Lint ban on physical CSS properties from day one |

## 7. Test approach
TDD for domain (T004–T008); integration tests per platform primitive; E2E smoke + a11y
sweep; all test titles carry `[FND-xxx]` tags for traceability.

## 8. Definition of Done for the feature
All tasks checked; `sdd/reports/scan/F00.json` PASS and fresh; `pnpm verify` green;
`sdd/traceability/matrix.md` shows every FND requirement covered; verification report
`sdd/reports/verification/F00.md` written; phase-0 gate approved.
