#!/usr/bin/env node
// Security scan — the gate between implementation and testing (Article XI, NFR-SEC-042..046, ADR-0009).
// Who gives the verdict is set in sdd/governance/checks.json → "scanner":
//   builtin    the checks configured for stage "scan" (built-in checks + any organisation tool switched on there);
//              no server needed, which is what the labs use
//   sonarqube  SonarQube's quality gate + dependency CVEs (below); Bob's own findings are advisory, imported as SARIF
// Either way the verdict comes from a script Bob cannot change, and it is bound to a fingerprint of the code it saw.
//
//   node sdd/scripts/scan.mjs F03 [--with-bob-review]   feature scan → sdd/reports/scan/F03.json + F03.md
//   node sdd/scripts/scan.mjs --ci                      whole-repo scan in CI (exit code = gate)
//   node sdd/scripts/scan.mjs --gate-only [--branch main] [--revision <sha>]   promotion check, no scan
//   node sdd/scripts/scan.mjs F03 --dry-run             print the plan, touch nothing
//
// Environment (never committed):  SONAR_HOST_URL, SONAR_TOKEN
// Optional overrides:            SONAR_SCANNER_CMD (default "npx --yes @sonar/scan"),
//                                OSV_SCANNER_CMD   (default "osv-scanner")
// Policy knobs come from sdd/specs/00-constitution.md: SONAR_QUALITY_GATE, SCA_PROVIDER, BOB_REVIEW_IN_SCAN.
//
// Exit codes: 0 PASS · 1 FAIL (quality gate or blocking CVE) · 2 could not scan (no evidence written).
// Only this script writes sdd/reports/scan/*.json; the SDD guard blocks every other writer.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, appendFileSync } from 'node:fs';
import { join, basename } from 'node:path';
import {
  ROOT, read, exists, featureById, codeFingerprint, isScannedCode, TEST_FILE, loadApprovals, gitUser, appendHistory, SCAN_DIR, humanAction,
} from './lib.mjs';
import { createHash } from 'node:crypto';
import { loadChecks, validateChecks, runChecks } from './checks.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(`--${n}`);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const die = (msg, code = 2) => { console.error(`✖ scan: ${msg}`); process.exit(code); };
const log = (msg) => console.log(`• ${msg}`);

// ------------------------------------------------------------------ configuration
function knob(name, fallback) {
  if (!exists('sdd/specs/00-constitution.md')) return fallback;
  const m = read('sdd/specs/00-constitution.md').match(new RegExp('^\\| `' + name + '` \\| ([^|]+) \\|', 'm'));
  return m ? m[1].replace(/`/g, '').trim().split(/\s+\(|\s{2,}/)[0].trim() : fallback;
}
function properties(path) {
  const out = {};
  if (!exists(path)) return out;
  for (const line of read(path).split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trimStart().startsWith('#')) out[m[1]] = m[2];
  }
  return out;
}

const props = properties('sonar-project.properties');
const cfg = {
  host: (process.env.SONAR_HOST_URL || '').replace(/\/+$/, ''),
  token: process.env.SONAR_TOKEN || '',
  projectKey: props['sonar.projectKey'] || basename(process.cwd()),
  gateName: knob('SONAR_QUALITY_GATE', 'Sonar way'), // the project's gate is a knob in the constitution
  sca: knob('SCA_PROVIDER', 'osv-scanner'), // osv-scanner | sonar | both
  bobKnob: knob('BOB_REVIEW_IN_SCAN', 'off') === 'on',
  scanner: process.env.SONAR_SCANNER_CMD || 'npx --yes @sonar/scan',
  osv: process.env.OSV_SCANNER_CMD || 'osv-scanner',
};
const WORK = join(ROOT, '.scannerwork');
const SDD_WORK = join(WORK, 'sdd');

function requireServer() {
  if (!cfg.host || !cfg.token) die('set SONAR_HOST_URL and SONAR_TOKEN in your environment (never in a file). See sdd/docs/SONARQUBE.md.');
  const u = new URL(cfg.host);
  if (u.protocol !== 'https:' && !['localhost', '127.0.0.1', '::1'].includes(u.hostname)) die(`refusing to send a token over ${u.protocol} to ${u.hostname}; use https.`);
}

async function api(path) {
  const res = await fetch(cfg.host + path, { headers: { Authorization: `Bearer ${cfg.token}`, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${path.split('?')[0]}`);
  return res.json();
}
async function tryApi(...paths) {
  for (const p of paths) { try { return await api(p); } catch { /* try the next form (API differs across editions/versions) */ } }
  return null;
}
const q = encodeURIComponent;


