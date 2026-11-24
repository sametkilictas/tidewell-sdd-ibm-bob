// Shared SDD workflow engine: derives project state from files, checks human approvals,
// and defines which paths each SDD step may write. Zero dependencies (Node >= 20).
//
// Single sources of truth:
//   - feature phase/priority ........ sdd/specs/features/F##-*/spec.md front matter
//   - plan / tasks / reports ......... files on disk
//   - the workflows .................. sdd/workflows/*.json (steps: ai | deterministic | human-gate)
//   - who signs what, and where ...... sdd/governance/approvers.json (GitHub comment or terminal)
//   - human approvals ................ sdd/state/approvals.json (written ONLY by sdd/scripts/approve.mjs in a
//                                       human's terminal, or by sdd/scripts/github/signoff.mjs from a verified
//                                       pull-request comment; bound to file hashes — a plan approval binds
//                                       BOTH plan.md and the feature's spec.md)
//   - active step (local) ............ sdd/state/active-step.json (written ONLY by sdd/scripts/step.mjs)
//   - external scan evidence ......... sdd/reports/scan/F##.json (written ONLY by sdd/scripts/scan.mjs; bound to
//                                       a fingerprint of the production code it scanned)

import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { join, resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execSync, execFileSync } from 'node:child_process';
import { rolesFor, rolesText, securityReviewRequired, tierInfo, bobAutonomy } from './policy.mjs';

// SDD_ROOT lets a trusted copy of these scripts read another checkout (GitHub sign-off jobs run the
// default branch's scripts against the pull request's files without executing anything from it).
export const ROOT = process.env.SDD_ROOT ? resolve(process.env.SDD_ROOT) : resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const SDD_DIR = join(ROOT, 'sdd/state');
export const APPROVALS = join(SDD_DIR, 'approvals.json');
export const ACTIVE = join(SDD_DIR, 'active-step.json');
export const HISTORY = join(SDD_DIR, 'history.jsonl');
export const LAST_PHASE = 7;

// ------------------------------------------------------------------ modes & steps
export const MODES = {
  // Bob V2's built-in modes (agent, plan, ask), overridden in .bob/custom_modes.yaml to read and route only
  agent: { name: '🧭 SDD Navigator', writes: false },
  plan: { name: '🗺️ Plan (router)', writes: false },
  ask: { name: '❓ Ask', writes: false },
  'sdd-conductor': { name: '🎼 SDD Conductor', writes: false },
  'spec-architect': { name: '📐 Spec Architect', writes: true },
  'spec-builder': { name: '🏗️ Spec Builder', writes: true },
  'check-runner': { name: '🔐 Check Runner', writes: true },
  'spec-verifier': { name: '🔍 Spec Verifier', writes: true },
  'security-reviewer': { name: '🛡️ Security Reviewer', writes: true },
  'sdd-pr-reviewer': { name: '🔎 SDD PR Reviewer', writes: false },
};

// Steps come from the workflow definitions (sdd/workflows/*.json): every ai/deterministic step that runs in
// one SDD mode through a slash command is a step.mjs step. Human gates are not steps: nobody "starts" them.
export const WORKFLOW_DIR = 'sdd/workflows';
export function loadWorkflow(id) {
  return JSON.parse(readFileSync(join(ROOT, WORKFLOW_DIR, `${id}.json`), 'utf8'));
}
export function workflows() {
  const dir = join(ROOT, WORKFLOW_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((n) => n.endsWith('.json')).sort().map((n) => loadWorkflow(n.slice(0, -5)));
}
function deriveSteps() {
  const steps = {};
  for (const id of ['feature-delivery', 'change-request']) {
    let wf;
    try { wf = loadWorkflow(id); } catch { continue; }
    for (const st of wf.steps) {
      if (st.kind === 'human-gate' || !st.mode || st.mode === 'any' || !st.command) continue;
      steps[st.id] = { mode: st.mode, command: st.command, target: wf.target, kind: st.kind, title: st.title, workflow: wf.id };
    }
  }
  return steps;
}
export const STEPS = deriveSteps();

// ------------------------------------------------------------------ helpers
export const posix = (p) => p.split(sep).join('/');
export const rel = (p) => posix(relative(ROOT, resolve(ROOT, p)));
export const read = (p) => readFileSync(join(ROOT, p), 'utf8');
export const exists = (p) => existsSync(join(ROOT, p));
export const sha256 = (text) => createHash('sha256').update(text.replace(/\r\n/g, '\n')).digest('hex');
export const fileHash = (p) => (exists(p) ? sha256(read(p)) : null);

export function frontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  const fm = {};
  if (!m) return fm;
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/\s+#.*$/, '').trim();
  }
  return fm;
}

