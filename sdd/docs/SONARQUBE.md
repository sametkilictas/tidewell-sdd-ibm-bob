# SonarQube setup — SonarQube as the scanner (optional)

> **Optional.** The kit runs without SonarQube: by default the security checks in `sdd/governance/checks.json`
> give the verdict before testing ([CHECKS.md](CHECKS.md)). Follow this guide when your organisation uses
> SonarQube: set `"scanner": "sonarqube"` in `checks.json` (a reviewed `chore(SDD)` change) and the steps below.
> The checks keep running alongside it — in Bob's hook, at commit and in the pipeline.

Every feature goes **implement → scan → verify → secure**. The scan step (`/sdd-scan F##`,
🔐 Check Runner) runs `sdd/scripts/scan.mjs`, which asks SonarQube — a tool Bob does not control —
whether the current production code passes the **Tidewell Bank** quality gate, and checks dependencies
for known vulnerabilities (CVEs). Until that is a fresh PASS, Bob cannot start testing the feature.
CI repeats the scan on every push to a branch (branch analysis, Developer Edition or above), on every pull request and before every deployment to the test environment.

Decision record: [ADR-0009](../adr/0009-external-security-scan-sonarqube.md) · Requirements:
`NFR-SEC-042..046` in [NFR-security](../specs/nfr/NFR-security.md).

## 0. Just trying it? A local SonarQube in five minutes
```bash
docker run -d --name sonarqube -p 9000:9000 sonarqube:community     # SonarQube Community Build
# open http://localhost:9000, sign in as admin/admin and set a new password, then:
#  · create a local project with key tidewell-bank (Projects → Create project → Local project)
#  · create the "Tidewell Bank" quality gate (§3) and make it the project's gate
#  · My Account → Security: generate a project analysis token (SONAR_TOKEN)
#  · create a user bob-readonly with Browse permission only and a user token for it (SONARQUBE_READONLY_TOKEN)
export SONAR_HOST_URL="http://localhost:9000"
export SONAR_TOKEN="…"   SONARQUBE_READONLY_TOKEN="…"                  # in your shell, never in a file
```
Pairs sharing one SonarQube server each need their own project key (`sonar.projectKey` in
`sonar-project.properties`, changed before the first commit), or their scans overwrite each other. OSV-Scanner (for dependency CVEs) is a single binary:
install it from its GitHub releases, or set `SCA_PROVIDER` as in §1.

## 1. Pick an edition (and the `SCA_PROVIDER` knob)
| You have | Branch / PR analysis | Dependency CVEs come from | Set `SCA_PROVIDER` to |
|---|---|---|---|
| SonarQube Community Build | No — local and CI scans share the `main` analysis | OSV-Scanner (run by `scan.mjs`) | `osv-scanner` (default) |
| SonarQube Server Developer Edition | Yes | OSV-Scanner | `osv-scanner` |
| SonarQube Server Enterprise + **Advanced Security** | Yes | SonarQube SCA, inside the quality gate | `sonar` (or `both`) |
| SonarQube Cloud (+ Advanced Security subscription for SCA) | Yes | SonarQube SCA, or OSV-Scanner without the subscription | `sonar` / `osv-scanner` |

Changing a knob is a change request (`/sdd-change-request sca-provider`) — knobs live in
`sdd/specs/00-constitution.md` §2.

## 2. Create the project
1. Project key **`tidewell-bank`** (must match `sonar-project.properties` and the `SONAR_PROJECT_KEY` knob).
2. New code definition: *reference branch* `main` (recommended) or *previous version*.
3. Leave `sonar-project.properties` as shipped: it scopes analysis to `apps/`, `packages/`, `infra/`,
   `prisma/` as production code and recognises tests separately — the same files `scan.mjs`
   fingerprints. Changing it needs a PR approved by `@YOUR-ORG/appsec` (CODEOWNERS).

## 3. Create the "Tidewell Bank" quality gate (NFR-SEC-043)
Create a gate named exactly **Tidewell Bank** (the `SONAR_QUALITY_GATE` knob) and attach it to the
project. A scan of a project attached to any other gate fails. Conditions:

| Scope | Condition (name differs slightly between Standard Experience and MQR mode) | Fails when |
|---|---|---|
| New code | New vulnerabilities (or new security issues in MQR mode) | is greater than 0 |
| New code | Security Hotspots Reviewed | is less than 100 % |
| New code | Security Rating | is worse than A |
| Overall code | Security Rating | is worse than C (i.e. any High/Critical/Blocker vulnerability is open) |
| Dependencies (Advanced Security only) | the dependency-risk conditions Advanced Security offers | any High or Blocker dependency risk on new code |

Coverage, duplication and maintainability conditions are welcome but are not part of the security
gate; coverage thresholds are already enforced by Vitest (`sdd/specs/90-testing-strategy.md` §3).

## 4. Tokens and permissions (least privilege)
| Variable | Token type | Used by | Permissions |
|---|---|---|---|
| `SONAR_TOKEN` | project analysis token | `scan.mjs` locally and in CI | Execute Analysis on `tidewell-bank` |
| `SONARQUBE_READONLY_TOKEN` | **user** token of a dedicated user, e.g. `bob-readonly` | Bob's SonarQube MCP server | **Browse** only — so even if the read-only flag were removed, Bob could not change an issue's status |
| `SONAR_HOST_URL` | — | both | `https://…` (`scan.mjs` refuses to send tokens over plain HTTP except to localhost) |

