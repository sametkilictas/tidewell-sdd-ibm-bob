---
id: SPEC-90
title: Testing and Verification Strategy
status: Approved
version: 1.2.0
depends-on: [SPEC-00, SPEC-02, NFR-SEC, NFR-PERF, NFR-A11Y]
skills: [spec-traceability]
---

# 90 — Testing and Verification Strategy

## 1. Principles
1. **Every acceptance criterion is executable.** Each `*-ACn` maps to ≥ 1 automated test
   (or a documented manual check for the few marked *manual*).
2. **Tests carry requirement tags** in their titles: `[XFER-021]`. `pnpm specs:trace` turns
   tags into `sdd/traceability/matrix.md`. Multiple tags allowed: `[XFER-026][NFR-REL-003]`.
3. **Test at the lowest layer that proves the behaviour**, then one E2E per journey.
4. **No mocks of our own domain.** Mock only ports (adapters) — and prefer the simulated
   adapters themselves with deterministic settings.
5. **Determinism**: fixed PRNG seed, injectable `Clock`, no `sleep` in tests (poll with
   timeout helpers), unique data per test via factories.
6. **The security checks look first.** Testing (`/sdd-verify`) starts only after the security scan —
   the checks in `sdd/governance/checks.json`, or SonarQube and the SCA provider — has passed the current
   production code (Constitution Article XI, §9).

## 2. Test pyramid and tooling
| Layer | Tool | Location | Scope | Target count (end) |
|---|---|---|---|---|
| Unit (pure) | Vitest + fast-check | `packages/domain/**/*.test.ts` | Money, IBAN, calendar, limits, fees, state machines, rule evaluators | 400+ |
| Unit (web) | Vitest + Testing Library | `apps/web/src/**/*.test.tsx` | Components & hooks (states, a11y names, formatting) | 250+ |
| Integration (API) | Vitest + `app.inject()` + real Postgres | `apps/api/test/**/*.int.test.ts` | Routes end-to-end inside the API incl. DB, ledger, idempotency, authz | 350+ |
| Contract | Response validation hook + Redocly lint | built into integration tests | Every response matches `openapi.yaml` | all ops |
| E2E | Playwright (Chromium, Firefox, WebKit) | `e2e/journeys/J*.spec.ts` | Journeys J1–J12 from SPEC-01 §5 | 12 journeys + smoke |
| Accessibility | `@axe-core/playwright` | `e2e/a11y.spec.ts` | All routes × themes × locales | inventory-driven |
| Visual (RTL) | Playwright screenshots | `e2e/visual.spec.ts` | Key screens in `ar` | 6 snapshots |
| Performance | autocannon/k6 + Lighthouse CI | `perf/` | NFR-PERF | phase 7 |
| External scan (before testing) | SonarQube SAST + quality gate, OSV-Scanner / SonarQube Advanced Security SCA, optional Bob SARIF | `sdd/scripts/scan.mjs` → `sdd/reports/scan/`; CI `sdd-gates / sonarqube`, `promote-to-test` | NFR-SEC-042..046 | every feature, every PR, every test deployment |
| Security | ESLint security, `pnpm audit`, secret scan, authz matrix, ZAP baseline (optional) | CI + `sdd/reports/security/` | NFR-SEC | each gate |

## 3. Coverage thresholds (enforced in Vitest config)
| Package | Lines | Branches |
|---|---|---|
| `packages/domain` | 90 % | 90 % |
| `apps/api/src/modules/ledger`, `payments` | 90 % | 85 % |
| `apps/api` (overall) | 80 % | 75 % |
| `apps/web` | 70 % | 65 % |

## 4. Test data
- **Factories** (`apps/api/test/factories/*.ts`): `customerFactory`, `accountFactory({currency, balance})`,
  `beneficiaryFactory({type, ageHours})`, `cardFactory`, etc. Balances are created via
  `GL-SEED-EQUITY` journals — never by writing balance columns.
- **Seed** (SPEC-91) is for demos and E2E; integration tests use factories on isolated schemas.
- **Personas in E2E** use seeded users. The E2E run starts with one `pnpm db:reset`; tests
  then create their own data with unique references (`E2E-<timestamp>`) and assert on
  deltas, never on absolute seeded balances that other tests may change. Journeys that
  need pristine state (J1 enrolment) use dedicated seeded personas reserved for them.