// ------------------------------------------------------------------ scanner "builtin": the configured checks decide
const CHECKS = loadChecks();
const SCANNER = CHECKS.scanner ?? 'sonarqube';
function productionFiles() {
  let list;
  try { list = spawnSync('git', ['ls-files', '-c', '-o', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 }).stdout.split('\n').filter(Boolean); } catch { list = []; }
  return [...new Set(list)].filter((p) => isScannedCode(p) && existsSync(join(ROOT, p))).sort();
}
function builtinVerdict(stages) {
  const errs = validateChecks(CHECKS);
  if (errs.length) die(`sdd/governance/checks.json is not valid: ${errs.join(' ')}`);
  const paths = productionFiles();
  const input = { files: paths.map((p) => ({ path: p, text: readFileSync(join(ROOT, p), 'utf8') })), paths };
  const results = stages.flatMap((st) => runChecks(st, input, CHECKS).results);
  const reasons = results.filter((r) => r.status === 'fail').map((r) => `${r.id}: ${Math.max(1, r.findings.filter((x) => x.level === 'block').length)} blocking finding(s)`);
  return { results, reasons, result: reasons.length ? 'FAIL' : 'PASS' };
}
function builtinReport(ev, feat) {
  const cell = (x) => String(x ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const L = ['---', `feature: ${ev.feature}`, `result: ${ev.result}`, `generated-by: ${ev.producer}`, `scanned-at: ${ev.scannedAt}`, '---', ''];
  L.push(`# Security checks before testing — ${ev.feature}${feat ? ` · ${feat.title}` : ''}`, '');
  L.push(`> Generated by \`sdd/scripts/scan.mjs\` with the checks in \`sdd/governance/checks.json\` (scanner "builtin"); the evidence is [\`${ev.feature}.json\`](${ev.feature}.json).`,
    '> Do not edit above "Triage notes" — re-run `/sdd-scan` instead. The checks decide; Bob explains.', '');
  L.push('| | |', '|---|---|', `| Result | ${ev.result === 'PASS' ? '✅' : '❌'} **${ev.result}**${ev.reasons.length ? ` — ${cell(ev.reasons.join('; '))}` : ''} |`,
    `| Production files checked | ${ev.productionFiles} · fingerprint \`${ev.codeFingerprint.slice(0, 12)}…\` |`, `| Checks configuration | \`sdd/governance/checks.json\` · sha256 \`${ev.checksConfig.slice(0, 12)}…\` |`, '');
  L.push('## Checks', '', '| Check | Kind | Result | Findings |', '|---|---|---|---|');
  for (const r of ev.checks) L.push(`| ${cell(r.title)} (\`${r.id}\`) | ${r.kind} | ${{ pass: '✅ pass', fail: '❌ blocking', warn: '⚠️ warning', skip: '– skipped' }[r.status]} | ${r.findings.length} |`);
  const all = ev.checks.flatMap((r) => r.findings);
  L.push('', '## Findings', '', all.length ? all.map((x) => `- ${x.level === 'block' ? '❌' : '⚠️'} ${x.message}`).join('\n') : 'None.');
  L.push('', '## Next step', '', ev.result === 'PASS' ? `Promotion to testing is unblocked: 🔍 Spec Verifier → \`/sdd-verify ${ev.feature}\`.`
    : `Blocked. 🏗️ Spec Builder → \`/sdd-implement ${ev.feature}\` to fix the findings above, then \`/sdd-scan ${ev.feature}\` again. A finding the organisation accepts is a human decision: AppSec changes sdd/governance/checks.json or an allowlist in a reviewed chore(SDD) commit.`);
  return L.join('\n') + '\n';
}
if (SCANNER === 'builtin' && flag('gate-only')) {
  const rev = opt('revision');
  const head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
  if (rev && !head.startsWith(rev) && !rev.startsWith(head)) { console.error(`✖ the checked-out commit is ${head.slice(0, 12)}, not ${rev}. Check out the commit being promoted.`); process.exit(1); }
  const v = builtinVerdict(['scan', 'pipeline']);
  console.log(`${v.result === 'PASS' ? '✔' : '✖'} security checks for ${head.slice(0, 12)}: ${v.result}${v.reasons.length ? ' — ' + v.reasons.join('; ') : ''}`);
  process.exit(v.result === 'PASS' ? 0 : 1);
}

// ------------------------------------------------------------------ mode: promotion check only
if (flag('gate-only')) {
  requireServer();
  const branch = opt('branch') ?? 'main';
  const revision = opt('revision');
  const status = await tryApi(
    `/api/qualitygates/project_status?projectKey=${q(cfg.projectKey)}&branch=${q(branch)}`,
    `/api/qualitygates/project_status?projectKey=${q(cfg.projectKey)}`,
  );
  if (!status) die('could not read the quality gate status from SonarQube.');
  if (revision) {
    const an = await tryApi(
      `/api/project_analyses/search?project=${q(cfg.projectKey)}&branch=${q(branch)}&ps=1`,
      `/api/project_analyses/search?project=${q(cfg.projectKey)}&ps=1`,
    );
    const rev = an?.analyses?.[0]?.revision;
    if (rev !== revision) {
      console.error(`✖ the latest SonarQube analysis of ${branch} is for ${rev ?? 'an unknown revision'}, not ${revision}. Scan this commit first.`);
      process.exit(1);
    }
  }
  const st = status.projectStatus?.status;
  console.log(`${st === 'OK' ? '✔' : '✖'} SonarQube quality gate for ${cfg.projectKey}@${branch}: ${st}`);
  process.exit(st === 'OK' ? 0 : 1);
}

// ------------------------------------------------------------------ mode: feature or CI scan
const ci = flag('ci');
const featureId = args.find((a) => /^F\d{2}$/.test(a));
const f = featureId ? featureById(featureId) : null;
if (!ci && !f) die(featureId ? `unknown feature ${featureId}` : 'usage: scan.mjs <F##> [--with-bob-review] | --ci | --gate-only [--branch b] [--revision sha]');
if (args.some((a) => /^-D/.test(a))) die('-D overrides are not accepted; the analysis scope lives in sonar-project.properties (human-owned).');
if (SCANNER !== 'builtin' && !exists('sonar-project.properties')) die('sonar-project.properties is missing (it defines the analysis scope).');
const withBob = flag('with-bob-review') || cfg.bobKnob;
const label = f ? f.id : 'ci';

if (SCANNER === 'builtin') {
  const fpB = codeFingerprint({ fresh: true });
  if (flag('dry-run')) {
    console.log(JSON.stringify({ target: label, scanner: 'builtin', productionFiles: fpB.files, fingerprint: fpB.sha256,
      checks: CHECKS.checks.filter((c) => c.enabled !== false && (c.stages.includes('scan') || (ci && c.stages.includes('pipeline')))).map((c) => c.id) }, null, 2));
    process.exit(0);
  }
  if (fpB.files === 0 && !ci) die('no production code found (apps/, packages/, infra/, prisma/, root manifests). Nothing to scan yet.');
  if (flag('with-bob-review')) log('with scanner "builtin", Bob\'s advisory review is the "bob-review" check in sdd/governance/checks.json (pipeline stage).');
  log(`checks from sdd/governance/checks.json (scanner "builtin") on ${fpB.files} production file(s)`);
  const v = builtinVerdict(ci ? ['scan', 'pipeline'] : ['scan']);
  for (const r of v.results) console.log(`${{ pass: '✔', fail: '✖', warn: '!', skip: '–' }[r.status]} ${r.id.padEnd(18)} ${r.title}${r.findings.length ? '\n' + r.findings.slice(0, 6).map((x) => `    ${x.message}`).join('\n') : ''}`);
  if (codeFingerprint({ fresh: true }).sha256 !== fpB.sha256) die('production code changed while the checks were running; re-run /sdd-scan. No evidence written.');
  const ev = { producer: 'sdd/scripts/scan.mjs', schema: 1, feature: label, result: v.result, reasons: v.reasons, scannedAt: new Date().toISOString(), by: gitUser(),
    codeFingerprint: fpB.sha256, productionFiles: fpB.files, scanner: 'builtin',
    checksConfig: createHash('sha256').update(read('sdd/governance/checks.json')).digest('hex'), checks: v.results,
    sonar: null, sca: { provider: 'checks', blocking: v.results.filter((r) => r.id === 'dependencies' && r.status === 'fail').length }, bobReview: { included: false } };
  const TRIAGE_B = '## Triage notes (🔐 Check Runner)';
  if (f) {
    mkdirSync(join(ROOT, SCAN_DIR), { recursive: true });
    const mdPath = join(ROOT, SCAN_DIR, `${f.id}.md`);
    const previous = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : '';
    const kept = previous.includes(TRIAGE_B) ? previous.slice(previous.indexOf(TRIAGE_B)) : `${TRIAGE_B}\n\n_Check Runner: summarise what each blocking finding means for ${f.id} and which task fixes it. Never mark findings safe here — that is a human decision._\n`;
    writeFileSync(join(ROOT, SCAN_DIR, `${f.id}.json`), JSON.stringify(ev, null, 2) + '\n');
    writeFileSync(mdPath, builtinReport(ev, f) + '\n' + kept);
    appendHistory({ event: 'scan', feature: f.id, result: v.result, scanner: 'builtin', fingerprint: fpB.sha256, by: gitUser() });
  } else {
    mkdirSync(SDD_WORK, { recursive: true });
    writeFileSync(join(SDD_WORK, 'ci-scan.json'), JSON.stringify(ev, null, 2) + '\n');
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, builtinReport(ev, null));
  }
  console.log(`\n${v.result === 'PASS' ? '✅' : '❌'} ${label}: ${v.result}${v.reasons.length ? ' — ' + v.reasons.join('; ') : ''}`);
  if (f) console.log(`   evidence: ${SCAN_DIR}/${f.id}.json · report: ${SCAN_DIR}/${f.id}.md`);
  process.exit(v.result === 'PASS' ? 0 : 1);
}

