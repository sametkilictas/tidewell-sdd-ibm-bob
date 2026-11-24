# General security checklist (OWASP ASVS 4.0.3 L2 subset)

Walk this first, then the project's own checklist (`sdd/specs/domain/security-checklist.md`), which
gives the exact values (lengths, timeouts, limits) and the domain's abuse cases. Cite the project's
NFR IDs where they exist.

## A. Authentication (V2)
- [ ] A1 Passwords hashed with a memory-hard KDF (Argon2id or scrypt) and a per-hash salt
- [ ] A2 Password policy per the project's NFR: length, breached-password list, no composition rules, paste allowed
- [ ] A3 Lockout and throttling with uniform responses and timing (V2.2.1)
- [ ] A4 One-time codes: short-lived, limited attempts, hashed at rest, single use, resend throttled (V2.7)
- [ ] A5 Authenticator codes: replay in the same step rejected; secrets encrypted (V2.8)
- [ ] A6 Recovery codes hashed, single use, shown once (V2.5)
- [ ] A7 Enrolment and reset reveal nothing about account existence (V2.5.x)
- [ ] A8 Reset tokens single use, short-lived; sessions revoked on success (V2.5.6)

## B. Session management (V3)
- [ ] B1 ≥128-bit random IDs, hashed at rest; `__Host-` cookie, HttpOnly, Secure, SameSite (V3.4)
- [ ] B2 Session ID rotated on login, MFA completion and password change (V3.2.1)
- [ ] B3 Idle and absolute timeouts enforced server-side (V3.3)
- [ ] B4 Logout and "sign out everywhere" invalidate server-side (V3.3.1, V3.3.3)
- [ ] B5 No sensitive data in `localStorage` / `sessionStorage` (V8.2)

## C. Access control (V4)
- [ ] C1 Every query for a user's data is scoped by the owner taken from the session, never from the request (V4.2.1)
- [ ] C2 Access to another user's resource → 404 + audit; an authorization matrix test covers every route with an ID in its path
- [ ] C3 Staff routes role-checked server-side; maker ≠ checker; access reason enforced and audited
- [ ] C4 No mass assignment (`additionalProperties: false`) (V5.1.2)
- [ ] C5 CSRF protection on all unsafe methods (V4.2.2)

## D. Business logic (V11)
- [ ] D1 Limits, quotas and state rules enforced server-side at every step, not only in the UI
- [ ] D2 Check-then-act under a lock or in one transaction
- [ ] D3 Idempotency keys on state-changing requests that may be retried, scoped per user, payload checked
- [ ] D4 Confirmation or step-up tokens bound to session, purpose and payload; single use; short-lived
- [ ] D5 Demo and test behaviour only when demo mode is on

## E. Data protection (V8, V6)
- [ ] E1 Secrets and regulated identifiers encrypted at rest with authenticated encryption and key versions (V6.2)
- [ ] E2 Revealing a masked value: step-up, short-lived, rate-limited, `no-store`, audited, wiped from client state
- [ ] E3 `Cache-Control: no-store` on authenticated responses (V8.2.1)
- [ ] E4 Masking applied in the API, not only in the UI
- [ ] E5 Exports only via authorised endpoints with `Content-Disposition: attachment`

## F. Validation, encoding, injection (V5)
- [ ] F1 Contract validation for path, query, header and body, with lengths and patterns
- [ ] F2 Parameterised queries only (raw SQL through tagged templates)
- [ ] F3 No raw HTML injection (`dangerouslySetInnerHTML` and similar); user text rendered as text
- [ ] F4 Redirect targets restricted to internal paths
- [ ] F5 CSV exports protected against formula injection

## G. Files (V12)
- [ ] G1 Type checked by content (magic bytes), size and count limited, malware test file rejected
- [ ] G2 Stored outside the web root with random names; original names sanitised for display

## H. Errors, logging, audit (V7)
- [ ] H1 Errors without internals; a trace ID included
- [ ] H2 Redaction list effective (log-capture test)
- [ ] H3 Audit events for every listed action, success and failure; tamper-evident where required

## I. Configuration and supply chain (V14)
- [ ] I1 Security headers and CSP per the API guidelines; no CSP violations in E2E
- [ ] I2 Fail-fast configuration; refuses default secrets outside development
- [ ] I3 Dependency audit clean or waived by AppSec; lockfile committed; secret scan clean
- [ ] I4 Rate limits with `Retry-After`
