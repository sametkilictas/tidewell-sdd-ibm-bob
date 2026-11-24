---
feature: F##
title: Implementation Plan — <Feature>
status: Draft            # Draft → Ready for approval. The approval itself is recorded by a human with
                         # a business-owner sign-off (/approve-plan F## on the pull request, or approve.mjs) in sdd/state/approvals.json,
                         # bound to this file's SHA-256: editing the file afterwards voids the approval.
version: 0.1.0
spec: ./spec.md
author: Spec Architect (Bob)
---

# Plan — F## <Feature>

## 1. Constitution check (gate)
| Article | Check | Status (✅/❌ + note) |
|---|---|---|
| I Specs are truth | Every planned change maps to requirement IDs | |
| II Contract first | Contract changes listed in §4 and applied before code | |
| III Money | No float money; ledger recipes identified | |
| IV Security | AuthZ, CSRF, step-up, idempotency, audit, redaction considered | |
| V Accessibility | Keyboard, SR names, focus, RTL considered per screen | |
| VI UX | Loading/empty/error/partial states per view | |
| VII Test-first | Tests named with REQ tags; layers chosen | |
| VIII Simplicity | New deps justified (§5) | |
| IX Human gates | Gate items for this feature listed | |
| X Honesty | Demo-only behaviours fenced | |
| XI External scan | Production modules in SonarQube scope; known risky areas (crypto, file upload, SQL) noted for triage; new deps checked against SCA | |

## 2. Requirement → design mapping
| Requirement | Module(s) / component(s) | Approach |
|---|---|---|

## 3. Technical approach
<Architecture of the slice: domain logic (packages/domain), application services, repositories,
routes, web features/components, state management, jobs/events.>

## 4. Contract changes (`sdd/contracts/openapi.yaml`)
| Operation | Change | Requirements |
|---|---|---|

## 5. Dependencies
| Package | Where | Justification |
|---|---|---|

## 6. Data model & migrations
<tables, columns, indexes, constraints, triggers; seed additions (SPEC-91)>

## 7. Sequencing
<ordered groups; mark parallelisable groups [P]; ASCII or mermaid>

## 8. Risks & mitigations
| Risk | Mitigation |
|---|---|

## 9. Test approach
<per layer; special tests from SPEC-90 §5 that apply>

## 10. Open questions (must be empty before approval)
-
