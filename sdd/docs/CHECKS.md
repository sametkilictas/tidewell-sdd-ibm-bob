# Security checks — one control, four places

Shift left is about **where** a control runs, not which product runs it. A bank already owns security
controls: secret scanning, static analysis, dependency policy, vulnerability management. This kit runs each
control as early as it can — while Bob writes, at commit, before any testing — and **again in the pipeline**,
where nobody can switch it off. The earlier a problem is found, the cheaper it is to fix.

```
  While Bob writes      At commit             Before any testing        In the pipeline (any CI)
  Bob's hook            git pre-commit        /sdd-scan → scan.mjs      ci.mjs pr → scan stage
  ───────────────       ───────────────       ─────────────────────     ──────────────────────────
  stage "bob"           stage "commit"        stage "scan"              stages "scan" + "pipeline"
  built-in checks       built-in + your       built-in + your tools,    everything again, plus slow,
  (+ IDE tools)         tools on the diff     or SonarQube's gate       licensed or advisory tools
  seconds               minutes               minutes                   hours — the merge is blocked
```

Everything is set in **`sdd/governance/checks.json`**, a governance file: a change is a `chore(SDD)` commit
that code owners review, and pipelines read it from the target branch.

```bash
node sdd/scripts/checks.mjs --list            # what runs where
node sdd/scripts/checks.mjs --validate        # also run by the pipeline's policy stage
node sdd/scripts/checks.mjs --stage commit    # what the pre-commit hook runs
node sdd/scripts/scan.mjs F04                 # the verdict before testing (/sdd-scan F04 in Bob)
```

## What ships, switched on

| Check | Catches | Stages | No install needed |
|---|---|---|---|
| `secrets` | private keys, cloud and GitHub tokens, hard-coded passwords. Also commit rule G10 and the pipeline's secrets stage. **Locked on.** | bob, scan | ✔ |
| `risky-code` | SQL built from strings, TLS certificate checks switched off, `eval`, MD5/SHA-1, `Math.random` for an OTP or token | bob, commit, scan | ✔ |
| `dependencies` | package versions on the deny-list (`sdd/governance/dependency-denylist.json`); unpinned versions as a warning | commit, scan | ✔ |

They are deliberately simple — pattern checks and a deny-list — so the labs run with Node alone. They are a
floor, not a replacement for a full static-analysis or dependency scanner: switch your organisation's tools on.

## Plug in your organisation's tools

A tool is a `command` check. The command gets the files to check in `{files}`; exit code 0 passes, anything
else is a finding. A tool that is switched on but not installed **fails** (fail closed), so switching one on
is a real decision. Credentials come only from the environment (`needs` lists them), never from a file.

```json
{
  "id": "ibm-detect-secrets",
  "title": "IBM detect-secrets (open source): deterministic secret scanning at commit and on all code, with an audited baseline",
  "run": { "command": "detect-secrets-hook --baseline .secrets.baseline {files}" },
  "stages": ["commit", "scan"],
  "onFinding": "block",
  "enabled": true
}
```

That one change — `"enabled": true` — puts the same tool in the commit hook, in `/sdd-scan` and in every
pipeline. `onFinding: "warn"` reports without blocking (useful for advisory tools, or while a team adopts one).

To let your organisation's scanner give the verdict before testing, set `"scanner": "sonarqube"` (see
[SONARQUBE.md](SONARQUBE.md)); the checks above still run alongside it.

## Where IBM's portfolio fits

Examples, not requirements: the kit runs with no licence at all. Products and features change, so check each
product's current documentation before you rely on it.