export function gitUser() {
  try { return execSync('git config user.name', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); }
  catch { return 'unknown'; }
}

export function loadJson(path, fallback) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}
export function saveJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}
export function appendHistory(entry) {
  mkdirSync(SDD_DIR, { recursive: true });
  appendFileSync(HISTORY, JSON.stringify({ at: new Date().toISOString(), ...entry }) + '\n');
}

export function loadApprovals() {
  const a = loadJson(APPROVALS, { version: 1, plans: {}, phases: {}, changeRequests: {} });
  a.waivers ??= {};
  return a;
}
export function loadActive() {
  const a = loadJson(ACTIVE, null);
  return a && a.step ? a : null;
}

// ------------------------------------------------------------------ sign-off channel
export const APPROVERS = 'sdd/governance/approvers.json';
export function loadApprovers(path = join(ROOT, APPROVERS)) {
  return loadJson(path, { approvalChannel: 'terminal', people: {}, decisions: {}, rules: {}, bob: {} });
}
export const approvalChannel = (approvers = loadApprovers()) => (['github', 'terminal', 'both'].includes(approvers.approvalChannel) ? approvers.approvalChannel : 'terminal');

// How a person gives a sign-off in this repository: a pull-request comment, a terminal command, or either.
const SIGNOFF = {
  plan: { github: (t) => `/approve-plan ${t}`, terminal: (t) => `node sdd/scripts/approve.mjs plan ${t}` },
  phase: { github: (t) => `/approve-phase ${t}`, terminal: (t) => `node sdd/scripts/approve.mjs phase ${t}` },
  cr: { github: (t) => `/approve-cr ${t} option A (or /reject-cr ${t} <reason>)`, terminal: (t) => `node sdd/scripts/approve.mjs cr ${t} --decision approved|rejected --option A` },
  waiver: { github: (t) => `/accept-risk ${t} F## until YYYY-MM-DD because <reason>`, terminal: (t) => `node sdd/scripts/approve.mjs waiver ${t} --feature F## --reason "…" --expires YYYY-MM-DD` },
};
export function humanAction(decision, target, channel = approvalChannel()) {
  const d = SIGNOFF[decision];
  if (!d) return `a human decides ${decision} ${target}`;
  const phaseFeatures = decision === 'phase' ? features().filter((f) => String(f.phase) === String(target)).map((f) => f.id) : [];
  const who = rolesText(rolesFor(decision, target, { approvers: loadApprovers(), phaseFeatures }));
  const gh = `${who} comments "${d.github(target)}" on the pull request`;
  const term = `${who} runs: ${d.terminal(target)}`;
  return channel === 'github' ? gh : channel === 'terminal' ? term : `${gh} (or ${d.terminal(target)} in a terminal)`;
}

// ------------------------------------------------------------------ features
export function features() {
  const dir = join(ROOT, 'sdd/specs/features');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((d) => /^F\d{2}-/.test(d) && existsSync(join(dir, d, 'spec.md')))
    .sort()
    .map((d) => {
      const base = `sdd/specs/features/${d}`;
      const fm = frontMatter(read(`${base}/spec.md`));
      return { id: d.slice(0, 3), dir: base, phase: Number(fm.phase ?? 99), priority: fm.priority ?? '', title: fm.title ?? d };
    });
}
export const featureById = (id) => features().find((f) => f.id === id);

export function taskCounts(f) {
  const p = `${f.dir}/tasks.md`;
  if (!exists(p)) return null;
  const t = read(p);
  const open = (t.match(/^\s*- \[ \]/gm) || []).length;
  const done = (t.match(/^\s*- \[[xX]\]/gm) || []).length;
  return { open, done, total: open + done };
}

