# Severity levels

| Severity | Definition | Examples (any product) | Gate |
|---|---|---|---|
| **Critical** | Direct loss or creation of value, authentication bypass, cross-user data access at scale, secrets exposed | A race lets a limit be exceeded; a confirmation token reusable for a different request; IDOR on a list of records; a test bypass active outside demo mode | Blocks immediately |
| **High** | Account-takeover enabler, sensitive data exposed for one user, missing authorization on a route, stored XSS | No session rotation on login; a regulated identifier in logs; a customer can call a staff route; XSS in a user-supplied name shown to staff | Blocks gate |
| **Medium** | Defence in depth missing, with a plausible exploit path | No rate limit on an export; username enumeration via timing; CSV formula injection | Fix before the final gate or waive |
| **Low** | Hardening or best practice | Verbose `Server` header; long-lived trusted device without reminder | Log |
| **Info** | Observation, no direct risk | Suggest passkeys for production | Log |

Rate by impact first, then likelihood. When in doubt between two levels, choose the higher one and
explain why. The project's checklist may give domain examples for each level.
