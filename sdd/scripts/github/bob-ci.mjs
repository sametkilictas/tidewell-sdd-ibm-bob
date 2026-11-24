#!/usr/bin/env node
// Plain-code steps around Bob when it runs headless in GitHub Actions (bob-review.yml, bob-commands.yml).
// Bob does the reasoning; these steps prepare its input, read its output and check what it changed.
//
//   bob-ci.mjs features --pr <pr.json>                                     → outputs features=F04,F05 feature=F04|
//   bob-ci.mjs prompt --kind review|fix --pr <pr.json> --diff <file> [--feature F04]
//                     [--instructions <file>] [--review <file>] --out <prompt.txt>
//   bob-ci.mjs extract --kind review|fix --in <bob.json> --head <sha> --out <comment.md>
//   bob-ci.mjs scope --feature F04 --base <sha>                            → exit 1 if Bob's commits leave the
//                                                                            implement step's write scope
// Runs only inside GitHub Actions; Bob's hook refuses any command that names this folder.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// The checkout this script was loaded from (the default branch in Actions). Prompts come from here, never from
// the pull request being reviewed.
const TRUSTED = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

export const MARKERS = {
  review: ['<<<SDD_REVIEW_BEGIN>>>', '<<<SDD_REVIEW_END>>>'],
  fix: ['<<<SDD_FIX_BEGIN>>>', '<<<SDD_FIX_END>>>'],
};
export const STICKY = { review: '<!-- sdd-bob-review -->', fix: '<!-- sdd-bob-fix -->' };

// Which features a pull request touches: commit scopes feat(F04)/fix(F04), spec folders, branch and title.
export function featuresOf(pr) {
  const ids = new Set();
  const add = (s) => { for (const m of String(s ?? '').matchAll(/\bF\d{2}\b/g)) ids.add(m[0]); };
  for (const c of pr.commits ?? []) {
    const h = c.messageHeadline ?? c.message ?? '';
    const scope = h.match(/^\w+\((F\d{2})\)/)?.[1];
    if (scope) ids.add(scope);
  }
  for (const f of pr.files ?? []) { const m = (f.path ?? f).match?.(/^sdd\/specs\/features\/(F\d{2})-/); if (m) ids.add(m[1]); }
  add(pr.headRefName); add(pr.title);
  return [...ids].sort();
}

// Bob's JSON output (bob run --format json): { type, status, stats, last_message, … }. Tolerant of shape changes.
export function readBobOutput(raw) {
  let obj = null;
  try { obj = JSON.parse(raw); } catch {
    const lines = String(raw).split('\n').map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    obj = lines.reverse().find((o) => o.type === 'result' || o.last_message) ?? null;
  }
  const text = obj?.last_message ?? obj?.result ?? obj?.message ?? (obj ? '' : String(raw));
  const stats = obj?.stats ?? {};
  const cost = stats.session_costs ?? stats.cost ?? stats.total_cost ?? null;
  return { status: obj?.status ?? 'unknown', text: typeof text === 'string' ? text : JSON.stringify(text), cost, stats };
}

export function between(text, [begin, end]) {
  const all = [...String(text).matchAll(new RegExp(`${begin.replace(/[<>]/g, '\\$&')}([\\s\\S]*?)${end.replace(/[<>]/g, '\\$&')}`, 'g'))];
  return all.length ? all[all.length - 1][1].trim() : null;
}

