# Lab guide — spec-driven delivery with IBM Bob at Tidewell Bank

Nov 23, 2026 · @Samet

## Overview

Tidewell Bank is a fictional UAE retail bank (AED, English and Arabic). Its online banking is fully specified — 12 features, 212 requirements, 287 acceptance criteria — and IBM Bob builds it, one step at a time. In this lab a pair of people runs the bank's delivery cycle for real: a written spec, a signed plan, test-first code, security checks while Bob writes, at commit and before testing, proof that every example works, a pipeline that repeats every check, and a release decision. **Bob builds. People approve. Checks verify.**

The bank is only the example. Bob's modes, rules, commands and skills, the scripts and the governance files are industry-agnostic: everything about the bank lives in the specs, with the rules Bob must never break in `sdd/specs/domain/`. The lab is written for IBM Bob V2 — Bob IDE 2.x, whose built-in modes are Agent, Plan and Ask, and Bob Shell 2.x.

```
 Clarify ─► Plan ─► ✍ Approve plan ─► Tasks ─► Implement ─► Scan ─► Verify ─► Secure ─► ✍ Approve phase
 analyst    architect  business owner   architect  developer   checks    developer developer  analyst demo, owner signs
   Bob        Bob                         Bob     Bob, test-first (verify)  Bob      Bob
                                                     ▲                         │
                                                     └──── anything that fails goes back to Build
```

Blue: Bob writes. Amber: a person decides. Green: the checks verify. A failed scan, a failed verification or a serious security finding sends the feature back to Build as a fix task. Everything in the picture runs on the laptop (the *inner loop*); the pipeline then runs the same checks again (the *outer loop*), and people approve the release.

**What you will see**

- How the bank's SDLC and spec-driven development fit together: every phase leaves a file anyone can check.
- Who does what: Bob is the *maker*, people are the *checkers*, and the checks *verify* — built-in ones and your organisation's own tools.
- The automation dial: what runs by itself and what a person must decide, per risk tier — and what cannot be configured away.
- Security at the keyboard: secrets, risky code and compromised libraries are caught while Bob writes and at commit, then again before testing and in the pipeline — and how to plug in your organisation's tools, such as IBM detect-secrets.
- The pipeline: one gate command in any CI — Jenkins, Azure DevOps, GitLab or GitHub Actions.
- Evidence: an auditor's view of a feature, generated from the repository.

**Format.** Pairs, one laptop each. **Partner A** plays the developer, the architect and the business analyst, and drives Bob. **Partner B** plays the business owner and AppSec, and signs. Working alone? Lab 0 shows the training setting that lets one person hold every role.

| Lab | What you do | Whose turn | Time |
| --- | --- | --- | --- |
| 0 | Set up: the kit, the people, hooks, the security checks, Bob | A, with B | 30 min (+15 on GitHub) |
| 1 | Read the map: where the project is and whose turn it is | both | 15 min |
| 2 | The automation dial: risk tiers and locked human gates | B (as AppSec) and A | 20 min |
| 3 | The first sign-off: maker and checker | B signs, A tries | 20 min |
| 4 | Build F00 test-first | A + Bob | 45 min live + unattended |
| 5 | Security at the keyboard: secrets, risky code, the scan, a fix loop, plugging in IBM detect-secrets | A, B as AppSec | 50 min |
| 6 | Prove it: verification, security review, the evidence pack | A + Bob, B checks | 30 min |
| 7 | The pipeline: the same gate in any CI, and the release decision | both | 30 min |
| 8 | Close the phase; change a signed spec through a change request | B decides, A applies | 30 min |
| 9 | Turn the dial: let Bob drive a low-risk feature | A, B approves the change | 20 min |
| 10 | Guardrail drills: try every shortcut | both | 20 min |

Allow a full day with breaks. Lab 4 is the long one: F00 has 31 tasks, so you build two groups live and let Bob finish the rest while you continue (the facilitator notes explain how to pre-bake it).

## Choose your path

One setting decides how people sign: `"approvalChannel"` in `sdd/governance/approvers.json`. Everything else — the specs, Bob's modes, the guardrails, the gate — is the same on both paths.

|  | **Terminal path** (default) | **Public GitHub path** |
| --- | --- | --- |
| Use it when | your git host has no GitHub Actions (many GitHub Enterprise installations), or you use GitLab, Bitbucket, Azure Repos, or just a laptop | your repository is public on github.com, where Actions are free |
| Sign-offs | `node sdd/scripts/approve.mjs plan F00`, committed on its own by the signer | a comment on the pull request: `/approve-plan F00` |
| Who you are | your git email, listed in `approvers.json` | your GitHub login, listed in `approvers.json` |
| The pipeline | `node sdd/scripts/ci.mjs pr` in your CI (Jenkins, Azure DevOps and GitLab files are in `sdd/ci/`), or on a laptop | the workflows in `.github/workflows/`, plus Bob reviewing pull requests |
| Setting | `"approvalChannel": "terminal"` | `"approvalChannel": "github"` |

Your enterprise GitHub without Actions is still GitHub: pull requests, code review, code owners and branch protection all work. Only the automation moves to your own CI. Steps marked **Both paths** are the same everywhere; **Terminal path** and **GitHub path** sit side by side where they differ.

## Prerequisites

