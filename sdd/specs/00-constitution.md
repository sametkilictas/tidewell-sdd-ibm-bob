---
id: SPEC-00
title: Project Constitution
status: Approved
version: 1.3.0
owners: [Product Owner, Lead Architect]
applies-to: every spec, plan, task, line of code and test in this repository
---

# 00 — Project Constitution

> The constitution is the highest-ranking document in this repository. When any other
> spec, plan, task, rule, skill or prompt conflicts with it, **the constitution wins**.
> Bob may *propose* an amendment through a Change Request (`sdd/specs/change-requests/`),
> but may never edit this file directly.

## 1. Mission

Build a **professional, production-grade-looking prototype** of a retail online banking
web application for a fictional bank, **Tidewell Bank**, so stakeholders can click
through realistic journeys (sign-in, accounts, transfers, cards, bills, statements,
alerts, secure messaging, operations console) backed by a real API, a real database
and a real double-entry ledger — with **zero real money, zero real customers and zero
real payment rails**.

## 2. Configuration knobs (single place to re-target the prototype)

| Knob | Default | Notes |
|---|---|---|
| `BRAND_NAME` | Tidewell Bank | Fictional. Never use a real bank's name, logo or colours. |
| `BANK_CODE` (IBAN) | `990` | Used to build fictional, checksum-valid IBANs. |
| `BANK_BIC` | `TDWLAEA0` | Fictional ISO 9362 *test* BIC (location code ends in `0`). |
| `HOME_COUNTRY` | `AE` | Drives IBAN format, business calendar and default currency. |
| `BASE_CURRENCY` | `AED` (2 decimal places) | Multi-currency supported; see SPEC-03 §4. |
| `BUSINESS_TIMEZONE` | `Asia/Dubai` | All business dates & cut-offs are evaluated here. Storage is UTC. |
| `WEEKEND` | Saturday, Sunday | Business days Mon–Fri. |
| `LOCALES` | `en` (default), `ar` (RTL) | Full RTL mirroring is required (NFR-I18N). |
| `DEMO_MODE` | `true` in dev | Enables demo banner, dev outbox, magic test values. Must be `false`-safe. |
| `SONAR_PROJECT_KEY` | `tidewell-bank` | SonarQube project analysed by `sdd/scripts/scan.mjs` (also in `sonar-project.properties`). |
| `SONAR_QUALITY_GATE` | Tidewell Bank | Quality gate the project must use (NFR-SEC-043). A scan under any other gate fails. |
| `SCA_PROVIDER` | `osv-scanner` | Dependency-CVE source: `osv-scanner` (any SonarQube edition), `sonar` (SonarQube Advanced Security), or `both`. |
| `BOB_REVIEW_IN_SCAN` | `off` | `on` = every `/sdd-scan` also imports Bob's own review as SARIF; `off` = only with `--with-bob-review`. |

Changing a knob is a Change Request; the rest of the specs reference knobs by name. Secrets
(`SONAR_TOKEN`, `SONAR_HOST_URL`, `SONARQUBE_READONLY_TOKEN`) are environment variables, never knobs.

## 3. Articles (non-negotiable principles)

### Article I — Specs are the source of truth
1. Code exists to satisfy a requirement ID. No requirement → no code.
2. If implementation reveals a gap or contradiction, **stop and raise a Change Request**
   (`/sdd-change-request`). Never silently diverge from a spec.
3. Order of precedence: Constitution → NFR specs → Foundational specs (01–05) →
   Feature `spec.md` → `sdd/contracts/openapi.yaml` → ADRs → `plan.md` → `tasks.md` → code.
   (The OpenAPI contract is authoritative for *shapes*; feature specs for *behaviour*.)
4. **Approved scope is locked.** A plan approval binds the plan *and* the feature's `spec.md`; editing
   either afterwards voids it. After that, the feature's spec and plan — and at any time the
   foundation specs, NFRs, templates, and the contract/ADRs/design outside the planning of a
   not-yet-approved feature — change only through an approved change request, cited in the commit
   (`spec(CR-###): …`), followed by a fresh human plan approval (git rule G9).

### Article II — Contract first
1. Every HTTP endpoint is defined in `sdd/contracts/openapi.yaml` **before** it is implemented.
2. Server request/response validation and client types are generated from the contract.
3. A response that does not validate against the contract is a failing test.

### Article III — Money is sacred
1. Monetary amounts are **integers in minor units** (`bigint`) internally and
   **decimal strings with the currency's exact exponent** on the wire
   (`"12505.00"` AED, `"19.99"` USD). Floating point is forbidden for money — no
   `number`, `float`, `double`, `parseFloat` or `toFixed` on monetary values.
2. Every balance change is a **balanced double-entry journal** (Σ debits = Σ credits per
   currency). Balances are derived from postings, never written directly.
3. Every money-moving request carries an `Idempotency-Key`. Replays return the original
   result; never double-post.
4. Rounding: banker's rounding (half-even) and only at well-defined points (FX conversion,
   fee calculation). Rounding residue is recorded (on the FX quote or a rounding GL), never lost.

### Article IV — Security and privacy by default
1. Target **OWASP ASVS 4.0.3 Level 2** for the customer app and API.
2. Least privilege everywhere: every query is scoped to the authenticated customer;
   object-level authorization is tested for every resource (no IDOR).
3. Secrets come from environment variables, never from source. No PII, secrets, OTPs,
   passwords, session IDs or full card numbers (PAN) in logs, URLs, analytics or errors.
