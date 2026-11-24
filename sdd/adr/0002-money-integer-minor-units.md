# ADR-0002 — Money as integer minor units; decimal strings on the wire

- **Status:** Accepted · **Date:** 2026-11-18

## Context
JavaScript `number` is IEEE-754 double: `0.1 + 0.2 !== 0.3`. AED has **3** decimal places,
JPY has 0. Rounding errors in a bank demo destroy credibility and break ledger invariants.

## Decision
1. Domain type `Money { minor: bigint; currency: CurrencyCode }` with operations
   `add`, `subtract`, `multiplyRate(rate: Decimal, rounding: HALF_EVEN)`, `allocate`,
   `compare`, `isZero`, `negate`, `toDecimalString()`, `fromDecimalString()`.
2. Rates use a decimal type (`decimal.js` configured with precision 34) **only** inside
   `multiplyRate`; results immediately return to `bigint` minor units.
3. DB: `BIGINT amount_minor` + `CHAR(3) currency`. Prisma maps to `bigint`.
4. Wire: `{ "amount": "12505.00", "currency": "AED" }`; strings must carry exactly the
   currency exponent digits.
5. Lint bans `parseFloat`, `Number(`, `toFixed`, `Math.round` in `packages/domain/src/money/**`,
   `apps/api/src/modules/{ledger,payments,bills,cards}/**` and `apps/web/src/lib/money/**`.

## Consequences
- ✅ Exact arithmetic; invariants provable with property-based tests (fast-check).
- ⚠️ `bigint` is not JSON-serialisable → explicit mappers at the API boundary (good: forces
  the wire format).

## Alternatives
Decimal strings everywhere (slower, error-prone comparisons); `number` of minor units
(safe only up to 2^53 and invites accidental division).