const fpBefore = codeFingerprint({ fresh: true });
const scannerArgs = [
  `-Dsonar.host.url=${cfg.host || '$SONAR_HOST_URL'}`,
  '-Dsonar.qualitygate.wait=true',
  '-Dsonar.qualitygate.timeout=600',
  `-Dsonar.analysis.sddFeature=${label}`,
  `-Dsonar.analysis.sddFingerprint=${fpBefore.sha256}`,
];

if (flag('dry-run')) {
  console.log(JSON.stringify({ target: label, projectKey: cfg.projectKey, gate: cfg.gateName, sca: cfg.sca, bobReview: withBob,
    productionFiles: fpBefore.files, fingerprint: fpBefore.sha256,
    commands: [
      ...(cfg.sca !== 'sonar' ? [`${cfg.osv} scan source -r --format json .`] : []),
      `${cfg.scanner} ${scannerArgs.join(' ')}${withBob ? ' -Dsonar.sarifReportPaths=<sanitized Bob SARIF>' : ''}`,
    ] }, null, 2));
  process.exit(0);
}

requireServer();
if (fpBefore.files === 0 && !ci) die('no production code found (apps/, packages/, infra/, prisma/, root manifests). Nothing to scan yet.');
mkdirSync(SDD_WORK, { recursive: true });

