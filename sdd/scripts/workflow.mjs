#!/usr/bin/env node
// The SDD workflows (sdd/workflows/*.json), run step by step. Bob's native workflows mix three kinds of step —
// plain code, AI and human gates; these definitions use the same three kinds, so the loop reads the same way
// in Bob (/sdd-workflow), in a terminal and on GitHub (job summaries, /sdd status comments).
//
//   node sdd/scripts/workflow.mjs list                                   the workflows and their steps
//   node sdd/scripts/workflow.mjs show <feature-delivery|change-request|phase-gate>
//   node sdd/scripts/workflow.mjs status [F##] [--phase N] [--format text|markdown|json]
//   node sdd/scripts/workflow.mjs next [F##] [--format text|json]        the single next action
//
// Read-only: it never changes a file. Status is derived from the same evidence the guards use (lib.mjs).

import { pathToFileURL } from 'node:url';
import {
  workflows, loadWorkflow, features, featureById, featureState, planApproval, taskCounts, scanEvidence,
  reportResult, loadApprovals, currentPhase, MODES, STEPS, humanAction, approvalChannel, LAST_PHASE,
} from './lib.mjs';

export const KIND = { ai: '🤖 AI', deterministic: '⚙️ check', 'human-gate': '✍️ sign-off' };
const MARK = { done: '✔', current: '▶', waiting: '⏸', failed: '✖', todo: '·', optional: '○' };

// Status of every feature-delivery step for one feature: done | current | waiting | failed | todo | optional.
export function featureSteps(f, approvals = loadApprovals()) {
  const wf = loadWorkflow('feature-delivery');
  const st = featureState(f, approvals);
  const pa = planApproval(f, approvals);
  const t = taskCounts(f);
  const scan = pa.state === 'approved' && t && t.open === 0 ? scanEvidence(f) : { state: 'missing' };
  const ver = reportResult('verification', f.id);
  const sec = reportResult('security', f.id);
  const evidence = {
    clarify: () => (pa.state !== 'missing' ? { status: 'done' } : { status: 'optional', note: 'optional — run it if the spec has open questions' }),
    plan: () => (pa.state !== 'missing' ? { status: 'done' } : { status: 'todo' }),
    'approve-plan': () => {
      if (pa.state === 'approved') return { status: 'done', note: `signed by ${pa.rec.by}${pa.rec.at ? ` on ${pa.rec.at.slice(0, 10)}` : ''}${pa.rec.github?.commentUrl ? ` (${pa.rec.github.commentUrl})` : ''}` };
      if (pa.state === 'missing') return { status: 'todo' };
      return { status: 'waiting', note: st.human };
    },
    tasks: () => (t ? { status: 'done' } : { status: 'todo' }),
    implement: () => (!t ? { status: 'todo' } : t.open === 0 ? { status: 'done', note: `${t.done}/${t.total} tasks` } : { status: 'todo', note: `${t.done}/${t.total} tasks` }),
    scan: () => ({ pass: { status: 'done', note: 'PASS' }, fail: { status: 'failed', note: 'FAIL — findings go back to the builder' }, stale: { status: 'todo', note: 'code changed since the last scan' } }[scan.state] ?? { status: 'todo' }),
    verify: () => (ver === 'PASS' ? { status: 'done', note: 'PASS' } : ver === 'FAIL' ? { status: 'failed', note: 'FAIL' } : { status: 'todo' }),
    secure: () => (sec === 'PASS' ? { status: 'done', note: 'PASS' } : sec === 'FAIL' ? { status: 'failed', note: 'FAIL' } : { status: 'todo' }),
  };
  return wf.steps.map((step) => {
    const e = evidence[step.id]?.() ?? { status: 'todo' };
    if (st.next === step.id || st.gate === step.id) e.status = step.kind === 'human-gate' ? 'waiting' : 'current';
    if (e.status === 'current' && STEPS[step.id]) e.action = `${MODES[STEPS[step.id].mode].name} → ${STEPS[step.id].command} ${f.id}`;
    return { id: step.id, kind: step.kind, title: step.title, ...e };
  });
}

export function nextAction(f, approvals = loadApprovals()) {
  const st = featureState(f, approvals);
  if (st.next) {
    const s = STEPS[st.next];
    return { feature: f.id, state: st.state, who: 'bob', kind: s.kind, step: st.next, mode: s.mode, modeName: MODES[s.mode].name, command: `${s.command} ${f.id}`, hint: st.hint ?? null };
  }
  if (st.human) return { feature: f.id, state: st.state, who: 'human', kind: 'human-gate', step: st.gate ?? null, action: st.human };
  return { feature: f.id, state: st.state, who: null, kind: null, step: null };
}

