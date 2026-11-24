# Rule 03 — Security baseline for every change

Target: OWASP ASVS 4.0.3 Level 2 (details in `sdd/specs/nfr/NFR-security.md`).

1. **AuthZ in the repository layer**: every query for a user's data takes the owner's ID from the
   session, never from the request. Another user's resource ⇒ `404 NOT_FOUND` + `AUTHZ_DENIED` audit.
2. **Validate at the edge** with the contract schemas (`additionalProperties: false`). No mass assignment.
3. **CSRF** header required on every unsafe method; **cookies** `HttpOnly; Secure; SameSite=Strict`.
4. **Secrets** only from env; never log or return passwords, one-time codes, session/CSRF/step-up tokens,
   or the regulated identifiers `NFR-security.md` lists (for the worked example: full PAN/CVC, full IBAN
   except on dedicated endpoints, national ID). Use the logger's redaction list.
5. **No `dangerouslySetInnerHTML`, `eval`, `new Function`, string-built SQL, or open redirects.**
6. **Rate-limit** auth, OTP, reveal and export endpoints per SPEC-04 §8.
7. **Errors**: RFC 9457 with stable `code`; no stack traces, SQL or internals in responses.
8. **Audit** every action listed in `sdd/contracts/domain-events.md` §2, success and failure.
9. **Dependencies**: add only those justified in an approved plan; run `pnpm security:deps`.
10. When unsure whether something is safe, activate the **security-review** skill and ask.
11. **The scan decides** (Article XI): the scanner set in `sdd/governance/checks.json` is authoritative; Bob's own
    findings are advisory. Never add `NOSONAR`, never edit `checks.json` or `sonar-project.properties`, never run a
    scanner except through `node sdd/scripts/scan.mjs`, never mark SonarQube issues/hotspots safe — the hooks
    and git rule G8 block all of these. A CVE you suspect is a *lead*: say so, and let SCA confirm it.
