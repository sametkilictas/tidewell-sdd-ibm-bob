#!/usr/bin/env node
// Turns a person's pull-request comment into a recorded sign-off. Runs ONLY inside GitHub Actions
// (.github/workflows/sdd-signoff.yml); Bob's hook refuses any command that names this folder.
//
// The workflow runs this file from a checkout of the DEFAULT branch (trusted code and approver list) and points
// SDD_ROOT at a checkout of the pull request head, which is only read, never executed.
//
//   signoff.mjs authorize --event <event.json> --pr <pr.json> --approvers <approvers.json> --reply <reply.md>
//       → outputs run=record|status|ignore; writes the refusal to --reply when it refuses
//   signoff.mjs record    --event <event.json> --pr <pr.json> --approvers <approvers.json> --reply <reply.md>
//       → updates sdd/state/approvals.json in SDD_ROOT and commits it ALONE; outputs committed=true|false
//   signoff.mjs status    --event <event.json> --reply <reply.md>
//       → writes the workflow status of SDD_ROOT as Markdown

import { readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { parseCommand, isSignoff } from './commands.mjs';
import { authorizeSignoff } from './governance.mjs';
import { features } from '../lib.mjs';

const args = process.argv.slice(2);
const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
export const BOT = { name: 'github-actions[bot]', email: '41898282+github-actions[bot]@users.noreply.github.com' };

function output(key, value) {
  const line = `${key}=${String(value).replace(/\n/g, ' ')}\n`;
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, line); else process.stdout.write(line);
}
const reply = (text) => { if (arg('reply')) writeFileSync(arg('reply'), `${text}\n`); else console.log(text); };

// Everything the checks need from the event and the pull request, in one plain object.
export function context(event, pr) {
  const c = event.comment ?? {};
  return {
    body: c.body ?? '', login: c.user?.login ?? '', userType: c.user?.type ?? 'User', association: c.author_association ?? 'NONE',
    commentId: c.id, commentUrl: c.html_url, commentAt: c.created_at, pr: pr?.number ?? event.issue?.number,
    prAuthor: pr?.author?.login ?? event.issue?.user?.login ?? null, prState: pr?.state ?? event.issue?.state,
    crossRepo: Boolean(pr?.isCrossRepository), headSha: pr?.headRefOid ?? null, repo: event.repository?.full_name ?? process.env.GITHUB_REPOSITORY,
  };
}

// First gate: is this a command at all, and may this person give it? (No pull-request files are read here.)
export function screen(ctx, approvers, policy) {
  const cmd = parseCommand(ctx.body);
  if (!cmd || cmd.name.startsWith('bob-')) return { run: 'ignore' };
  if (cmd.name === 'invalid') return { run: 'reply', message: `⚠️ ${cmd.reason}` };
  if (cmd.name === 'status') return { run: 'status', cmd };
  if (!isSignoff(cmd)) return { run: 'ignore' };
  if (ctx.crossRepo) return { run: 'reply', cmd, message: '✖ Not recorded: sign-offs are taken only on pull requests from branches of this repository, not forks.' };
  if (String(ctx.prState).toUpperCase() !== 'OPEN') return { run: 'reply', cmd, message: '✖ Not recorded: the pull request is not open.' };
  const decision = cmd.kind === 'revoke' ? 'revoke' : cmd.kind;
  const auth = authorizeSignoff({ login: ctx.login, association: ctx.association, userType: ctx.userType, decision, target: cmd.target, approvers, policy, phaseFeatures: decision === 'phase' ? phaseFeatureIds(cmd.target) : [], prAuthor: ctx.prAuthor });
  if (!auth.ok) return { run: 'reply', cmd, message: `✖ Not recorded: ${auth.reason}` };
  return { run: 'record', cmd, person: auth.person };
}

function phaseFeatureIds(n) { try { return features().filter((f) => String(f.phase) === String(n)).map((f) => f.id); } catch { return []; } }

const short = (h) => (h ? h.slice(0, 12) : '—');

