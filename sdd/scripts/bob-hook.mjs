#!/usr/bin/env node
// IBM Bob lifecycle hook (configured in .bob/settings.json, optionally enforced org-wide via the
// EnforcedHooks policy). One script, dispatched on hook_event_name:
//
//   SessionStart /   → prints the SDD state block; Bob adds it to the model context, so every mode
//   UserPromptSubmit   knows the phase, the active step, the mode that step expects and how people sign off.
//   PreToolUse       → denies file writes outside the active step's scope, writes that fail a built-in check
//                      (secrets, risky code: sdd/governance/checks.json), risky shell commands,
//                      suppression of scanner findings (NOSONAR), SonarQube MCP write tools, and any
//                      MCP call (GitHub, Slack, …) that would post a sign-off command such as /approve-plan.
// The same hook guards Bob when it runs headless in GitHub Actions (bob run --trust), so /bob fix is held to
// the same step scope as a developer's session.
//
// Bob's hook payload does not say which mode is active, so the guard enforces the workflow
// *state* (mode-agnostic) while each mode's fileRegex enforces *who* may edit *what*.
// Together: a write succeeds only when the right mode is doing the right step.

import { checkWrite, checkCommand, contextBlock, rel, PROD_CODE, TEST_FILE, SIGNOFF_COMMAND } from './lib.mjs';
import { checkContent } from './checks.mjs';

const WRITE_TOOL = /(write|diff|replace|insert|edit|create|delete|remove|rename|move|apply|patch|save)/i;
const CMD_TOOL = /(command|exec|shell|terminal|bash|run)/i;
// Findings are fixed or decided by a human in SonarQube — never silenced in code (Article XI.3).
const SUPPRESSION = /NOSONAR|sonar\.issue\.ignore/;
// The SonarQube MCP server runs read-only; this is a second lock in case someone flips that setting.
const SONAR_MCP_WRITE = /\b(change_sonar_issue_status|change_security_hotspot_status|create_webhook|architecture_set|toggle_automatic_analysis)\b/;

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (data += c));
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(data), 3000).unref();
  });
}

// Collect every value that looks like a file path from an arbitrary tool_input shape
// (path, file_path, files[].path, multi-file XML args with <path>…</path>, …).
export function extractPaths(input) {
  const out = new Set();
  const visit = (v, key = '') => {
    if (v == null) return;
    if (typeof v === 'string') {
      if (/path|file|target|destination|source/i.test(key) && v.length < 500 && !v.includes('\n')) out.add(v.trim());
      for (const m of v.matchAll(/<path>\s*([^<]+?)\s*<\/path>/g)) out.add(m[1]);
      return;
    }
    if (Array.isArray(v)) return v.forEach((x) => visit(x, key));
    if (typeof v === 'object') for (const [k, x] of Object.entries(v)) visit(x, k);
  };
  visit(input);
  return [...out].filter(Boolean);
}

function deny(reason) {
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `[SDD guard] ${reason}` } }));
  process.exit(0);
}

const raw = await readStdin();
let evt;
try { evt = JSON.parse(raw || '{}'); } catch { process.exit(0); } // unparseable payload: do not block

const name = evt.hook_event_name;

if (name === 'UserPromptSubmit' || name === 'SessionStart') {
  try { process.stdout.write(contextBlock() + '\n'); } catch (e) { process.stderr.write(`sdd hook: ${e.message}\n`); }
  process.exit(0);
}

if (name === 'PreToolUse') {
  const tool = String(evt.tool_name || '');
  const input = evt.tool_input || {};
  try {
    if (SONAR_MCP_WRITE.test(tool) || (/mcp/i.test(tool) && SONAR_MCP_WRITE.test(JSON.stringify(input)))) {
      deny('SonarQube is read-only for Bob. Marking issues or hotspots safe/accepted is a human decision in the SonarQube UI (Article XI.3).');
    }
    if (!WRITE_TOOL.test(tool) || /mcp/i.test(tool)) {
      const text = JSON.stringify(input);
      if (/mcp/i.test(tool) && SIGNOFF_COMMAND.test(text.replace(/\\n/g, '\n'))) {
        deny('Sign-off commands (/approve-plan, /approve-phase, /approve-cr, /reject-cr, /accept-risk, /revoke) are typed by a person on the pull request. Bob never posts them, through any tool or account.');
      }
    }
    if (typeof input.command === 'string' || (CMD_TOOL.test(tool) && !WRITE_TOOL.test(tool))) {
      const res = checkCommand(input.command ?? '');
      if (!res.ok) deny(res.reason);
      process.exit(0);
    }
    if (WRITE_TOOL.test(tool)) {
      const paths = extractPaths(input);
      for (const p of paths) {
        const res = checkWrite(p);
        if (!res.ok) deny(res.reason);
      }
      if (paths.some((p) => PROD_CODE.test(rel(p)) || TEST_FILE.test(rel(p))) && SUPPRESSION.test(JSON.stringify(input))) {
        deny('Suppressing SonarQube findings in code (NOSONAR / sonar.issue.ignore) is not allowed. Fix the issue, or ask a human to mark it in SonarQube (Article XI.3, NFR-SEC-046).');
      }
      // Shift-left: the built-in checks of sdd/governance/checks.json (stage "bob") run on the write before it lands:
      // secrets (also commit rule G10) and risky code patterns. The same checks run again at commit and before testing.
      const text = Object.values(input).filter((v) => typeof v === 'string').join('\n');
      const hit = paths.length ? checkContent(rel(paths[0]), text) : null;
      if (hit && hit.check === 'secrets') deny(`That write contains what looks like ${hit.what} (${hit.rule}). Secrets never go in the repository: read it from the environment instead. If it is a documented fake, a human adds its fingerprint (${hit.fingerprint}) to sdd/governance/secrets-allowlist.json.`);
      if (hit) deny(`That write ${hit.what} (${hit.rule}${hit.line ? `, line ${hit.line}` : ''}). Fix: ${hit.fix}. This is the "${hit.check}" check in sdd/governance/checks.json; it runs again at commit and before any testing.`);
    }
    process.exit(0);
  } catch (e) {
    if (WRITE_TOOL.test(tool)) deny(`guard error (${e.message}); write blocked to be safe — ask a human to check sdd/scripts.`);
    process.exit(0);
  }
}

process.exit(0);
