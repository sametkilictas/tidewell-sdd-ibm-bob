---
name: sonarqube-triage
description: Read SonarQube results (quality gate, security issues, hotspots, dependency risks) through the read-only SonarQube MCP server and turn each blocking item into a plain-language, routed fix. Use after /sdd-scan, when fixing scan findings, or when asked why a feature is blocked from testing.
---

# SonarQube triage (read-only)

The SonarQube MCP server is configured with `SONARQUBE_READ_ONLY=true` and a low-privilege user, so
you can **read** but never change an issue's status. Changing status is a human decision.

## Useful tools (toolsets: issues, quality-gates, security-hotspots, dependency-risks, measures, rules, projects)
| Question | Tool |
|---|---|
| Did the gate pass, and which condition failed? | `get_project_quality_gate_status` |
| Which security issues are open (new code first)? | `search_sonar_issues_in_projects` |
| What does rule `typescript:S3649` mean and how is it fixed? | `show_rule` |
| Which hotspots still need review? | `search_security_hotspots`, `show_security_hotspot` |
| Which dependency CVEs does SonarQube report? (Advanced Security only) | `search_dependency_risks` |
| Coverage / rating numbers | `get_component_measures` |

Project key: `sonar.projectKey` in `sonar-project.properties`. Pass the branch or pull request when the
report shows one.

## For each blocking item, write
`<severity> · <rule or CVE> · <file:line or package@version>` — what it is (plain words) → why it matters for
this product → the requirement it touches (NFR-SEC-0xx / feature REQ-ID) → fix direction → owning task.

## Mapping hints
| SonarQube finding | Requirement | Typical fix |
|---|---|---|
| Injection (SQL/command/path) | NFR-SEC-021 | parameterized Prisma query, allow-list paths |
| Weak crypto / hashing | NFR-SEC-001, NFR-SEC-030 | Argon2id, AES-GCM via the crypto port |
| Hard-coded secret | NFR-SEC-032 | move to env, rotate the secret |
| Open redirect / SSRF | NFR-SEC-020 | allow-list targets |
| Cookie flags / CSRF hotspots | NFR-SEC-004, NFR-SEC-005 | platform session plugin defaults |
| Logging of sensitive data | NFR-SEC-031 | pino redaction list |
| Dependency CVE | NFR-SEC-044 | upgrade to the fixed version; else human waiver |

## Never
Use any status-changing tool, suggest `NOSONAR`, suggest editing `sonar-project.properties`, or call a
finding "safe" in the evidence. Recommend; humans decide.
