#!/usr/bin/env node
// Self-test of the pluggable security checks (sdd/governance/checks.json) in a throwaway copy of the kit:
// the same control in Bob's hook, at commit, in the scan before testing and in the pipeline, plus an
// organisation tool plugged in as a command. Run: node sdd/tests/checks/run.mjs
import { execSync, spawnSync } from 'node:child_process';
import { cpSync, rmSync, writeFileSync, readFileSync, mkdirSync, mkdtempSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const T = mkdtempSync(join(tmpdir(), 'sdd-checks-'));
cpSync(SRC, T, { recursive: true, filter: (p) => !/\/(node_modules|\.git)(\/|$)/.test(p) });
const sh = (c) => execSync(c, { cwd: T, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const run = (cmd, args, input) => spawnSync(cmd, args, { cwd: T, encoding: 'utf8', input, env: { ...process.env, GITHUB_ACTIONS: '' } });
sh('git init -q -b main && git config user.email dev@tidewell.example && git config user.name "Ali Dev" && git add -A && git commit -qm "chore(SDD): import" --no-verify');
sh('git config core.hooksPath sdd/scripts/hooks');

let pass = 0, fail = 0;
const check = (name, ok, extra = '') => { if (ok) { pass++; console.log(`  ✔ ${name}`); } else { fail++; console.log(`  ✖ ${name}\n      ${String(extra).slice(0, 400)}`); } };
const cfgPath = join(T, 'sdd/governance/checks.json');
const original = readFileSync(cfgPath, 'utf8');
const setCfg = (fn) => { const c = JSON.parse(original); fn(c); writeFileSync(cfgPath, JSON.stringify(c, null, 2)); };
const write = (p, text) => { mkdirSync(dirname(join(T, p)), { recursive: true }); writeFileSync(join(T, p), text); };

console.log('\n1. Configuration');
let r = run('node', ['sdd/scripts/checks.mjs', '--validate']);
check('the shipped checks.json is valid', r.status === 0, r.stderr);
r = run('node', ['sdd/scripts/checks.mjs', '--list']);
check('--list shows the IBM detect-secrets plug-in, switched off', /\(off\) ibm-detect-secrets/.test(r.stdout), r.stdout);
setCfg((c) => { c.checks.find((x) => x.id === 'secrets').enabled = false; });
r = run('node', ['sdd/scripts/checks.mjs', '--validate']);
check('switching the secrets check off is refused (locked)', r.status === 2 && /Locked: the built-in secrets check/.test(r.stderr), r.stderr);
r = run('node', ['sdd/scripts/ci.mjs', 'policy', '--base', 'HEAD']);
check('… and the pipeline\'s policy stage fails with it', r.status !== 0 && /Locked: the built-in secrets check/.test(r.stdout + r.stderr), r.stdout + r.stderr);
writeFileSync(cfgPath, original);

console.log('\n2. In Bob: the write is refused before it lands');
// fixture: F00 plan approved (test-only write into the throwaway copy), implement step running
const lib = await import(join(T, 'sdd/scripts/lib.mjs'));
const f00 = lib.featureById('F00');
const appr = lib.loadApprovals();
appr.plans.F00 = { file: `${f00.dir}/plan.md`, sha256: lib.fileHash(`${f00.dir}/plan.md`), specSha256: lib.fileHash(`${f00.dir}/spec.md`), by: 'Test owner', at: '2026-11-24T09:00:00Z' };
writeFileSync(join(T, 'sdd/state/approvals.json'), JSON.stringify(appr, null, 2));
r = run('node', ['sdd/scripts/step.mjs', 'start', 'implement', 'F00', '--mode', 'spec-builder']);
check('implement step starts', r.status === 0, r.stdout + r.stderr);
const hook = (path, content) => {
  const p = run('node', ['sdd/scripts/bob-hook.mjs'], JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'write_to_file', tool_input: { path, content } }));
  try { return JSON.parse(p.stdout).hookSpecificOutput?.permissionDecisionReason ?? ''; } catch { return ''; }
};
let why = hook('apps/api/src/statements.ts', 'export const q = (id: string) => db.query("SELECT * FROM statements WHERE account = \'" + id + "\'");\n');
check('SQL built from strings is refused, with the fix', /builds SQL from strings \(sql-string/.test(why) && /parameters/.test(why), why);
why = hook('apps/api/src/http.ts', 'export const agent = new https.Agent({ rejectUnauthorized: false });\n');
check('switching off TLS checks is refused', /tls-off/.test(why), why);
why = hook('apps/api/src/otp.ts', 'export const otp = () => String(Math.floor(Math.random() * 1e6));\n');
check('Math.random for an OTP is refused', /weak-random/.test(why), why);
why = hook('apps/api/src/statements.ts', 'export const q = (id: string) => prisma.$queryRaw`SELECT * FROM statements WHERE account = ${id}`;\n');
check('a parameterised query is allowed', why === '', why);

console.log('\n3. At commit: the pre-commit hook');
write('apps/api/src/report.ts', 'export const q = (from: string) => `SELECT * FROM transfers WHERE booked >= ${from}`;\n');
sh('git add apps/api/src/report.ts');
r = run('git', ['commit', '-m', 'feat(F00): report [FND-005]']);
check('a commit with SQL built from strings is refused by pre-commit', r.status !== 0 && /sql-string/.test(r.stdout + r.stderr), r.stdout + r.stderr);
sh('git reset -q && rm apps/api/src/report.ts');
write('apps/api/package.json', JSON.stringify({ name: '@tidewell/api', dependencies: { 'event-stream': '3.3.6' } }, null, 2));
sh('git add apps/api/package.json');
r = run('git', ['commit', '-m', 'feat(F00): add a dependency [FND-001]']);
check('a deny-listed package version is refused at commit, with the reason', r.status !== 0 && /deny-list/.test(r.stdout + r.stderr) && /compromised release/.test(r.stdout + r.stderr), r.stdout + r.stderr);
write('apps/api/package.json', JSON.stringify({ name: '@tidewell/api', dependencies: { zod: '^3.23.8' } }, null, 2));
sh('git add apps/api/package.json');
r = run('node', ['sdd/scripts/checks.mjs', '--stage', 'commit']);
check('an unpinned version is a warning, not a block', r.status === 0 && /not an exact version/.test(r.stdout), r.stdout + r.stderr);
sh('git reset -q && rm -r apps');

console.log('\n4. Before testing: the built-in scanner gives the verdict');
const tasksP = join(T, f00.dir, 'tasks.md');
writeFileSync(tasksP, readFileSync(tasksP, 'utf8').replace(/- \[ \]/g, '- [x]'));
write('apps/api/src/main.ts', 'export const main = () => 1;\n');
r = run('node', ['sdd/scripts/scan.mjs', 'F00']);
const ev = () => JSON.parse(readFileSync(join(T, 'sdd/reports/scan/F00.json'), 'utf8'));
check('scan F00 passes with no server, using checks.json', r.status === 0 && ev().result === 'PASS' && ev().scanner === 'builtin', r.stdout + r.stderr);
check('the evidence is bound to the code and to the checks configuration', /^[0-9a-f]{64}$/.test(ev().codeFingerprint) && /^[0-9a-f]{64}$/.test(ev().checksConfig));
let s = lib.scanEvidence(f00);
check('the feature may move on to testing', s.state === 'pass', JSON.stringify(s));
write('apps/api/src/crypto.ts', 'import { createHash } from "node:crypto";\nexport const h = (x: string) => createHash("md5").update(x).digest("hex");\n');
lib.codeFingerprint({ fresh: true });
check('changing the code makes the verdict stale', lib.scanEvidence(f00).state === 'stale');
r = run('node', ['sdd/scripts/scan.mjs', 'F00']);
check('scan fails on a weak hash, and says which check', r.status === 1 && ev().result === 'FAIL' && /risky-code/.test(ev().reasons.join(' ')), r.stdout);
const gate = lib.checkStart('verify', 'F00', 'spec-verifier');
check('verify is refused, naming the failed check', !gate.ok && /failed its last scan \(risky-code/.test(gate.reason), gate.reason);
const md = readFileSync(join(T, 'sdd/reports/scan/F00.md'), 'utf8');
check('the report says what to fix', /weak hash/.test(md) && /sha256 or better/.test(md));
rmSync(join(T, 'apps/api/src/crypto.ts'));

console.log('\n5. Plug in your organisation\'s tool');
setCfg((c) => c.checks.push({ id: 'org-scanner', title: 'The bank\'s own scanner (simulated)', run: { command: 'node -e "process.exit(require(\'fs\').readFileSync(\'apps/api/src/main.ts\',\'utf8\').includes(\'INSECURE\')?1:0)" {files}' }, stages: ['scan'], onFinding: 'block', enabled: true }));
r = run('node', ['sdd/scripts/scan.mjs', 'F00']);
check('an enabled tool that passes lets the scan pass', r.status === 0 && ev().checks.some((x) => x.id === 'org-scanner' && x.status === 'pass'), r.stdout + r.stderr);
write('apps/api/src/main.ts', 'export const main = () => 1; // INSECURE\n');
r = run('node', ['sdd/scripts/scan.mjs', 'F00']);
check('its finding blocks the scan like a built-in one', r.status === 1 && /org-scanner/.test(ev().reasons.join(' ')), r.stdout);
setCfg((c) => c.checks.push({ id: 'licensed-tool', title: 'A licensed tool nobody installed', run: { command: 'definitely-not-installed-sdd-tool {files}' }, stages: ['scan'], onFinding: 'block', enabled: true, install: 'ask the platform team' }));
write('apps/api/src/main.ts', 'export const main = () => 1;\n');
r = run('node', ['sdd/scripts/scan.mjs', 'F00']);
check('a switched-on tool that is missing fails closed, with the install hint', r.status === 1 && /could not run/.test(r.stdout) && /ask the platform team/.test(r.stdout), r.stdout);
setCfg((c) => c.checks.find((x) => x.id === 'bob-review').enabled = true);
r = run('node', ['sdd/scripts/checks.mjs', '--stage', 'pipeline', '--range', 'HEAD~0..HEAD']);
check('the advisory Bob Shell review is skipped, not blocking, without BOB_API_KEY', r.status === 0 && /needs BOB_API_KEY/.test(r.stdout), r.stdout + r.stderr);
writeFileSync(cfgPath, original);

console.log('\n6. In the pipeline');
r = run('node', ['sdd/scripts/ci.mjs', 'scan', '--base', 'HEAD']);
check('ci.mjs runs the scan stage with the built-in scanner (no SonarQube needed)', r.status === 0 && /security checks before testing/i.test(r.stdout) && !/skipped/.test(r.stdout), r.stdout + r.stderr);
r = run('node', ['sdd/scripts/scan.mjs', '--gate-only', '--revision', 'deadbeef']);
check('promotion refuses a revision that is not checked out', r.status === 1 && /not deadbeef/.test(r.stderr), r.stderr);

rmSync(T, { recursive: true, force: true });
console.log(`\n${fail ? '✖' : '✔'} ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
