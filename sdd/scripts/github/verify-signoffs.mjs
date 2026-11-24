#!/usr/bin/env node
// CI check "signoffs" (sdd-gates.yml): every sign-off added or changed in the checked range must be backed by
// GitHub itself. A record that says it came from a pull-request comment is checked against that comment —
// same author, same command, author still allowed by the approver list of the BASE revision. A developer can
// edit sdd/state/approvals.json by hand, but cannot write a comment as the business owner.
//
//   node sdd/scripts/github/verify-signoffs.mjs [--base <ref>|auto] [--before <sha>] [--offline]
//
// Needs GITHUB_TOKEN (issues: read, pull-requests: read) and GITHUB_REPOSITORY in Actions. --offline skips
// the GitHub lookups and checks only the channel rules (for local runs).

import { execSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseCommand } from './commands.mjs';
import { authorizeSignoff } from './governance.mjs';
import { rolesFor, personByEmail, trainingMode } from '../policy.mjs';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BUCKETS = { plans: 'plan', phases: 'phase', changeRequests: 'cr', waivers: 'waiver' };

// Records that are new or different at head compared with base.
export function changedRecords(before, after) {
  const out = [];
  for (const [bucket, kind] of Object.entries(BUCKETS)) {
    for (const [id, rec] of Object.entries(after?.[bucket] ?? {})) {
      if (JSON.stringify(before?.[bucket]?.[id]) !== JSON.stringify(rec)) out.push({ kind, id, rec });
    }
  }
  return out;
}
export function removedRecords(before, after) {
  const out = [];
  for (const [bucket, kind] of Object.entries(BUCKETS)) {
    for (const id of Object.keys(before?.[bucket] ?? {})) if (!(after?.[bucket] ?? {})[id]) out.push({ kind, id });
  }
  return out;
}

// Does the comment really say what the record claims, from someone allowed to say it?
export function verifyRecord({ kind, id, rec, comment, pr, approvers, policy }) {
  const errs = [];
  const channel = approvers?.approvalChannel ?? 'terminal';
  if (rec.via !== 'github-comment') {
    if (channel === 'github') errs.push(`${kind} ${id}: recorded in a terminal (by ${rec.by ?? '?'}), but this repository takes sign-offs only as pull-request comments`);
    return errs;
  }
  if (channel === 'terminal') { errs.push(`${kind} ${id}: this repository takes sign-offs only in a terminal`); return errs; }
  if (!comment) { errs.push(`${kind} ${id}: the comment it cites (${rec.github?.commentUrl ?? rec.github?.commentId ?? 'none'}) does not exist (deleted?)`); return errs; }
  const login = comment.user?.login ?? '';
  if (login.toLowerCase() !== String(rec.github?.login ?? '').toLowerCase()) errs.push(`${kind} ${id}: the record says @${rec.github?.login}, but the comment was written by @${login}`);
  const cmd = parseCommand(comment.body);
  const cmdId = cmd?.kind === 'phase' ? String(Number(cmd.target)) : cmd?.target;
  if (!cmd || cmd.kind !== kind || cmdId !== id) errs.push(`${kind} ${id}: the comment does not say /${kind === 'cr' ? 'approve-cr or /reject-cr' : kind === 'waiver' ? 'accept-risk' : `approve-${kind}`} ${id} (it says: "${String(comment.body ?? '').split('\n')[0].slice(0, 60)}")`);
  else if (kind === 'cr' && cmd.decision.toUpperCase() !== rec.decision) errs.push(`cr ${id}: the record says ${rec.decision}, the comment says ${cmd.decision}`);
  const auth = authorizeSignoff({ login, association: comment.author_association, userType: comment.user?.type, decision: kind, target: id, approvers, ...(policy ? { policy } : {}), prAuthor: pr?.user?.login ?? null });
  if (!auth.ok) errs.push(`${kind} ${id}: ${auth.reason}`);
  if (rec.at && comment.created_at && rec.at !== comment.created_at) errs.push(`${kind} ${id}: the record's time (${rec.at}) is not the comment's (${comment.created_at})`);
  return errs;
}

