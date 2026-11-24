---
feature: F##
date: YYYY-MM-DD
reviewer: Security Reviewer (Bob)
commit: <git sha>
result: PASS | PASS WITH FINDINGS | FAIL
---

# Security review — F## <Feature>

## 1. Scope
<routes, modules, screens reviewed; threat model summary (STRIDE) for this slice>

## 2. Checklist results (`.bob/skills/security-review/checklist.md`, then `sdd/specs/domain/security-checklist.md`)
| Section | Items checked | Pass | Fail | N/A |
|---|---|---|---|---|

## 3. Findings
| ID | Severity | Category (ASVS/OWASP) | Location | Description | Recommendation | Status |
|---|---|---|---|---|---|---|

## 4. Security checks evidence (`sdd/reports/scan/F##.md`)
| Item | Value |
|---|---|
| Scanner (`checks.json`) and result | |
| Checks run, or SonarQube analysis ID · dashboard | |
| Code fingerprint scanned | |
| Findings or hotspots reviewed (by whom, where) | |
| Dependency CVEs: blocking / waived (waiver IDs, expiry) | |
| Bob review imported? CVE leads confirmed? | |

What this review covered beyond the checks (business logic, authorization, step-up, domain invariants, abuse cases):

## 5. Automated evidence
- `pnpm security:deps`:
- `pnpm security:secrets`:
- AuthZ/CSRF matrix tests:
- Log-capture test:

## 6. Residual risk & waivers
<anything accepted, with PO signature line>
