---
feature: F##
result: PASS | FAIL
generated-by: sdd/scripts/scan.mjs
scanned-at: YYYY-MM-DDThh:mm:ssZ
---

# External security scan — F## <Feature>

> **Reference only.** `sdd/scripts/scan.mjs` generates this report next to its evidence
> (`sdd/reports/scan/F##.json`) — nobody writes the part above "Triage notes" by hand. This template
> documents the structure so reviewers know what to expect (Article XI, NFR-SEC-042..046, ADR-0009).

| | |
|---|---|
| Result | ✅ PASS / ❌ FAIL — reasons |
| SonarQube quality gate | OK / ERROR · Tidewell Bank · dashboard link |
| Analysis | analysis ID · branch or PR |
| Production files scanned | count · fingerprint |
| Security hotspots to review | count |
| Dependency CVEs (`SCA_PROVIDER`) | blocking · total · waived |
| Bob review (advisory) | imported · CVE leads · dropped |

## Quality gate conditions
| Metric | Actual | Threshold | Status |
|---|---|---|---|

## Open security issues (SonarQube)
| Severity | Rule | Location | Message |
|---|---|---|---|

## Dependency vulnerabilities (SCA)
| ID | CVE | Package | CVSS | Fixed in | Status |
|---|---|---|---|---|---|

## Bob findings (advisory)
Imported count; table of CVE leads with "confirmed by SCA" yes/no.

## Next step
PASS → 🔍 `/sdd-verify F##`. FAIL → 🏗️ `/sdd-implement F##`, then `/sdd-scan F##`.

## Triage notes (🔐 Check Runner)
For each blocking item: plain-language meaning · why it matters for a bank · requirement · fix
direction · owning task. Preserved across re-scans. Never "mark safe" here — humans decide in SonarQube.