// A terminal sign-off is checked against the commit that brought it: who committed it (git author email), whether
// that person is listed with a role that may give this decision for the feature's risk tier, that they did not also
// make the change (four-eyes), that the commit holds the sign-off alone, and, if required, that it is signed.
const low = (x) => String(x ?? '').trim().toLowerCase();
export function verifyTerminalRecord({ kind, id, rec, commit, approvers, policy, phaseFeatures = [], makers = [] }) {
  const errs = [];
  const channel = approvers?.approvalChannel ?? 'terminal';
  if (channel === 'github') return [`${kind} ${id}: recorded in a terminal (by ${rec.by ?? '?'}), but this repository takes sign-offs only as pull-request comments`];
  if (!commit) return [`${kind} ${id}: no commit in this change brings this sign-off`];
  const who = commit.authorEmail;
  const person = personByEmail(who, approvers);
  if (!person) return [`${kind} ${id}: committed by ${who || 'an unknown author'}, who is not listed in sdd/governance/approvers.json on the target branch`];
  if (rec.email && low(rec.email) !== low(who)) errs.push(`${kind} ${id}: the record says it was signed by ${rec.email}, but ${who} committed it`);
  const need = rolesFor(kind, id, { approvers, ...(policy ? { policy } : {}), phaseFeatures });
  if (!(person.roles ?? []).some((r) => need.includes(r))) errs.push(`${kind} ${id}: ${person.name} (${(person.roles ?? []).join(', ') || 'no role'}) may not give this sign-off; it needs ${need.join(' or ')}`);
  if ((approvers.rules?.forbidSelfApproval ?? true) && !trainingMode(approvers) && kind !== 'revoke' && makers.map(low).includes(low(who))) {
    errs.push(`${kind} ${id}: ${person.name} also made changes in this pull request, so they cannot sign it (four-eyes). Another listed person signs.`);
  }
  if (commit.files && commit.files.length > 1) errs.push(`${kind} ${id}: the sign-off commit ${commit.sha.slice(0, 12)} also changes ${commit.files.filter((f) => f !== 'sdd/state/approvals.json').join(', ')}; commit approvals.json on its own`);
  if (approvers.rules?.requireSignedApprovals && commit.signature !== 'good') errs.push(`${kind} ${id}: the sign-off commit ${commit.sha.slice(0, 12)} is not signed by a key listed in sdd/governance/allowed_signers`);
  return errs;
}

// For each record changed between base and HEAD: the commit that last changed it, and the people who made the rest.
export function terminalHistory({ git, base, allowedSigners }) {
  const range = base ? `${base}..HEAD` : 'HEAD';
  const shas = git(`rev-list --reverse ${range}`).split('\n').filter(Boolean);
  const byRecord = {}, makers = new Set();
  let signersFile = null;
  if (allowedSigners) { const d = mkdtempSync(join(tmpdir(), 'sdd-signers-')); signersFile = join(d, 'allowed_signers'); writeFileSync(signersFile, allowedSigners); }
  for (const sha of shas) {
    const files = git(`diff-tree --no-commit-id --name-only -r --root ${sha}`).split('\n').filter(Boolean);
    const authorEmail = git(`log -1 --format=%ae ${sha}`);
    if (!files.includes('sdd/state/approvals.json')) { if (files.length) makers.add(authorEmail); continue; }
    const readAt = (rev) => { try { return JSON.parse(git(`show ${rev}:sdd/state/approvals.json`)); } catch { return {}; } };
    const parent = (() => { try { return git(`rev-parse ${sha}^`); } catch { return null; } })();
    let signature = 'none';
    if (signersFile) { try { git(`-c gpg.format=ssh -c gpg.ssh.allowedSignersFile=${signersFile} verify-commit ${sha}`); signature = 'good'; } catch { signature = 'bad'; } }
    for (const c of changedRecords(parent ? readAt(parent) : {}, readAt(sha))) byRecord[`${c.kind}:${c.id}`] = { sha, authorEmail, files, signature };
    if (files.some((f) => f !== 'sdd/state/approvals.json')) makers.add(authorEmail);
  }
  return { byRecord, makers: [...makers] };
}