| Stage | IBM option | How it connects to this kit |
|---|---|---|
| While Bob writes | **IBM Bob**'s own findings: code review (`/review`) and Bob tips report into the **Bob Findings** panel, and IBM describes secrets detection built into Bob as you code. The **IBM Bob Premium Package for DevSecOps** adds real-time SAST and supply-chain scanning, blocks unsafe dependencies Bob suggests, and tracks every finding in one place | In the IDE, next to Bob's hook. The hook adds your own rules from `checks.json` on every write, deterministically and the same for everyone. |
| In the editor, before commit | **IBM Concert Secure Coder** (tech preview): pre-commit risk visibility in the IDE for vulnerabilities, secrets, misconfigurations and risky open-source packages | An IDE tool for developers; connected to IBM Concert, it reports into your application risk view. |
| At commit | **IBM detect-secrets** (open source, [github.com/IBM/detect-secrets](https://github.com/IBM/detect-secrets)) as a pre-commit check | The `ibm-detect-secrets` entry in `checks.json`. Lab 5b switches it on. |
| At commit | **HashiCorp Vault Radar** pre-commit hook (`vault-radar scan git pre-commit`) | The `vault-radar` entry; needs HCP credentials in the environment. |
| Where secrets live | **HashiCorp Vault**: the secret goes in Vault and the application reads it at run time | What the `secrets` check's advice points to: "read it from the environment or a secrets manager". |
| In the pipeline | **IBM Bob Shell 2.x**, non-interactive (`bob run --mode sdd-pr-reviewer …`, with `BOB_API_KEY`): the same review the 🔎 SDD PR Reviewer mode gives in the IDE. `bob run` pre-approves tool calls, which is why the review runs in a read-only mode | The `bob-review` entry, advisory (`warn`): Bob flags, the checks and people decide. |
| In the pipeline | **IBM Cloud Continuous Delivery** DevSecOps toolchains with **Code Risk Analyzer** (Tekton tasks: vulnerabilities, licences, CIS checks, bill of materials) | For teams on IBM Cloud toolchains: run `node sdd/scripts/ci.mjs pr` as a Tekton task next to them. |
| Deciding which findings matter | **IBM Concert Protect**: risk-based vulnerability prioritisation using severity, exploitability and the application's business context | Feeds AppSec's decisions: which CVE blocks, which is waived (`approve.mjs waiver`, with an expiry). |
| Release | **IBM DevOps Deploy**: quality gates and approvals before an environment | Call `ci.mjs release --phase N --env production` as a gate; the approvers are the people `policy.json` names. |

Other common tools plug in the same way: SonarQube, OSV-Scanner (`osv-scanner` entry), Semgrep, Gitleaks.

## IBM detect-secrets and Bob's own secret detection

**IBM detect-secrets** ([github.com/IBM/detect-secrets](https://github.com/IBM/detect-secrets)) is an open-source
command-line tool that IBM maintains: a fork of Yelp's detect-secrets with extra detectors, some specific to IBM
services. It works in three moves:

1. `detect-secrets scan --update .secrets.baseline` records every candidate secret in the repository in a baseline
   file that is committed.
2. `detect-secrets audit .secrets.baseline` lets a person mark each one a real secret (remove and rotate it) or a
   false positive.
3. The pre-commit hook (`detect-secrets-hook --baseline .secrets.baseline`) refuses any **new** secret that is not in
   the audited baseline. It is a set of heuristics (patterns, keywords, entropy): it catches the obvious cases fast
   and the same way for everyone, not every possible secret.

**Bob's own secret detection** works in the editor, while code is written or reviewed: Bob flags hard-coded keys and
credentials, and the findings appear in Bob Findings (with the DevSecOps premium package, alongside its SAST and
supply-chain findings). It understands context, so it can catch a secret that no pattern matches, and it offers the
fix.

**Do they align?** Yes: they serve the same control — no secret ever reaches the repository — at different stages,
and the overlap is deliberate.

| | Bob's detection (Bob Findings) | Bob's hook (`secrets` check) | IBM detect-secrets |
|---|---|---|---|
| Runs | in the IDE, as code is written or reviewed | on every write Bob makes, before it lands | at commit, and on all code before testing and in the pipeline |
| Decides by | AI review, with context | fixed patterns, same for everyone | heuristics against an audited baseline |
| Blocks? | no — advises, offers a fix | yes — the write is refused | yes — the commit or the gate fails |
| Covers people's own edits? | only when they use Bob | no — only Bob's writes | yes — every commit, whoever wrote it |
| Audit trail | in one developer's IDE | the refusal Bob reports | `.secrets.baseline` in git, plus the scan evidence |

The findings do not merge automatically: Bob Findings lives in the IDE, the baseline lives in the repository. When
two of them flag the same value, fix it once — move the secret to HashiCorp Vault or an environment variable and
rotate it. A documented fake must be allowed in both places a person controls: `sdd/governance/secrets-allowlist.json`
for the kit's check, and marked a false positive in `.secrets.baseline` for detect-secrets.

## What cannot be switched off

- The built-in `secrets` check stays enabled and blocking, in Bob's hook and in the scan
  (`checks.mjs --validate` fails otherwise, and the pipeline's policy stage runs it).
- Commit rules G1–G10 and the pipeline's secrets stage are not in `checks.json`; they always run.
- Bob's hook runs only in a folder Bob trusts (Bob V2 workspace trust). On company laptops it can be enforced
  centrally with Bob's `EnforcedHooks` group policy (Bob 2.1 and later), so nobody can switch it off in Settings → Hooks.
  Either way, the commit hook and the pipeline run the same checks again.
- Nobody silences a finding in code (`NOSONAR`, ignore comments): rule G8 and Bob's hook refuse it. Accepting a
  risk is AppSec's decision, recorded with an expiry.

## Try it

`bash sdd/tests/terminal/run.sh` and `node sdd/tests/checks/run.mjs` show every refusal above in a throwaway
copy of the kit. The lab guide's Lab 5 walks through the same things at the keyboard.
