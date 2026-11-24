# Customise what Bob and people may do

Every bank draws the line between "the machine may do it" and "a person must decide" a little differently. This
kit makes that line a set of files you can read, review and change — and it refuses changes that would remove a
decision a bank must keep.

## Three kinds of control

| Kind | Examples | Can it be skipped? |
|---|---|---|
| **Automated check** — a machine decides, the same way every time | commit rules G1–G10, secret scan, the security checks in `checks.json` (built-in and your own tools), spec validation, tests, the scan before testing, sign-off verification | no: they run in Bob, in the git hook and in the pipeline |
| **Human review** — a person looks and advises | code review, Bob's pull-request review, the architect reviewing a plan before it is signed | your branch protection decides; the kit does not block on it |
| **Human approval** — a person decides, on the record | plan sign-off, phase sign-off, change-request decision, accepting a security risk, release to production | no: some are locked (below), the rest are set per risk tier |

## The automation dial: `sdd/governance/policy.json`

Each feature gets a risk tier in the `features` map. The tier sets:

| Setting | What it changes | Values |
|---|---|---|
| `approve.plan` / `approve.phase` | which roles may sign the plan and the phase | roles from `approvers.json` |
| `securityReview` | whether the hand security review (`/sdd-secure`) is required before a feature counts as done | `required` · `optional` |
| `bobAutonomy` | how far the 🎼 Conductor may run without asking | `step` (one AI step, then stop and report) · `drive` (chain AI steps; stop at every sign-off, failure or question) |
| `release.production` | who approves a release to production in the pipeline | roles; two different roles means two people |
| `dast` | whether a DAST scan of the test environment is expected before production | `required` · `recommended` · `optional` (documentation for your pipeline) |

```bash
node sdd/scripts/policy.mjs show          # the whole dial
node sdd/scripts/policy.mjs show F04      # what applies to one feature
node sdd/scripts/policy.mjs check         # are the locked gates still in place? (also runs in every pipeline)
```

**Who sets a tier?** Risk classification is a governance decision — typically AppSec with the business owner.
`policy.json` is governance-protected: it changes only in a `chore(SDD): …` commit reviewed by the code owners
(rule G7), and pipelines read it from the target branch, so a pull request cannot lower its own tier.

## What cannot be configured away

`policy.mjs check` fails, in the pipeline too, if a change would:

1. leave any tier without a human plan or phase sign-off, or hand it to Bob or the pipeline;
2. let anyone but the business owner sign tier 1 plans and phases;
3. let the developer sign plans or phases (the maker is never the checker);
4. drop the hand security review for tier 1 or 2;
5. let Bob drive tier 1 features beyond one step at a time;
6. let anyone but AppSec accept a security risk;
7. let anyone but the business owner decide change requests;
8. release to production without a person — or tier 1 with fewer than two people in different roles;
9. let people sign their own work outside a repository marked as training.

These are the kit's view of what a regulated organisation must keep. If your rules differ, change
`validatePolicy` in `sdd/scripts/policy.mjs` — itself governance-protected — and record why in an ADR.

## Security checks: `sdd/governance/checks.json`

Which security checks run, and where: in Bob's hook as code is written, at commit, before any testing, in the
pipeline. Built-in checks need only Node; your organisation's tools (IBM detect-secrets, HashiCorp Vault Radar, a
Bob Shell review, SonarQube, …) plug in as commands. `"scanner"` decides who gives the verdict before testing:
`"builtin"` (the configured checks) or `"sonarqube"`. The secrets check is locked on. Full guide, with where IBM's
portfolio fits at each stage: [CHECKS.md](CHECKS.md).

## People: `sdd/governance/approvers.json`

```json
"people": {
  "sara-po":   { "name": "Sara Haddad",  "email": "sara@tidewell.example",  "roles": ["business-owner"] },
  "omar-sec":  { "name": "Omar Nasser",  "email": "omar@tidewell.example",  "roles": ["appsec"] }
},
"decisions": { "cr": ["business-owner"], "waiver": ["appsec"], "revoke": ["business-owner", "appsec"] },
"rules": { "forbidSelfApproval": true, "trainingMode": false, "requireSignedApprovals": false }
```

- The key is the person's GitHub login (used on the GitHub path); `email` is their git `user.email` (used on the
  terminal path and by the pipeline's sign-off check).
- `forbidSelfApproval`: someone who changed the pull request, or last edited the plan, cannot sign it.
- `trainingMode`: one person may hold every role and sign their own work — for a solo training repository only.
  `policy.mjs check` warns about it in every pipeline run.
- `requireSignedApprovals`: every sign-off commit must be signed with a key listed in
  `sdd/governance/allowed_signers` (SSH signing; see below). This turns "committed as Sara" into "proven to be Sara".

## Bob's autonomy, three layers

1. **The dial** (`bobAutonomy`) tells the 🎼 Conductor whether it may chain steps for a feature.
2. **Bob's own approval settings**: in each mode, which actions Bob may take without asking (auto-approve for reads,
   writes, commands). Keep writes and commands on "ask" for tier 1 work.
3. **The organisation's lock**: `sdd/docs/enterprise-policy.sample.json` shows a Bob enterprise policy that enforces
   the hooks so users cannot switch them off.

Whatever the settings, the hooks decide what Bob *can* do: no writes outside the active step, no sign-offs, no scan
evidence, no secrets.

## The workflow is data

`sdd/workflows/feature-delivery.json`, `phase-gate.json` and `change-request.json` describe each step: who has the
turn, which Bob mode, which command, which files it may write. `/sdd-workflow`, `workflow.mjs status` and the Atlas
site read them. Renaming a step, re-assigning who is responsible or adding a review step is a data change. A new
*kind* of enforced gate (say, an architecture board sign-off) also needs a few lines in
`sdd/scripts/approvals-core.mjs` and `lib.mjs`.

## Recipes

**Let architects sign low-risk plans.** Already the case for tier 3: `"approve": { "plan": ["business-owner", "architect"] }`.

**Reclassify a feature.** Change `"F08": 3` to `"F08": 2` in `policy.json`, commit it as
`chore(SDD): F08 is tier 2 (now shows account balances)`, get the code owners' review. From then on F08 needs the
business owner's signature and a hand security review.

**Require DAST before production for tier 2.** Set `"dast": "required"` and add the scan to your deploy-to-test
stage (an OWASP ZAP baseline scan against the test URL is a good start).

**Prove who signed (SSH-signed sign-offs).**
```bash
# each approver, once:
git config gpg.format ssh && git config user.signingkey ~/.ssh/id_ed25519.pub
# governance, once (chore(SDD) commit): one line per approver
echo "sara@tidewell.example $(cat sara_id_ed25519.pub)" >> sdd/governance/allowed_signers
# approvers.json: "rules": { "requireSignedApprovals": true }
# then each sign-off is committed with -S:
git commit -S -m "chore(SDD): approve plan F04" -- sdd/state/approvals.json
```

**Try everything alone.** List your own email with every role and set `"trainingMode": true`. Never in a real
repository: the pipeline warns on every run.