export function reportResult(kind, id) {
  const p = `sdd/reports/${kind}/${id}.md`;
  if (!exists(p)) return null;
  const r = frontMatter(read(p)).result || '';
  return r.includes('|') ? null : r; // template placeholder "PASS | FAIL" is not a result
}

// ------------------------------------------------------------------ external scan evidence
// Production code = what the security scan (built-in checks or SonarQube) must have seen before a feature is promoted to testing.
// Tests are excluded so that adding tests during /sdd-verify does not invalidate the scan.
export const SCAN_DIR = 'sdd/reports/scan';
export const PROD_CODE = /^(apps|packages|infra|prisma)\/|^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig[^/]*\.json|\.nvmrc|Dockerfile[^/]*|docker-compose[^/]*\.ya?ml)$/;
export const TEST_FILE = /(^|\/)(e2e|perf)\/|\.(test|spec|int\.test)\.(t|j)sx?$|(^|\/)test\/(factories|helpers|fixtures)\//;
export const isScannedCode = (p) => PROD_CODE.test(p) && !TEST_FILE.test(p);

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.scannerwork', '.next', '.turbo']);
function walkFiles(dir = ROOT, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(name.name)) continue;
    const p = join(dir, name.name);
    if (name.isDirectory()) walkFiles(p, out);
    else if (name.isFile()) out.push(posix(relative(ROOT, p)));
  }
  return out;
}
const gitBlob = (buf) => createHash('sha1').update(`blob ${buf.length}\0`).update(buf).digest('hex');

// Fingerprint = SHA-256 over (path, git blob id) of every production file, committed or not.
// Uses git's own blob ids (so a scanned working tree and the same tree once committed match);
// falls back to computing blob ids in-process when git is unavailable.
let fpCache = null;
export function codeFingerprint({ fresh = false } = {}) {
  if (fpCache && !fresh) return fpCache;
  const run = (args, input) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', input, stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 });
  let entries;
  try {
    const staged = new Map(run(['ls-files', '-s']).split('\n').filter(Boolean).map((l) => {
      const m = l.match(/^\d+ ([0-9a-f]+) \d\t(.+)$/); return m ? [m[2], m[1]] : null;
    }).filter(Boolean));
    const dirty = new Set(run(['ls-files', '-m', '-o', '--exclude-standard']).split('\n').filter(Boolean));
    const files = [...new Set([...staged.keys(), ...dirty])].filter((p) => isScannedCode(p) && exists(p)).sort();
    const toHash = files.filter((p) => dirty.has(p) || !staged.has(p));
    const hashed = toHash.length ? run(['hash-object', '--stdin-paths'], toHash.join('\n') + '\n').split('\n').filter(Boolean) : [];
    const h = new Map(toHash.map((p, i) => [p, hashed[i]]));
    entries = files.map((p) => [p, h.get(p) ?? staged.get(p)]);
  } catch {
    entries = walkFiles().filter(isScannedCode).sort().map((p) => [p, gitBlob(readFileSync(join(ROOT, p)))]);
  }
  const digest = createHash('sha256');
  for (const [p, id] of entries) digest.update(`${p}\0${id}\n`);
  fpCache = { sha256: digest.digest('hex'), files: entries.length };
  return fpCache;
}

// State of a feature's scan evidence: missing | invalid | fail | stale | pass.
// "stale" means production code changed since the scan (whatever its result), so re-scan.
export function scanEvidence(f) {
  const p = `${SCAN_DIR}/${f.id}.json`;
  if (!exists(p)) return { state: 'missing' };
  let rec;
  try { rec = JSON.parse(read(p)); } catch { return { state: 'invalid' }; }
  if (rec.feature !== f.id || !['PASS', 'FAIL'].includes(rec.result) || !/^[0-9a-f]{64}$/.test(rec.codeFingerprint ?? '') || rec.producer !== 'sdd/scripts/scan.mjs') {
    return { state: 'invalid', rec };
  }
  if (rec.codeFingerprint !== codeFingerprint().sha256) return { state: 'stale', rec };
  return { state: rec.result === 'PASS' ? 'pass' : 'fail', rec };
}

