---
title: Why spec-driven development matters for a bank — and how IBM Bob fits in
description: AI can write a bank's software in hours. The hard part is control. Spec-driven development keeps every decision with people — Bob builds, people approve, checks verify.
date: 2026-11-24
---

# Why spec-driven development matters for a bank — and how IBM Bob fits in

## In short

AI assistants such as IBM Bob can now write working software in hours. For a bank, speed is not the hard part any more. The hard part is control: building exactly what the business decided, proving it, keeping it secure, and being able to show an auditor who decided what.

**Spec-driven development** keeps those decisions with people. The business writes down what it wants, in plain sentences with examples. Bob does the writing — plans, code, tests — in small steps that each point back to a sentence. Named people sign the decisions that matter. Security checks — simple built-in ones, and the bank's own tools — verify the code as Bob writes it, at commit and before anyone tests it. And every check runs twice: on the developer's laptop, and again in the delivery pipeline where nobody can switch it off. In short: **Bob builds. People approve. Checks verify.**

To show what this looks like in practice, the example uses **Tidewell Bank**, a fictional UAE bank (AED, English and Arabic) whose online banking is fully specified and built with Bob.

## The problem with fast AI code in a bank

- **It guesses.** A chat prompt is not a requirement; gaps are filled with plausible guesses.
- **Nobody can prove it does what was asked.** Without written examples, "done" means "looks done".
- **Security comes last.** Problems are found in a penetration test or in production, when they are slowest and most expensive to fix.
- **The audit trail is a chat log.** Who approved the change, on what basis? The answer is scattered.

## What spec-driven development is

1. **Write it down first.** Each feature gets a spec: short sentences, each with an example a business person can check — *with AED 48,000 already sent today, an AED 3,000 transfer is refused and the customer sees what is left.*
2. **Agree how, before building.** Bob drafts a plan; the business owner signs it. The signature locks the spec and the plan.
3. **Build in small, traceable steps.** Every piece of code names the requirement it delivers, and comes with a test.
4. **Check against the spec, not the AI's opinion.** A separate step proves every example; security checks that Bob cannot change verify the code.
5. **Change the spec first.** When the business changes its mind, a person decides a change request, and only then does anything change.

## Who does what

| | Role | In plain words |
| --- | --- | --- |
| **Maker** | IBM Bob | Writes the plan, the code and the tests, one step at a time. Each step is done in a mode that can only touch its own files. Bob can never sign anything. |
| **Checkers** | the business owner, the business analyst, the architect, the developer, AppSec | The business owner signs plans, phases and changes. AppSec decides on security risks and owns the checks. The analyst checks the proof. The architect and the developer guide the work. |
| **Checks** | built-in checks and the bank's own tools — for example IBM detect-secrets, HashiCorp Vault Radar or SonarQube | Run as Bob writes, at commit and before any testing, and decide whether code may move on. Bob runs them and explains them; it cannot write their verdict or switch them off. |

Banks know this as maker–checker, or four-eyes: whoever builds something never approves it. The kit enforces it — even the pipeline checks that the person who signed did not also make the change.

## What runs by itself, and what a person must decide

Not every change carries the same risk. Each feature gets a **risk tier**, and the tier sets the process:

| Tier | Example | Plan signed by | Hand security review | How far Bob may run alone | Production approved by |
| --- | --- | --- | --- | --- | --- |
| 1 Critical | transfers, sign-in, cards | business owner | required | one step at a time | business owner **and** AppSec |
| 2 Sensitive | accounts, statements | business owner | required | one step at a time | business owner |
| 3 Standard | dashboard, notification settings | business owner or architect | optional | several steps | business owner |

Automated checks — tests, the security checks, the rules on every change — always run; nobody can switch them off. Some human decisions are **locked**: every feature needs a person to sign its plan; a developer never signs; only AppSec accepts a security risk; only the business owner changes the scope; every release to production needs a person, and critical releases need two. The settings live in one file that is reviewed like code, and the system refuses any change that would remove a locked decision.

## Security, found early

Security is no longer a final check. The same control runs in several places. A password or key, or risky code such as SQL built from strings, is refused the moment Bob tries to write it, again when the developer commits, again on all the code before any testing starts, and again in the pipeline. The verdict before testing is tied to the exact code: change one line and the checks must run again. A person then reviews what tools cannot see, such as who may see whose account. The penetration test before go-live stops being the first time anyone looks.

The kit ships simple built-in checks, so the labs need nothing but Node. An organisation plugs in its own tools in one file, and each then runs at every stage it lists. From the IBM portfolio, for example: Bob flagging problems and secrets in the editor (Bob Findings; the DevSecOps premium package adds SAST and supply-chain scanning), IBM detect-secrets or HashiCorp Vault Radar at commit, a Bob Shell review in the pipeline (advisory only), and IBM DevOps Deploy calling the release check as a gate. These are examples, not requirements.

Why run IBM detect-secrets when Bob already finds secrets? They guard the same thing at different stages. Bob advises in one developer's editor and understands context. IBM detect-secrets — an open-source scanner IBM maintains — gives the same answer for everyone, covers people's own commits as well as Bob's, and keeps an audited baseline in git that an auditor can read.

## It works with what the bank already has

- **Any git server and any build pipeline.** Sign-offs can be given with a short command in a terminal, and every pipeline — Jenkins, Azure DevOps, GitLab — runs the same single gate command. This works with an enterprise GitHub that has no GitHub Actions.
- **Public GitHub, fully automated.** On github.com, sign-offs become comments on the pull request, and Bob also reviews each change.
- **The bank's own security tools.** Any tool with a command line plugs into one settings file, and runs wherever the bank chooses: as Bob writes, at commit, before testing or in the pipeline.

## What an auditor gets

Every decision is a file or a record in the repository: who signed, bound to exactly which version; which test proves which requirement; what the security checks said about which code. One command assembles an evidence pack for any feature.

## Questions people ask

**Doesn't writing specs slow us down?** Writing a spec takes hours; discovering in testing that the AI built the wrong thing takes weeks. Bob drafts most of the plan and code, so the people's time goes into decisions.

**Do business owners need to learn technical tools?** Very little: signing is one short command on a prepared laptop, or a one-line comment on GitHub. The decision is theirs and is recorded under their name.

**Can the AI approve its own work?** No. Bob cannot sign, cannot write the checks' verdict or switch a check off, and cannot change a signed spec. The pipeline checks this again.

**What if someone bypasses the checks on their laptop?** Then the pipeline catches it: it runs the same rules on the server, and the change cannot be merged.

**Is this only for banks?** No. Any organisation that must prove who decided what — insurance, health, government — benefits. A bank just makes the need obvious, and the kit is built for that: Bob's modes, rules and skills know nothing about banking. The bank lives in the specs, so another domain swaps the specs and keeps the rest.

## Where to start

- The [Tidewell SDD Atlas](../atlas/): the whole cycle, step by step, with the automation dial and the security checks you can try.
- The [presentation](../deck/tidewell-sdd-ibm-bob-deck.pdf) (PDF): twenty-one slides for a mixed audience.
- The [lab guide](../labs/): a day, alone or with others, running the cycle for real.
- The [kit on GitHub](https://github.com/sametkilictas/tidewell-sdd-ibm-bob): clone it, open it in IBM Bob, and ask the Navigator "what's next?".
