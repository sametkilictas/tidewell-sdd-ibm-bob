# Rule 01 — Spec-driven workflow

## Per-feature loop (see `sdd/specs/92-delivery-plan.md` §1)
The loop is defined as a workflow in `sdd/workflows/feature-delivery.json` (with `change-request.json` and
`phase-gate.json`). Like a Bob workflow, each step is 🤖 **AI** (a mode does it), ⚙️ **check** (plain code
decides) or ✍️ **sign-off** (a named person decides). `/sdd-workflow F##` shows where a feature is;
`node sdd/scripts/workflow.mjs status` gives the same answer in a terminal and on GitHub.
| Step | Command | Mode | Artifact | Human gate? |
|---|---|---|---|---|
| Clarify | `/sdd-clarify F##` | 📐 Spec Architect | Clarifications log in spec.md | Yes — answers |
| Plan | `/sdd-plan F##` | 📐 Spec Architect | plan.md (Constitution check must be all ✅) | **Yes — the business owner signs** (`/approve-plan F##` on the pull request) after the analyst and architect review |
| Tasks | `/sdd-tasks F##` | 📐 Spec Architect | tasks.md | No (derived from approved plan) |
| Implement | `/sdd-implement F## [T0NN]` | 🏗️ Spec Builder | code + tests, 1 commit per task | No |
| **Scan** | `/sdd-scan F## [--with-bob-review]` | 🔐 Check Runner | sdd/reports/scan/F##.json (+ .md) from the scanner in `sdd/governance/checks.json` (checks, or SonarQube + SCA) | No — but **nothing reaches testing without a PASS** (Article XI) |
| Verify | `/sdd-verify F##` | 🔍 Spec Verifier | sdd/reports/verification/F##.md, matrix | No |
| Secure | `/sdd-secure F##` | 🛡️ Security Reviewer | sdd/reports/security/F##.md | No |
| Phase gate | (Conductor) | 🎼 SDD Conductor | checklist in 92-delivery-plan.md | **Yes — the business owner signs** (`/approve-phase N`) after the analyst runs the demo |
| Change request | `/sdd-change-request <slug>` → `/sdd-apply-cr CR-###` | any → 📐 Spec Architect | CR file → spec edits | **Yes — the business owner decides** (`/approve-cr CR-### option A` or `/reject-cr`) |

Every step command starts with `node sdd/scripts/step.mjs start …` and ends with `… finish`; the Bob
hooks block writes outside the active step (rule 06). Human sign-offs live in `sdd/state/approvals.json`;
`sdd/governance/approvers.json` says who may give each one and whether they are given as GitHub pull-request
comments (the default) or in a terminal with `approve.mjs`. The [SDD STATE] block always shows the right form.

**Scan gate.** Verify (= promotion to testing) and Secure are refused until the security scan (the checks in
`sdd/governance/checks.json`, or SonarQube when it is the scanner) has passed the *current* production code (`sdd/reports/scan/F##.json`, written only by
`sdd/scripts/scan.mjs`). Any later production change makes that evidence stale → re-scan. A FAIL
goes back to 🏗️ Spec Builder; accepting risk is a human decision by AppSec (a reviewed `checks.json`/allowlist change,
the SonarQube UI, or a risk sign-off `/accept-risk …`). The same checks also run on every write (Bob's hook) and every
commit (pre-commit hook): fix what they refuse, never route round them.

`/sdd-prototype` runs the whole plan through the 🎼 SDD Conductor. `/sdd-status` reports progress.

## On GitHub
Each phase runs on one draft pull request (`phase/<n>-<slug>` → `main`). Every push re-runs `sdd-policy`,
`signoffs` (each sign-off checked against the comment that gave it) and `sonarqube`. Bob reviews ready pull
requests in the read-only 🔎 SDD PR Reviewer mode (advisory), and a developer can comment `/bob fix F## …` to
have Bob push fixes inside the implement step's scope. Bob never pushes from the IDE and never signs.

## Mode discipline
- Slash commands cannot switch modes. If a command expects a different mode, switch to it
  (you have the `mode` tool) or ask the user to switch, then continue.
- Each mode's edit permissions are enforced by `fileRegex`. Shell commands are **not**
  restricted by fileRegex — do not use the shell to write files your mode may not edit.

## Change requests and the spec lock
Once a human approves a feature's plan, that approval also locks the feature's `spec.md`. From then
on `/sdd-clarify` and `/sdd-plan` refuse, and every change to the spec, the plan, a foundation spec, an
NFR, or the contract/ADRs/design (outside planning a not-yet-approved feature) goes through a CR:
`/sdd-change-request` → the business owner decides (`/approve-cr`) → 📐 `/sdd-apply-cr` → the plan is signed again.
Commits that apply a CR are `spec(CR-###): …`; git rule G9 rejects approved-scope changes without one.
Raise one (`/sdd-change-request <slug>`) whenever a spec is ambiguous in a way that changes
behaviour, contradictory, infeasible, or when a better approach exists. Then **stop that thread
of work** until a human decides. Purely presentational choices inside the Carbon system do not
need a CR — note them in the commit message.

## Working style
- Keep a to-do list (todo tool) mirroring the current tasks.md group.
- Small steps: run the relevant tests after every meaningful edit; run `pnpm verify` before
  marking a feature done.
- When you finish a step, state: what changed (files), which requirement IDs advanced, test
  results, and the next step.
- Prefer subagents (Explore) for broad codebase searches to keep the main context clean.
