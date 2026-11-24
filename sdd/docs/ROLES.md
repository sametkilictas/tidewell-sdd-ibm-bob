# Roles: who does what in the SDD loop

Bob does the writing. People decide what to build, check that it is right, and sign it off. This page
says which person does what at each step of the loop: first in plain words, then as a table. The
Constitution (Article IX) points here, and the Atlas site's *How it works* page is built from this page.

In every step **one person has the turn**: they start the step (in Bob, or on the pull request) and move it
along. Bob does the writing inside the step. Someone else often has **the final say**: they check the result
or sign it.

## The roles

### Business owner
Also called product owner or sponsor. Owns **why** and **how much**: what the product is for, what is in
scope, what comes first, and whether a feature is what the business needs.
- **Signs:** the plan of each feature (which locks its spec), the end of each phase, change requests, and,
  together with AppSec, accepted security risks.
- **Works in:** the pull request (reading, commenting), a terminal or the pull request for signing, the phase demo, and the Atlas
  site. Never needs Bob.
- **GitHub team:** `@YOUR-ORG/product-owners` (and `@YOUR-ORG/sdd-approvers` for approvals).

### Business analyst
Owns **what**: the requirements, written as short "when …, the system shall …" sentences (EARS), each with
examples a test can prove (acceptance criteria).
- **Writes:** the feature specs: before the plan is signed, directly or by answering Bob's questions in the
  clarify step (`/sdd-clarify` in 📐 Spec Architect); after that, only through a change request. Also user
  stories and the demo script (`sdd/design/user-flows.md`).
- **Checks:** that the plan covers every requirement, and that the tests prove each example the way the
  business meant it.
- **Works in:** Bob (the clarify step), the pull request, the Atlas site.
- **GitHub team:** `@YOUR-ORG/business-analysts`.

### Architect
Lead architect or tech lead. Owns **how**: the plan, the API contract, technical decisions (ADRs) and
libraries.
- **Runs:** the plan and tasks steps in Bob, and applies approved change requests.
- **Reviews:** every plan before the business owner signs it, and the technical impact of change requests.
- **Works in:** Bob (📐 Spec Architect), the pull request.
- **GitHub team:** `@YOUR-ORG/architects`.

### Developer
Builds the feature with Bob: runs the build, scan, verify and security-review steps, reviews every change
Bob makes, opens the pull request and fixes what is found (or asks Bob with `/bob fix` on the pull
request). Never signs.
- **Works in:** Bob (🏗️ Spec Builder, 🔐 Check Runner, 🔍 Spec Verifier, 🛡️ Security Reviewer), git, the pull
  request.

