# Domain rules — what this product must never get wrong

This folder holds the **domain** of the worked example: Tidewell Bank, a fictional UAE retail bank.
Everything Bob needs to know about the business — money, ledger, payments, the bank's own security
abuse cases — lives here and in the numbered specs, not in Bob's configuration.

Bob's modes, rules, commands and skills (`.bob/`), the scripts (`sdd/scripts/`) and the governance
files are industry-agnostic. To use the kit for another domain (insurance, health, retail,
government…), replace this folder and the specs; the Bob layer stays the same.

| File | Covers | Loaded by |
|---|---|---|
| [invariants.md](invariants.md) | The hard rules: money type, ledger, payments, synthetic data | rule 02 and the **domain-rules** skill, for any code that touches them |
| [money-and-ledger.md](money-and-ledger.md) | How to represent, parse, calculate, quote and post money | **domain-rules**, when code touches money, balances, journals, holds, FX or fees |
| [currency-table.md](currency-table.md) | Currency exponents, symbols and test values | `money-and-ledger.md` |
| [posting-recipes.md](posting-recipes.md) | Every journal shape the product uses, with worked numbers | `money-and-ledger.md` |
| [security-checklist.md](security-checklist.md) | The project's ASVS L2 checklist with its banking abuse cases | the **security-review** skill, after its general checklist |

## The domain's own checks

These commands prove the invariants once the workspace exists. The 🏗️ Spec Builder runs them after
touching domain code; the 🔍 Spec Verifier runs them for every feature.

| Command | Proves |
|---|---|
| `pnpm ledger:check` | every journal balances per currency; cached balances equal the postings |
| the concurrency test (SPEC-03 §5.4) | no overspend under parallel requests |

## For another domain

Keep the same shape: one `invariants.md` with the rules that must never break, one reference file per
area the code touches, a security checklist with the domain's abuse cases, and a table of the commands
that prove the invariants. Update the table above so the **domain-rules** skill can find them.
