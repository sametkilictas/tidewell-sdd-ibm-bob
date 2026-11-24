# ADR-0003 — Double-entry ledger as the only source of balances

- **Status:** Accepted · **Date:** 2026-11-18

## Context
Professional banking demos are judged by whether numbers *always* add up: transfers,
fees, FX, reversals and statements must reconcile.

## Decision
- Immutable `journal_entries` + `postings` (SPEC-03 §5). Every balance change is a balanced
  journal. Customer balances are a cache (`accounts.ledger_balance_minor`) updated in the same
  transaction and verifiable by recomputation.
- Holds model available-balance reservations separately from postings.
- Only the `ledger` module may insert postings (enforced by module boundaries + DB role in
  tests: other repositories have no INSERT grant on `postings` in the test schema).
- Corrections are reversing journals; no UPDATE/DELETE on postings (DB trigger raises).

## Consequences
- ✅ Statements, receipts and trial balance reconcile by construction.
- ✅ `pnpm ledger:check` can prove correctness at any time.
- ⚠️ Slightly more code for simple transfers (recipes in `sdd/specs/domain/posting-recipes.md`).

## Alternatives
Single-entry `balance` column updates (unverifiable); event-sourced accounts (overkill).