### AppSec
Owns security risk: which security checks run where (`sdd/governance/checks.json`, including your organisation's own tools)
and their pass/fail rules (with SonarQube, the **Tidewell Bank** quality gate), false alarms and accepted risk. Reads every security report and decides on serious findings; agrees CVE waivers with the
business owner.
- **Works in:** the pull request (`sdd/governance/checks.json`, `sdd/reports/security/`, `sdd/reports/scan/`), the organisation's security tools (SonarQube, if it is the scanner).
- **GitHub team:** `@YOUR-ORG/appsec`.

### Bob
The AI assistant, in one mode per kind of work. It writes specs, plans, code, tests and reports inside
the step that allows it. It can never approve anything.

## Each step in plain words

### 1. Clarify — make the spec clear `clarify`
- **In short:** Analyst + Bob
- **Whose turn:** Business analyst, in Bob
- **What they do:** Start Bob's clarify step for the feature and answer its questions, one or two at a time. Each question comes with options and a suggested answer.
- **What Bob does:** Reads the spec, finds what is vague or missing, asks up to eight questions, and writes each answer into the spec.
- **Who else helps:** Business owner — answers the business questions the analyst can't. Architect — says early if something can't be built.
- **Done when:** Every open question has an answer written in the spec.

### 2. Plan — decide how to build it `plan`
- **In short:** Architect + Bob
- **Whose turn:** Architect, in Bob
- **What they do:** Start Bob's plan step and steer it: the approach, the changes to the API, any new libraries.
- **What Bob does:** Writes the plan and the API changes, checks them against the project's ground rules (the constitution), then stops so people can review.
- **Who else helps:** Business analyst — checks every requirement is covered. Developer — checks the work is realistic. AppSec — looks at the security choices.
- **Done when:** The plan is on the pull request, ready for the business owner.

### 3. Approve plan — sign the plan `approve-plan`
- **In short:** Owner signs
- **Whose turn:** Business owner (for a tier 3 feature the architect may sign instead; see `sdd/governance/policy.json`)
- **What they do:** Read the spec and the plan, then sign: `node sdd/scripts/approve.mjs plan F04` in a terminal (committed on its own), or the comment `/approve-plan F04` on the pull request on the GitHub path. It means: this is what the business needs.
- **What Bob does:** Nothing. Bob can't sign; it waits.
- **Who else helps:** Architect — reviews and approves the plan first. Business analyst — confirms the examples in the spec are complete.
- **Done when:** The sign-off is recorded in `sdd/state/approvals.json`, bound to the exact spec and plan. From now on the spec and the plan are locked: changing them needs a change request.

### 4. Tasks — split the work into small tasks `tasks`
- **In short:** Architect + Bob
- **Whose turn:** Architect, in Bob
- **What they do:** Start Bob's tasks step and check that the split follows the plan.
- **What Bob does:** Breaks the signed plan into tasks of one to four hours, each linked to the requirements it delivers.
- **Who else helps:** Developer — checks each task is small enough to do in one go.
- **Done when:** Every requirement is covered by at least one task.

### 5. Implement — build it, test first `implement`
- **In short:** Developer + Bob
- **Whose turn:** Developer, in Bob
- **What they do:** Start Bob's build step, task by task, and review every change Bob makes.
- **What Bob does:** For each task, writes a test that fails, then the code that makes it pass, then saves the change with the requirement it delivers. On GitHub it also reviews the pull request, and fixes what a developer asks for with `/bob fix`.
- **Who else helps:** Business analyst — answers questions, and raises a change request if a business rule turns out to be wrong. Architect — reviews tricky changes.
- **Done when:** Every task is ticked and the tests pass.

### 6. Scan — the security checks run before any testing `scan`
- **In short:** Developer + checks
- **Whose turn:** Developer, in Bob
- **What they do:** Start the scan, and send anything it finds back to the build step.
- **What Bob does:** Runs the security checks — scripts and tools Bob doesn't control: the built-in checks, the organisation's own tools, or SonarQube — and explains what they found. It never changes code in this step.
- **Final say:** AppSec — owns the checks and their pass/fail rules, and decides which findings are false alarms.
- **Done when:** The checks pass this exact code. Any later change to the code means scanning again.

### 7. Verify — prove every example works `verify`
- **In short:** Developer + Bob
- **Whose turn:** Developer, in Bob
- **What they do:** Start Bob's verify step and fix any defect it finds.
- **What Bob does:** Makes sure every example in the spec has a test that passes, and writes a verification report.
- **Final say:** Business analyst — checks each example is proven the way the business meant it.
- **Done when:** The report shows every example proven.

### 8. Secure — review security by hand `secure`
- **In short:** Developer + Bob
- **Whose turn:** Developer, in Bob
- **What they do:** Start Bob's security review and fix what it finds.
- **What Bob does:** Looks for what scanners can't see: who may do what, money movements, secrets, audit trails. It writes a security report.
- **Final say:** AppSec — reads the report and decides on any serious (High or Critical) finding.
- **Done when:** AppSec accepts the report and no serious finding is open.

### 9. Approve phase — show it, then sign the phase `approve-phase`
- **In short:** Analyst demo, owner signs
- **Whose turn:** Business analyst, then the business owner
- **What they do:** The analyst runs the demo and checks the phase checklist. The owner watches the demo, then signs the phase: `node sdd/scripts/approve.mjs phase 3`, or `/approve-phase 3` on the pull request on the GitHub path.
- **What Bob does:** Can click through the demo in a browser and take a screenshot of each step. It can't sign.
- **Who else helps:** Architect and AppSec — confirm nothing serious is still open.
- **Done when:** The phase sign-off is recorded, and the next phase opens.

### Change request — change something already signed `change-request`
- **In short:** Analyst writes, owner decides
- **Whose turn:** Business analyst, then the business owner
- **What they do:** The analyst writes down why the change is needed and the options (Bob can draft it). The owner picks one with `/approve-cr CR-002 option A`, or says no with `/reject-cr CR-002` and a reason.
- **What Bob does:** Any Bob mode can raise a change request. After the owner decides, Bob changes only the files the request lists, with the architect.
- **Who else helps:** Architect — explains the technical impact, then applies the change with Bob. Developer and AppSec — give their view when code or security is affected.
- **Done when:** The change is applied and the owner has signed the plan again.

## Who does what, step by step

**Key:** **R** has the turn (does the work) · **A** has the final say (signs, or accepts the result; one per
step) · **C** helps before it is done · **I** is kept posted · – not involved.


| Step | Business owner | Business analyst | Architect | Developer | AppSec | Bob |
|---|---|---|---|---|---|---|
| Clarify `clarify` | **C** Settles business questions the analyst can't | **R** Runs clarify in Bob and answers its questions; owns the spec's wording | **C** Flags technical limits | – | – | 📐 asks up to 8 questions and records each decision |
| Plan `plan` | **I** Sees the plan pull request | **C** Checks every requirement is mapped | **R** Runs the plan step in Bob; shapes the approach, contract and dependencies | **C** Sanity-checks the effort | **C** Security-relevant choices | 📐 writes plan.md and the contract changes, then stops |
| Approve plan `approve-plan` | **A** Reads spec and plan; signs (terminal or pull request): this is what the business needs | **C** Confirms the acceptance criteria are complete | **C** Reviews and approves the plan first | **I** | – | Cannot approve; waits |
| Tasks `tasks` | – | **I** | **R** Runs the tasks step in Bob; checks the split follows the plan | **C** Checks each task is small enough | – | 📐 breaks the plan into small tasks |
| Implement `implement` | – | **C** Answers questions; raises a CR if a rule is wrong | **C** Reviews tricky changes | **R** Runs the build step in Bob; reviews every commit | – | 🏗️ test first, one commit per task; on GitHub, reviews and fixes on request |
| Scan `scan` | – | – | **I** | **R** Runs the scan in Bob; sends findings back to the build step | **A** Owns the gate; marks false positives | 🔐 runs the checks and explains findings |
| Verify `verify` | **I** | **A** Checks each criterion is proven as meant | – | **R** Runs verify in Bob; fixes defects | – | 🔍 proves every acceptance criterion |
| Secure `secure` | **I** | – | **C** Advises on design fixes | **R** Runs the security review in Bob; fixes findings | **A** Reads the report; decides on High/Critical findings | 🛡️ reviews what scanners can't see |
| Approve phase `approve-phase` | **A** Watches the demo; signs the phase | **R** Runs the demo script; checks the phase checklist | **C** Confirms nothing technical is still open | **I** | **C** Confirms no open High/Critical | Can click through the demo; cannot approve |
| Change request `change-request` | **A** Decides; picks the option | **R** Writes the problem, the options and the business impact | **C** Technical impact; applies it with 📐 | **C** Gives a view when code is affected | **C** Gives a view when security is affected | Any mode raises it; 📐 applies it after the decision |

## How a sign-off works in practice

Every sign-off is a person's decision, bound to the exact files they approved, recorded in
`sdd/state/approvals.json` and checked again by the pipeline. Two ways to give it, set by `"approvalChannel"` in
`sdd/governance/approvers.json`:

| | Terminal path (default) | GitHub path |
|---|---|---|
| Sign a plan | `node sdd/scripts/approve.mjs plan F04`, then commit `approvals.json` on its own, as yourself | comment `/approve-plan F04` (add `@<sha>` to pin the commit you reviewed) |
| Sign a phase (after the demo) | `node sdd/scripts/approve.mjs phase 3` | `/approve-phase 3` |
| Decide a change request | `node sdd/scripts/approve.mjs cr CR-002 --decision approved --option A` | `/approve-cr CR-002 option A` or `/reject-cr CR-002 <reason>` |
| Accept a dependency risk (AppSec) | `node sdd/scripts/approve.mjs waiver CVE-… --feature F04 --reason "…" --expires YYYY-MM-DD` | `/accept-risk CVE-… F04 until YYYY-MM-DD because …` |
| Who you are | your git email, listed in `approvers.json` | your GitHub login, listed in `approvers.json` |
| Checked by | the pipeline: the commit's author is listed with the right role for the feature's risk tier and did not make the change; signed, if required | the sign-off workflow when you comment, and the `signoffs` check on every push |

Who may sign depends on the feature's **risk tier** (`sdd/governance/policy.json`): tier 1 plans only by the
business owner, tier 3 plans by the business owner or the architect. Who may sign is a governance decision, kept in
`approvers.json` and `policy.json`, changed only through a reviewed `chore(SDD)` change; pipelines read both from
the target branch. Reviewers approve the pull request **after** the sign-offs.

## Words you'll meet

| Word | What it means |
|---|---|
| Constitution | The project's ground rules, written once (`sdd/specs/00-constitution.md`): brand, currency, languages, security rules, the quality gate. Every plan is checked against it. |
| Spec | The written description of a feature: user stories, requirements and acceptance criteria (`sdd/specs/features/F##/spec.md`). |
| Requirement | One sentence in EARS form, such as "When a customer submits a transfer, the system shall …", with an ID like `XFER-021`. |
| Acceptance criterion | A testable example that proves a requirement, with an ID like `XFER-021-AC2`; each one gets a tagged test. |
| Plan | How the feature will be built (`plan.md`): approach, API contract changes, dependencies, risks. |
| Task | A 1–4 hour piece of the plan (`tasks.md`); Bob implements one task per commit. |
| Mode | A Bob persona with one job and its own file permissions, such as 📐 Spec Architect or 🏗️ Spec Builder. |
| Workflow | The loop written down as steps (`sdd/workflows/`): 🤖 AI steps Bob does, ⚙️ checks that plain code decides, and ✍️ sign-offs that a named person gives. |
| Step | One stage of the loop (clarify, plan, implement…). A step command starts it, and writes outside it are blocked. |
| Approval | A person's sign-off, recorded in `sdd/state/approvals.json` and bound to the exact files reviewed; editing them afterwards voids it. |
| Sign-off comment | How an approval is given on GitHub: the person types a command such as `/approve-plan F04` on the pull request, and a workflow records it after checking they may. |
| Pull request | The place on GitHub where a phase's work is reviewed: checks run, Bob reviews, people sign, then it merges into `main`. |
| Phase gate | The sign-off at the end of a delivery phase, after the demo; it opens the next phase. |
| Change request (CR) | The only way to change something already approved: a written proposal a person decides on (`sdd/specs/change-requests/`). |
| Security checks | The checks in `sdd/governance/checks.json`: built-in ones and the organisation's own tools, each run as early as it can (in Bob, at commit, before testing, in the pipeline); owned by AppSec. |
| Quality gate | With SonarQube as the scanner: its pass/fail rule for the code, named "Tidewell Bank"; owned by AppSec. |
| Fresh scan | A scan result that matches today's code; any code change makes it stale and needs a new scan. |
| Verification report | Proof that every acceptance criterion passes (`sdd/reports/verification/F##.md`). |
