# Domain invariants — Tidewell Bank (money, ledger, payments)

The rules that most often go wrong when an AI writes banking code, for this worked example. Bob's
rule 02 (`.bob/rules/02-domain-invariants.md`) makes every one a hard requirement, and the generic
**domain-rules** skill loads `money-and-ledger.md` whenever code touches money.

## Money
- Internal type `Money { minor: bigint; currency }` from `packages/domain`. Never `number` for money.
- Wire format `{ "amount": "12505.00", "currency": "AED" }` with **exactly** the currency exponent
  (AED/USD/EUR/GBP/SAR 2, KWD/BHD 3, JPY 0).
- Forbidden on money: `parseFloat`, `Number()`, `toFixed`, `Math.round`, `+`/`*` on decimal strings,
  floating literals like `0.005`. Lint enforces; do not disable the rule.
- Rounding only half-even, only in `Money.multiplyRate` / fee calculators; residue goes to a GL.
- The web app never calculates money other than formatting; totals, fees and FX come from the API.

## Ledger
- Balances change **only** through `ledger.post(journal)`; every journal balances per currency.
- Postings are immutable; corrections are reversing journals.
- Available = ledger − holds + overdraft. Never let a customer debit make it negative.
- Lock accounts `FOR UPDATE` in ascending id order inside one DB transaction; write audit and
  outbox rows in the same transaction.
- `pnpm ledger:check` must pass after seeds and in every integration test file's `afterAll`.

## Payments
- Every money-moving POST requires `Idempotency-Key`; same key + same payload ⇒ same result.
- Re-validate everything at submission (balance, limits, cut-off, beneficiary status, quote expiry),
  even if the quote step validated it seconds earlier.
- Respect the PaymentOrder state machine (SPEC-03 §6.1); illegal transitions throw.
- Step-up tokens are single-use and bound to purpose (+ payload hash where specified).
- Demo markers (`DEMO-REJECT`, `DEMO-RETURN`, `DEMO-REVIEW`) and fault toggles exist only when
  `DEMO_MODE=true`.

## Data
- Only synthetic data. Card PANs only from test BINs `400000` / `555555`, Luhn-valid, encrypted at rest.
- IBANs are built with `buildIban()` using fictional bank codes; never paste real IBANs.
