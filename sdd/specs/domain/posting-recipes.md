# Posting recipes (worked examples)

Notation: `Dr` debit, `Cr` credit; customer deposit accounts increase with Cr.
Each journal must balance **per currency**.

## R1 — Own transfer, same currency (Sara: Main → Smart Saver, AED 2,000.00)
| Leg | Account | Dr | Cr |
|---|---|---|---|
| 1 | acc Main (AED) | 2,000.00 | |
| 2 | acc Smart Saver (AED) | | 2,000.00 |

## R2 — Own transfer with FX (Sara: Main AED → Global USD, send AED 1,000.00, rate 0.2709)
| Leg | Account | Ccy | Dr | Cr |
|---|---|---|---|---|
| 1 | acc Main | AED | 1,000.00 | |
| 2 | GL-FX-POSITION-AED | AED | | 1,000.00 |
| 3 | GL-FX-POSITION-USD | USD | 270.90 | |
| 4 | acc Global USD | USD | | 270.90 |
AED: 1,000.00 = 1,000.00 ✔ · USD: 270.90 = 270.90 ✔. The USD amount was rounded HALF_EVEN when the
quote was created and the stored quote amounts are posted verbatim, so each currency balances by
construction; the sub-minor-unit difference is recorded on the quote (`roundingResidue`) for
reporting. `GL-FX-ROUNDING-<CCY>` is used only when one converted amount is split across several
legs (allocation residue, e.g. fee + principal from one conversion).

## R3 — Domestic outgoing (Sara → Ahmad Saleh at Northbay Lantern Bank, AED 1,200.00)
At submission: `placeHold(Main, 1,200.00, reason PAYMENT, ref order)`; no postings.
At settlement (job), single transaction:
| Leg | Account | Dr | Cr |
|---|---|---|---|
| 1 | acc Main | 1,200.00 | |
| 2 | GL-SETTLE-DOMESTIC-AED | | 1,200.00 |
then `releaseHold(order)`. On rail rejection: `releaseHold(order)` only.

## R4 — International SHA with fee (Daniel: AED account → EUR 500.00 to Carlos, rate AED per EUR 4.0039 incl. margin, fee AED 35.00)
Debit amount = 500.00 × 4.0039 = AED 2,001.95; total = 2,036.95 (hold at submission).
| Leg | Account | Ccy | Dr | Cr |
|---|---|---|---|---|
| 1 | acc Daniel AED | AED | 2,036.95 | |
| 2 | GL-FEE-INCOME-AED | AED | | 35.00 |
| 3 | GL-FX-POSITION-AED | AED | | 2,001.95 |
| 4 | GL-FX-POSITION-EUR | EUR | 500.00 | |
| 5 | GL-SETTLE-SWIFT-EUR | EUR | | 500.00 |

## R5 — Bill payment (Sara → AquaGrid AED 374.50)
| 1 | acc Main | 374.50 | |
| 2 | GL-BILLER-SETTLE-AED | | 374.50 |

## R6 — Credit-card repayment (Sara: Main → Credit card, AED 2,899.00)
Credit-card balance is "owed": a **Cr** on the card account reduces owed.
| 1 | acc Main | 2,899.00 | |
| 2 | acc Credit card | | 2,899.00 |

## R7 — Return after completion (DEMO-RETURN on R3)
Reversing journal referencing the original:
| 1 | GL-SETTLE-DOMESTIC-AED | 1,200.00 | |
| 2 | acc Main | | 1,200.00 |
Order status COMPLETED → RETURNED.

## R8 — Card replacement fee (AED 50.00)
| 1 | acc linked | 50.00 | |
| 2 | GL-FEE-INCOME-AED | | 50.00 |

## R9 — Seed opening balance (seed only)
| 1 | GL-SEED-EQUITY-AED | 34,502.50 | |
| 2 | acc Main | | 34,502.50 |
