#!/usr/bin/env node
// Git/CI backstop for the SDD workflow — catches anything done outside Bob (manual edits,
// other tools, --no-verify) because CI re-checks every commit in the pull request.
//
//   node sdd/scripts/git-check.mjs --commit-msg .git/COMMIT_EDITMSG   (called by sdd/scripts/hooks/commit-msg)
//   node sdd/scripts/git-check.mjs --ci --base auto [--before <sha>]   (called by sdd-gates.yml and promote-to-test.yml)
//   node sdd/scripts/git-check.mjs --print-base [--before <sha>]       (prints the range start CI will use)
//
// Which commits CI checks (--base auto; see resolveBase):
//   pull request into B ........ every commit in origin/B..HEAD
//   push to any other branch ... every commit not yet on the default branch (origin/main..HEAD), so problems
//                                show up before anyone opens a pull request
//   push to the default branch . the commits that push added (<before>..HEAD; all history on the first push);
//                                a direct push that breaks the rules turns main red and promote-to-test
//                                refuses to deploy it
//
// Rules
//   G1  Conventional Commit header; scope F##, CR-###, SDD or a plain word.
//   G2  feat/fix commits touching code need a feature scope (F##) and at least one [REQ-ID] tag.
//   G3  Code changes require that feature's plan to be human-approved (hash-bound) and tasks.md to exist.
//   G4  A commit must not mix code with spec/contract/ADR/design changes (tasks.md ticks and CRs excepted).
//   G5  Constitution changes require an approved CR that lists the constitution in "affects".
//   G6  sdd/state/approvals.json must be committed alone (type chore, scope SDD). Whether each sign-off in it is
//       real is checked separately (sdd/scripts/github/verify-signoffs.mjs, CI stage "signoffs"): against the
//       commit that recorded it on the terminal path, or against its pull-request comment on the GitHub path.
//   G7  Governance files (.bob/, sdd/scripts/, sdd/governance/, sdd/workflows/, everything under .github/ except the
//       app's own workflows/ci.yml, sonar-project.properties) need scope SDD (and CODEOWNERS review in CI).
//   G8  No suppression of SonarQube findings in code (NOSONAR, sonar.issue.ignore) — Article XI.3.
//   G10 No secrets in what is committed (private keys, tokens, hard-coded passwords) — sdd/scripts/secrets.mjs.
//   G9  Approved scope is locked (Article I.4): a change to an approved feature's spec/plan, to a foundation
//       spec, NFR or template — or to sdd/contracts/, sdd/adr/, sdd/design/ outside the planning of a not-yet-approved
//       feature — must cite an approved change request ("spec(CR-004): …") whose "affects" lists the file.
//       Approvals are read as they stood BEFORE the commit (its parent), so planning-then-approving in one PR works.
//   The repository's initial import commit (no parent) is exempt.

import { execSync } from 'node:child_process';
import { readFileSync, appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { featureById, planApproval, taskCounts, loadApprovals, crCovers, humanAction, ROOT } from './lib.mjs';
import { scanAdded, describe, ADVICE } from './secrets.mjs';

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

const CODE = /^(apps|packages|e2e|infra|perf|prisma)\/|^(package\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|tsconfig[^/]*\.json|\.nvmrc|\.env\.example)$/;
const SPEC = /^sdd\/(specs|contracts|adr|design)\//;
const SPEC_EXEMPT = /^sdd\/specs\/features\/[^/]+\/tasks\.md$|^sdd\/specs\/change-requests\/|^sdd\/adr\/0001-typescript-monorepo\.md$/;
const GOVERNANCE = /^\.bob\/|^sdd\/scripts\/|^sdd\/(governance|workflows)\/|^\.github\/(?!workflows\/ci\.yml$)|^sonar-project\.properties$/;
const SUPPRESSION = /NOSONAR|sonar\.issue\.ignore/;

// Added lines of a unified diff (git diff -U0 / git show -U0) as { file, text }.
export function addedLines(diff) {
  const out = [];
  let file = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) { file = line.replace(/^\+\+\+ (b\/)?/, '').trim(); continue; }
    if (line.startsWith('+') && file && file !== '/dev/null') out.push({ file, text: line.slice(1) });
  }
  return out;
}
const HEADER = /^(feat|fix|test|docs|refactor|perf|build|ci|chore|spec|revert)(\(([A-Za-z0-9-]+)\))?!?: .{3,}/;

