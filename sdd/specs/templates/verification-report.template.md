---
feature: F##
date: YYYY-MM-DD
verifier: Spec Verifier (Bob)
commit: <git sha>
result: PASS | PASS WITH WAIVERS | FAIL
---

# Verification report — F## <Feature>

## 1. Summary
<one paragraph: what was verified, overall result, blockers>

External scan evidence (precondition): [`sdd/reports/scan/F##.md`](../../reports/scan/README.md) — result, analysis ID, fingerprint.

## 2. `pnpm verify` summary
| Step | Result | Duration |
|---|---|---|
| specs:check | | |
| contracts:lint | | |
| lint | | |
| typecheck | | |
| test (coverage) | | |
| i18n:check | | |
| ledger:check | | |
| audit:verify | | |
| build | | |
| test:e2e | | |

## 3. Requirement coverage
| Requirement | Priority | Acceptance criteria | Tests (file › title) | Result |
|---|---|---|---|---|

## 4. Coverage numbers
| Package | Lines | Branches | Threshold met |
|---|---|---|---|

## 5. Accessibility
<axe results per route/theme/locale; manual checks performed>

## 6. Screens reviewed
<list of screenshot paths under sdd/reports/verification/F##/>

## 7. Defects
| ID | Sev | Requirement | Description | Status |
|---|---|---|---|---|

## 8. Deviations and change requests
| CR | Status | Note |
|---|---|---|

## 9. Sign-off checklist
- [ ] Every P1 (and phase-scoped P2) requirement has ≥ 1 passing test
- [ ] No S1/S2 defects open (or waived by PO)
- [ ] Traceability matrix regenerated
- [ ] Security report exists for this feature
- [ ] External scan PASS for the code that was verified (`sdd/reports/scan/F##.json` not stale)
