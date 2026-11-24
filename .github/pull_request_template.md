## What this pull request delivers
<!-- Phase pull requests: "Phase N — <name>". One line per feature or change request. Bob's /create-pull-request fills this in. -->
- Phase: <!-- 0–7 -->
- Features: <!-- F04 Transfers … -->
- Change requests: <!-- CR-### or none -->

## Where each feature is in the workflow
<!-- Comment "/sdd status" and paste the answer, or leave it: the sdd-policy check writes it to its job summary. -->

## Sign-offs (typed by the person, as a comment on this pull request)
| Decision | Who | Comment to type |
|---|---|---|
| Plan of a feature | Business owner, after architect and analyst review | `/approve-plan F04` (optionally `@<head-sha>` to pin what you reviewed) |
| Change request | Business owner | `/approve-cr CR-002 option A` · `/reject-cr CR-002 <reason>` |
| Dependency risk (CVE) | AppSec | `/accept-risk CVE-2026-12345 F03 until 2026-12-31 because <reason>` |
| Phase | Business owner, after the demo | `/approve-phase 3` |
| Undo a sign-off | Same roles | `/revoke plan F04` |

The sign-off workflow checks you against `sdd/governance/approvers.json`, binds your sign-off to the files at
this head and records it in its own commit. The `signoffs` check verifies it against your comment.
**Sign first, approve the pull request last:** pushes (including sign-off commits) dismiss earlier reviews.

## Bob on this pull request
- Advisory review on every push once the pull request is ready (or comment `/bob review`).
- A developer can comment `/bob fix F04 <what to change>`; Bob commits test-first within the feature's
  implement step and the checks run again. Bob cannot sign, approve or merge.

## Checklist (the checks enforce most of it)
- [ ] Every code commit names its feature and requirement IDs (`feat(F04): T012 … [XFER-021]`)
- [ ] Spec, plan or contract changes after sign-off cite an approved change request (`spec(CR-###): …`)
- [ ] `sdd-policy`, `signoffs` and `sonarqube` are green
- [ ] Verification and security reports are PASS for each finished feature
- [ ] Merge with a merge commit (not squash), so the one-commit-per-task history reaches `main`