Only the AppSec group gets *Administer Issues* and *Administer Security Hotspots*: those are the
people who may mark a finding *False positive* / *Accepted* or a hotspot *Safe*.

Export the variables **before** starting Bob (Bob expands `${env:…}` in `.bob/mcp.json` at start-up):
```bash
export SONAR_HOST_URL="https://sonarqube.example.internal"
export SONAR_TOKEN="…"                 # analysis token
export SONARQUBE_READONLY_TOKEN="…"    # bob-readonly user token
```
Never put tokens in files; `validate-specs.mjs` fails if `.bob/mcp.json` contains a literal token.

## 5. Local tools
- **Node ≥ 22.12** — `scan.mjs` runs `npx --yes @sonar/scan` (SonarScanner for NPM v5). On older Node,
  or to use an installed SonarScanner CLI, set `SONAR_SCANNER_CMD`, e.g.
  `export SONAR_SCANNER_CMD="npx --yes @sonar/scan@4.4.0"` or `"sonar-scanner"`.
- **OSV-Scanner v2** (when `SCA_PROVIDER` is `osv-scanner`/`both`): `brew install osv-scanner`, a release
  binary, or `go install github.com/google/osv-scanner/v2/cmd/osv-scanner@v2.4.0`. Override the command
  with `OSV_SCANNER_CMD` if needed.
- **Docker** — for the SonarQube MCP server (`sonarsource/sonarqube-mcp`). Pin it by digest in your
  organisation if you mirror images.
- **IBM Bob 2.0.2 or later** — earlier versions are affected by CVE-2026-9764 (code execution via
  workspace-defined MCP servers), and this repo ships a workspace `.bob/mcp.json`.

## 6. CI
1. Repository secrets: `SONAR_TOKEN`, `SONAR_HOST_URL`.
2. Branch protection on `main`: require **sdd-gates / sdd-policy** and **sdd-gates / sonarqube**, and
   Code Owner review.
3. Environment **test**: add required reviewers; `promote-to-test` deploys only after the gate for the
   exact commit is confirmed (`scan.mjs --gate-only --revision <sha>`).

## 7. Try it
```bash
node sdd/scripts/scan.mjs F00 --dry-run     # shows scope, fingerprint and the commands it would run
```
Then, in Bob: switch to **🔐 Check Runner** and run `/sdd-scan F00` (or `/sdd-scan F00 --with-bob-review`).
Results: `sdd/reports/scan/F00.md` (read this) and `sdd/reports/scan/F00.json` (evidence; machine-written).

## 8. Bob Findings and the scan
- Bob's **Findings panel / `/review`** stays useful inside the IDE, but IBM documents only review
  exclusions as its customization — it can't be told to run SonarQube, and its results aren't an
  auditable gate.
- To make Bob's opinion count, use **`/sdd-scan F## --with-bob-review`** (or set the knob
  `BOB_REVIEW_IN_SCAN=on`): the Check Runner writes Bob's review as SARIF 2.1.0
  (`sdd/reports/scan/F##.bob.sarif`, skill `bob-findings-sarif`), and `scan.mjs` imports it into SonarQube
  as issues of engine "IBM Bob (advisory review)". They then face the same gate and the same human triage.
- **CVEs Bob mentions are leads, not findings.** `scan.mjs` strips CVE/GHSA claims from the import and
  lists them under "CVE leads", marked confirmed only if the SCA provider reports the same ID.

## 9. Accepting risk (humans only)
| Situation | Who | How |
|---|---|---|
| SonarQube issue is a false positive / accepted risk | AppSec | Mark it in SonarQube (comment required by your process) |
| Security hotspot reviewed and safe | AppSec | Mark *Safe* in SonarQube |
| Dependency CVE can't be fixed yet (OSV-Scanner) | Product owner + AppSec | AppSec comments `/accept-risk CVE-… F## until YYYY-MM-DD because …` on the pull request (≤ 90 days; recorded on its own by the sign-off workflow) — or, in a terminal-only repository, `node sdd/scripts/approve.mjs waiver CVE-… --feature F## --reason "…" --expires YYYY-MM-DD --by "Name"` |
| Dependency risk (Advanced Security) | AppSec | Mark it in SonarQube's dependency risks view |

Bob cannot do any of these: its SonarQube token is Browse-only, the MCP server is read-only, the hook
denies status-changing tools, `approve.mjs` refuses non-interactive use, and the sign-off workflow refuses bots.

## 10. Troubleshooting
| Message | Meaning / fix |
|---|---|
| `set SONAR_HOST_URL and SONAR_TOKEN` (exit 2) | Export them (§4); no evidence was written |
| `the scanner did not upload an analysis` (exit 2) | Scanner error above it: Node version, network, token permissions |
| `project uses quality gate "Sonar way", expected "Tidewell Bank"` | Attach the Tidewell Bank gate to the project (§3) |
| `production code changed while the scan was running` | Re-run `/sdd-scan` when nobody is editing |
| Feature shows `scan-stale` | Production code changed after the scan → `/sdd-scan F##` |
| `could not run OSV-Scanner` | Install it (§5) or change `SCA_PROVIDER` through a change request |
| Bob SARIF results "dropped" | They had no valid repository file/line; see the skill's rules |