## 5. Mandatory special tests
| Test | Requirement | Description |
|---|---|---|
| Concurrency storm | NFR-REL-002 | 50 parallel transfers on one account; assert exact success count and non-negative available |
| Idempotency storm | NFR-REL-003 | 10 parallel identical requests with one key |
| Fault injection | NFR-REL-004 | Throw inside ledger posting; assert full rollback |
| Ledger invariant hook | NFR-REL-001 | `afterAll` in every integration file runs invariant checker |
| AuthZ matrix | NFR-SEC-010/011 | Generated from OpenAPI paths: cross-customer IDs → 404; customer on `/ops` → 403 |
| CSRF matrix | NFR-SEC-005 | Every unsafe op without token → 403 & no side effects |
| Log capture | NFR-SEC-031 | Known secrets/PII never appear in logs |
| Timing equality | NFR-SEC-003 | Unknown vs wrong-password median latency |
| Statement reconciliation property | STMT-002 | Random ledgers → statement totals reconcile |
| Money properties | FND-009 | Associativity, allocation sum preservation, round-trip parsing |
| Demo fencing | NFR-SEC-033 | Run selected tests with `DEMO_MODE=false` |

## 6. E2E conventions
- Page objects in `e2e/pages/*`; selectors by role and accessible name (`getByRole`), never by CSS class.
- OTPs read from `/dev/outbox` API helper or `000000` in demo mode.
- Clock control via `PUT /dev/clock` for scheduled/timeout flows.
- Each journey file title: `J4 — Add domestic payee and pay [XFER-012][XFER-014][XFER-026][XFER-027]`.
- Traces/videos kept on failure; uploaded as CI artifacts.

## 7. Verification report (per feature)
`/sdd-verify <feature>` produces `sdd/reports/verification/<feature>.md` from
`sdd/specs/templates/verification-report.template.md` containing: requirement coverage table
(ID → tests → result), `pnpm verify` summary, coverage numbers, a11y results, open defects,
deviations/CRs, screenshots of key screens (paths), and the sign-off checklist.

## 8. Defect severity
| Sev | Definition | Gate impact |
|---|---|---|
| S1 | Money incorrect, security breach, data loss, journey blocked | Blocks gate |
| S2 | Feature misbehaves with workaround; a11y serious | Blocks gate unless waived by PO |
| S3 | Cosmetic / minor copy | Logged |

## 9. External security scan — the gate before testing
| Where | What runs | Blocks |
|---|---|---|
| Per feature, after the last task (`/sdd-scan F##`, 🔐 Check Runner) | `sdd/scripts/scan.mjs F##`: SonarQube analysis waiting for the **Tidewell Bank** gate; OSV-Scanner when `SCA_PROVIDER` is `osv-scanner`/`both`; optional Bob review as SARIF | `/sdd-verify` and `/sdd-secure` (step guard) until `sdd/reports/scan/F##.json` is PASS and fresh |
| Every push to a branch other than `main` | `scan.mjs --ci` in `sdd-gates / sonarqube` (branch analysis), plus the commit policy | nothing yet: an early warning before a pull request exists |
| Every pull request to `main` | `scan.mjs --ci` in `sdd-gates / sonarqube` (PR analysis) | the merge (required check) |
| Every deployment to the test environment | `promote-to-test`: scan `main`, then `--gate-only --revision <sha>` | `deploy-test` |

- **Fresh** means the evidence's `codeFingerprint` equals the fingerprint of today's production
  files (`apps/`, `packages/`, `infra/`, `prisma/`, root manifests; tests excluded). Adding tests while
  verifying does not invalidate a scan; changing production code does.
- **Fixing findings** is ordirhamy builder work: a `T0NN-fix` task tagged `[NFR-SEC-043]` or
  `[NFR-SEC-044]`, test-first where a test can demonstrate the flaw.
- **Accepting risk** is human: false positives / accepted issues in SonarQube; dependency CVEs via
  `approve.mjs waiver` (≤ 90 days). Both appear in the scan report.
- The verification report links `sdd/reports/scan/F##.md`; the security report starts from it.

