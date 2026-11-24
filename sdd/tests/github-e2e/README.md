# GitHub workflows, end to end, on your machine

`e2e.py` runs the pack's GitHub Actions workflows (`.github/workflows/`) against a local stand-in for GitHub
and checks what they do: sign-off comments, the `signoffs` and `sdd-policy` checks, Bob's review and `/bob fix`.
Run it after changing a workflow, `.github/actions/run-bob`, or anything in `sdd/scripts/github/`.

```bash
python3 sdd/tests/github-e2e/e2e.py          # about two minutes; E2E_VERBOSE=1 prints every step
```

Needs Python 3 with PyYAML, Node.js 22, git and jq. Nothing leaves the machine: there is no network access, no
token and no real GitHub or Bob.

| Part | Stands in for |
|---|---|
| `runner.py` | A GitHub-hosted runner: expressions, step `if:`, env, step outputs, `actions/checkout` (same git commands and depth), local composite actions |
| a bare git repository | The GitHub repository (pushes, branches, `refs/pull/N/merge`) |
| `fakes/gh` | The GitHub CLI calls the workflows make (pull request details, comments, reactions, `gh workflow run`) |
| `fakeapi.py` | The REST endpoints the scripts call (comments, pull requests, Actions runs) |
| `fakes/bob` | Bob Shell (`bob run`): reviews, in-scope fixes, and fixes that try to leave their scope |

The scenarios start from the pack as shipped (nothing signed) with four people: an owner, a developer, an
architect and AppSec. They cover who may sign, a pinned `@sha`, a back-dated push after the owner's comment,
the branch moving while a sign-off is recorded, forged `approvals.json` records, revoking, `/bob fix` within
and outside its scope, uncommitted leftovers, `/bob review` and its sticky comment, drafts, forks, and a pull
request that changes `.bob/`.

What it can't show: GitHub's own behaviour (rulesets, required checks, token permissions, secrets masking) and
Bob's real answers. Those need a real repository; see `sdd/docs/GITHUB.md`.
