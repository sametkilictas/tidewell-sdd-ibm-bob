# Low-fidelity Wireframes

ASCII wireframes define **content, hierarchy and order**, not pixels. Carbon components
and tokens (SPEC-05) determine final look. In Arabic, mirror horizontally.

## W1 — Sign in (`/sign-in`, lg)
```
┌──────────────────────────────┬───────────────────────────────────────────────┐
│  ≋ Tidewell                    │  DEMO ENVIRONMENT — NO REAL MONEY              │
│                               │                                               │
│  Banking that keeps           │   Sign in                              EN|ع   │
│  you calm.                    │   ┌─────────────────────────────────────────┐ │
│                               │   │ Username                                │ │
│  🔒 Security tip 1 of 3        │   └─────────────────────────────────────────┘ │
│  We will never ask for your   │   ┌─────────────────────────────────────┐ 👁 │ │
│  password or codes by phone.  │   │ Password                            │    │ │
│  ‹ ● ○ ○ ›  (pause)           │   └─────────────────────────────────────┘    │ │
│                               │   ☐ Remember my username                     │
│                               │   [        Sign in        ]  (primary, full) │
│                               │   Forgot password?   ·   New here? Enrol     │
└──────────────────────────────┴───────────────────────────────────────────────┘
```

## W2 — Verify it's you (`/sign-in/verify`)
```
  Verify it's you
  Choose how to get your code
  (•) Text message to +971 •• ••• 4417
  ( ) Authenticator app
  ( ) Use a recovery code
  ┌───┬───┬───┬───┬───┬───┐
  │   │   │   │   │   │   │   ← one-time-code, paste fills all
  └───┴───┴───┴───┴───┴───┘
  Didn't get it? Resend in 0:27
  ☐ Remember this device for 30 days
  [ Verify ]   Cancel
  ⓘ Demo: use 000000 or open Dev outbox      (demo mode only)
```

## W3 — Account detail (`/accounts/:id`)
```
  Accounts › Main (Everyday Current)
  ┌───────────────────────────────────────────────────────────────────────────┐
  │ Main · Everyday Current · •••• 4821                    [Transfer] [⋯]     │
  │ Available            AED 34,502.50                                        │
  │ Current balance      AED 34,652.50   Pending −AED 150.00 (1)  ⓘ           │
  │ [Show details ▾]  IBAN AE55 9900 0000 … 4821 [⧉]  BIC TDWLAEA0 [⧉]        │
  └───────────────────────────────────────────────────────────────────────────┘
  [ Transactions ] [ Details ] [ Statements ]
  🔍 Search transactions…     [Filters (2)]  [Sort: Newest ▾]  [Export ▾]
  Active: (Last 30 days ×) (Groceries ×)   Clear all
  PENDING
   Today      Coffee House            🍽  −AED 17.50        —
  TUESDAY 17 NOVEMBER
   09:12      LULU HYPERMARKET        🛒  −AED 234.00    AED 34,652.50
   08:01      Salary — Acme Corp      💼  +AED 14,500.00  AED 34,886.50
  …
  [ Load more ]
```

## W4 — Transfer step 1 (`/transfers/new`)
```
  Make a transfer                                   ① Who & how much ─ ② When ─ ③ Review
  From
  ┌ Main · •••• 4821 · Available AED 34,502.50                         ▾ ┐
  To
  ( My accounts | Payees )   🔍 Search payees            [+ New payee]
  ★ Mum — Huda Haddad     Tidewell · •••• 9012
    Ahmad Saleh           Northbay Lantern Bank · •••• 3301
    Salma Nour  [New payee · limits until 18:20]  Crescent Lantern Savings · •••• 7740
  Amount
  ┌ AED │ 0.00                                   ┐
  Daily limit remaining: AED 48,800.00
                                        [ Cancel ]   [ Continue → ]
```

## W5 — Review (`/transfers/new`, step 3)
```
  Review your transfer
  From        Main · •••• 4821
  To          Ahmad Saleh · Northbay Lantern Bank · •••• 3301   ✔ Name matches
  Amount      AED 1,200.00
  Fee         AED 0.00
  Total       AED 1,200.00
  Sent on     Today, Wed 18 Nov       Arrives  Wed 18 Nov
  Reference   Nov rent top-up
  ⓘ Cut-off for same-day domestic transfers is 14:00.
                      [ ← Back ]   [ Send AED 1,200.00 ]   (inline loading on submit)
  -- FX variant --
  Rate        1 AED = 0.2709 USD  (1 USD = 3.6914 AED)   ⏱ 0:24  [Refresh rate]
  You send    AED 1,000.00            They receive  USD 270.90
```

## W6 — Receipt
```
  ✔ (pictogram)
  Transfer sent                                   [Processing → Completed live]
  Reference  HB261118-7KQ2MX [⧉]
  … summary as review …
  [ Download receipt (PDF) ]  [ Make another transfer ]  [ Go to dashboard ]
```

## W7 — Card detail (`/cards/:id`)
```
  ┌───────────────────────────┐   Debit card •••• 1111   [Active]
  │ ≋ Tidewell        DEBIT    │   Linked to Main · •••• 4821
  │                           │   [ ◯ Freeze card ]  [ Show card details ]  [ Report a problem ]
  │ •••• •••• •••• 1111       │
  │ SARA HADDAD     09/29 VISA│   Controls
  └───────────────────────────┘   Online purchases        [■■ On ]
                                  Use abroad              [□□ Off]
                                  Contactless             [■■ On ]
                                  ATM withdrawals         [■■ On ]
  Limits (daily)   ATM  ──●────── AED [5,000.00]   Purchases ───●── AED [20,000.00]   Online ──●── AED [10,000.00]
  Recent card transactions …                                   View all →
```

## W8 — Security settings (`/settings/security`)
```
  Security
  Password            Last changed 3 months ago                     [Change]
  Two-step verification
    Text message      +971 •• ••• 4417 (always on)
    Authenticator app Not set up                                    [Set up]
    Recovery codes    —                                             [Generate]
  Trusted devices
    Chrome on macOS (this device)  added 12 Nov · used today         [Remove]
  Active sessions
    Chrome on macOS · Dubai (approx.) · active now (current)
    Safari on iOS · Dubai (approx.) · 2 h ago                  [Sign out]
    [Sign out of all other sessions]   [Sign out everywhere]
  Security activity (last 90 days)                                   View all →
```