// ---------------------------------------------------- 1. SCA (dependency CVEs) via OSV-Scanner
const today = new Date().toISOString().slice(0, 10);
const waivers = loadApprovals().waivers ?? {};
const waiverFor = (ids) => ids.map((id) => [id, waivers[id]]).find(([, w]) => w && w.expires >= today);

function runOsv() {
  log(`SCA: ${cfg.osv} scan source -r --format json .`);
  const r = spawnSync(`${cfg.osv} scan source -r --format json .`, { cwd: ROOT, shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  if (r.error || r.status === null) die(`could not run OSV-Scanner (${r.error?.message ?? 'killed'}). Install it or set SCA_PROVIDER=sonar via a change request.`);
  if (r.status === 128) return { packagesFound: false, findings: [] }; // no lockfile yet
  if (r.status !== 0 && r.status !== 1) die(`OSV-Scanner failed (exit ${r.status}): ${(r.stderr || '').trim().split('\n').slice(-3).join(' ')}`);
  let out;
  try { out = JSON.parse(r.stdout || '{}'); } catch { die('OSV-Scanner output was not JSON.'); }
  const findings = [];
  for (const res of out.results ?? []) {
    for (const pkg of res.packages ?? []) {
      const vulns = new Map((pkg.vulnerabilities ?? []).map((v) => [v.id, v]));
      for (const g of pkg.groups ?? [{ ids: [...vulns.keys()] }]) {
        const ids = [...new Set([...(g.ids ?? []), ...(g.aliases ?? [])])];
        const primary = (g.ids ?? ids)[0];
        const v = vulns.get(primary) ?? {};
        const score = parseFloat(g.max_severity);
        const fixed = (v.affected ?? []).flatMap((a) => (a.ranges ?? []).flatMap((rg) => (rg.events ?? []).map((e) => e.fixed))).find(Boolean) ?? null;
        const waiver = waiverFor(ids);
        const high = Number.isNaN(score) || score >= 7.0; // unrated = treated as high (fail closed)
        findings.push({
          id: primary, cves: ids.filter((i) => /^CVE-/.test(i)), aliases: ids,
          package: `${pkg.package?.name}@${pkg.package?.version}`, ecosystem: pkg.package?.ecosystem ?? null,
          source: res.source?.path ? res.source.path.replace(ROOT + '/', '') : null,
          severity: Number.isNaN(score) ? 'unrated' : score, summary: v.summary ?? null, fixedIn: fixed,
          blocking: high && !waiver, waivedBy: waiver ? `${waiver[1].by} until ${waiver[1].expires}` : null,
        });
      }
    }
  }
  return { packagesFound: true, findings };
}
const osv = cfg.sca === 'sonar' ? null : runOsv();
const scaFindings = osv?.findings ?? [];
const knownVulnIds = new Set(scaFindings.flatMap((x) => x.aliases));

// ---------------------------------------------------- 2. optional Bob review → sanitized SARIF
const CVE_CLAIM = /\b(CVE-\d{4}-\d{4,}|GHSA-[\w]{4}-[\w]{4}-[\w]{4})\b/;
function normalizeUri(uri) {
  if (!uri) return null;
  let p = decodeURIComponent(String(uri).replace(/^file:\/\//, ''));
  if (p.startsWith(ROOT + '/')) p = p.slice(ROOT.length + 1);
  return p.replace(/^\.\//, '');
}
function sanitizeBob(path) {
  let sarif;
  try { sarif = JSON.parse(readFileSync(join(ROOT, path), 'utf8')); } catch (e) { die(`${path} is not valid JSON (${e.message}).`); }
  if (sarif.version !== '2.1.0' || !Array.isArray(sarif.runs)) die(`${path} must be SARIF 2.1.0 with a "runs" array.`);
  const leads = [];
  let kept = 0; let dropped = 0;
  for (const run of sarif.runs) {
    run.tool = { driver: { ...(run.tool?.driver ?? {}), name: 'IBM Bob (advisory review)' } };
    run.results = (run.results ?? []).filter((r) => {
      const text = `${r.ruleId ?? ''} ${r.message?.text ?? ''}`;
      const claim = text.match(CVE_CLAIM);
      if (claim) { // dependency CVEs are an SCA question; Bob's claim is only a lead
        leads.push({ id: claim[1], text: (r.message?.text ?? '').slice(0, 200), confirmedBySca: cfg.sca === 'sonar' ? 'check SonarQube dependency risks' : knownVulnIds.has(claim[1]) });
        return false;
      }
      const loc = r.locations?.[0]?.physicalLocation;
      const p = normalizeUri(loc?.artifactLocation?.uri);
      if (!p || !existsSync(join(ROOT, p)) || !(isScannedCode(p) || TEST_FILE.test(p))) { dropped++; return false; }
      loc.artifactLocation.uri = p;
      kept++;
      return true;
    });
  }
  return { sarif, kept, dropped, leads };
}
const bob = { included: withBob, files: [], imported: 0, dropped: 0, leads: [] };
const sarifPaths = [];
if (withBob) {
  const sources = f ? [`${SCAN_DIR}/${f.id}.bob.sarif`]
    : (existsSync(join(ROOT, SCAN_DIR)) ? readdirSync(join(ROOT, SCAN_DIR)).filter((n) => n.endsWith('.bob.sarif')).map((n) => `${SCAN_DIR}/${n}`) : []);
  if (f && !exists(sources[0])) die(`Bob review requested but ${sources[0]} does not exist. In 🔐 Check Runner, run the bob-findings-sarif skill first (or scan without --with-bob-review).`);
  for (const src of sources) {
    const s = sanitizeBob(src);
    const out = join(SDD_WORK, `${src.split('/').pop()}`);
    writeFileSync(out, JSON.stringify(s.sarif, null, 2));
    sarifPaths.push(out.replace(ROOT + '/', ''));
    bob.files.push(src); bob.imported += s.kept; bob.dropped += s.dropped; bob.leads.push(...s.leads);
  }
  if (sarifPaths.length) scannerArgs.push(`-Dsonar.sarifReportPaths=${sarifPaths.join(',')}`);
}

// ---------------------------------------------------- 3. SonarQube analysis (waits for the quality gate)
const reportTask = join(WORK, 'report-task.txt');
rmSync(reportTask, { force: true });
const cmd = `${cfg.scanner} ${scannerArgs.map((a) => `"${a}"`).join(' ')}`;
log(`SonarQube: ${cmd}`);
const scan = spawnSync(cmd, { cwd: ROOT, shell: true, stdio: 'inherit', env: { ...process.env, SONAR_HOST_URL: cfg.host, SONAR_TOKEN: cfg.token } });
if (scan.error) die(`could not start the SonarQube scanner (${scan.error.message}).`);
if (!existsSync(reportTask)) die(`the scanner did not upload an analysis (exit ${scan.status}); see its output above. No evidence written.`);
const task = Object.fromEntries(readFileSync(reportTask, 'utf8').split('\n').map((l) => l.match(/^([\w.]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
const dash = task.dashboardUrl ? new URL(task.dashboardUrl) : null;
const branch = dash?.searchParams.get('branch') ?? null;
const pullRequest = dash?.searchParams.get('pullRequest') ?? null;
const scope = branch ? `&branch=${q(branch)}` : pullRequest ? `&pullRequest=${q(pullRequest)}` : '';

// ---------------------------------------------------- 4. read the verdict back from SonarQube
const sonar = { qualityGate: null, gateName: null, source: 'api', conditions: [], measures: {}, issues: [], hotspotsToReview: null,
  analysisId: null, dashboardUrl: task.dashboardUrl ?? null, branch, pullRequest };
const ce = await tryApi(`/api/ce/task?id=${q(task.ceTaskId)}`);
if (ce?.task && ce.task.status !== 'SUCCESS') die(`SonarQube could not process the analysis (task ${ce.task.status}).`);
sonar.analysisId = ce?.task?.analysisId ?? null;
const gate = sonar.analysisId ? await tryApi(`/api/qualitygates/project_status?analysisId=${q(sonar.analysisId)}`) : null;
if (gate?.projectStatus) {
  sonar.qualityGate = gate.projectStatus.status;
  sonar.conditions = (gate.projectStatus.conditions ?? []).map((c) => ({ metric: c.metricKey, comparator: c.comparator, threshold: c.errorThreshold, actual: c.actualValue, status: c.status }));
} else { // API unreachable: with sonar.qualitygate.wait=true the scanner's exit code is the gate
  sonar.qualityGate = scan.status === 0 ? 'OK' : 'ERROR';
  sonar.source = 'scanner-exit-code';
}
const qg = await tryApi(`/api/qualitygates/get_by_project?project=${q(cfg.projectKey)}`);
sonar.gateName = qg?.qualityGate?.name ?? null;
const m = await tryApi(
  `/api/measures/component?component=${q(cfg.projectKey)}${scope}&metricKeys=new_vulnerabilities,vulnerabilities,new_security_hotspots_reviewed,security_hotspots_reviewed,new_security_rating,security_rating`,
  `/api/measures/component?component=${q(cfg.projectKey)}${scope}&metricKeys=new_vulnerabilities,vulnerabilities,security_rating`,
);
for (const x of m?.component?.measures ?? []) sonar.measures[x.metric] = x.value ?? x.period?.value ?? null;
const hs = await tryApi(`/api/hotspots/search?project=${q(cfg.projectKey)}${scope}&status=TO_REVIEW&ps=1`);
sonar.hotspotsToReview = hs?.paging?.total ?? null;
const iss = await tryApi(
  `/api/issues/search?componentKeys=${q(cfg.projectKey)}${scope}&impactSoftwareQualities=SECURITY&issueStatuses=OPEN,CONFIRMED&ps=25`,
  `/api/issues/search?componentKeys=${q(cfg.projectKey)}${scope}&types=VULNERABILITY&resolved=false&ps=25`,
);
sonar.issues = (iss?.issues ?? []).map((i) => ({
  key: i.key, rule: i.rule, engine: i.externalRuleEngine ?? null,
  severity: (i.impacts ?? []).find((x) => x.softwareQuality === 'SECURITY')?.severity ?? i.severity ?? null,
  file: (i.component ?? '').split(':').slice(1).join(':') || null, line: i.line ?? null, message: i.message,
}));

// ---------------------------------------------------- 5. integrity + verdict
const fpAfter = codeFingerprint({ fresh: true });
if (fpAfter.sha256 !== fpBefore.sha256) die('production code changed while the scan was running; re-run /sdd-scan. No evidence written.');
const reasons = [];
if (sonar.qualityGate !== 'OK') reasons.push(`SonarQube quality gate ${sonar.qualityGate}`);
if (sonar.gateName && sonar.gateName !== cfg.gateName) reasons.push(`project uses quality gate "${sonar.gateName}", expected "${cfg.gateName}" (Article XI.3)`);
const blocking = scaFindings.filter((x) => x.blocking);
if (blocking.length) reasons.push(`${blocking.length} High/Critical dependency vulnerability(ies) without a waiver`);
const result = reasons.length ? 'FAIL' : 'PASS';

const evidence = {
  producer: 'sdd/scripts/scan.mjs', schema: 1, feature: label, result, reasons,
  scannedAt: new Date().toISOString(), by: gitUser(),
  codeFingerprint: fpBefore.sha256, productionFiles: fpBefore.files,
  projectKey: cfg.projectKey, expectedGate: cfg.gateName,
  sonar,
  sca: { provider: cfg.sca, packagesFound: osv?.packagesFound ?? null, total: scaFindings.length, blocking: blocking.length,
    waived: scaFindings.filter((x) => x.waivedBy).length, findings: scaFindings },
  bobReview: bob,
};

// ---------------------------------------------------- 6. write evidence + human-readable report
function mdReport(ev) {
  const icon = ev.result === 'PASS' ? '✅' : '❌';
  const cell = (s) => String(s ?? '—').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const lines = [];
  lines.push('---', `feature: ${ev.feature}`, `result: ${ev.result}`, `generated-by: ${ev.producer}`, `scanned-at: ${ev.scannedAt}`, '---', '');
  lines.push(`# External security scan — ${ev.feature}${f ? ` · ${f.title}` : ''}`, '');
  lines.push(`> Generated by \`sdd/scripts/scan.mjs\`; the evidence is [\`${ev.feature}.json\`](${ev.feature}.json). Do not edit above`,
    '> "Triage notes" — re-run `/sdd-scan` instead. SonarQube decides; Bob findings are advisory (ADR-0009).', '');
  lines.push('| | |', '|---|---|');
  lines.push(`| Result | ${icon} **${ev.result}**${ev.reasons.length ? ` — ${cell(ev.reasons.join('; '))}` : ''} |`);
  lines.push(`| SonarQube quality gate | ${cell(ev.sonar.qualityGate)} · ${cell(ev.sonar.gateName ?? ev.expectedGate)}${ev.sonar.dashboardUrl ? ` · [dashboard](${ev.sonar.dashboardUrl})` : ''} |`);
  lines.push(`| Analysis | ${cell(ev.sonar.analysisId)}${ev.sonar.branch ? ` · branch ${cell(ev.sonar.branch)}` : ''}${ev.sonar.pullRequest ? ` · PR ${cell(ev.sonar.pullRequest)}` : ''} |`);
  lines.push(`| Production files scanned | ${ev.productionFiles} · fingerprint \`${ev.codeFingerprint.slice(0, 12)}…\` |`);
  lines.push(`| Security hotspots to review | ${cell(ev.sonar.hotspotsToReview)} |`);
  lines.push(`| Dependency CVEs (${cell(ev.sca.provider)}) | ${ev.sca.provider === 'sonar' ? 'in the SonarQube gate (Advanced Security)' : `${ev.sca.blocking} blocking · ${ev.sca.total} total · ${ev.sca.waived} waived`} |`);
  lines.push(`| Bob review (advisory) | ${ev.bobReview.included ? `${ev.bobReview.imported} imported into SonarQube · ${ev.bobReview.leads.length} CVE lead(s) · ${ev.bobReview.dropped} dropped (no valid code location)` : 'not requested'} |`, '');
  if (ev.sonar.conditions.length) {
    lines.push('## Quality gate conditions', '', '| Metric | Actual | Threshold | Status |', '|---|---|---|---|');
    for (const c of ev.sonar.conditions) lines.push(`| ${cell(c.metric)} | ${cell(c.actual)} | ${cell(c.comparator)} ${cell(c.threshold)} | ${c.status === 'OK' ? '✅' : '❌'} ${cell(c.status)} |`);
    lines.push('');
  }
  lines.push('## Open security issues (SonarQube)', '');
  if (ev.sonar.issues.length) {
    lines.push('| Severity | Rule | Location | Message |', '|---|---|---|---|');
    for (const i of ev.sonar.issues) lines.push(`| ${cell(i.severity)} | \`${cell(i.rule)}\` | \`${cell(i.file)}${i.line ? ':' + i.line : ''}\` | ${cell(i.message)} |`);
  } else lines.push('None reported.');
  lines.push('', '## Dependency vulnerabilities (SCA)', '');
  if (ev.sca.provider === 'sonar') lines.push('Checked by SonarQube Advanced Security inside the quality gate (dependency-risk conditions). See the dashboard.');
  else if (!ev.sca.findings.length) lines.push(ev.sca.packagesFound === false ? 'No lockfile found yet.' : 'None found.');
  else {
    lines.push('| ID | CVE | Package | CVSS | Fixed in | Status |', '|---|---|---|---|---|---|');
    for (const x of ev.sca.findings) lines.push(`| ${cell(x.id)} | ${cell(x.cves.join(', ') || '—')} | \`${cell(x.package)}\` | ${cell(x.severity)} | ${cell(x.fixedIn)} | ${x.blocking ? '❌ blocking' : x.waivedBy ? `waived (${cell(x.waivedBy)})` : 'below threshold'} |`);
  }
  if (ev.bobReview.included) {
    lines.push('', '## Bob findings (advisory)', '', `Imported ${ev.bobReview.imported} finding(s) into SonarQube as external issues of engine "IBM Bob (advisory review)"; they count toward the gate only through SonarQube.`);
    if (ev.bobReview.leads.length) {
      lines.push('', '**CVE leads from Bob** — counted only if the SCA provider confirms them:', '', '| Claimed | Confirmed by SCA | Bob said |', '|---|---|---|');
      for (const l of ev.bobReview.leads) lines.push(`| ${cell(l.id)} | ${l.confirmedBySca === true ? '✅ yes' : l.confirmedBySca === false ? '⬜ no — not counted' : cell(l.confirmedBySca)} | ${cell(l.text)} |`);
    }
  }
  lines.push('', '## Next step', '', ev.result === 'PASS'
    ? `Promotion to testing is unblocked: 🔍 Spec Verifier → \`/sdd-verify ${ev.feature}\`.`
    : `Blocked. 🏗️ Spec Builder → \`/sdd-implement ${ev.feature}\` to fix the findings above, then \`/sdd-scan ${ev.feature}\` again. A false positive or accepted risk is a human decision (SonarQube UI, or for a CVE: ${humanAction('waiver', '<CVE>')}).`);
  return lines.join('\n') + '\n';
}

const TRIAGE = '## Triage notes (🔐 Check Runner)';
if (f) {
  mkdirSync(join(ROOT, SCAN_DIR), { recursive: true });
  const mdPath = join(ROOT, SCAN_DIR, `${f.id}.md`);
  const previous = existsSync(mdPath) ? readFileSync(mdPath, 'utf8') : '';
  const kept = previous.includes(TRIAGE) ? previous.slice(previous.indexOf(TRIAGE)) : `${TRIAGE}\n\n_Check Runner: summarise what each blocking finding means for ${f.id} and which task fixes it. Never mark findings safe here — that is a human decision in SonarQube._\n`;
  writeFileSync(join(ROOT, SCAN_DIR, `${f.id}.json`), JSON.stringify(evidence, null, 2) + '\n');
  writeFileSync(mdPath, mdReport(evidence) + '\n' + kept);
  appendHistory({ event: 'scan', feature: f.id, result, gate: sonar.qualityGate, blockingCves: blocking.length, fingerprint: fpBefore.sha256, by: gitUser() });
} else {
  writeFileSync(join(SDD_WORK, 'ci-scan.json'), JSON.stringify(evidence, null, 2) + '\n');
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, mdReport(evidence));
}

console.log(`\n${result === 'PASS' ? '✅' : '❌'} ${label}: ${result}${reasons.length ? ' — ' + reasons.join('; ') : ''}`);
if (f) console.log(`   evidence: ${SCAN_DIR}/${f.id}.json · report: ${SCAN_DIR}/${f.id}.md`);
process.exit(result === 'PASS' ? 0 : 1);
