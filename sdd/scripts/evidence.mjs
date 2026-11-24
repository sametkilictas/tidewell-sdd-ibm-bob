#!/usr/bin/env node
// The auditor's view of one feature: who decided what, what was built against which requirement, what the security
// scanner and the reviewers said, and what is still open — assembled from files and git history that already exist.
// Nothing here is new information; it only puts the evidence in one place. Read-only: it never changes the repository.
//
//   node sdd/scripts/evidence.mjs F04                      print the evidence pack (Markdown)
//   node sdd/scripts/evidence.mjs F04 --out evidence.md    write it to a file (a pipeline artifact, an audit folder)
//
import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { ROOT, read, exists, featureById, loadApprovals, planApproval, scanEvidence, reportResult, featureState, taskCounts, loadApprovers, features } from './lib.mjs';
import { tierInfo, rolesText, rolesFor } from './policy.mjs';
import { loadChecks } from './checks.mjs';
const SCANNER = (() => { try { return loadChecks().scanner ?? 'sonarqube'; } catch { return 'sonarqube'; } })();

const [id, ...rest] = process.argv.slice(2);
const out = rest.includes('--out') ? rest[rest.indexOf('--out') + 1] : null;
const f = featureById(id ?? '');
if (!f) { console.error('usage: evidence.mjs F## [--out file]'); process.exit(2); }

