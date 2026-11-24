# AGENTS.md — Tidewell Online Banking (spec-driven prototype)

> Persistent project context for IBM Bob (all modes). Keep it short and current; details live in
> the linked specs. Mode-specific context: `.bob/rules-*/`.

## What this repository is
A **spec pack** that IBM Bob turns into a working prototype of a professional retail online-banking
web app for the fictional **Tidewell Bank** (AED base currency, English + Arabic RTL). The specs are
the source of truth; code is generated phase by phase with human approval gates.

**Current state:** specs complete, **no application code yet**. Start with Phase 0 (F00
Foundation): its plan and tasks are written; the business owner signs the plan (in a terminal:
`node sdd/scripts/approve.mjs plan F00`; on the GitHub path: a `/approve-plan F00` comment), then implementation
can start. You never sign, and never post or run a sign-off.

**Risk tiers (the automation dial):** `sdd/governance/policy.json` gives each feature a tier. The [SDD STATE] block
shows it: `Bob: one step at a time` means run the next step only and report; `may drive several steps` means the
Conductor may chain AI steps, stopping at every human gate. Never change a tier or the dial yourself.

**Secrets:** never write keys, tokens or passwords into any file. Read them from the environment. The hooks refuse
such writes (rule G10); documented fakes are allowed only via `sdd/governance/secrets-allowlist.json` by people.

**Workflows:** the loop is defined in `sdd/workflows/` (feature-delivery, change-request, phase-gate). Every
step is 🤖 AI (a mode runs it), ⚙️ check (plain code decides) or ✍️ sign-off (a named person decides).
`/sdd-workflow F##` or `node sdd/scripts/workflow.mjs status` shows where a feature is.

