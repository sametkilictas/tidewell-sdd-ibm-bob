# Plug the gate into your pipeline

The checks Bob and the git hook run on the laptop are plain Node scripts, so any pipeline can run them again.
One command does it:

```bash
node sdd/scripts/ci.mjs pr          # exit 0 pass · 1 a check failed · 2 the gate could not run
```

| Stage | Checks | Fails when |
|---|---|---|
| `policy` | the automation dial and the locked human gates (`policy.mjs check`) | a change removes a human decision the bank must keep |
| `specs` | spec structure, contract, traceability (`validate-specs.mjs`) | a spec or the contract is malformed |
| `commits` | rules G1–G10 for every commit since the target branch (`git-check.mjs --ci`) | a commit has no requirement ID, changes signed scope, hides a finding, holds a secret… |
| `signoffs` | every new sign-off was made by a listed person with the right role for the feature's tier, who did not make the change, in a commit of its own (signed, if required) | a sign-off was forged, self-approved or given by the wrong role |
| `secrets` | everything the change adds (`secrets.mjs --range`) | a key, token or password is committed |
| `tests` | `npm test` / `pnpm test` once the application exists | a test fails |
| `scan` | the security checks before testing (`scan.mjs --ci`): with `"scanner": "builtin"` the checks in `sdd/governance/checks.json` (stages scan and pipeline); with `"sonarqube"` the quality gate + dependency CVEs (skipped when SonarQube is not configured unless `--require-scan`) | a blocking check fails, the gate fails or a blocking CVE is found |
| `release` | `--phase N --env production`: every feature in the phase is done and the phase is signed; prints (and with `--approvers-out` writes) who must approve | something is not done or not signed |

Options: `--base <ref>` (the range start; normally worked out from the CI system), `--junit <file>` (test results
for Jenkins, Azure DevOps, GitLab), `--summary <file>` (Markdown for a pull-request comment), `--require-scan`.

The range start is read from the CI system's own variables: GitHub (`GITHUB_BASE_REF`), GitLab
(`CI_MERGE_REQUEST_TARGET_BRANCH_NAME`), Jenkins (`CHANGE_TARGET`), Azure DevOps (`SYSTEM_PULLREQUEST_TARGETBRANCH`),
Bitbucket (`BITBUCKET_PR_DESTINATION_BRANCH`), or `SDD_BASE` if you set it. The gate needs the target branch in the
checkout (full history, not a depth-1 clone); it says so and exits 2 if it is missing.

## Pick your setup

### A. GitHub Enterprise (or any git host) without Actions — Jenkins or Azure DevOps

1. Keep sign-offs in the terminal: `"approvalChannel": "terminal"` (the default).
2. Copy [`sdd/ci/Jenkinsfile`](../ci/Jenkinsfile) to the repository root (multibranch pipeline), or
   [`sdd/ci/azure-pipelines.yml`](../ci/azure-pipelines.yml).
3. Store `SONAR_TOKEN` in the CI's credential store and `SONAR_HOST_URL` as a variable. Never in a file.
4. Protect `main` on the git host — these are git-host features, not Actions:
   - require a pull request and at least one approving review;
   - require review from code owners (`.github/CODEOWNERS` covers `sdd/governance/`, `sdd/scripts/`, `.bob/`,
     `sdd/workflows/` and `sonar-project.properties`);
   - require the Jenkins / Azure DevOps status check to pass (Jenkins posts it through its GitHub integration);
   - block force pushes and deletion.
5. Production: the Jenkinsfile asks the people `policy.json` names (tier 1: business owner, then AppSec, two
   different people); in Azure DevOps put the approvers on the `production` environment.

### B. GitLab

Copy [`sdd/ci/gitlab-ci.yml`](../ci/gitlab-ci.yml) to `.gitlab-ci.yml`; turn on "Pipelines must succeed"; protect
the `production` environment with the business owner and AppSec groups as approvers.

### C. Public GitHub

Use the workflows in `.github/workflows/` and switch to `"approvalChannel": "github"`: sign-offs become
pull-request comments, Bob reviews pull requests and fixes on request. See [GITHUB.md](GITHUB.md).

### D. Anything else, or no CI yet

`sdd/ci/sdd-gate.sh` runs the gate in TeamCity, Bamboo, Tekton, Bitbucket Pipelines or a terminal. Without any CI,
the git hooks are the only automatic check, and a hook can be skipped — so have the reviewer run
`node sdd/scripts/ci.mjs pr` before merging, and add a pipeline as soon as you can.

## Promotion

| Environment | How | Control |
|---|---|---|
| test | automatic after merge | `scan.mjs --gate-only --revision <sha>` proves this exact commit passes the security checks (or SonarQube's gate) |
| production | a person starts it | `ci.mjs release --phase N --env production` checks readiness and names the approvers; the CI tool records their approval |

## Proving who signed

On the terminal path, a sign-off commit is checked against its git author email. Email is easy to set, so for real
use turn on SSH-signed sign-off commits: `"requireSignedApprovals": true` in `approvers.json` and one line per
approver in `sdd/governance/allowed_signers` (see [CUSTOMIZE.md](CUSTOMIZE.md)). The pipeline then runs
`git verify-commit` on every sign-off commit against the keys on the target branch.
