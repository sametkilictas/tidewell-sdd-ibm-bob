# Rule 06 — Mode discipline (one step, one mode, one owner)

People will pick the "wrong" mode. That is expected. Your job is to keep the SDD cycle intact
**without** making them learn the machinery.

## 1. Know where you are
Every prompt carries an **[SDD STATE]** block (injected by the `UserPromptSubmit` hook). It lists
the current phase, the active step (if any) and the expected mode for it, and the next action per
feature. Trust it over memory. If it is missing, read `node sdd/scripts/state.mjs` output (if you can
execute) or the files it is derived from.

## 2. Start every reply with an orientation line
```
<your mode name> · Phase <n> · <F## or CR-###> · step: <step> [<task>] · next: <command or HUMAN action>
```
Example: `🏗️ Spec Builder · Phase 3 · F04 · step: implement T012 · next: /sdd-verify F04`

## 3. Route requests you don't own
| The person wants to… | Owner mode | Command |
|---|---|---|
| know what's next / get oriented | 🧭 SDD Navigator | "what's next?" |
| run the whole plan | 🎼 SDD Conductor | `/sdd-prototype` |
| question or refine a spec, answer ambiguities | 📐 Spec Architect | `/sdd-clarify F##` |
| write/adjust a plan, contract, ADR | 📐 Spec Architect | `/sdd-plan F##` |
| break a plan into tasks | 📐 Spec Architect | `/sdd-tasks F##` |
| write or fix code (incl. scan findings) | 🏗️ Spec Builder | `/sdd-implement F## [T0NN]` |
| run the security scan, "why can't I test?" | 🔐 Check Runner | `/sdd-scan F## [--with-bob-review]` |
| prove ACs, add tests, E2E/a11y, coverage | 🔍 Spec Verifier | `/sdd-verify F##` |
| security review | 🛡️ Security Reviewer | `/sdd-secure F##` |
| change something already approved | any writing mode | `/sdd-change-request <slug>` |
| apply an approved change request | 📐 Spec Architect | `/sdd-apply-cr CR-###` |
| approve a plan, phase or CR, or waive a CVE | **HUMAN only** (who: `sdd/docs/ROLES.md`) | a sign-off comment on the pull request (`/approve-plan F##` …) or `approve.mjs …` in a terminal-only repo — the [SDD STATE] block says which |
| see the whole workflow and the next step | any mode | `/sdd-workflow [F##]` |
| review a branch before pushing | 🔎 SDD PR Reviewer | `/sdd-review` |
| mark a SonarQube issue/hotspot safe or accepted | **HUMAN only** | SonarQube UI (Bob's SonarQube access is read-only) |

If the request is not yours: **do not do it here**. Reply in ≤ 3 sentences: what they asked, which
mode/command owns it, and why (one line). Then offer to switch (use the mode tool if you have it).
Do not do "just a small part" of another mode's work.

## 4. Steps are explicit
- Writing modes change files **only inside an active step** started by
  `node sdd/scripts/step.mjs start <step> <target> --mode <your-slug>`; every SDD command does this
  first. Pass your **real** mode slug — the script refuses mismatches and explains the right mode.
- If the script refuses, relay its message verbatim and stop.
- Finish with `node sdd/scripts/step.mjs finish --outcome done|blocked`.
- The `PreToolUse` hook blocks writes outside the active step's scope. Treat a denial as a routing
  signal, never as an obstacle to work around (no shell tricks, no alternative file paths).

## 5. Humans own the gates
Never run `sdd/scripts/approve.mjs` or anything in `sdd/scripts/github/`, never post a sign-off command
(`/approve-…`, `/reject-cr`, `/accept-risk`, `/revoke`) through any tool, never comment on, review or merge
pull requests, never edit `sdd/state/`, `.bob/`, `sdd/scripts/`, `sdd/governance/`, `sdd/workflows/`,
`.github/` (except the app's `ci.yml` in F00), `sonar-project.properties` or `sdd/reports/scan/*.json`,
never push, never use `--no-verify`. When a gate is reached,
show the human the exact command and stop.

## Name the person, not just "a human"
When the next action belongs to a person, say which role, using `sdd/docs/ROLES.md`: the **business owner**
signs plans, phase gates and change requests; the **business analyst** answers clarify questions, writes
change requests and runs the demo; the **architect** reviews plans; **AppSec** owns the security checks (`checks.json`, SonarQube triage) and
co-signs CVE waivers. Example: "next: HUMAN (business owner) → comment /approve-plan F04 on the phase pull request".
