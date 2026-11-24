#!/usr/bin/env node
// Secret scan — the first security check, run where code is written (shift-left), with no tools to install.
// The same rules run in Bob's hook (a write that contains a secret is refused), in the commit hook (rule G10),
// and in every pipeline (ci.mjs secrets). There is no inline "ignore" comment: a value that only looks like a
// secret (a documented demo password, a test fixture) goes in sdd/governance/secrets-allowlist.json, which is
// governance-protected, so allowing it is a reviewed decision.
//
//   node sdd/scripts/secrets.mjs --staged            what you are about to commit
//   node sdd/scripts/secrets.mjs --range main..HEAD  what a branch adds
//   node sdd/scripts/secrets.mjs --all               every tracked file (first adoption, audits)
//
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const ROOT = process.env.SDD_ROOT ? resolve(process.env.SDD_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const ALLOWLIST = 'sdd/governance/secrets-allowlist.json';

export const RULES = [
  { id: 'private-key', what: 'a private key', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY(?: BLOCK)?-----/ },
  { id: 'aws-access-key', what: 'an AWS access key', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { id: 'github-token', what: 'a GitHub token', re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/ },
  { id: 'sonar-token', what: 'a SonarQube token', re: /\bsq[upa]_[0-9a-f]{40}\b/ },
  { id: 'slack-token', what: 'a Slack token', re: /\bxox[abprs]-[0-9A-Za-z-]{10,}\b/ },
  { id: 'stripe-key', what: 'a live payment API key', re: /\b(?:sk|rk)_live_[0-9A-Za-z]{20,}\b/ },
  { id: 'google-api-key', what: 'a Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { id: 'jwt', what: 'a signed token (JWT)', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { id: 'url-credentials', what: 'a password inside a URL', re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/'"`]+:([^\s:@/'"`]{6,})@[^\s/'"`]+/i, value: 1 },
  { id: 'hardcoded-credential', what: 'a hard-coded password, key or token', re: /\b(?:password|passwd|pwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key)\b["'`]?\s*[:=]\s*["'`]([^"'`\s]{8,})["'`]/i, value: 1 },
];
// Values that are clearly not real: placeholders, environment lookups, templates, masks.
const PLACEHOLDER = /^(?:REPLACE_ME|changeme|change-me|example|your[-_]|xxx+|\*+|•+|<[^>]*>|\$\{|\{\{|%\(|process\.env|env\.|dummy|placeholder|redacted|test(?:ing)?$|password$|secret$)/i;
const fp = (value) => createHash('sha256').update(value).digest('hex').slice(0, 16);

export function loadAllowlist(path = join(ROOT, ALLOWLIST)) {
  try { const a = JSON.parse(readFileSync(path, 'utf8')); return { values: new Set(a.values ?? []), fingerprints: new Set((a.fingerprints ?? []).map((x) => x.fingerprint ?? x)), paths: (a.paths ?? []).map((g) => globRe(g)) }; }
  catch { return { values: new Set(), fingerprints: new Set(), paths: [] }; }
}
function globRe(g) { return new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\/?/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$'); }

// Findings in one line of one file.
export function scanLine(text, file, allow = loadAllowlist()) {
  if (allow.paths.some((re) => re.test(file))) return [];
  const out = [];
  for (const r of RULES) {
    const m = text.match(r.re);
    if (!m) continue;
    const value = r.value ? m[r.value] : m[0];
    if (r.value && PLACEHOLDER.test(value)) continue;
    if (allow.values.has(value) || allow.fingerprints.has(fp(value))) continue;
    out.push({ file, rule: r.id, what: r.what, fingerprint: fp(value), preview: text.trim().replace(value, mask(value)).slice(0, 90) });
  }
  return out;
}
const mask = (v) => (v.length <= 6 ? '•••' : `${v.slice(0, 3)}•••${v.slice(-2)}`);

export function scanText(text, file, allow = loadAllowlist()) {
  return text.split('\n').flatMap((line, i) => scanLine(line, file, allow).map((f) => ({ ...f, line: i + 1 })));
}
// Added lines in git -U0 diff form: [{ file, text }]
export function scanAdded(added, allow = loadAllowlist()) {
  return added.flatMap((a) => scanLine(a.text, a.file, allow));
}
export function describe(f) {
  return `${f.file}${f.line ? `:${f.line}` : ''} looks like ${f.what} (${f.rule}, fingerprint ${f.fingerprint}): ${f.preview}`;
}
export const ADVICE = 'Remove it, rotate it if it was ever real, and read it from the environment or a secrets manager. If it is a documented fake (demo data, a test fixture), add its fingerprint to sdd/governance/secrets-allowlist.json in a chore(SDD) commit.';

// Added lines of a unified diff (-U0): [{ file, text }]. (Same as git-check's; kept here to avoid an import cycle.)
export function addedLines(diff) {
  const out = []; let file = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) { file = line.replace(/^\+\+\+ (b\/)?/, '').trim(); continue; }
    if (line.startsWith('+') && file && file !== '/dev/null') out.push({ file, text: line.slice(1) });
  }
  return out;
}

// ------------------------------------------------------------------ CLI
const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
  const args = process.argv.slice(2);
  const git = (c) => execSync(`git ${c}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
  let findings = [], what = '';
  if (args.includes('--all')) {
    what = 'all tracked files';
    for (const f of git('ls-files').split('\n').filter(Boolean)) {
      if (!existsSync(join(ROOT, f))) continue;
      const buf = readFileSync(join(ROOT, f));
      if (buf.includes(0)) continue; // binary
      findings.push(...scanText(buf.toString('utf8'), f));
    }
  } else if (args.includes('--range')) {
    const range = args[args.indexOf('--range') + 1];
    what = range;
    findings = scanAdded(addedLines(git(`diff -U0 --no-color ${range.includes('..') ? range : `${range}..HEAD`}`)));
  } else {
    what = 'staged changes';
    findings = scanAdded(addedLines(git('diff --cached -U0 --no-color')));
  }
  if (!findings.length) { console.log(`✔ secret scan: nothing found in ${what}`); process.exit(0); }
  console.error(`✖ secret scan: ${findings.length} finding(s) in ${what}`);
  for (const f of findings) console.error(`   • ${describe(f)}`);
  console.error(`   ${ADVICE}`);
  process.exit(1);
}
