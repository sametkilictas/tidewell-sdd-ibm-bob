#!/usr/bin/env node
// Pluggable security checks: the same control at every stage, as early as it can run.
// What runs where is set in sdd/governance/checks.json (a governance file); this script runs it.
//
//   bob       Bob's hook runs the built-in checks on every write, before it lands       (checkWrite below)
//   commit    the git pre-commit hook, on what is staged                                  --stage commit
//   scan      /sdd-scan before any testing, and the pipeline's scan stage (all code)      --stage scan   (via scan.mjs)
//   pipeline  the pipeline only: slow, licensed or advisory tools                         --stage pipeline
//
//   node sdd/scripts/checks.mjs --list                  what runs where
//   node sdd/scripts/checks.mjs --validate              the configuration is valid and the locked check is on
//   node sdd/scripts/checks.mjs --stage commit          staged changes (sdd/scripts/hooks/pre-commit)
//   node sdd/scripts/checks.mjs --stage scan [--json]   all production code
//   node sdd/scripts/checks.mjs --stage pipeline [--range A..B]
//
// Exit codes: 0 no blocking finding · 1 blocking finding · 2 configuration error.
// Built-in checks need nothing but Node. Organisation tools are 'command' checks: the command gets the files in
// {files}; exit 0 passes, anything else is a finding. An enabled tool that is missing fails (fail closed).
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync, spawnSync } from 'node:child_process';
import { scanText, scanAdded, addedLines, describe as describeSecret, ADVICE } from './secrets.mjs';

