# Currency table and test values

| Code | Exponent | Minor unit | Account ccy | Tradable | Example wire string | Minor units |
|---|---|---|---|---|---|---|
| AED | 2 | fils | ✔ | ✔ | `"12505.00"` | 1250500n |
| KWD | 3 | fils | — | ✔ | `"1250.500"` | 1250500n |
| BHD | 3 | fils | — | ✔ | `"10.125"` | 10125n |
| USD | 2 | cent | ✔ | ✔ | `"19.99"` | 1999n |
| EUR | 2 | cent | ✔ | ✔ | `"0.05"` | 5n |
| GBP | 2 | penny | — | ✔ | `"100.00"` | 10000n |
| SAR | 2 | halala | — | ✔ | `"37.50"` | 3750n |
| JPY | 0 | yen | — | ✔ | `"1200"` | 1200n |

## Must-pass unit cases
| Input | Expect |
|---|---|
| `fromDecimalString("0.1","AED",{strict:true})` | throws WRONG_EXPONENT |
| `fromDecimalString("0.1","AED")` (user input) | 10n |
| `fromDecimalString("1200.5","JPY")` | throws (JPY has no decimals) |
| `toDecimalString(5n,"EUR")` | `"0.05"` |
| `toDecimalString(-1250500n,"AED")` | `"-12505.00"` |
| `toDecimalString(-1250500n,"KWD")` | `"-1250.500"` |
| `AED 1000.00 × 0.2709 (→USD)` HALF_EVEN | `USD 270.90` |
| `AED 0.05 × 0.2709` | `USD 0.01` (0.013545 → 0.01) |
| `USD 0.125 → round HALF_EVEN to 2dp` | `0.12` |
| `USD 0.135 → round HALF_EVEN to 2dp` | `0.14` |
| `allocate(AED 10.00,[1,1,1])` | `[3.34, 3.33, 3.33]` |
| `allocate(KWD 10.000,[1,1,1])` | `[3.334, 3.333, 3.333]` |

## Display (en)
`AED 12,505.00` · `USD 19.99` · `JPY 1,200` · negative `−AED 125.00` (U+2212 in UI).
