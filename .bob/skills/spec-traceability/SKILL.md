---
name: spec-traceability
description: Keep requirement-to-test traceability for a spec-driven project — tag tests with requirement IDs, regenerate sdd/traceability/matrix.md with the validator script, find uncovered acceptance criteria and report coverage by priority. Use when writing tests, verifying a feature, or answering "which requirements are covered?".
---

# Spec traceability skill

## Conventions
- Requirement IDs look like `AUTH-031`, `XFER-021`, `NFR-SEC-010`; acceptance criteria like `XFER-021-AC1`.
- A test **covers** a requirement when its title (describe/it/test) contains the tag in brackets:
  `it('[XFER-021] rejects …')`. Multiple tags allowed: `test('[XFER-026][NFR-REL-003] double submit …')`.
- Prefer one test per AC; mention the AC in the title when a requirement has several:
  `it('[XFER-002] AC2 — expired quote returns FX_QUOTE_EXPIRED')`.

## Commands
| Command | Effect |
|---|---|
| `node sdd/scripts/validate-specs.mjs` (`pnpm specs:check`) | Structure lint: requirement blocks, IDs, ACs, contract `x-requirements`, operationIds, links, Bob config |
| `node sdd/scripts/validate-specs.mjs --trace` (`pnpm specs:trace`) | Also scans tests and regenerates `sdd/traceability/matrix.md` |
| `node sdd/scripts/validate-specs.mjs --trace --strict=P1` | Fails if any P1 requirement lacks a tagged test (phase gates) |

## Finding gaps for a feature
1. Run the trace command.
2. Filter the matrix rows for the feature (Spec column `F##`), status "Not covered".
3. For covered rows, open the listed tests and confirm each AC's observable outcome is asserted
   (status code alone is not enough when the AC names copy/values).
4. Report: `Requirement | AC | Test | Gap`.

## Reporting coverage
Quote the matrix summary table (P1/P2/P3 %), and list uncovered P1 IDs explicitly.
