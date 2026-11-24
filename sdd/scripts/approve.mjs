#!/usr/bin/env node
// HUMAN-ONLY sign-offs from a terminal (Bob's hook refuses to run this script). Used when
// sdd/governance/approvers.json sets "approvalChannel" to "terminal" or "both"; with "github" (the default once
// a repository is on GitHub) people sign by commenting on the pull request instead (/approve-plan F04, …),
// and this script only lists approvals.
// Sign-offs are bound to the SHA-256 of the signed files, so any later edit makes them stale.
//
// Who you are comes from your git user.email, looked up in sdd/governance/approvers.json; the feature's risk tier
// (sdd/governance/policy.json) decides which roles may sign. The pipeline checks the same thing again from the commit.
//
//   node sdd/scripts/approve.mjs plan  F04                  (binds plan.md AND spec.md; after a spec change it needs an
//                                                            approved CR or --override "<reason>")
//   node sdd/scripts/approve.mjs phase 3 [--force]
//   node sdd/scripts/approve.mjs cr CR-002 --decision approved|rejected --option A
//   node sdd/scripts/approve.mjs waiver CVE-2026-12345 --feature F03 --reason "…" --expires 2026-12-31
//   node sdd/scripts/approve.mjs revoke plan F04          (or: revoke waiver CVE-2026-12345)
//   node sdd/scripts/approve.mjs list
//   --as you@example.com   sign as this listed person (a shared laptop); commit the sign-off as that person too

import { loadApprovals, saveJson, APPROVALS, gitUser, appendHistory, approvalChannel, humanAction, loadApprovers, features, featureById, ROOT } from './lib.mjs';
import { rolesFor, rolesText, personByEmail, gitEmail, trainingMode, tierInfo } from './policy.mjs';
import { execSync } from 'node:child_process';
import { planDecision, phaseDecision, crDecision, waiverDecision, applyDecision, BUCKET } from './approvals-core.mjs';
import { createInterface } from 'node:readline/promises';

const [, , kind, target, ...rest] = process.argv;
const opt = (n) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
const die = (m) => { console.error(`✖ ${m}`); process.exit(1); };
const approvals = loadApprovals();

if (kind === 'list') { console.log(JSON.stringify(approvals, null, 2)); process.exit(0); }

if (approvalChannel() === 'github') {
  const decision = { plan: 'plan', phase: 'phase', cr: 'cr', waiver: 'waiver' }[kind];
  die(`Sign-offs in this repository are GitHub pull-request comments (sdd/governance/approvers.json → "approvalChannel": "github").\n  ` +
    (decision ? `The ${humanAction(decision, target ?? '<id>', 'github')}.` : 'Comment "/revoke plan F04" (or phase/cr/waiver) on the pull request.') +
    '\n  The sign-off workflow checks you are a listed approver and records it, bound to the files on that pull request.');
}

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  die('Approvals must be given interactively by a human in a terminal (no TTY detected). This script refuses to run from automation or AI agents.');
}
// Who is signing: a listed person, found by git email, with a role that may give this decision.
const approvers = loadApprovers();
const email = opt('as') ?? gitEmail();
const person = personByEmail(email, approvers);
if (!person) {
  die(`Your git email (${email || 'not set: git config user.email'}) is not listed in sdd/governance/approvers.json, so nothing can be signed as you.\n` +
    '  Each approver is added there with their git email and roles (a chore(SDD) commit, reviewed by the code owners).\n' +
    `  Signing on someone else's laptop? Use --as <your listed email>, and commit the sign-off as yourself.`);
}
const decisionKind = kind === 'revoke' ? 'revoke' : kind;
const phaseFeatures = kind === 'phase' ? features().filter((f) => String(f.phase) === String(target)).map((f) => f.id) : [];
const need = rolesFor(decisionKind, target, { approvers, phaseFeatures });
if (!(person.roles ?? []).some((r) => need.includes(r))) {
  const t = kind === 'plan' && /^F\d{2}$/.test(target ?? '') ? `${target} is risk tier ${tierInfo(target).tier} (${tierInfo(target).label}). ` : '';
  die(`${person.name} (${(person.roles ?? []).join(', ') || 'no role'}) cannot give this sign-off. ${t}It needs: ${rolesText(need)} (sdd/governance/policy.json and approvers.json).`);
}
// Four-eyes: whoever last changed the plan does not sign it (a training repository may relax this).
if (kind === 'plan' && (approvers.rules?.forbidSelfApproval ?? true) && !trainingMode(approvers)) {
  const f = featureById(target);
  let last = '';
  try { last = execSync(`git log -1 --format=%ae -- ${f.dir}/plan.md`, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}
  if (f && last && last.toLowerCase() === String(email).toLowerCase()) die(`You (${email}) made the last change to ${f.dir}/plan.md, so you cannot also sign it. Another person with the ${rolesText(need)} role signs (four-eyes).`);
}
const by = person.name;

async function confirm(expected, summary) {
  console.log(`\n${summary}\n`);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`Type ${expected} to confirm your approval: `)).trim();
  rl.close();
  if (answer !== expected) die('Not confirmed — nothing recorded.');
}
const stamp = () => ({ by, email: person.email, roles: person.roles, at: new Date().toISOString(), via: 'terminal' });

