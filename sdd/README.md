# Tidewell Online Banking — Spec-Driven Development pack for IBM Bob

A complete, opinionated **spec pack** that lets [IBM Bob](https://bob.ibm.com) prototype a
professional retail online-banking web application through **spec-driven development (SDD)**:
specs first, human-approved plans, test-first implementation, a **security scan that gates
testing** (built-in checks, your organisation's tools, or SonarQube), independent verification and security review, with full
requirement → contract → test traceability.

> Tidewell Bank is **fictional**. The prototype moves no real money, uses only synthetic data,
> simulated payment rails and test card numbers, and shows a permanent "Demo environment" banner.

## What's inside
| | Count |
|---|---|
| Feature specs (F00–F11) with EARS requirements | 12 |
| Requirements (feature + NFR) | 212 |
| Acceptance criteria | 287 |
| OpenAPI 3.1 operations (each with `x-requirements`) | 116 |
| Architecture decision records | 9 |
| Bob modes (7 SDD + 3 built-in overrides) / slash commands / skills | 10 / 16 / 8 |
| Workflows (steps: 🤖 AI · ⚙️ check · ✍️ sign-off) | 3 |

**Product scope:** enrolment, sign-in with MFA, sessions & step-up · dashboard · accounts &
transactions (search, filters, export) · own/internal/domestic/international transfers with FX,
limits, cut-offs, standing orders and receipts · beneficiaries with confirmation of payee and
cooling-off · bill payments & top-ups · card controls, reveal, report & replace · statements and
letters (PDF) · real-time notifications & alerts · profile & security settings · secure messaging
& disputes · operations console with maker-checker and audit search.

**Target stack (built by Bob in Phase 0):** TypeScript pnpm monorepo · Fastify 5 API · PostgreSQL +
Prisma · double-entry ledger · React 19 + Vite · IBM Carbon Design System · English + Arabic (RTL) ·
Vitest · Playwright + axe · Mailpit.

## Repository map
Everything spec-driven lives in **`sdd/`**, so the application Bob builds (`apps/`, `packages/`,
`infra/`, `prisma/`, `e2e/`, `package.json` …) gets a clean project root. Only files that tools insist
on finding at the root stay there.
```
.
├── AGENTS.md                     # context Bob reads every conversation (tools look for it at the root)
├── README.md                     # the project's own README; points here
├── sonar-project.properties      # SonarQube analysis scope, when SonarQube is the scanner (CODEOWNERS: appsec)
├── .bob/                         # Bob reads these from the root
│   ├── custom_modes.yaml         # 🧭 Navigator · 🎼 Conductor · 📐 Architect · 🏗️ Builder · 🔐 Check Runner · 🔍 Verifier · 🛡️ Security
│   ├── settings.json             # lifecycle hooks → sdd/scripts/bob-hook.mjs
│   ├── mcp.json                  # Playwright and SonarQube (read-only) MCP servers
│   ├── rules/ · rules-<mode>/    # rules for all modes and per mode
│   ├── commands/                 # /sdd-* slash commands
│   └── skills/                   # domain-rules, security-review, carbon-ui, ears-requirements, … (industry-agnostic)
├── .github/                      # GitHub reads these from the root (sdd/docs/GITHUB.md):
│   ├── workflows/                # sdd-gates (sdd-policy · signoffs · sonarqube) · sdd-signoff (comment sign-offs)
│   │                             # bob-review (Bob's advisory review) · bob-commands (/bob review, /bob fix) · promote-to-test
│   ├── actions/run-bob/          # runs Bob Shell headless in one mode, cost-capped, with trusted config
│   ├── ISSUE_TEMPLATE/           # feature request · change request forms
│   ├── pull_request_template.md  # Bob's /create-pull-request uses it
│   └── CODEOWNERS
└── sdd/                          # ← everything spec-driven
    ├── README.md                 # this guide
    ├── specs/
    │   ├── 00-constitution.md    # non-negotiables + configuration knobs (brand, currency, locale…)
    │   ├── 01…05-*.md            # vision, architecture, domain & ledger, API guidelines, design system
    │   ├── nfr/                  # security, performance & reliability, a11y & i18n, observability & privacy
    │   ├── features/F00…F11/     # spec.md (F00 also plan.md + tasks.md as the worked example)
    │   ├── 90-testing-strategy.md · 91-seed-data.md · 92-delivery-plan.md
    │   ├── change-requests/      # CR workflow
    │   └── templates/            # spec, plan, tasks, CR, scan, verification & security report, ADR
    ├── contracts/                # openapi.yaml · error-codes.md · domain-events.md
    ├── adr/                      # 0001–0009
    ├── design/                   # screen inventory, user flows + demo script, wireframes, content guide
    ├── traceability/matrix.md    # generated
    ├── reports/                  # scan/ (scan evidence, machine-written), verification/, security/
    ├── workflows/                # feature-delivery · change-request · phase-gate (+ prompts/ for Bob on GitHub)
    ├── governance/               # approvers.json (who, channel) · policy.json (risk tiers: the automation dial) · checks.json (security checks: what runs where) · dependency-denylist.json · secrets-allowlist.json · allowed_signers · github/
    ├── docs/                     # SDLC · LABS · ROLES · CUSTOMIZE · CI · GITHUB · SONARQUBE · WHICH-MODE · samples
    ├── ci/                       # the gate for Jenkins, Azure DevOps, GitLab and any shell (ci.mjs)
    ├── scripts/                  # state, workflow, step guard, approve, policy, secrets, checks, ci, scan, evidence, Bob hook, git-check, validator
    │   ├── github/               # comment sign-offs, their verification, Bob-in-Actions helpers (run only in Actions)
    │   └── hooks/                # pre-commit (security checks) + commit-msg (rules G1–G10); git config core.hooksPath sdd/scripts/hooks
    ├── tests/github-e2e/         # runs the GitHub workflows end to end on a local stand-in for GitHub and Bob
    ├── tests/terminal/           # self-test of the terminal path: roles, four-eyes, forged sign-offs, secrets, locked gates
    ├── tests/checks/             # self-test of the security checks: Bob's hook, pre-commit, scan, an organisation tool, CI
    └── state/                    # approvals.json (committed; written only by a verified sign-off); local step state
```

## Who does what
Bob writes; people decide and sign. **Business owner:** signs plans, phase gates and change requests.
**Business analyst:** owns the requirements, answers clarify questions, writes change requests, runs the
demo. **Architect:** shapes and reviews every plan. **Developer:** drives Bob through build, scan and
tests. **AppSec:** owns the security checks (`checks.json`, the scanner's gate) and accepted risk. The step-by-step table (who does, who signs,
who is consulted) is in **[sdd/docs/ROLES.md](docs/ROLES.md)**; CODEOWNERS makes the same people review the
pull requests.

## Keeping people in the right mode
People pick the wrong mode; the pack is built so that doesn't matter. Full human guide:
**[sdd/docs/WHICH-MODE.md](docs/WHICH-MODE.md)**.

| Layer | How | Effect |
|---|---|---|
| Front door | Bob's built-in **Agent**, **Plan** and **Ask** are overridden (same slug) as read-only routers; Agent becomes **🧭 SDD Navigator**, the mode Bob opens in | Any request in a built-in mode is routed, not executed |
| Context | `UserPromptSubmit` hook (`.bob/settings.json`) injects `[SDD STATE]` — phase, active step, expected mode, next action — into every prompt | Every mode knows where the cycle is; replies start with an orientation line |
| Who | Per-mode `fileRegex` | Builder can't touch specs, Architect can't touch code, … |
| When | Each step command runs `sdd/scripts/step.mjs start <step> <F##> --mode <slug>`; the `PreToolUse` hook denies writes outside the active step | No coding before an approved plan, no testing before a passing external scan, no writes without a step |
| Workflows | `sdd/workflows/*.json` define each step's kind (🤖 AI · ⚙️ check · ✍️ sign-off), mode and command; `lib.mjs` derives the step table from them; `/sdd-workflow` walks them | One definition drives Bob, the terminal, GitHub and the Atlas |
| Humans | Sign-offs with `approve.mjs` in a terminal (checked by the pipeline against the signer's commit) or as pull-request comments (`/approve-plan F04`), recorded by `.github/workflows/sdd-signoff.yml` after checking `sdd/governance/approvers.json` on the default branch (or `approve.mjs` in a terminal where allowed); hash-bound records in `sdd/state/approvals.json`; a plan sign-off also locks the feature's `spec.md` | Bob can't sign; editing an approved plan **or its spec** voids the sign-off; every sign-off traces to a person's comment |
| Backstop | `sdd/scripts/hooks/pre-commit` (the security checks) + `sdd/scripts/hooks/commit-msg` (rules G1–G10, secrets included) + `node sdd/scripts/ci.mjs pr` in any pipeline (`sdd/ci/`) or `.github/workflows/sdd-gates.yml` on every push and pull request (`sdd-policy`, `signoffs` re-verifies each sign-off against its comment, `sonarqube`) + `promote-to-test` + `CODEOWNERS` + the `sdd-main` ruleset (+ optional `sdd/docs/github-push-ruleset.sample.json`) | Catches manual edits, other tools and `--no-verify` as soon as they are pushed; a direct push to `main` that breaks the rules turns it red and is never deployed; G9 rejects changes to approved specs, foundation specs, NFRs or the contract that don't cite an approved change request |
| Security scan | `sdd/scripts/scan.mjs` (the checks in `sdd/governance/checks.json`, or SonarQube quality gate + CVEs) → `sdd/reports/scan/F##.json`; the same checks in Bob's hook and the pre-commit hook; CI job `sdd-gates / sonarqube`; `promote-to-test` workflow | Security problems are found by a tool Bob doesn't control before anything reaches testing (Article XI) |
| Org | `sdd/docs/enterprise-policy.sample.json` (`EnforcedHooks`, `DisabledAutoApprovalGroups: mode`) | Users can't remove the hooks; every mode switch is a visible click |
| Bob on GitHub | `bob-review.yml` runs 🔎 SDD PR Reviewer headless (read-only, cost-capped) on every ready pull request; `/bob fix F04 …` runs 🏗️ Spec Builder inside F04's implement step, and plain code re-checks the commits before pushing | Advisory reviews on every change; fixes on request without giving Bob a push token or a vote |

Bob's hook payload doesn't include the active mode, so the hooks enforce the workflow *state*,
while `fileRegex` enforces *who* edits *what*; a change only succeeds when the right mode runs the
right step.

## Security checks — as early as possible, and always before testing
Shift left: each check runs while Bob writes (Bob's hook), at commit (the pre-commit hook), before testing and
again in the pipeline. What runs where, and which tools, is set in `sdd/governance/checks.json`: built-in checks
that need only Node, plus your organisation's tools (IBM detect-secrets, HashiCorp Vault Radar, a Bob Shell review,
…). See **[sdd/docs/CHECKS.md](docs/CHECKS.md)** · decision: [ADR-0010](adr/0010-pluggable-security-checks.md).

Per feature the loop is **implement → scan → verify → secure**. `/sdd-scan F##` (🔐 Check Runner) runs
`sdd/scripts/scan.mjs`. With `"scanner": "builtin"` (the default) the configured checks give the verdict. With
`"scanner": "sonarqube"`: SonarQube analysis with `sonar.qualitygate.wait=true` against the **Tidewell Bank**
quality gate, dependency CVEs via SonarQube Advanced Security or OSV-Scanner (`SCA_PROVIDER` knob), and —
optionally — Bob's own review imported into SonarQube as SARIF (`--with-bob-review`). The result is
bound to a fingerprint of the production code; verify and secure are refused until it is a fresh PASS.
Bob reads SonarQube through a **read-only** MCP server and can't mark anything safe. Setup:
**[sdd/docs/SONARQUBE.md](docs/SONARQUBE.md)** · decision: [ADR-0009](adr/0009-external-security-scan-sonarqube.md).

## Quick start with IBM Bob (IDE)
1. **Prerequisites:** IBM Bob IDE — **v2.0.2 or later** (earlier versions are affected by CVE-2026-9764,
   remote code execution via workspace-defined MCP servers; keep Bob current), Node.js LTS (≥ 22.12),
   pnpm (via `corepack enable`), Docker (Postgres, Mailpit), Git. Optional: a SonarQube project, if you make
   SonarQube the scanner (see sdd/docs/SONARQUBE.md).
2. `git init && git config core.hooksPath sdd/scripts/hooks && git add . && git commit -m "chore(SDD): spec pack"`
   (the hooks path switches on both git hooks: pre-commit runs the security checks, commit-msg the commit rules).
3. Open the folder in Bob (**File → Open Folder**), then reload the window so Bob picks up
   `.bob/custom_modes.yaml`, rules, commands, skills and `mcp.json`.
4. Check **Settings → Modes** (🧭 SDD Navigator replaces Agent; 6 SDD modes), **Settings → Hooks**
   (UserPromptSubmit + PreToolUse), **Settings → Skills** (8) and **Settings → MCP** (playwright,
   sonarqube — needs `SONAR_HOST_URL` and `SONARQUBE_READONLY_TOKEN` exported before Bob starts).
   Type `/` in chat to see the `/sdd-*` commands. In Auto-Approve, keep **mode** switching manual.
5. Validate the pack: `node sdd/scripts/validate-specs.mjs --trace` → should print `✔ spec check passed`.
6. Put the people in `sdd/governance/approvers.json` (git emails and roles; for a solo training repository give
   yourself every role and set `"trainingMode": true`), and look at the automation dial:
   `node sdd/scripts/policy.mjs show`. Plug `node sdd/scripts/ci.mjs pr` into your pipeline (**[CI.md](docs/CI.md)**),
   or use the GitHub path (**[GITHUB.md](docs/GITHUB.md)**, `"approvalChannel": "github"`).
7. Run `/sdd-workflow F00` (or ask the Navigator "what's next?"). The answer is your first human gate: the
   business owner reviews `sdd/specs/features/F00-foundation/plan.md` and signs it —
   `node sdd/scripts/approve.mjs plan F00` in a terminal, committed on its own (or `/approve-plan F00` on the pull
   request on the GitHub path). Nothing ships pre-approved.
8. Switch to **🎼 SDD Conductor** and run **`/sdd-prototype`**. Bob builds Phase 0 (foundation)
   and stops at each human gate:
   - **plan approval** for every feature (F01–F11),
   - **phase gates** listed in `sdd/specs/92-delivery-plan.md` (you fill in the approval table),
   - any **change request** it raises.

Prefer step-by-step control? Run the loop yourself per feature:
`/sdd-clarify F01` → `/sdd-plan F01` (approve) → `/sdd-tasks F01` → `/sdd-implement F01` →
`/sdd-scan F01` → `/sdd-verify F01` → `/sdd-secure F01`.

### Approval settings
Start with manual approval for file writes and commands. Once Phase 0 is green you can
auto-approve reads, skills and test commands; keep **writes in `sdd/specs/`, `sdd/contracts/`, `.bob/`
and git pushes** on manual approval.

### Bob Shell (headless) examples
`bob run` needs `BOB_API_KEY` and pre-approves tools, so cap it and keep the hooks on (`--trust` loads the
workspace hooks). GitHub Actions uses the same form (`.github/actions/run-bob`).
```bash
# Status report
bob run --mode sdd-conductor --trust --max-cost 1 --format json "Follow .bob/commands/sdd-status.md and print the report"
# The advisory review GitHub runs, on your branch
git diff main...HEAD > .sdd-ci/pr.diff
bob run --mode sdd-pr-reviewer --trust --max-cost 3 --disable-mcp "Review the change in @.sdd-ci/pr.diff following sdd/workflows/prompts/pr-review.md"
```

## Demo credentials (after seeding)
See `sdd/specs/91-seed-data.md`: e.g. `sara.haddad` / `Tidewell-Demo-2026!`, OTP `000000` in demo
mode, ops users `mina.ops` and `yusuf.sup`. The 15-minute stakeholder demo script is in
`sdd/design/user-flows.md` §5 (`/sdd-demo` rehearses it).

## Customising the prototype
All market-specific choices are **knobs in `sdd/specs/00-constitution.md` §2** — brand name, IBAN bank
code, BIC, home country, base currency (default AED, 3 decimals), business time zone, weekend,
locales (default EN + AR/RTL). Change them through a change request (`/sdd-change-request
retarget-market`) so the Spec Architect updates dependent specs consistently (seed data, IBAN
lengths, cut-offs, holidays, copy).

## Compatibility notes
- Written for **IBM Bob v2** (built-in modes Agent, Plan, Ask; custom modes with `groups`
  `read/edit/execute/mcp/skill/todo/subtask/subagent/mode`). On Bob 1.x, where the coding mode is
  called *Code*, copy `.bob/rules-agent/` to `.bob/rules-code/`, and replace `execute` with
  `command` in `.bob/custom_modes.yaml` if your version rejects it.
- `fileRegex` patterns match both workspace-relative and absolute paths.
- Shell commands are not restricted by `fileRegex`; the rules tell every mode not to use the
  shell to bypass its edit permissions, but review diffs at gates.

## Validating the pack yourself
```bash
node sdd/scripts/validate-specs.mjs                 # structure: IDs, EARS, ACs, contract cross-refs, links, Bob config
node sdd/scripts/validate-specs.mjs --trace         # + regenerate sdd/traceability/matrix.md from test tags
node sdd/scripts/validate-specs.mjs --trace --strict=P1   # gate mode: fail on uncovered P1 requirements
```