| What | Why |
| --- | --- |
| IBM Bob IDE 2.0.2 or later | the modes, hooks, commands and skills in `.bob/` |
| Node.js 22, git | every script in the kit is plain Node, the security checks included; no packages to install |
| A shared git remote (any host), or one laptop per pair | B signs on their own clone, or on A's laptop as themselves |
| GitHub path only: a github.com account and the `gh` CLI | a public repository, Actions, sign-off comments |
| Optional: Python 3 and pip | Lab 5f plugs in IBM detect-secrets |
| Optional: Docker, or a SonarQube server | only if your organisation makes SonarQube the scanner (`sdd/docs/SONARQUBE.md`) |

**Tokens live in your shell, never in a file.** The secret checks would refuse the commit anyway (rule G10). The labs need no token; these are only for SonarQube as the scanner:

```bash
export SONAR_HOST_URL="http://localhost:9000"
export SONAR_TOKEN="…"                 # analysis token: scan.mjs
export SONARQUBE_READONLY_TOKEN="…"    # a Browse-only user: Bob's SonarQube MCP server
```

## Lab 0 — Set up

**Goal:** a repository with real people in it, the local checks switched on and Bob loaded. **Whose turn:** partner A at the keyboard, B alongside.

### 0a. Both paths: get the kit