async function gh(path) {
  const api = process.env.GITHUB_API_URL || 'https://api.github.com';
  const res = await fetch(`${api}${path}`, { headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const args = process.argv.slice(2);
  const arg = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
  const { ROOT, loadApprovals } = await import('../lib.mjs');
  const { resolveBase } = await import('../git-check.mjs');
  const git = (cmd) => execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const exists = (sha) => { try { git(`cat-file -e ${sha}^{commit}`); return true; } catch { return false; } };
  const show = (rev, path, fallback) => { try { return JSON.parse(git(`show ${rev}:${path}`)); } catch { return fallback; } };
  const base = resolveBase({ base: arg('--base') ?? 'auto', before: arg('--before'), env: process.env, exists });
  const offline = args.includes('--offline') || !process.env.GITHUB_TOKEN;
  const after = loadApprovals();
  const before = base ? show(base, 'sdd/state/approvals.json', {}) : {};
  // The approver list that counts is the one the change is measured against, never the one it brings.
  const approvers = (base && show(base, 'sdd/governance/approvers.json', null)) ?? show('HEAD', 'sdd/governance/approvers.json', { approvalChannel: 'terminal' });
  const policy = (base && show(base, 'sdd/governance/policy.json', null)) ?? undefined;
  const changed = changedRecords(before, after);
  const errors = [];
  const allowedSigners = approvers.rules?.requireSignedApprovals ? (() => { try { return git(`show ${base || 'HEAD'}:sdd/governance/allowed_signers`); } catch { return ''; } })() : null;
  const hist = changed.some((c) => c.rec.via !== 'github-comment') ? terminalHistory({ git, base, allowedSigners }) : { byRecord: {}, makers: [] };
  const { features } = await import('../lib.mjs');
  const phaseIds = (n) => features().filter((f) => String(f.phase) === String(n)).map((f) => f.id);
  console.log(`Sign-offs: ${changed.length} new or changed since ${base || 'the first commit'} · channel: ${approvers.approvalChannel ?? 'terminal'}${offline ? ' · offline (GitHub lookups skipped)' : ''}`);
  for (const c of changed) {
    let comment = null, pr = null;
    if (c.rec.via === 'github-comment' && !offline) {
      const repo = c.rec.github?.repo || process.env.GITHUB_REPOSITORY;
      if (repo !== process.env.GITHUB_REPOSITORY) { errors.push(`${c.kind} ${c.id}: cites a comment in another repository (${repo})`); continue; }
      comment = c.rec.github?.commentId ? await gh(`/repos/${repo}/issues/comments/${c.rec.github.commentId}`) : null;
      pr = c.rec.github?.pr ? await gh(`/repos/${repo}/pulls/${c.rec.github.pr}`) : null;
    }
    const errs = c.rec.via === 'github-comment'
      ? (offline ? [] : verifyRecord({ ...c, comment, pr, approvers, policy }))
      : verifyTerminalRecord({ ...c, commit: hist.byRecord[`${c.kind}:${c.id}`], approvers, policy, phaseFeatures: c.kind === 'phase' ? phaseIds(c.id) : [], makers: hist.makers });
    errors.push(...errs);
    console.log(`  ${errs.length ? '✖' : '✔'} ${c.kind} ${c.id} — ${c.rec.by ?? '?'} via ${c.rec.via ?? 'terminal'}${c.rec.github?.commentUrl ? ` (${c.rec.github.commentUrl})` : ''}`);
  }
  for (const r of removedRecords(before, after)) console.log(`  ℹ ${r.kind} ${r.id} sign-off removed (that only ever blocks work; the workflow asks for a new one)`);
  for (const e of errors) console.error(process.env.GITHUB_ACTIONS ? `::error title=Sign-off not verified::${e}` : `✖ ${e}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${errors.length ? '✖' : '✔'} Sign-offs: ${changed.length} checked against GitHub\n${errors.map((e) => `- ${e}`).join('\n')}\n`);
  }
  process.exit(errors.length ? 1 : 0);
}