// G9: which spec-area files in this commit change approved scope without an approved CR covering them.
export function lockedSpecChanges(message, scope, files, approvals) {
  const crs = [...new Set(message.match(/CR-\d{3}/g) || [])].map((id) => approvals.changeRequests?.[id]).filter((r) => r?.decision === 'APPROVED');
  const planning = /^F\d{2}$/.test(scope ?? '') && !approvals.plans?.[scope];
  return files.filter((p) => SPEC.test(p) && !SPEC_EXEMPT.test(p) && p !== 'sdd/specs/00-constitution.md').filter((p) => {
    if (crs.some((r) => crCovers(r.affects, p))) return false;
    const feat = p.match(/^sdd\/specs\/features\/(F\d{2})-/)?.[1];
    if (feat) return Boolean(approvals.plans?.[feat]);            // locked once a human approved its plan
    if (/^sdd\/(contracts|adr|design)\//.test(p)) return !planning;    // shared: only while planning an unapproved feature
    return true;                                                  // foundation specs, NFRs, templates: CR only
  });
}

export function checkCommit(message, files, approvals = loadApprovals(), added = [], before = approvals) {
  const errors = [];
  const header = message.split('\n').find((l) => l.trim() && !l.startsWith('#')) ?? '';
  if (/^(Merge|Revert) /.test(header)) return errors;
  const m = header.match(HEADER);
  if (!m) { errors.push(`G1 header "${header}" is not a Conventional Commit, e.g. "feat(F04): T012 limits engine [XFER-021]"`); return errors; }
  const [, type, , scope] = m;
  const code = files.filter((f) => CODE.test(f));
  const spec = files.filter((f) => SPEC.test(f) && !SPEC_EXEMPT.test(f));
  const gov = files.filter((f) => GOVERNANCE.test(f));
  const approvalsChanged = files.includes('sdd/state/approvals.json');

  if (code.length && (type === 'feat' || type === 'fix')) {
    if (!/^F\d{2}$/.test(scope ?? '')) errors.push(`G2 code changes need a feature scope like feat(F04): … (got "${scope ?? 'none'}")`);
    if (!/\[(?:[A-Z][A-Z0-9]*-)+\d{3}\]/.test(message)) errors.push('G2 add the requirement IDs this commit satisfies, e.g. [XFER-021]');
  }
  if (code.length && /^F\d{2}$/.test(scope ?? '')) {
    const f = featureById(scope);
    if (!f) errors.push(`G3 unknown feature ${scope}`);
    else {
      const pa = planApproval(f, approvals);
      if (pa.state !== 'approved') errors.push(`G3 ${scope} plan is ${pa.state}; code cannot land before a human approves the plan (${humanAction('plan', scope)})`);
      if (!taskCounts(f)) errors.push(`G3 ${scope} has no tasks.md`);
    }
  }
  if (code.length && spec.length) errors.push(`G4 do not mix code and specs in one commit (spec files: ${spec.slice(0, 3).join(', ')}${spec.length > 3 ? ', …' : ''}). Specs change via the Spec Architect or a CR.`);
  if (files.includes('sdd/specs/00-constitution.md')) {
    const cr = (message.match(/CR-\d{3}/) || [])[0];
    const rec = cr && approvals.changeRequests?.[cr];
    if (!rec || rec.decision !== 'APPROVED' || !/constitution/i.test(rec.affects ?? '')) errors.push('G5 constitution changes need "CR-###" in the message for an approved CR that affects the constitution');
  }
  if (approvalsChanged && files.length > 1) errors.push('G6 commit sdd/state/approvals.json on its own');
  if (approvalsChanged && !(type === 'chore' && scope === 'SDD')) errors.push('G6 approval commits use "chore(SDD): approve …"');
  if (gov.length && scope !== 'SDD') errors.push(`G7 governance files changed (${gov[0]}…) — use scope SDD and get CODEOWNERS review`);
  const locked = lockedSpecChanges(message, scope, files, before);
  if (locked.length) errors.push(`G9 ${locked[0]}${locked.length > 1 ? ` (+${locked.length - 1} more)` : ''} is approved scope. Change it through an approved change request cited in the message — e.g. "spec(CR-004): …" — whose "affects" lists it (/sdd-change-request → the business owner decides it → /sdd-apply-cr).`);
  const silenced = added.filter((l) => (CODE.test(l.file) || l.file === 'sonar-project.properties') && SUPPRESSION.test(l.text));
  if (silenced.length) errors.push(`G8 do not suppress SonarQube findings (${silenced[0].file}: "${silenced[0].text.trim().slice(0, 60)}"). Fix the issue, or a human marks it in SonarQube.`);
  const leaks = scanAdded(added);
  if (leaks.length) errors.push(`G10 no secrets in commits: ${describe(leaks[0])}${leaks.length > 1 ? ` (and ${leaks.length - 1} more)` : ''}. ${ADVICE}`);
  return errors;
}

// Where the checked range starts. Pure (env and git lookups are passed in) so it can be tested.
export function resolveBase({ base, before, env = {}, exists = () => true } = {}) {
  if (base && base !== 'auto') return base;
  const main = env.SDD_DEFAULT_BRANCH || 'main';
  if (env.SDD_BASE) return env.SDD_BASE;                                           // set by any pipeline
  if (env.GITHUB_BASE_REF) return `origin/${env.GITHUB_BASE_REF}`;                 // GitHub pull_request event
  const target = env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME || env.CHANGE_TARGET ||   // GitLab MR · Jenkins PR
    String(env.SYSTEM_PULLREQUEST_TARGETBRANCH || '').replace(/^refs\/heads\//, '') || env.BITBUCKET_PR_DESTINATION_BRANCH; // Azure · Bitbucket
  if (target) return `origin/${target}`;
  const branch = env.GITHUB_REF_NAME || env.CI_COMMIT_BRANCH || env.BRANCH_NAME || String(env.BUILD_SOURCEBRANCH || '').replace(/^refs\/heads\//, '') || env.BITBUCKET_BRANCH || '';
  before = before || env.CI_COMMIT_BEFORE_SHA || env.GIT_PREVIOUS_SUCCESSFUL_COMMIT;
  if (branch !== main) return `origin/${main}`;                                     // a branch, or an unknown CI
  if (before && /^0+$/.test(before)) return '';                                   // first push of the branch: all history
  if (before && exists(before)) return before;                                    // push to the default branch
  return exists('HEAD~1') ? 'HEAD~1' : '';                                        // manual run / force push
}
const commitExists = (sha) => { try { git(`cat-file -e ${sha}^{commit}`); return true; } catch { return false; } };

// Approvals as committed at a given revision (G9 judges a commit by the approvals that existed before it).
function approvalsAt(rev) {
  try { const a = JSON.parse(git(`show ${rev}:sdd/state/approvals.json`)); a.plans ??= {}; a.changeRequests ??= {}; return a; }
  catch { return { version: 1, plans: {}, phases: {}, changeRequests: {}, waivers: {} }; }
}

function report(label, errors) {
  if (!errors.length) return 0;
  console.error(`\n✖ SDD policy — ${label}`);
  for (const e of errors) console.error(`   • ${e}`);
  return errors.length;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isCli && args.includes('--commit-msg')) {
  const msg = readFileSync(arg('--commit-msg'), 'utf8');
  let hasHead = true;
  try { git('rev-parse --verify HEAD'); } catch { hasHead = false; }
  if (!hasHead) { console.log('SDD policy: initial import commit — skipped.'); process.exit(0); }
  const files = git('diff --cached --name-only').split('\n').filter(Boolean);
  const n = report('commit rejected', checkCommit(msg, files, loadApprovals(), addedLines(git('diff --cached -U0 --no-color'))));
  if (n) { console.error('\n   See sdd/docs/WHICH-MODE.md. (Bypassing with --no-verify will still fail in CI.)\n'); process.exit(1); }
  process.exit(0);
}

if (isCli && args.includes('--print-base')) {
  console.log(resolveBase({ base: 'auto', before: arg('--before'), env: process.env, exists: commitExists }));
  process.exit(0);
}

if (isCli && args.includes('--ci')) {
  const base = resolveBase({ base: arg('--base') ?? 'auto', before: arg('--before'), env: process.env, exists: commitExists });
  const range = base ? `${base}..HEAD` : 'HEAD';
  console.log(`SDD policy: checking ${base ? range : 'all history'}`);
  const shas = git(`rev-list --no-merges ${range}`).split('\n').filter(Boolean).reverse();
  let total = 0;
  // Approvals are evaluated against the PR head: code may land only if its plan is approved at head.
  const approvals = loadApprovals();
  for (const sha of shas) {
    if (!git(`rev-list --parents -n 1 ${sha}`).includes(' ')) continue; // root commit = initial import
    const msg = git(`log -1 --format=%B ${sha}`);
    const files = git(`diff-tree --no-commit-id --name-only -r ${sha}`).split('\n').filter(Boolean);
    const added = addedLines(git(`show -U0 --no-color --format= ${sha}`));
    total += report(`${sha.slice(0, 8)} ${msg.split('\n')[0]}`, checkCommit(msg, files, approvals, added, approvalsAt(`${sha}^`)));
  }
  // Stale approvals at head (plan edited after approval) are warnings: the feature is blocked anyway.
  for (const [id, rec] of Object.entries(approvals.plans || {})) {
    const f = featureById(id);
    if (f && planApproval(f, approvals).state === 'stale') console.warn(`⚠ plan approval for ${id} is stale (plan.md changed after approval by ${rec.by})`);
  }
  console.log(total ? `\n✖ ${total} SDD policy violation(s) in ${shas.length} commit(s)` : `✔ SDD policy: ${shas.length} commit(s) checked`);
  const onMain = !process.env.GITHUB_BASE_REF && process.env.GITHUB_REF_NAME === (process.env.SDD_DEFAULT_BRANCH || 'main');
  if (total && onMain) {
    console.error('\n::error::These commits reached main without passing the SDD rules (a direct push, or branch protection is off). ' +
      'promote-to-test will not deploy them. Revert them, or fix forward through a pull request.');
  }
  if (total && process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ✖ SDD policy: ${total} violation(s) in ${shas.length} commit(s)\nRange: \`${range}\`. Run \`node sdd/scripts/git-check.mjs --ci --base ${base || 'auto'}\` locally for details.\n`);
  }
  process.exit(total ? 1 : 0);
}

if (isCli) {
  console.error('usage: git-check.mjs --commit-msg <file> | --ci [--base <ref>|auto] [--before <sha>] | --print-base [--before <sha>]');
  process.exit(2);
}