4. Sensitive actions require **step-up authentication** (SPEC F01 §Step-up).
5. Every security-relevant or money-relevant action writes an immutable **audit event**.

### Article V — Accessibility and inclusion are features
1. **WCAG 2.2 AA** is the minimum bar; automated axe checks run in E2E.
2. Full keyboard operation, visible focus, screen-reader labels, reduced-motion support.
3. English and Arabic with complete **RTL** layout mirroring; numbers, dates and currency
   formatted per locale.

### Article VI — Professional quality UX
1. UI built with **IBM Carbon Design System** (ADR-0006); no ad-hoc component libraries.
2. Every data view has loading (skeleton), empty, error and partial-failure states.
3. Every destructive or money-moving action has a review step and a clear receipt.
4. Microcopy follows `sdd/design/content-style-guide.md`.

### Article VII — Test-first, traceable verification
1. Each acceptance criterion maps to at least one automated test whose title contains the
   requirement ID in brackets, e.g. `it('[XFER-012] rejects amount above daily limit')`.
2. A task is **Done** only when the Definition of Done (`.bob/rules/05-definition-of-done.md`)
   holds — including `pnpm verify` green.
3. `sdd/traceability/matrix.md` is regenerated by `pnpm specs:trace` and must show no
   uncovered P1 requirement before a phase gate closes.

### Article VIII — Simplicity and reversibility
1. Prefer boring, well-documented technology (ADR-0001). New runtime dependencies need a
   one-line justification in the plan.
2. External systems (payment rails, card processor, SMS, email, FX feed, billers) are
   **simulated behind ports/adapters** (ADR-0007) so they can be swapped later.
3. Small vertical slices; each phase ends in a runnable, demoable state.

### Article IX — Human gates
1. Bob pauses for human approval at: spec clarification sign-off, plan approval, end of each
   delivery phase, any Change Request, and any acceptance of security risk (SonarQube status
   changes, dependency-CVE waivers).
2. Bob never pushes to `main`, never force-pushes, never disables tests or lowers
   thresholds to get to green.
3. Who signs is set in `sdd/docs/ROLES.md`: by default the **business owner** signs plan approvals,
   phase gates and change-request decisions, after the **business analyst** and the **architect**
   have reviewed; **AppSec** owns the quality gate and accepts security risk together with the
   business owner.

### Article X — Honesty about the prototype
1. A persistent, non-dismissible **"Demo environment — no real money"** banner is shown
   in every screen when `DEMO_MODE=true`.
2. All data is synthetic (SPEC-91). No real names of public figures, no real card numbers,
   no real bank identifiers.

### Article XI — Security is checked, as early as possible, before testing
1. No feature is promoted to testing (`/sdd-verify`) until the **security scan** — run by
   `sdd/scripts/scan.mjs`, a script Bob does not control — has passed the *current* production code.
   The scanner is set in `sdd/governance/checks.json` (ADR-0010): the configured checks (built-in checks
   plus any organisation tool switched on), or SonarQube's `SONAR_QUALITY_GATE` with the `SCA_PROVIDER`
   reporting no unwaived High/Critical dependency vulnerability (NFR-SEC-042..044).
2. The scanner's verdict is authoritative. Bob's own findings (Findings panel, `/review`, review skills,
   a Bob Shell review in the pipeline) are advisory; with SonarQube they reach the gate only when imported
   as SARIF. A CVE that Bob reports counts only when the SCA provider confirms it (NFR-SEC-045).
3. Nobody gets to green by hiding findings: no `NOSONAR`, no ignore rules, no narrowing of
   `sonar-project.properties`, no switching or weakening of the quality gate, no switching off a check in
   `sdd/governance/checks.json` outside a reviewed governance change, no hand-written scan evidence. A false positive or accepted risk is a **human** decision recorded in SonarQube or with
   `approve.mjs waiver` (expires within 90 days) (NFR-SEC-046).
4. CI re-runs the scan on every push to a branch, on every pull request to `main` and before every
   deployment to the test environment; local evidence is a convenience, never the final word.
5. **Shift left:** each check runs as early as it can — in Bob's hook as code is written, at commit,
   before testing — and again in the pipeline, where nobody can switch it off.

## 4. Amendment process
1. Raise `sdd/specs/change-requests/CR-<nnn>-<slug>.md` from the template.
2. Human approver records decision in the CR.
3. On approval, the Spec Architect mode updates affected specs and bumps their `version`.
4. Constitution amendments additionally bump this file's version and add a changelog row.

## 5. Changelog
| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-11-18 | Initial constitution |
| 1.1.0 | 2026-11-18 | Article XI (external security scan before testing); knobs `SONAR_PROJECT_KEY`, `SONAR_QUALITY_GATE`, `SCA_PROVIDER`, `BOB_REVIEW_IN_SCAN`; risk acceptance added to Article IX human gates. Pre-adoption amendment by the product owner. |
| 1.2.0 | 2026-11-18 | Article I.4 — approved scope is locked: plan approvals bind `spec.md`; post-approval spec changes need an approved CR (G9). Pre-adoption amendment by the product owner. |
| 1.3.0 | 2026-11-18 | Article IX.3 — roles and default signers (`sdd/docs/ROLES.md`); Article XI.4 — CI checks and scans every branch push, not only pull requests. Pre-adoption amendment by the product owner. |