1. Clone the repository (git clone https://github.com/sametkilictas/tidewell-sdd-ibm-bob.git), or unzip the kit and run `git init -b main` in it. Then `cd tidewell-sdd-ibm-bob`.
2. If your room uses SonarQube as the scanner and several pairs share one server, give yours its own key now: `sonar.projectKey=tidewell-bank-pair07` in `sonar-project.properties`.

### 0b. Both paths: write down who may sign

3. Open `sdd/governance/approvers.json` and replace the `REPLACE_ME_` people with the two of you. On the terminal path the **email** must be each person's `git config user.email`; on the GitHub path the **key** is their GitHub login.

```json
"people": {
  "ali-dev":   { "name": "Ali (A)", "email": "ali@bank.example", "roles": ["developer", "architect", "business-analyst"] },
  "bea-owner": { "name": "Bea (B)", "email": "bea@bank.example", "roles": ["business-owner", "appsec"] }
}
```

4. **Working alone?** List yourself once with every role and set `"trainingMode": true` under `"rules"`. The checks still run; you may sign your own work, and every pipeline run warns that this is a training repository.
5. **GitHub path only:** set `"approvalChannel": "github"`, and in `.github/CODEOWNERS` make B the code owner.

### 0c. Both paths: switch the checks on and make the first commit

```bash
git config core.hooksPath sdd/scripts/hooks          # commit rules G1–G10, secrets included
git add -A && git commit -m "chore(SDD): spec pack"  # SDD policy: initial import commit — skipped.
node sdd/scripts/validate-specs.mjs                  # ✔ spec check passed
node sdd/scripts/policy.mjs check                    # ✔ policy check passed: every locked human gate is in place
```

From now on `sdd/governance/`, `sdd/scripts/`, `.bob/` and `sdd/workflows/` are protected: changing them needs a `chore(SDD): …` commit and the code owners' review (rule G7).

### 0d. Terminal path: share the repository

6. Create an empty repository on your git host — your enterprise GitHub is fine, Actions are not needed — then `git remote add origin <url> && git push -u origin main`. B clones it.
7. Protect `main` on the host: pull requests with one approving review and code-owner review; no force pushes. (Lab 7 adds the CI status check.)
8. One laptop per pair is fine too: B will sign on A's laptop with `--as <B's email>` and commit as themselves.

### 0e. GitHub path: the public repository

```bash
gh repo create <you>/tidewell-sdd-ibm-bob --public --source . --remote origin --push
gh api 'repos/{owner}/{repo}/actions/permissions'     # must say "enabled": true — if not, turn Actions on first
bash sdd/governance/github/setup.sh                    # ruleset sdd-main, labels, token defaults
gh secret set SONAR_TOKEN; gh secret set SONAR_HOST_URL
gh api -X PUT 'repos/{owner}/{repo}/collaborators/<B-login>' -f permission=push
```

### 0f. Both paths: the security checks and Bob

9. Run `node sdd/scripts/checks.mjs --list`: the built-in checks (secrets, risky code, dependencies) run in Bob's hook, at commit and before testing, with nothing to install. Using SonarQube as the scanner? Set it up now (`sdd/docs/SONARQUBE.md`) and export the variables above **in the shell you start Bob from**.
10. Open the folder in IBM Bob (V2) and reload the window. When Bob asks, **trust the folder**: Bob V2 loads a workspace's modes, rules and hooks only in trusted folders. Check: **Settings → Modes** shows 🧭 SDD Navigator and the SDD modes; **Settings → Hooks** shows the SDD hooks.

**Checkpoint:** spec check and policy check green; `/sdd-scan` appears when you type `/` in Bob; on the terminal path B has a clone (or a seat at A's laptop); on the GitHub path the ruleset is listed under **Settings → Rules** and `gh run list --limit 3` shows **sdd-gates** runs for the push.

## Lab 1 — Read the map

**Goal:** know, at any moment, where the project is, whose turn it is and what comes next. **Whose turn:** both. **Path:** both.

```bash
node sdd/scripts/state.mjs                # ▶ F00  0  awaiting-plan-approval  HUMAN → business owner runs: node sdd/scripts/approve.mjs plan F00
node sdd/scripts/workflow.mjs status F00  # the nine steps for F00: done, current, waiting
node sdd/scripts/policy.mjs show          # the automation dial: three risk tiers and the features in each
```

1. In Bob, pick **🧭 SDD Navigator** and ask *"what's next?"*. It gives the same answer as `state.mjs`: the first move belongs to a person, not to Bob.
2. Open the **Tidewell SDD Atlas** and walk *The loop*: for each step, read *Whose turn*, *What Bob does* and *Final say*. Use *Show your part* to highlight your role's steps.
3. In the Atlas, open *SDLC + SDD* and find where your bank's current requirements, design, test and security phases sit in the loop.

**Checkpoint:** each partner can answer, for F04 Transfers: what is its risk tier, who signs its plan, and may Bob drive it on its own? (Tier 1; the business owner only; no — one step at a time.)

## Lab 2 — The automation dial

**Goal:** see which decisions the bank keeps for people, which run by themselves, and what cannot be configured away. **Whose turn:** B, as AppSec, owns the dial; A tries to change it. **Path:** both.

1. Compare a critical feature with a standard one:

```bash
node sdd/scripts/policy.mjs show F04   # tier 1: plan by the business owner, hand security review required, Bob one step at a time, release by business owner AND AppSec
node sdd/scripts/policy.mjs show F02   # tier 3: plan by the business owner or the architect, security review optional, Bob may drive
```

2. Talk it through: why does a dashboard (F02) get a lighter process than transfers (F04)? Who in your bank would make that call?
3. A tries to weaken a locked gate. In `sdd/governance/policy.json`, add `"architect"` to tier 1's plan approvers, then run the check:

```bash
node sdd/scripts/policy.mjs check
# ✖ Locked: tier 1 plan sign-off must be the business owner only (it is business owner or architect).
```

4. Try to commit it anyway: `git commit -am "chore: let architects sign"` is refused with *G7 governance files changed … use scope SDD and get CODEOWNERS review*. Even as `chore(SDD): …` the pipeline's `policy` stage would fail, and the code owners would have to approve it. Put it back: `git checkout -- sdd/governance/policy.json`.
5. Open the Atlas page *Automation dial* → *Try changing it*: flip settings and watch the same locked rules appear.

**Checkpoint:** you can name the three kinds of control — an **automated check** (the same every time, never skipped), a **human review** (advice), a **human approval** (a decision on the record) — and give one locked gate.

## Lab 3 — The first sign-off: maker and checker

**Goal:** see that the person who builds is never the person who approves, and that the pipeline can tell. **Whose turn:** B, the business owner, signs; A tries first. **Path:** both, each its own way.

### 3a. Terminal path

1. A starts the phase branch and tries to sign the F00 plan:

```bash
git switch -c phase/0-foundation
node sdd/scripts/approve.mjs plan F00
# ✖ Ali (A) (developer, architect, business-analyst) cannot give this sign-off. F00 is risk tier 2 (Sensitive). It needs: business owner …
```

2. A pushes the branch: `git push -u origin phase/0-foundation`.
3. B reads `sdd/specs/features/F00-foundation/spec.md` and `plan.md` (in Bob's 🔎 SDD PR Reviewer mode, or on the git host), then signs on their own clone, typing `F00` to confirm:

```bash
git fetch && git switch phase/0-foundation
node sdd/scripts/approve.mjs plan F00
# ✔ Recorded in sdd/state/approvals.json as Bea (B) <bea@bank.example>. Commit it on its own, as yourself:
git add sdd/state/approvals.json && git commit -m "chore(SDD): approve plan F00" && git push
```

On A's laptop instead: `node sdd/scripts/approve.mjs plan F00 --as bea@bank.example`, then the commit command it prints, which commits as B.

4. A pulls and runs the pipeline's sign-off check on the laptop: `node sdd/scripts/ci.mjs signoffs` → ✔.
5. **Forgery drill.** A writes a sign-off into `sdd/state/approvals.json` by hand (copy B's record to `F01`), commits it alone and runs `node sdd/scripts/ci.mjs signoffs`:

```text
✖ plan F01: Ali (A) (developer, architect, business-analyst) may not give this sign-off; it needs business-owner
```

Undo it: `git reset --hard HEAD~1`.

### 3b. GitHub path

1. A pushes `phase/0-foundation` with an empty commit (`git commit --allow-empty -m "chore: start phase 0"`) and opens a draft pull request: `gh pr create --draft --fill`.
2. A comments `/approve-plan F00` in the **Conversation** tab. Within about 20 seconds a 👀 reaction appears; a minute later the workflow refuses: A is not the business owner, and nobody signs their own pull request.
3. B reads the spec and plan, then comments `/approve-plan F00`. The workflow checks B against `approvers.json` on `main`, commits the sign-off on its own and answers **✔ Signed by Bea (@bea-login)**. A runs `git pull`.

**Checkpoint:** `node sdd/scripts/state.mjs` shows F00 as **implementing (0/31)** with Bob's next step; `git log -1` shows the sign-off commit by B, and nothing else in it.

## Lab 4 — Build F00 test-first

**Goal:** watch Bob build in small, traceable steps: a failing test, the code that passes it, one commit per task naming its requirement. **Whose turn:** the developer (A) with 🏗️ Spec Builder; the developer reviews every write. **Path:** both.

F00 Foundation has 31 tasks in seven groups: A workspace · B domain (money in fils, AE IBANs, the Saturday–Sunday business calendar) · C infrastructure · D API platform · E contracts and web shell · F quality gates · G close-out.

1. In Bob, switch to **🏗️ Spec Builder** and run `/sdd-implement F00 A`. Bob starts the step, then for each task writes a test that fails, the smallest code that passes it, and commits it as `feat(F00): T001 … [FND-001]`.
2. Approve or reject each write as Bob asks. Ask Bob *why* a test looks the way it does: the answer should point at an acceptance criterion.
3. Run `/sdd-implement F00 B` and look at the money tests: amounts are integers in fils, AED has two decimals, KWD and BHD exercise the three-decimal path.
4. Let Bob finish the remaining groups while you carry on: `/sdd-implement F00` (all open tasks).
5. **Drill:** change a file under `apps/` yourself and commit it as `git commit -am "feat: quick fix"`. The hook refuses: *G2 code changes need a feature scope like feat(F04): … · G2 add the requirement IDs this commit satisfies, e.g. \[XFER-021\]*. Undo with `git checkout -- .`.

**Checkpoint:** `git log --oneline` shows one `feat(F00): T0NN … [FND-…]` commit per task; `node sdd/scripts/state.mjs` shows **implementing (n/31)**, then **needs-scan** — testing cannot start until the security checks have passed the code.

## Lab 5 — Security at the keyboard

**Goal:** find security problems where they are cheapest — while Bob writes and at commit — see each one caught again later, and plug in your organisation's own tool. **Whose turn:** the developer (A); B decides as AppSec. **Path:** both.

### 5a. A secret, three times

1. While the implement step is running, ask Bob: *"Put our AWS key AKIAIOSFODNN7EXAMPLE in apps/api/src/config/aws.ts."* Bob's hook refuses the write: *That write contains what looks like an AWS access key (aws-access-key). Secrets never go in the repository: read it from the environment instead.*
2. Do it by hand and try to commit:

```bash
printf 'export const key = "AKIAIOSFODNN7EXAMPLE";\n' > apps/api/src/aws.ts
git add apps/api/src/aws.ts && git commit -m "feat(F00): T010 config [FND-004]"
# ✖ G10 no secrets in commits: apps/api/src/aws.ts looks like an AWS access key …
```

3. Skip the hooks with `--no-verify`: the commit lands. Now run what the pipeline runs: `node sdd/scripts/ci.mjs secrets` → ✖. The merge would be blocked. Undo it: `git reset --hard HEAD~1`.

### 5b. Risky code, refused as it is written

4. Ask Bob: *"Add a statement search that builds its query as "SELECT \* FROM statements WHERE ref = '" + q + "'"."* Bob's hook refuses: *That write builds SQL from strings (sql-string). Fix: pass values as parameters (the query builder, or $1 placeholders).* Ask for parameters instead: the write goes through. The same built-in check runs again at commit and before testing.
5. Ask Bob to add `// NOSONAR` to a line it wrote. Refused: *Suppressing SonarQube findings in code (NOSONAR / sonar.issue.ignore) is not allowed.* A false positive is AppSec's decision, recorded in a reviewed change — never a comment in the code.

### 5c. A compromised library, refused at commit

6. The pre-commit hook runs the commit checks. Add a package version on the bank's deny-list (`sdd/governance/dependency-denylist.json`, owned by AppSec) and try to commit:

```bash
mkdir -p apps/lab-dep && printf '{ "name": "lab-dep", "dependencies": { "event-stream": "3.3.6" } }\n' > apps/lab-dep/package.json
git add apps/lab-dep && git commit -m "feat(F00): T011 streams [FND-005]"
# ✖ dependencies  … event-stream@3.3.6 is on the bank's deny-list — compromised release (2018) …
git reset -q && rm -r apps/lab-dep
```

### 5d. The scan before testing

7. Switch to **🔐 Check Runner** and run `/sdd-scan F00`. `scan.mjs` runs the checks set in `sdd/governance/checks.json` over all of F00's code and writes the verdict, bound to the exact code. Bob explains the findings; it cannot write the verdict or change the checks. (If your organisation makes SonarQube the scanner, the same command asks its quality gate.)
8. Read `sdd/reports/scan/F00.md`, then commit the evidence: `git add sdd/reports/scan && git commit -m "docs(F00): scan report"`.

### 5e. Fail, fix, scan again

9. On a throwaway branch, plant something a check flags — by hand, since Bob would refuse it — and scan:

```bash
git switch -c lab/seeded-vuln
printf 'export const run = (code: string) => eval(code);\n' > apps/api/src/lab-unsafe.ts
node sdd/scripts/scan.mjs F00     # FAIL: risky-code — runs code built from a string (eval)
node sdd/scripts/state.mjs        # F00: scan-failed → back to implement, as a T0NN-fix task
```

10. Clean up and see freshness at work:

```bash
rm apps/api/src/lab-unsafe.ts && git switch - && git branch -D lab/seeded-vuln
node sdd/scripts/state.mjs        # F00: scan-stale — the code no longer matches the last scan
node sdd/scripts/scan.mjs F00     # PASS again
git add sdd/reports/scan && git commit -m "docs(F00): scan report"
```

### 5f. Plug in your organisation's tool: IBM detect-secrets

11. A installs IBM's open-source secret scanner and records an audited baseline of what is already in the repository:

```bash
pip install --upgrade "git+https://github.com/ibm/detect-secrets.git@master#egg=detect-secrets"
detect-secrets scan --update .secrets.baseline   # record every candidate secret in a baseline
detect-secrets audit .secrets.baseline           # mark each: a real secret (remove and rotate it) or a documented fake
```

12. B, as AppSec, switches it on: in `sdd/governance/checks.json` set `"enabled": true` for `ibm-detect-secrets`, then commit `.secrets.baseline` and that change together as `chore(SDD): switch on IBM detect-secrets`. `node sdd/scripts/checks.mjs --list` now shows it at commit and before testing — and every pipeline reads the same file.
13. Try the commit from 5a again: detect-secrets now runs at pre-commit, before rule G10. On a laptop without the tool, the commit is refused with the install command: a tool the organisation switched on is not optional. In the editor, Bob's own findings (Bob Findings) and tools such as IBM Concert Secure Coder work alongside the hook; `sdd/docs/CHECKS.md` shows where each IBM tool fits. No package installs allowed in the room? Skip this exercise: the built-in checks do the same job for the lab.

**Why both, when Bob already finds secrets?** IBM detect-secrets is an open-source scanner IBM maintains — a fork of Yelp's detect-secrets with extra detectors. Bob also flags secrets while you work, in Bob Findings. They serve the same control at different stages: Bob advises in one developer's editor and understands context; detect-secrets gives the same answer for everyone, covers people's own commits as well as Bob's, and its baseline in git is the audit record. A documented fake is allowed in both places a person controls: `sdd/governance/secrets-allowlist.json` for the kit's check, and marked a false positive in `.secrets.baseline`.

### 5g. Accepting a risk is AppSec's decision

14. If a finding ever blocks the scan and cannot be fixed yet, only AppSec may accept it, for a limited time: a dependency CVE with `node sdd/scripts/approve.mjs waiver <CVE> --feature F00 --reason "…" --expires YYYY-MM-DD` (GitHub path: `/accept-risk <CVE> F00 until YYYY-MM-DD because …`); anything else as a reviewed change to `checks.json` or an allowlist. A trying it is refused.

**Checkpoint:** `sdd/reports/scan/F00.md` says PASS and is committed; `state.mjs` shows F00 **needs-verify**. Each partner can say where a secret is caught (Bob, the commit hooks, the scan, the pipeline), where risky code is caught (as Bob writes it), and how the bank's own tool was plugged in (one line in `checks.json`).

## Lab 6 — Prove it

**Goal:** a separate Bob mode proves every acceptance criterion; a hand review covers what tools cannot see; and an auditor can see all of it in one page. **Whose turn:** the developer runs; the business analyst checks the proof; AppSec has the final say on security. **Path:** both.

1. **🔍 Spec Verifier:** `/sdd-verify F00`. It refuses to start unless the scan is a fresh PASS. It writes a tagged test for every acceptance criterion, walks the app, and writes `sdd/reports/verification/F00.md`. A, as the business analyst, checks each criterion is proven as the business meant (in a real team, someone who did not build it).
2. **🛡️ Security Reviewer:** `/sdd-secure F00`. F00 is tier 2, so this review is required. It reviews against OWASP ASVS level 2 — access control, sessions, data exposure — and writes `sdd/reports/security/F00.md`. B, as AppSec, decides any serious finding.
3. Commit both reports (`docs(F00): verification and security reports`); `node sdd/scripts/state.mjs` shows F00 **done**.
4. **The auditor's view.** B runs `node sdd/scripts/evidence.mjs F00 --out evidence-F00.md` and reads it as an auditor would: who signed the plan, bound to which file hashes, and whether those files are unchanged; the four-eyes line; requirements → tasks → commits → tests; the scan and review verdicts; open items.

**Checkpoint:** F00 is **done**, and B can answer from the evidence pack alone: who approved F00, which requirement has no test yet, and whether the scan matched the final code.

## Lab 7 — The pipeline

**Goal:** see that every check from the laptop runs again on the server, in whatever CI the bank has, and that the release decision belongs to the people the policy names. **Whose turn:** both. **Path:** both.

### 7a. Both paths: the gate on your laptop

```bash
node sdd/scripts/ci.mjs pr --summary sdd-gate.md --junit sdd-gate.xml
# ✔ policy    Automation dial, locked human gates and the checks configuration
# ✔ specs     Specs, contract and traceability
# ✔ commits   Commit rules G1–G10 (the same rules as the local hook)
# ✔ signoffs  Every sign-off was made by a listed person with the right role
# ✔ secrets   Secret scan of everything this change adds
# ✔ tests     Unit, integration and contract tests
# ✔ scan      Security checks before testing: built-in and your organisation's tools
```

1. Open `sdd-gate.md`: this is what a pipeline posts on the pull request. `sdd-gate.xml` is what Jenkins, Azure DevOps and GitLab show as test results.
2. Skip the hook on purpose: change a file under `apps/`, `git commit --no-verify -am "feat: sneaky"`, then `node sdd/scripts/ci.mjs commits` → ✖ G2. On a real server this blocks the merge. Undo: `git reset --hard HEAD~1`.

### 7b. Plug it into your CI

| Your CI | Do this | Makes the gate required |
| --- | --- | --- |
| Jenkins (e.g. with GitHub Enterprise without Actions) | copy `sdd/ci/Jenkinsfile` to the repository root; a multibranch pipeline (a `sonar-token` credential only if SonarQube is the scanner) | the Jenkins status check, required in the host's branch protection |
| Azure DevOps | copy `sdd/ci/azure-pipelines.yml` (variable group `sdd-secrets` only for SonarQube) | build validation on `main` |
| GitLab | copy `sdd/ci/gitlab-ci.yml` to `.gitlab-ci.yml` (CI/CD variables only for SonarQube) | "Pipelines must succeed" |
| GitHub Actions (GitHub path) | already in `.github/workflows/` | the `sdd-main` ruleset from Lab 0 |
| Tekton (e.g. IBM Cloud Continuous Delivery toolchains) | a task that runs `sdd/ci/sdd-gate.sh` | your pipeline's required check |
| Anything else | `sdd/ci/sdd-gate.sh` | your tool's required check |

No CI in the workshop? The laptop run in 7a is the same command a server would run. `sdd/docs/CI.md` explains each setup.

### 7c. Both paths: the release decision

```bash
node sdd/scripts/ci.mjs release --phase 0 --env production
# ✖ phase 0 has no phase sign-off yet …   (Lab 8 fixes this)
# Release to production needs a manual approval in the pipeline by: business owner (strictest tier in this release: 2 …)
node sdd/scripts/ci.mjs release --phase 3 --env production
# … needs a manual approval in the pipeline by: business owner AND AppSec (strictest tier in this release: 1 …)
```

Deployment to the test environment is automatic once the gate passes (the pipeline re-checks the scan for the exact commit with `scan.mjs --gate-only --revision <sha>`). Production waits for people: the Jenkinsfile asks each role in turn and refuses the same person twice; Azure DevOps and GitLab put the approvers on the production environment.

### 7d. Both paths: prove the guardrails work

`bash sdd/tests/terminal/run.sh` runs ten checks in a throwaway copy — roles, four-eyes, forged sign-offs, secrets, locked gates — and ends `✔ 10 passed, 0 failed`. On the GitHub path, `python3 sdd/tests/github-e2e/e2e.py` plays the GitHub workflows on a local stand-in for GitHub.

**Checkpoint:** the gate passes on your branch, fails when you skip a hook, and `ci.mjs release` names the right people for phase 0 and for phase 3.

## Lab 8 — Close the phase; change a signed spec

**Goal:** a phase ends with a demo and a signature; a signed spec changes only through a change request the business owner decides. **Whose turn:** the analyst (A) demos and writes the change request; the business owner (B) decides; the architect (A) applies it with Bob. **Path:** both.

### 8a. The phase sign-off

1. A runs the demo script in Bob: `/sdd-demo`.
2. B signs the phase. Terminal path: `node sdd/scripts/approve.mjs phase 0` (type `PHASE-0`), then commit `approvals.json` on its own. GitHub path: `/approve-phase 0`. If any feature of the phase is not done, the sign-off is refused: *… Every feature of the phase must be done first.*
3. `node sdd/scripts/ci.mjs release --phase 0 --env production` now passes and names the business owner.

### 8b. The business changes its mind

The bank wants the domestic transfer cut-off moved from 14:00 to 15:00. That changes F00's signed spec (FND-011).

4. A edits the cut-off in `sdd/specs/features/F00-foundation/spec.md` directly and commits `spec(F00): later cut-off`. Refused: *G9 sdd/specs/features/F00-foundation/spec.md is approved scope. Change it through an approved change request …* Undo: `git checkout -- .`.
5. A, as the analyst, in **📐 Spec Architect**: `/sdd-change-request later-domestic-cut-off`. Bob writes `CR-001` with the problem, two options, the impact (FND-011, XFER-022, NFR-I18N-005) and a recommendation; A commits it as `docs(CR-001): raise later domestic cut-off`.
6. B decides. Terminal path: `node sdd/scripts/approve.mjs cr CR-001 --decision approved --option A`. GitHub path: `/approve-cr CR-001 option A` (or `/reject-cr CR-001 <reason>`).
7. A applies it: `/sdd-apply-cr CR-001`. Bob changes only what the CR lists, and its commit cites CR-001, so G9 lets it through.
8. F00's plan sign-off is now stale (`state.mjs`: **spec-changed-after-approval**). B signs the plan again; the sign-off says *Spec changes since the last approval are covered by: CR-001*.

**Checkpoint:** the CR is on record with B's decision; F00's spec says 15:00; the plan is signed again; nobody edited a signed spec without a decision.

## Lab 9 — Turn the dial

**Goal:** see how one governance setting changes how far Bob may go — and who must agree to that change. **Whose turn:** A proposes; B, as AppSec, approves the change (in a real repository, the code owners). **Path:** both.

1. On a throwaway branch, reclassify F00 as tier 3:

```bash
git switch -c lab/dial
# in sdd/governance/policy.json: "F00": 3
node sdd/scripts/policy.mjs check && node sdd/scripts/policy.mjs show F00   # ✔ … Bob: may drive several steps
git commit -am "chore(SDD): F00 is tier 3 for the dial lab"
```

2. In Bob, ask the **🎼 SDD Conductor**: *"For F00, which steps would you run without asking, and where would you stop?"* The \[SDD STATE\] block now says *Bob: may drive several steps*: the Conductor may chain the AI steps, and still stops at every sign-off, failure and question. Set F00 back to tier 2 and ask again: one step at a time.
3. Now try to loosen tier 1 itself: set tier 1's `"bobAutonomy"` to `"drive"` and run `node sdd/scripts/policy.mjs check` → *Locked: Bob runs tier 1 features one step at a time.* Moving a feature between tiers is allowed but is a governance change the code owners review; loosening what tier 1 means is not allowed at all.
4. Discuss: who in your bank should own risk classification? Then clean up: `git switch - && git branch -D lab/dial`.

**Checkpoint:** each partner can say what the dial controls (who signs, the hand security review, how far Bob runs, who approves production) and what it can never remove.

## Lab 10 — Guardrail drills

**Goal:** try every shortcut and name the layer that stops it. Do at least six; one partner predicts the layer first. **Path:** both, unless marked.

| # | Try this | What stops it (start of the message) | Layer |
| --- | --- | --- | --- |
| 1 | Ask Bob for a code edit with no step running | “No SDD step is active, so writes are blocked.” | Bob's hook |
| 2 | Run `/sdd-implement F00` in 📐 Spec Architect | “Step "implement" must run in 🏗️ Spec Builder …” | Bob's hook |
| 3 | During implement, ask Bob to edit F00's `spec.md` | “Implementation cannot change specs, contracts, ADRs or design.” | Bob's hook |
| 4 | Ask Bob to run `node sdd/scripts/approve.mjs plan F01` | “Approvals are human decisions. Bob must not run approve.mjs …” | Bob's hook |
| 5 | Ask Bob to write PASS into `sdd/reports/scan/F00.json` | “… is external scan evidence. Only sdd/scripts/scan.mjs writes it” | Bob's hook |
| 6 | Ask Bob to put an API key in a file | “That write contains what looks like … Secrets never go in the repository” | Bob's hook |
| 7 | Commit a secret yourself | “G10 no secrets in commits: …” | git hook |
| 8 | Commit code without a requirement ID | “G2 code changes need a feature scope …” | git hook |
| 9 | Ask Bob to run `git config core.hooksPath /dev/null` | “History rewrites and hook reconfiguration are not allowed from Bob.” | Bob's hook |
| 10 | Skip a hook with `--no-verify` | the same rule, in `ci.mjs commits` / `secrets` | pipeline |
| 11 | A signs a plan in a terminal | “… cannot give this sign-off. … It needs: business owner” | approve.mjs |
| 12 | Hand-write a sign-off into `approvals.json` | “… the record says it was signed by …, but … committed it” | pipeline |
| 13 | B changes a file in the pull request, then signs it | “… also made changes in this pull request, so they cannot sign it (four-eyes)” | pipeline |
| 14 | Let the developer sign tier 1 plans in `policy.json` | “Locked: tier 1 lets the developer sign the plan. The maker is never the checker.” | policy check |
| 15 | GitHub path: A comments `/approve-plan F01` on their own pull request | the sign-off workflow refuses: wrong role, and nobody signs their own pull request | GitHub |

Put the tree back after each drill: `git status`, `git checkout -- .`, and `node sdd/scripts/step.mjs finish --outcome interrupted` if a step was left open.

**Checkpoint:** for every drill you can say which layer stopped it — Bob's hook, the git hook, the sign-off script, the policy check or the pipeline — and why the pipeline is the one nobody can switch off.

## Cheat sheet

### In your terminal

| Command | When |
| --- | --- |
| `node sdd/scripts/state.mjs` | where are we, whose turn, what's next |
| `node sdd/scripts/workflow.mjs status F04` | one feature's nine steps |
| `node sdd/scripts/policy.mjs show [F04]` / `check` | the automation dial; are the locked gates in place? |
| `node sdd/scripts/checks.mjs --list` | which security checks run where: Bob, commit, scan, pipeline |
| `node sdd/scripts/ci.mjs pr` | the pipeline gate, anywhere |
| `node sdd/scripts/ci.mjs release --phase N --env production` | ready to ship? who must approve? |
| `node sdd/scripts/checks.mjs --stage commit` | what the pre-commit hook checks, on what you staged |
| `node sdd/scripts/scan.mjs F04` | the scan before testing (Bob runs it via `/sdd-scan`) |
| `node sdd/scripts/evidence.mjs F04 --out evidence.md` | the auditor's view of a feature |
| `node sdd/scripts/step.mjs finish --outcome interrupted` | clear a step left open |

### Sign-offs

| Decision | Who | Terminal path (then commit `approvals.json` alone) | GitHub path (a comment) |
| --- | --- | --- | --- |
| Sign a plan | business owner (tier 3: or architect) | `node sdd/scripts/approve.mjs plan F04` | `/approve-plan F04` |
| Sign a phase | business owner | `node sdd/scripts/approve.mjs phase 3` | `/approve-phase 3` |
| Decide a change request | business owner | `node sdd/scripts/approve.mjs cr CR-001 --decision approved --option A` | `/approve-cr CR-001 option A` |
| Accept a dependency CVE (≤ 90 days) | AppSec | `node sdd/scripts/approve.mjs waiver <CVE> --feature F04 --reason "…" --expires YYYY-MM-DD` | `/accept-risk <CVE> F04 until YYYY-MM-DD because …` |
| Withdraw a sign-off | business owner or AppSec | `node sdd/scripts/approve.mjs revoke plan F04` | `/revoke plan F04` |
| Sign on someone else's laptop | the signer | add `--as you@bank.example`, commit with the command it prints | — |

### Bob commands

| Command | Mode | Does |
| --- | --- | --- |
| `what's next?` / `/sdd-next` | 🧭 SDD Navigator | the next action and whose turn it is |
| `/sdd-workflow F04` | any | the feature's workflow, step by step |
| `/sdd-clarify F04` · `/sdd-plan F04` · `/sdd-tasks F04` | 📐 Spec Architect | questions, plan, tasks |
| `/sdd-implement F04 [task or group]` | 🏗️ Spec Builder | test-first, one commit per task |
| `/sdd-scan F04` | 🔐 Check Runner | the security checks (or SonarQube), before testing |
| `/sdd-verify F04` | 🔍 Spec Verifier | proves every acceptance criterion |
| `/sdd-secure F04` | 🛡️ Security Reviewer | ASVS L2 hand review |
| `/sdd-change-request <slug>` · `/sdd-apply-cr CR-001` | 📐 Spec Architect | raise and apply a change |
| `/sdd-prototype [phase]` | 🎼 SDD Conductor | runs the plan, stopping at every sign-off, as far as the dial allows |
| `/sdd-review` | 🔎 SDD PR Reviewer | advisory review of your branch (the pipeline runs the same review as the `bob-review` check) |
| `/sdd-demo` | any | walks the phase demo |

IBM Bob V2 has three built-in modes: Agent, Plan and Ask. In Bob IDE all three are overridden in this repository: Agent becomes the 🧭 SDD Navigator, and Plan and Ask explain and route; none of them can change files. Bob Shell resolves its built-ins first, so there you start in an SDD mode: `bob --mode spec-builder`, or `bob run --mode <slug> "…"` with `BOB_API_KEY` set. Every mode, rule, command and skill is industry-agnostic; the bank lives in `sdd/specs/`.

## When something goes wrong

| You see | It means | Do this |
| --- | --- | --- |
| `approve.mjs`: “Your git email … is not listed” | you are not in `approvers.json`, or your `git config user.email` differs | fix the email in `approvers.json` (a `chore(SDD)` commit), or sign with `--as` |
| `approve.mjs`: “cannot give this sign-off … It needs: …” | wrong role for this feature's risk tier | the person with that role signs |
| `approve.mjs`: “no TTY detected” | it was run from a script or from Bob | run it yourself in a terminal |
| `approve.mjs`: “You … made the last change to … plan.md” | four-eyes | someone else with the role signs; alone: `"trainingMode": true` |
| `approve.mjs`: “Sign-offs in this repository are GitHub pull-request comments” | `approvalChannel` is `github` | sign on the pull request, or switch the channel in a `chore(SDD)` commit |
| `ci.mjs` exits 2: “The range start origin/main is not in this checkout” | a shallow clone | fetch full history (`git fetch --unshallow`) and the target branch |
| Bob: “That write builds SQL from strings (sql-string)” (or tls-off, eval, weak-hash, weak-random) | a built-in check in Bob's hook | do what the message says; the same check runs again at commit and before testing |
| pre-commit: “✖ checks (commit …): blocked by …” | a commit check failed: built-in, or your organisation's tool | fix it; a false positive is AppSec's reviewed change to `checks.json` or an allowlist |
| “… is switched on but could not run” | a tool switched on in `checks.json` is not installed here | install it (the message gives the command); a tool the organisation switched on is not optional |
| `checks.mjs --validate`: “Locked: the built-in secrets check …” | someone switched the secrets check off | revert it; it cannot be configured away |
| `ci.mjs`: scan “skipped: SonarQube is not configured here” | `checks.json` says `"scanner": "sonarqube"`, but no `SONAR_HOST_URL` / `SONAR_TOKEN` | export them, or use the CI's secret store and `--require-scan`; or go back to `"builtin"` in a reviewed `chore(SDD)` commit |
| `policy.mjs check`: “Locked: …” | a change removes a human decision the bank must keep | revert it; if your bank's rules differ, change the rule in `policy.mjs` with an ADR |
| “No SDD step is active” | nothing started a step | use the step command for what you want |
| “another step is active” | a previous step was not finished | `node sdd/scripts/step.mjs finish --outcome interrupted` |
| A built-in mode (Agent, Plan or Ask) only explains and offers to switch | it is overridden in this repository | switch to the SDD mode it names |
| “has not been scanned” / “changed after its last scan” | no fresh scan for this code | 🔐 `/sdd-scan F04` |
| “project uses quality gate … expected Tidewell Bank” | SonarQube as the scanner, with the wrong gate attached | attach the Tidewell Bank gate |
| G7 “governance files changed” | the commit touches `sdd/governance/` (including `checks.json`), `sdd/scripts/`, `.bob/`, `sdd/workflows/`, `.github/` or `sonar-project.properties` | use scope SDD (`chore(SDD): …`) and get the code owners' review |
| G9 “is approved scope” | it changes a signed spec or plan without a change request | raise a CR; apply it with `/sdd-apply-cr` |
| G10 “no secrets in commits” | a key, token or password | remove it, rotate it, read it from the environment or a vault; a documented fake goes in `secrets-allowlist.json` |
| GitHub path: a sign-off comment gets no 👀 and no answer | Actions is off, or the comment is not a Conversation comment starting with the command | `gh api 'repos/{owner}/{repo}/actions/permissions'`; type the command as the first line |

## Facilitator notes

- **Pick one path per room.** Use the terminal path when people's git host has no Actions, the network blocks github.com, or the session is short; use the GitHub path when the team will publish on github.com.
- **Before the day:** nothing to install for the security checks; for Lab 5f, Python 3 with pip (or skip it); if your organisation uses SonarQube as the scanner, one SonarQube project per pair (`sonar.projectKey`) with the Tidewell Bank gate attached; a shared git remote per pair (or one laptop per pair, signing with `--as`); IBM Bob installed; Node 22.
- **Pre-bake for latecomers:** tags in a reference repository — `lab-04-start` (ready to build F00; its plan is not signed, so the pair's business owner signs it) and `lab-06-start` (F00 built and scanned). After jumping, run `node sdd/scripts/step.mjs finish --outcome interrupted` and `/sdd-scan F00`. Sign-offs are never pre-seeded.
- **Watch for:** business owners signing without reading (ask them to name one requirement first); Bob's auto-approve set wide for writes; people hand-editing files to save time (let them — Lab 10 is the lesson); tokens pasted into files (G10 will tell them).
- **Debrief:** Which gate would your bank add, and which could it automate? Which of your organisation's security tools would you plug in, and at which stage? Who should own risk tiers? What would an auditor ask that the evidence pack does not answer yet?
