# GitHub: sign-offs, checks and Bob on pull requests

> **This is the public-GitHub path.** It needs GitHub Actions: free on public repositories on github.com, and
> available on GitHub Enterprise where Actions is enabled. Without Actions (many enterprise installations), use the
> terminal path with your own CI instead — see [CI.md](CI.md). Switch to this path by setting
> `"approvalChannel": "github"` in `sdd/governance/approvers.json` (a `chore(SDD)` commit).

The SDD loop runs on one **draft pull request per phase** (`phase/<n>-<slug>` → `main`). Everything a person
decides happens there as a comment; everything Bob or a script decides is a check or a comment from GitHub
Actions. Nobody needs a terminal to sign.

```
 Bob in the IDE (🏗️ 📐 🔍 …)          the phase pull request                         main
 commits ──push (a person)──▶  sdd-gates: sdd-policy · signoffs · sonarqube  ──merge──▶ promote-to-test
                               bob-review: 🔎 advisory review (sticky comment)
                               comments:  /approve-plan F04 → sdd-signoff commits the sign-off
                                          /bob fix F04 …   → Bob commits fixes, checks run again
                                          /sdd status      → where every feature is
```

## Comment commands
Type the command as the **first line** of a new comment on the pull request.

| Comment | Who (sdd/governance/approvers.json) | What happens |
|---|---|---|
| `/approve-plan F04` | business owner | Signs F04's plan and locks its `spec.md` + `plan.md` at this head |
| `/approve-plan F04 @a1b2c3d` | business owner | Same, but only if the head is still the commit you reviewed |
| `/approve-cr CR-002 option A` · `/reject-cr CR-002 <reason>` | business owner | Decides a change request |
| `/accept-risk CVE-2026-12345 F03 until 2026-12-31 because <reason>` | AppSec | Accepts a dependency CVE for at most 90 days |
| `/approve-phase 3` | business owner | Signs the phase once every feature is done and the demo is seen |
| `/revoke plan F04` (or `phase 3`, `cr CR-002`, `waiver CVE-…`) | business owner or AppSec | Withdraws a sign-off; until someone signs again, that feature's code can't merge (rule G3) |
| `/sdd status [F04]` | any member | Answers with the workflow status table |
| `/bob review` | any member | Bob's advisory review now (also on drafts) |
| `/bob fix [F04] [what to change]` | developer or architect (`bob.fixRoles`) | Bob fixes within F04's implement step and pushes |

**Sign first, approve the pull request last.** Every push, including a sign-off commit, dismisses earlier
pull-request reviews (`dismiss_stale_reviews_on_push`), so reviewers approve the pull request after the
sign-offs are in.

## How a sign-off is recorded (`.github/workflows/sdd-signoff.yml`)
1. The workflow checks out the **default branch** (trusted scripts and approver list) and reads the pull
   request head **as data only**; nothing from the pull request runs.
2. It checks the commenter: a person (not a bot), member or collaborator, holding a role that may give this
   decision, and not the author of the pull request (`rules.forbidSelfApproval`).
3. It applies the same rules as `approve.mjs` (`sdd/scripts/approvals-core.mjs`): the plan sign-off binds the
   hashes of `plan.md` and `spec.md`; a re-sign after a spec change needs an approved change request; phases
   go in order and only when every feature is done; waivers expire within 90 days. It refuses if anything was
   pushed after the comment, or if a pinned `@sha` is not the head. "Pushed after" is judged by GitHub's own
   clock: every push starts an `sdd-gates` run, and the run's time is when that content arrived (a commit date
   can be set to anything, so it is used only when GitHub has no push record, and the reply then says so). If
   GitHub can't answer, the sign-off is refused and the person comments again. A `/revoke` is always taken.
4. It commits `sdd/state/approvals.json` **on its own** as `chore(SDD): approve plan F04`, with the comment
   link in the message, pushes to the pull request branch (refused if the branch moved meanwhile), re-runs
   `sdd-gates` on the new head and answers in the thread.

## Checks on every push (`.github/workflows/sdd-gates.yml`)
| Check | What it proves |
|---|---|
| `sdd-policy` | Spec pack structure, traceability, commit rules G1–G9 for every new commit; the workflow status goes to the job summary |
| `signoffs` | Every sign-off added since `main` matches the GitHub comment that gave it: same person, same command, same time, and that person may sign according to `approvers.json` **on the base branch**. A hand-edited `approvals.json` fails here, since nobody can write a comment as the business owner. In a GitHub-only repository, sign-offs recorded in a terminal fail too. |
| `sonarqube` | The external security gate (sdd/docs/SONARQUBE.md) |

## Bob on pull requests
- **Advisory review** (`bob-review.yml`): on every non-draft pull request from a branch of this repository,
  Bob Shell runs headless — `bob run --mode sdd-pr-reviewer --max-cost … --disable-mcp --trust` — in the
  read-only 🔎 SDD PR Reviewer mode (read tools only), with the default branch's `.bob/` config and guards.
  It checks the diff against the spec, plan, contract and banking rules and updates one sticky comment:
  verdict, findings with severity and a blocking flag, and a ready-to-paste `/bob fix …` line for each
  blocking finding. It cannot approve, merge or sign.