let next;
if (kind === 'plan') {
  const d = planDecision(approvals, target, { override: opt('override') });
  if (!d.ok) die(d.reason);
  for (const w of d.warnings) console.log(`⚠ ${w}`);
  if (d.crs.length) console.log(`Spec changes since the last approval are covered by: ${d.crs.join(', ')}`);
  else if (opt('override') && approvals.plans?.[target]) console.log(`⚠ Overriding the change-request rule: ${opt('override')}`);
  await confirm(d.feature.id, `Approve ${d.summary}`);
  next = applyDecision(approvals, 'plan', d.feature.id, { ...d.record, ...stamp() });
} else if (kind === 'phase') {
  const d = phaseDecision(approvals, target, { force: rest.includes('--force') });
  if (!d.ok) die(/features not done/.test(d.reason) ? `${d.reason} With a documented waiver, add --force.` : d.reason);
  await confirm(`PHASE-${d.phase}`, `Approve the ${d.summary}`);
  next = applyDecision(approvals, 'phase', d.phase, { ...stamp(), ...d.record });
} else if (kind === 'cr') {
  const d = crDecision(approvals, target, { decision: opt('decision'), option: opt('option') });
  if (!d.ok) die(d.reason);
  await confirm(target, d.summary);
  next = applyDecision(approvals, 'cr', target, { ...d.record, ...stamp() });
} else if (kind === 'waiver') {
  const d = waiverDecision(approvals, target, { feature: opt('feature'), reason: opt('reason') ?? '', expires: opt('expires') ?? '' });
  if (!d.ok) die(d.reason);
  await confirm(target, d.summary);
  next = applyDecision(approvals, 'waiver', target, { ...d.record, ...stamp() });
} else if (kind === 'revoke') {
  const [what, id] = [target, rest[0]];
  if (!BUCKET[what] || !approvals[BUCKET[what]]?.[id]) die('nothing to revoke');
  next = applyDecision(approvals, 'revoke', { what, id });
} else {
  die('usage: approve.mjs plan <F##> | phase <n> | cr <CR-###> --decision … | waiver <VULN-ID> --feature F## --reason … --expires YYYY-MM-DD | revoke <plan|phase|cr|waiver> <id> | list');
}

saveJson(APPROVALS, next);
appendHistory({ event: 'approval', kind, target, by, email: person.email, via: 'terminal' });
const asOther = String(gitEmail()).toLowerCase() !== String(person.email).toLowerCase();
const commit = asOther
  ? `git -c user.name="${person.name}" -c user.email=${person.email} commit -m "chore(SDD): ${kind === 'revoke' ? 'revoke' : 'approve'} ${kind === 'revoke' ? target + ' ' + (rest[0] ?? '') : kind + ' ' + target}" -- sdd/state/approvals.json`
  : `git add sdd/state/approvals.json && git commit -m "chore(SDD): ${kind === 'revoke' ? 'revoke' : 'approve'} ${kind === 'revoke' ? target + ' ' + (rest[0] ?? '') : kind + ' ' + target}"`;
console.log(`✔ Recorded in sdd/state/approvals.json as ${person.name} <${person.email}>. Commit it on its own, as yourself:\n  ${commit}\n  The pipeline checks that this commit's author is listed with the right role and did not make the change.`);
