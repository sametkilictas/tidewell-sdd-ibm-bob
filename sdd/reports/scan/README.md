# External scan evidence (`sdd/reports/scan/`)

One pair of files per feature, produced by `node sdd/scripts/scan.mjs F##` (`/sdd-scan F##`, 🔐 Check Runner):

| File | Written by | Purpose |
|---|---|---|
| `F##.json` | **only** `sdd/scripts/scan.mjs` (Bob's write guard blocks every other writer) | Evidence the step guard reads: the scanner (`builtin` checks or SonarQube), each check's result or the quality gate, SCA findings, Bob-review import, and the fingerprint of the production code that was scanned. |
| `F##.md` | `scan.mjs` (everything above "Triage notes") + 🔐 Check Runner (triage notes) | Human-readable report: gate conditions, open security issues, dependency CVEs, Bob leads, next step. |
| `F##.bob.sarif` | 🔐 Check Runner, optional (`--with-bob-review` or `BOB_REVIEW_IN_SCAN=on`) | Bob's own security review as SARIF 2.1.0, imported into SonarQube as advisory external issues. |

Rules (Article XI, NFR-SEC-042..046):

- 🔍 Verification (promotion to testing) and 🛡️ security review are refused unless `F##.json` says
  **PASS** *and* its `codeFingerprint` matches the current production code. Any production change after
  the scan makes the evidence **stale** → re-scan.
- The scanner's verdict is authoritative (`sdd/governance/checks.json`). With SonarQube, Bob's findings count only
  through SonarQube; a CVE that Bob claims counts only if the SCA provider (`SCA_PROVIDER` knob) confirms it.
- Accepting risk is human: AppSec changes `checks.json` or an allowlist in a reviewed commit, marks false positives /
  accepted issues in SonarQube, or waives a dependency
  CVE with an AppSec sign-off: `/accept-risk <ID> F## until <date> because …` on the pull request (or `approve.mjs waiver` in a terminal-only repo), ≤ 90 days.
- CI re-runs the scan on every branch push and pull request (`sdd-gates / sonarqube`) and before every deployment to
  the test environment (`promote-to-test`), so local evidence is a convenience, never the last word.

Setup: [`sdd/docs/SONARQUBE.md`](../../docs/SONARQUBE.md).