- **Fixes on request** (`bob-commands.yml`): `/bob fix F04 <what>` from a developer or architect. Plain code
  starts F04's implement step (refused if the plan isn't signed); Bob runs as 🏗️ Spec Builder, so the same
  `PreToolUse` hook confines it to F04's code and tests and blocks push, comments and sign-offs; every commit
  passes the commit-msg hook. Afterwards plain code re-checks every changed file and commit message
  (`bob-ci.mjs scope`) and the commit policy before it pushes with the workflow's token, then re-runs the
  checks. Bob never holds a token that can push. A pull request that changes Bob's own config or the guards
  (`.bob/`, `sdd/scripts/`, `sdd/governance/`, `sdd/workflows/`) is refused until that change is merged
  separately.
- Fork pull requests are skipped (they get no secrets) and refused for sign-offs and `/bob` commands.

## Setup (a repository admin, once)
1. **People:** in `sdd/governance/approvers.json` replace every `REPLACE_ME_` login with real GitHub logins
   and roles; in `.github/CODEOWNERS` replace `@YOUR-ORG/…` with your teams. Merge both through a pull
   request. (Placeholders contain `_`, which GitHub logins cannot, so they never authorize anyone.)
2. **Repository rules, labels, token defaults:** `bash sdd/governance/github/setup.sh` (GitHub CLI, admin).
   It creates the `sdd-main` ruleset from `sdd/governance/github/ruleset-main.json`: pull requests with
   Code Owner review, required checks `sdd-policy`, `signoffs`, `sonarqube`, merge or rebase but **no
   squash**, no force pushes or deletion. You can also import that JSON in Settings → Rules → Rulesets.
3. **Secrets** (Settings → Secrets and variables → Actions; or `gh secret set NAME`, which prompts for the
   value): `SONAR_TOKEN`, `SONAR_HOST_URL`; `BOB_API_KEY` (a Bob API key) for the review and `/bob fix`.
   Without `BOB_API_KEY` everything else still works and the Bob jobs explain that they are skipped.
4. **Optional variable** `BOB_SHELL_INSTALL_URL`: pin the Bob Shell package CI installs (otherwise IBM's
   installer at `https://bob.ibm.com/download/bobshell.sh` is used).
5. **Costs:** `approvers.json → bob`: `review` (`auto`, `on-request` or `off`), `reviewMaxCost`,
   `fixMaxCost` (Bobcoins per run) and `maxTurns`.
6. **Channel:** the kit ships with `"approvalChannel": "terminal"`; set it to `github` for this path. Use `both`
   only briefly while a team moves over (terminal sign-offs are then checked against their commits, comment
   sign-offs against GitHub).
7. **Who signs what** depends on each feature's risk tier (`sdd/governance/policy.json`): a tier 3 plan may be
   signed by the architect, a tier 1 plan only by the business owner. The sign-off workflow reads the tier from
   `main`, like the approver list.

## Why this is safe enough for a bank
| Risk | What stops it |
|---|---|
| Bob signs its own work | Bob has no GitHub identity in the IDE; the hook blocks `approve.mjs`, the GitHub scripts, `gh pr comment/review/merge` and any MCP call carrying a sign-off command; in CI the sign-off workflow refuses bots, and Bob's commits may not pose as sign-offs |
| A developer edits `approvals.json` by hand | The `signoffs` check verifies each record against its comment; CODEOWNERS adds the SDD approvers as reviewers |
| A pull request adds its author as an approver | Approvers are read from the default branch (sign-off) and the base branch (check) |
| Signing something that changed after review | Hash-bound records; refusal if anything was pushed after the comment, judged by GitHub's own record of the push (a workflow run), not by commit dates, which anyone can set; refusal if GitHub can't say; optional `@sha` pin; the push is refused if the branch moved |
| Prompt injection through the diff or comments | Read-only reviewer mode with no MCP; `/bob fix` limited to one feature's code and tests by the hook, re-checked by plain code before anything is pushed; only members with a fix role can ask |
| Runaway cost | `--max-cost` and `--max-turns` per run, concurrency per pull request, drafts skipped |
| Secrets leaking to forks | `pull_request` (never `pull_request_target`), forks skipped and refused, no comment text expanded in shell scripts |

## Testing the workflows locally
`python3 sdd/tests/github-e2e/e2e.py` runs these workflows end to end against a local stand-in for GitHub and
Bob (no network, no tokens) and checks 49 behaviours: who may sign, a back-dated push after a comment, forged
records, `/bob fix` inside and outside its scope, the sticky review, drafts and forks. Run it after changing a
workflow or `sdd/scripts/github/`. It can't show GitHub's own behaviour (rulesets, token permissions) or Bob's
real answers; for those, try the flow once on a test repository.

Not covered here: GitHub Enterprise push rulesets (`sdd/docs/github-push-ruleset.sample.json`) and the
IBM Bob Premium Package for DevSecOps, whose own `/review` for pull requests can run alongside this one.