function phaseGate(phase, list, approvals) {
  if (phase > LAST_PHASE) return { state: 'all phases signed' };
  if (approvals.phases?.[String(phase)]) return { state: 'signed' };
  const open = list.filter((f) => f.state !== 'done');
  return open.length
    ? { state: `waiting for ${open.length} feature(s)`, features: open.map((f) => f.id) }
    : { state: 'ready to sign', action: `the business analyst runs the demo (/sdd-demo), then the ${humanAction('phase', phase)}` };
}

export function status({ feature, phase } = {}) {
  const approvals = loadApprovals();
  const cur = currentPhase(approvals);
  const p = phase ?? cur;
  const list = (feature ? [featureById(feature)].filter(Boolean) : features().filter((f) => f.phase === p))
    .map((f) => ({ id: f.id, title: f.title, phase: f.phase, ...featureState(f, approvals), next: nextAction(f, approvals), steps: featureSteps(f, approvals) }));
  return { currentPhase: cur, phase: p, channel: approvalChannel(), features: list, gate: feature ? null : phaseGate(p, list, approvals) };
}

const describeNext = (n) => (n.who === 'bob' ? `${n.modeName} → ${n.command}${n.hint ? ` (${n.hint})` : ''}` : n.who === 'human' ? `HUMAN: ${n.action}` : 'done');

export function renderText(s) {
  const out = [`Phase ${s.phase}${s.phase === s.currentPhase ? ' (current)' : ''} · sign-offs: ${s.channel}`];
  for (const f of s.features) {
    out.push('', `${f.id} ${f.title} — ${f.state}`);
    for (const st of f.steps) out.push(`  ${MARK[st.status]} ${KIND[st.kind].padEnd(11)} ${st.title.padEnd(22)} ${st.action ?? st.note ?? ''}`.trimEnd());
    out.push(`  next: ${describeNext(f.next)}`);
  }
  if (s.gate) out.push('', `Phase gate: ${s.gate.state}${s.gate.action ? ` → ${s.gate.action}` : ''}`);
  return out.join('\n');
}

export function renderMarkdown(s) {
  const out = [`### SDD workflow — phase ${s.phase}${s.phase === s.currentPhase ? ' (current)' : ''}`, '',
    '| Feature | Where it is | Next |', '|---|---|---|'];
  for (const f of s.features) {
    const path = f.steps.map((st) => `${MARK[st.status]}`).join(' ');
    out.push(`| **${f.id}** ${f.title} | \`${path}\` ${f.state} | ${describeNext(f.next).replace(/\|/g, '\\|')} |`);
  }
  if (s.gate) out.push('', `**Phase gate:** ${s.gate.state}${s.gate.action ? ` → ${s.gate.action}` : ''}`);
  out.push('', `<sub>Steps: ${loadWorkflow('feature-delivery').steps.map((st) => `${st.title} (${KIND[st.kind]})`).join(' → ')}. ✔ done · ▶ Bob's turn · ⏸ waiting for a person · ✖ failed · · not yet.</sub>`);
  return out.join('\n');
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const [, , verb = 'status', ...rest] = process.argv;
  const opt = (n) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
  const format = opt('format') ?? 'text';
  const featureArg = rest.find((a) => /^F\d{2}$/.test(a));
  if (verb === 'list') {
    for (const wf of workflows()) {
      console.log(`${wf.id} — ${wf.title}\n  ${wf.summary}`);
      for (const st of wf.steps) console.log(`  ${KIND[st.kind].padEnd(11)} ${st.title}${st.command ? `  (${st.mode === 'any' ? 'any mode' : MODES[st.mode]?.name ?? st.mode}: ${st.command})` : ''}${st.github ? `  [GitHub: ${st.github}]` : ''}`);
      console.log('');
    }
  } else if (verb === 'show') {
    const wf = loadWorkflow(rest[0] ?? 'feature-delivery');
    console.log(format === 'json' ? JSON.stringify(wf, null, 2) : `${wf.title}\n${wf.summary}\n\n${wf.steps.map((st, i) => `${i + 1}. ${KIND[st.kind]} — ${st.title}: ${st.does}`).join('\n')}`);
  } else if (verb === 'status') {
    const s = status({ feature: featureArg, phase: opt('phase') !== undefined ? Number(opt('phase')) : undefined });
    console.log(format === 'json' ? JSON.stringify(s, null, 2) : format === 'markdown' ? renderMarkdown(s) : renderText(s));
  } else if (verb === 'next') {
    const s = status({ feature: featureArg });
    const n = s.features.map((f) => f.next).find((x) => x.who) ?? null;
    if (format === 'json') console.log(JSON.stringify(n ?? { gate: s.gate }, null, 2));
    else console.log(n ? `${n.feature}: ${describeNext(n)}` : s.gate?.action ? `Phase ${s.phase}: ${s.gate.action}` : 'Nothing waiting.');
  } else {
    console.error('usage: workflow.mjs list | show <id> | status [F##] [--phase N] [--format text|markdown|json] | next [F##]');
    process.exit(2);
  }
}