// Spec lock: an approval covers the plan AND the requirements it was approved against.
//   approved   — plan.md and spec.md both match the hashes a human approved
//   stale      — plan.md changed after approval
//   spec-stale — spec.md changed after approval (requirements moved under an approved plan)
export function planApproval(f, approvals = loadApprovals()) {
  const rec = approvals.plans?.[f.id];
  const p = `${f.dir}/plan.md`;
  if (!exists(p)) return { state: 'missing' };
  if (!rec) return { state: 'unapproved' };
  if (rec.sha256 !== fileHash(p)) return { state: 'stale', rec };
  if (rec.specSha256 !== fileHash(`${f.dir}/spec.md`)) return { state: 'spec-stale', rec };
  return { state: 'approved', rec };
}

// Which ids a change request's "affects" may use to name a file (path, front-matter id, F##, ADR-####, …).
export function specIdsFor(p) {
  const ids = [p.toLowerCase()];
  if (/\.md$/.test(p) && exists(p)) { const id = frontMatter(read(p)).id; if (id) ids.push(id.toLowerCase()); }
  const feat = p.match(/^sdd\/specs\/features\/(F\d{2})-/); if (feat) ids.push(feat[1].toLowerCase());
  const adr = p.match(/^sdd\/adr\/(\d{4})-/); if (adr) ids.push(`adr-${adr[1]}`);
  if (/^sdd\/contracts\//.test(p)) ids.push('contract');
  if (/^sdd\/design\//.test(p)) ids.push('design');
  if (p === 'sdd/specs/00-constitution.md') ids.push('constitution');
  return ids;
}
export const crCovers = (affects, p) => { const a = String(affects ?? '').toLowerCase(); return specIdsFor(p).some((id) => a.includes(id)); };

export function lockMessage(f, pa, what) {
  if (pa.state === 'spec-stale') {
    return `${f.id}'s spec.md changed after its plan was approved (by ${pa.rec?.by ?? '?'}), so ${what} would follow requirements nobody approved. ` +
      `Changes to an approved spec go through a change request (/sdd-change-request → the business owner decides it → 📐 /sdd-apply-cr); ` +
      `then the plan is signed again: ${humanAction('plan', f.id)}.`;
  }
  if (pa.state === 'stale') return `${f.id}'s plan.md changed after it was approved. A human reviews the diff and signs it again: ${humanAction('plan', f.id)}.`;
  return `${f.id}'s plan is ${pa.state}; ${what} needs an approved plan. A human signs it: ${humanAction('plan', f.id)}.`;
}

export function currentPhase(approvals = loadApprovals()) {
  for (let n = 0; n <= LAST_PHASE; n++) if (!approvals.phases?.[String(n)]) return n;
  return LAST_PHASE + 1; // all gates approved
}

// Derive one feature's position in the per-feature loop.
export function featureState(f, approvals = loadApprovals()) {
  const plan = planApproval(f, approvals);
  const tasks = taskCounts(f);
  const ver = reportResult('verification', f.id);
  const sec = reportResult('security', f.id);
  if (plan.state === 'missing') return { state: 'needs-plan', next: 'plan', hint: 'clarify first if the spec has open questions' };
  if (plan.state === 'unapproved') return { state: 'awaiting-plan-approval', next: null, gate: 'approve-plan', human: humanAction('plan', f.id) };
  if (plan.state === 'stale') return { state: 'plan-changed-after-approval', next: null, gate: 'approve-plan', human: `review the plan diff, then ${humanAction('plan', f.id)}` };
  if (plan.state === 'spec-stale') return { state: 'spec-changed-after-approval', next: null, gate: 'approve-plan', human: `spec.md changed under an approved plan: it needs an approved change request, then ${humanAction('plan', f.id)}` };
  if (!tasks) return { state: 'needs-tasks', next: 'tasks' };
  if (tasks.open > 0) return { state: `implementing (${tasks.done}/${tasks.total})`, next: 'implement' };
  const scan = scanEvidence(f);
  if (scan.state === 'fail') return { state: 'scan-failed', next: 'implement', hint: `fix the findings in sdd/reports/scan/${f.id}.md, then re-scan; a false positive is a human decision (AppSec)` };
  if (scan.state === 'stale') return { state: 'scan-stale', next: 'scan', hint: 'production code changed after the last scan' };
  if (scan.state !== 'pass') return { state: scan.state === 'invalid' ? 'scan-evidence-invalid' : 'needs-scan', next: 'scan' };
  if (!ver || ver === 'FAIL') return { state: ver === 'FAIL' ? 'verification-failed' : 'needs-verify', next: ver === 'FAIL' ? 'implement' : 'verify' };
  if (sec === 'FAIL') return { state: 'security-failed', next: 'implement' };
  if (!sec && securityReviewRequired(f.id)) return { state: 'needs-secure', next: 'secure' };
  if (!sec) return { state: 'done', next: null, hint: `hand security review is optional for tier ${tierInfo(f.id).tier} features (sdd/governance/policy.json); run /sdd-secure ${f.id} anyway if in doubt` };
  return { state: 'done', next: null };
}

export function projectState() {
  const approvals = loadApprovals();
  const phase = currentPhase(approvals);
  const all = features().map((f) => ({ ...f, ...featureState(f, approvals) }));
  return { phase, approvals, features: all, active: loadActive(), inPhase: all.filter((f) => f.phase === phase) };
}

// ------------------------------------------------------------------ step preconditions
export function checkStart(step, target, mode, approvals = loadApprovals()) {
  const def = STEPS[step];
  if (!def) return fail(`Unknown step "${step}". Valid: ${Object.keys(STEPS).join(', ')}.`);
  if (mode !== def.mode) {
    return fail(`Step "${step}" must run in ${MODES[def.mode].name} (${def.mode}), but this mode is ${MODES[mode]?.name ?? mode}. ` +
      `Switch to ${MODES[def.mode].name} and run ${def.command} ${target ?? ''}.`);
  }
  const phase = currentPhase(approvals);
  if (def.target === 'cr') {
    const cr = approvals.changeRequests?.[target];
    if (!cr || cr.decision !== 'APPROVED') return fail(`${target} has no human approval. The ${humanAction('cr', target)}.`);
    return ok();
  }
  const f = featureById(target);
  if (!f) return fail(`Unknown feature "${target}". Use an ID like F04.`);
  const planning = ['clarify', 'plan', 'tasks'].includes(step);
  if (planning && f.phase > phase + 1) return fail(`${f.id} belongs to phase ${f.phase}; the current phase is ${phase}. Planning is allowed at most one phase ahead.`);
  if (!planning && f.phase > phase) return fail(`${f.id} belongs to phase ${f.phase}; the current phase is ${phase}. Finish and approve phase ${phase} first (see /sdd-status).`);
  const st = featureState(f, approvals);
  const pa = planApproval(f, approvals);
  const rec = approvals.plans?.[f.id];
  // Once a human has approved a plan, the feature's spec and plan are locked: changes go through a CR.
  if ((step === 'clarify' || step === 'plan') && rec) {
    return fail(`${f.id}'s plan was approved by ${rec.by}; its spec and plan are now locked. Behaviour changes go through a change request: ` +
      `/sdd-change-request <slug> → the business owner decides it → 📐 /sdd-apply-cr. (A human can also withdraw the approval: ${approvalChannel() === 'terminal' ? `approve.mjs revoke plan ${f.id}` : `comment "/revoke plan ${f.id}"`}.)`);
  }
  const WHAT = { tasks: 'breaking it into tasks', implement: 'implementation', scan: 'scanning', verify: 'verification', secure: 'the security review' };
  if (WHAT[step] && pa.state !== 'approved') return fail(lockMessage(f, pa, WHAT[step]));
  switch (step) {
    case 'clarify':
    case 'plan':
    case 'tasks':
      return ok();
    case 'implement':
      if (!taskCounts(f)) return fail(`${f.id} has no tasks.md yet. Next: 📐 Spec Architect → /sdd-tasks ${f.id}.`);
      return ok();
    case 'scan': {
      const t = taskCounts(f);
      if (!t) return fail(`${f.id} has no tasks.md; nothing to scan yet.`);
      if (t.open > 0) return fail(`${f.id} still has ${t.open} open task(s). Scan runs on finished code. Next: 🏗️ Spec Builder → /sdd-implement ${f.id}.`);
      return ok();
    }
    case 'verify': {
      const t = taskCounts(f);
      if (!t) return fail(`${f.id} has no tasks.md; nothing to verify yet.`);
      if (t.open > 0) return fail(`${f.id} still has ${t.open} open task(s). Next: 🏗️ Spec Builder → /sdd-implement ${f.id}.`);
      const sc = scanEvidence(f);
      if (sc.state !== 'pass') return fail(scanGateMessage(f, sc, 'verification (promotion to testing)'));
      return ok();
    }
    case 'secure': {
      const v = reportResult('verification', f.id);
      if (!v || v === 'FAIL') return fail(`${f.id} needs a passing verification report first. Next: 🔍 Spec Verifier → /sdd-verify ${f.id}.`);
      const sc = scanEvidence(f);
      if (sc.state !== 'pass') return fail(scanGateMessage(f, sc, 'the security review'));
      return ok();
    }
    default:
      return ok(st);
  }
}

export function scanGateMessage(f, sc, what) {
  const why = {
    missing: `has not been scanned yet`,
    invalid: `has scan evidence that was not produced by sdd/scripts/scan.mjs`,
    stale: `changed after its last scan (${sc.rec?.scannedAt ?? '?'})`,
    fail: sc.rec?.scanner === 'builtin' ? `failed its last scan (${(sc.rec.reasons ?? []).join('; ') || 'blocking findings'})` : `failed its last external scan (SonarQube quality gate ${sc.rec?.sonar?.qualityGate ?? '?'}, ${sc.rec?.sca?.blocking ?? 0} blocking dependency CVE(s))`,
  }[sc.state] ?? 'has no passing scan';
  const next = sc.state === 'fail'
    ? `Next: 🏗️ Spec Builder → /sdd-implement ${f.id} to fix sdd/reports/scan/${f.id}.md findings, then 🔐 Check Runner → /sdd-scan ${f.id}.`
    : `Next: 🔐 Check Runner → /sdd-scan ${f.id}.`;
  return `${f.id} ${why}. Scan evidence is required before ${what} (Article XI, NFR-SEC-042). ${next}`;
}

// ------------------------------------------------------------------ write policy
// Paths nobody may change through Bob's tools (humans change them via reviewed PRs).
const ALWAYS_PROTECTED = [
  /^sdd\/state\//, /^\.bob\//, /^sdd\/scripts\//, /^sdd\/(governance|workflows)\//,
  // Everything GitHub reads (workflows, actions, CODEOWNERS, templates) except the app's own CI built in F00.
  /^\.github\/(?!workflows\/ci\.yml$)/,
  /^sdd\/docs\/enterprise-policy/,
  // External scan: evidence is machine-written; the analysis scope and gate config change only via human PRs.
  /^sdd\/reports\/scan\/[^/]+\.json$/, /^sonar-project\.properties$/,
];
// Paths any writing mode may touch at any time (raising a change request is always allowed).
const ALWAYS_ALLOWED = [/^sdd\/specs\/change-requests\/CR-\d{3}-[a-z0-9-]+\.md$/, /^sdd\/specs\/change-requests\/README\.md$/, /^sdd\/reports\/verification\/demo\//];

const SPEC_AREA = /^sdd\/(specs|contracts|adr|design)\//;

export function checkWrite(path, active = loadActive(), approvals = loadApprovals()) {
  const p = rel(path);
  if (p.startsWith('..')) return fail(`Writes outside the repository are not allowed (${p}).`);
  if (/^sdd\/reports\/scan\/[^/]+\.json$/.test(p)) return fail(`${p} is external scan evidence. Only sdd/scripts/scan.mjs writes it (run /sdd-scan in 🔐 Check Runner); hand-written evidence is ignored.`);
  if (p === 'sonar-project.properties') return fail('sonar-project.properties defines what SonarQube analyses. Only humans change it, via a pull request reviewed by the security CODEOWNERS.');
  if (ALWAYS_PROTECTED.some((r) => r.test(p))) return fail(`${p} is governance-protected (SDD state, Bob config, guard scripts). Only humans change it, via a reviewed pull request.`);
  if (ALWAYS_ALLOWED.some((r) => r.test(p))) return ok();
  if (!active) return fail(`No SDD step is active, so writes are blocked. Ask: "what's next?" (🧭 SDD Navigator) or run /sdd-status. Every change starts with a step command such as /sdd-implement F04.`);
  const { step, target } = active;
  const f = step === 'apply-cr' ? null : featureById(target);
  const fdir = f?.dir;
  const deny = (why) => fail(`Active step is "${step}" for ${target} (${MODES[active.mode]?.name ?? active.mode}). ${why}`);
  if (p === 'sdd/specs/00-constitution.md') {
    if (step === 'apply-cr' && /constitution/i.test(approvals.changeRequests?.[target]?.affects ?? '')) return ok();
    return deny('The constitution can only change through an approved change request that lists it under "affects".');
  }
  switch (step) {
    case 'clarify':
      return p === `${fdir}/spec.md` ? ok() : deny(`Clarify may only edit ${fdir}/spec.md (Clarifications log and wording).`);
    case 'plan':
      if (p === `${fdir}/plan.md` || p === `${fdir}/spec.md` || /^sdd\/(contracts|adr|design)\//.test(p)) return ok();
      return deny(`Plan may edit ${fdir}/plan.md, ${fdir}/spec.md, sdd/contracts/, sdd/adr/ and sdd/design/ only.`);
    case 'tasks':
      return p === `${fdir}/tasks.md` ? ok() : deny(`Tasks may only create/edit ${fdir}/tasks.md.`);
    case 'implement':
      if (p === `${fdir}/tasks.md`) return ok();
      if (p === 'sdd/adr/0001-typescript-monorepo.md' && target === 'F00') return ok();
      if (/^sdd\/traceability\//.test(p)) return ok();
      if (SPEC_AREA.test(p)) return deny(`Implementation cannot change specs, contracts, ADRs or design. If they are wrong, raise /sdd-change-request.`);
      if (/^sdd\/reports\//.test(p)) return deny('Reports are written by the verifier and security reviewer.');
      return ok();
    case 'scan':
      if (p === `sdd/reports/scan/${target}.md` || p === `sdd/reports/scan/${target}.bob.sarif`) return ok();
      return deny(`Check Runner may only write sdd/reports/scan/${target}.md (triage notes) and sdd/reports/scan/${target}.bob.sarif (optional Bob review). ` +
        `It never fixes code: findings go back to 🏗️ Spec Builder. Scan evidence (.json) is written only by sdd/scripts/scan.mjs.`);
    case 'verify':
      if (TEST_FILE.test(p) || /^sdd\/reports\/verification\//.test(p) || /^sdd\/traceability\//.test(p)) return ok();
      return deny('Verification may only add/fix tests and write sdd/reports/verification/ and sdd/traceability/. Production-code defects go back to the builder.');
    case 'secure':
      return /^sdd\/reports\/security\//.test(p) ? ok() : deny('Security review may only write sdd/reports/security/ (and change requests).');
    case 'apply-cr':
      if (SPEC_AREA.test(p)) return ok();
      return deny('Applying a change request may only edit sdd/specs/, sdd/contracts/, sdd/adr/ and sdd/design/.');
    default:
      return deny('Unknown step.');
  }
}

// ------------------------------------------------------------------ shell command policy (heuristic)
const PROTECTED_IN_SHELL = /(sdd\/state\/|\.bob\/|sdd\/scripts\/|sdd\/governance\/|sdd\/workflows\/|sdd\/specs\/00-constitution\.md|\.github\/(?!workflows\/ci\.yml)|sdd\/reports\/scan\/[^\s'"]*\.json|sonar-project\.properties)/;
// Sign-off commands a person types on a pull request. Bob must never post one, whatever account it can reach.
export const SIGNOFF_COMMAND = /(^|[\s"'`>])\/(approve-(plan|phase|cr)|reject-cr|accept-risk|revoke)\b/;
export function checkCommand(cmd) {
  const c = String(cmd);
  if (/(?:^|[\s\/\\'\"`])approve\.mjs\b/.test(c)) return fail('Approvals are human decisions. Bob must not run approve.mjs — ask the human to sign off (see the [SDD STATE] block for how).');
  if (/sdd[\/\\]scripts[\/\\](github[\/\\]|approvals-core\.mjs)/.test(c)) return fail('The GitHub sign-off and Bob-in-CI scripts run only inside GitHub Actions, never from Bob.');
  if (SIGNOFF_COMMAND.test(c)) return fail('Sign-offs (/approve-plan, /approve-phase, /approve-cr, /reject-cr, /accept-risk, /revoke) are typed by a person on the pull request. Bob never posts them.');
  if (/\bgh\s+(pr|issue)\s+(comment|review|merge)\b|\bgh\s+api\b[^|;&]*\/(comments|reviews|merge)\b/.test(c)) return fail('Bob does not comment on, review or merge pull requests from the IDE. A person does that on GitHub.');
  if (/--no-verify\b/.test(c)) return fail('Bypassing git hooks (--no-verify) is not allowed.');
  if (/\bgit\s+push\b/.test(c)) return fail('Bob never pushes. The human pushes after reviewing the phase.');
  if (/\bgit\s+(reset\s+--hard|rebase|filter-branch|config\s+core\.hooksPath)/.test(c)) return fail('History rewrites and hook reconfiguration are not allowed from Bob.');
  if (/\bgit\s+commit\b/.test(c) && /\bsdd\/(specs|contracts)\//.test(c) && /--amend/.test(c)) return fail('Amending spec commits is not allowed.');
  if (/(@sonar\/scan|sonar-scanner|sonarqube-scanner|sonar-scanner-npm)\b/.test(c) && !/sdd[\/\\]scripts[\/\\]scan\.mjs/.test(c)) {
    return fail('Run SonarQube only through node sdd/scripts/scan.mjs (/sdd-scan): it fixes the analysis scope and binds the evidence to the code it scanned.');
  }
  if (/sdd[\/\\]scripts[\/\\]scan\.mjs/.test(c) && /\s-D\s*sonar\./.test(c)) return fail('scan.mjs does not accept -Dsonar.* overrides; the scope lives in sonar-project.properties (human-owned).');
  const writesFile = /(>>?|\btee\b|\bsed\s+-i|\bperl\s+-pi|\bcp\b|\bmv\b|\brm\b|\btruncate\b|Set-Content|Out-File|writeFileSync)/.test(c);
  if (writesFile && PROTECTED_IN_SHELL.test(c) && !/sdd[\/\\]scripts[\/\\](step|state)\.mjs/.test(c)) {
    return fail('Shell commands may not modify SDD state, Bob config, guard scripts, the constitution or CODEOWNERS.');
  }
  return ok();
}

export function ok(extra) { return { ok: true, ...(extra ? { extra } : {}) }; }
export function fail(reason) { return { ok: false, reason }; }

// ------------------------------------------------------------------ concise context for prompts
export function contextBlock() {
  const s = projectState();
  const lines = [];
  lines.push(`[SDD STATE — injected by .bob/settings.json hook; trust this over memory]`);
  lines.push(`Current phase: ${s.phase > LAST_PHASE ? 'all phases approved' : s.phase} · workflow: feature-delivery (sdd/workflows/) · sign-offs: ${approvalChannel() === 'github' ? 'GitHub pull-request comments' : approvalChannel() === 'both' ? 'GitHub comments or terminal' : 'terminal (approve.mjs)'}`);
  if (s.active) {
    const exp = MODES[s.active.mode]?.name ?? s.active.mode;
    lines.push(`Active step: ${s.active.step} ${s.active.target}${s.active.task ? ' ' + s.active.task : ''} — expected mode: ${exp} (${s.active.mode}). Writes are limited to this step's scope.`);
  } else {
    lines.push('Active step: none — all file writes are blocked until a step command starts one.');
  }
  for (const f of s.inPhase) {
    const next = f.next ? `next: ${STEPS[f.next].command} ${f.id} in ${MODES[STEPS[f.next].mode].name}` : (f.human ? `waiting for HUMAN: ${f.human}` : 'done');
    const ti = tierInfo(f.id);
    lines.push(`- ${f.id} [tier ${ti.tier} ${ti.label}; Bob: ${ti.bobAutonomy === 'drive' ? 'may drive several steps' : 'one step at a time'}] ${f.state} → ${next}`);
  }
  if (s.inPhase.length && s.inPhase.every((f) => f.state === 'done') && s.phase <= LAST_PHASE) {
    lines.push(`Phase ${s.phase} features are done → HUMAN gate (workflow phase-gate): the business analyst runs the demo (/sdd-demo), then the ${humanAction('phase', s.phase)}`);
  }
  lines.push('Rule: if the user\'s request belongs to a different mode than yours, do not do it here — say which mode/command is right and offer to switch (rule 06).');
  return lines.join('\n');
}