## Where things are
| Path | What |
|---|---|
| `sdd/specs/00-constitution.md` | Non-negotiable principles (read first; never edit) |
| `sdd/specs/01-product-vision.md` | Personas, scope, priorities, journeys J1–J12, glossary |
| `sdd/specs/02-architecture.md` | Stack, monorepo layout, module rules, flows, jobs, env vars |
| `sdd/specs/03-domain-model.md` | Entities, money, ledger, invariants, state machines |
| `sdd/specs/domain/` | Domain rules Bob must never break (invariants, money and ledger, the project's security checklist) — the only place the Bob layer gets domain knowledge from |
| `sdd/specs/04-api-guidelines.md` | REST conventions, errors, idempotency, CSRF, step-up, pagination |
| `sdd/specs/05-design-system.md` | Carbon theme, layout, components, patterns, RTL |
| `sdd/specs/nfr/` | Security, performance/reliability, a11y/i18n, observability/privacy (EARS) |
| `sdd/specs/features/F00…F11/spec.md` | Feature specs with EARS requirements + acceptance criteria |
| `sdd/specs/features/F00-foundation/{plan,tasks}.md` | Worked example of plan/tasks format |
| `sdd/specs/90-testing-strategy.md` · `91-seed-data.md` · `92-delivery-plan.md` | Tests · demo data · phases & gates |
| `sdd/contracts/openapi.yaml` | OpenAPI 3.1 contract (116 operations, `x-requirements` traceability) |
| `sdd/contracts/error-codes.md` · `domain-events.md` | Error catalog · events & audit actions |
| `sdd/adr/` | Architecture decision records |
| `sdd/design/` | Screen inventory (routes), user flows + demo script, wireframes, content guide |
| `sdd/traceability/matrix.md` | Generated requirement → contract → test matrix |
| `sdd/reports/scan/` · `sdd/reports/verification/` · `sdd/reports/security/` | Security-scan evidence (machine-written by `scan.mjs`: the configured checks, or SonarQube/SCA) · evidence written by verifier / security modes |
| `sdd/governance/checks.json` · `sdd/docs/CHECKS.md` | Which security checks run where (Bob, commit, scan, pipeline) and which scanner gives the verdict (human-owned) |
| `sonar-project.properties` · `sdd/docs/SONARQUBE.md` | SonarQube analysis scope, when SonarQube is the scanner (human-owned) |
| `.bob/` | Modes (incl. overrides of Bob V2's built-in Agent, Plan and Ask), rules, commands, skills, MCP, hooks (`settings.json`) — industry-agnostic; the domain lives in `sdd/specs/` |
| `sdd/workflows/` | The SDD workflows as data (steps: AI · check · sign-off) + Bob's prompts for GitHub runs |
| `sdd/governance/approvers.json` | Who signs what, sign-off channel (GitHub comments by default), Bob-on-GitHub settings |
| `.github/` · `sdd/docs/GITHUB.md` | Checks (sdd-gates: policy · signoffs · sonarqube), comment sign-offs (sdd-signoff), Bob review and `/bob fix` (bob-review, bob-commands), issue forms, PR template |
| `sdd/scripts/` · `sdd/state/` | SDD state engine, step guard, Bob hook, git/CI policy · human approvals (governance-protected) |
| `sdd/docs/WHICH-MODE.md` | One-page guide for humans: which mode for what |

## Modes (project)
| Mode | Slug | Does | Can edit |
|---|---|---|---|
| 🧭 SDD Navigator (in place of Bob's Agent mode; default) | `agent` | Orients and routes to the right mode | nothing |
| 🗺️ Plan · ❓ Ask (overrides of Bob V2's other built-ins) | `plan` / `ask` | Read-only explanations; route work to the SDD mode that owns the step | nothing |
| 🎼 SDD Conductor | `sdd-conductor` | Runs the delivery plan, delegates subtasks, enforces gates | nothing |
| 📐 Spec Architect | `spec-architect` | Clarify, plan, tasks, contract, ADRs | sdd/specs/ sdd/contracts/ sdd/adr/ sdd/design/ (not constitution) |
| 🏗️ Spec Builder | `spec-builder` | Implements tasks test-first, fixes scan findings | code & tests (nothing under `sdd/` except task ticks, and not `.bob/`) |
| 🔐 Check Runner | `check-runner` | Runs the security scan that gates testing (the configured checks, or SonarQube + CVEs); explains findings | `sdd/reports/scan/F##.md` notes, optional `F##.bob.sarif` |
| 🔍 Spec Verifier | `spec-verifier` | Proves ACs, E2E/a11y, reports | tests, reports, traceability |
| 🛡️ Security Reviewer | `security-reviewer` | ASVS L2 review | security reports, change requests |
| 🔎 SDD PR Reviewer | `sdd-pr-reviewer` | Advisory review of a branch or pull request against its spec (GitHub runs it headless; any pipeline can, as the `bob-review` check) | nothing |

Bob V2 has three built-in modes (Agent, Plan, Ask); this repository overrides all three in Bob IDE. Bob Shell resolves
its built-in slugs before project modes, so in Bob Shell start in an SDD mode: `bob --mode spec-builder`, or
`bob run --mode <slug> "…"` (needs `BOB_API_KEY`). The hooks guard writes and commands in both.

## Slash commands
`/sdd-next` · `/sdd-workflow [F##]` · `/sdd-start` · `/sdd-prototype [phase]` · `/sdd-status` · `/sdd-review` · `/sdd-clarify F##` · `/sdd-plan F##` ·
`/sdd-tasks F##` · `/sdd-implement F## [T0NN]` · `/sdd-scan F## [--with-bob-review]` · `/sdd-verify F##` · `/sdd-secure F##` ·
`/sdd-change-request <slug>` · `/sdd-apply-cr CR-###` · `/sdd-demo`

## Skills
`domain-rules` · `carbon-ui` · `security-review` · `ears-requirements` ·
`spec-grill` · `spec-traceability` · `sonarqube-triage` · `bob-findings-sarif`

## Stack (target, built in F00)
pnpm monorepo · TypeScript strict · Node LTS · Fastify 5 · PostgreSQL 16 + Prisma · React 19 + Vite ·
IBM Carbon (`@carbon/react`) · TanStack Query · react-intl · Vitest · Playwright + axe · Mailpit.

## Commands
Available now: `node sdd/scripts/validate-specs.mjs [--trace] [--strict=P1]`, `node sdd/scripts/state.mjs`, `node sdd/scripts/step.mjs`,
`node sdd/scripts/workflow.mjs list | status [F##] | next`,
`node sdd/scripts/scan.mjs F## [--with-bob-review] | --ci | --gate-only` (needs `SONAR_HOST_URL`, `SONAR_TOKEN`).
After F00: `pnpm dev`, `pnpm verify`, `pnpm test`, `pnpm test:e2e`, `pnpm db:reset`,
`pnpm contracts:gen`, `pnpm specs:check`, `pnpm specs:trace`, `pnpm ledger:check` (full list: FND-001).

## Golden rules (details in `.bob/rules/`)
1. No requirement ID → no code. Gaps → `/sdd-change-request`, then stop.
2. Contract first; responses must validate against `sdd/contracts/openapi.yaml`.
3. Money is `bigint` minor units; balances only via balanced ledger journals; idempotency on all money movement.
4. Security by default (ASVS L2): authz per customer, CSRF, step-up, redaction, audit.
5. WCAG 2.2 AA, Carbon only, every string in `en` + `ar`, RTL correct.
6. Tests tagged `[REQ-ID]`; `pnpm verify` green before "done"; never weaken tests.
6b. Nothing reaches testing without a fresh **PASS** from the security scan (`/sdd-scan`): the checks in
   `sdd/governance/checks.json`, or SonarQube when that is the scanner. The scan decides; Bob's findings are
   advisory; never `NOSONAR`, never touch `checks.json` or `sonar-project.properties`. A write that fails a built-in
   check (a secret, SQL built from strings, TLS checks switched off …) is refused: fix the code, don't route round it.
6c. Approved scope is locked: once a plan is approved, its spec and plan change only via an approved change
   request (`/sdd-apply-cr`, commit `spec(CR-###): …`); foundation specs, NFRs and the contract likewise (G9).
7. Stop at human gates (plan approval, phase gates, change requests) — people sign, by default as a comment
   on the pull request (`/approve-plan F04`; `approve.mjs` only where the repo takes terminal sign-offs). Bob
   never signs, never posts a sign-off command, and never comments on, reviews or merges pull requests.
8. Writes happen only inside an active step (`sdd/scripts/step.mjs start …`) and in the mode that owns it (rule 06).