const ROOT = process.env.SDD_ROOT ? resolve(process.env.SDD_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const CHECKS_FILE = 'sdd/governance/checks.json';
export const DENYLIST_FILE = 'sdd/governance/dependency-denylist.json';
export const STAGES = ['bob', 'commit', 'scan', 'pipeline'];
const BUILTINS = ['secrets', 'risky-code', 'dependencies'];

export function loadChecks(path = join(ROOT, CHECKS_FILE)) {
  if (!existsSync(path)) return { scanner: 'sonarqube', checks: [], missing: true };
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function validateChecks(cfg) {
  const e = [];
  if (!['builtin', 'sonarqube'].includes(cfg.scanner)) e.push(`scanner must be "builtin" or "sonarqube", not "${cfg.scanner}".`);
  const ids = new Set();
  for (const c of cfg.checks ?? []) {
    const at = `check "${c.id ?? '?'}"`;
    if (!c.id || !/^[a-z0-9-]+$/.test(c.id)) e.push(`${at}: id must be lower-case letters, digits and hyphens.`);
    if (ids.has(c.id)) e.push(`${at}: duplicate id.`); ids.add(c.id);
    if (!Array.isArray(c.stages) || !c.stages.length || c.stages.some((s) => !STAGES.includes(s))) e.push(`${at}: stages must be some of ${STAGES.join(', ')}.`);
    if (!['block', 'warn'].includes(c.onFinding)) e.push(`${at}: onFinding must be "block" or "warn".`);
    const b = c.run?.builtin, cmd = c.run?.command;
    if (!b === !cmd) e.push(`${at}: run needs exactly one of "builtin" or "command".`);
    if (b && !BUILTINS.includes(b)) e.push(`${at}: unknown built-in "${b}" (known: ${BUILTINS.join(', ')}).`);
    if (cmd && c.stages?.includes('bob')) e.push(`${at}: command checks cannot run in Bob's hook (stage "bob"); use commit, scan or pipeline. IDE tools run in the editor itself.`);
  }
  const s = (cfg.checks ?? []).find((c) => c.run?.builtin === 'secrets');
  if (!s || s.enabled === false || s.onFinding !== 'block' || !s.stages?.includes('bob') || !s.stages?.includes('scan')) {
    e.push('Locked: the built-in secrets check stays enabled, blocking, in Bob\'s hook and in the scan. (It also runs as commit rule G10 and the pipeline\'s secrets stage.)');
  }
  return e;
}

// ------------------------------------------------------------------ built-in checks
const CODE = /\.(?:[cm]?[jt]sx?)$/;
const NOT_APP = /^(?:sdd|\.bob|\.github|node_modules)\/|(?:^|\/)(?:e2e|perf)\/|\.(?:test|spec|int\.test)\.[cm]?[jt]sx?$|(?:^|\/)test\/(?:factories|helpers|fixtures)\//;
export const RISKY = [
  { id: 'sql-string', what: 'builds SQL from strings', fix: 'pass values as parameters (the query builder, or $1 placeholders)',
    re: /\b(?:SELECT\s[\s\S]*?\bFROM|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b[^;\n]*?(?:\$\{|["'`]\s*\+\s*[\w(])/i },
  { id: 'tls-off', what: 'switches off TLS certificate checks', fix: 'keep certificate checks on; trust your organisation\'s CA instead',
    re: /rejectUnauthorized\s*:\s*false|NODE_TLS_REJECT_UNAUTHORIZED\s*=?\s*["']?0\b/ },
  { id: 'eval', what: 'runs code built from a string', fix: 'call the function directly; never evaluate strings',
    re: /(?<![\w.])eval\s*\(|new\s+Function\s*\(/ },
  { id: 'weak-hash', what: 'uses a weak hash', fix: 'use sha256 or better; for passwords use argon2, scrypt or bcrypt',
    re: /createHash\(\s*["'](?:md5|sha1)["']\s*\)/i },
  { id: 'weak-random', what: 'uses Math.random for a secret value', fix: 'use crypto.randomBytes or crypto.randomInt',
    re: /Math\.random\(\)[^\n]*\b(?:token|otp|password|secret|nonce|salt|pin|code)\b|\b(?:token|otp|password|secret|nonce|salt|pin)\w*\s*[:=][^\n]*Math\.random\(\)/i },
];
const appCode = (file) => CODE.test(file) && !NOT_APP.test(file);
function riskyLine(text, file, line) {
  if (!appCode(file)) return [];
  const safeSql = /(?:\bsql|\$queryRaw)\s*`/.test(text); // tagged templates are parameterised
  return RISKY.filter((r) => r.re.test(text) && !(r.id === 'sql-string' && safeSql)).map((r) => ({ check: 'risky-code', rule: r.id, file, line, level: 'block', what: r.what, fix: r.fix,
    message: `${file}${line ? `:${line}` : ''} ${r.what} (${r.id}): ${text.trim().slice(0, 80)}. Fix: ${r.fix}.` }));
}
function loadDenylist() { try { return JSON.parse(readFileSync(join(ROOT, DENYLIST_FILE), 'utf8')).packages ?? []; } catch { return []; } }
function dependencyFindings(file, text) {
  if (!/(?:^|\/)package\.json$/.test(file) || NOT_APP.test(file)) return [];
  let pkg; try { pkg = JSON.parse(text); } catch { return [{ check: 'dependencies', rule: 'parse', file, level: 'block', message: `${file} is not valid JSON.` }]; }
  const deny = loadDenylist(), out = [];
  for (const sect of ['dependencies', 'devDependencies', 'optionalDependencies']) {
    for (const [name, spec] of Object.entries(pkg[sect] ?? {})) {
      const bad = deny.find((d) => d.name === name && (d.versions ?? []).some((v) => String(spec).replace(/^[\^~=v]/, '') === v || (d.versions ?? []).includes('*')));
      if (bad) out.push({ check: 'dependencies', rule: 'deny-list', file, level: 'block', message: `${file}: ${name}@${spec} is on the deny-list — ${bad.reason}. Use another version.` });
      else if (/^[\^~>*]|^latest$|^x$|\|\||\s-\s/.test(String(spec)) && !/^(?:workspace|file|link):/.test(String(spec))) out.push({ check: 'dependencies', rule: 'unpinned', file, level: 'warn', message: `${file}: ${name}@${spec} is not an exact version; pin it (and keep the lockfile) so every build gets the same code.` });
    }
  }
  return out;
}
function runBuiltin(name, input) {
  const files = input.files ?? [], added = input.added ?? [];
  if (name === 'secrets') {
    const hits = files.length ? files.flatMap((f) => scanText(f.text, f.path)) : scanAdded(added);
    return hits.map((h) => ({ check: 'secrets', rule: h.rule, file: h.file, line: h.line, level: 'block', what: h.what, fingerprint: h.fingerprint, message: `${describeSecret(h)}. ${ADVICE}` }));
  }
  if (name === 'risky-code') {
    if (files.length) return files.flatMap((f) => f.text.split('\n').flatMap((t, i) => riskyLine(t, f.path, i + 1)));
    return added.flatMap((a) => riskyLine(a.text, a.file, null));
  }
  if (name === 'dependencies') {
    const pk = files.length ? files : [...new Set(added.map((a) => a.file))].filter((f) => /package\.json$/.test(f) && existsSync(join(ROOT, f))).map((p) => ({ path: p, text: readFileSync(join(ROOT, p), 'utf8') }));
    return pk.flatMap((f) => dependencyFindings(f.path, f.text));
  }
  return [];
}

// ------------------------------------------------------------------ running a stage
const quote = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
function runCommand(c, fileList) {
  const missingEnv = (c.needs ?? []).filter((v) => !process.env[v]);
  if (missingEnv.length) return { status: c.onFinding === 'warn' ? 'skip' : 'fail', detail: `needs ${missingEnv.join(', ')} in the environment (from the pipeline's secret store, never a file)` };
  const cmd = c.run.command.replace('{files}', fileList.map(quote).join(' '));
  mkdirSync(join(ROOT, '.scannerwork'), { recursive: true });
  const r = spawnSync(cmd, { cwd: ROOT, shell: true, encoding: 'utf8', timeout: 15 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().split('\n').slice(-6).join('\n');
  if (r.error || r.status === 127 || /command not found|not recognized as an internal/.test(r.stderr ?? '')) {
    return { status: c.onFinding === 'warn' ? 'skip' : 'fail', detail: `is switched on but could not run (${r.error?.message ?? 'not installed'}).${c.install ? ` Install: ${c.install}` : ''}` };
  }
  return r.status === 0 ? { status: 'pass', detail: '' } : { status: c.onFinding === 'block' ? 'fail' : 'warn', detail: out || `exit ${r.status}` };
}

// input: { files: [{ path, text }] } for whole-file stages, or { added: [{ file, text }], paths: [...] } for diffs
export function runChecks(stage, input, cfg = loadChecks()) {
  const results = [];
  for (const c of cfg.checks ?? []) {
    if (c.enabled === false || !c.stages?.includes(stage)) continue;
    if (c.run.builtin) {
      const findings = runBuiltin(c.run.builtin, input);
      const blocking = c.onFinding === 'block' && findings.some((f) => f.level === 'block');
      results.push({ id: c.id, title: c.title, kind: 'builtin', status: blocking ? 'fail' : findings.length ? 'warn' : 'pass', findings });
    } else {
      if (stage === 'bob') continue;
      const paths = input.paths ?? (input.files ?? []).map((f) => f.path);
      const r = runCommand(c, paths);
      results.push({ id: c.id, title: c.title, kind: 'command', command: c.run.command, status: r.status, findings: r.detail ? [{ check: c.id, level: r.status === 'fail' ? 'block' : 'warn', message: `${c.title}: ${r.detail}` }] : [] });
    }
  }
  return { stage, results, blocking: results.filter((r) => r.status === 'fail').map((r) => r.id) };
}

// Bob's hook: built-in checks on the content of one write, before it lands.
export function checkContent(path, text, cfg = loadChecks()) {
  const res = runChecks('bob', { files: [{ path, text }] }, cfg);
  for (const r of res.results) if (r.status === 'fail') return r.findings.find((f) => f.level === 'block');
  return null;
}

// ------------------------------------------------------------------ CLI
const isCli = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isCli) {
  const args = process.argv.slice(2);
  const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
  const git = (c) => execSync(`git ${c}`, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'pipe'] });
  let cfg;
  try { cfg = loadChecks(); } catch (e) { console.error(`✖ ${CHECKS_FILE}: ${e.message}`); process.exit(2); }
  const errs = validateChecks(cfg);
  if (args.includes('--validate')) {
    if (errs.length) { console.error(`✖ ${CHECKS_FILE}\n${errs.map((x) => `   • ${x}`).join('\n')}`); process.exit(2); }
    console.log(`✔ ${CHECKS_FILE}: ${cfg.checks.filter((c) => c.enabled !== false).length} checks on, scanner "${cfg.scanner}"`); process.exit(0);
  }
  if (errs.length) { console.error(`✖ ${CHECKS_FILE} is not valid:\n${errs.map((x) => `   • ${x}`).join('\n')}`); process.exit(2); }
  if (args.includes('--list')) {
    console.log(`Scanner for the verdict before testing: ${cfg.scanner}\n`);
    console.log(`${'check'.padEnd(26)} ${STAGES.map((s) => s.padEnd(9)).join('')} on finding`);
    for (const c of cfg.checks) console.log(`${(c.enabled === false ? '(off) ' : '') + c.id}`.padEnd(27) + STAGES.map((s) => (c.stages.includes(s) ? '●' : '·').padEnd(9)).join('') + c.onFinding + (c.run.command ? '   ' + c.run.command.slice(0, 60) : ''));
    process.exit(0);
  }
  const stage = opt('stage');
  if (!STAGES.includes(stage) || stage === 'bob') { console.error('usage: checks.mjs --list | --validate | --stage commit|scan|pipeline [--range A..B] [--json]'); process.exit(2); }
  let input, what;
  if (stage === 'commit') {
    what = 'staged changes';
    input = { added: addedLines(git('diff --cached -U0 --no-color')), paths: git('diff --cached --name-only --diff-filter=ACMR').split('\n').filter(Boolean) };
  } else if (opt('range')) {
    const range = opt('range'); what = range;
    input = { added: addedLines(git(`diff -U0 --no-color ${range}`)), paths: git(`diff --name-only --diff-filter=ACMR ${range}`).split('\n').filter(Boolean) };
  } else {
    what = 'all production code';
    const { isScannedCode } = await import('./lib.mjs');
    let list; try { list = git('ls-files -c -o --exclude-standard').split('\n').filter(Boolean); } catch { list = []; }
    input = { files: list.filter((p) => isScannedCode(p) && existsSync(join(ROOT, p))).map((p) => ({ path: p, text: readFileSync(join(ROOT, p), 'utf8') })) };
  }
  const res = runChecks(stage, input, cfg);
  if (args.includes('--json')) { console.log(JSON.stringify(res, null, 2)); process.exit(res.blocking.length ? 1 : 0); }
  if (!res.results.length) { console.log(`✔ checks (${stage}): none configured for this stage`); process.exit(0); }
  const quiet = stage === 'commit' && !args.includes('--verbose');
  for (const r of res.results) {
    if (quiet && r.status === 'pass') continue; // a git hook stays quiet when all is well
    const icon = { pass: '✔', fail: '✖', warn: '!', skip: '–' }[r.status];
    console.log(`${icon} ${r.id.padEnd(18)} ${r.title}`);
    for (const f of r.findings.slice(0, 8)) console.log(`    ${f.message}`);
    if (r.findings.length > 8) console.log(`    … and ${r.findings.length - 8} more`);
  }
  console.log(res.blocking.length ? `✖ checks (${stage}, ${what}): blocked by ${res.blocking.join(', ')}` : `✔ checks (${stage}, ${what}): nothing blocking`);
  process.exit(res.blocking.length ? 1 : 0);
}
