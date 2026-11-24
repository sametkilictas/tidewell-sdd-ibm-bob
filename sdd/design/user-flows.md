# User Flows and Demo Script

## 1. Sign-in with MFA and step-up (F01)
```mermaid
flowchart TD
  S([/sign-in]) --> C{Credentials valid?}
  C -- no --> E1[Error summary + attempts left] --> S
  C -- locked --> L[Locked message + reset link]
  C -- yes --> T{Trusted device?}
  T -- yes --> D([/dashboard])
  T -- no --> V[/sign-in/verify: choose SMS / TOTP / recovery/]
  V --> K{Code valid?}
  K -- no, attempts left --> V
  K -- exceeded --> S
  K -- yes --> R{Remember device?} --> D
  D -.sensitive action.-> SU[[Step-up dialog]] -->|verified| A[Original request retried with token]
  SU -->|cancel| X[Form intact + info note]
```

## 2. Transfer wizard (F04)
```mermaid
flowchart LR
  W1[1 · Who & how much] --> W2[2 · When & details]
  W2 --> Q[POST /transfer-quotes]
  Q -->|422 limit / funds| W1
  Q --> RV[3 · Review: fees, FX countdown, dates, CoP]
  RV -->|quote expired| Q
  RV -->|confirm + Idempotency-Key| SUQ{stepUpRequired?}
  SUQ -- yes --> SU[[Step-up]] --> P[POST /transfers]
  SUQ -- no --> P
  P -->|201 PROCESSING / COMPLETED / SCHEDULED / HELD| RC[Receipt + live status]
  P -->|network error| RT[Retry same key → true result] --> RC
```

## 3. Add beneficiary (F04)
```mermaid
flowchart LR
  T[Choose type] --> F[Details form: IBAN / acct+BIC, name, address]
  F --> V{Valid IBAN/BIC?} -- no --> F
  V -- yes --> NC[POST /name-checks]
  NC --> M{Result}
  M -- MATCH --> RV[Review]
  M -- CLOSE_MATCH --> SG[Use suggested / keep mine] --> RV
  M -- NO_MATCH --> AK[Risk acknowledgement required] --> RV
  M -- UNAVAILABLE --> RV
  RV --> SU[[Step-up BENEFICIARY_CREATE]] --> OK[Saved · cooling-off 24 h · security alert sent]
```

## 4. Held payment maker-checker (F11)
```mermaid
sequenceDiagram
  actor C as Customer (Daniel)
  participant API
  actor A as Ops agent (Mina)
  actor S as Supervisor (Yusuf)
  C->>API: POST /transfers (ref "DEMO-REVIEW")
  API-->>C: 201 HELD_FOR_REVIEW (hold placed)
  A->>API: POST /ops/held-payments/{id}/recommendation APPROVE
  S->>API: POST /ops/held-payments/{id}/decision APPROVE
  API-->>C: SSE payment.status_changed → PROCESSING → COMPLETED
```

## 5. Demo script (≈ 15 minutes) — executed at Phase 7 gate
| # | Step | Persona | Proves |
|---|---|---|---|
| 1 | Open app → demo banner visible; switch to Arabic and back | — | Art. X, RTL |
| 2 | Sign in as Sara; OTP from Dev outbox; tick "Remember this device" | Sara | J2, AUTH-001/003/006 |
| 3 | Dashboard: totals per currency, hide balances toggle, upcoming rent | Sara | F02 |
| 4 | Open Everyday Current; search "lulu"; open a USD card purchase detail | Sara | F03 |
| 5 | Move AED 1,000.00 → USD account; watch 30 s quote countdown; confirm | Sara | J3, FX, ledger |
| 6 | Add domestic payee (CoP close match → accept suggestion) with step-up | Sara | XFER-012/014/015 |
| 7 | Pay Ahmad Saleh 1,200.00, reference "Nov rent top-up"; receipt live → Completed; download PDF | Sara | J4 |
| 8 | Pay Ahmad again with reference `DEMO-REJECT`; see Failed + balance restored + alert | Sara | XFER-034 |
| 9 | Cards: freeze debit card, toggle online purchases, show card details (step-up, 30 s) | Sara | J6 |
| 10 | Pay AquaGrid bill using inquiry amount | Sara | J7 |
| 11 | Download last month's statement; generate balance certificate in Arabic | Sara | J8, NFR-I18N-004 |
| 12 | Sign in as Layla (other browser); transfer leaves balance < 250 → low-balance alert toast | Layla | J9 |
| 13 | Daniel sends EUR to Carlos with `DEMO-REVIEW`; Mina recommends, Yusuf approves; Daniel sees live update | Daniel, Mina, Yusuf | J12 |
| 14 | Idle 4 min (or `/dev/clock` +240 s) → timeout modal → Stay signed in | Sara | AUTH-031 |
| 15 | Settings › Security: sessions list, sign out everywhere | Sara | J10 |
