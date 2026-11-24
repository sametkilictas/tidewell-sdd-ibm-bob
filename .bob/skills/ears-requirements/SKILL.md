---
name: ears-requirements
description: Write, review or interpret requirements in EARS syntax (Easy Approach to Requirements Syntax) with Given/When/Then acceptance criteria in the exact block format the spec validator parses. Use when authoring or editing specs, clarifying requirements, or turning acceptance criteria into tests.
---

# EARS requirements skill

## The five patterns (+ complex)
| Type | Template | Use when |
|---|---|---|
| Ubiquitous | THE SYSTEM SHALL <response>. | Always true |
| Event-driven | WHEN <trigger>, THE SYSTEM SHALL <response>. | Reaction to an event/user action |
| State-driven | WHILE <state>, THE SYSTEM SHALL <response>. | Behaviour during a state/mode |
| Unwanted behaviour | IF <unwanted condition>, THEN THE SYSTEM SHALL <response>. | Errors, abuse, failures |
| Optional feature | WHERE <feature/option is present>, THE SYSTEM SHALL <response>. | Configurable/optional capability |
| Complex | WHILE <state>, WHEN <trigger>, THE SYSTEM SHALL <response>. | Combinations |

## Block format (validator-enforced)
```
#### ORD-021 — Daily limit
- **Priority:** P1 · **Type:** Unwanted behaviour
- **EARS:** IF an order would exceed the customer's daily limit, THEN THE SYSTEM SHALL reject it with the specific limit code and the remaining amount.
- **Acceptance criteria:**
  - **ORD-021-AC1** Given …, when …, then … (observable: status code, copy, value, state).
```

## Quality rules
1. One requirement = one testable behaviour. Split "and" when the parts can fail independently.
2. Response is observable from outside (API response, UI, DB state, notification), not internal design.
3. No vague words: *fast, user-friendly, appropriate, etc., should, may, as needed*. Replace with numbers
   and named states (e.g. "within 2 s", "status FAILED with code LIMIT_EXCEEDED_DAILY").
4. Numbers/constants belong in the spec's Business rules table; requirements reference BR IDs.
5. Every requirement has ≥ 1 AC using seed personas and concrete values.
6. ACs map 1:1 to test cases. The test title starts with the requirement tag.

## From AC to test (example)
AC: "ORD-021-AC1 With a daily limit of 50 and 48 already ordered today, an order of 3 is refused and shows 2 remaining."
```ts
it('[ORD-021] rejects an order over the daily limit and reports what remains', async () => {
  const { customer } = await scenario.customerWithDailyUsage(48);
  const res = await api.as(customer).post('/api/v1/orders', order({ quantity: 3 }));
  expect(res.status).toBe(422);
  expect(res.json()).toMatchObject({ code: 'LIMIT_EXCEEDED_DAILY', params: { remaining: 2 } });
});
```
The examples are neutral on purpose; the worked example's own requirements (for instance XFER-021,
a daily transfer limit) are in `sdd/specs/features/`.
