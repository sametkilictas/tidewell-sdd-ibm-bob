# How spec-driven development fits the bank's SDLC

Tidewell Bank already has a software delivery life cycle: requirements, design, build, test, security, release,
operate. Spec-driven development does not replace it. It changes **what each phase produces** (a written,
checkable artifact instead of a conversation), **who does the writing** (Bob, in a mode limited to that phase) and
**where the checks run** (at the keyboard first, then in the pipeline). This page maps one onto the other.

## 1. Phase by phase

| SDLC phase | Before | With SDD and Bob | What it produces | Who decides |
|---|---|---|---|---|
| Requirements | a Word document, a backlog ticket | the feature spec: user stories, EARS requirements, acceptance criteria with real numbers; 📐 Bob asks up to eight questions (`/sdd-clarify`) | `sdd/specs/features/F04-…/spec.md` | business analyst writes, business owner owns |
| Design | a slide, an architecture review | 📐 Bob drafts the plan against the constitution, changes the API contract first, records decisions as ADRs (`/sdd-plan`) | `plan.md`, `sdd/contracts/openapi.yaml`, `sdd/adr/` | architect; **the business owner signs** (risk tier decides who) |
| Build | code first, tests later | 📐 Bob splits the plan into tasks, then 🏗️ Bob builds each one test-first, one commit per task, each naming its requirement IDs (`/sdd-tasks`, `/sdd-implement`) | `tasks.md`, code, tests, commits like `feat(F04): T012 … [XFER-021]` | developer |
| Security | a penetration test before go-live | **moved into build**: secrets and risky code refused as they are typed; the security checks (built-in, your organisation's tools, or SonarQube) give their verdict before any testing step; a hand review for what tools cannot see (`/sdd-scan`, `/sdd-secure`) | `sdd/reports/scan/F04.json`, `sdd/reports/security/F04.md` | developer runs; **AppSec has the final say** |
| Test | a test team after the build | 🔍 a separate Bob mode proves every acceptance criterion with a tagged test and walks the app (`/sdd-verify`) | `sdd/reports/verification/F04.md`, the traceability matrix | developer runs; **the business analyst checks** |
| Release | a change advisory board | the analyst demos the phase; **the business owner signs it**; the pipeline deploys to test automatically and asks the right people before production | phase sign-off in `sdd/state/approvals.json`; the pipeline's approval record | business owner (and AppSec for tier 1) |
| Change & operate | email, tickets | a change request with options and a recommendation; **the business owner decides**; Bob applies only what was approved (`/sdd-change-request`, `/sdd-apply-cr`) | `sdd/specs/change-requests/CR-…md` | business owner |
| Audit | collect screenshots afterwards | the evidence is the repository: `node sdd/scripts/evidence.mjs F04` assembles it | an evidence pack per feature | — |

## 2. Two loops

```
 INNER LOOP — one developer, one laptop, minutes                     OUTER LOOP — the pipeline, any CI, hours
 ┌────────────────────────────────────────────────────────────┐     ┌──────────────────────────────────────────────┐
 │ Bob writes ─► Bob's hook checks the write (step, mode,      │     │ pull request ─► ci.mjs pr: policy, specs,    │
 │ files, secrets, risky code) ─► git hooks check the commit   │ ──► │ commits G1–G10, sign-offs, secrets, tests,   │
 │ (checks + G1–G10) ─► tests ─► /sdd-scan before any testing  │     │ scan ─► merge ─► test env (automatic,        │
 │ ─► /sdd-verify ─► /sdd-secure                               │     │ gate re-checked) ─► ✍ production (people)    │
 └────────────────────────────────────────────────────────────┘     └──────────────────────────────────────────────┘
```

The inner loop catches problems while they are cheap — at the keyboard, in the same minute. The outer loop exists
because the inner loop runs on a laptop someone controls: a skipped hook (`--no-verify`), a laptop without Bob or a
hand-edited file is caught again on the server, with the same rules. **Nothing in the outer loop is new; it is the
inner loop, repeated where nobody can switch it off.**

## 3. Security, shifted left

Each class of problem has a place where it is cheapest to catch. The kit puts a check there, and again later.

| Where | What is caught | How | Who can override |
|---|---|---|---|
| While Bob writes | secrets, risky code (SQL built from strings, TLS checks off, weak hashes …), suppressed findings, edits outside the step's files, writing the scanner's verdict | Bob's hook (`sdd/scripts/bob-hook.mjs`) running the built-in checks of `sdd/governance/checks.json`; the security baseline rules every mode reads; Bob's own IDE security features and tools such as IBM Concert Secure Coder alongside | nobody: the write is refused |
| At commit | risky code, deny-listed dependencies and your organisation's commit-time tools (IBM detect-secrets, HashiCorp Vault Radar, …); secrets (G10), `NOSONAR` (G8), commits without requirement IDs (G2), changes to signed scope (G9), sign-offs mixed with code (G6) | the git hooks: pre-commit runs `checks.mjs --stage commit`, commit-msg runs `git-check.mjs` | nobody: `--no-verify` only moves the failure to the pipeline |
| Before any testing | everything the configured checks look for, on all production code; with SonarQube as the scanner also code smells, bugs, hotspots, coverage and dependency CVEs | `/sdd-scan` → `scan.mjs`, with the scanner set in `checks.json` (see [CHECKS.md](CHECKS.md)) | AppSec: a change to `checks.json` or an allowlist (reviewed), a false positive in SonarQube, or a CVE waiver with an expiry date |
| Hand review | broken access control, business-logic abuse (limits, replays), session handling, data exposure — what tools cannot see | 🛡️ Security Reviewer against OWASP ASVS level 2 (`/sdd-secure`) | AppSec decides serious findings |
| Pipeline | all of the above again, server-side | `node sdd/scripts/ci.mjs pr` | nobody |
| Test environment | running-application issues (headers, cookies, exposed endpoints) | DAST, e.g. an OWASP ZAP baseline scan against the test URL (required for tier 1 in `policy.json`; plug it into the deploy-to-test stage) | AppSec |
| Before production | that this exact commit passed the gate | `scan.mjs --gate-only --revision <sha>` | nobody |

Secrets deserve their own word: the kit's scanner (`sdd/scripts/secrets.mjs`) needs nothing installed, so it runs
everywhere — inside Bob, in the commit hook, in every pipeline. There is deliberately no inline "ignore" comment:
a value that only looks like a secret (a documented demo password) is allowed in
`sdd/governance/secrets-allowlist.json`, which only a reviewed governance change can touch.

## 4. Testing in the loop

- **Test first, per task.** Bob writes a failing test, then the smallest code that passes it, one commit per task.
- **Every test names its requirement.** Test titles carry tags like `[XFER-021]`; `validate-specs.mjs --trace`
  rebuilds the traceability matrix, so "is every requirement tested?" has a file for an answer.
- **The checker is not the builder.** 🔍 Spec Verifier is a separate mode that cannot change production code: it
  proves each acceptance criterion and walks the app, and the business analyst checks the result.
- **Testing never starts on unscanned code.** Verification and the security review refuse to start until
  the security scan has passed the code as it is now; change the code and the scan must run again.
- The strategy, pyramid and tools are in `sdd/specs/90-testing-strategy.md`.

## 5. The pipeline

| When | Stage | Command | Who acts |
|---|---|---|---|
| every pull request | the gate | `node sdd/scripts/ci.mjs pr` | nobody: it passes or blocks the merge |
| merge to `main` | deploy to test | `scan.mjs --gate-only --revision <sha>`, then your deployment | nobody: automatic |
| a phase is signed | release to production | `node sdd/scripts/ci.mjs release --phase N --env production`, then the CI tool's manual approval | the people `policy.json` names for the strictest tier in the release |

Jenkins, Azure DevOps, GitLab and GitHub versions are in [`sdd/ci/`](../ci/) and `.github/workflows/`; see
[CI.md](CI.md).

## 6. For auditors: control → mechanism → evidence

| Control | Mechanism | Evidence |
|---|---|---|
| Maker–checker / four-eyes | Bob and the developer make; a different listed person signs; the pipeline rejects a sign-off by someone who also changed the pull request | `sdd/state/approvals.json`, the sign-off commit or comment, `ci.mjs signoffs` |
| Segregation of duties | roles in `approvers.json`; who may sign depends on the risk tier; the developer can never sign plans or phases (locked) | `sdd/governance/approvers.json`, `policy.json`, `policy.mjs check` |
| Change management | signed specs are locked by hash; scope changes need a change request decided by the business owner (G9) | `sdd/specs/change-requests/`, approvals |
| Requirements traceability | commits name requirement IDs (G2); tests carry tags; the matrix is generated | `sdd/traceability/matrix.md`, git history |
| Secure development | security baseline rules, checks while Bob writes and at commit, the security scan before testing, ASVS review | `sdd/reports/scan/`, `sdd/reports/security/` |
| Vulnerability management | dependency CVEs block the scan; acceptance only by AppSec with an expiry | waivers in `approvals.json` |
| Release approval | the pipeline asks the people the policy names; tier 1 needs two different people | the CI tool's approval record, `ci.mjs release` output |
| One place to look | all of the above per feature | `node sdd/scripts/evidence.mjs F04` |
