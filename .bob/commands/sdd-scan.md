---
description: Security scan that gates promotion to testing — the checks in sdd/governance/checks.json, or SonarQube (🔐 Check Runner)
argument-hint: "<F##> [--with-bob-review]"
---
Scan feature $1 with the configured security checks. Options: $2

Mode: **🔐 Check Runner** (`check-runner`); switch if needed.

0. **Start the step:** run `node sdd/scripts/step.mjs start scan $1 --mode check-runner`. If it refuses,
   relay its message to me verbatim and stop — it names the right mode/command.

Then follow `.bob/rules-check-runner/01-check-protocol.md`:

1. If `$2` is `--with-bob-review`, or the constitution knob `BOB_REVIEW_IN_SCAN` is `on`: activate the
   `bob-findings-sarif` skill and write `sdd/reports/scan/$1.bob.sarif` **before** scanning.
2. Run `node sdd/scripts/scan.mjs $1` (add `--with-bob-review` when step 1 applied). Do not pass
   `-D` options and do not run a scanner any other way. Which scanner runs is set in
   `sdd/governance/checks.json` (`"scanner": "builtin"` or `"sonarqube"`); you never change it.
3. Exit 2 = could not scan (invalid `checks.json`; with SonarQube: missing `SONAR_HOST_URL`/`SONAR_TOKEN`, tool
   or server error): relay the message, point me to `sdd/docs/CHECKS.md` or `sdd/docs/SONARQUBE.md`, finish the
   step as blocked. Never write evidence yourself.
4. Exit 0/1: read `sdd/reports/scan/$1.md` and explain each blocking finding (with SonarQube: activate
   `sonarqube-triage` and use the read-only SonarQube MCP tools). Fill in **only** the "Triage notes" section.

Reply with: result (PASS/FAIL), which checks blocked (or the quality gate status), blocking issues and CVEs (one line each: what,
where, which task fixes it), Bob leads and whether SCA confirmed them, and the next step —
PASS → 🔍 Spec Verifier `/sdd-verify $1`; FAIL → 🏗️ Spec Builder `/sdd-implement $1`; a finding you
think is a false positive → **human** decision by AppSec (a reviewed change to `checks.json` or an allowlist, the
SonarQube UI, or for a CVE an `/accept-risk …` sign-off).
**Finish:** run `node sdd/scripts/step.mjs finish --outcome done` (or `--outcome blocked --note "<why>"`).
