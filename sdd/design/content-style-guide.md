# Content Style Guide (microcopy)

## 1. Voice
Calm, clear, respectful, never alarmist. Plain language at roughly a reading age of 12.
Second person ("you", "your"). Active voice. No banking jargon without explanation
(IBAN, BIC, value date get Toggletips). Never blame the customer.

## 2. Terminology (use exactly these)
| Use | Don't use |
|---|---|
| Transfer (noun/verb) | Remittance, wire (except "international transfer") |
| Payee (UI) — beneficiary in code/specs | Recipient, beneficiary (in UI) |
| Available balance | Usable funds |
| Current balance | Ledger balance (in UI) |
| Pending | Unposted, memo |
| Verify it's you | Authenticate, 2FA challenge |
| Code | OTP, token (in UI) |
| Freeze card | Block card (block = permanent) |
| Sign in / Sign out | Log in / Log out |
| Statement | e-Statement |

## 3. Patterns
| Situation | Pattern | Example |
|---|---|---|
| Field validation | What's wrong + how to fix | "Use at least 12 characters." |
| Blocking error | What happened + what you can do | "Your available balance isn't enough for this payment, including fees. Choose a smaller amount or another account." |
| System error | Apologise once + reference | "Something went wrong on our side. Please try again. Reference: 4bf92f35." |
| Success toast | Past tense, specific | "Card frozen. New purchases will be declined." |
| Destructive confirm | Title = question, body = consequence, button = verb | "Delete Ahmad Saleh?" / "This also cancels 1 standing order." / [Delete payee] |
| Empty state | What this is + first action | "No payees yet. Add someone you pay regularly." [Add payee] |
| Security notice | Fact + action if not you | "New sign-in from Chrome on macOS. If this wasn't you, change your password now." |

## 4. Numbers, dates and money
- Money: currency code + space + amount with grouping and exact decimals: `AED 12,505.00`,
  `USD 19.99`, `JPY 1,200`. Sign before currency code: `−AED 125.00` (true minus U+2212 in UI,
  ASCII `-` in CSV).
- Arabic: same Western digits; currency code placement per `Intl` for `ar` with Latin digits
  (`numberingSystem: 'latn'`); amounts wrapped in LTR isolate.
- Dates: `Wed 18 Nov 2026` in lists/receipts (en), `الأربعاء 18 نوفمبر 2026` (ar); times 24-hour.
- Relative: "Today", "Yesterday", then absolute.
- Rates: 4 dp for display (`1 USD = 3.6914 AED`), full precision on receipts.

## 5. Accessibility of copy
- Link text describes destination ("View all transactions for Main"), never "click here".
- Button labels start with a verb and are unique per page.
- Error messages are associated to fields (`aria-describedby`) and listed in the summary.
- Don't rely on colour words ("the red button").

## 6. Arabic translation notes
- Translations are written natively, not machine-literal; review by a fluent speaker is a
  Phase 7 gate item (record reviewer in `sdd/reports/verification/NFR.md`).
- Keep product names (Tidewell, Smart Saver) untranslated; transliterate in Arabic where
  natural ("تايدويل").
- Gendered forms: use neutral/plural address where possible.
