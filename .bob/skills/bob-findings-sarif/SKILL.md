---
name: bob-findings-sarif
description: Turn Bob's own security review of a feature into a SARIF 2.1.0 file that SonarQube imports as advisory external issues. Use only in 🔐 Check Runner when /sdd-scan runs with --with-bob-review or BOB_REVIEW_IN_SCAN is on.
---

# Bob findings → SARIF for SonarQube

Bob's Findings panel and `/review` are useful, but they live inside the IDE, cannot be configured to
call an external scanner, and are not an audit trail. This skill makes Bob's review **portable**:
findings go into SonarQube next to SAST and SCA results, where the quality gate and humans decide.

## What to review
The feature's production code: modules listed in its `plan.md` and files changed for the feature
(`git log --name-only` over its `feat(F##)`/`fix(F##)` commits). Use the **security-review**
checklist (authz/IDOR, CSRF, step-up binding, idempotency, injection, domain invariants, redaction,
error leakage, rate limits, session handling, file handling, demo fencing).

## Output: `sdd/reports/scan/F##.bob.sarif`
```json
{
  "version": "2.1.0",
  "$schema": "https://json.schemastore.org/sarif-2.1.0.json",
  "runs": [{
    "tool": { "driver": { "name": "IBM Bob (advisory review)", "rules": [
      { "id": "bob.authz.idor", "shortDescription": { "text": "Object-level authorization missing" },
        "defaultConfiguration": { "level": "error" } }
    ] } },
    "results": [{
      "ruleId": "bob.authz.idor",
      "level": "error",
      "message": { "text": "GET /accounts/{id} loads by id without the owner's scope (NFR-SEC-010)." },
      "locations": [{ "physicalLocation": {
        "artifactLocation": { "uri": "apps/api/src/modules/accounts/accounts.repository.ts" },
        "region": { "startLine": 42 } } }]
    }]
  }]
}
```

## Rules
1. **Only concrete, located findings.** Every result needs a repository-relative `uri` of a production
   or test file and a `startLine`. `scan.mjs` drops results without a valid location.
2. **Levels:** `error` = would be High/Critical (exploitable), `warning` = Medium, `note` = Low. SonarQube
   maps them to impact levels; `error` findings can fail the gate, so be precise, not prolific.
3. **Rule IDs** are stable: `bob.<area>.<issue>` (e.g. `bob.domain.invariant`, `bob.csrf.missing`).
4. **CVEs are leads, not findings.** If you suspect a vulnerable dependency, write a result whose message
   contains the CVE/GHSA ID. `scan.mjs` removes it from the import and lists it as a lead, marked
   confirmed only if the SCA provider reports the same ID. Never invent CVE IDs; if unsure, say "possible
   known vulnerability in <package>@<version>" without an ID.
5. No secrets, tokens or personal data in messages.
6. Validate before scanning: `node -e "JSON.parse(require('fs').readFileSync('sdd/reports/scan/F##.bob.sarif','utf8'))"`.
