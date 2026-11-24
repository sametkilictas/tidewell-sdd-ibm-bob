# sdd/state — workflow state (governance-protected)

| File | Committed? | Written by | Purpose |
|---|---|---|---|
| `approvals.json` | **yes** | people only: a sign-off comment on the pull request (`/approve-plan F04` …), recorded by `.github/workflows/sdd-signoff.yml` — or `node sdd/scripts/approve.mjs` in their own terminal where `sdd/governance/approvers.json` allows it | Plan, phase-gate and change-request approvals, and dependency-CVE waivers (≤ 90 days, read by `scan.mjs`). Plan approvals store the SHA-256 of `plan.md` **and** the feature's `spec.md` (spec lock); CR approvals store the CR's. Editing a bound file afterwards makes the approval stale. |
| `active-step.json` | no (git-ignored) | `sdd/scripts/step.mjs` | The one SDD step currently in progress on this machine; the Bob `PreToolUse` hook limits writes to its scope. |
| `history.jsonl` | no (git-ignored; commit it if you want a shared audit trail) | step/approve/scan scripts | Append-only log of step starts/finishes, approvals and external scans. |

Bob cannot write anything in this folder: the hook denies tool writes and shell commands targeting
it, `approve.mjs` refuses to run without an interactive terminal, and the sign-off workflow refuses bots.
Each record says how it was given (`"via": "github-comment"` with the comment link, or `"terminal"`); the CI
check `signoffs` re-verifies every new comment sign-off against GitHub.

Sign-offs on GitHub (the default, `"approvalChannel": "github"`), typed as a comment on the pull request:
```
/approve-plan F04            /approve-phase 0            /approve-cr CR-001 option A      /reject-cr CR-001 <reason>
/accept-risk CVE-2026-12345 F03 until 2026-12-31 because <reason>                            /revoke plan F04
```

Terminal commands (`approve.mjs` signs only when `"approvalChannel"` is `terminal` or `both`):
```bash
node sdd/scripts/state.mjs                         # where are we, what's next, which mode
node sdd/scripts/workflow.mjs status [F01]         # the workflow, step by step
node sdd/scripts/approve.mjs plan F01  # approve a plan + lock its spec (interactive confirmation)
node sdd/scripts/approve.mjs phase 0   # approve a phase gate
node sdd/scripts/approve.mjs cr CR-001 --decision approved --option A
node sdd/scripts/approve.mjs waiver CVE-2026-12345 --feature F03 --reason "not reachable: dev-only tool" --expires 2026-12-31
node sdd/scripts/approve.mjs list                  # show all approvals
node sdd/scripts/step.mjs show                     # the active step (if any)
node sdd/scripts/step.mjs finish --outcome interrupted   # clear a stuck step
```