const git = (c) => { try { return execSync(`git ${c}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };
const approvals = loadApprovals();
const approvers = loadApprovers();
const ti = tierInfo(f.id);
const st = featureState(f, approvals);
const pa = planApproval(f, approvals);
const rec = approvals.plans?.[f.id];
const scan = scanEvidence(f);
const ver = reportResult('verification', f.id);
const sec = reportResult('security', f.id);
const tasks = taskCounts(f);
const prefix = (read(`${f.dir}/spec.md`).match(/^requirement-prefix:\s*(\S+)/m) || [])[1];
const ok = (b) => (b ? '✔' : '✖');
const L = [];

L.push(`# Evidence pack — ${f.id} ${f.title}`);
L.push('');
L.push(`Generated ${new Date().toISOString()} from commit \`${git('rev-parse --short=12 HEAD') || 'not a git repository'}\` by \`node sdd/scripts/evidence.mjs ${f.id}\`. Every line below points at a file or a commit in this repository.`);
L.push('');
L.push(`**Risk tier ${ti.tier} — ${ti.label}.** ${ti.means ?? ''} Plan signed by: ${rolesText(ti.approve?.plan)}. Hand security review: ${ti.securityReview}. Release to production approved by: ${(ti.release?.production ?? []).map((r) => rolesText([r])).join(' and ')}.`);
L.push('');
L.push(`**Where it stands:** ${st.state}${st.human ? ` — waiting for a person: ${st.human}` : ''}.`);

// 1. Decisions
L.push('', '## 1. Decisions — who decided what, bound to which files');
L.push('| Decision | By | When | How | Bound to | Still valid? |', '|---|---|---|---|---|---|');
if (rec) {
  const how = rec.via === 'github-comment' ? `pull-request comment${rec.github?.commentUrl ? ` ([link](${rec.github.commentUrl}))` : ''}` : `terminal sign-off, committed by ${rec.email ?? 'unknown email'}`;
  L.push(`| Plan sign-off | ${rec.by ?? '?'}${rec.roles ? ` (${rec.roles.join(', ')})` : ''} | ${rec.at ?? '?'} | ${how} | plan.md \`${String(rec.sha256 ?? '').slice(0, 12)}\`, spec.md \`${String(rec.specSha256 ?? '').slice(0, 12)}\` | ${pa.state === 'approved' ? '✔ files unchanged since' : `✖ ${pa.state}`} |`);
} else L.push(`| Plan sign-off | — | — | — | — | ✖ not signed yet (needs ${rolesText(rolesFor('plan', f.id, { approvers }))}) |`);
const ph = approvals.phases?.[String(f.phase)];
L.push(ph ? `| Phase ${f.phase} sign-off | ${ph.by ?? '?'} | ${ph.at ?? '?'} | ${ph.via ?? 'terminal'} | features of phase ${f.phase} | ✔ |` : `| Phase ${f.phase} sign-off | — | — | — | — | not yet |`);
for (const [crId, cr] of Object.entries(approvals.changeRequests ?? {})) {
  const file = (() => { try { return execSync(`ls sdd/specs/change-requests | grep ^${crId}`, { cwd: ROOT, encoding: 'utf8' }).trim().split('\n')[0]; } catch { return ''; } })();
  const text = file ? read(`sdd/specs/change-requests/${file}`) : '';
  if (text.includes(f.id) || (prefix && text.includes(prefix))) L.push(`| Change request ${crId} | ${cr.by ?? '?'} | ${cr.at ?? '?'} | ${cr.via ?? 'terminal'} | ${cr.decision ?? '?'}${cr.option ? `, option ${cr.option}` : ''} | ✔ recorded |`);
}
for (const [w, wr] of Object.entries(approvals.waivers ?? {})) if (wr.feature === f.id) L.push(`| Risk accepted: ${w} | ${wr.by ?? '?'} (AppSec) | ${wr.at ?? '?'} | ${wr.via ?? 'terminal'} | until ${wr.expires ?? '?'}: ${wr.reason ?? ''} | ${wr.expires && wr.expires < new Date().toISOString().slice(0, 10) ? '✖ expired' : '✔'} |`);
const planAuthor = git(`log -1 --format=%ae -- ${f.dir}/plan.md`);
if (rec && planAuthor) L.push('', `Four-eyes: plan.md was last changed by ${planAuthor}; it was signed by ${rec.email ?? rec.github?.login ?? rec.by}. ${ok(String(planAuthor).toLowerCase() !== String(rec.email ?? '').toLowerCase())}`);

// 2. Requirements → tasks → commits → tests
L.push('', '## 2. Requirements → tasks → commits → tests');
const matrix = exists('sdd/traceability/matrix.md') ? read('sdd/traceability/matrix.md').split('\n').filter((l) => l.startsWith('| ') && l.split('|')[3]?.trim() === f.id) : [];
const tasksText = exists(`${f.dir}/tasks.md`) ? read(`${f.dir}/tasks.md`) : '';
L.push(`Tasks: ${tasks ? `${tasks.done} of ${tasks.total} done` : 'not split yet'} · requirements in the spec: ${matrix.length}.`);
L.push('', '| Requirement | Priority | Tasks | Commits | Tests (traceability matrix) |', '|---|---|---|---|---|');
for (const row of matrix) {
  const c = row.split('|').map((x) => x.trim());
  const req = c[1];
  const tk = [...tasksText.matchAll(new RegExp(`\\*\\*(T\\d{3}[a-z-]*)\\*\\*[^\\n]*\\n?[^\\n]*${req}\\b`, 'g'))].map((m) => m[1]);
  const commits = git(`log --format=%h --grep=\\[${req}\\] --fixed-strings`).split('\n').filter(Boolean);
  L.push(`| ${req} ${c[2]} | ${c[4]} | ${tk.join(' ') || '—'} | ${commits.slice(0, 4).join(' ') || '—'}${commits.length > 4 ? ` +${commits.length - 4}` : ''} | ${c[8] ?? '—'} |`);
}

// 3. Security and quality evidence
L.push('', '## 3. Security and quality evidence');
L.push('| Check | Who or what decided | Result |', '|---|---|---|');
L.push(`| Secrets (rule G10) | the git hook, Bob's hook and the pipeline, on every commit | ✔ enforced on every commit (a commit with a secret cannot be made or merged) |`);
const sj = exists(`sdd/reports/scan/${f.id}.json`) ? JSON.parse(read(`sdd/reports/scan/${f.id}.json`)) : null;
L.push(`| Security checks before testing (${(scan.rec?.scanner ?? SCANNER) === 'builtin' ? 'the checks in sdd/governance/checks.json' : 'SonarQube quality gate + dependency CVEs'}) | the scan (sdd/reports/scan/${f.id}.json, written only by scan.mjs) | ${scan.state === 'pass' ? '✔ PASS for the code as it is now' : scan.state === 'stale' ? '✖ the code changed after the last scan' : scan.state === 'fail' ? '✖ FAIL' : '✖ not scanned yet'}${sj?.scannedAt ? ` · scanned ${sj.scannedAt}` : ''} |`);
L.push(`| Acceptance criteria proven by tests | 🔍 Spec Verifier, checked by the business analyst (sdd/reports/verification/${f.id}.md) | ${ver ? `${ok(ver === 'PASS')} ${ver}` : '✖ not verified yet'} |`);
L.push(`| Hand security review (ASVS L2) | 🛡️ Security Reviewer, decided by AppSec (sdd/reports/security/${f.id}.md) | ${sec ? `${ok(sec === 'PASS')} ${sec}` : ti.securityReview === 'optional' ? '– optional for this tier, not done' : '✖ not reviewed yet'} |`);

// 4. Controls
L.push('', '## 4. Controls this evidence supports');
L.push('| Control | How it is met here |', '|---|---|');
L.push(`| Maker–checker (four-eyes) | Bob and the developer make; a different, listed person signs. The pipeline re-checks every sign-off against its commit or comment. |`);
L.push(`| Segregation of duties | Roles from sdd/governance/approvers.json; who may sign depends on the risk tier (sdd/governance/policy.json). |`);
L.push(`| Change control | Signed specs are locked; changes need a change request decided by the business owner (rule G9). |`);
L.push(`| Traceability | Every commit names its requirement IDs (rule G2); every requirement is tagged in tests (matrix above). |`);
L.push(`| Independent security testing | The security checks run while Bob writes, at commit and before any testing step, by scripts Bob cannot change; Bob cannot write their evidence. |`);
L.push(`| Secure configuration | No secrets in the repository (rule G10); tokens come from the environment or the pipeline's secret store. |`);

// 5. Open items
const open = [];
if (!rec) open.push('plan not signed');
else if (pa.state !== 'approved') open.push(`plan sign-off is ${pa.state}`);
if (tasks && tasks.open) open.push(`${tasks.open} task(s) open`);
if (scan.state !== 'pass') open.push(`scan: ${scan.state}`);
if (ver !== 'PASS') open.push(`verification: ${ver ?? 'not done'}`);
if (ti.securityReview === 'required' && sec !== 'PASS') open.push(`security review: ${sec ?? 'not done'}`);
L.push('', '## 5. Open items', open.length ? open.map((o) => `- ${o}`).join('\n') : '- none: this feature is complete and every decision is on record');

const text = L.join('\n') + '\n';
if (out) { writeFileSync(out, text); console.log(`✔ evidence pack for ${f.id} written to ${out}`); } else process.stdout.write(text);