// Second gate, against the pull request's files: build the record exactly as approve.mjs would.
export async function decide(ctx, approvers, { headCommitAt } = {}) {
  const s = screen(ctx, approvers);
  if (s.run !== 'record') return s;
  const { cmd, person } = s;
  // A revoke only ever blocks work, so it is taken whatever changed since the comment.
  if (cmd.kind !== 'revoke' && cmd.sha && !String(ctx.headSha ?? '').toLowerCase().startsWith(cmd.sha)) {
    return { run: 'reply', message: `✖ Not recorded: you signed @${cmd.sha}, but the pull request head is now ${short(ctx.headSha)}. Check the latest changes and comment again.` };
  }
  if (cmd.kind !== 'revoke' && headCommitAt && ctx.commentAt && new Date(headCommitAt) > new Date(ctx.commentAt)) {
    return { run: 'reply', message: `✖ Not recorded: the pull request changed after your comment (head ${short(ctx.headSha)}). Check the latest changes and comment again.` };
  }
  const lib = await import('../lib.mjs');
  const core = await import('../approvals-core.mjs');
  const approvals = lib.loadApprovals();
  const stamp = {
    by: `${person.name ?? person.login} (@${person.login})`, at: ctx.commentAt ?? new Date().toISOString(), via: 'github-comment',
    github: { login: person.login, commentId: ctx.commentId, commentUrl: ctx.commentUrl, pr: ctx.pr, headSha: ctx.headSha, repo: ctx.repo },
  };
  let d, key, text;
  switch (cmd.kind) {
    case 'plan':
      d = core.planDecision(approvals, cmd.target);
      if (d.ok) { key = d.feature.id; text = `plan ${key}: plan.md \`${short(d.record.sha256)}\` and spec.md \`${short(d.record.specSha256)}\` are now locked${d.crs.length ? ` (spec changes covered by ${d.crs.join(', ')})` : ''}.`; }
      break;
    case 'phase':
      d = core.phaseDecision(approvals, cmd.target);
      if (d.ok) { key = d.phase; text = `phase ${key}: the next phase is open.`; }
      break;
    case 'cr':
      d = core.crDecision(approvals, cmd.target, { decision: cmd.decision, option: cmd.option });
      if (d.ok) { key = cmd.target; if (cmd.reason) d.record.reason = cmd.reason; text = `${cmd.target} ${d.record.decision.toLowerCase()}${d.record.option ? ` (option ${d.record.option})` : ''}, bound to \`${short(d.record.sha256)}\`.`; }
      break;
    case 'waiver':
      d = core.waiverDecision(approvals, cmd.target, { feature: cmd.feature, reason: cmd.reason, expires: cmd.expires, today: new Date(ctx.commentAt ?? Date.now()) });
      if (d.ok) { key = cmd.target; text = `risk of ${cmd.target} accepted for ${cmd.feature} until ${cmd.expires}.`; }
      break;
    case 'revoke': {
      const bucket = core.BUCKET[cmd.what];
      const id = cmd.what === 'phase' ? String(Number(cmd.target)) : cmd.target;
      if (!approvals[bucket]?.[id]) return { run: 'reply', message: `✖ Nothing to revoke: there is no ${cmd.what} sign-off for ${cmd.target}.` };
      const next = core.applyDecision(approvals, 'revoke', { what: cmd.what, id });
      return { run: 'commit', next, title: `revoke ${cmd.what} ${id}`, text: `${cmd.what} ${id} sign-off revoked.`, person, stamp };
    }
    default:
      return { run: 'ignore' };
  }
  if (!d.ok) return { run: 'reply', message: `✖ Not recorded: ${d.reason}` };
  const next = core.applyDecision(approvals, cmd.kind, key, { ...d.record, ...stamp });
  const verb = cmd.kind === 'cr' ? `${cmd.decision === 'rejected' ? 'reject' : 'approve'} cr` : cmd.kind === 'waiver' ? 'waive' : `approve ${cmd.kind}`;
  return { run: 'commit', next, title: `${verb} ${key}`, text, person, stamp, warnings: d.warnings ?? [] };
}

