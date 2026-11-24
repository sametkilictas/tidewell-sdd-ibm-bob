# Security checklist — Tidewell Bank (ASVS 4.0.3 L2 subset + banking specifics)

The project's own checklist for this worked example, walked by the 🛡️ Security Reviewer through the
generic **security-review** skill, after the skill's general ASVS checklist.

## A. Authentication (V2)
- [ ] A1 Argon2id with ≥ 19 MiB / t ≥ 2; per-hash salt (NFR-SEC-001)
- [ ] A2 Password policy 12–128, breached list, no composition rules, paste allowed (NFR-SEC-002, V2.1)
- [ ] A3 Lockout 5 → 15 min, 10/24 h → hard lock; uniform responses & timing (NFR-SEC-003, V2.2.1)
- [ ] A4 OTP: 6 digits, 5 min TTL, 3 attempts, hashed at rest, single use, resend throttled (V2.7)
- [ ] A5 TOTP: replay in same step rejected; secret encrypted (V2.8)
- [ ] A6 Recovery codes hashed, single use, shown once (V2.5)
- [ ] A7 Enrolment & reset reveal nothing about account existence (V2.5.x)
- [ ] A8 Reset tokens single-use, 30 min, revoke sessions on success (V2.5.6)

## B. Session management (V3)
- [ ] B1 ≥128-bit random IDs, hashed in DB; `__Host-` cookie, HttpOnly, Secure, SameSite=Strict (V3.4)
- [ ] B2 Session ID rotated on login, MFA completion and password change (V3.2.1)
- [ ] B3 Idle 5 min / absolute 8 h server-enforced (V3.3)
- [ ] B4 Logout & "sign out everywhere" invalidate server-side (V3.3.1, V3.3.3)
- [ ] B5 Cross-tab sign-out; no sensitive data in `localStorage`/`sessionStorage` (V8.2)

## C. Access control (V4)
- [ ] C1 Every repository query scoped by session `customerId` (V4.2.1)
- [ ] C2 Cross-customer access → 404 + audit; authz matrix test covers all path-ID routes
- [ ] C3 Ops routes role-checked server-side; maker ≠ checker; access reason enforced & audited
- [ ] C4 No mass assignment (`additionalProperties: false`) (V5.1.2)
- [ ] C5 CSRF token on all unsafe methods (V4.2.2)

## D. Payments & money (banking)
- [ ] D1 Idempotency key required, scoped per user, payload-hash checked
- [ ] D2 Balance/limit checks under row lock in same transaction as hold/posting
- [ ] D3 Step-up token bound to session + purpose + payload hash; single use; 5 min
- [ ] D4 Limits enforced server-side at quote **and** submit **and** scheduled execution
- [ ] D5 FX quote expiry enforced server-side; amounts from stored quote, not client
- [ ] D6 Cooling-off and new-beneficiary limits enforced; beneficiary-added alert mandatory
- [ ] D7 Fraud rules evaluated; held payments cannot settle without checker approval
- [ ] D8 No float money; ledger invariants checked
- [ ] D9 Demo markers only when `DEMO_MODE=true`

## E. Data protection (V8, V6)
- [ ] E1 PAN/CVC/TOTP secrets AES-256-GCM with unique nonce + key version (V6.2)
- [ ] E2 Reveal: step-up, 30 s, rate-limited, `no-store`, audited, wiped from client state
- [ ] E3 `Cache-Control: no-store` on authenticated responses (V8.2.1)
- [ ] E4 Masking rules applied in API (not only UI) (NFR-PRIV-001)
- [ ] E5 Exports/PDFs only via authorised endpoints with `Content-Disposition: attachment`

## F. Validation, encoding, injection (V5)
- [ ] F1 Contract validation for path/query/header/body with lengths & patterns
- [ ] F2 Parameterised SQL only (raw SQL uses tagged templates)
- [ ] F3 No `dangerouslySetInnerHTML`; message bodies rendered as text
- [ ] F4 `returnTo` restricted to internal paths
- [ ] F5 CSV export protected against formula injection (prefix `'` on cells starting `= + - @`)

## G. Files (V12)
- [ ] G1 Magic-byte type check, size ≤ 5 MB, count ≤ 3, EICAR rejected
- [ ] G2 Stored outside web root with random names; original names sanitised for display

## H. Errors, logging, audit (V7)
- [ ] H1 Problem+json without internals; `traceId` included
- [ ] H2 Redaction list effective (log-capture test)
- [ ] H3 Audit events for all listed actions, success & failure; hash chain verifies

## I. Configuration & supply chain (V14)
- [ ] I1 Security headers & CSP per SPEC-04 §11; no CSP violations in E2E
- [ ] I2 Fail-fast config; refuses default secrets outside dev
- [ ] I3 `pnpm audit --prod` clean or waived; lockfile committed; secret scan clean
- [ ] I4 Rate limits per SPEC-04 §8 with `Retry-After`

## Severity examples for this domain
Rated with the general scale in `.bob/skills/security-review/severity-levels.md`:

| Severity | Banking examples |
|---|---|
| **Critical** | Overspend via a race; step-up token reusable for a different amount; IDOR on transactions; OTP bypass active without `DEMO_MODE` |
| **High** | PAN in logs; a customer can call an ops route; nickname XSS in the ops console |
| **Medium** | Missing rate limit on statement export; CSV formula injection in transaction export |
