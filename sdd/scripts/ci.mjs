#!/usr/bin/env node
// The SDD gate for any pipeline — Jenkins, Azure DevOps, GitLab, GitHub Actions, Tekton, or a person in a terminal.
// It re-runs, on the server, every check Bob and the git hooks already ran on the laptop, so a skipped hook or a
// laptop without Bob changes nothing. Exit code 0 = pass, 1 = a check failed, 2 = the gate could not run.
//
//   node sdd/scripts/ci.mjs pr                       every pull-request check (policy, specs, commits, sign-offs,
//                                                    secrets, tests, scan = the security checks before testing)
//   node sdd/scripts/ci.mjs policy specs commits …   only some stages
//   node sdd/scripts/ci.mjs release --phase 3 --env production
//                                                    is this phase ready to ship, and who must approve it?
// Options:
//   --base <ref>        range start (default: worked out from the CI system's variables, see git-check.mjs)
//   --junit <file>      also write JUnit XML (Jenkins, Azure DevOps and GitLab show it as test results)
//   --summary <file>    also write a Markdown summary (for a pull-request comment or job summary)
//   --require-scan      with scanner "sonarqube": fail when SonarQube is not configured, instead of skipping
//
import { spawnSync, execSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.SDD_ROOT ? resolve(process.env.SDD_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const flag = (n) => args.includes(`--${n}`);
const OPTS_WITH_VALUE = ['base', 'junit', 'summary', 'phase', 'env', 'approvers-out'];
const words = args.filter((a, i) => !a.startsWith('--') && !OPTS_WITH_VALUE.includes(String(args[i - 1]).replace(/^--/, '')));

const ALL_PR = ['policy', 'specs', 'commits', 'signoffs', 'secrets', 'tests', 'scan'];
const stages = words.length === 0 || words.includes('pr') ? ALL_PR : words;
const git = (c) => execSync(`git ${c}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const node = (script, extra = []) => spawnSync(process.execPath, [join(ROOT, script), ...extra], { cwd: ROOT, encoding: 'utf8', env: process.env, maxBuffer: 1 << 26 });

const { resolveBase } = await import('./git-check.mjs');
const exists = (sha) => { try { git(`cat-file -e ${sha}^{commit}`); return true; } catch { return false; } };
let base = '';
try { base = resolveBase({ base: opt('base') ?? 'auto', env: process.env, exists }); } catch { base = ''; }
if (base && !exists(base)) {
  // A shallow or single-branch checkout: say how to fix it instead of judging the wrong range.
  console.error(`✖ The range start ${base} is not in this checkout. Fetch full history first (e.g. git fetch --unshallow origin, or a depth-0 checkout).`);
  process.exit(2);
}

const STAGES = {
  policy: { title: 'Automation dial, locked human gates and the checks configuration', run: runPolicy },
  specs: { title: 'Specs, contract and traceability', run: () => node('sdd/scripts/validate-specs.mjs') },
  commits: { title: 'Commit rules G1–G10 (the same rules as the local hook)', run: () => node('sdd/scripts/git-check.mjs', ['--ci', '--base', base || 'auto']) },
  signoffs: { title: 'Every sign-off was made by a listed person with the right role', run: () => node('sdd/scripts/github/verify-signoffs.mjs', base ? ['--base', base] : []) },
  secrets: { title: 'Secret scan of everything this change adds', run: () => node('sdd/scripts/secrets.mjs', base ? ['--range', `${base}..HEAD`] : ['--all']) },
  tests: { title: 'Unit, integration and contract tests', run: runTests },
  scan: { title: 'Security checks before testing: built-in and your organisation\'s tools', run: runScan },
  release: { title: 'Release readiness and who must approve it', run: runRelease },
};

function result(status, out = '', err = '') { return { status, stdout: out, stderr: err }; }

function runTests() {
  const pkgPath = join(ROOT, 'package.json');
  if (!existsSync(pkgPath)) return result(0, 'skipped: no package.json yet (the application is built by Bob during the labs)', '', 'skip');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (!pkg.scripts?.test) return result(0, 'skipped: package.json has no "test" script', '', 'skip');
  const pm = existsSync(join(ROOT, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm';
  const r = spawnSync(pm, pm === 'npm' ? ['test', '--silent'] : ['test'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, CI: 'true' }, maxBuffer: 1 << 26 });
  return r.error ? result(2, '', `could not run ${pm}: ${r.error.message}`) : r;
}

function runPolicy() {
  const a = node('sdd/scripts/policy.mjs', ['check']);
  const b = node('sdd/scripts/checks.mjs', ['--validate']);
  return { status: Math.max(a.status ?? 2, b.status ?? 2), stdout: `${a.stdout ?? ''}${b.stdout ?? ''}`, stderr: `${a.stderr ?? ''}${b.stderr ?? ''}` };
}

function scannerKind() { try { return JSON.parse(readFileSync(join(ROOT, 'sdd/governance/checks.json'), 'utf8')).scanner ?? 'sonarqube'; } catch { return 'sonarqube'; } }

function runScan() {
  if (scannerKind() === 'builtin') return node('sdd/scripts/scan.mjs', ['--ci']);
  if (!process.env.SONAR_HOST_URL || !process.env.SONAR_TOKEN) {
    const msg = 'SonarQube is not configured here (SONAR_HOST_URL and SONAR_TOKEN, from the pipeline\'s secret store).';
    return flag('require-scan') ? result(2, '', msg) : result(0, `skipped: ${msg} Pass --require-scan to make this a failure.`, '', 'skip');
  }
  const hasCode = (() => { try { return git('ls-files apps packages infra prisma').length > 0; } catch { return false; } })();
  if (!hasCode) return result(0, 'skipped: no production code yet', '', 'skip');
  return node('sdd/scripts/scan.mjs', ['--ci']);
}

async function runRelease() {
  const lib = await import('./lib.mjs');
  const { releaseApprovers, rolesText, tierInfo } = await import('./policy.mjs');
  const phase = opt('phase');
  const env = opt('env') ?? 'test';
  const approvals = lib.loadApprovals();
  const all = lib.features();
  const feats = phase ? all.filter((f) => String(f.phase) === String(phase)) : all.filter((f) => f.phase <= lib.currentPhase(approvals));
  const lines = [], problems = [];
  for (const f of feats) {
    const s = lib.featureState(f, approvals);
    const ti = tierInfo(f.id);
    lines.push(`${s.state === 'done' ? '✔' : '✖'} ${f.id} tier ${ti.tier} — ${s.state}`);
    if (s.state !== 'done') problems.push(`${f.id} is ${s.state}`);
  }
  if (phase && !approvals.phases?.[String(phase)]) problems.push(`phase ${phase} has no phase sign-off yet (${lib.humanAction('phase', phase)})`);
  const rel = releaseApprovers(feats.map((f) => f.id));
  const people = rel.roles;
  lines.push('');
  if (env === 'production') {
    lines.push(`Release to production needs a manual approval in the pipeline by: ${people.map((r) => rolesText([r])).join(' AND ')} (strictest tier in this release: ${rel.tier}; sdd/governance/policy.json).`);
    if (opt('approvers-out')) {
      const ap = JSON.parse(readFileSync(join(ROOT, 'sdd/governance/approvers.json'), 'utf8'));
      const who = Object.entries(ap.people ?? {}).filter(([, p]) => (p.roles ?? []).some((r) => people.includes(r))).map(([login, p]) => ({ login, email: p.email, roles: p.roles }));
      writeFileSync(opt('approvers-out'), JSON.stringify({ tier: rel.tier, roles: people, people: who }, null, 2));
    }
  } else lines.push(`Release to ${env}: automatic once these checks pass (the pipeline deploys; no person needed).`);
  if (problems.length) lines.push('', ...problems.map((p) => `✖ ${p}`));
  return result(problems.length ? 1 : 0, lines.join('\n'));
}

// ------------------------------------------------------------------ run
const results = [];
console.log(`SDD gate · ${stages.join(', ')} · range ${base ? `${base}..HEAD` : 'all history'}\n`);
for (const name of stages) {
  const st = STAGES[name];
  if (!st) { console.error(`✖ unknown stage "${name}" (stages: ${Object.keys(STAGES).join(', ')})`); process.exit(2); }
  const t0 = Date.now();
  const r = await st.run();
  const skipped = r.status === 0 && /^skipped:/.test(String(r.stdout ?? ''));
  const status = r.status === 0 ? (skipped ? 'skip' : 'pass') : r.status === 1 ? 'fail' : 'error';
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  results.push({ name, title: st.title, status, out, secs: (Date.now() - t0) / 1000 });
  const icon = { pass: '✔', fail: '✖', error: '✖', skip: '–' }[status];
  console.log(`${icon} ${name.padEnd(9)} ${st.title}`);
  if (status !== 'pass' || process.env.SDD_VERBOSE) console.log(out.split('\n').map((l) => `    ${l}`).join('\n'));
}
const failed = results.filter((r) => r.status === 'fail' || r.status === 'error');
console.log(`\n${failed.length ? `✖ SDD gate failed: ${failed.map((r) => r.name).join(', ')}` : '✔ SDD gate passed'}`);

if (opt('junit')) {
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cases = results.map((r) => `  <testcase classname="sdd-gate" name="${esc(`${r.name}: ${r.title}`)}" time="${r.secs.toFixed(2)}">${r.status === 'skip' ? '<skipped/>' : r.status === 'pass' ? '' : `<failure message="${esc(r.out.split('\n').find((l) => l.trim()) ?? r.status)}">${esc(r.out)}</failure>`}<system-out>${esc(r.out)}</system-out></testcase>`);
  writeFileSync(opt('junit'), `<?xml version="1.0" encoding="UTF-8"?>\n<testsuite name="sdd-gate" tests="${results.length}" failures="${failed.length}" skipped="${results.filter((r) => r.status === 'skip').length}">\n${cases.join('\n')}\n</testsuite>\n`);
}
if (opt('summary') || process.env.GITHUB_STEP_SUMMARY) {
  const md = [`### ${failed.length ? '✖' : '✔'} SDD gate`, '', '| Stage | Result | What it checks |', '|---|---|---|',
    ...results.map((r) => `| ${r.name} | ${{ pass: '✔ pass', fail: '✖ fail', error: '✖ could not run', skip: '– skipped' }[r.status]} | ${r.title} |`),
    ...failed.map((r) => `\n<details><summary>${r.name}</summary>\n\n\`\`\`\n${r.out.slice(0, 4000)}\n\`\`\`\n</details>`)].join('\n');
  if (opt('summary')) writeFileSync(opt('summary'), md + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n', { flag: 'a' });
}
process.exit(failed.some((r) => r.status === 'error') && !failed.some((r) => r.status === 'fail') ? 2 : failed.length ? 1 : 0);
