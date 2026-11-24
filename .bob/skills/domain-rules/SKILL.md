---
name: domain-rules
description: Apply the product's domain invariants before writing or reviewing code that touches them. The domain is defined in sdd/specs/domain/ (for this repository's worked example, a bank - money, ledger, payments). Use whenever code parses, formats, calculates, stores or moves core business values, changes state machines, or touches anything sdd/specs/domain/README.md lists.
---

# Domain rules skill

The Bob layer of this repository knows nothing about any industry. The domain lives in the specs.
This skill tells you how to find and apply it.

## Procedure
1. Read `sdd/specs/domain/README.md`. Its table maps each area of the domain to a file.
2. Match the code in front of you to those areas: the files you will change, the requirement IDs of
   the task, and the module names in `sdd/specs/02-architecture.md`.
3. Read every matching file in full before writing code, and `invariants.md` always.
4. While you write: every MUST in those files is a hard requirement (rule 02). If one blocks the task,
   stop and raise a change request; never work around it.
5. Write tests for the invariants your change touches, tagged with the requirement IDs.
6. Run the domain's own checks from the README's table, and say in your report that they passed.

## Self-check before you finish
- [ ] I read `invariants.md` and every domain file that matches the change.
- [ ] No invariant is weakened, skipped or "temporarily" disabled in the diff.
- [ ] Each invariant the change touches has a tagged test.
- [ ] The domain's checks pass (command output in the report).

## When reviewing (🔎 SDD PR Reviewer, 🛡️ Security Reviewer, 🔍 Spec Verifier)
Use the same files as the yardstick: a change that breaks a domain invariant is a **High** finding,
whatever else it does well.
