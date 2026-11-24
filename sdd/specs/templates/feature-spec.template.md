---
id: F##
title: <Feature name>
status: Draft            # Draft → In review → Approved → Superseded
version: 0.1.0
priority: P1|P2|P3
phase: <n>
depends-on: [F00, ...]
skills: [...]
requirement-prefix: XXXX   # 3–4 uppercase letters, unique across repo
contract-tags: [...]
---

# F## — <Feature name>

## 1. Summary
<2–4 sentences: what and why, for whom.>

## 2. User stories
| ID | As a… | I want… | so that… |
|---|---|---|---|
| US-XXXX-1 | | | |

## 3. Business rules
| ID | Rule |
|---|---|
| BR-XXXX-01 | <constants, limits, formats — single place for numbers> |

## 4. Functional requirements
<!-- One block per requirement. Keep this exact shape: sdd/scripts/validate-specs.mjs parses it. -->

#### XXXX-001 — <Short title>
- **Priority:** P1 · **Type:** Ubiquitous | Event-driven | State-driven | Unwanted behaviour | Optional feature | Complex
- **EARS:** WHEN <trigger>, THE SYSTEM SHALL <response>.
- **Acceptance criteria:**
  - **XXXX-001-AC1** Given <context>, when <action>, then <observable outcome>.

## 5. UI specification
| Route | Screen | Key elements | States |
|---|---|---|---|

## 6. API operations
<operationIds that must exist in sdd/contracts/openapi.yaml>

## 7. Data
<tables/entities touched; migrations>

## 8. Edge cases
-

## 9. Audit & notifications
-

## 10. Test plan
-

## 11. Clarifications log
| Date | Question | Decision | By |
|---|---|---|---|
