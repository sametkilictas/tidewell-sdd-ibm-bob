# ADR-0009 — SonarQube as the external security gate before testing; Bob findings advisory

- **Status:** Accepted, amended by [ADR-0010](0010-pluggable-security-checks.md) (the scanner is pluggable; SonarQube is one option) · **Date:** 2026-11-18
- **Related:** Constitution Article XI · NFR-SEC-042..046 · `sdd/scripts/scan.mjs` · `sdd/docs/SONARQUBE.md`

## Context
Bob writes the code, the tests and — in the 🛡️ Security Reviewer mode — the security review.
A bank cannot let the same agent be the only judge of its own work. We need security problems
(code vulnerabilities, hotspots, vulnerable dependencies) found by a tool Bob does not control,
**before** a feature is promoted to testing, and the result must be hard to fake or bypass.

Bob already has a code-review feature: `/review` and the **Bob Findings** panel. IBM documents
review exclusions as its only customization; the docs do not describe calling external tools or
MCP servers from a review, importing SARIF, or dependency-CVE scanning. So Findings cannot be
"customized to trigger" an external scan, and its results are not an auditable gate. Bob's
own review can, however, be written as SARIF by a skill (IBM's audit tutorial does this), and
SonarQube imports SARIF 2.1.0 as external issues (`sonar.sarifReportPaths`).

## Decision
1. **New loop step `scan`** between implement and verify, owned by a new mode **🔐 Check Runner**
   (`check-runner`) that can run commands and read SonarQube but can only write scan triage notes
   and an optional Bob SARIF — never code. Fixes go back to 🏗️ Spec Builder (separation of duties).
2. **`sdd/scripts/scan.mjs` is the only way to scan.** It fingerprints the production code, runs
   SonarQube with `sonar.qualitygate.wait=true`, reads the gate and findings back from the API, checks
   the project uses the `SONAR_QUALITY_GATE`, runs SCA, and writes `sdd/reports/scan/F##.json` (evidence)
   + `F##.md` (report). The step guard refuses verify/secure unless the evidence is PASS and its
   fingerprint equals the current code's. Tests are excluded from the fingerprint.
3. **SonarQube is authoritative; Bob is advisory.** With `--with-bob-review` (or knob
   `BOB_REVIEW_IN_SCAN=on`), Bob's review is imported into SonarQube as external issues of engine
   "IBM Bob (advisory review)" — so Bob's findings count only through SonarQube. CVE IDs that Bob
   claims are stripped from the import and listed as *leads*, confirmed only if SCA reports them.
4. **SCA provider is a knob** (`SCA_PROVIDER`): `sonar` when SonarQube Advanced Security is licensed
   (paid add-on: Server Enterprise edition and up, or SonarQube Cloud with the Advanced Security
   subscription) — dependency risks then sit inside the quality gate; `osv-scanner` (default; works with
   every edition) — `scan.mjs` fails on CVSS ≥ 7.0 or unrated advisories without an unexpired human
   waiver; `both` for belt and braces.
5. **Bob's SonarQube access is read-only**: the official SonarQube MCP server with
   `SONARQUBE_READ_ONLY=true`, a token of a low-privilege user (Browse only), tokens referenced from the
   environment; the hook also denies status-changing MCP tools.
6. **No way to green by hiding**: `sonar-project.properties`, the CI workflows and `sdd/reports/scan/*.json`
   are governance-protected; `NOSONAR`/`sonar.issue.ignore` are denied in Bob (hook) and in git (rule G8);
   direct scanner runs and `-Dsonar.*` overrides are denied.
7. **CI is the final word**: `sdd-gates / sonarqube` re-runs `scan.mjs --ci` on every PR (required check);
   `promote-to-test` re-scans `main` and confirms the gate for that exact commit before `deploy-test`.

## Alternatives considered
| Option | Why not (alone) |
|---|---|
| Bob Findings / `/review` as the gate | Agent grading its own work; not externally auditable; not documented as configurable to call other tools or scan dependencies |
| CI-only SonarQube | Finds problems late (at PR time), after verification effort is spent; no per-feature evidence |
| SonarQube for IDE only | Advisory, per-developer, not an enforceable gate (still recommended for in-loop feedback) |
| A different SAST (e.g. Semgrep, CodeQL) | Viable; SonarQube chosen for its quality gate model, SARIF import, MCP server and Advanced Security SCA. The design (scan.mjs + evidence + SARIF) would carry over |

## Consequences
- ✅ Nothing reaches testing without an external verdict on the exact code; the verdict is reproducible
  in CI; Bob's findings become portable, triaged next to SAST/SCA results.
- ✅ Clear ownership: SonarQube decides, Bob runs and explains, humans accept risk.
- ⚠️ Needs a SonarQube instance, a project, the "Tidewell Bank" gate, two tokens and CI secrets
  (`sdd/docs/SONARQUBE.md`). Branch and PR analysis need SonarQube Developer Edition or above, or Cloud;
  with Community Build, local and CI scans share the `main` analysis.
- ⚠️ A scan adds minutes to each feature loop; production-code changes after a scan require a re-scan.
- ⚠️ Bob's imported findings can fail the gate (that is the point of opting in); a human resolves
  false positives in SonarQube.

## Notes
- Bob versions before 2.0.2 are affected by CVE-2026-9764 (code execution via workspace-defined MCP
  servers). This repository ships a workspace `.bob/mcp.json`: use a current Bob release.