export function fill(template, vars) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, k) => (vars[k] ?? ''));
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const args = process.argv.slice(2);
  const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
  const out = (k, v) => { const l = `${k}=${String(v).replace(/\n/g, ' ')}\n`; if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, l); else process.stdout.write(l); };
  const verb = args[0];
  if (process.env.GITHUB_ACTIONS !== 'true' && !process.env.SDD_SIGNOFF_TEST) { console.error('bob-ci.mjs runs only inside GitHub Actions.'); process.exit(2); }
  const lib = await import('../lib.mjs');
  const pr = arg('pr') ? JSON.parse(readFileSync(arg('pr'), 'utf8')) : {};

  if (verb === 'config') {
    // Bob settings from the trusted approver list (the default branch's sdd/governance/approvers.json).
    const a = JSON.parse(readFileSync(arg('approvers'), 'utf8'));
    const b = a.bob ?? {};
    out('review', ['auto', 'on-request', 'off'].includes(b.review) ? b.review : 'auto');
    out('review_mode', b.reviewMode ?? 'sdd-pr-reviewer');
    out('fix_mode', b.fixMode ?? 'spec-builder');
    out('review_max_cost', Number(b.reviewMaxCost ?? 3));
    out('fix_max_cost', Number(b.fixMaxCost ?? 8));
    out('max_turns', Number(b.maxTurns ?? 60));
    process.exit(0);
  }

  if (verb === 'authorize') {
    // May the commenter ask Bob for this? (bob-commands.yml) Writes the refusal to --reply.
    const { parseCommand } = await import('./commands.mjs');
    const { authorizeBob } = await import('./governance.mjs');
    const event = JSON.parse(readFileSync(arg('event'), 'utf8'));
    const c = event.comment ?? {};
    const cmd = parseCommand(c.body);
    const refuse = (m) => { writeFileSync(arg('reply'), `${m}\n`); out('run', 'reply'); process.exit(0); };
    if (!cmd || !cmd.name.startsWith('bob-') && cmd.name !== 'invalid') { out('run', 'ignore'); process.exit(0); }
    if (cmd.name === 'invalid') { if (/^\/bob\b/i.test(c.body ?? '')) refuse(`⚠️ ${cmd.reason}`); out('run', 'ignore'); process.exit(0); }
    if (pr.isCrossRepository) refuse('✖ Bob runs only on pull requests from branches of this repository, not forks.');
    if (String(pr.state).toUpperCase() !== 'OPEN') refuse('✖ The pull request is not open.');
    const a = JSON.parse(readFileSync(arg('approvers'), 'utf8'));
    const auth = authorizeBob({ login: c.user?.login, association: c.author_association, userType: c.user?.type, action: cmd.name === 'bob-fix' ? 'fix' : 'review', approvers: a });
    if (!auth.ok) refuse(`✖ ${auth.reason}`);
    let feature = '';
    if (cmd.name === 'bob-fix') {
      const ids = featuresOf(pr);
      feature = cmd.feature ?? (ids.length === 1 ? ids[0] : '');
      if (!feature) refuse(`✖ Say which feature to work on: \`/bob fix F04 …\` (this pull request touches ${ids.join(', ') || 'no feature I can recognise'}).`);
      if (cmd.instructions) writeFileSync(arg('instructions'), cmd.instructions);
    }
    out('run', cmd.name === 'bob-fix' ? 'fix' : 'review');
    out('feature', feature);
    out('login', c.user?.login ?? '');
    process.exit(0);
  }

  if (verb === 'features') {
    const ids = featuresOf(pr);
    out('features', ids.join(','));
    out('feature', ids.length === 1 ? ids[0] : '');
    process.exit(0);
  }

  if (verb === 'prompt') {
    const kind = arg('kind');
    const wf = await import('../workflow.mjs');
    const ids = arg('feature') ? [arg('feature')] : featuresOf(pr);
    const statusMd = ids.length
      ? ids.map((id) => wf.renderMarkdown(wf.status({ feature: id }))).join('\n\n')
      : wf.renderMarkdown(wf.status({}));
    const template = readFileSync(join(TRUSTED, `sdd/workflows/prompts/pr-${kind}.md`), 'utf8');
    const read = (p) => (p && existsSync(p) ? readFileSync(p, 'utf8').trim() : '');
    const text = fill(template, {
      PR_NUMBER: pr.number ?? '', PR_TITLE: pr.title ?? '', PR_BRANCH: pr.headRefName ?? '', FEATURES: ids.join(', ') || 'none detected',
      FEATURE: arg('feature') ?? ids[0] ?? '', DIFF_FILE: arg('diff') ?? '', WORKFLOW_STATUS: statusMd,
      INSTRUCTIONS: read(arg('instructions')) || '(none — address the findings of the latest review)', REVIEW: read(arg('review')) || '(no earlier review)',
      BEGIN: MARKERS[kind][0], END: MARKERS[kind][1],
    });
    writeFileSync(arg('out'), text);
    process.exit(0);
  }

  if (verb === 'extract') {
    const kind = arg('kind');
    const bob = readBobOutput(readFileSync(arg('in'), 'utf8'));
    const body = between(bob.text, MARKERS[kind]);
    const head = (arg('head') ?? '').slice(0, 12);
    const title = kind === 'review' ? `🤖 **Bob · advisory spec review** of \`${head}\`` : `🤖 **Bob · fixes** requested on this pull request`;
    const foot = `<sub>IBM Bob ran headless in GitHub Actions (mode \`${kind === 'review' ? 'sdd-pr-reviewer' : 'spec-builder'}\`, status ${bob.status}${bob.cost != null ? `, cost ${typeof bob.cost === 'object' ? JSON.stringify(bob.cost) : bob.cost} Bobcoins` : ''}). ` +
      `${kind === 'review' ? 'Advisory only: it cannot approve, merge or sign anything. Ask for changes with `/bob fix [what to change]`.' : 'Its commits passed the scope check; the SDD checks run again on the new head.'}</sub>`;
    const md = [STICKY[kind], title, '', body ?? `⚠️ Bob's answer did not include the expected markers; its raw answer follows.\n\n${bob.text.slice(0, 60000)}`, '', foot].join('\n');
    writeFileSync(arg('out'), md);
    out('status', bob.status);
    out('has_markers', body ? 'true' : 'false');
    process.exit(0);
  }

  if (verb === 'scope') {
    // Every file Bob's commits touched must be one the implement step may write for this feature, and none of
    // its commit messages may pose as a sign-off. The PreToolUse hook already enforced this while Bob worked;
    // this re-checks the result before anything is pushed.
    const feature = arg('feature');
    const base = arg('base');
    const git = (...a) => execFileSync('git', a, { cwd: lib.ROOT, encoding: 'utf8' }).trim();
    const shas = git('rev-list', '--no-merges', `${base}..HEAD`).split('\n').filter(Boolean);
    const active = { step: 'implement', target: feature, mode: 'spec-builder' };
    const errors = [];
    for (const sha of shas) {
      const msg = git('log', '-1', '--format=%B', sha);
      if (/SDD-Approval:|SDD-Signed-By:/i.test(msg) || lib.SIGNOFF_COMMAND.test(msg)) errors.push(`${sha.slice(0, 8)}: commit message poses as a sign-off`);
      for (const p of git('diff-tree', '--no-commit-id', '--name-only', '-r', sha).split('\n').filter(Boolean)) {
        const r = lib.checkWrite(p, active, lib.loadApprovals());
        if (!r.ok) errors.push(`${sha.slice(0, 8)} ${p}: ${r.reason}`);
      }
    }
    const dirty = git('status', '--porcelain').split('\n').filter(Boolean);
    for (const e of errors) console.error(`::error title=Bob left its scope::${e}`);
    console.log(`Scope check: ${shas.length} commit(s) by Bob, ${errors.length} problem(s)${dirty.length ? `, ${dirty.length} uncommitted file(s) discarded` : ''}.`);
    out('commits', shas.length);
    process.exit(errors.length ? 1 : 0);
  }

  console.error('usage: bob-ci.mjs features|prompt|extract|scope …');
  process.exit(2);
}
