# Money and ledger — Tidewell Bank (worked example)

Domain reference for this scenario, loaded by Bob through the generic **domain-rules** skill whenever
code parses, formats, calculates, stores or moves money, or touches balances, journals, postings,
holds, FX or fees. Follow it exactly; ADR-0002 and ADR-0003 explain why.

## 1. Representation checklist
- Domain: `Money { minor: bigint; currency: CurrencyCode }` (immutable). Construct only via
  `Money.of(minor, ccy)` or `Money.fromDecimalString("125.00", "AED")`.
- Exponents live in `currency-table.md` (this folder) (same data as `packages/domain/src/money/currencies.ts`).
- DB: `amount_minor BIGINT`, `currency CHAR(3)`; Prisma `BigInt`.
- API: `{ amount: string, currency }` — `toDecimalString()` always emits exactly `exponent` decimals.
- Web: `formatMoney(money, locale)` → `new Intl.NumberFormat(locale, { style: 'currency', currency,
  currencyDisplay: 'code', minimumFractionDigits: exp, maximumFractionDigits: exp,
  numberingSystem: 'latn' }).format(decimalString)` — pass the **decimal string** (Intl.NumberFormat
  v3 formats strings exactly), never a JS number. Cover 3-dp and 0-dp cases in tests.

## 2. Parsing rules (`fromDecimalString`)
1. Trim; reject empty, exponent notation (`1e3`), leading `+`, more than one `.`, grouping commas
   (UI normalises input before calling).
2. Fraction length must be **≤ exponent** for user input (pad right) and **== exponent** for wire
   input (`strict: true`). Wrong exponent on the wire ⇒ `VALIDATION_FAILED` (`WRONG_EXPONENT`).
3. Build `minor = BigInt(intPart) * 10n ** BigInt(exp) + BigInt(fracPadded)`; apply sign.

## 3. Arithmetic
- `add/subtract` require same currency (throw `CURRENCY_MISMATCH`).
- `multiplyRate(rate: string, targetCcy, rounding = 'HALF_EVEN')` — uses `decimal.js`
  (precision 34) internally, converts minor→major, multiplies, rounds to target exponent, returns
  new `Money` in target currency. This is the **only** place decimals exist.
- `allocate(ratios: number[])` — integer split, distributing remainder 1 minor unit at a time to
  the first parts; sum preserved (test it).
- Fees are computed in AED then converted if the debit account currency differs, with the same
  quote's rate (never a second quote).

## 4. FX quote recipe
Rates are expressed as **units of buy currency per 1 unit of sell currency**.
```
mid(AED→USD)      = 1 / 3.6725            = 0.272294…   (feed gives AED per USD)
customer rate     = mid × (1 − 0.0050)    = 0.2709      (bank buys AED, gives less USD; 50 bps)
buy amount        = AED 1,000.00 × 0.2709  = USD 270.90  (HALF_EVEN to 2 dp)
store FxQuote { id, sell: AED 1,000.00, buy: USD 270.90, rate: "0.27090000", inverseRate, midRate,
                marginBps: 50, roundingResidue, expiresAt: now + 30 s }
```
- "Receive" mode (customer enters USD 100.00): sell = buy ÷ rate, rounded HALF_EVEN to the sell
  exponent (Constitution Art. III.4 — no other rounding modes); the residue is stored on the quote.
- Execute only if `now ≤ expiresAt` (else `FX_QUOTE_EXPIRED`) and post the stored amounts verbatim.
- Cross currency (USD→EUR): compute via AED mid rates, apply margin once, quote a single rate.

## 5. Ledger posting recipe (pseudo-TypeScript)
```ts
await db.$transaction(async (tx) => {
  const accounts = await ledger.lockAccounts(tx, [debitId, creditId].sort()); // SELECT … FOR UPDATE
  const debit = accounts.get(debitId)!;
  assertDebitable(debit);                                  // status ACTIVE, not FROZEN/DORMANT/CLOSED
  const available = await ledger.available(tx, debit);     // ledger − holds + overdraft
  if (available.lessThan(totalDebit)) throw new DomainError('INSUFFICIENT_FUNDS');
  const journal = Journal.create({ type: 'TRANSFER_OWN', reference, businessDate, valueDate })
    .debit(debit.id, totalDebit)
    .credit(creditId, creditAmount)                        // + FX legs / fee legs per posting-recipes.md
    .assertBalanced();                                     // Σ debit = Σ credit per currency
  await ledger.post(tx, journal);                          // inserts postings, updates cached balances
  await audit.record(tx, { action: 'TRANSFER_CREATED', … });
  await outbox.add(tx, { type: 'accounts.balance_changed', … });
});
```
- External transfers: **hold** at submission (`ledger.placeHold`), **post + release** at settlement
  (same transaction), **release only** on failure.
- Never update `ledger_balance_minor` outside `ledger.post`.
- After writing ledger code: run `pnpm ledger:check` and the concurrency test (SPEC-03 §5.4).

## 6. Supporting files
- `currency-table.md` (this folder) — exponents, symbols, test values.
- `posting-recipes.md` — every journal shape used by the prototype with worked numbers.

## 7. Self-check before you finish
- [ ] No `number` holds money anywhere in the diff (search for `parseFloat|toFixed|Number(` in money paths).
- [ ] Every journal balances per currency (unit test with `assertBalanced`).
- [ ] Idempotency key path covered by a test.
- [ ] Rounding residue posted to `GL-FX-ROUNDING-<CCY>` when FX applies.
- [ ] Tests include a 3-dp (KWD or BHD) and a 0-dp (JPY) case.
