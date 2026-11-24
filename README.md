# Tidewell Bank — spec-driven delivery with IBM Bob

[![Site](https://img.shields.io/badge/site-live-0f62fe)](https://sametkilictas.github.io/tidewell-sdd-ibm-bob/)
[![Code: Apache-2.0](https://img.shields.io/badge/code-Apache--2.0-24a148)](LICENSE)
[![Docs: CC BY 4.0](https://img.shields.io/badge/docs-CC%20BY%204.0-8a3ffc)](LICENSE-docs)
[![IBM Bob V2](https://img.shields.io/badge/IBM%20Bob-V2-161616)](https://bob.ibm.com/docs)

**[Website](https://sametkilictas.github.io/tidewell-sdd-ibm-bob/)** · **[Interactive Atlas](https://sametkilictas.github.io/tidewell-sdd-ibm-bob/atlas/)** · **[Lab guide](https://sametkilictas.github.io/tidewell-sdd-ibm-bob/labs/)** ·
**[Presentation (PDF)](https://sametkilictas.github.io/tidewell-sdd-ibm-bob/deck/tidewell-sdd-ibm-bob-deck.pdf)** · **[Article](https://sametkilictas.github.io/tidewell-sdd-ibm-bob/article/)** · **[Video](https://sametkilictas.github.io/tidewell-sdd-ibm-bob/#video)**

A complete, working example of **spec-driven development (SDD) in a regulated bank**, built for IBM Bob.
Tidewell Bank is fictional: a UAE retail bank (AED, English and Arabic) whose online banking is fully specified —
12 features, 212 requirements, 287 acceptance criteria, 116 API operations — together with everything that makes
the specs *binding*: Bob's modes and guardrails, human sign-offs, a pipeline gate for any CI, shift-left security
checks and an evidence pack for auditors. No real money, no real customers, only synthetic data.

Clone it, open it in Bob, and run the same loop a bank would: **Bob builds. People approve. Checks verify — at the
keyboard, at commit and in the pipeline.**

## The idea

```
   ┌──────────────── inner loop: on the laptop, minutes ────────────────┐   ┌──── outer loop: the pipeline, any CI ────┐
   Spec ─► Clarify ─► Plan ─► ✍ Owner signs ─► Tasks ─► Build (test first) ─► Scan ─► Verify ─► Secure ─► ✍ Phase ─► Test env ─► ✍ Production
   (people)   Bob       Bob       person          Bob        Bob + developer     checks     Bob      Bob     person     automatic     people
                                                     every write: Bob's hook · every commit: git hook (G1–G10) · every PR: ci.mjs
```

- **The spec is the contract.** Requirements are written in plain words with examples anyone can check
  (`sdd/specs/`). Once the business owner signs a plan, the spec and plan are locked; changes go through a change
  request.
- **Bob is the maker, never the checker.** Bob drafts specs, plans, tasks, code and tests in role-specific modes,
  each limited to its own files. It cannot sign anything, cannot write the scanner's verdict and cannot skip a step.
- **Checks run where the work happens, then again on the server.** A secret, risky code, a commit without a
  requirement ID or a suppressed finding is refused at the keyboard, at commit and again in the pipeline — so a laptop
  without Bob or a skipped hook changes nothing. Built-in checks need only Node; your organisation's own tools
  (IBM detect-secrets, HashiCorp Vault Radar, SonarQube, …) plug into the same places through
  [`sdd/governance/checks.json`](sdd/governance/checks.json) — see [sdd/docs/CHECKS.md](sdd/docs/CHECKS.md).
- **People decide, and the decisions are evidence.** Every sign-off is bound to the exact files it approved and to
  the person who gave it; the pipeline re-checks who signed and that they did not sign their own work.
- **Industry-agnostic by design; the bank is the example.** Bob's modes, rules, commands and skills, the scripts and
  the governance files know nothing about banking. The bank lives in the specs: `sdd/specs/`, with the rules Bob
  must never break in [`sdd/specs/domain/`](sdd/specs/domain/README.md). Replace the specs and the same kit drives an
  insurance, health, retail or public-sector product.

Written for **IBM Bob V2** (Bob IDE 2.x, whose built-in modes are Agent, Plan and Ask, and Bob Shell 2.x, `bob run`).

## Two ways to run it

| | **Terminal path** (default) | **Public GitHub path** |
|---|---|---|
| Works with | any git host: GitHub Enterprise without Actions, GitLab, Bitbucket, Azure Repos, a bare repo | github.com (Actions are free on public repositories) |
| Sign-offs | `node sdd/scripts/approve.mjs plan F04`, committed alone by the signer | a comment on the pull request: `/approve-plan F04` |
| Pipeline | `node sdd/scripts/ci.mjs pr` in any CI — Jenkins, Azure DevOps and GitLab files in [`sdd/ci/`](sdd/ci/) | the workflows in `.github/workflows/` (same checks, plus Bob reviewing pull requests) |
| Setting | `"approvalChannel": "terminal"` in `sdd/governance/approvers.json` | `"approvalChannel": "github"` |

## Quick start (terminal path, about five minutes)

```bash
git clone https://github.com/sametkilictas/tidewell-sdd-ibm-bob.git && cd tidewell-sdd-ibm-bob
git config core.hooksPath sdd/scripts/hooks          # the local checks: commit rules G1–G10, secrets included

# Who may sign: put your git email(s) in sdd/governance/approvers.json.
# Trying it alone? Give yourself every role and set "rules": { "trainingMode": true } (never in a real repository).

node sdd/scripts/policy.mjs show                     # the automation dial: risk tiers, who signs, how far Bob may go
node sdd/scripts/state.mjs                           # where the project is, whose turn it is, what's next
node sdd/scripts/ci.mjs pr                           # the gate every pipeline runs, on your laptop
```

Then open the folder in IBM Bob, pick **🧭 SDD Navigator** and ask *"what's next?"*. The
[lab guide](sdd/docs/LABS.md) walks a pair of people through the whole cycle in a day.

## What runs where

| Check | In Bob (as it writes) | At commit (git hook) | In the pipeline (`ci.mjs`) | Before release |
|---|---|---|---|---|
| Right step, right mode, right files | ✔ | | | |
| No secrets (G10) | ✔ | ✔ | ✔ | |
| Commit names its feature and requirements (G2) | | ✔ | ✔ | |
| Signed spec/plan can't change without a change request (G9) | ✔ | ✔ | ✔ | |
| Risky code (SQL built from strings, TLS checks off, weak hashes …) and dependency deny-list | ✔ | ✔ | ✔ | |
| Your organisation's tools (`checks.json`) | in the IDE | ✔ | ✔ | |
| No suppressed findings (G8) | ✔ | ✔ | ✔ | |
| Sign-offs made by a listed person with the right role, not the maker | | | ✔ | |
| Unit, integration and contract tests | Bob runs them | | ✔ | |
| Security scan: the configured checks, or SonarQube's quality gate | `/sdd-scan` before testing | | ✔ | ✔ checked for the exact commit |
| Acceptance criteria proven, hand security review | `/sdd-verify`, `/sdd-secure` | | | ✔ feature must be done |
| Release to production | | | | ✍ people, per risk tier |

## The automation dial

Every feature has a risk tier in [`sdd/governance/policy.json`](sdd/governance/policy.json). The tier decides who
signs, whether a hand security review is required and how far Bob may run on its own. Some human gates are
**locked**: `node sdd/scripts/policy.mjs check` fails if a change would remove them.

| Tier | Means | Plan signed by | Hand security review | Bob | Production release approved by |
|---|---|---|---|---|---|
| 1 Critical (F01 F04 F05 F06 F09 F11) | can move money or other value, guards access, changes security settings | business owner | required | one step at a time | business owner **and** AppSec |
| 2 Sensitive (F00 F03 F07 F10) | shows or stores personal or confidential data | business owner | required | one step at a time | business owner |
| 3 Standard (F02 F08) | moves no value, no credentials, no new personal data | business owner or architect | optional | may drive several steps | business owner |

## Find your way

| You want to… | Read |
|---|---|
| See the whole cycle, interactively (open it in a browser) | [sdd/docs/atlas.html](sdd/docs/atlas.html) |
| Understand how SDD fits an SDLC and CI/CD (the bank's, in the worked example) | [sdd/docs/SDLC.md](sdd/docs/SDLC.md) |
| Run the hands-on labs | [sdd/docs/LABS.md](sdd/docs/LABS.md) |
| Know who does what at each step | [sdd/docs/ROLES.md](sdd/docs/ROLES.md) |
| Change what Bob and people may do (tiers, roles, approvals) | [sdd/docs/CUSTOMIZE.md](sdd/docs/CUSTOMIZE.md) |
| Plug the gate into Jenkins, Azure DevOps, GitLab or GitHub | [sdd/docs/CI.md](sdd/docs/CI.md) · [sdd/docs/GITHUB.md](sdd/docs/GITHUB.md) |
| Plug in your organisation's security tools (IBM and others) | [sdd/docs/CHECKS.md](sdd/docs/CHECKS.md) |
| Use SonarQube as the scanner (Docker, five minutes) | [sdd/docs/SONARQUBE.md](sdd/docs/SONARQUBE.md) |
| Pick the right Bob mode | [sdd/docs/WHICH-MODE.md](sdd/docs/WHICH-MODE.md) |
| See the specs, workflow and guard scripts | [sdd/README.md](sdd/README.md) |
| Show an auditor what happened to a feature | `node sdd/scripts/evidence.mjs F04` |

## Repository map

```
.bob/            Bob's modes, rules, slash commands, skills and hooks (the guardrails in the IDE; industry-agnostic)
.github/         GitHub path: sign-off, gate, review and promotion workflows
sdd/specs/       the constitution, architecture, domain model and rules (domain/), 12 feature specs, NFRs, delivery plan
sdd/contracts/   OpenAPI contract (116 operations)
sdd/governance/  approvers.json (who), policy.json (the automation dial), secrets-allowlist.json
sdd/scripts/     state, workflow, approve, ci, policy, secrets, scan, evidence, git-check, Bob hook
sdd/ci/          Jenkinsfile, azure-pipelines.yml, gitlab-ci.yml, sdd-gate.sh
sdd/state/       approvals.json (sign-offs) and step history — written only by the scripts
sdd/reports/     scan, verification and security reports per feature
sdd/tests/       self-tests for the guardrails (GitHub workflows end to end, terminal path, security checks)
site/            the project website (GitHub Pages): built by site/build.py, deployed by .github/workflows/pages.yml
```

The application itself (`apps/`, `packages/`, `infra/`, `prisma/`, `e2e/`) does not exist yet: Bob builds it,
feature by feature, as you run the loop.

## Licence

- **Code** — scripts, hooks, Bob configuration, workflows, CI templates, tests: [Apache License 2.0](LICENSE).
- **Documentation and media** — specs, docs, lab guide, article, presentation, video and website content:
  [Creative Commons Attribution 4.0 International](LICENSE-docs) (CC BY 4.0). Reuse it, adapt it, credit the source.

See [NOTICE](NOTICE). Contributions are welcome under the same terms: [CONTRIBUTING.md](CONTRIBUTING.md).

*Tidewell Bank, its customers, banks, codes and numbers are invented. This is an independent, community example: it is not an
IBM product and is not endorsed by IBM. IBM, IBM Bob, IBM Concert, IBM Cloud, Carbon and other IBM marks, HashiCorp Vault and
Vault Radar, SonarQube and the other products named here are trademarks of their respective owners.*