// When did the pull request's content last reach this branch, by GitHub's clock? A committer date can be set to
// anything (GIT_COMMITTER_DATE), so it is only a fallback. sdd-gates runs on every push, so each push leaves a
// workflow run (event "push", this branch) on the commit it pushed; the latest such run on any commit from the
// last content change up to the head is when that content was pushed. Pushes made with GITHUB_TOKEN start no
// push run: earlier sign-off commits (approvals.json only) are not content changes, and Bob's fixes are covered
// by the sdd-gates run the workflow dispatches right after pushing them.
//   → { at: ISO time | null, source: 'github' | 'commit-date' | 'unavailable', error? }
export async function contentPushedAt({ repo, branch, shas, content = shas.at(-1), fallbackAt, token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN, api = process.env.GITHUB_API_URL || 'https://api.github.com' }) {
  if (!token || !repo || !branch || !shas.length) return { at: fallbackAt, source: 'commit-date' };
  const times = [];
  try {
    for (const sha of shas) {
      const q = new URLSearchParams({ head_sha: sha, branch, per_page: '100' });
      const res = await fetch(`${api}/repos/${repo}/actions/runs?${q}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' } });
      if (!res.ok) throw new Error(`GitHub API actions/runs: ${res.status}`);
      for (const run of (await res.json()).workflow_runs ?? []) {
        if (run.head_branch !== branch || run.head_sha !== sha) continue;
        // A person's push starts a push run. Bob's fixes are pushed with GITHUB_TOKEN (no push run) and are
        // followed at once by a dispatched sdd-gates run on the commit they pushed, so for the content commit
        // itself that run counts too. Extra runs only make the time later, so they can only cause a refusal.
        if (run.event === 'push' || (sha === content && run.event === 'workflow_dispatch')) times.push(run.created_at);
      }
    }
  } catch (e) {
    return { at: null, source: 'unavailable', error: e.message };
  }
  if (!times.length) return { at: fallbackAt, source: 'commit-date' };
  return { at: times.sort().at(-1), source: 'github' };
}

export function commitMessage(title, stamp) {
  return `chore(SDD): ${title}\n\nSigned by ${stamp.by} in a pull-request comment.\n\nSDD-Approval: ${title}\nSDD-Signed-By: @${stamp.github.login}\nSDD-Comment: ${stamp.github.commentUrl}\n`;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const verb = args[0];
  if (process.env.GITHUB_ACTIONS !== 'true' && !process.env.SDD_SIGNOFF_TEST) {
    console.error('signoff.mjs runs only inside GitHub Actions (sdd-signoff.yml).');
    process.exit(2);
  }
  const event = readJson(arg('event') ?? process.env.GITHUB_EVENT_PATH);
  const pr = arg('pr') ? readJson(arg('pr')) : null;
  const ctx = context(event, pr);

  if (verb === 'authorize') {
    const s = screen(ctx, readJson(arg('approvers')), arg('policy') ? readJson(arg('policy')) : undefined);
    output('run', s.run);
    if (s.message) reply(s.message);
    process.exit(0);
  }
  if (verb === 'status') {
    const wf = await import('../workflow.mjs');
    const cmd = parseCommand(ctx.body);
    reply(wf.renderMarkdown(wf.status({ feature: cmd?.feature ?? undefined })));
    process.exit(0);
  }
  if (verb === 'record') {
    const lib = await import('../lib.mjs');
    const git = (...a) => execFileSync('git', a, { cwd: lib.ROOT, encoding: 'utf8' }).trim();
    // When did the pull request's content last change? Earlier sign-off commits (this bot, approvals.json only)
    // don't count, so two owners can sign in quick succession.
    let commitAt = null;
    const chain = [];
    for (const line of git('log', '-n', '100', '--format=%H%x09%ae%x09%cI').split('\n').filter(Boolean)) {
      const [sha, email, at] = line.split('\t');
      chain.push(sha);
      const files = git('diff-tree', '--no-commit-id', '--name-only', '-r', sha).split('\n').filter(Boolean);
      if (email === BOT.email && files.length === 1 && files[0] === 'sdd/state/approvals.json') continue;
      commitAt = at; break;
    }
    const pushed = await contentPushedAt({ repo: ctx.repo, branch: pr?.headRefName, shas: chain, fallbackAt: commitAt });
    if (pushed.source === 'unavailable') {
      output('committed', 'false');
      reply(`✖ Not recorded: GitHub could not confirm when this pull request last changed (${pushed.error}), so the sign-off cannot be tied to what you reviewed. Comment again in a minute.`);
      process.exit(0);
    }
    const d = await decide(ctx, readJson(arg('approvers')), { headCommitAt: pushed.at });
    const cmd = parseCommand(ctx.body);
    if (d.run === 'commit' && pushed.source === 'commit-date' && cmd && cmd.kind !== 'revoke' && !cmd.sha) {
      (d.warnings ??= []).push(`GitHub has no push record for the latest change, so its commit date was used to check that nothing changed after your comment. Pin the commit you review next time: \`/${cmd.name} ${cmd.target} @<sha>\`.`);
    }
    if (d.run !== 'commit') { output('committed', 'false'); if (d.message) reply(d.message); process.exit(0); }
    lib.saveJson(lib.APPROVALS, d.next);
    git('add', '--', 'sdd/state/approvals.json');
    const staged = git('diff', '--cached', '--name-only').split('\n').filter(Boolean);
    if (staged.length !== 1 || staged[0] !== 'sdd/state/approvals.json') throw new Error(`refusing to commit anything but sdd/state/approvals.json (staged: ${staged.join(', ')})`);
    execFileSync('git', ['-c', `user.name=${BOT.name}`, '-c', `user.email=${BOT.email}`, 'commit', '-q', '-F', '-'], { cwd: lib.ROOT, input: commitMessage(d.title, d.stamp) });
    const sha = git('rev-parse', 'HEAD');
    output('committed', 'true');
    output('commit', sha);
    const revoked = d.title.startsWith('revoke');
    reply([`✔ **${revoked ? 'Revoked' : 'Signed'} by ${d.stamp.by}** — ${d.text}`, '',
      ...(d.warnings ?? []).map((w) => `> ⚠️ ${w.replace(/\n/g, '\n> ')}`),
      `Recorded in \`sdd/state/approvals.json\` by commit ${sha.slice(0, 12)} (on its own, as the SDD rules require). The SDD checks run again on the new head.`,
      '', revoked ? '<sub>Work that needed this sign-off is blocked until someone signs again.</sub>'
        : '<sub>The sign-off is bound to the files at this head. Any later change to them makes it stale, and the workflow asks for a new one.</sub>'].join('\n'));
    process.exit(0);
  }
  console.error('usage: signoff.mjs authorize|record|status --event <file> [--pr <file>] [--approvers <file>] [--reply <file>]');
  process.exit(2);
}
