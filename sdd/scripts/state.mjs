#!/usr/bin/env node
// Print where the project is in the SDD cycle and exactly what to do next (and in which mode).
//
//   node sdd/scripts/state.mjs            # human-readable table
//   node sdd/scripts/state.mjs --json     # machine-readable
//   node sdd/scripts/state.mjs --context  # short block injected into Bob prompts

import { projectState, contextBlock, STEPS, MODES, LAST_PHASE, planApproval, loadApprovals, humanAction } from './lib.mjs';

const args = new Set(process.argv.slice(2));
const s = projectState();

if (args.has('--context')) { console.log(contextBlock()); process.exit(0); }
if (args.has('--json')) { console.log(JSON.stringify(s, null, 2)); process.exit(0); }

const pad = (v, n) => String(v).padEnd(n);
console.log(`\nSDD status — current phase: ${s.phase > LAST_PHASE ? 'ALL APPROVED' : s.phase}`);
console.log(s.active
  ? `Active step: ${s.active.step} ${s.active.target}${s.active.task ? ' ' + s.active.task : ''} in ${MODES[s.active.mode]?.name ?? s.active.mode} (since ${s.active.startedAt}, by ${s.active.by})`
  : 'Active step: none');
console.log('\n' + pad('Feature', 9) + pad('Phase', 7) + pad('State', 32) + 'Next action');
console.log('-'.repeat(110));
const approvals = loadApprovals();
for (const f of s.features) {
  let next = '—';
  if (f.phase > s.phase + 1) next = `later (phase ${f.phase})`;
  else if (f.next) next = `${MODES[STEPS[f.next].mode].name} → ${STEPS[f.next].command} ${f.id}`;
  else if (f.human) next = `HUMAN → ${f.human}`;
  const marker = f.phase === s.phase ? '▶ ' : '  ';
  const pa = planApproval(f, approvals);
  const appr = pa.state === 'approved' ? ` (plan approved by ${pa.rec.by})` : '';
  console.log(marker + pad(f.id, 7) + pad(f.phase, 7) + pad(f.state + appr, 32).slice(0, 60) + ' ' + next);
}
const phaseDone = s.inPhase.length > 0 && s.inPhase.every((f) => f.state === 'done');
console.log('\nPhase gates approved: ' + (Object.keys(s.approvals.phases || {}).sort().join(', ') || 'none'));
if (phaseDone) console.log(`➡  Phase ${s.phase} is complete. HUMAN gate: check sdd/specs/92-delivery-plan.md, then the ${humanAction('phase', s.phase)}`);
console.log('');
