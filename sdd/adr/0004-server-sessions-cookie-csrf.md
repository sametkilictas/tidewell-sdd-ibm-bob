# ADR-0004 — Server-side sessions, HttpOnly cookies, synchronizer CSRF tokens

- **Status:** Accepted · **Date:** 2026-11-18

## Context
Browser SPA talking to its own API on the same site. Tokens in `localStorage` are exposed to
XSS; JWTs are hard to revoke (sign out everywhere, device revoke, ops lock).

## Decision
- Opaque random session ID (≥128 bits) in cookie `__Host-hb_sid` (`HttpOnly; Secure;
  SameSite=Strict; Path=/`); DB stores SHA-256(session ID).
- Idle timeout 5 min (configurable), absolute 8 h; keep-alive via `POST /auth/session/refresh`
  only on genuine user activity (not timers).
- CSRF synchronizer token stored server-side on the session, delivered in the login/session
  response body and kept in memory by the SPA; sent as `X-CSRF-Token` on unsafe methods.
- Same-origin deployment via Vite proxy in dev; CORS disabled except `WEB_ORIGIN` in dev.
- Step-up tokens: short-lived (5 min), single-use, bound to session + purpose + payload hash.

## Consequences
- ✅ Instant revocation; no token in JS-readable storage; aligns with ASVS V3.
- ⚠️ Requires DB lookup per request (acceptable; add Redis in production).

## Alternatives
JWT access/refresh tokens (revocation complexity), OAuth2/OIDC with external IdP
(future: Keycloak / IBM Security Verify — the `identity` module is the seam).
